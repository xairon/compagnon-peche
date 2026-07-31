import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchT } from "./net";

// `net-source.test.ts` surveille les DÉLAIS de fetchT, `net-bornes.test.ts` la
// taille lue. Restait la troisième moitié : la REPRISE — combien de tentatives,
// sur quoi, et ce qui doit au contraire ne jamais être retenté.
//
// Ce n'est pas de la mécanique gratuite. Sandre et Overpass répondent 502 assez
// souvent pour que la différence entre « une seconde tentative » et « aucune »
// soit la différence entre une carte qui s'affiche et une carte vide, au bord de
// l'eau, là où l'on ne va pas recharger dix fois.

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const reponse = (status: number) => new Response("{}", { status });

/** Enchaîne les réponses/erreurs données, une par appel. */
function fetchQuiRend(...suite: (Response | Error)[]) {
  let i = 0;
  return vi.fn(async () => {
    const r = suite[Math.min(i, suite.length - 1)];
    i++;
    if (r instanceof Error) throw r;
    return r;
  });
}

/** Laisse tourner les `sleep()` internes sans attendre en temps réel. */
async function laisserRepartir() {
  for (let i = 0; i < 6; i++) await vi.advanceTimersByTimeAsync(2000);
}

describe("fetchT retente ce qui mérite de l'être", () => {
  it("passe outre un 502 passager plutôt que de rendre l'échec à l'écran", async () => {
    vi.useFakeTimers();
    const f = fetchQuiRend(reponse(502), reponse(200));
    vi.stubGlobal("fetch", f);

    const p = fetchT("https://exemple/sandre");
    await laisserRepartir();
    const res = await p;

    expect(res.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("retente aussi un 429 — la source demande d'attendre, pas d'abandonner", async () => {
    vi.useFakeTimers();
    const f = fetchQuiRend(reponse(429), reponse(200));
    vi.stubGlobal("fetch", f);

    const p = fetchT("https://exemple/overpass");
    await laisserRepartir();

    expect((await p).status).toBe(200);
  });

  it("passe outre une coupure réseau passagère", async () => {
    vi.useFakeTimers();
    const f = fetchQuiRend(new TypeError("Failed to fetch"), reponse(200));
    vi.stubGlobal("fetch", f);

    const p = fetchT("https://exemple/hubeau");
    await laisserRepartir();

    expect((await p).status).toBe(200);
  });

  it("attend plus longtemps avant la seconde reprise qu'avant la première", async () => {
    // Un ré-essai immédiat sur un serveur qui vient de refuser, c'est taper plus
    // fort sur ce qui plie déjà.
    vi.useFakeTimers();
    // L'instant de chaque tentative, sur l'horloge feinte : c'est l'écart entre
    // elles qu'on veut voir croître, pas un décompte de timers.
    const instants: number[] = [];
    const suite = [reponse(502), reponse(502), reponse(200)];
    const f = vi.fn(async () => {
      instants.push(Date.now());
      return suite[instants.length - 1];
    });
    vi.stubGlobal("fetch", f);

    const p = fetchT("https://exemple/x", { retries: 2, retryDelay: 400 });
    await laisserRepartir();
    await p;

    expect(instants).toHaveLength(3);
    const pause1 = instants[1] - instants[0];
    const pause2 = instants[2] - instants[1];
    expect(pause1).toBe(400);
    expect(pause2).toBe(800);
  });
});

describe("fetchT ne retente pas ce qui ne le mérite pas", () => {
  it("rend un 404 tout de suite : la source a répondu, et sa réponse est « non »", async () => {
    const f = fetchQuiRend(reponse(404));
    vi.stubGlobal("fetch", f);

    const res = await fetchT("https://exemple/x");

    expect(res.status).toBe(404);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("ne retente pas un délai dépassé — ce serait doubler l'attente de l'écran", async () => {
    // Une reprise après un abandon sur délai fait attendre l'utilisateur deux
    // fois le budget complet devant un « Chargement… » qui ne finira pas mieux.
    vi.useFakeTimers();
    const f = vi.fn(
      (_u: unknown, init?: { signal?: AbortSignal }) =>
        new Promise<Response>((_, rejeter) => {
          init?.signal?.addEventListener("abort", () => rejeter(init.signal!.reason));
        }),
    );
    vi.stubGlobal("fetch", f);

    const p = fetchT("https://exemple/x", { timeout: 1000, retries: 3 });
    const attendu = expect(p).rejects.toMatchObject({ name: "TimeoutError" });
    await laisserRepartir();

    await attendu;
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("s'en tient à une seule tentative quand on le lui demande", async () => {
    vi.useFakeTimers();
    const f = fetchQuiRend(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", f);

    const p = fetchT("https://exemple/x", { retries: 0 });
    const attendu = expect(p).rejects.toThrow();
    await laisserRepartir();

    await attendu;
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe("fetchT rend la main plutôt que de décider à la place de l'appelant", () => {
  it("rend le dernier 503 tel quel une fois les reprises épuisées", async () => {
    // Et non une exception : les écrans lisent `.ok` et savent afficher « la
    // source n'a pas répondu ». Une exception à la place les enverrait toutes
    // dans le chemin « erreur inconnue ».
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchQuiRend(reponse(503)));

    const p = fetchT("https://exemple/x", { retries: 1 });
    await laisserRepartir();
    const res = await p;

    expect(res.ok).toBe(false);
    expect(res.status).toBe(503);
  });

  it("laisse remonter une erreur réseau durable, sans la déguiser en réponse", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchQuiRend(new TypeError("Failed to fetch")));

    const p = fetchT("https://exemple/x", { retries: 1 });
    const attendu = expect(p).rejects.toThrow(/Failed to fetch/);
    await laisserRepartir();

    await attendu;
  });
});

describe("fetchT respecte l'annulation de l'appelant", () => {
  it("n'appelle même pas le réseau quand l'appelant a déjà renoncé", async () => {
    // Cas courant : l'écran est démonté pendant que sa requête part.
    const f = fetchQuiRend(reponse(200));
    vi.stubGlobal("fetch", f);
    const ctrl = new AbortController();
    ctrl.abort();

    await expect(fetchT("https://exemple/x", { signal: ctrl.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(f).not.toHaveBeenCalled();
  });

  it("coupe la requête en cours quand l'appelant annule", async () => {
    let recu: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_u: unknown, init?: { signal?: AbortSignal }) =>
          new Promise<Response>((_, rejeter) => {
            recu = init?.signal;
            init?.signal?.addEventListener("abort", () => rejeter(init.signal!.reason));
          }),
      ),
    );
    const ctrl = new AbortController();

    const p = fetchT("https://exemple/x", { signal: ctrl.signal });
    const attendu = expect(p).rejects.toBeDefined();
    ctrl.abort(new DOMException("parti", "AbortError"));

    await attendu;
    expect(recu?.aborted).toBe(true);
  });

  it("ne retente pas après une annulation — l'écran n'attend plus rien", async () => {
    const f = vi.fn(
      (_u: unknown, init?: { signal?: AbortSignal }) =>
        new Promise<Response>((_, rejeter) => {
          init?.signal?.addEventListener("abort", () => rejeter(init.signal!.reason));
        }),
    );
    vi.stubGlobal("fetch", f);
    const ctrl = new AbortController();

    const p = fetchT("https://exemple/x", { retries: 3, signal: ctrl.signal });
    const attendu = expect(p).rejects.toBeDefined();
    ctrl.abort(new DOMException("parti", "AbortError"));
    await attendu;

    expect(f).toHaveBeenCalledTimes(1);
  });

  it("transmet la raison de l'appelant, pas une raison inventée", async () => {
    // L'appelant distingue « j'ai annulé » de « ça a échoué » sur cette raison.
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_u: unknown, init?: { signal?: AbortSignal }) =>
          new Promise<Response>((_, rejeter) => {
            init?.signal?.addEventListener("abort", () => rejeter(init.signal!.reason));
          }),
      ),
    );
    const ctrl = new AbortController();
    const raison = new DOMException("écran quitté", "AbortError");

    const p = fetchT("https://exemple/x", { signal: ctrl.signal });
    const attendu = expect(p).rejects.toBe(raison);
    ctrl.abort(raison);

    await attendu;
  });

  it("cesse d'écouter l'appelant une fois la réponse rendue", async () => {
    // Sans le retrait de l'écouteur, un AbortController réutilisé (un écran qui
    // enchaîne dix requêtes) accumulerait dix écouteurs par requête finie.
    vi.stubGlobal("fetch", fetchQuiRend(reponse(200)));
    const ctrl = new AbortController();
    const retirer = vi.spyOn(ctrl.signal, "removeEventListener");

    await fetchT("https://exemple/x", { signal: ctrl.signal });

    expect(retirer).toHaveBeenCalledWith("abort", expect.any(Function));
  });
});
