// Hybrid online layer: real fish-presence data from the Hub'Eau "poisson" API
// (OFB/ASPE electrofishing surveys). Called from the browser; results feed the map.
// Offline the map degrades gracefully (see Carte screen).
//
// This module also exposes real-time HYDROMETRY (water level & flow) and water
// TEMPERATURE for the "briefing" panel — all Hub'Eau, free, no key, CORS OK.

import { distKm, boxAroundKm } from "./geo";
import { fetchT } from "./net";
import { lireJsonBorne, octetsMaxPour } from "./net-bornes";
import { choisirStation, cleCours, DIST_MAX, DIST_MAX_MEME_COURS } from "./station";
import { parseAnalysePc } from "./analyse-pc";

/**
 * Ce que Hub'Eau rend : une enveloppe `{ data: [...] }`, quel que soit
 * l'endpoint. Le contenu des enregistrements, lui, change d'un endpoint à
 * l'autre, et chaque appelant ci-dessous nomme les champs qu'il lit et les
 * convertit lui-même (`Number(...)`, `String(...)`).
 *
 * `any` est délibéré et localisé ici : c'est exactement ce que `r.json()`
 * rendait avant que la lecture soit bornée. Le but du changement est de ne plus
 * charger en mémoire une réponse anormale — pas de retyper toute la couche
 * Hub'Eau au passage, ce qui serait un autre travail, avec ses propres risques.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChargeHubeau = { data?: any[] };

const BASE = "https://hubeau.eaufrance.fr/api/v1/etat_piscicole";
const HYDRO = "https://hubeau.eaufrance.fr/api/v2/hydrometrie";
const TEMP = "https://hubeau.eaufrance.fr/api/v1/temperature";
const ONDE = "https://hubeau.eaufrance.fr/api/v1/ecoulement";
const QUALITE = "https://hubeau.eaufrance.fr/api/v2/qualite_rivieres";
// Assez d'analyses pour que la distance ait un mot à dire, pas assez pour
// peser : 50 enregistrements filtrés par `fields` font ~9 ko. Triées par date
// décroissante, ce sont les 50 plus récentes de la boîte — exactement la
// tranche qui intéresse un état courant.
const TAILLE_PC = 50;

/**
 * Une station du réseau piscicole (ASPE). Pas de `cours` ici, contrairement à
 * `HydroStation` plus bas : `etat_piscicole/stations` ne publie PAS
 * `libelle_cours_eau`, même demandé dans `fields` — mesuré le 01/08/2026 sur la
 * boîte de Blois, les seules clés rendues sont code_station, libelle_station,
 * longitude, latitude (contrats-api.test.ts le vérifie sur la charge
 * enregistrée). Le champ ne valait donc jamais que "", et la fiche de la Carte
 * ne l'affichait jamais.
 */
export interface Station {
  code: string;
  nom: string;
  lat: number;
  lon: number;
}

export interface StationSpecies {
  fr: string;
  latin: string;
  effectif: number;
}

/**
 * Ce que Hub'Eau écrit quand il n'a rien à écrire, une fois passé par `String`.
 * `String(null)` rend "null", une chaîne VRAIE : aucun test de simple présence
 * ne l'arrête. C'est par là que passaient les stations fantômes ci-dessous.
 */
const VIDES = new Set(["", "null", "undefined"]);

/** Un nombre publié, ou NaN — `Number(null)` vaut 0, une position au large du Ghana. */
function nombrePublie(v: unknown): number {
  return v == null || v === "" ? NaN : Number(v);
}

/**
 * Electrofishing stations within a lon/lat bounding box.
 *
 * LES ENREGISTREMENTS SANS IDENTITÉ SONT ÉCARTÉS. Mesuré le 01/08/2026 sur
 * bbox=1.1,47.4,1.6,47.7 (Blois) : 6 des 22 enregistrements rendus n'ont ni
 * `code_station` ni `libelle_station` — rien qu'un couple de coordonnées, dont
 * un doublon exact. L'ancien filtre ne regardait que la position, et la laissait
 * elle-même passer : `Number(null)` vaut 0, que `Number.isFinite` accepte, donc
 * une station sans latitude atterrissait par 0°, au large du Ghana. Ces six-là
 * devenaient des marqueurs sur la Carte, portant le code "null" et le nom
 * inventé « Station de suivi ». Les toucher appelait `speciesAtStation("null")`,
 * à quoi l'API répond `count: 0`, et la fiche concluait « Aucune espèce recensée
 * sur cette station. » — une affirmation fausse sur une station qui n'existe
 * pas. Sans code, la station est muette : on ne la dessine pas.
 */
