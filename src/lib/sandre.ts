// Hydrography from the Sandre / Eaufrance WFS (the same source used by the
// time-serie-explo app), fetched directly from the browser (CORS allowed).
// Rivers = CoursEau1 (named watercourses), water bodies = PlanEau (lakes/ponds).

import { fetchT } from "./net";
import { lireJsonBorne, octetsMaxPour } from "./net-bornes";

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
  /** Total annoncé par le WFS. ABSENT sur certaines couches — mesuré le
   *  31/07/2026 : CoursEau1 et PlanEau_FXX le publient, ObstEcoul non. Son
   *  absence n'est donc pas « réponse complète », voir lib/troncature.ts. */
  numberMatched?: number;
}

/** Plafonds `COUNT` demandés à chaque couche. Exportés parce qu'une réponse
 *  qui atteint exactement son plafond est le seul indice de saturation dont on
 *  dispose sur les couches sans compteur. */
export const COUNT_RIVIERES = 500;
export const COUNT_PLANS_EAU = 400;
export const COUNT_OBSTACLES = 200;

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
  const r = await fetchT(url, { signal, source: "sandre" });
  if (!r.ok) throw new Error("Sandre " + r.status);
  // Lecture bornée : une classe de CoursEau pèse déjà 973 ko (mesuré le
  // 31/07/2026), et rien n'empêchait de charger entièrement en mémoire une
  // réponse anormale sur un téléphone. CorpsTropGrand est distinct d'une
  // absence de données : la source a répondu.
  return (await lireJsonBorne(r, octetsMaxPour("sandre"))) as FeatureCollection;
}

/**
 * Une classe du réseau hydrographique (ordre de Strahler 1 à 5).
 *
 * Ne demandait autrefois que `CoursEau1`, c'est-à-dire les grands cours d'eau :
 * 10 tronçons sur les 55 présents dans la boîte mesurée autour de Blois le
 * 31/07/2026. Voir lib/reseau-hydro.ts pour le détail par classe et le coût.
 */
export const fetchCoursEau = (
  classe: number,
  w: number,
  s: number,
  e: number,
  n: number,
  signal?: AbortSignal,
) => wfs(WFS, `CoursEau${classe}`, w, s, e, n, COUNT_RIVIERES, signal);

/** Compatibilité : la seule première classe. */
export const fetchRivers = (
  w: number,
  s: number,
  e: number,
  n: number,
  signal?: AbortSignal,
) => fetchCoursEau(1, w, s, e, n, signal);

export const fetchWaterBodies = (
  w: number,
  s: number,
  e: number,
  n: number,
  signal?: AbortSignal,
) => wfs(WFS, "PlanEau_FXX", w, s, e, n, COUNT_PLANS_EAU, signal);

/** Obstacles to flow (ROE): dams, weirs, locks — with fish-pass info. */
export const fetchObstacles = (
  w: number,
  s: number,
  e: number,
  n: number,
  signal?: AbortSignal,
) => wfs(OBS, "sa:ObstEcoul", w, s, e, n, COUNT_OBSTACLES, signal);

/**
 * What the ROE says about fish passage at an obstacle.
 *
 * Three states, not two. The nomenclature carries an explicit code 0 "Absence
 * de passe" so that "none" can be *recorded*; a blank field therefore means the
 * survey did not answer, not that the answer is no. Measured around Blois: 117
 * of 129 obstacles blank, 9 marked "Absence de passe", 3 with a named device.
 * Reading blank as "no" invents a negative fact on 91 % of them.
 */
export type Franchissement = "oui" | "non" | "inconnu";

export interface ObstacleInfo {
  name: string;
  type: string;
  /** Measured drop, else the ROE height class, else "". */
  height: string;
  /** The device(s) the ROE names, when it names any. */
  pass: string | null;
  franchissement: Franchissement;
  /** État de l'ouvrage when it is anything other than plainly "Existant". */
  etat: string | null;
  /** False only when the ROE says the structure is entirely destroyed. */
  debout: boolean;
  /** Date the ROE record was last updated — half of them predate 2016. */
  maj: string | null;
}

const str = (v: unknown): string => (v == null ? "" : String(v).trim());

/** "De 0.5m à inférieure à 1m" → "0,5 à 1 m de chute". Numbers out of the
 *  label rather than a table keyed on its exact wording, which would break the
 *  day Sandre re-phrases a class. */
