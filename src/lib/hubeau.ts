// Hybrid online layer: real fish-presence data from the Hub'Eau "poisson" API
// (OFB/ASPE electrofishing surveys). Called from the browser; results feed the map.
// Offline the map degrades gracefully (see Carte screen).
//
// This module also exposes real-time HYDROMETRY (water level & flow) and water
// TEMPERATURE for the "briefing" panel — all Hub'Eau, free, no key, CORS OK.

import { distKm, boxAround } from "./geo";
import { fetchT } from "./net";

const BASE = "https://hubeau.eaufrance.fr/api/v1/etat_piscicole";
const HYDRO = "https://hubeau.eaufrance.fr/api/v2/hydrometrie";
const TEMP = "https://hubeau.eaufrance.fr/api/v1/temperature";
const ONDE = "https://hubeau.eaufrance.fr/api/v1/ecoulement";
const QUALITE = "https://hubeau.eaufrance.fr/api/v2/qualite_rivieres";

export interface Station {
  code: string;
  nom: string;
  cours: string;
  lat: number;
  lon: number;
}

export interface StationSpecies {
  fr: string;
  latin: string;
  effectif: number;
}

/** Electrofishing stations within a lon/lat bounding box. */
export async function stationsInBbox(
  w: number,
  s: number,
  e: number,
  n: number,
  signal?: AbortSignal,
): Promise<Station[]> {
  const url =
    `${BASE}/stations?bbox=${w.toFixed(4)},${s.toFixed(4)},${e.toFixed(4)},${n.toFixed(4)}` +
    `&size=300&fields=code_station,libelle_station,libelle_cours_eau,latitude,longitude`;
  const r = await fetchT(url, { signal });
  if (!r.ok && r.status !== 206) throw new Error("Hub'Eau " + r.status);
  const j = await r.json();
  return (j.data || [])
    .filter((d: Record<string, unknown>) => Number.isFinite(Number(d.latitude)) && Number.isFinite(Number(d.longitude)))
    .map((d: Record<string, unknown>) => ({
      code: String(d.code_station),
      nom: String(d.libelle_station || d.libelle_cours_eau || "Station de suivi"),
      cours: String(d.libelle_cours_eau || ""),
      lat: Number(d.latitude),
      lon: Number(d.longitude),
    }));
}

/** Species recorded at a station, aggregated across ALL surveys (most abundant
 *  first). size=20000 (the API max) so heavily-surveyed stations aren't truncated
 *  — some have thousands of lots (e.g. La Ferté-St-Cyr ≈ 2600); sort=desc keeps
 *  the most recent first as a safety if a station ever exceeds one page. */