export async function stationsInBbox(
  w: number,
  s: number,
  e: number,
  n: number,
  signal?: AbortSignal,
): Promise<Station[]> {
  const url =
    `${BASE}/stations?bbox=${w.toFixed(4)},${s.toFixed(4)},${e.toFixed(4)},${n.toFixed(4)}` +
    `&size=300&fields=code_station,libelle_station,latitude,longitude`;
  const r = await fetchT(url, { signal, source: "hubeau" });
  if (!r.ok && r.status !== 206) throw new Error("Hub'Eau " + r.status);
  const j = (await lireJsonBorne(r, octetsMaxPour("hubeau"))) as ChargeHubeau;
  // Convertir d'abord, filtrer ensuite : le filtre juge alors les valeurs que la
  // station portera vraiment, et le code émis est celui qu'on a examiné.
  return (j.data || [])
    .map((d: Record<string, unknown>) => ({
      code: String(d.code_station ?? "").trim(),
      nom: String(d.libelle_station || "Station de suivi"),
      lat: nombrePublie(d.latitude),
      lon: nombrePublie(d.longitude),
    }))
    .filter((st) => !VIDES.has(st.code) && Number.isFinite(st.lat) && Number.isFinite(st.lon));
}

/** Species recorded at a station, aggregated across ALL surveys (most abundant
 *  first). size=20000 (the API max) so heavily-surveyed stations aren't truncated
 *  — some have thousands of lots (e.g. La Ferté-St-Cyr ≈ 2600); sort=desc keeps
 *  the most recent first as a safety if a station ever exceeds one page.
 *
 *  `opts.champs` : les champs demandés à l'API, par défaut inchangés pour la
 *  Carte (qui affiche et trie sur `effectif`). `lib/especes-du-coin.ts` réduit
 *  ce champ à `nom_latin_taxon` seul, le seul qu'il lit — demander
 *  `effectif_lot` en plus multipliait la charge par ~2,3 sur une station bien
 *  suivie pour une valeur jamais utilisée (mesuré le 01/08/2026, voir son
 *  commentaire sur `STATIONS_RETENUES`).
 *  `opts.retries` : passe-plat vers `fetchT`, par défaut inchangé (1 retry sur
 *  5xx/429). */
export async function speciesAtStation(
  code: string,
  signal?: AbortSignal,
  opts: { champs?: string; retries?: number } = {},
): Promise<StationSpecies[]> {
  const { champs = "nom_commun_taxon,nom_latin_taxon,effectif_lot", retries } = opts;
  const url =
    `${BASE}/observations?code_station=${encodeURIComponent(code)}` +
    `&size=20000&sort=desc&fields=${champs}`;
  const r = await fetchT(url, {
    signal,
    source: "hubeau",
    ...(retries !== undefined ? { retries } : {}),
  });
  if (!r.ok && r.status !== 206) throw new Error("Hub'Eau " + r.status);
  const j = (await lireJsonBorne(r, octetsMaxPour("hubeau"))) as ChargeHubeau;
  const map = new Map<string, StationSpecies>();
  for (const o of j.data || []) {
    const key = (o.nom_latin_taxon || o.nom_commun_taxon || "").toLowerCase();
    if (!key) continue;
    const cur = map.get(key) || {
      fr: o.nom_commun_taxon || o.nom_latin_taxon,
      latin: o.nom_latin_taxon || "",
      effectif: 0,
    };
    cur.effectif += Number(o.effectif_lot) || 0;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.effectif - a.effectif);
}

/** First two words of a latin name, lowercased — to match taxa to our fiches. */
export function binomial(latin: string): string {
  return (latin || "").toLowerCase().split(/\s+/).slice(0, 2).join(" ");
}

