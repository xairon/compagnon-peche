import { SPECIES } from "../data/species";
import { ECREVISSES } from "../data/ecrevisses";
import { binomial, stationsInBbox, speciesAtStation } from "./hubeau";
import { boxAroundKm, distKm } from "./geo";
import { isoDay } from "./helpers";

/**
 * Des taxons relevés par les pêches scientifiques aux fiches de l'app.
 *
 * POURQUOI UNE TABLE DE SYNONYMES. Mesuré le 01/08/2026 sur les trois stations
 * ASPE les plus proches de Blois : sur 39 taxons distincts, 34 retrouvent une
 * fiche par leur seul binôme latin. Deux échouent parce que les deux
 * référentiels n'écrivent pas le même nom — et ces deux-là sont des poissons
 * très communs. Dans un filtre qui MASQUE, rater un synonyme cache une espèce
 * réellement présente sous les pieds du pêcheur.
 *
 * POURQUOI PAS PLUS MALIN QUE ÇA :
 *  · apparier sur l'épithète seule est faux — `Mugil cephalus` (le mulet) est
 *    au catalogue, et `cephalus` seul le confondrait avec le chevaine ;
 *  · il n'y a pas de jointure par code — `code_taxon` d'Hub'Eau est un code
 *    Sandre APT (2038 pour l'anguille, `id.eaufrance.fr/apt/2038`), pas le
 *    `cdNom` TAXREF (66832) que portent nos fiches.
 *
 * La table ne prétend donc pas être nationale : elle couvre ce qui a été VU.
 * `especes-du-coin.test.ts` échoue dès qu'une charge utile figée contient un
 * taxon non apparié en dehors des lots genre/famille listés nommément.
 */
const SYNONYMES_ASPE: Record<string, string> = {
  // ASPE garde le genre historique ; le dépôt suit la révision.
  "leuciscus cephalus": "squalius cephalus", // chevaine
  // Simple accord de genre sur l'épithète.
  "gymnocephalus cernua": "gymnocephalus cernuus", // grémille
};

const PAR_BINOME = new Map(SPECIES.map((s) => [binomial(s.latin), s.id]));
const ECREVISSE_PAR_BINOME = new Map(ECREVISSES.map((e) => [binomial(e.latin), e.id]));

/**
 * Trie les taxons relevés en trois tas, sans jamais en perdre un en silence.
 *
 * Les écrevisses ne sont pas des inconnues : l'app a leur fiche, dans un autre
 * écran. Les compter comme « sans fiche » dirait au pêcheur que l'app ignore
 * une espèce qu'elle documente.
 */
export function apparier(taxons: string[]): {
  ids: string[];
  ecrevisses: string[];
  inconnus: string[];
} {
  const ids = new Set<string>();
  const ecrevisses = new Set<string>();
  const inconnus = new Set<string>();
  for (const t of taxons) {
    const brut = binomial(t);
    // Une chaîne vide n'est pas un taxon : la compter en « inconnue »
    // gonflerait l'aveu affiché à l'écran sans qu'aucun poisson soit en cause.
    if (!brut.trim()) continue;
    const cle = SYNONYMES_ASPE[brut] ?? brut;
    const id = PAR_BINOME.get(cle);
    if (id) {
      ids.add(id);
      continue;
    }
    const ecr = ECREVISSE_PAR_BINOME.get(cle);
    if (ecr) {
      ecrevisses.add(ecr);
      continue;
    }
    inconnus.add(t);
  }
  // Triés : deux relevés du même coin doivent rendre le même tableau, sinon
  // l'écran se réordonne tout seul d'une session à l'autre.
  return {
    ids: [...ids].sort(),
    ecrevisses: [...ecrevisses].sort(),
    inconnus: [...inconnus].sort(),
  };
}

/**
 * Rayon de la boîte demandée, en kilomètres.
 *
 * C'est un plafond de CRÉDIBILITÉ, pas un plafond de coût — le coût est fixé
 * par `STATIONS_RETENUES`, quelle que soit la portée. Une station à 14 km est
 * déjà une extrapolation, que l'écran doit avouer en la nommant avec sa
 * distance ; au-delà, elle ne parle plus du coin où l'on pêche.
 */
export const PORTEE_COIN_KM = 15;

/**
 * Combien de stations nourrissent un relevé.
 *
 * C'EST LUI QUI FIXE LA FACTURE. `chargerEspecesDuCoin` ne demande que le
 * champ `nom_latin_taxon` à `speciesAtStation` (voir son paramètre `champs`
 * dans lib/hubeau.ts) — l'API ne sait pas rendre des taxons distincts, elle
 * rend un enregistrement par lot, et une station bien suivie en compte des
 * milliers. Mesuré au `curl` le 01/08/2026 sur les trois stations RÉELLEMENT
 * retenues près de Blois (§2.6 de la spec, ce sont celles des tests) :
 *
 *   /stations?bbox=…                    2 546 o
 *   04052025 (3,37 km, 2 taxons)           475 o
 *   04052800 (5,06 km, 28 taxons)       59 898 o
 *   04052600 (7,63 km, 32 taxons)      120 535 o
 *   ──────────────────────────────────────────
 *   TOTAL                             183 454 o  ≈ 183 ko, UNE FOIS, sur
 *                                                  appui explicite.
 *
 * (La spec mesure aussi 60–104 ko par station sur trois stations prises au
 * hasard, §2.2 — ce nombre-ci décrit le coût par station typique, pas le
 * total d'un relevé réel ; les deux mesures coexistent dans la spec avec leur
 * périmètre propre.) À comparer aux 973 ko d'une classe Sandre que l'app
 * télécharge déjà (voir lib/net-bornes.ts), et à la borne `OCTETS_MAX.hubeau`
 * de 2 000 000 o (même fichier) : le pire cas mesuré par station ci-dessus
 * (120 535 o) en laisse plus de 16× de marge avant qu'une réponse anormale ne
 * soit coupée.
 *
 * Pourquoi pas une seule : la station la plus proche de Blois ne rend que 2
 * taxons. Pourquoi pas dix : au-delà de trois on quitte le coin, et la facture
 * suit linéairement.
 */
