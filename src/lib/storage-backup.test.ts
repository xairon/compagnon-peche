// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

// exportData/importData are the only path by which a user's notebook survives a
// lost phone, and until now they were called by zero tests. The bug that
// motivated this file: `carnet:crayfish` was written by db.ts and wiped by
// wipeAll, but never read by exportData — so a backup labelled "complète"
// silently dropped every crayfish session.
//
// idb-keyval is mocked with a plain in-memory Map: the point is the shape of
// the bundle and what comes back out, not IndexedDB itself.

const { store, illisibles } = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  // Clés dont la lecture doit échouer, pour rejouer une base présente mais
  // illisible — la situation où l'app dit justement « exportez une sauvegarde ».
  illisibles: new Set<string>(),
}));
vi.mock("idb-keyval", () => ({
  get: vi.fn(async (k: string) => {
    if (illisibles.has(k)) throw new DOMException("Internal error", "UnknownError");
    return store.get(k);
  }),
  set: vi.fn(async (k: string, v: unknown) => void store.set(k, v)),
  del: vi.fn(async (k: string) => void store.delete(k)),
  keys: vi.fn(async () => {
    if (illisibles.has("*keys*")) throw new DOMException("Internal error", "UnknownError");
    return [...store.keys()];
  }),
  clear: vi.fn(async () => store.clear()),
}));

import { exportData, importData, EXPORT_SCHEMA, getLastExportAt } from "./storage";
import { STORES } from "./stores";

// jsdom ships Blob/File without .text() (browsers have had it for years).
// FileReader *is* implemented, so bridge the two — without this the suite fails
// on "not a valid JSON" and hides whatever it was actually meant to catch.
function readBlob(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsText(b);
  });
}
if (typeof Blob.prototype.text !== "function") {
  Blob.prototype.text = function (this: Blob) {
    return readBlob(this);
  };
}

/** Runs exportData and returns the bundle it handed to the download anchor. */
async function exportedBundle(): Promise<Record<string, unknown>> {
  let captured: Blob | undefined;
  const createObjectURL = vi
    .spyOn(URL, "createObjectURL")
    .mockImplementation((b: Blob | MediaSource) => {
      captured = b as Blob;
      return "blob:stub";
    });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  try {
    await exportData();
  } finally {
    createObjectURL.mockRestore();
  }
  if (!captured) throw new Error("exportData n'a produit aucun blob");
  return JSON.parse(await captured.text()) as Record<string, unknown>;
}

/** Wraps a bundle in a File, the way the import screen receives it. */
function asFile(bundle: unknown): File {
  return new File([JSON.stringify(bundle)], "carnet.json", { type: "application/json" });
}

const SESSION = { id: "s1", startedAt: 1_700_000_000_000, balances: [], species: "signal" };

beforeEach(() => {
  store.clear();
  illisibles.clear();
  localStorage.clear();
  vi.restoreAllMocks();
  // jsdom's navigator has neither share nor canShare, so the share tests add
  // them outright — and restoreAllMocks does not remove added properties.
  // Without this, one share test silently reroutes every later export.
  delete (navigator as Partial<Navigator>).share;
  delete (navigator as Partial<Navigator>).canShare;
  // exportData appends a real <a> and clicks it; jsdom logs "Not implemented:
  // navigation" for every call. Nothing under test depends on the click.
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

describe("exportData", () => {
  it("emporte les séances écrevisses", async () => {
    store.set("carnet:crayfish", [SESSION]);

    const bundle = await exportedBundle();

    expect(bundle.crayfish).toEqual([SESSION]);
  });

  it("emporte un magasin vide comme un tableau, jamais comme undefined", async () => {
    const bundle = await exportedBundle();

    expect(bundle.crayfish).toEqual([]);
  });
});

describe("le rappel de sauvegarde ne s'arme que sur un vrai succès", () => {
  // The reminder is the app's only nudge to back up. Arming it on a click that
  // silently went nowhere (iOS standalone drops anchor downloads) is worse than
  // not having a reminder at all: it tells the user they are covered.
  it("n'enregistre pas la date quand l'écriture du fichier échoue", async () => {
    vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
      throw new Error("quota dépassé");
    });

    await expect(exportData()).rejects.toThrow();

    expect(getLastExportAt()).toBeNull();
  });

  it("enregistre la date quand l'export aboutit", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:stub");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    await exportData();

    expect(getLastExportAt()).not.toBeNull();
  });

  // The failure mode a try/catch cannot see: in an installed iOS PWA the
  // anchor+blob download is dropped silently — no throw, no file. The app then
  // reports success and mutes the reminder for 14 days. navigator.share is the
  // only path there that reports back, so prefer it when the platform has it.
  it("passe par le partage système quand la plateforme sait partager un fichier", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share, canShare: () => true });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click");

    await exportData();

    expect(share).toHaveBeenCalledOnce();
    expect(click).not.toHaveBeenCalled();
    expect(getLastExportAt()).not.toBeNull();
  });

  it("n'arme pas le rappel quand l'utilisateur annule le partage", async () => {
    const abort = Object.assign(new Error("cancelled"), { name: "AbortError" });
    Object.assign(navigator, {
      share: vi.fn().mockRejectedValue(abort),
      canShare: () => true,
    });

    await exportData();

    expect(getLastExportAt()).toBeNull();
  });
});

/**
 * Quand une lecture IndexedDB échoue, `store.tsx` suspend les écritures et la
 * bannière dit : « l'enregistrement est suspendu […] exportez une sauvegarde ».
 * Or `exportData` lisait les sept magasins d'un seul `Promise.all` : un seul
 * refus faisait échouer l'export entier. L'app envoyait donc l'utilisateur vers
 * une porte fermée, au moment précis où c'était sa seule issue.
 */
