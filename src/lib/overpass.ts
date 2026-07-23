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
    `[out:json][timeout:20];(` +
    `nwr["amenity"="parking"]${bb};` +
    `nwr["leisure"="slipway"]${bb};` +
    `nwr["leisure"="fishing"]${bb};` +
    `nwr["man_made"="pier"]${bb};` +
    `);out center tags 200;`;
  // GET (not POST) so the service worker can cache the response for offline use.
  const r = await fetchT(`${ENDPOINT}?data=${encodeURIComponent(q)}`, { signal });
  if (!r.ok) throw new Error("Overpass " + r.status);
  const j = await r.json();
  const out: AccessPoint[] = [];
  for (const el of j.elements || []) {
    const la = el.lat ?? el.center?.lat;
    const lo = el.lon ?? el.center?.lon;
    if (la == null || lo == null) continue;
    const t = el.tags || {};
    let kind: AccessKind = "parking";
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
