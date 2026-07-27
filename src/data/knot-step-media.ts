import type { MediaEntry } from "./media";

/**
 * Séquences dessinées à la main, une entrée par étape (même ordre que
 * Knot.steps), pour les montages/nœuds que Wikimedia Commons ne couvre pas.
 * Un id absent d'ici simplement n'a pas encore de schéma maison — jamais de
 * tableau vide ou d'entrée factice en attendant.
 */
export const LOCAL_KNOT_STEPS: Record<string, MediaEntry[]> = {
  raccord: [
    { file: "assets/knots/raccord-1.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/raccord-2.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/raccord-3.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
  ],
  dropshot: [
    { file: "assets/knots/dropshot-1.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/dropshot-2.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/dropshot-3.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
  ],
  texan: [
    { file: "assets/knots/texan-1.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/texan-2.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/texan-3.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
  ],
  paternoster: [
    { file: "assets/knots/paternoster-1.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/paternoster-2.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/paternoster-3.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
  ],
  carolina: [
    { file: "assets/knots/carolina-1.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/carolina-2.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/carolina-3.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
  ],
  wacky: [
    { file: "assets/knots/wacky-1.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/wacky-2.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/wacky-3.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
  ],
};
