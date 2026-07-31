// Practical access points from OpenStreetMap via the Overpass API (free, no key,
// CORS OK). Parkings, slipways (mise à l'eau), fishing piers. Coverage depends on
// OSM contributors — uneven by region, so absence ≠ "nothing there".

import { distKm } from "./geo";
import { fetchT } from "./net";

const ENDPOINT = "https://overpass-api.de/api/interpreter";

export type AccessKind = "parking" | "slipway" | "pier" | "fishing";

export interface AccessPoint {
  kind: AccessKind;
  name: string;
  lat: number;
  lon: number;
}

const LABEL: Record<AccessKind, string> = {
  parking: "Parking",
  slipway: "Mise à l'eau",
  pier: "Ponton / jetée",
  fishing: "Spot de pêche (OSM)",
};

export function accessLabel(k: AccessKind): string {
  return LABEL[k];
}

export function accessIcon(k: AccessKind): string {
  return k === "parking" ? "🅿️" : k === "slipway" ? "🛶" : k === "pier" ? "🪝" : "🎣";
}

/**
 * Overpass declined to answer — it is busy, not the user's connection.
 *
 * A shared free service pushes back constantly (429, 504, or a `remark` inside
 * an otherwise-200 body). All three used to surface as "Indisponible (connexion
 * requise)", blaming the phone for the server's refusal, next to a panel whose
 * other branch reads "aucun accès cartographié". Naming the case lets the UI
 * say what happened and invite a retry.
 */
export class SourceOccupee extends Error {
  constructor(detail: string) {
    super(`OpenStreetMap (Overpass) n'a pas répondu : ${detail}`);
    this.name = "SourceOccupee";
  }
}

/**
 * How many features to ask for, per kind.
 *
 * Per kind, not overall. Parkings outnumber everything else by an order of
 * magnitude — a Blois-sized box returned 60 parkings, 3 piers and 1 slipway —
 * so a single global cap lets them fill it and the one slipway on the river
 * never comes back. The panel then reports that as there being none.
 */
export const budgetAcces: Record<AccessKind, number> = {
  parking: 60,
  slipway: 30,
  pier: 30,
  fishing: 30,
};

/** The tag filter that defines each kind, and the set name it lands in. */
const REQUETES: { kind: AccessKind; set: string; filtre: string }[] = [
  { kind: "parking", set: "p", filtre: '["amenity"="parking"]' },
  { kind: "slipway", set: "c", filtre: '["leisure"="slipway"]' },
  { kind: "fishing", set: "f", filtre: '["leisure"="fishing"]' },
  { kind: "pier", set: "j", filtre: '["man_made"="pier"]' },
];

// The server may spend 25 s on the query, so the client must not give up at 12.
// It used to: the query announced `timeout:20` while fetchT aborted at 12, so
// any query the server took longer than 12 s on was time spent for nothing.
const SERVEUR_S = 25;
/** Exporté pour que net-bornes.ts ne puisse pas décrire un autre budget pour
 *  la même source : un test compare les deux. */
export const CLIENT_MS = (SERVEUR_S + 5) * 1000;

/** Access POIs within a lon/lat bbox. Order: sud,ouest,nord,est for Overpass. */
export async function fetchAccess(
  w: number,
  s: number,
  e: number,
  n: number,
  signal?: AbortSignal,
): Promise<AccessPoint[]> {
  const bb = `(${s.toFixed(4)},${w.toFixed(4)},${n.toFixed(4)},${e.toFixed(4)})`;
  const q =
    `[out:json][timeout:${SERVEUR_S}];` +
    REQUETES.map((r) => `nwr${r.filtre}${bb}->.${r.set};`).join("") +
    REQUETES.map((r) => `.${r.set} out center tags ${budgetAcces[r.kind]};`).join("");
  // GET (not POST) so the service worker can cache the response for offline use.
  const r = await fetchT(`${ENDPOINT}?data=${encodeURIComponent(q)}`, {
    signal,
    timeout: CLIENT_MS,
  });
  if (r.status === 429 || r.status === 504) throw new SourceOccupee(`erreur ${r.status}`);
  if (!r.ok) throw new Error("Overpass " + r.status);

  // A rejected query can still arrive as 200 with an XHTML body — observed on
  // 31/07/2026 — so .json() failing is a refusal, not an empty area.
  let j: { elements?: unknown[]; remark?: string };
  try {
    j = await r.json();
  } catch {
    throw new SourceOccupee("réponse illisible");
  }
  // `remark` is how Overpass reports a failure *inside* a 200. Returning the
  // partial list would present a truncated answer as a complete one.
  if (j.remark) throw new SourceOccupee(j.remark);

  const out: AccessPoint[] = [];
  for (const el of (j.elements || []) as Record<string, never>[]) {
    const c = el.center as { lat?: number; lon?: number } | undefined;
    const la = (el.lat as number | undefined) ?? c?.lat;
    const lo = (el.lon as number | undefined) ?? c?.lon;
    if (la == null || lo == null) continue;
    const t = (el.tags || {}) as Record<string, string>;
    let kind: AccessKind;
    if (t.leisure === "slipway") kind = "slipway";
    else if (t.leisure === "fishing") kind = "fishing";
    else if (t.man_made === "pier") kind = "pier";
    else if (t.amenity === "parking") kind = "parking";
    else continue;
    out.push({ kind, name: t.name || LABEL[kind], lat: la, lon: lo });
  }
  return out;
}

/** The nearest access point of each kind to a target point. */
export function nearestByKind(
  points: AccessPoint[],
  lat: number,
  lon: number,
): { point: AccessPoint; dist: number }[] {
  const best = new Map<AccessKind, { point: AccessPoint; dist: number }>();
  for (const p of points) {
    const dist = distKm(lat, lon, p.lat, p.lon);
    const cur = best.get(p.kind);
    if (!cur || dist < cur.dist) best.set(p.kind, { point: p, dist });
  }
  return [...best.values()].sort((a, b) => a.dist - b.dist);
}