describe("export quand la base ne se laisse pas lire", () => {
  it("produit quand même un fichier avec ce qui a pu être lu", async () => {
    store.set(STORES.catches, [{ slot: "a" }]);
    illisibles.add(STORES.spots);

    const bundle = await exportedBundle();

    expect(bundle.catches).toEqual([{ slot: "a" }]);
  });

  it("nomme les magasins illisibles au lieu de les rendre comme vides", async () => {
    // Un magasin absent du fichier et un magasin vide se ressemblent une fois
    // le téléphone perdu. Confondre les deux, c'est faire dire à la sauvegarde
    // qu'il n'y avait pas de spots.
    store.set(STORES.spots, [{ id: "s1" }]);
    illisibles.add(STORES.spots);

    const bundle = await exportedBundle();

    expect(bundle.lecturesEchouees).toEqual(["spots"]);
    expect(bundle.spots).toBeUndefined();
  });

  it("ne se dit pas « complète » quand elle ne l'est pas", async () => {
    illisibles.add(STORES.gear);

    const bundle = await exportedBundle();

    expect(String(bundle.note)).not.toMatch(/sauvegarde locale complète/i);
    expect(String(bundle.note)).toMatch(/incomplète/i);
    expect(String(bundle.note)).toMatch(/gear/);
  });

  it("dit à l'appelant ce qui manque, pour que l'écran puisse le répéter", async () => {
    illisibles.add(STORES.gear);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:stub");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const res = await exportData();

    expect(res.complet).toBe(false);
    expect(res.lecturesEchouees).toEqual(["gear"]);
  });

  it("porte la mention jusque dans le nom du fichier", async () => {
    // Le fichier survit à l'app : dans un gestionnaire de fichiers, six mois
    // plus tard, le nom est tout ce qui reste pour savoir ce qu'il vaut.
    illisibles.add(STORES.catches);
    let nom = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      nom = this.download;
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:stub");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    await exportData();

    expect(nom).toMatch(/incomplet/i);
  });

  it("n'arme pas le rappel de sauvegarde sur un export partiel", async () => {
    // Le rappel est le seul coup de coude vers la sauvegarde. Le taire 14 jours
    // sur un fichier amputé dit à l'utilisateur qu'il est couvert.
    illisibles.add(STORES.catches);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:stub");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    await exportData();

    expect(getLastExportAt()).toBeNull();
  });

  it("exporte le carnet même quand la liste des photos est illisible", async () => {
    store.set(STORES.catches, [{ slot: "a" }]);
    illisibles.add("*keys*");

    const bundle = await exportedBundle();

    expect(bundle.catches).toEqual([{ slot: "a" }]);
    expect(bundle.lecturesEchouees).toEqual(["photos"]);
  });

  it("garde le rappel armé quand tout a été lu", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:stub");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const res = await exportData();

    expect(res.complet).toBe(true);
    expect(getLastExportAt()).not.toBeNull();
  });
});

describe("couverture de la sauvegarde", () => {
  // The guard that matters most: it fails the day someone adds an 8th store to
  // STORES without threading it through the backup. Every other test here
  // checks a case someone thought of; this one checks the ones nobody did.
  it("emporte un champ pour CHAQUE magasin du registre", async () => {
    for (const name of Object.keys(STORES)) {
      store.set(STORES[name as keyof typeof STORES], name === "profile" ? { name: "x" } : [{ id: name }]);
    }

    const bundle = await exportedBundle();

    for (const name of Object.keys(STORES)) {
      expect(bundle, `le magasin « ${name} » est absent de la sauvegarde`).toHaveProperty(name);
    }
  });

  it("restitue chaque magasin du registre après un aller-retour", async () => {
    for (const name of Object.keys(STORES)) {
      if (name === "profile") continue; // merged only when the local profile is empty
      store.set(STORES[name as keyof typeof STORES], [{ id: `${name}-1`, slot: `${name}-1` }]);
    }
    const bundle = await exportedBundle();
    store.clear();

    await importData(asFile(bundle));

    for (const name of Object.keys(STORES)) {
      if (name === "profile") continue;
      expect(
        store.get(STORES[name as keyof typeof STORES]),
        `le magasin « ${name} » n'a pas été restauré`,
      ).toHaveLength(1);
    }
  });
});

describe("importData", () => {
  it("restaure les séances écrevisses et les compte dans le résultat", async () => {
    const file = asFile({
      app: "compagnon-peche",
      schema: EXPORT_SCHEMA,
      crayfish: [SESSION],
    });

    const result = await importData(file);

    expect(store.get("carnet:crayfish")).toEqual([SESSION]);
    expect(result.crayfish).toBe(1);
  });

  it("compte les ensembles de matériel restaurés", async () => {
    const file = asFile({
      app: "compagnon-peche",
      schema: EXPORT_SCHEMA,
      bundles: [{ id: "b1", name: "Ensemble carnassier" }],
    });

    const result = await importData(file);

    expect(result.bundles).toBe(1);
  });

  it("refuse une sauvegarde produite par une version plus récente de l'app", async () => {
    const file = asFile({ app: "compagnon-peche", schema: EXPORT_SCHEMA + 1, catches: [] });

    await expect(importData(file)).rejects.toThrow(/plus récente/);
  });

  it("accepte une sauvegarde sans champ schema (fichiers déjà téléchargés)", async () => {
    const file = asFile({ app: "compagnon-peche", spots: [{ id: "x" }] });

    await expect(importData(file)).resolves.toMatchObject({ spots: 1 });
  });
});
