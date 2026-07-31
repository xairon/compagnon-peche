import { SPECIES } from "../data/species";
import { RECIPES } from "../data/recipes";
import { CRAYFISH_RECIPES } from "../data/ecrevisses-recipes";
import { crayfishById } from "../data/ecrevisses";
import { nePasPecher } from "../data/peche-interdite";
import { norm } from "./helpers";
import { speciesAliases } from "./recherche";
import { speciesStatus } from "./statut";
import { TECHNIQUES } from "../data/techniques";
import type { Recipe, PersonalRecipe, Technique, Catch, CrayfishSession } from "../types";

/** Recipes that apply to a species (direct match on the recipe's species list),
 *  passées par la garde des espèces interdites — voir `recettesPresentables`. */
export function recipesForSpecies(id: string): Recipe[] {
  return recettesPresentables(RECIPES).filter((r) => r.species.includes(id));
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
  // Même garde qu'ailleurs : l'URL porte `recipeId`, donc un lien collé est un
  // chemin d'accès comme un autre vers le corpus.
  if (!recipe || recettesPresentables([recipe]).length === 0) return null;
  return { recipe, speciesName: resolveSpeciesRef(recipe.species[0]).name };
}

const SP_BY_ID = new Map(SPECIES.map((s) => [s.id, s]));

/**
 * La garde de `data/peche-interdite.ts`, appliquée au corpus de recettes.
 *
 * `sansPecheInterdite` retire les sections « Pêche » et « Cuisine » de la FICHE
 * d'une espèce protégée ; elle ne touche pas à RECIPES, qui est un autre
 * catalogue. Un module cuisine qui lit RECIPES en direct ouvrirait donc un
 * second chemin vers ce que la fiche refuse d'écrire — c'est exactement le
 * contournement que la règle existe pour empêcher.
 *
 * Une recette est retirée dès qu'UNE de ses espèces est protégée, pas seulement
 * quand toutes le sont : une recette « brochet ou esturgeon » présenterait
 * quand même l'esturgeon comme quelque chose qu'on cuisine.
 *
 * Le régime spécial (aloses, anguille, lamproies) ne passe PAS par ici : ces
 * espèces restent légalement pêchables selon le bassin, la fiche montre déjà
 * leurs recettes, et les cacher ici fabriquerait une seconde vérité. Ce qu'elles
 * exigent, c'est leur avertissement — voir `especesSousRegime`.
 */
export function recettesPresentables(rs: Recipe[]): Recipe[] {
  return rs.filter((r) => !r.species.some((id) => SP_BY_ID.get(id)?.protected));
}

/** Les espèces de la recette qui sont sous régime spécial ou protégées — les
 *  nommer permet à toute vue de reprendre l'avertissement que porte la fiche
 *  (« moratoires variables par bassin — vérifiez l'arrêté »), plutôt que de
 *  servir la recette toute nue. Vide pour une espèce ordinaire. */
export function especesSousRegime(r: Recipe): string[] {
  return r.species
    .map((id) => SP_BY_ID.get(id))
    .filter((sp) => !!sp && nePasPecher(sp))
    .map((sp) => sp!.name);
}

/**
 * Remise à l'eau vivante interdite : R432-5.
 *
 * Le discriminant n'est pas le libellé (« Ne pas relâcher » vs « Ne pas
 * déplacer ») mais la sévérité que `speciesStatus` lui attache : `cls: "bad"`
 * interdit, `cls: "warn"` demande une vérification. Les gobies ponto-caspiens
 * sont invasifs sous L432-10, qui interdit de les DÉPLACER, pas de les relâcher
 * là où ils ont été pris — ils ne sont donc pas dans ce lot (voir lib/statut.ts).
 *
 * Les trois écrevisses pêchables relèvent du même R432-5 : leur `pechable`
 * porte exactement cette phrase dans `data/ecrevisses.ts`.
 */
export function nePasRelacher(id: string): boolean {
  const sp = SP_BY_ID.get(id);
  if (sp) {
    const st = speciesStatus(sp);
    return st.kind === "invasive" && st.cls === "bad";
  }
  return !!crayfishById(id)?.pechable;
}

/** Espèces qu'on n'a PAS le droit de remettre vivantes à l'eau et qui ont au
 *  moins une recette. C'est le cas d'usage qui a motivé l'ajout des fritures de
 *  perche-soleil et de poisson-chat : l'app impose la mise à mort, elle doit
 *  dire quoi en faire — et il faut pouvoir le trouver en un geste. */
