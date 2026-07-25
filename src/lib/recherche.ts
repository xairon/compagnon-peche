import type { Species } from "../types";
import { norm } from "./helpers";

/**
 * Variety and vernacular names an angler is likely to type, mapped to the
 * species id they belong to.
 *
 * Carp scale varieties are the reason this exists: miroir, cuir and royale are
 * not species but scale patterns of *Cyprinus carpio*, so TAXREF — and the app,
 * correctly — lists only "carpe commune". An angler searching "carpe miroir"
 * found nothing at all. Same for the regional names people actually use.
 *
 * These are search aliases, never a claim that they are distinct species: the
 * fiche says so explicitly (see speciesAliases).
 */
const ALIASES: Record<string, string[]> = {
  // Variétés d'écailles de la carpe commune — même espèce, Cyprinus carpio.
  carpe: ["carpe miroir", "miroir", "carpe cuir", "cuir", "carpe royale", "royale", "koi", "koï", "carpe koï"],
  // Noms populaires et régionaux courants.
  gardon: ["gardèche", "rousse", "vengeron"],
  chevesne: ["chevaine", "cabot", "meunier"],
  brochet: ["bec de canard"],
  "perche-soleil": ["calicoba", "perche arc-en-ciel"],
  "poisson-chat": ["barbotte"],
  ablette: ["able"],
  vandoise: ["dard", "seuffe"],
  hotu: ["nase"],
  "truite-arc-en-ciel": ["arc en ciel"],
  silure: ["silure glane", "poisson-chat géant"],
  anguille: ["pibale", "civelle"],
  tanche: ["tanche verte"],
  "black-bass": ["achigan", "perche truitée"],
};

/** Species ids carrying aliases — exposed so a test can prove none is a typo
 *  (an alias pointing at a non-existent id would silently match nothing). */
export const ALIASES_IDS: Record<string, true> = Object.fromEntries(
  Object.keys(ALIASES).map((k) => [k, true as const]),
);

/** The variety / vernacular names known for a species, for display on its fiche. */
export function speciesAliases(id: string): string[] {
  return ALIASES[id] ?? [];
}

/**
 * Whether a species answers a free-text query — by name, latin name, or any of
 * the variety and vernacular names above. An empty query matches everything.
 */
export function matchSpecies(sp: Species, query: string): boolean {
  const q = norm(query);
  if (!q) return true;
  if (norm(sp.name).includes(q) || norm(sp.latin).includes(q)) return true;
  return speciesAliases(sp.id).some((a) => norm(a).includes(q));
}