// ---------------------------------------------------------------------------
// Real-time hydrometry (water level H in mm, flow Q in L/s), MAJ ~5 min.
// ---------------------------------------------------------------------------

export interface HydroStation {
  code: string;
  nom: string;
  cours: string;
  lat: number;
  lon: number;
  dist: number; // km from the queried point
}

/** Nearest in-service hydrometry station, or null if none within DIST_MAX.hydro. */
export async function nearestHydroStation(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<HydroStation | null> {
  const { w, s, e, n } = boxAroundKm(lat, lon, DIST_MAX.hydro);
  const url =
    `${HYDRO}/referentiel/stations?bbox=${w.toFixed(4)},${s.toFixed(4)},${e.toFixed(4)},${n.toFixed(4)}` +
    `&en_service=true&size=200&format=json`;
  const r = await fetchT(url, { signal, source: "hubeau" });
  if (!r.ok && r.status !== 206) throw new Error("Hub'Eau " + r.status);
  const j = (await lireJsonBorne(r, octetsMaxPour("hubeau"))) as ChargeHubeau;
  const cands: HydroStation[] = [];
  for (const d of j.data || []) {
    const la = Number(d.latitude_station ?? d.latitude);
    const lo = Number(d.longitude_station ?? d.longitude);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) continue;
    cands.push({
      code: String(d.code_station),
      nom: String(d.libelle_station || d.libelle_cours_eau || "Station"),
      cours: String(d.libelle_cours_eau || ""),
      lat: la,
      lon: lo,
      dist: distKm(lat, lon, la, lo),
    });
  }
  // Bounded by DIST_MAX.hydro. `en_service=true` is not a promise of output —
  // 42 of the Indre's 66 in-service stations publish no discharge at all — but
  // the referential doesn't say which, and asking every candidate would cost a
  // round-trip each. Distance bounding at least stops the answer coming from
  // 60 km away, and the freshness guard downstream dates whatever comes back.
  return choisirStation(cands, "hydro");
}

export type Trend = "rising" | "falling" | "stable";

export interface HydroReading {
  value: number; // metres (H) or m³/s (Q)
  unit: string;
  date: string; // ISO of latest observation
  trend: Trend;
  delta: number; // change over ~3h, same unit
}

/** Latest H (level, m) or Q (flow, m³/s) for a station, with a ~3h trend. */
export async function latestHydro(
  code: string,
  grandeur: "H" | "Q",
  signal?: AbortSignal,
): Promise<HydroReading | null> {
  const url =
    `${HYDRO}/observations_tr?code_entite=${encodeURIComponent(code)}` +
    `&grandeur_hydro=${grandeur}&size=40&sort=desc&fields=date_obs,resultat_obs`;
  const r = await fetchT(url, { signal, source: "hubeau" });
  if (!r.ok && r.status !== 206) throw new Error("Hub'Eau " + r.status);
  const j = (await lireJsonBorne(r, octetsMaxPour("hubeau"))) as ChargeHubeau;
  const obs: { date_obs: string; resultat_obs: number }[] = j.data || [];
  if (!obs.length) return null;
  // resultat_obs: H in mm → m, Q in L/s → m³/s. Both divide by 1000.
  const conv = 1000;
  const latest = obs[0];
  const latestMs = new Date(latest.date_obs).getTime();
  // Find the observation closest to 3h before the latest.
  const target = latestMs - 3 * 3600000;
  let past = obs[obs.length - 1];
  let bestDt = Infinity;
  for (const o of obs) {
    const dt = Math.abs(new Date(o.date_obs).getTime() - target);
    if (dt < bestDt) {
      bestDt = dt;
      past = o;
    }
  }
  const value = latest.resultat_obs / conv;
  const delta = (latest.resultat_obs - past.resultat_obs) / conv;
  const thr = grandeur === "H" ? 0.01 : 0.05; // 1 cm / 0.05 m³/s
  const trend: Trend = delta > thr ? "rising" : delta < -thr ? "falling" : "stable";
  return {
    value,
    unit: grandeur === "H" ? "m" : "m³/s",
    date: latest.date_obs,
    trend,
    delta,
  };
}

// ---------------------------------------------------------------------------
// Water temperature — sparse network (~50 active stations), so may be absent.
// ---------------------------------------------------------------------------

