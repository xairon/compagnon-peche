import type { Recipe } from "../types";

// Recettes d'écrevisses. Même type que les recettes de poisson (src/data/recipes.ts),
// tableau séparé parce que `species[]` référence ici ECREVISSES, pas SPECIES — un
// test dédié (ecrevisses-recipes.test.ts) garde cette séparation.
export const CRAYFISH_RECIPES: Recipe[] = [];
