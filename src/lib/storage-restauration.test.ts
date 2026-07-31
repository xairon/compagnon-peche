// @vitest-environment jsdom
//
// `storage-backup.test.ts` surveille ce qu'un export EMPORTE. Ce fichier
// surveille l'autre moitié : ce qu'une restauration REND, et ce qu'elle ne doit
// jamais écraser en le rendant. C'est le chemin qu'on emprunte une fois dans sa
// vie — au changement de téléphone — et le seul jour où il compte, il n'y a pas
// de seconde chance.
//
// Y sont joints le notificateur d'échec d'écriture et l'avertissement de quota :
// ce sont les deux seules choses qui préviennent l'utilisateur qu'il est en
// train de perdre ses saisies.

import { describe, it, expect, vi, beforeEach } from "vitest";

const { base } = vi.hoisted(() => ({ base: new Map<string, unknown>() }));
vi.mock("idb-keyval", () => ({
  get: vi.fn(async (k: string) => base.get(k)),
  set: vi.fn(async (k: string, v: unknown) => void base.set(k, v)),
  del: vi.fn(async (k: string) => void base.delete(k)),
  keys: vi.fn(async () => [...base.keys()]),
  clear: vi.fn(async () => base.clear()),
}));

import {
  importData,
  wipeAll,
  isProfileEmpty,
  isQuotaError,
  reportPersistError,
  reportReadError,
  reportRuntimeError,
  clearPersistError,
  onPersistError,
  onQuotaWarning,
  storageInfo,
  fmtBytes,
  EXPORT_SCHEMA,
} from "./storage";
import { STORES } from "./stores";

// jsdom livre Blob/File sans .text() ; FileReader, lui, est implémenté.
function lireBlob(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsText(b);
  });
}
if (typeof Blob.prototype.text !== "function") {
  Blob.prototype.text = function (this: Blob) {
    return lireBlob(this);
  };
}

function fichier(bundle: unknown): File {
  return new File([JSON.stringify(bundle)], "carnet.json", { type: "application/json" });
}
const sauvegarde = (contenu: Record<string, unknown>) => ({
  app: "compagnon-peche",
  schema: EXPORT_SCHEMA,
  ...contenu,
});

beforeEach(() => {
  base.clear();
  localStorage.clear();
  clearPersistError();
  vi.restoreAllMocks();
});

describe("restaurer sans rien écraser", () => {
  it("ajoute les prises du fichier à celles déjà sur l'appareil", async () => {
    // La restauration est une FUSION, pas un remplacement : quelqu'un qui
    // réimporte une vieille sauvegarde sur un téléphone déjà utilisé ne doit pas
    // y perdre ce qu'il a saisi depuis.
    base.set(STORES.catches, [{ slot: "recent", sp: "Perche" }]);

    const res = await importData(fichier(sauvegarde({ catches: [{ slot: "ancien", sp: "Sandre" }] })));

    const carnet = base.get(STORES.catches) as { slot: string }[];
    expect(carnet.map((c) => c.slot).sort()).toEqual(["ancien", "recent"]);
    expect(res.catches).toBe(1);
  });

  it("ne recopie pas une prise déjà présente", async () => {
    // Réimporter deux fois le même fichier est un geste banal (« je ne sais plus
    // si ça a marché »). Dédoublonner le carnet fausserait les quotas et les
    // statistiques pour toujours.
    base.set(STORES.catches, [{ slot: "p1", sp: "Sandre" }]);

    const res = await importData(fichier(sauvegarde({ catches: [{ slot: "p1", sp: "Sandre" }] })));

    expect(base.get(STORES.catches)).toHaveLength(1);
    expect(res.catches).toBe(0);
  });

  it("garde la version de l'appareil quand un identifiant existe des deux côtés", async () => {
    // Ce qui est sur le téléphone est plus récent que ce qui est dans le fichier :
    // une correction de taille faite hier ne doit pas être défaite par un import.
    base.set(STORES.catches, [{ slot: "p1", n: 55 }]);

    await importData(fichier(sauvegarde({ catches: [{ slot: "p1", n: 52 }] })));

    expect((base.get(STORES.catches) as { n: number }[])[0].n).toBe(55);
  });

  it("ne touche pas au profil déjà rempli", async () => {
    // Le profil porte l'AAPPMA et l'année de carte, retapées à la main.
    base.set(STORES.profile, { name: "Nicolas", bio: "", region: "" });

    await importData(fichier(sauvegarde({ profile: { name: "Quelqu'un d'autre", bio: "", region: "" } })));

    expect(base.get(STORES.profile)).toMatchObject({ name: "Nicolas" });
  });

  it("remplit le profil quand l'appareil n'en a pas", async () => {
    await importData(fichier(sauvegarde({ profile: { name: "Nicolas", bio: "", region: "" } })));

    expect(base.get(STORES.profile)).toMatchObject({ name: "Nicolas" });
  });

  it("considère qu'une carte de pêche seule est déjà une identité", async () => {
    // Une AAPPMA et une année, sans prénom, c'est quand même une saisie à la
    // main que l'import n'a pas le droit de remplacer.
    base.set(STORES.profile, { name: "", bio: "", region: "", aappma: "AAPPMA de Blois" });

    await importData(fichier(sauvegarde({ profile: { name: "Autre", bio: "", region: "" } })));

    expect(base.get(STORES.profile)).toMatchObject({ aappma: "AAPPMA de Blois" });
  });
});