export const STATIONS_RETENUES = 3;

/** Une station qui a nourri le relevé, nommée pour que l'écran puisse la citer. */
export interface StationDuCoin {
  code: string;
  nom: string;
  /** Kilomètres depuis le point demandé. */
  dist: number;
}

/** Ce que le coin retient. Sérialisable tel quel (voir lib/prefs-coin.ts). */
export interface CoinEspeces {
  /** Ids de fiches SPECIES, triés. */
  ids: string[];
  /** Ids de fiches d'écrevisses relevées ici. Elles ne filtrent pas la grille —
   *  SPECIES ne les contient pas — mais l'app les documente. */
  ecrevisses: string[];
  /** Taxons qu'aucune fiche ne reçoit : lots au genre ou à la famille, hybrides. */
  inconnus: string[];
  /** Les stations qui ont RÉPONDU, la plus proche d'abord. */
  stations: StationDuCoin[];
  lat: number;
  lon: number;
  /** yyyy-mm-dd du relevé. */
  releveIso: string;
}

/**
 * Un code de station exploitable.
 *
 * 6 des 22 enregistrements de la boîte de Blois n'ont ni `code_station` ni
 * `libelle_station` — seulement des coordonnées — et `stationsInBbox` les
 * traverse en `String(null)`, soit la CHAÎNE "null", qui est truthy. Tester la
 * chaîne, donc, et pas seulement la valeur falsy.
 */
function codeExploitable(code: string): boolean {
  return code !== "" && code !== "null" && code !== "undefined";
}

/**
 * Les espèces relevées autour d'un point, ou null quand on ne sait rien.
 *
 * NE LÈVE JAMAIS, sur le modèle de `chargerRivieres` : une station muette se
 * retire du lot, elle ne vide pas l'écran. Mais la distinction entre « la
 * source a dit qu'il n'y a rien » (relevé vide) et « on n'a pas pu demander »
 * (null) est tenue de bout en bout : l'écran n'a pas le droit de les confondre.
 *
 * EN SÉRIE, JAMAIS EN PARALLÈLE. Hub'Eau rate-limite : mesuré le 01/08/2026, la
 * 9ᵉ requête rapprochée rend 299 o de HTML au lieu du JSON attendu.
 */
export async function chargerEspecesDuCoin(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<CoinEspeces | null> {
  const { w, s, e, n } = boxAroundKm(lat, lon, PORTEE_COIN_KM);
  let brutes;
  try {
    brutes = await stationsInBbox(w, s, e, n, signal);
  } catch {
    return null;
  }

  const retenues = brutes
    .filter((st) => codeExploitable(st.code))
    .map((st) => ({ code: st.code, nom: st.nom, dist: distKm(lat, lon, st.lat, st.lon) }))
    .filter((st) => st.dist <= PORTEE_COIN_KM)
    // À égalité de distance, le code tranche : deux relevés du même point
    // doivent citer les mêmes stations dans le même ordre.
    .sort((a, b) => a.dist - b.dist || a.code.localeCompare(b.code))
    .slice(0, STATIONS_RETENUES);

  const taxons: string[] = [];
  const lues: StationDuCoin[] = [];
  for (const st of retenues) {
    try {
      // Un seul champ demandé (voir STATIONS_RETENUES) : c'est tout ce que
      // `apparier` lit. `retries: 0` — un 5xx ou 429 relancé par `fetchT`
      // doublerait jusqu'à 4 requêtes déjà proches du seuil de débit mesuré
      // au §2.3 de la spec (299 o de HTML au lieu du JSON, à la 9ᵉ requête
      // rapprochée) ; une station qui échoue se retire déjà du lot sans vider
      // le résultat, un retry n'y changerait rien d'utile.
      const sp = await speciesAtStation(st.code, signal, { champs: "nom_latin_taxon", retries: 0 });
      // `latin` peut être vide quand la source ne publie qu'un nom commun.
      // On garde alors le nom commun : il finira en « inconnu », ce qui est
      // honnête — le jeter en silence ne l'aurait pas été.
      for (const x of sp) taxons.push(x.latin || x.fr);
      lues.push(st);
    } catch {
      /* une station muette se retire ; les autres restent */
    }
  }
  // Nommer des stations sans pouvoir citer une seule espèce se lirait « aucun
  // poisson ici ». Aucune station retenue, en revanche, est une réponse : la
  // boîte est vide, et l'écran doit pouvoir le dire.
  if (retenues.length > 0 && lues.length === 0) return null;

  return { ...apparier(taxons), stations: lues, lat, lon, releveIso: isoDay() };
}
