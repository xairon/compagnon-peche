// Non-component media helpers, split out of Media.tsx so that file only
// exports the Media component (react-refresh/only-export-components requires
// a component file's exports to stay component-only).
import { SPECIES_MEDIA, KNOT_MEDIA, RECIPE_MEDIA, TECHNIQUE_MEDIA, GEAR_MEDIA, CRAYFISH_MEDIA } from "../data/media";
import { LOCAL_KNOT_MEDIA } from "../data/knot-diagrams";
import { SPECIES } from "../data/species";
import { norm } from "../lib/helpers";

/** Fetched knot diagrams plus hand-drawn originals for rigs Commons lacks. */
export const ALL_KNOT_MEDIA = { ...KNOT_MEDIA, ...LOCAL_KNOT_MEDIA };

/**
 * Confusion-species display names → media ids, for names the catalogue does NOT
 * already answer: shortened forms ("Carpe" for "Carpe commune"), photos whose
 * id differs from the species id, and species with a photo but no Species entry
 * (grémille, carassin).
 *
 * Everything a fiche calls by its catalogue name resolves through SPECIES — see
 * confusionMediaId. Maintaining those by hand covered a third of the ~60 names
 * the fiches cite, so most confusion blocks showed an empty frame beside the
 * text while the photo was embedded and precached.
 */
export const NAME_TO_ID: Record<string, string> = {
  // Short forms: the fiche says "Silure", the catalogue says "Silure glane".
  Silure: "silure",
  Carpe: "carpe",
  Carassin: "carassin",
  Ombre: "ombre",
  Anguille: "anguille",
  // Sea trout: cited when distinguishing the salmon, regulated (fishing closed
  // all year here), photographed — but with no fiche of its own, so nothing in
  // SPECIES answers the name.
  "Truite de mer": "truite-de-mer",
};

export const MEDIA_BY_KIND = {
  species: SPECIES_MEDIA,
  knot: ALL_KNOT_MEDIA,
  recipe: RECIPE_MEDIA,
  technique: TECHNIQUE_MEDIA,
  gear: GEAR_MEDIA,
  crayfish: CRAYFISH_MEDIA,
};

/** Catalogue names, normalised, so a fiche citing a species by its own name
 *  needs no manual entry. Built once at module load. */
const BY_SPECIES_NAME: Record<string, string> = Object.fromEntries(
  SPECIES.map((s) => [norm(s.name), s.id]),
);

/** Media for a confusion species referenced by its French display name.
 *  Manual aliases win — they exist precisely to override or extend. */
export function confusionMediaId(name: string): string | null {
  const manuel = NAME_TO_ID[name] ?? NAME_TO_ID[name.trim()];
  if (manuel) return manuel;
  return BY_SPECIES_NAME[norm(name.trim())] ?? null;
}

/** Whether a locally-embedded image exists for this id/kind (to prefer it). */
export function hasMedia(kind: keyof typeof MEDIA_BY_KIND, id: string): boolean {
  const m = MEDIA_BY_KIND[kind][id];
  return Array.isArray(m) ? m.length > 0 : !!m;
}
