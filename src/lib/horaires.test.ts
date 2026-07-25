import { describe, it, expect } from "vitest";
import { sunTimes } from "./astro";
import { DEPARTEMENTS, type DeptId } from "../data/regulation";

/**
 * Les horaires légaux (½ h avant le lever → ½ h après le coucher) étaient
 * calculés à Blois quel que soit le département actif. En Creuse, le coucher
 * réel est ~10 min plus tôt : l'écran annonçait « pêche autorisée » après la
 * fermeture légale — plus permissif que la loi, sur une carte intitulée
 * « repères réglementaires ».
 */
const JOUR = new Date("2026-06-21T12:00:00");

describe("horaires légaux par département", () => {
  it("chaque département porte des coordonnées et son chef-lieu", () => {
    for (const id of ["23", "36", "41"] as DeptId[]) {
      const d = DEPARTEMENTS[id];
      expect(Number.isFinite(d.lat), `${id} lat`).toBe(true);
      expect(Number.isFinite(d.lon), `${id} lon`).toBe(true);
      expect(d.chefLieu.length).toBeGreaterThan(2);
    }
  });

  it("les couchers diffèrent réellement d'un département à l'autre", () => {
    const couchers = (["23", "36", "41"] as DeptId[]).map((id) => {
      const d = DEPARTEMENTS[id];
      return sunTimes(JOUR, d.lat, d.lon).sunset!.getTime();
    });
    expect(new Set(couchers).size).toBe(3);
  });

  // Le point le plus à l'est se couche le plus tôt : c'est le cas de la Creuse
  // face au Loir-et-Cher, et c'est l'écart qui créait l'erreur.
  it("la Creuse se couche avant le Loir-et-Cher", () => {
    const c23 = sunTimes(JOUR, DEPARTEMENTS["23"].lat, DEPARTEMENTS["23"].lon).sunset!;
    const c41 = sunTimes(JOUR, DEPARTEMENTS["41"].lat, DEPARTEMENTS["41"].lon).sunset!;
    expect(c23.getTime()).toBeLessThan(c41.getTime());
    const ecartMin = (c41.getTime() - c23.getTime()) / 60000;
    expect(ecartMin).toBeGreaterThan(5);
  });
});
