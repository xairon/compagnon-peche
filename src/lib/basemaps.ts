// Basemap definitions. Raster tiles are not subject to CORS for display, and the
// IGN Géoplateforme (data.geopf.fr) is open without an API key since late 2023.

import type { StyleSpecification } from "maplibre-gl";

export type BasemapId = "carto" | "satellite" | "plan";

const ign = (layer: string, format: string) =>
  `https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile` +
  `&LAYER=${layer}&STYLE=normal&FORMAT=${encodeURIComponent(format)}` +
  `&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`;

export interface Basemap {
  id: BasemapId;
  label: string;
  /** MapLibre style URL (vector) — used for the default Carto base. */
  style?: string;
  /** Raster tile template — used for the IGN raster bases. */
  tiles?: string;
  attribution: string;
}

export const BASEMAPS: Record<BasemapId, Basemap> = {
  carto: {
    id: "carto",
    label: "Carte",
    style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
    attribution: "© CARTO © OpenStreetMap",
  },
  satellite: {
    id: "satellite",
    label: "Satellite",
    tiles: ign("ORTHOIMAGERY.ORTHOPHOTOS", "image/jpeg"),
    attribution: "Ortho © IGN-F/Géoplateforme",
  },
  plan: {
    id: "plan",
    label: "Plan IGN",
    tiles: ign("GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2", "image/png"),
    attribution: "Plan IGN © IGN-F/Géoplateforme",
  },
};

/** A minimal MapLibre raster style wrapping an IGN base (for satellite / plan). */
export function rasterStyle(b: Basemap): StyleSpecification {
  return {
    version: 8,
    sources: {
      base: {
        type: "raster",
        tiles: [b.tiles as string],
        tileSize: 256,
        attribution: b.attribution,
        maxzoom: 19,
      },
    },
    layers: [{ id: "base", type: "raster", source: "base" }],
  };
}
