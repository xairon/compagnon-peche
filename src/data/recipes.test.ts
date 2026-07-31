import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { RECIPES } from "./recipes";
import { TECHNIQUES } from "./techniques";
import { SPECIES } from "./species";
import { EDIBILITY } from "./edibility";
import { RECIPE_MEDIA, TECHNIQUE_MEDIA } from "./media";
import { recipesForSpecies } from "../lib/recipes";

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

/**
 * L'app dit à son utilisateur qu'il DOIT tuer certaines prises : les espèces
 * `invasive` dont la base légale est R432-5 ne peuvent pas être remises vivantes
 * à l'eau (cf. src/lib/statut.ts, libellé « Ne pas relâcher »). Lui imposer la
 * mise à mort sans lui dire quoi en faire est le trou que ce test ferme.
 *
 * Le filtre est volontairement étroit : une espèce ne doit une recette que si
 * l'app la déclare comestible (EDIBILITY « oui ») ET qu'elle porte déjà des
 * conseils de cuisine (`cook`) — c'est-à-dire que l'éditorial a déjà jugé
 * qu'elle valait la casserole. Les gobies ponto-caspiens, la gambusie, le
 * pseudorasbora et la tête-de-boule n'ont pas de `cook` (poissons de 5 à 10 cm
 * sans intérêt culinaire) : ils sortent d'eux-mêmes, sans liste d'exemptions
 * à maintenir à la main.
 */
describe("les invasives qu'on doit tuer ont une recette", () => {
  it("toute espèce invasive comestible et pourvue de conseils de cuisine a au moins une recette", () => {
    const sans = SPECIES.filter(
      (s) => s.invasive && s.cook && EDIBILITY[s.id]?.status === "oui",
    )
      .filter((s) => recipesForSpecies(s.id).length === 0)
      .map((s) => s.id);
    expect(sans).toEqual([]);
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
  it("compte actuellement 22 recettes", () => {
    expect(RECIPES.length).toBe(22);
  });

  it("aucun id de recette en double", () => {
    const ids = RECIPES.map((r) => r.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});
