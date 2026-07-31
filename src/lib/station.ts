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

/**
 * Portée accordée à une station SUR LE MÊME cours d'eau que le point demandé.
 *
 * L'eau circule le long d'un cours ; elle ne traverse pas un bassin. Une mesure
 * prise 17 km en amont sur la Loire dit quelque chose de la Loire à Blois ;
 * une mesure prise à 4 km sur le Cher n'en dit rien.
 *
 * Ces bornes ne sont PAS mesurées : ce sont des choix, simplement plus larges
 * que DIST_MAX. Le seul cas réel qui les a motivées est la LOIRE à Muides,
 * 17,2 km de Blois, écartée par la portée ordinaire de 15 km.
 * `onde` bouge à peine : ONDE surveille délibérément de petits cours d'eau, et
 * un ruisseau ne fait pas souvent 30 km.
 */
export const DIST_MAX_MEME_COURS: Record<Grandeur, number> = {
  hydro: 40,
  temperature: 30,
  qualite: 30,
  onde: 20,
  poisson: 50,
};

/**
 * Clé de cours d'eau comparable, préfixée par son référentiel.
 *
 * Tous les réseaux Hub'Eau ne codent pas dans le même référentiel — mesuré le
 * 31/07/2026 sur la boîte de Blois :
 *   temperature/station          `----0000`  uri `…/CoursEau_Carthage2017/…`
 *   qualite_rivieres/station_pc  `----0000`  uri `…/CoursEau_Carthage2017/…`
 *   hydrometrie/referentiel      `K4464001`  uri `…/CEA/…`
 * Deux codes égaux venant de référentiels différents ne désignent pas le même
 * cours d'eau. Le préfixe rend le rapprochement impossible plutôt que discret.
 *
 * Sans code : `undefined` — surtout pas une chaîne vide, qui s'égalerait à
 * toutes les autres stations sans rattachement.
 */
export function cleCours(
  code: string | null | undefined,
  uri: string | null | undefined,
): string | undefined {
  if (!code) return undefined;
  // Le segment qui précède le code dans l'URI nomme le référentiel.
  const m = uri ? /\/([A-Za-z0-9_]+)\/[^/]*$/.exec(uri) : null;
  return `${m ? m[1] : "?"}:${code}`;
}

/** What the chooser needs to know about a candidate. Anything else rides along. */
export interface Candidat {
  /** Kilometres from the queried point. NaN or missing → discarded. */
  dist: number;
  /** Date of its latest reading, when known. Missing counts as not fresh. */
  date?: string;
  /**
   * Code Carthage du cours d'eau (`code_cours_eau`), quand la réponse le porte.
   * Vérifié le 31/07/2026 : le même code circule d'un réseau Hub'Eau à l'autre
   * — « la Loire » est `----0000` dans `temperature/station` comme dans
   * `qualite_rivieres/station_pc`. C'est pourquoi le rattachement se fait sur
   * le code et non sur le libellé.
   *
   * ABSENT ≠ AUTRE COURS D'EAU. Une station sans rattachement publié n'a pas
   * répondu « non » : elle n'a rien dit, et elle reste dans le lot ordinaire.
   */
  coursCode?: string;
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
  coursRef?: string,
): T | null {
  // Le bon cours d'eau d'abord, jusqu'à une portée élargie. Ce n'est pas un
  // bonus de tri : c'est un premier lot, examiné avant tout le reste. Une
  // mesure de la bonne rivière un peu plus loin répond mieux à « que fait
  // l'eau ICI » qu'une mesure de la rivière d'à côté.
  if (coursRef) {
    const memeCours = retenir(candidats, DIST_MAX_MEME_COURS[grandeur], grandeur, now, (c) =>
      c.coursCode === coursRef,
    );
    if (memeCours) return memeCours;
  }
  // Repli : la règle ordinaire, sur tous les candidats. Les stations sans
  // rattachement publié en font partie — ne pas savoir n'est pas être ailleurs.
  return retenir(candidats, DIST_MAX[grandeur], grandeur, now, () => true);
}

function retenir<T extends Candidat>(
  candidats: T[],
  portee: number,
  grandeur: Grandeur,
  now: number,
  garde: (c: T) => boolean,
): T | null {
  const aPortee = candidats.filter(
    (c) => Number.isFinite(c.dist) && c.dist <= portee && garde(c),
  );
  if (!aPortee.length) return null;

  const parProximite = [...aPortee].sort((a, b) => a.dist - b.dist);
  const jour = parProximite.filter((c) => !fraicheur(c.date, grandeur, now).perime);
  return (jour[0] ?? parProximite[0]) ?? null;
}
