// Hydrography from the Sandre / Eaufrance WFS (the same source used by the
// time-serie-explo app), fetched directly from the browser (CORS allowed).
// Rivers = CoursEau1 (named watercourses), water bodies = PlanEau (lakes/ponds).

const WFS = "https://services.sandre.eaufrance.fr/geo/zonage";
const OBS = "https://services.sandre.eaufrance.fr/geo/obs";
const OUTPUT = "application/json; subtype=geojson";

// WFS 2.0 + EPSG:4326 expects axis order lat,lon (minLat,minLon,maxLat,maxLon).
function bbox(w: number, s: number, e: number, n: number): string {
  return `${s.toFixed(4)},${w.toFixed(4)},${n.toFixed(4)},${e.toFixed(4)},urn:ogc:def:crs:EPSG::4326`;
}

export interface FeatureCollection {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    geometry: unknown;
    properties: Record<string, unknown>;
  }[];
}

async function wfs(
  base: string,
  typename: string,
  w: number,
  s: number,
  e: number,
  n: number,
  count: number,
  signal?: AbortSignal,
): Promise<FeatureCollection> {
  const url =
    `${base}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature` +
    `&OUTPUTFORMAT=${encodeURIComponent(OUTPUT)}&TYPENAMES=${typename}` +
    `&BBOX=${bbox(w, s, e, n)}&COUNT=${count}`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error("Sandre " + r.status);
  return r.json();
}

export const fetchRivers = (
  w: number,
  s: number,
  e: number,
  n: number,
  signal?: AbortSignal,
) => wfs(WFS, "CoursEau1", w, s, e, n, 500, signal);

export const fetchWaterBodies = (
  w: number,
  s: number,
  e: number,
  n: number,
  signal?: AbortSignal,
) => wfs(WFS, "PlanEau_FXX", w, s, e, n, 400, signal);

/** Obstacles to flow (ROE): dams, weirs, locks — with fish-pass info. */
export const fetchObstacles = (
  w: number,
  s: number,
  e: number,
  n: number,
  signal?: AbortSignal,
) => wfs(OBS, "sa:ObstEcoul", w, s, e, n, 200, signal);

/** Human-readable obstacle type + fish-pass note from ROE properties. */
export function obstacleInfo(p: Record<string, unknown>): {
  name: string;
  type: string;
  height: string;
  pass: string | null;
} {
  const name = String(p.NomPrincipalObstEcoul || p.CdObstEcoul || "Ouvrage");
  const type = String(p.LbTypeOuvrage || "Obstacle");
  const h = p.HautChutEtObstEcoul;
  const height = h != null && h !== "" ? `${Number(h).toFixed(2)} m de chute` : "";
  const passRaw = p.LbTypeDispFranchPiscicole1;
  const pass =
    passRaw && String(passRaw).trim() && !/aucun|sans|absence|inexistant|non\s|pas de/i.test(String(passRaw))
      ? String(passRaw)
      : null;
  return { name, type, height, pass };
}

export interface Place {
  label: string;
  lon: number;
  lat: number;
}

/** Place / commune search via the IGN Géoplateforme geocoder (CORS allowed). */
export async function geocode(q: string, signal?: AbortSignal): Promise<Place[]> {
  const r = await fetch(
    `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(q)}&limit=6`,
    { signal },
  );
  if (!r.ok) throw new Error("geocode " + r.status);
  const j = await r.json();
  return (j.features || [])
    .filter(
      (f: { geometry?: { coordinates?: [number, number] } }) =>
        Array.isArray(f.geometry?.coordinates) && f.geometry.coordinates.length >= 2,
    )
    .map((f: { properties: { label: string }; geometry: { coordinates: [number, number] } }) => ({
      label: f.properties.label,
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
    }));
}

/** Clean a Sandre watercourse label ("fleuve la loire" → "La Loire"). */
export function riverName(props: Record<string, unknown>): string {
  const raw = String(props.NomEntiteHydrographique || "").trim();
  if (!raw) return "Cours d'eau";
  const cleaned = raw.replace(/^(fleuve|rivière|ruisseau|le|la|les|l')\s+/i, "");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
