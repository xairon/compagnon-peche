import { describe, it, expect, vi, beforeEach } from "vitest";

// idb-keyval remplacé par un `get` qu'on pilote : ce qui est en jeu n'est pas
// IndexedDB, c'est ce que l'app fait quand IndexedDB refuse de lire.
const { etat } = vi.hoisted(() => ({
  etat: { echecsRestants: 0, appels: 0, valeur: undefined as unknown },
}));
vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => {
    etat.appels++;
    if (etat.echecsRestants > 0) {
      etat.echecsRestants--;
      throw new DOMException("Internal error", "UnknownError");
    }
    return etat.valeur;
  }),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
  keys: vi.fn(async () => []),
  clear: vi.fn(async () => {}),
}));

import { loadCatches, loadSpots, TENTATIVES_LECTURE } from "./db";

beforeEach(() => {
  etat.echecsRestants = 0;
  etat.appels = 0;
  etat.valeur = undefined;
});

/**
 * `store.tsx` suspend les six effets d'écriture (`loadOk: false`) dès qu'une
 * lecture échoue, pour ne pas écraser un carnet encore présent par un tableau
 * vide. L'intention est juste. Le problème est qu'il n'y avait **aucun chemin
 * de sortie** : `loadOk` est posé une fois à l'hydratation et jamais relevé.
 * Une seule lecture ratée — et beaucoup le sont pour des raisons passagères
 * (`UnknownError` de Safari quand la base se referme, `AbortError` sous
 * pression de stockage) — gelait le carnet jusqu'au rechargement.
 *
 * La sortie posée ici est en amont du gel : réessayer avant de déclarer
 * l'échec. Ce qui reste après la reprise est durable, et là le gel est la
 * bonne réponse.
 */
describe("reprise de lecture", () => {
  it("rend les données quand la lecture ne rate que la première fois", async () => {
    etat.echecsRestants = 1;
    etat.valeur = [{ slot: "a" }];

    await expect(loadCatches()).resolves.toEqual([{ slot: "a" }]);
  });

  it("laisse remonter l'échec quand il est durable — le gel reste la bonne réponse", async () => {
    // Réessayer sans fin masquerait une base réellement illisible et
    // finirait par écraser des données présentes. La reprise est un sursis,
    // pas un déni.
    etat.echecsRestants = 99;

    await expect(loadCatches()).rejects.toBeInstanceOf(DOMException);
  });

  it("borne le nombre de tentatives", async () => {
    etat.echecsRestants = 99;

    await loadCatches().catch(() => {});

    expect(etat.appels).toBe(TENTATIVES_LECTURE);
    expect(TENTATIVES_LECTURE).toBeLessThanOrEqual(3);
  });

  it("ne retarde pas une installation neuve", async () => {
    // `undefined` est une réponse, pas un échec : c'est le carnet vide du
    // premier lancement. Le retenter coûterait à tout le monde.
    await expect(loadCatches()).resolves.toEqual([]);

    expect(etat.appels).toBe(1);
  });

  it("protège aussi les autres magasins, pas seulement le carnet", async () => {
    etat.echecsRestants = 1;
    etat.valeur = [{ id: "s1" }];

    await expect(loadSpots()).resolves.toEqual([{ id: "s1" }]);
  });
});
