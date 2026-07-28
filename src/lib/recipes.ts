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

const SP_NAME = new Map(SPECIES.map((s) => [s.id, s.name]));

/** Comma-joined French display names for several species ids (personal recipes can link more than one). */
export function spNames(ids: string[]): string {
  return ids.map((id) => SP_NAME.get(id) || id).filter(Boolean).join(", ");
}

/** Look up a recipe (and a representative species name) by id. */
export function findRecipe(id: string | null): { recipe: Recipe; speciesName: string } | null {
  if (!id) return null;
  const recipe = RECIPES.find((r) => r.id === id);
  if (!recipe) return null;
  return { recipe, speciesName: speciesName(recipe.species[0]) };
}
