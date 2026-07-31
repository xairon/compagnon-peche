/**
 * Est-ce que la réponse contient tout ce que la source avait à donner ?
 *
 * Les couches WFS du Sandre sont plafonnées par un `COUNT` que rien n'avouait.
 * Trois situations mesurées le 31/07/2026, sur une boîte de 0,5° × 0,6° autour
 * de Blois :
 *
 *   CoursEau1    COUNT=500  numberMatched=10   10 rendus   → complet
 *   PlanEau_FXX  COUNT=400  numberMatched=316  316 rendus  → complet
 *   ObstEcoul    COUNT=200  aucun compteur     200 rendus  → saturé, total inconnu
 *
 * La troisième est la vraie difficulté : la couche des obstacles ne publie
 * aucun compteur, et le seul signal disponible est que le nombre rendu égale
 * exactement le plafond demandé. On ne peut alors pas dire combien il en
 * manque — seulement qu'il en manque peut-être. C'est un troisième état, et le
 * confondre avec « complet » est précisément ce que faisait l'app.
 */

export type EtatTroncature = "complet" | "tronque" | "sature";

export interface Troncature {
  etat: EtatTroncature;
  rendus: number;
  /** Total annoncé par la source, ou null quand elle ne l'annonce pas. */
  total: number | null;
}

export function troncature({
  numberMatched,
  rendus,
  plafond,
}: {
  numberMatched: number | undefined;
  rendus: number;
  plafond: number;
}): Troncature {
  if (typeof numberMatched === "number" && Number.isFinite(numberMatched)) {
    // Le compteur fait foi, même si le plafond n'a pas été atteint : une source
    // qui annonce 900 et n'en rend que 200 est tronquée.
    return numberMatched > rendus
      ? { etat: "tronque", rendus, total: numberMatched }
      : { etat: "complet", rendus, total: numberMatched };
  }
  // Sans compteur, la saturation du plafond est le seul indice — et il ne dit
  // pas combien manquent.
  return rendus >= plafond
    ? { etat: "sature", rendus, total: null }
    : { etat: "complet", rendus, total: null };
}

/** Phrase à afficher, ou null quand il n'y a rien à avouer. `quoi` est un nom
 *  au pluriel (« ouvrages », « cours d'eau », « plans d'eau »). */
export function texteTroncature(t: Troncature, quoi: string): string | null {
  if (t.etat === "complet") return null;
  if (t.etat === "tronque") {
    return `${t.rendus} ${quoi} affichés sur ${t.total} dans la zone — zoomez pour voir le reste.`;
  }
  return `${t.rendus} ${quoi} affichés, soit le maximum demandé — la source ne dit pas combien il y en a en tout. Zoomez pour en voir davantage.`;
}

/** Le compteur `numberMatched` d'une réponse WFS, ou undefined.
 *
 *  Passe par `unknown` parce que les couches n'ont pas toutes le même type dans
 *  l'app (le repli d'une requête échouée est un GeoJSON nu). Une valeur absente
 *  ou non numérique rend undefined, jamais 0 : « la source ne le dit pas » et
 *  « la source dit qu'il n'y en a aucun » sont deux réponses différentes. */
export function compteurWfs(fc: unknown): number | undefined {
  const n = (fc as { numberMatched?: unknown } | null | undefined)?.numberMatched;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}