function classeHauteur(label: string): string {
  const n = label.match(/\d+(?:[.,]\d+)?/g);
  if (!n || /indétermin/i.test(label)) return "";
  const fr = (x: string) => x.replace(".", ",");
  if (n.length >= 2) return `${fr(n[0])} à ${fr(n[1])} m de chute`;
  if (/inférieur/i.test(label)) return `moins de ${fr(n[0])} m de chute`;
  if (/supérieur/i.test(label)) return `plus de ${fr(n[0])} m de chute`;
  return `${fr(n[0])} m de chute`;
}

/** Human-readable obstacle description from ROE properties. */
export function obstacleInfo(p: Record<string, unknown>): ObstacleInfo {
  const name = str(p.NomPrincipalObstEcoul) || str(p.CdObstEcoul) || "Ouvrage";
  const type = str(p.LbTypeOuvrage) || "Obstacle";

  const h = Number(str(p.HautChutEtObstEcoul));
  const height =
    str(p.HautChutEtObstEcoul) !== "" && Number.isFinite(h)
      ? `${h} m de chute`
      : classeHauteur(str(p.LbHautChutClObstEcoul));

  // Five ranks in the ROE. A named device at any rank answers the question;
  // code "0" is the source's own way of saying there is none.
  const dispositifs: string[] = [];
  let absenceDite = false;
  for (let i = 1; i <= 5; i++) {
    const code = str(p[`CdTypeDispFranchPiscicole${i}`]);
    const label = str(p[`LbTypeDispFranchPiscicole${i}`]);
    if (!code && !label) continue;
    if (code === "0" || /^absence/i.test(label)) absenceDite = true;
    else if (label) dispositifs.push(label);
  }
  const franchissement: Franchissement = dispositifs.length
    ? "oui"
    : absenceDite
      ? "non"
      : "inconnu";

  const etatBrut = str(p.LbEtOuvrage);
  const etat = etatBrut && !/^existant$/i.test(etatBrut) ? etatBrut : null;

  return {
    name,
    type,
    height,
    pass: dispositifs.length ? dispositifs.join(" + ") : null,
    franchissement,
    // Unknown state is not destruction: absent → assumed standing, as the map
    // has always shown it.
    debout: !/détruit entièrement/i.test(etatBrut),
    etat,
    maj: str(p.DateMAJObstEcoul) || null,
  };
}

/** The one place the passability sentence is written, so map and briefing
 *  cannot drift apart on what the ROE was made to say. */
export function passeTexte(o: ObstacleInfo): string {
  if (o.franchissement === "oui") return `passe : ${o.pass}`;
  if (o.franchissement === "non") return "pas de passe à poissons";
  return "passe à poissons non renseignée";
}

export interface Place {
  label: string;
  lon: number;
  lat: number;
}

/** Place / commune search via the IGN Géoplateforme geocoder (CORS allowed). */
export async function geocode(q: string, signal?: AbortSignal): Promise<Place[]> {
  const r = await fetchT(
    `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(q)}&limit=6`,
    { signal, source: "ign" },
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

/** Département number (e.g. "41") at a point, via the IGN reverse geocoder, or
 *  null. Used to set the active department from the user's GPS position. */
export async function deptFromCoords(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    // 3 decimals (~110 m) resolves the département reliably without handing the
    // user's precise position to the IGN geocoder (privacy — see Sources screen).
    const r = await fetchT(
      `https://data.geopf.fr/geocodage/reverse?lon=${lon.toFixed(3)}&lat=${lat.toFixed(3)}&index=address&limit=1`,
      { signal, source: "ign" },
    );
    if (!r.ok) return null;
    const j = await r.json();
    const p = (j.features || [])[0]?.properties as { citycode?: string; context?: string } | undefined;
    if (p?.citycode && p.citycode.length >= 2) {
      const cc = p.citycode;
      // Métropole = 2 digits (Corse "2A/2B" included); Outre-mer = 3 ("971"–"976").
      return cc.startsWith("97") || cc.startsWith("98") ? cc.slice(0, 3) : cc.slice(0, 2);
    }
    const m = p?.context?.match(/^(\d{2,3})/); // context = "41, Loir-et-Cher, …"
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** Clean a Sandre watercourse label ("fleuve la loire" → "La Loire"). */
export function riverName(props: Record<string, unknown>): string {
  const raw = String(props.NomEntiteHydrographique || "").trim();
  if (!raw) return "Cours d'eau";
  const cleaned = raw.replace(/^(fleuve|rivière|ruisseau|le|la|les|l')\s+/i, "");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
