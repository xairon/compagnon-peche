import { SPECIES } from "../data/species";
import { RECIPES } from "../data/recipes";
import { CRAYFISH_RECIPES } from "../data/ecrevisses-recipes";
import { crayfishById } from "../data/ecrevisses";
import { norm } from "./helpers";
import { TECHNIQUES } from "../data/techniques";
import type { Recipe, PersonalRecipe, Technique, Catch, CrayfishSession } from "../types";

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

export type RecipeFilters = {
  especeId?: string;
  maxMinutes?: 20 | 45;
  bivouacOnly?: boolean;
};

export type RecipeHit =
  | { kind: "guide"; recipe: Recipe }
  | { kind: "perso"; recipe: PersonalRecipe };

/** Texte cherchable d'une recette du guide : titre, intro, ingrédients, les noms
 *  des techniques liées (pour qu'une recherche sur "ikejime" trouve les recettes qui
 *  l'utilisent même si le mot n'apparaît nulle part ailleurs dans leur texte), et les
 *  noms des espèces liées (pour qu'une recherche sur "fario" trouve "Truite à la
 *  meunière"/"Truite au bleu" même si "fario" n'apparaît dans aucun titre — c'est
 *  notamment ce que prefill la suggestion "D'après vos prises" dans CarnetRecettes). */
function guideHaystack(r: Recipe): string {
  const techNames = (r.techniques ?? [])
    .map((id) => TECHNIQUES.find((t) => t.id === id)?.name)
    .filter(Boolean)
    .join(" ");
  const speciesNames = r.species.map((id) => resolveSpeciesRef(id).name).join(" ");
  return norm([r.title, r.intro ?? "", ...r.ing, techNames, speciesNames].join(" "));
}

function persoHaystack(r: PersonalRecipe): string {
  return norm([r.title, ...r.ing].join(" "));
}

/** Durée totale d'une recette, en traitant cook===0 comme "non chiffrée" — jamais
 *  additionnée à prep comme si c'était un vrai total (voir la recette de conserves
 *  d'alose : cook:0 est délibéré, la stérilisation n'a pas de durée sûre à afficher). */
function totalMinutes(r: Recipe): number | null {
  return r.cook > 0 ? r.prep + r.cook : null;
}

export function searchRecipes(
  query: string,
  filters: RecipeFilters,
  guide: Recipe[],
  perso: PersonalRecipe[],
): RecipeHit[] {
  const q = norm(query.trim());
  const hasTimeOrBivouac = filters.maxMinutes !== undefined || filters.bivouacOnly === true;

  const guideHits: RecipeHit[] = guide
    .filter((r) => !q || guideHaystack(r).includes(q))
    .filter((r) => !filters.especeId || r.species.includes(filters.especeId))
    .filter((r) => {
      if (filters.maxMinutes === undefined) return true;
      const total = totalMinutes(r);
      return total !== null && total <= filters.maxMinutes;
    })
    .filter((r) => !filters.bivouacOnly || r.bivouac === true)
    .map((recipe) => ({ kind: "guide" as const, recipe }));

  // Une recette personnelle n'a ni difficulty/prep/cook ni bivouac : dès qu'un de ces
  // deux filtres est actif, elle ne peut pas être évaluée honnêtement — on l'exclut
  // plutôt que de lui prêter une valeur qu'elle ne porte pas.
  const persoHits: RecipeHit[] = hasTimeOrBivouac
    ? []
    : perso
        .filter((r) => !q || persoHaystack(r).includes(q))
        .filter((r) => !filters.especeId || r.species.includes(filters.especeId))
        .map((recipe) => ({ kind: "perso" as const, recipe }));

  return [...guideHits, ...persoHits];
}

export function searchTechniques(query: string, techniques: Technique[]): Technique[] {
  const q = norm(query.trim());
  if (!q) return techniques;
  return techniques.filter((t) => norm(`${t.name} ${t.summary}`).includes(q));
}

/** Espèces réellement reliées à au moins une recette du guide — jamais le catalogue
 *  complet, qui mènerait en grande partie à zéro résultat une fois choisi. */
export function searchableSpecies(guide: Recipe[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of guide) {
    for (const id of r.species) {
      if (!seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  return out;
}

/** Jusqu'à 3 suggestions dérivées des prises réelles (poissons) et des relevés
 *  d'écrevisses (sessions), les plus récentes d'abord, dédupliquées par espèce, et
 *  seulement pour une espèce qui a au moins une vraie recette. */
export function recentCatchRecipes(
  catches: Catch[],
  sessions: CrayfishSession[],
  guide: Recipe[],
): { speciesId: string; speciesName: string; recipes: Recipe[] }[] {
  type Entry = { spid: string; whenMs: number };

  const fromCatches: Entry[] = catches.map((c) => ({
    spid: c.spid,
    whenMs: new Date(`${c.iso}T${c.time || "00:00"}`).getTime(),
  }));

  const fromSessions: Entry[] = sessions.flatMap((s) =>
    s.tally
      .filter((t) => t.count > 0)
      .map((t) => ({ spid: t.spId, whenMs: s.fin ?? s.debut })),
  );

  const merged = [...fromCatches, ...fromSessions].sort((a, b) => b.whenMs - a.whenMs);

  const seen = new Set<string>();
  const out: { speciesId: string; speciesName: string; recipes: Recipe[] }[] = [];
  for (const { spid } of merged) {
    if (seen.has(spid)) continue;
    seen.add(spid);
    const recipes = guide.filter((r) => r.species.includes(spid));
    if (recipes.length === 0) continue;
    out.push({ speciesId: spid, speciesName: resolveSpeciesRef(spid).name, recipes });
    if (out.length >= 3) break;
  }
  return out;
}