export interface TempReading {
  station: string;
  dist: number; // km
  value: number; // °C
  date: string; // ISO
  /** Libellé du cours d'eau publié par le réseau, ou "" s'il ne le dit pas. */
  cours: string;
  /** Clé de cours d'eau comparable (voir station.cleCours), ou undefined. */
  coursCode?: string;
}

/** A water-temperature reading older than ~2 weeks is stale for a "current
 *  conditions" display (temperature moves seasonally). Flags it, never hides it. */
export function isStaleWaterTemp(iso: string): boolean {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return false;
  return Date.now() - t > 14 * 86400000;
}

/**
 * Portée à accorder pour une grandeur, selon qu'on sait ou non sur quel cours
 * d'eau se tient le pêcheur. C'est elle qui dimensionne la BOÎTE demandée à
 * l'API : sans ça, une station de la bonne rivière à 17 km serait acceptée par
 * choisirStation… mais jamais téléchargée.
 */
function porteePour(grandeur: keyof typeof DIST_MAX, coursRef?: string): number {
  return coursRef ? DIST_MAX_MEME_COURS[grandeur] : DIST_MAX[grandeur];
}

/**
 * Nearest recent water-temperature reading, or null if none in range.
 *
 * `coursRef` : clé de cours d'eau du point (voir station.cleCours et
 * lib/cours-du-point.ts). Quand elle est fournie, une station de LA MÊME
 * rivière est acceptée jusqu'à DIST_MAX_MEME_COURS.
 *
 * La distance est désormais bornée. Elle ne l'était pas du tout : la fonction
 * prenait la plus proche de la boîte, et la boîte déborde en diagonale — depuis
 * Blois, elle rendait LOIRE à MUIDES-SUR-LOIRE à 17,2 km alors que
 * DIST_MAX.temperature en accorde 15, sans jamais le dire.
 */
export async function nearestTemp(
  lat: number,
  lon: number,
  signal?: AbortSignal,
  coursRef?: string,
): Promise<TempReading | null> {
  const { w, s, e, n } = boxAroundKm(lat, lon, porteePour("temperature", coursRef));
  const sUrl =
    `${TEMP}/station?bbox=${w.toFixed(4)},${s.toFixed(4)},${e.toFixed(4)},${n.toFixed(4)}` +
    `&size=100&fields=code_station,libelle_station,latitude,longitude,code_cours_eau,libelle_cours_eau,uri_cours_eau`;
  const sr = await fetchT(sUrl, { signal, source: "hubeau" });
  if (!sr.ok && sr.status !== 206) throw new Error("Hub'Eau " + sr.status);
  const sj = (await lireJsonBorne(sr, octetsMaxPour("hubeau"))) as ChargeHubeau;
  const cands: {
    code: string;
    nom: string;
    dist: number;
    cours: string;
    coursCode?: string;
  }[] = [];
  for (const d of sj.data || []) {
    const la = Number(d.latitude);
    const lo = Number(d.longitude);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) continue;
    cands.push({
      code: String(d.code_station),
      nom: String(d.libelle_station || ""),
      dist: distKm(lat, lon, la, lo),
      // Le réseau publie le rattachement au cours d'eau ; le laisser tomber
      // ici est précisément ce qui empêchait le troisième critère d'exister.
      cours: String(d.libelle_cours_eau || ""),
      coursCode: cleCours(d.code_cours_eau, d.uri_cours_eau),
    });
  }
  // Sans date à ce stade — la chronique coûte une requête par station, et on
  // n'en veut qu'une. choisirStation applique donc ici la seule règle qu'il
  // peut : la bonne rivière d'abord, la plus proche ensuite. La fraîcheur, elle,
  // est jugée en aval sur la mesure rendue (fraicheur.ts / isStaleWaterTemp).
  const near = choisirStation(cands, "temperature", Date.now(), coursRef);
  if (!near) return null;
  const cUrl =
    `${TEMP}/chronique?code_station=${encodeURIComponent(near.code)}` +
    `&sort=desc&size=1&fields=date_mesure_temp,heure_mesure_temp,resultat`;
  const cr = await fetchT(cUrl, { signal, source: "hubeau" });
  if (!cr.ok && cr.status !== 206) throw new Error("Hub'Eau " + cr.status);
  const cj = (await lireJsonBorne(cr, octetsMaxPour("hubeau"))) as ChargeHubeau;
  const rec = (cj.data || [])[0];
  if (!rec || rec.resultat == null) return null;
  // date_mesure_temp + heure_mesure_temp are French legal time (Europe/Paris),
  // no timezone suffix — so parse as LOCAL (do NOT append "Z", that would shift
  // it by the UTC offset). heure_mesure_temp exists reliably on this endpoint.
  const iso = `${rec.date_mesure_temp}T${rec.heure_mesure_temp || "12:00:00"}`;
  return {
    station: near.nom,
    dist: near.dist,
    value: Number(rec.resultat),
    date: iso,
    cours: near.cours,
    coursCode: near.coursCode,
  };
}

