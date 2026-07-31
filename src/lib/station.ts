import { fraicheur, type Grandeur } from "./fraicheur";

// Choosing which measuring station answers for a place.
//
// Five functions in hubeau.ts shared one rule — `if (dist < best.dist)` — and
// nothing else: no check that the station still publishes, no bound on how far
// the answer could come from, and comments promising thresholds ("~25 km",
// "~30 km") that were never implemented. waterTemp inverted the priority
// outright, sorting by date first, so a station 35,2 km away in another basin
// won over one 3,4 km away because it was eight days newer.
//
// Two facts make the naive rule fail. Stations "en service" often publish
// nothing at all (42 of the Indre's 66 have no discharge observation), so
// nearest can mean silent. And the référentiel carries wrong coordinates —
// "Le Maumont à Vayrac" is filed in the Lot but placed 150 km north — so
// nearest can mean a station that isn't there.
//
// THE RULE: distance decides, freshness filters. A reading from the right
// river last week beats a reading from the wrong river today, because the
// question is "what is the water doing HERE".

/**
 * How far an answer may legitimately come from, per quantity.
 *
 * Not one number: a discharge is local and hydrometry is dense, while a
 * scientific fishing pass characterises a whole reach and happens in few
 * places. 15 km for chemistry matches the threshold qualiteEau.ts already
 * argued for ("beyond that the app abstains rather than implying a relevance
 * the data does not have") — this generalises it instead of leaving it applied
 * to one source out of seven.
 */
export const DIST_MAX: Record<Grandeur, number> = {
  hydro: 20, // dense network, and discharge changes along a river
  temperature: 15, // water temperature does not carry across tributaries
  qualite: 15, // unchanged from qualiteEau.MAX_DIST_KM
  onde: 15, // small watercourses: the next valley says nothing about this one
  poisson: 30, // ASPE passes are rare and describe a reach, not a spot
};

/** What the chooser needs to know about a candidate. Anything else rides along. */
export interface Candidat {
  /** Kilometres from the queried point. NaN or missing → discarded. */
  dist: number;
  /** Date of its latest reading, when known. Missing counts as not fresh. */
  date?: string;
}

/**
 * Pick the station that best answers for a point, or null when none can.
 *
 * Order: discard anything out of range, then prefer stations with a current
 * reading, then take the closest of those. When nothing is current, the
 * closest in-range station is still returned — hiding the only information
 * available would be worse, and the freshness guard downstream displays it
 * with its date instead of as the present state.
 */
export function choisirStation<T extends Candidat>(
  candidats: T[],
  grandeur: Grandeur,
  now: number = Date.now(),
): T | null {
  const portee = DIST_MAX[grandeur];
  const aPortee = candidats.filter((c) => Number.isFinite(c.dist) && c.dist <= portee);
  if (!aPortee.length) return null;

  const parProximite = [...aPortee].sort((a, b) => a.dist - b.dist);
  const jour = parProximite.filter((c) => !fraicheur(c.date, grandeur, now).perime);
  return (jour[0] ?? parProximite[0]) ?? null;
}
