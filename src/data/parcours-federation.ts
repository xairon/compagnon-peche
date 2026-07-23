// Federation-published fishing parcours for departments WITHOUT open GIS data
// (unlike Loir-et-Cher 41, which ships as a bundled offline snapshot generated
// from Pilote41 — see data/parcours41-snapshot.ts, used directly by Carte.tsx).
//
// These facts (names, rivers, communes, categories, and — where the federation
// publishes them — GPS coordinates) come from the fédérations' OWN public
// websites, intended for anglers. Every entry carries its exact source URL.
//
// Honesty rules (the app never fabricates a location):
//  - precision "exact"    → GPS published by the federation. Rendered as a solid pin.
//  - precision "geocoded" → a NAMED place (a dam) resolved via the IGN geocoder.
//    Precise enough for that place, rendered as a solid pin.
//  - precision "commune"  → only the commune was published; the point is the
//    commune centroid, NOT the parcours. Rendered as a hollow "≈" pin and the
//    popup says "emplacement approximatif (commune)".
//  - no lat/lon           → shown only in the sourced list, never on the map.

import { FED_REST } from "./parcours-federation.gen";

export type FedParcoursKind = "no-kill" | "reserve" | "carpe-nuit" | "parcours" | "plan-eau";
export type FedPrecision = "exact" | "geocoded" | "commune";

export interface FedParcours {
  id: string;
  dept: "23" | "36";
  kind: FedParcoursKind;
  name: string;
  river?: string;
  commune?: string;
  category?: "1" | "2"; // 1ʳᵉ / 2ᵉ catégorie piscicole
  lengthM?: number;
  techniques?: string;
  posts?: number; // carpe de nuit: number of posts
  note?: string;
  lat?: number;
  lon?: number;
  precision?: FedPrecision; // required when lat/lon are set
  source: string; // exact page URL the fact was read from
}

const NOKILL_23 = "https://fdpeche23.wixsite.com/peche23/copie-de-parcours-loisirs-1";

// Creuse (23) — 7 parcours no-kill. GPS published on the federation page above
// (DMS), converted to decimal degrees. Verified at source 2026-07-22.
const CREUSE_NOKILL: FedParcours[] = [
  {
    id: "23-nk-aubusson",
    dept: "23",
    kind: "no-kill",
    name: "No-kill d'Aubusson",
    river: "La Creuse & La Beauze",
    commune: "Aubusson",
    lengthM: 1300,
    techniques: "Pêche à la mouche uniquement",
    lat: 45.95417,
    lon: 2.17289,
    precision: "exact",
    source: NOKILL_23,
  },
  {
    id: "23-nk-chapelle-taillefert",
    dept: "23",
    kind: "no-kill",
    name: "No-kill de la Gartempe",
    river: "La Gartempe",
    commune: "La Chapelle-Taillefert / Saint-Victor",
    lengthM: 1500,
    techniques: "Mouche et leurres",
    lat: 46.10272,
    lon: 1.83469,
    precision: "exact",
    source: NOKILL_23,
  },
  {
    id: "23-nk-gioux-croze",
    dept: "23",
    kind: "no-kill",
    name: "No-kill de la Gioune",
    river: "La Gioune",
    commune: "Gioux — Croze",
    lengthM: 3500,
    techniques: "Toutes techniques",
    note: "Site Rivières Sauvages",
    lat: 45.80417,
    lon: 2.117,
    precision: "exact",
    source: NOKILL_23,
  },
  {
    id: "23-nk-tourtoulloux",
    dept: "23",
    kind: "no-kill",
    name: "No-kill du Pic",
    river: "Le Pic",
    commune: "Tourtoulloux",
    lengthM: 2500,
    techniques: "Toutes techniques",
    note: "Site Rivières Sauvages",
    lat: 45.87247,
    lon: 1.80092,
    precision: "exact",
    source: NOKILL_23,
  },
  {
    id: "23-nk-bonlieu",
    dept: "23",
    kind: "no-kill",
    name: "No-kill de Bonlieu",
    river: "La Tardes",
    commune: "Bonlieu",
    lengthM: 3000,
    techniques: "Toutes techniques",
    lat: 46.08269,
    lon: 2.31014,
    precision: "exact",
    source: NOKILL_23,
  },
  {
    id: "23-nk-rigole-diable",
    dept: "23",
    kind: "no-kill",
    name: "No-kill de la Rigole du Diable",
    river: "Le Thaurion",
    lengthM: 2500,
    techniques: "Toutes techniques",
    lat: 45.87167,
    lon: 1.92917,
    precision: "exact",
    source: NOKILL_23,
  },
  {
    id: "23-nk-moneyroux",
    dept: "23",
    kind: "no-kill",
    name: "No-kill du Moneyroux",
    river: "Le Verraux",
    lengthM: 1500,
    techniques: "Toutes techniques",
    lat: 46.283,
    lon: 2.11919,
    precision: "exact",
    source: NOKILL_23,
  },
];

// The full registry: the 7 hand-verified Creuse no-kill parcours above, plus the
// generated set (Creuse réserves & carpe-de-nuit, Indre parcours & plans d'eau) —
// all read from the fédérations' pages and coordinate-checked against the IGN
// geocoder. See parcours-federation.gen.ts.
export const FED_PARCOURS: FedParcours[] = [...CREUSE_NOKILL, ...FED_REST];

/** Only the entries that carry honest coordinates (mappable). */
export const FED_PARCOURS_MAPPED = FED_PARCOURS.filter(
  (p): p is FedParcours & { lat: number; lon: number } => p.lat != null && p.lon != null,
);

/** As a GeoJSON FeatureCollection for MapLibre. */
export function fedParcoursFC(): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: FED_PARCOURS_MAPPED.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      properties: { ...p },
    })),
  };
}

export const FED_PARCOURS_ATTRIBUTION =
  "Parcours 23 : Fédération de pêche de la Creuse · Parcours 36 : Fédération de pêche de l'Indre";