// Best available water temperature near a point. France has NO real-time river
// thermometry with good coverage, so we combine both Hub'Eau sources and return
// the MOST RECENT reading (always with its date, never presented as "live"):
//  • thermie network (dedicated, sparse, often dormant)
//  • physico-chemical quality, parameter 1301 (denser, but punctual campaigns)
export interface WaterTemp {
  value: number; // °C
  date: string; // ISO or YYYY-MM-DD of the sample
  station: string;
  dist: number; // km (0 if unknown)
  source: "thermie" | "physico";
  /** Cours d'eau de la station, "" quand la source ne le publie pas.
   *  `analyse_pc` n'a AUCUN champ de rattachement (vérifié le 31/07/2026 : ses
   *  67 champs n'en portent pas) — d'où le "" sur la branche physico, qui vaut
   *  « on ne sait pas », jamais « autre rivière ». */
  cours: string;
  coursCode?: string;
}

const Q_TEMP = "1301"; // Température de l'eau (°C) in the quality API

/** Ce que station_pc sait d'un cours d'eau, et que analyse_pc ignore. */
export interface CoursStationPc {
  /** Clé comparable à Candidat.coursCode (voir station.cleCours). */
  cle: string;
  /** Libellé publié par le réseau, ou "" — voir plus bas. */
  nom: string;
}

/**
 * Le cours d'eau des stations physico-chimiques d'une boîte, INDEXÉ PAR LIBELLÉ.
 *
 * `qualite_rivieres/analyse_pc` ne publie aucun rattachement : ses 67 champs ont
 * été listés le 31/07/2026, il n'y a ni code ni libellé de cours d'eau (voir
 * contrats-api.test.ts). `qualite_rivieres/station_pc`, lui, publie
 * `code_cours_eau`, `nom_cours_eau` et `uri_cours_eau` — vérifié le même jour
 * sur la boîte de Blois : 04051850 LOIRE à MUIDES-SUR-LOIRE porte "----0000",
 * uri `…/CoursEau_Carthage2017/----0000`. C'est cette requête-là qui donne un
 * cours d'eau aux analyses.
 *
 * POURQUOI PAR LIBELLÉ, alors que le dépôt répète qu'on ne rapproche pas deux
 * sources par leurs libellés. Parce qu'ici ce n'est pas deux sources : c'est la
 * même API, le même référentiel de stations, et les libellés sont les mêmes
 * chaînes — vérifié sur les 14 stations de la boîte de Blois, aucun écart. Et
 * parce que c'est la seule clé disponible en aval : `AnalysePc` ne transporte
 * que le libellé de sa station.
 *
 * L'ambiguïté existe et elle est traitée : trois stations distinctes s'appellent
 * « LA CISSE A AVERDON » (04448024, 04448026, 04448031). Elle ne gêne pas, tant
 * qu'elles sont sur la même rivière — la question posée est la rivière, pas la
 * station. Dès que deux stations homonymes divergent, ou que l'une publie un
 * rattachement et l'autre non, le libellé est ABANDONNÉ : ne rien dire vaut
 * mieux qu'un rattachement tiré au sort, et une analyse sans rattachement reste
 * dans le lot ordinaire (absent ≠ autre rivière).
 */
