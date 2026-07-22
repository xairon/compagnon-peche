import { useState } from "react";
import { SPECIES_MEDIA, KNOT_MEDIA, RECIPE_MEDIA, TECHNIQUE_MEDIA } from "../data/media";
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

interface MediaProps {
  kind: "species" | "knot" | "recipe" | "technique";
  id: string;
  placeholder: string;
  dark?: boolean;
}

const MEDIA_BY_KIND = {
  species: SPECIES_MEDIA,
  knot: ALL_KNOT_MEDIA,
  recipe: RECIPE_MEDIA,
  technique: TECHNIQUE_MEDIA,
};

/**
 * Renders a locally-embedded, free-licensed photo when we have one for `id`,
 * otherwise the striped placeholder. Attribution lives on the Crédits screen.
 */
export function Media({ kind, id, placeholder, dark }: MediaProps) {
  const [failed, setFailed] = useState(false);
  // Species now carry an array of photos (gallery); single-image contexts use the first.
  const raw = MEDIA_BY_KIND[kind][id];
  const entry = Array.isArray(raw) ? raw[0] : raw;
  if (entry && !failed) {
    return (
      <img
        className="media-img"
        src={import.meta.env.BASE_URL + entry.file}
        alt={placeholder}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  // No entry, or the file failed to load → striped placeholder (never a broken-image icon).
  return <div className={"img-slot" + (dark ? " dark" : "")}>{placeholder}</div>;
}

/** Media for a confusion species referenced by its French display name. */
export function confusionMediaId(name: string): string | null {
  return NAME_TO_ID[name] ?? null;
}

/** Whether a locally-embedded image exists for this id/kind (to prefer it). */
export function hasMedia(kind: MediaProps["kind"], id: string): boolean {
  const m = MEDIA_BY_KIND[kind][id];
  return Array.isArray(m) ? m.length > 0 : !!m;
}
