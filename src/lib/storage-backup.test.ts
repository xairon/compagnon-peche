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

const { store } = vi.hoisted(() => ({ store: new Map<string, unknown>() }));
vi.mock("idb-keyval", () => ({
  get: vi.fn(async (k: string) => store.get(k)),
  set: vi.fn(async (k: string, v: unknown) => void store.set(k, v)),
  del: vi.fn(async (k: string) => void store.delete(k)),
  keys: vi.fn(async () => [...store.keys()]),
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