export async function coursDesStationsPc(
  w: number,
  s: number,
  e: number,
  n: number,
  signal?: AbortSignal,
): Promise<Map<string, CoursStationPc>> {
  const url =
    `${QUALITE}/station_pc?bbox=${w.toFixed(4)},${s.toFixed(4)},${e.toFixed(4)},${n.toFixed(4)}` +
    `&size=200&fields=code_station,libelle_station,code_cours_eau,nom_cours_eau,uri_cours_eau`;
  const r = await fetchT(url, { signal, source: "hubeau" });
  if (!r.ok && r.status !== 206) throw new Error("Hub'Eau " + r.status);
  const j = (await lireJsonBorne(r, octetsMaxPour("hubeau"))) as ChargeHubeau;
  // undefined en valeur = libellé abandonné pour cause de désaccord.
  const par = new Map<string, CoursStationPc | undefined>();
  for (const d of j.data || []) {
    const lib = String(d.libelle_station || "");
    if (!lib) continue;
    const cle = cleCours(d.code_cours_eau, d.uri_cours_eau);
    if (!par.has(lib)) {
      par.set(lib, cle ? { cle, nom: String(d.nom_cours_eau || "") } : undefined);
      continue;
    }
    const vu = par.get(lib);
    if (vu?.cle !== cle) par.set(lib, undefined);
  }
  const out = new Map<string, CoursStationPc>();
  for (const [lib, v] of par) if (v) out.set(lib, v);
  return out;
}

/**
 * @param coursRef Clé du cours d'eau du point (voir lib/cours-du-point.ts).
 *   Absente, rien ne change et rien de plus n'est demandé — c'est le cas de
 *   l'Accueil, qui s'ouvre à chaque session. Présente, la boîte s'élargit à
 *   DIST_MAX_MEME_COURS et une requête `station_pc` de plus donne un cours
 *   d'eau aux analyses.
 */
export async function waterTemp(
  lat: number,
  lon: number,
  signal?: AbortSignal,
  coursRef?: string,
): Promise<WaterTemp | null> {
  const { w, s, e, n } = boxAroundKm(lat, lon, porteePour("temperature", coursRef));
  // A) Physico-chimie, paramètre 1301. On demande PLUSIEURS analyses, pas une.
  //    Avec `size=1`, l'API choisissait la station à la place de l'app : mesuré
  //    autour de Blois le 31/07/2026, elle rendait LA CISSE A AVERDON à 8,9 km
  //    alors que MEES à CHAUSSEE-SAINT-VICTOR est à 3,4 km. La distance ne
  //    pouvait pas peser puisqu'il n'y avait qu'un candidat.
  //    (Le `sort=desc` est bien décroissant par date_prelevement — vérifié sur
  //    50 enregistrements ; l'ancien commentaire disait le contraire.)
  const physicoP: Promise<WaterTemp[]> = (async () => {
    const url =
      `${QUALITE}/analyse_pc?bbox=${w.toFixed(4)},${s.toFixed(4)},${e.toFixed(4)},${n.toFixed(4)}` +
      `&code_parametre=${Q_TEMP}&sort=desc&size=${TAILLE_PC}` +
      `&fields=date_prelevement,resultat,libelle_station,latitude,longitude`;
    const r = await fetchT(url, { signal, source: "hubeau" });
    if (!r.ok && r.status !== 206) return [];
    return parseAnalysePc(
      (await lireJsonBorne(r, octetsMaxPour("hubeau"))) as {
        count?: number;
        data?: Record<string, unknown>[];
      },
      lat,
      lon,
    );
  })().catch(() => []);
  // A bis) Le rattachement des analyses, qui ne le portent pas. Une requête de
  //   plus, demandée UNIQUEMENT quand on sait sur quelle rivière on se tient :
  //   sans référence, la jointure ne servirait à rien.
  const coursP: Promise<Map<string, CoursStationPc> | null> = coursRef
    ? coursDesStationsPc(w, s, e, n, signal).catch(() => null)
    : Promise.resolve(null);
  // B) Dedicated thermie network (nearest station's latest reading).
  const thermieP: Promise<WaterTemp | null> = nearestTemp(lat, lon, signal, coursRef)
    .then((t) =>
      t
        ? {
            value: t.value,
            date: t.date,
            station: t.station,
            dist: t.dist,
            source: "thermie" as const,
            cours: t.cours,
            coursCode: t.coursCode,
          }
        : null,
    )
    .catch(() => null);

  const [physico, thermie, cours] = await Promise.all([physicoP, thermieP, coursP]);
  if (cours) {
    for (const p of physico) {
      const c = cours.get(p.station);
      if (!c) continue; // station inconnue du référentiel, ou libellé abandonné
      p.coursCode = c.cle;
      if (!p.cours) p.cours = c.nom;
    }
  }
  const cands: WaterTemp[] = thermie ? [...physico, thermie] : physico;
  if (!cands.length) return null;
  // Proximity decides, freshness filters — NOT the other way round. Sorting by
  // date first made the app cross a basin to gain a few days: measured at
  // Blois, CHER à SAINT-AIGNAN (35,2 km, another river) beat MEES à
  // CHAUSSEE-SAINT-VICTOR (3,4 km) because it was eight days newer. Water
  // temperature does not carry across catchments.
  return choisirStation(cands, "temperature", Date.now(), coursRef);
}

