import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PREFIXES_RESERVE, CACHE_RESERVE } from "./precache-decoupe";
import {
  listerReserve,
  etatReserve,
  preparerReserve,
  onReserve,
  doitPreparer,
  urlDe,
  reinitialiserReservePourTest,
} from "./reserve-hors-ligne";

const pub = (f: string) => join(process.cwd(), "public", f);

// ── Un CacheStorage de test ────────────────────────────────────────────────
// jsdom n'implémente pas l'API Cache. Le faux ci-dessous ne modélise que ce que
// la réserve utilise : match, put, keys, delete.
class FauxCache {
  readonly entrees = new Map<string, Response>();
  match(req: Request | string) {
    return Promise.resolve(this.entrees.get(typeof req === "string" ? req : req.url));
  }
  put(req: Request | string, res: Response) {
    this.entrees.set(typeof req === "string" ? req : req.url, res);
    return Promise.resolve();
  }
  keys() {
    return Promise.resolve([...this.entrees.keys()].map((u) => new Request(u)));
  }
  delete(req: Request | string) {
    return Promise.resolve(this.entrees.delete(typeof req === "string" ? req : req.url));
  }
}

let cache: FauxCache;
let demandes: string[];

beforeEach(() => {
  cache = new FauxCache();
  demandes = [];
  reinitialiserReservePourTest();
  vi.stubGlobal("caches", {
    open: (nom: string) => {
      if (nom !== CACHE_RESERVE) throw new Error(`cache inattendu : ${nom}`);
      return Promise.resolve(cache);
    },
  });
  vi.stubGlobal("fetch", (req: Request | string) => {
    const url = typeof req === "string" ? req : req.url;
    demandes.push(url);
    return Promise.resolve(new Response("x", { status: 200 }));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * La réserve est ce que la découpe du précache a sorti de l'install bloquant.
 * Si la liste ne correspond pas au contenu réel de `public/`, la découpe ment :
 * un fichier oublié n'est plus précaché ET plus téléchargé, donc absent hors
 * ligne, sans que rien ne le signale.
 */
describe("listerReserve", () => {
  it("couvre exactement les fichiers que la découpe a sortis du précache", () => {
    const surDisque = PREFIXES_RESERVE.flatMap((p) => {
      const d = pub(p);
      return existsSync(d) ? readdirSync(d).map((f) => p + f) : [];
    }).sort();

    expect(listerReserve().sort()).toEqual(surDisque);
  });

  it("ne nomme aucun fichier qui n'existe pas", () => {
    expect(listerReserve().filter((f) => !existsSync(pub(f)))).toEqual([]);
  });

  it("commence par ce qui sert au bord de l'eau, finit par ce qui sert à la maison", () => {
    // L'ordre décide de ce qui manque si la préparation est coupée en route.
    // L'identification passe d'abord — c'est elle qui dit si un poisson est une
    // espèce dont la remise à l'eau vivante est interdite. Les photos de
    // recettes se regardent dans une cuisine, avec du réseau.
    const rang = (p: string) => listerReserve().findIndex((f) => f.startsWith(p));

    expect(rang("assets/species-sm/")).toBeLessThan(rang("assets/knots/"));
    expect(rang("assets/crayfish/")).toBeLessThan(rang("assets/knots/"));
    expect(rang("assets/knots/")).toBeLessThan(rang("assets/gear/"));
    expect(rang("assets/gear/")).toBeLessThan(rang("assets/recipes/"));
    expect(rang("assets/recipes/")).toBeLessThan(rang("assets/techniques/"));
  });
});

describe("etatReserve", () => {
  it("ne dit pas « prêt » sur un cache vide", async () => {
    // C'est le défaut que toute cette découpe traque : une app qui promet le
    // hors-ligne avant de l'avoir. L'état par défaut est « rien », jamais « prêt ».
    const e = await etatReserve();

    expect(e.presents).toBe(0);
    expect(e.total).toBeGreaterThan(200);
    expect(e.complete).toBe(false);
  });

  it("compte ce qui est réellement dans le cache, pas ce qu'on a demandé", async () => {
    const [a, b] = listerReserve();
    await cache.put(urlDe(a), new Response("x"));
    await cache.put(urlDe(b), new Response("x"));

    expect((await etatReserve()).presents).toBe(2);
  });
});

describe("preparerReserve", () => {
  it("télécharge tout ce qui manque et le rend disponible hors ligne", async () => {
    const e = await preparerReserve();

    expect(e.complete).toBe(true);
    expect(e.presents).toBe(listerReserve().length);
    expect(listerReserve().filter((f) => !cache.entrees.has(urlDe(f)))).toEqual([]);
  });

  it("reprend là où elle s'est arrêtée au lieu de tout retélécharger", async () => {
    // C'est ce qui rend l'interruption en 4G supportable : la préparation
    // suivante ne redemande que ce qui manque.
    await preparerReserve();
    const premierTour = demandes.length;
    demandes = [];
    reinitialiserReservePourTest();

    await preparerReserve();

    expect(premierTour).toBe(listerReserve().length);
    expect(demandes).toEqual([]);
  });

  it("un fichier qui échoue n'emporte pas les 220 autres", async () => {
    // C'est exactement l'inverse du précache workbox, où une seule entrée en
    // échec annule l'activation entière.
    const rate = listerReserve()[3];
    vi.stubGlobal("fetch", (req: Request | string) => {
      const url = typeof req === "string" ? req : req.url;
      if (url.endsWith(rate)) return Promise.reject(new TypeError("réseau coupé"));
      return Promise.resolve(new Response("x", { status: 200 }));
    });

    const e = await preparerReserve();

    expect(e.presents).toBe(listerReserve().length - 1);
    expect(e.complete).toBe(false);
    expect(e.echecs).toBe(1);
  });

  it("ne met pas en cache une réponse d'erreur : un 404 servi hors ligne est pire que rien", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response("nope", { status: 404 })));

    const e = await preparerReserve();

    expect(cache.entrees.size).toBe(0);
    expect(e.complete).toBe(false);
  });

  it("dit où elle en est pendant qu'elle travaille", async () => {
    // « Rien ne signale que le hors-ligne n'est pas encore prêt » : il faut un
    // état lisible en continu, pas seulement à la fin.
    const vus: number[] = [];
    const detacher = onReserve((e) => vus.push(e.presents));

    await preparerReserve();
    detacher();

    expect(vus.length).toBeGreaterThan(2);
    expect(vus[vus.length - 1]).toBe(listerReserve().length);
    // Croissant : un compteur qui recule ne veut rien dire pour qui le lit.
    expect([...vus].sort((x, y) => x - y)).toEqual(vus);
  });

  it("s'arrête quand on l'annule, sans se déclarer complète", async () => {
    const ctrl = new AbortController();
    let n = 0;
    vi.stubGlobal("fetch", () => {
      if (++n === 5) ctrl.abort();
      return Promise.resolve(new Response("x", { status: 200 }));
    });

    const e = await preparerReserve({ signal: ctrl.signal });

    expect(e.complete).toBe(false);
    expect(cache.entrees.size).toBeLessThan(listerReserve().length);
    // Et surtout : l'identité du build n'est PAS posée sur une réserve
    // incomplète — sinon la préparation suivante croirait n'avoir rien à faire.
    expect(cache.entrees.has(urlDe("reserve:build"))).toBe(false);
  });

  it("ne lance pas deux préparations en parallèle sur le même réseau", async () => {
    const [a, b] = await Promise.all([preparerReserve(), preparerReserve()]);

    expect(demandes.length).toBe(listerReserve().length);
    expect(a.presents).toBe(b.presents);
  });
});

/**
 * Quand la préparation a le droit de partir. La réserve pèse 5 132 Kio : la
 * lancer pendant que le service worker installe encore le noyau (2 730 Kio)
 * disputerait la bande passante à la seule chose qui décide de l'activation —
 * exactement ce que la découpe cherche à accélérer.
 */
describe("doitPreparer", () => {
  it("attend que le noyau soit en place, à la première visite", () => {
    // Pas de contrôleur = le service worker n'a pas encore pris la page, donc
    // le précache n'est pas fini.
    expect(doitPreparer({ enLigne: true, controleParSW: false, force: false })).toBe(false);
  });

  it("part quand même si l'appelant sait que le noyau vient d'arriver", () => {
    // `onOfflineReady` : le précache est terminé, le contrôleur peut encore
    // manquer d'un battement de cil.
    expect(doitPreparer({ enLigne: true, controleParSW: false, force: true })).toBe(true);
  });

  it("part aux visites suivantes, où le service worker contrôle déjà la page", () => {
    expect(doitPreparer({ enLigne: true, controleParSW: true, force: false })).toBe(true);
  });

  it("ne tente rien hors ligne : 221 échecs ne remplissent rien", () => {
    expect(doitPreparer({ enLigne: false, controleParSW: true, force: true })).toBe(false);
  });
});

describe("péremption de la réserve", () => {
  it("revalide quand le build change, sinon une URL non hachée reste figée à jamais", async () => {
    // Les illustrations de public/ ne portent pas de hash : sous CacheFirst,
    // une image corrigée ne remplacerait jamais l'ancienne. Le précache, lui,
    // versionnait par `revision` — c'est cette garantie qu'il faut rendre.
    await preparerReserve({ build: "v1" });
    demandes = [];
    reinitialiserReservePourTest();

    await preparerReserve({ build: "v2" });

    expect(demandes.length).toBe(listerReserve().length);
  });

  it("oublie ce qui ne fait plus partie de la réserve", async () => {
    const fantome = urlDe("assets/gear/disparu.webp");
    await cache.put(fantome, new Response("x"));

    await preparerReserve();

    expect(cache.entrees.has(fantome)).toBe(false);
  });
});
