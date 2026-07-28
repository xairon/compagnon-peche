import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { RECIPES } from "./recipes";
import { TECHNIQUES } from "./techniques";
import { SPECIES } from "./species";
import { EDIBILITY } from "./edibility";
import { RECIPE_MEDIA, TECHNIQUE_MEDIA } from "./media";

describe("liens recettes ↔ espèces ↔ techniques", () => {
  it("chaque Recipe.species[] id résout dans SPECIES", () => {
    const ids = new Set(SPECIES.map((s) => s.id));
    const fautes: string[] = [];
    for (const r of RECIPES) {
      for (const spId of r.species) {
        if (!ids.has(spId)) fautes.push(`${r.id} → ${spId}`);
      }
    }
    expect(fautes).toEqual([]);
  });

  it("chaque Recipe.techniques[] id résout dans TECHNIQUES", () => {
    const ids = new Set(TECHNIQUES.map((t) => t.id));
    const fautes: string[] = [];
    for (const r of RECIPES) {
      for (const techId of r.techniques ?? []) {
        if (!ids.has(techId)) fautes.push(`${r.id} → ${techId}`);
      }
    }
    expect(fautes).toEqual([]);
  });

  it("chaque Technique.speciesNote id résout dans SPECIES", () => {
    const ids = new Set(SPECIES.map((s) => s.id));
    const fautes: string[] = [];
    for (const t of TECHNIQUES) {
      for (const [spId] of t.speciesNote ?? []) {
        if (!ids.has(spId)) fautes.push(`${t.id} → ${spId}`);
      }
    }
    expect(fautes).toEqual([]);
  });
});

describe("comestibilité des espèces visées par les recettes", () => {
  it("aucune recette ne vise une espèce dont EDIBILITY[id].status === 'non'", () => {
    const fautes: string[] = [];
    for (const r of RECIPES) {
      for (const spId of r.species) {
        if (EDIBILITY[spId]?.status === "non") fautes.push(`${r.id} → ${spId}`);
      }
    }
    expect(fautes).toEqual([]);
  });

  // C'est l'invariant qui aurait attrapé le trou des recettes de carpe : les
  // deux recettes de carpe avaient été livrées sans `safety`, alors que
  // EDIBILITY.carpe porte un avis ANSES (bioaccumulation PCB/dioxines). Toute
  // recette visant une espèce à avis ANSES doit porter elle-même un `safety`
  // qui le mentionne — sans quoi le pêcheur qui suit la recette n'est jamais
  // averti.
  it("toute recette dont une espèce porte un avis ANSES en comestibilité porte elle-même un safety mentionnant l'ANSES", () => {
    const fautes: string[] = [];
    for (const r of RECIPES) {
      const especeAvisAnses = r.species.some((spId) => !!EDIBILITY[spId]?.anses);
      if (especeAvisAnses && !/ANSES/.test(r.safety ?? "")) {
        fautes.push(r.id);
      }
    }
    expect(fautes).toEqual([]);
  });
});

describe("médias recettes/techniques — fichiers réellement présents", () => {
  it("chaque fichier de RECIPE_MEDIA existe sous public/", () => {
    const manquants = Object.entries(RECIPE_MEDIA)
      .filter(([, m]) => !existsSync(join(process.cwd(), "public", m.file)))
      .map(([id, m]) => `${id} → ${m.file}`);
    expect(manquants).toEqual([]);
  });

  it("chaque fichier de TECHNIQUE_MEDIA existe sous public/", () => {
    const manquants = Object.entries(TECHNIQUE_MEDIA)
      .filter(([, m]) => !existsSync(join(process.cwd(), "public", m.file)))
      .map(([id, m]) => `${id} → ${m.file}`);
    expect(manquants).toEqual([]);
  });

  it("chaque clé de RECIPE_MEDIA pointe vers une recette existante", () => {
    const ids = new Set(RECIPES.map((r) => r.id));
    const orphelines = Object.keys(RECIPE_MEDIA).filter((id) => !ids.has(id));
    expect(orphelines).toEqual([]);
  });

  it("chaque clé de TECHNIQUE_MEDIA pointe vers une technique existante", () => {
    const ids = new Set(TECHNIQUES.map((t) => t.id));
    const orphelines = Object.keys(TECHNIQUE_MEDIA).filter((id) => !ids.has(id));
    expect(orphelines).toEqual([]);
  });
});

describe("couverture du corpus", () => {
  it("compte actuellement 18 recettes", () => {
    expect(RECIPES.length).toBe(18);
  });
});