describe("isProfileEmpty — ce qui compte comme une identité", () => {
  it("tient un profil sans aucun champ pour vide", () => {
    expect(isProfileEmpty({ name: "", bio: "", region: "" })).toBe(true);
    expect(isProfileEmpty(undefined)).toBe(true);
    expect(isProfileEmpty(null)).toBe(true);
  });

  it("tient la carte de pêche pour une identité à part entière", () => {
    expect(isProfileEmpty({ name: "", bio: "", region: "", aappma: "AAPPMA de Blois" })).toBe(false);
    expect(isProfileEmpty({ name: "", bio: "", region: "", carteAnnee: 2026 })).toBe(false);
  });
});

describe("les photos d'une sauvegarde", () => {
  it("reviennent sur l'appareil, pas seulement leurs clés", async () => {
    // Sans le blob, la prise pointe vers une image absente : une vignette
    // cassée, sans message, sans moyen de comprendre pourquoi.
    const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

    const res = await importData(fichier(sauvegarde({ photos: { "photo:p1": dataUrl } })));

    expect(res.photos).toBe(1);
    // Pas `toBeInstanceOf(Blob)` : le blob sort du fetch de Node, jsdom expose
    // un autre constructeur, et l'un n'est pas une instance de l'autre. Ce qui
    // compte est que les OCTETS soient revenus, pas de quel realm vient l'objet.
    const restauree = base.get("photo:p1") as Blob;
    expect(restauree.type).toBe("image/jpeg");
    expect(new Uint8Array(await restauree.arrayBuffer())).toEqual(
      // Les 10 octets encodés dans le data: URL ci-dessus (en-tête JFIF).
      new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]),
    );
  });

  it("ne remplacent pas un cliché déjà présent", async () => {
    const existant = new Blob(["déjà là"]);
    base.set("photo:p1", existant);

    const res = await importData(
      fichier(sauvegarde({ photos: { "photo:p1": "data:image/jpeg;base64,/9j/4AAQSkZJRg==" } })),
    );

    expect(base.get("photo:p1")).toBe(existant);
    expect(res.photos).toBe(0);
  });

  it("n'interrompent pas la restauration quand l'une d'elles est illisible", async () => {
    // Le carnet vaut bien plus que les photos : une entrée abîmée ne doit pas
    // faire échouer l'import de tout le reste.
    const res = await importData(
      fichier(sauvegarde({ catches: [{ slot: "p1" }], photos: { "photo:p1": 42 } })),
    );

    expect(res.catches).toBe(1);
    expect(res.photos).toBe(0);
  });
});

describe("refuser un fichier qui n'en est pas un", () => {
  it("nomme le problème quand ce n'est pas du JSON", async () => {
    const f = new File(["ceci n'est pas du json"], "x.json");

    await expect(importData(f)).rejects.toThrow(/JSON/i);
  });

  it("refuse un JSON valide qui n'est pas une sauvegarde de cette app", async () => {
    await expect(importData(fichier({ app: "autre-chose", catches: [] }))).rejects.toThrow(
      /sauvegarde Compagnon/i,
    );
  });

  it("n'écrit rien du tout quand le fichier est refusé", async () => {
    // Un import à moitié appliqué serait pire qu'un refus.
    await expect(importData(fichier({ app: "autre", catches: [{ slot: "x" }] }))).rejects.toThrow();

    expect(base.size).toBe(0);
  });
});

describe("wipeAll — l'effacement demandé", () => {
  it("vide bien tout ce qui est stocké", async () => {
    base.set(STORES.catches, [{ slot: "p1" }]);
    base.set("photo:p1", new Blob(["x"]));
    localStorage.setItem("carnet:quelque-chose", "1");

    await wipeAll();

    expect(base.size).toBe(0);
    expect(localStorage.getItem("carnet:quelque-chose")).toBeNull();
  });

  it("laisse l'utilisateur dans une app vide, pas devant l'écran de bienvenue", async () => {
    // Effacer ses données n'est pas réinstaller l'app : refaire l'onboarding
    // après un effacement volontaire serait une punition, pas une aide.
    localStorage.setItem("onboarded", "1");

    await wipeAll();

    expect(localStorage.getItem("onboarded")).toBe("1");
  });
});

