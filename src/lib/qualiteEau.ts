// Interpretation of the physico-chemical water-quality readings already fetched
// from Hub'Eau (see `nearestQuality` in ./hubeau: dissolved O2, O2 saturation,
// pH — punctual lab samples, not real time). This module NEVER touches the
// network — it classifies plain numbers, so it is testable without mocking
// fetch, the same discipline as ./crue.
//
// THE GRID: SEQ-Eau v2 ("Système d'évaluation de la qualité de l'eau des cours
// d'eau" — grilles d'évaluation, MEDD & Agences de l'eau, 21 mars 2003), table
// "I- Classes d'aptitude à la biologie" (oxygène p.2, acidification/pH p.4).
// Official copy hosted by the Agence de l'eau Rhin-Meuse:
// https://rhin-meuse.eaufrance.fr/IMG/pdf/grilles-seq-eau-v2.pdf
//
// Why THIS grid and not the newer DCE grid (arrêté du 25 janvier 2010, modifié
// 2015/2018/2023): the DCE grid classifies a MASSE D'EAU over a full year
// (percentiles across many samples per the guide technique d'évaluation),
// never a single spot reading — applying it to one Hub'Eau sample would
// misrepresent what the arrêté actually measures, and Hub'Eau exposes no API
// for the aggregated DCE synthesis (only the "rapportage" site does, and it is
// not a queryable API). SEQ-Eau's grid is built for exactly this use: one
// sample against a fixed physico-chemical threshold. It is dated (2003) but
// remains the grid Agences de l'eau publish today for per-sample
// classification. It is NOT a DCE "bon état" verdict, and never a health
// verdict — see classeLabel().

export type QualiteClasse = "tres_bon" | "bon" | "moyen" | "mediocre" | "mauvais";

const RANK: Record<QualiteClasse, number> = { tres_bon: 0, bon: 1, moyen: 2, mediocre: 3, mauvais: 4 };

/** Oxygène dissous (mg/L O2) — seuils SEQ-Eau v2 p.2 (plus il y en a, mieux
 *  c'est : bornes basses par classe). */
export function classeO2(mgL: number): QualiteClasse {
  if (mgL >= 8) return "tres_bon";
  if (mgL >= 6) return "bon";
  if (mgL >= 4) return "moyen";
  if (mgL >= 3) return "mediocre";
  return "mauvais";
}

/** Taux de saturation en oxygène (%) — seuils SEQ-Eau v2 p.2. */
export function classeSaturationO2(pct: number): QualiteClasse {
  if (pct >= 90) return "tres_bon";
  if (pct >= 70) return "bon";
  if (pct >= 50) return "moyen";
  if (pct >= 30) return "mediocre";
  return "mauvais";
}

/** pH — seuils SEQ-Eau v2 p.4 ("Acidification") : bandes emboîtées autour de
 *  la neutralité, un excès dans un sens comme dans l'autre dégrade la classe. */
export function classePh(ph: number): QualiteClasse {
  if (ph >= 6.5 && ph <= 8.2) return "tres_bon";
  if (ph >= 6.0 && ph <= 9.0) return "bon";
  if (ph >= 5.5 && ph <= 9.5) return "moyen";
  if (ph >= 4.5 && ph <= 10.0) return "mediocre";
  return "mauvais";
}

/** Classe globale = la pire des classes disponibles (logique du "paramètre
 *  déclassant" du SEQ-Eau : un seul paramètre mauvais suffit à déclasser
 *  l'ensemble). Ignore les paramètres absents ; null si aucun n'est fourni. */
export function classeGlobale(classes: (QualiteClasse | undefined)[]): QualiteClasse | null {
  const present = classes.filter((c): c is QualiteClasse => c != null);
  if (!present.length) return null;
  return present.reduce((worst, c) => (RANK[c] > RANK[worst] ? c : worst));
}

/** Display copy — factual class name + tone matching the app's existing
 *  .verdict-banner.{good,warn,bad} classes (see crue.ts / Prise.tsx). Never a
 *  health/consumption verdict: that stays ANSES's role, already covered
 *  elsewhere in the app (fiche espèce). This is purely an ecological reading. */
export function classeLabel(c: QualiteClasse): { word: string; tone: "good" | "warn" | "bad" } {
  if (c === "tres_bon") return { word: "Très bonne", tone: "good" };
  if (c === "bon") return { word: "Bonne", tone: "good" };
  if (c === "moyen") return { word: "Moyenne", tone: "warn" };
  if (c === "mediocre") return { word: "Médiocre", tone: "bad" };
  return { word: "Mauvaise", tone: "bad" };
}

// ---------------------------------------------------------------------------
// Freshness & distance gates — a reading that is too old or too far away
// cannot honestly describe "the water you're fishing in right now" (same
// discipline as isStaleWaterTemp in ./hubeau).
// ---------------------------------------------------------------------------

/** A physico-chemical sample older than ~18 months is stale for a "current
 *  conditions" read — quality campaigns run at best a few times a year, so
 *  this only flags genuinely old data, never last season's sample. */
const MAX_AGE_DAYS = 540;

export function isStaleQuality(ymd: string): boolean {
  const t = new Date(ymd + "T12:00:00").getTime();
  if (isNaN(t)) return false;
  return Date.now() - t > MAX_AGE_DAYS * 86400000;
}

/** Physico-chemical stations are far sparser than hydrometry, and water
 *  chemistry (unlike a flow trend) doesn't carry well across a whole reach:
 *  a station a couple of tributaries away can be a different river's worth of
 *  answer. 15 km is already generous for "does this station still describe
 *  where I'm fishing" — beyond that the app abstains rather than implying a
 *  relevance the data doesn't have. */
export const MAX_DIST_KM = 15;

export function isTooFar(distKm: number): boolean {
  return distKm > MAX_DIST_KM;
}
