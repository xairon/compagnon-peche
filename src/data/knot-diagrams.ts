import type { MediaEntry } from "./media";
import { LOCAL_KNOT_STEPS } from "./knot-step-media";
import { KNOT_STEP_MEDIA } from "./media";

// Hand-drawn rig schematics (original SVGs, in-app) for the rigs that have no
// free diagram on Wikimedia Commons. Merged over the fetched KNOT_MEDIA.
export const LOCAL_KNOT_MEDIA: Record<string, MediaEntry> = {
  dropshot: {
    file: "assets/knots/dropshot.svg",
    author: "Compagnon de pêche",
    license: "Schéma original",
    sourceUrl: "",
  },
  paternoster: {
    file: "assets/knots/paternoster.svg",
    author: "Compagnon de pêche",
    license: "Schéma original",
    sourceUrl: "",
  },
  raccord: {
    file: "assets/knots/raccord.svg",
    author: "Compagnon de pêche",
    license: "Schéma original",
    sourceUrl: "",
  },
};

/** Toutes les séquences par étape, sourcées Commons + dessinées maison,
 *  fusionnées par id. `KNOT_STEP_MEDIA` (généré, Task 2) n'existe pas encore
 *  à ce stade du plan — le fournir vide temporairement le rend possible. */
export const ALL_KNOT_STEP_MEDIA: Record<string, MediaEntry[]> = {
  ...KNOT_STEP_MEDIA,
  ...LOCAL_KNOT_STEPS,
};