export function especesANePasRelacher(
  guide: Recipe[],
): { id: string; name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of recettesPresentables(guide)) {
    for (const id of new Set(r.species)) {
      if (!nePasRelacher(id)) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([id, count]) => ({ id, name: resolveSpeciesRef(id).name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Techniques réellement déclarées par au moins une recette présentable — jamais
 *  le catalogue complet, qui offrirait des filtres menant à zéro résultat (même
 *  raison que `searchableSpecies`). */
export function searchableTechniques(guide: Recipe[]): Technique[] {
  const used = new Set(recettesPresentables(guide).flatMap((r) => r.techniques ?? []));
  return TECHNIQUES.filter((t) => used.has(t.id));
}

export type RecipeFilters = {
  especeId?: string;
  maxMinutes?: 20 | 45;
  bivouacOnly?: boolean;
  difficulty?: 1 | 2 | 3;
  techniqueId?: string;
  /** Ne garder que ce qu'on doit tuer de toute façon (R432-5). */
  nePasRelacherOnly?: boolean;
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
/** Les mots par lesquels on peut désigner les espèces d'une recette : leur nom
 *  officiel ET les noms vernaculaires de `lib/recherche.ts`. Personne au bord de
 *  l'eau ne tape « Ameiurus melas » : on dit barbotte. La carpe miroir n'est pas
 *  une espèce mais une variété d'écailles — le mot ne figure donc dans aucune
 *  recette de carpe, et sans alias la recherche rendait zéro. */
function especeHaystack(r: { species: string[] }): string {
  return norm(
    r.species.map((id) => [resolveSpeciesRef(id).name, ...speciesAliases(id)].join(" ")).join(" "),
  );
}

function guideHaystack(r: Recipe): string {
  const techNames = (r.techniques ?? [])
    .map((id) => TECHNIQUES.find((t) => t.id === id)?.name)
    .filter(Boolean)
    .join(" ");
  return norm([r.intro ?? "", ...r.ing, ...(r.tools ?? []), techNames].join(" "));
}

function persoHaystack(r: PersonalRecipe): string {
  return norm([...r.ing, r.note ?? ""].join(" "));
}

/**
 * Pertinence, en trois crans : le titre, puis l'espèce, puis le reste.
 *
 * Sans classement, c'est l'ordre du fichier `recipes.ts` qui décidait : chercher
 * « beurre » sortait d'abord les recettes qui en mettent une noisette, et « Sandre
 * & brochet au beurre blanc » arrivait treizième. 0 = pas de correspondance.
 */
function pertinence(titre: string, espece: string, reste: string, q: string): number {
  if (!q) return 1;
  if (titre.includes(q)) return 3;
  if (espece.includes(q)) return 2;
  if (reste.includes(q)) return 1;
  return 0;
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
  // Une recette personnelle n'a ni difficulty, ni prep/cook, ni bivouac, ni
  // techniques : dès qu'un de ces filtres est actif, elle ne peut pas être
  // évaluée honnêtement — on l'exclut plutôt que de lui prêter une valeur
  // qu'elle ne porte pas. Le filtre « à ne pas relâcher », lui, se juge sur les
  // espèces liées, que la recette personnelle porte bien : il ne l'exclut pas.
  const filtreReserveAuGuide =
    filters.maxMinutes !== undefined ||
    filters.bivouacOnly === true ||
    filters.difficulty !== undefined ||
    filters.techniqueId !== undefined;

  const scored: { hit: RecipeHit; score: number }[] = [];

  // Les recettes personnelles d'abord, à score égal : ce sont celles de
  // l'utilisateur, elles n'ont pas à passer derrière vingt-cinq recettes du
  // guide dans la même liste.
  if (!filtreReserveAuGuide) {
    for (const r of perso) {
      if (filters.especeId && !r.species.includes(filters.especeId)) continue;
      if (filters.nePasRelacherOnly && !r.species.some(nePasRelacher)) continue;
      const score = pertinence(norm(r.title), especeHaystack(r), persoHaystack(r), q);
      if (score > 0) scored.push({ hit: { kind: "perso", recipe: r }, score });
    }
  }

  for (const r of recettesPresentables(guide)) {
    if (filters.especeId && !r.species.includes(filters.especeId)) continue;
    if (filters.maxMinutes !== undefined) {
      const total = totalMinutes(r);
      if (total === null || total > filters.maxMinutes) continue;
    }
    if (filters.bivouacOnly && r.bivouac !== true) continue;
    if (filters.difficulty !== undefined && r.difficulty !== filters.difficulty) continue;
    if (filters.techniqueId && !(r.techniques ?? []).includes(filters.techniqueId)) continue;
    if (filters.nePasRelacherOnly && !r.species.some(nePasRelacher)) continue;
    const score = pertinence(norm(r.title), especeHaystack(r), guideHaystack(r), q);
    if (score > 0) scored.push({ hit: { kind: "guide", recipe: r }, score });
  }

  // `sort` est stable : à score égal, l'ordre d'insertion ci-dessus est conservé.
  return scored.sort((a, b) => b.score - a.score).map((s) => s.hit);
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
  for (const r of recettesPresentables(guide)) {
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
  const presentables = recettesPresentables(guide);
  for (const { spid } of merged) {
    if (seen.has(spid)) continue;
    seen.add(spid);
    const recipes = presentables.filter((r) => r.species.includes(spid));
    if (recipes.length === 0) continue;
    out.push({ speciesId: spid, speciesName: resolveSpeciesRef(spid).name, recipes });
    if (out.length >= 3) break;
  }
  return out;
}
