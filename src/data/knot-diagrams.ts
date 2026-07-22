import type { MediaEntry } from "./media";

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
