import type { MediaEntry } from "./media";

/**
 * Schémas dessinés ici, pour les montages que Wikimedia Commons ne couvre pas.
 *
 * Ils sont gardés parce qu'ils font le travail d'une illustration : le montage
 * entier, légendé (corps de ligne, potence, plomb, surface, fond), lisible à
 * 375 px. C'est le seul critère — trente autres fichiers du même dossier, qui
 * réduisaient un nœud à un trait et une ellipse sous une légende, ont été
 * retirés parce qu'ils ne l'étaient pas.
 *
 * Un id absent d'ici et absent de `KNOT_MEDIA` n'a simplement pas
 * d'illustration : la fiche montre son texte, et aucun cadre.
 */
export const LOCAL_KNOT_MEDIA: Record<string, MediaEntry> = {
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
