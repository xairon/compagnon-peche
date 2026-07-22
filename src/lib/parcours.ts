// Fishing reserves & parcours. There is NO national open dataset — the only
// authoritative national source is the fédérations' Géopêche map, which is not
// an open API. A handful of départements publish their reserves/parcours as open
// WMS on data.gouv.fr (today: Maine-et-Loire, 49). We overlay those as raster
// tiles (transparent outside their extent, so they can be added unconditionally)
// and link out to Géopêche everywhere else. Nothing is invented.

// Official national interactive map (opens and geolocates the angler).
export const GEOPECHE_URL = "https://map.geopeche.com";

/** Géopêche deep-link centred on a point (Leaflet-style #zoom/lat/lon hash — the
 *  format the fédérations' own links use). Falls back to the base map. */
export function geopecheUrlAt(lat?: number, lon?: number, zoom?: number): string {
  if (lat == null || lon == null) return GEOPECHE_URL;
  const z = Math.round(zoom ?? 13);
  return `${GEOPECHE_URL}/#${z}/${lat.toFixed(4)}/${lon.toFixed(4)}`;
}

interface WmsSource {
  id: string;
  base: string; // MapServer endpoint incl. the map= parameter
  layers: string; // comma-separated WMS layer names
  label: string;
  attribution: string;
}

// data.gouv.fr open-data endpoints (DDT MapServer via geo-ide). Verified via
// GetCapabilities + GetMap. Add more départements here as they publish theirs.
const GEO_IDE = "https://ogc.geo-ide.developpement-durable.gouv.fr/wxs?map=";
// Maine-et-Loire (49): réserves perm./ann./spécifiques + parcours carpe de nuit.
const M49 = GEO_IDE + "/opt/data/stack/mapfiles/1.4/org_38040/fr-120066022-orphan-c15deeba-e630-493c-af88-76d177843788.internet.map";
// Tarn-et-Garonne (82): réserves surfaciques + linéaires (deux services).
const M82_SURF = GEO_IDE + "/opt/data/stack/mapfiles/1.4/org_38104/4dd2b10d-7547-4e26-be05-c06d6e376acf.internet.map";
const M82_LIN = GEO_IDE + "/opt/data/stack/mapfiles/1.4/org_38104/2f094efc-833a-4466-8be2-8a102732b1f8.internet.map";

// Registry of open-data overlays. Add more départements here as they publish.
export const PARCOURS_WMS: WmsSource[] = [
  {
    id: "parcours-49",
    base: M49,
    layers: "L_RES_PECHE_PERM_S_049,L_RES_PECHE_ANN_S_049,L_RES_PECHE_SPE_S_049,L_PECHE_PARCOURS_CARPE_NUIT_S_049",
    label: "Réserves & parcours — Maine-et-Loire (49)",
    attribution: "DDT 49 / data.gouv.fr",
  },
  {
    id: "parcours-82-surf",
    base: M82_SURF,
    layers: "N_RES_PECHE_ZINF_S_082",
    label: "Réserves surfaciques — Tarn-et-Garonne (82)",
    attribution: "DDT 82 / data.gouv.fr",
  },
  {
    id: "parcours-82-lin",
    base: M82_LIN,
    layers: "N_RES_PECHE_L_082",
    label: "Réserves linéaires — Tarn-et-Garonne (82)",
    attribution: "DDT 82 / data.gouv.fr",
  },
];

/** MapLibre raster tile template for a WMS source (Web-Mercator GetMap). */
export function wmsTileUrl(s: WmsSource): string {
  return (
    s.base +
    "&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=" +
    s.layers +
    "&STYLES=&CRS=EPSG:3857&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=TRUE&BBOX={bbox-epsg-3857}"
  );
}

// ── Catégorie piscicole (1ʳᵉ / 2ᵉ catégorie) ──────────────────────────────
// The official regulatory classification of watercourses — it governs most of
// the rules (opening dates, species). Published as open data by a growing set of
// DDTs (data.gouv.fr / geo-ide). Layer name encodes the dept: *_L_0XX.
const CAT = (org: string, id: string) => GEO_IDE + `/opt/data/stack/mapfiles/1.4/${org}/${id}.internet.map`;

export const CATEGORIE_WMS: WmsSource[] = [
  { id: "cat-41", base: CAT("org_38024", "91a62eee-79c6-4ed0-9964-bb6a336243c4"), layers: "N_CAT_PISCICOLE_L_041", label: "Catégorie piscicole — Loir-et-Cher (41)", attribution: "DDT 41 / data.gouv.fr" },
  { id: "cat-18", base: CAT("org_37976", "50cadbbf-730c-427b-aa78-a4b682b385ad"), layers: "N_CAT_PISCICOLE_L_018", label: "Catégorie piscicole — Cher (18)", attribution: "DDT 18 / data.gouv.fr" },
  { id: "cat-35", base: CAT("org_38012", "6084c5f1-bfdf-4d66-98e9-39ca42f8ec30"), layers: "L_CAT_PISCICOLE_L_035", label: "Catégorie piscicole — Ille-et-Vilaine (35)", attribution: "DDTM 35 / data.gouv.fr" },
  { id: "cat-08", base: CAT("org_37956", "b0d05c55-a828-4982-96b7-673b0252d48e"), layers: "N_CAT_PISCICOLE_L_008", label: "Catégorie piscicole — Ardennes (08)", attribution: "DDT 08 / data.gouv.fr" },
  { id: "cat-67", base: CAT("org_38076", "edc40169-16db-4069-a143-5e00bda064be"), layers: "N_CAT_PISCICOLE_L_067", label: "Catégorie piscicole — Bas-Rhin (67)", attribution: "DDT 67 / data.gouv.fr" },
  { id: "cat-89", base: CAT("org_38118", "14cb3ef1-ea10-46bb-a772-639d9d587eca"), layers: "N_CAT_PISCICOLE_L_089", label: "Catégorie piscicole — Yonne (89)", attribution: "DDT 89 / data.gouv.fr" },
  { id: "cat-13", base: CAT("org_37966", "44fcf8d2-bf45-44a9-894a-39ac65db4afe"), layers: "N_CAT_PISCICOLE_L_013", label: "Catégorie piscicole — Bouches-du-Rhône (13)", attribution: "DDTM 13 / data.gouv.fr" },
];

export const PARCOURS_ATTRIBUTION = [...PARCOURS_WMS, ...CATEGORIE_WMS]
  .map((s) => s.attribution)
  .join(" · ");
