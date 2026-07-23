// GBIF occurrences (api.gbif.org) — free, no key, CORS `*`. Complements Hub'Eau
// Poisson with citizen/other records and, above all, CRAYFISH/crustaceans which
// the electrofishing dataset doesn't cover. Occurrences carry per-record licenses
// (CC-BY / CC0) — attribution shown on the map.
//
// taxonKeys resolved once via /species/match and baked here (no runtime lookups).

import { fetchT } from "./net";

const API = "https://api.gbif.org/v1";

interface Taxon {
  latin: string;
  key: number;
  crayfish?: boolean;
}

// 25 curated freshwater fish + 5 French crayfish (natives + invasives).
export const GBIF_TAXA: Taxon[] = [
  { latin: "Sander lucioperca", key: 2382155 },
  { latin: "Esox lucius", key: 2346633 },
  { latin: "Silurus glanis", key: 2337607 },
  { latin: "Lepomis gibbosus", key: 2394486 },
  { latin: "Perca fluviatilis", key: 8140485 },
  { latin: "Salmo trutta", key: 8215487 },
  { latin: "Cyprinus carpio", key: 4286975 },
  { latin: "Rutilus rutilus", key: 2359706 },
  { latin: "Barbus barbus", key: 5739539 },
  { latin: "Ameiurus melas", key: 2340977 },
  { latin: "Micropterus salmoides", key: 2394563 },
  { latin: "Abramis brama", key: 9809222 },
  { latin: "Tinca tinca", key: 2362524 },
  { latin: "Alburnus alburnus", key: 2362925 },
  { latin: "Squalius cephalus", key: 2365685 },
  { latin: "Chondrostoma nasus", key: 2360551 },
  { latin: "Gobio gobio", key: 4409628 },
  { latin: "Scardinius erythrophthalmus", key: 2362635 },
  { latin: "Thymallus thymallus", key: 5203999 },
  { latin: "Salvelinus fontinalis", key: 2351271 },
  { latin: "Oncorhynchus mykiss", key: 5204019 },
  { latin: "Anguilla anguilla", key: 5212973 },
  { latin: "Carassius carassius", key: 2366645 },
  { latin: "Leuciscus leuciscus", key: 4409641 },
  { latin: "Gymnocephalus cernuus", key: 2382126 },
  { latin: "Astacus astacus", key: 2226998, crayfish: true },
  { latin: "Austropotamobius pallipes", key: 4312658, crayfish: true },
  { latin: "Faxonius limosus", key: 8909595, crayfish: true },
  { latin: "Procambarus clarkii", key: 2227300, crayfish: true },
  { latin: "Pacifastacus leniusculus", key: 2226990, crayfish: true },
];

const CRAYFISH_KEYS = new Set(GBIF_TAXA.filter((t) => t.crayfish).map((t) => t.key));
const ALL_KEYS = GBIF_TAXA.map((t) => t.key);

export interface Occurrence {
  key: number;
  sci: string;
  crayfish: boolean;
  lat: number;
  lon: number;
  date: string; // eventDate (ISO or partial), may be empty
}

/**
 * Georeferenced occurrences in a lon/lat bbox, France, for our taxa.
 * `onlyCrayfish` restricts to crustaceans (their unique added value).
 */
export async function occurrencesInBbox(
  w: number,
  s: number,
  e: number,
  n: number,
  onlyCrayfish: boolean,
  signal?: AbortSignal,
): Promise<Occurrence[]> {
  const keys = onlyCrayfish ? [...CRAYFISH_KEYS] : ALL_KEYS;
  const tk = keys.map((k) => `&taxonKey=${k}`).join("");
  const url =
    `${API}/occurrence/search?country=FR&hasCoordinate=true` +
    `&decimalLatitude=${s.toFixed(4)},${n.toFixed(4)}` +
    `&decimalLongitude=${w.toFixed(4)},${e.toFixed(4)}` +
    tk +
    `&limit=300`;
  const r = await fetchT(url, { signal });
  if (!r.ok) throw new Error("GBIF " + r.status);
  const j = await r.json();
  const out: Occurrence[] = [];
  for (const o of j.results || []) {
    if (o.decimalLatitude == null || o.decimalLongitude == null) continue;
    out.push({
      key: o.key,
      sci: o.species || o.scientificName || "",
      crayfish: CRAYFISH_KEYS.has(o.taxonKey) || CRAYFISH_KEYS.has(o.speciesKey),
      lat: o.decimalLatitude,
      lon: o.decimalLongitude,
      date: o.eventDate || "",
    });
  }
  return out;
}
