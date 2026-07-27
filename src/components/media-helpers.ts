// Non-component media helpers, split out of Media.tsx so that file only
// exports the Media component (react-refresh/only-export-components requires
// a component file's exports to stay component-only).
import { SPECIES_MEDIA, KNOT_MEDIA, RECIPE_MEDIA, TECHNIQUE_MEDIA, GEAR_MEDIA } from "../data/media";
import { LOCAL_KNOT_MEDIA } from "../data/knot-diagrams";

/** Fetched knot diagrams plus hand-drawn originals for rigs Commons lacks. */
export const ALL_KNOT_MEDIA = { ...KNOT_MEDIA, ...LOCAL_KNOT_MEDIA };

/** French confusion-species display names → media ids. */
export const NAME_TO_ID: Record<string, string> = {
  Sandre: "sandre",
  Brochet: "brochet",
  Perche: "perche",
  "Black-bass": "black-bass",
  "Silure glane": "silure",
  Silure: "silure",
  "Perche soleil": "perche-soleil",
  "Poisson-chat": "poisson-chat",
  "Truite fario": "truite-fario",
  "Truite arc-en-ciel": "truite-arc-en-ciel",
  "Carpe commune": "carpe",
  Carpe: "carpe",
  Gardon: "gardon",
  "Barbeau fluviatile": "barbeau",
  Grémille: "gremille",
  Carassin: "carassin",
  "Carassin commun": "carassin",
  Rotengle: "rotengle",
  "Brème commune": "breme",
  Tanche: "tanche",
  Ablette: "ablette",
  Chevesne: "chevesne",
  Hotu: "hotu",
  Goujon: "goujon",
  "Ombre commun": "ombre",
  Ombre: "ombre",
  "Omble de fontaine": "omble-fontaine",
  "Anguille européenne": "anguille",
  Anguille: "anguille",
  Vandoise: "vandoise",
};

export const MEDIA_BY_KIND = {
  species: SPECIES_MEDIA,
  knot: ALL_KNOT_MEDIA,
  recipe: RECIPE_MEDIA,
  technique: TECHNIQUE_MEDIA,
  gear: GEAR_MEDIA,
};

/** Media for a confusion species referenced by its French display name. */
export function confusionMediaId(name: string): string | null {
  return NAME_TO_ID[name] ?? null;
}

/** Whether a locally-embedded image exists for this id/kind (to prefer it). */
export function hasMedia(kind: keyof typeof MEDIA_BY_KIND, id: string): boolean {
  const m = MEDIA_BY_KIND[kind][id];
  return Array.isArray(m) ? m.length > 0 : !!m;
}
