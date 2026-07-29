import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { CRAYFISH_RECIPES } from "./ecrevisses-recipes";
import { ECREVISSES, crayfishById } from "./ecrevisses";
import { RECIPE_MEDIA } from "./media";

describe("recettes d'écrevisses", () => {
  it("existe au moins une recette", () => {
    expect(CRAYFISH_RECIPES.length).toBeGreaterThan(0);
  });

  it("les identifiants sont uniques", () => {
    const ids = CRAYFISH_RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("chaque Recipe.species[] id résout dans ECREVISSES", () => {
    const ids = new Set(ECREVISSES.map((e) => e.id));
    const fautes: string[] = [];
    for (const r of CRAYFISH_RECIPES) {
      for (const spId of r.species) {
        if (!ids.has(spId)) fautes.push(`${r.id} → ${spId}`);
      }
    }
    expect(fautes).toEqual([]);
  });

  // On ne cuisine pas une espèce qu'on ne peut pas prélever : symétrique au
  // test côté poissons qui interdit une recette sur une espèce EDIBILITY "non".
  it("aucune recette ne vise une écrevisse fermée (pechable: false)", () => {
    const fautes: string[] = [];
    for (const r of CRAYFISH_RECIPES) {
      for (const spId of r.species) {
        if (crayfishById(spId)?.pechable === false) fautes.push(`${r.id} → ${spId}`);
      }
    }
    expect(fautes).toEqual([]);
  });

  it("chaque recette a un safety décrivant une cuisson à cœur, sans avis sanitaire inventé", () => {
    for (const r of CRAYFISH_RECIPES) {
      expect(r.safety, `${r.id}.safety`).toBeTruthy();
      // Aucune donnée ANSES/PCB n'existe pour les écrevisses dans ce projet —
      // en inventer une contredirait la règle "rien n'est inventé".
      expect(r.safety, `${r.id}.safety ne doit pas inventer un avis ANSES`).not.toMatch(/ANSES/i);
    }
  });

  it("chaque fichier de RECIPE_MEDIA cité par une recette d'écrevisse existe sous public/", () => {
    const ids = new Set(CRAYFISH_RECIPES.map((r) => r.id));
    const manquants = Object.entries(RECIPE_MEDIA)
      .filter(([id]) => ids.has(id))
      .filter(([, m]) => !existsSync(join(process.cwd(), "public", m.file)))
      .map(([id, m]) => `${id} → ${m.file}`);
    expect(manquants).toEqual([]);
  });
});