export async function speciesAtStation(
  code: string,
  signal?: AbortSignal,
): Promise<StationSpecies[]> {
  const url =
    `${BASE}/observations?code_station=${encodeURIComponent(code)}` +
    `&size=20000&sort=desc&fields=nom_commun_taxon,nom_latin_taxon,effectif_lot`;
  const r = await fetchT(url, { signal });
  if (!r.ok && r.status !== 206) throw new Error("Hub'Eau " + r.status);
  const j = await r.json();
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

/** Nearest in-service hydrometry station to a point (or null if none within ~25 km). */
export async function nearestHydroStation(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<HydroStation | null> {
  const { w, s, e, n } = boxAround(lat, lon, 0.22);
  const url =
    `${HYDRO}/referentiel/stations?bbox=${w.toFixed(4)},${s.toFixed(4)},${e.toFixed(4)},${n.toFixed(4)}` +
    `&en_service=true&size=200&format=json`;
  const r = await fetchT(url, { signal });
  if (!r.ok && r.status !== 206) throw new Error("Hub'Eau " + r.status);
  const j = await r.json();
  let best: HydroStation | null = null;
  for (const d of j.data || []) {
    const la = Number(d.latitude_station ?? d.latitude);
    const lo = Number(d.longitude_station ?? d.longitude);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) continue;
    const dist = distKm(lat, lon, la, lo);
    if (!best || dist < best.dist) {
      best = {
        code: String(d.code_station),
        nom: String(d.libelle_station || d.libelle_cours_eau || "Station"),
        cours: String(d.libelle_cours_eau || ""),
        lat: la,
        lon: lo,
        dist,
      };
    }
  }
  return best;
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
  const r = await fetchT(url, { signal });
  if (!r.ok && r.status !== 206) throw new Error("Hub'Eau " + r.status);
  const j = await r.json();
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
}

/** A water-temperature reading older than ~2 weeks is stale for a "current
 *  conditions" display (temperature moves seasonally). Flags it, never hides it. */
export function isStaleWaterTemp(iso: string): boolean {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return false;
  return Date.now() - t > 14 * 86400000;
}

/** Nearest recent water-temperature reading, or null if no sensor within ~30 km. */
export async function nearestTemp(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<TempReading | null> {
  const { w, s, e, n } = boxAround(lat, lon, 0.3);
  const sUrl =
    `${TEMP}/station?bbox=${w.toFixed(4)},${s.toFixed(4)},${e.toFixed(4)},${n.toFixed(4)}` +
    `&size=100&fields=code_station,libelle_station,latitude,longitude`;
  const sr = await fetchT(sUrl, { signal });
  if (!sr.ok && sr.status !== 206) throw new Error("Hub'Eau " + sr.status);
  const sj = await sr.json();
  let near: { code: string; nom: string; dist: number } | null = null;
  for (const d of sj.data || []) {
    const la = Number(d.latitude);
    const lo = Number(d.longitude);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) continue;
    const dist = distKm(lat, lon, la, lo);
    if (!near || dist < near.dist) near = { code: String(d.code_station), nom: String(d.libelle_station || ""), dist };
  }
  if (!near) return null;
  const cUrl =
    `${TEMP}/chronique?code_station=${encodeURIComponent(near.code)}` +
    `&sort=desc&size=1&fields=date_mesure_temp,heure_mesure_temp,resultat`;
  const cr = await fetchT(cUrl, { signal });
  if (!cr.ok && cr.status !== 206) throw new Error("Hub'Eau " + cr.status);
  const cj = await cr.json();
  const rec = (cj.data || [])[0];
  if (!rec || rec.resultat == null) return null;
  // date_mesure_temp + heure_mesure_temp are French legal time (Europe/Paris),
  // no timezone suffix — so parse as LOCAL (do NOT append "Z", that would shift
  // it by the UTC offset). heure_mesure_temp exists reliably on this endpoint.
  const iso = `${rec.date_mesure_temp}T${rec.heure_mesure_temp || "12:00:00"}`;
  return { station: near.nom, dist: near.dist, value: Number(rec.resultat), date: iso };
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
}

const Q_TEMP = "1301"; // Température de l'eau (°C) in the quality API

export async function waterTemp(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<WaterTemp | null> {
  const { w, s, e, n } = boxAround(lat, lon, 0.35);
  // A) Physico-chemical param 1301 — the most recent sample the API returns in the
  //    box (its `sort=desc` is not guaranteed by date, so we always show the date).
  const physicoP: Promise<WaterTemp | null> = (async () => {
    const url =
      `${QUALITE}/analyse_pc?bbox=${w.toFixed(4)},${s.toFixed(4)},${e.toFixed(4)},${n.toFixed(4)}` +
      `&code_parametre=${Q_TEMP}&sort=desc&size=1` +
      `&fields=date_prelevement,resultat,libelle_station,latitude,longitude`;
    const r = await fetchT(url, { signal });
    if (!r.ok && r.status !== 206) return null;
    const j = await r.json();
    const a = (j.data || [])[0];
    if (!a || a.resultat == null) return null;
    const la = Number(a.latitude);
    const lo = Number(a.longitude);
    return {
      value: Number(a.resultat),
      date: String(a.date_prelevement),
      station: String(a.libelle_station || ""),
      dist: Number.isFinite(la) && Number.isFinite(lo) ? distKm(lat, lon, la, lo) : 0,
      source: "physico" as const,
    };
  })().catch(() => null);
  // B) Dedicated thermie network (nearest station's latest reading).
  const thermieP: Promise<WaterTemp | null> = nearestTemp(lat, lon, signal)
    .then((t) =>
      t ? { value: t.value, date: t.date, station: t.station, dist: t.dist, source: "thermie" as const } : null,
    )
    .catch(() => null);

  const cands = (await Promise.all([physicoP, thermieP])).filter(Boolean) as WaterTemp[];
  if (!cands.length) return null;
  // Most recent wins; tie-break on proximity.
  cands.sort((a, b) => {
    const dt = new Date(b.date).getTime() - new Date(a.date).getTime();
    return dt !== 0 ? dt : a.dist - b.dist;
  });
  return cands[0];
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
  const { w, s, e, n } = boxAround(lat, lon, 0.28);
  const sUrl =
    `${ONDE}/stations?bbox=${w.toFixed(4)},${s.toFixed(4)},${e.toFixed(4)},${n.toFixed(4)}` +
    `&size=150&fields=code_station,libelle_station,libelle_cours_eau,latitude,longitude`;
  const sr = await fetchT(sUrl, { signal });
  if (!sr.ok && sr.status !== 206) throw new Error("Hub'Eau " + sr.status);
  const sj = await sr.json();
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
  const or = await fetchT(oUrl, { signal });
  if (!or.ok && or.status !== 206) throw new Error("Hub'Eau " + or.status);
  const oj = await or.json();
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
}

/** Nearest quality station's latest O2 / saturation / pH, or null. */
export async function nearestQuality(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<QualityReading | null> {
  const { w, s, e, n } = boxAround(lat, lon, 0.28);
  const sUrl =
    `${QUALITE}/station_pc?bbox=${w.toFixed(4)},${s.toFixed(4)},${e.toFixed(4)},${n.toFixed(4)}` +
    `&size=150&fields=code_station,libelle_station,latitude,longitude`;
  const sr = await fetchT(sUrl, { signal });
  if (!sr.ok && sr.status !== 206) throw new Error("Hub'Eau " + sr.status);
  const sj = await sr.json();
  let near: { code: string; nom: string; dist: number } | null = null;
  for (const d of sj.data || []) {
    const la = Number(d.latitude);
    const lo = Number(d.longitude);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) continue;
    const dist = distKm(lat, lon, la, lo);
    if (!near || dist < near.dist) near = { code: String(d.code_station), nom: String(d.libelle_station || ""), dist };
  }
  if (!near) return null;
  // One request; pick the latest non-null result per parameter of interest.
  const aUrl =
    `${QUALITE}/analyse_pc?code_station=${encodeURIComponent(near.code)}` +
    `&code_parametre=${Q_O2},${Q_SAT},${Q_PH}&sort=desc&size=80` +
    `&fields=code_parametre,resultat,date_prelevement`;
  const ar = await fetchT(aUrl, { signal });
  if (!ar.ok && ar.status !== 206) throw new Error("Hub'Eau " + ar.status);
  const aj = await ar.json();
  const rows: { code_parametre: string; resultat: number | null; date_prelevement: string }[] = aj.data || [];
  const out: QualityReading = { station: near.nom, dist: near.dist, date: "" };
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