describe("prévenir que les saisies ne sont plus enregistrées", () => {
  it("reconnaît un dépassement de quota, quel que soit le moteur", () => {
    expect(isQuotaError(new DOMException("plein", "QuotaExceededError"))).toBe(true);
    expect(isQuotaError(new DOMException("plein", "NS_ERROR_DOM_QUOTA_REACHED"))).toBe(true);
    expect(isQuotaError(new Error("plein"))).toBe(false);
    expect(isQuotaError(null)).toBe(false);
  });

  it("dit quoi faire quand c'est le quota — pas seulement que ça a raté", async () => {
    let msg: string | null = null;
    const stop = onPersistError((m) => (msg = m));

    reportPersistError(new DOMException("plein", "QuotaExceededError"));

    expect(String(msg)).toMatch(/exportez une sauvegarde/i);
    stop();
  });

  it("distingue « je n'ai pas pu écrire » de « je n'ai pas pu lire »", async () => {
    // Les deux appellent des gestes différents : libérer de la place d'un côté,
    // recharger l'app de l'autre. Un message unique ferait faire le mauvais.
    let ecriture: string | null = null;
    let lecture: string | null = null;
    let stop = onPersistError((m) => (ecriture = m));
    reportPersistError(new Error("boum"));
    stop();
    clearPersistError();
    stop = onPersistError((m) => (lecture = m));
    reportReadError();
    stop();

    expect(ecriture).not.toBe(lecture);
    expect(String(lecture)).toMatch(/suspendu/i);
  });

  it("garde son propre ton pour un plantage — ce n'est pas un problème de stockage", () => {
    let msg: string | null = null;
    const stop = onPersistError((m) => (msg = m));

    reportRuntimeError("écran Carte");

    expect(String(msg)).toMatch(/écran Carte/);
    expect(String(msg)).not.toMatch(/stockage saturé/i);
    stop();
  });

  it("ne répète pas deux fois le même message", () => {
    // Le bandeau est global : le relever à chaque écriture ratée le ferait
    // clignoter à chaque frappe.
    const vus: (string | null)[] = [];
    const stop = onPersistError((m) => vus.push(m));
    vus.length = 0;

    reportPersistError(new Error("boum"));
    reportPersistError(new Error("boum"));

    expect(vus).toHaveLength(1);
    stop();
  });

  it("retire le bandeau dès qu'une écriture repasse", () => {
    let msg: string | null = "posé";
    const stop = onPersistError((m) => (msg = m));
    reportPersistError(new Error("boum"));

    clearPersistError();

    expect(msg).toBeNull();
    stop();
  });

  it("annonce son état courant à qui s'abonne après coup", () => {
    // L'écran qui monte après l'échec doit voir le bandeau, pas un état vierge.
    reportPersistError(new Error("boum"));

    let vu: string | null = null;
    const stop = onPersistError((m) => (vu = m));

    expect(vu).not.toBeNull();
    stop();
  });
});

describe("l'avertissement de quota, avant l'échec plutôt qu'après", () => {
  it("se lève quand l'appareil approche de sa limite", async () => {
    let alerte: boolean | null = null;
    const stop = onQuotaWarning((w) => (alerte = w));
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { estimate: async () => ({ usage: 99_000_000, quota: 100_000_000 }) },
    });

    await storageInfo();

    expect(alerte).toBe(true);
    stop();
  });

  it("reste baissé sur un appareil qui a de la place", async () => {
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { estimate: async () => ({ usage: 1_000_000, quota: 100_000_000 }) },
    });
    await storageInfo();

    let alerte: boolean | null = null;
    const stop = onQuotaWarning((w) => (alerte = w));

    expect(alerte).toBe(false);
    stop();
  });

  it("compte les photos stockées, et rien d'autre", async () => {
    // Le chiffre est montré à l'utilisateur sur l'écran Stockage : y compter le
    // carnet ferait croire à des centaines d'images.
    base.set("photo:p1", new Blob(["x"]));
    base.set("photo:p2", new Blob(["x"]));
    base.set("profile-avatar", new Blob(["x"]));
    base.set(STORES.catches, [{ slot: "p1" }]);
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { estimate: async () => ({ usage: 0, quota: 0 }) },
    });

    const info = await storageInfo();

    expect(info.photos).toBe(3);
  });

  it("rend zéro plutôt que de planter quand le navigateur ne sait pas estimer", async () => {
    Object.defineProperty(navigator, "storage", { configurable: true, value: undefined });

    const info = await storageInfo();

    expect(info.usage).toBe(0);
    expect(info.quota).toBe(0);
    expect(info.persisted).toBe(false);
  });
});

describe("fmtBytes", () => {
  it("parle en Ko sous le mégaoctet et en Mo au-delà", () => {
    expect(fmtBytes(0)).toBe("0 Mo");
    expect(fmtBytes(2048)).toBe("2 Ko");
    expect(fmtBytes(5 * 1024 * 1024)).toBe("5.0 Mo");
  });
});
