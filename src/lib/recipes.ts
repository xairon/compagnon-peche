import { SPECIES } from "../data/species";
import { RECIPES } from "../data/recipes";
import { CRAYFISH_RECIPES } from "../data/ecrevisses-recipes";
import { crayfishById } from "../data/ecrevisses";
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

/** Whether an id belongs to the fish catalogue, the crayfish catalogue, or neither —
 *  the single place that knows both catalogues, so Recette.tsx never has to. */
export function resolveSpeciesRef(
  id: string,
): { kind: "fish" | "crayfish" | "unknown"; id: string; name: string } {
  const sp = SPECIES.find((s) => s.id === id);
  if (sp) return { kind: "fish", id, name: sp.name };
  const cr = crayfishById(id);
  if (cr) return { kind: "crayfish", id, name: cr.name };
  return { kind: "unknown", id, name: id };
}

/** Look up a recipe (and a representative species name) by id, across both the
 *  fish and crayfish recipe catalogues. */
export function findRecipe(id: string | null): { recipe: Recipe; speciesName: string } | null {
  if (!id) return null;
  const recipe = RECIPES.find((r) => r.id === id) ?? CRAYFISH_RECIPES.find((r) => r.id === id);
  if (!recipe) return null;
  return { recipe, speciesName: resolveSpeciesRef(recipe.species[0]).name };
}
