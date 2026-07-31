import { describe, it, expect } from "vitest";
import { SW_DELAIS_S } from "./sw-delais";
import { DELAIS_MS, type SourceReseau } from "./net-bornes";

// Deux budgets décrivaient la même attente sans se parler : celui de fetchT et
// le networkTimeoutSeconds du service worker. Quand le second est plus court, il
// coupe le réseau et sert le cache — vide à la première visite.
//
// Relevé sur le sw.js construit avant correction : sandre 6 s (pour 973 ko),
// gbif 6 s (pour 537 ko), overpass 8 s (pour un serveur réglé à 25 s).

describe("SW_DELAIS_S", () => {
  it("ne coupe jamais avant l'application", () => {
    for (const s of Object.keys(DELAIS_MS) as SourceReseau[]) {
      expect(SW_DELAIS_S[s] * 1000).toBeGreaterThanOrEqual(DELAIS_MS[s]);
    }
  });

  it("couvre toutes les sources que l'app connaît", () => {
    expect(Object.keys(SW_DELAIS_S).sort()).toEqual(Object.keys(DELAIS_MS).sort());
  });

  it("laisse au Sandre de quoi livrer 973 ko", () => {
    // 6 s auparavant : le service worker abandonnait, servait un cache vide, et
    // la couche hydrographie n'apparaissait jamais au premier lancement.
    expect(SW_DELAIS_S.sandre).toBeGreaterThanOrEqual(25);
  });

  it("laisse Overpass finir le travail que son serveur a accepté", () => {
    expect(SW_DELAIS_S.overpass).toBeGreaterThanOrEqual(25);
  });
});
