import { describe, it, expect } from "vitest";
import { matchSpecies, speciesAliases, ALIASES_IDS } from "./recherche";
import { SPECIES } from "../data/species";

const trouve = (q: string) => SPECIES.filter((sp) => matchSpecies(sp, q)).map((sp) => sp.id);

describe("matchSpecies", () => {
  it("trouve par nom", () => {
    expect(trouve("brochet")).toContain("brochet");
  });

  it("trouve par latin", () => {
    expect(trouve("esox")).toContain("brochet");
  });

  it("ignore les accents et la casse", () => {
    expect(trouve("BRÔCHET")).toContain("brochet");
  });

  // Le point de départ : miroir, cuir et royale ne sont pas des espèces mais des
  // variétés d'écailles de Cyprinus carpio. Taxonomiquement l'app a raison de ne
  // pas les lister ; pour un pêcheur, taper « carpe miroir » et ne rien trouver
  // est un trou.
  it("trouve la carpe commune par ses variétés d'écailles", () => {
    for (const q of ["carpe miroir", "miroir", "carpe cuir", "cuir", "carpe royale", "koi", "koï"]) {
      expect(trouve(q), `« ${q} » doit mener à la carpe`).toContain("carpe");
    }
  });

  it("trouve par nom populaire régional", () => {
    expect(trouve("sandre")).toContain("sandre");
    expect(trouve("gardèche")).toContain("gardon");
  });

  it("une requête vide ne filtre rien", () => {
    expect(matchSpecies(SPECIES[0], "")).toBe(true);
  });

  it("une requête sans correspondance ne rend rien", () => {
    expect(trouve("zzzz")).toEqual([]);
  });
});

describe("speciesAliases", () => {
  it("expose les variétés d'une espèce pour affichage sur sa fiche", () => {
    const a = speciesAliases("carpe");
    expect(a).toContain("miroir");
    expect(a.length).toBeGreaterThan(2);
  });

  it("rend un tableau vide pour une espèce sans variété connue", () => {
    expect(speciesAliases("sandre")).toEqual([]);
  });
});

/**
 * Un alias pointant vers un identifiant inexistant est muet : la recherche ne
 * renverrait rien, sans erreur. Ce test l'attrape (c'est arrivé : « carpe » est
 * l'id, pas « carpe-commune »).
 */
describe("intégrité des alias", () => {
  it("chaque espèce référencée existe", () => {
    const ids = new Set(SPECIES.map((s) => s.id));
    const orphelins = Object.keys(ALIASES_IDS).filter((id) => !ids.has(id));
    expect(orphelins).toEqual([]);
  });

  it("chaque alias mène bien à son espèce", () => {
    const muets: string[] = [];
    for (const id of Object.keys(ALIASES_IDS)) {
      for (const alias of speciesAliases(id)) {
        const hits = SPECIES.filter((sp) => matchSpecies(sp, alias)).map((s) => s.id);
        if (!hits.includes(id)) muets.push(`${alias} → ${id}`);
      }
    }
    expect(muets).toEqual([]);
  });
});