// ---------------------------------------------------------------------------
// ONDE (écoulement) — is the watercourse flowing or dry? Campaign-based
// (roughly monthly in summer), point observations — NOT real time.
// ---------------------------------------------------------------------------

export interface OndeReading {
  station: string;
  cours: string;
  dist: number; // km
  code: string; // "1" | "1a" | "2" | "3" | "4"
  label: string; // libelle_ecoulement
  date: string; // YYYY-MM-DD (date only, no timezone)
}

/** Nearest ONDE station with its latest flow observation, or null. */
export async function nearestOnde(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<OndeReading | null> {
  const { w, s, e, n } = boxAroundKm(lat, lon, DIST_MAX.onde);
  const sUrl =
    `${ONDE}/stations?bbox=${w.toFixed(4)},${s.toFixed(4)},${e.toFixed(4)},${n.toFixed(4)}` +
    `&size=150&fields=code_station,libelle_station,libelle_cours_eau,latitude,longitude`;
  const sr = await fetchT(sUrl, { signal, source: "hubeau" });
  if (!sr.ok && sr.status !== 206) throw new Error("Hub'Eau " + sr.status);
  const sj = (await lireJsonBorne(sr, octetsMaxPour("hubeau"))) as ChargeHubeau;
  let near: { code: string; nom: string; cours: string; dist: number } | null = null;
  for (const d of sj.data || []) {
    const la = Number(d.latitude);
    const lo = Number(d.longitude);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) continue;
    const dist = distKm(lat, lon, la, lo);
    if (!near || dist < near.dist)
      near = {
        code: String(d.code_station),
        nom: String(d.libelle_station || d.libelle_cours_eau || "Station ONDE"),
        cours: String(d.libelle_cours_eau || ""),
        dist,
      };
  }
  if (!near) return null;
  const oUrl =
    `${ONDE}/observations?code_station=${encodeURIComponent(near.code)}` +
    `&sort=desc&size=1&fields=date_observation,code_ecoulement,libelle_ecoulement`;
  const or = await fetchT(oUrl, { signal, source: "hubeau" });
  if (!or.ok && or.status !== 206) throw new Error("Hub'Eau " + or.status);
  const oj = (await lireJsonBorne(or, octetsMaxPour("hubeau"))) as ChargeHubeau;
  const rec = (oj.data || [])[0];
  if (!rec || !rec.code_ecoulement) return null;
  return {
    station: near.nom,
    cours: near.cours,
    dist: near.dist,
    code: String(rec.code_ecoulement),
    label: String(rec.libelle_ecoulement || ""),
    date: String(rec.date_observation || ""),
  };
}

// ---------------------------------------------------------------------------
// Water quality (physico-chemical) — punctual lab samples, NOT real time.
// The fishing-relevant parameters: dissolved O2, O2 saturation, pH.
// ---------------------------------------------------------------------------

const Q_O2 = "1311"; // Oxygène dissous (mg/L)
const Q_SAT = "1312"; // Taux de saturation en oxygène (%)
const Q_PH = "1302"; // pH

