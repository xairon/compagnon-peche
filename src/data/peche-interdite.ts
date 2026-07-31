import type { Species } from "../types";

/**
 * La garde « on ne dit pas comment pêcher ce qu'on ne peut pas pêcher ».
 *
 * Sortie de `fiches/index.ts` parce qu'elle ne doit PAS dépendre du chargement
 * paresseux des fiches. Les sections descriptives (identification, pêche,
 * cuisine, biologie) pèsent 182 ko et n'intéressent que l'écran Fiche : elles
 * partent dans un module chargé à la demande. Cette règle-là, en revanche,
 * décide de ce que l'app A LE DROIT d'afficher — elle reste dans le catalogue
 * de base, celui que tous les écrans lisent.
 *
 * Sans cette séparation, un écran chargé avant les fiches aurait pu proposer
 * une technique de pêche sur une espèce protégée pendant une fraction de
 * seconde. Une garde réglementaire ne se charge pas en différé.
 */

/** Une espèce que personne ne peut simplement prendre et garder : lui expliquer
 *  comment la pêcher, ou comment la cuisiner, contredit tout le reste. */
export function nePasPecher(sp: Species): boolean {
  return !!sp.protected || sp.season === "special";
}

/**
 * Retire les sections pêche et cuisine d'une espèce qu'on ne peut pas prendre.
 *
 * Ajouter ne suffisait pas : le générateur donne à chaque espèce « base » un
 * bloc « Pêche » générique, si bien que l'esturgeon en gardait un quoi qu'une
 * fiche écrive. Et une fiche rédigée à la main peut se tromper aussi — l'ide
 * mélanote est arrivée avec une technique et une recette sous sa propre
 * bannière rouge « espèce protégée ».
 */
export function sansPecheInterdite(sp: Species): Species {
  if (!nePasPecher(sp)) return sp;
  return { ...sp, fish: undefined, cook: undefined };
}
