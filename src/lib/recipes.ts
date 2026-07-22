import { SPECIES } from "../data/species";
import { RECIPES } from "../data/recipes";
import type { Recipe } from "../types";

/** Recipes that apply to a species (direct match on the recipe's species list). */
export function recipesForSpecies(id: string): Recipe[] {
  return RECIPES.filter((r) => r.species.includes(id));
}

/** French display name for a species id (falls back to the id). */
export function speciesName(id: string): string {
  return SPECIES.find((s) => s.id === id)?.name || id;
}

/** Look up a recipe (and a representative species name) by id. */
export function findRecipe(id: string | null): { recipe: Recipe; speciesName: string } | null {
  if (!id) return null;
  const recipe = RECIPES.find((r) => r.id === id);
  if (!recipe) return null;
  return { recipe, speciesName: speciesName(recipe.species[0]) };
}