export interface QualityReading {
  station: string;
  dist: number; // km
  date: string; // most recent date_prelevement (YYYY-MM-DD)
  o2?: number; // mg/L
  sat?: number; // %
  ph?: number;
  /** Cours d'eau publié par station_pc, ou "" quand elle n'en publie pas. */
  cours?: string;
  /** Clé de cours d'eau comparable (voir station.cleCours), ou undefined. */
  coursCode?: string;
}

/**
 * Nearest quality station's latest O2 / saturation / pH, or null.
 *
 * `coursRef` : voir waterTemp. Deux corrections au passage, mesurées le
 * 31/07/2026 : le code lisait `d.libelle_cours_eau` et `d.code_cours_eau` sans
 * les avoir demandés dans `fields` — et station_pc nomme le libellé
 * `nom_cours_eau`, pas `libelle_cours_eau`. Les deux erreurs se compensaient en
 * un silence : le rattachement était toujours undefined, sans que rien ne le
 * signale.
 */
export async function nearestQuality(
  lat: number,
  lon: number,
  signal?: AbortSignal,
  coursRef?: string,
): Promise<QualityReading | null> {
  const { w, s, e, n } = boxAroundKm(lat, lon, porteePour("qualite", coursRef));
  const sUrl =
    `${QUALITE}/station_pc?bbox=${w.toFixed(4)},${s.toFixed(4)},${e.toFixed(4)},${n.toFixed(4)}` +
    `&size=150&fields=code_station,libelle_station,latitude,longitude,code_cours_eau,nom_cours_eau,uri_cours_eau`;
  const sr = await fetchT(sUrl, { signal, source: "hubeau" });
  if (!sr.ok && sr.status !== 206) throw new Error("Hub'Eau " + sr.status);
  const sj = (await lireJsonBorne(sr, octetsMaxPour("hubeau"))) as ChargeHubeau;
  const cands: {
    code: string;
    nom: string;
    dist: number;
    cours: string;
    coursCode?: string;
  }[] = [];
  for (const d of sj.data || []) {
    const la = Number(d.latitude);
    const lo = Number(d.longitude);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) continue;
    cands.push({
      code: String(d.code_station),
      nom: String(d.libelle_station || ""),
      dist: distKm(lat, lon, la, lo),
      // Le réseau publie le rattachement au cours d'eau ; le laisser tomber
      // ici est précisément ce qui empêchait le troisième critère d'exister.
      cours: String(d.nom_cours_eau || ""),
      coursCode: cleCours(d.code_cours_eau, d.uri_cours_eau),
    });
  }
  // Le référentiel ne date pas ses stations : la fraîcheur se juge sur
  // l'analyse rendue (isStaleQuality), pas ici.
  const near = choisirStation(cands, "qualite", Date.now(), coursRef);
  if (!near) return null;
  // One request; pick the latest non-null result per parameter of interest.
  const aUrl =
    `${QUALITE}/analyse_pc?code_station=${encodeURIComponent(near.code)}` +
    `&code_parametre=${Q_O2},${Q_SAT},${Q_PH}&sort=desc&size=80` +
    `&fields=code_parametre,resultat,date_prelevement`;
  const ar = await fetchT(aUrl, { signal, source: "hubeau" });
  if (!ar.ok && ar.status !== 206) throw new Error("Hub'Eau " + ar.status);
  const aj = (await lireJsonBorne(ar, octetsMaxPour("hubeau"))) as ChargeHubeau;
  const rows: { code_parametre: string; resultat: number | null; date_prelevement: string }[] = aj.data || [];
  const out: QualityReading = {
    station: near.nom,
    dist: near.dist,
    date: "",
    cours: near.cours,
    coursCode: near.coursCode,
  };
  const seen = new Set<string>();
  for (const r of rows) {
    if (r.resultat == null) continue;
    const p = String(r.code_parametre);
    if (seen.has(p)) continue; // rows are desc → first per param is the latest
    seen.add(p);
    if (p === Q_O2) out.o2 = Number(r.resultat);
    else if (p === Q_SAT) out.sat = Number(r.resultat);
    else if (p === Q_PH) out.ph = Number(r.resultat);
    if (r.date_prelevement > out.date) out.date = String(r.date_prelevement);
  }
  if (out.o2 == null && out.sat == null && out.ph == null) return null;
  return out;
}

