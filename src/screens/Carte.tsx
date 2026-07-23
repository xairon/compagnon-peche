import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useStore } from "../store";
import { SPECIES } from "../data/species";
import { norm, uid, isoDay } from "../lib/helpers";
import {
  stationsInBbox,
  speciesAtStation,
  binomial,
  type StationSpecies,
} from "../lib/hubeau";
import {
  fetchRivers,
  fetchWaterBodies,
  fetchObstacles,
  obstacleInfo,
  geocode,
  riverName,
  type Place,
} from "../lib/sandre";
import { fetchAccess, accessIcon, accessLabel } from "../lib/overpass";
import { Icon } from "../components/Icon";
import { occurrencesInBbox } from "../lib/gbif";
import { locate, locateMessage } from "../lib/locate";
import { BASEMAPS, rasterStyle, type BasemapId } from "../lib/basemaps";
import { PARCOURS_WMS, CATEGORIE_WMS, wmsTileUrl, geopecheUrlAt } from "../lib/parcours";
import { PARCOURS41_SNAPSHOT } from "../data/parcours41-snapshot";
import { fedParcoursFC, type FedParcours } from "../data/parcours-federation";
import { FedParcoursList } from "../components/FedParcoursList";
import { MapControls, type LayerVis } from "../components/MapControls";
import { Briefing, type BriefingTarget } from "../components/Briefing";
import type { Spot } from "../types";

const BY_LATIN = new Map(SPECIES.map((s) => [binomial(s.latin), s.id]));
const SP_NAME = new Map(SPECIES.map((s) => [s.id, s.name]));
const HYDRO_MINZOOM = 9;
const ACCESS_MINZOOM = 12;
const GBIF_MINZOOM = 10;

// HTML-escape any value interpolated into a MapLibre popup (setHTML = innerHTML).
// Popup fields come from third-party feeds (OSM/Overpass, GBIF, Sandre) that are
// publicly editable, so they must never be trusted as markup. See Popup.setHTML below.
const esc = (v: unknown): string =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

type Sheet = {
  code: string;
  name: string;
  cours: string;
  loading: boolean;
  species: StationSpecies[];
  error?: boolean;
} | null;

type SpotForm = {
  id: string | null;
  name: string;
  species: string[];
  technique: string;
  best: string;
  note: string;
  lat: number;
  lon: number;
};

function empty(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

export function Carte() {
  const { openSp, state, set, addSpot, updateSpot, removeSpot, startPrise } = useStore();
  const spots = state.spots;
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const ready = useRef(false);
  const dataAbort = useRef<AbortController | null>(null);
  const speciesAbort = useRef<AbortController | null>(null);
  const searchAbort = useRef<AbortController | null>(null);
  const placingRef = useRef(false);
  const popup = useRef<maplibregl.Popup | null>(null);

  // Latest fetched GeoJSON, kept so overlays can be re-applied after a basemap
  // switch (setStyle wipes all custom sources/layers).
  const dataRef = useRef({
    rivers: empty(),
    bodies: empty(),
    stations: empty(),
    obstacles: empty(),
    access: empty(),
    gbif: empty(),
    parcours41: empty(),
  });

  const [status, setStatus] = useState("Chargement de la carte…");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [basemap, setBasemap] = useState<BasemapId>("carto");
  const [layers, setLayers] = useState<LayerVis>({
    obstacles: false,
    access: false,
    stations: true,
    spots: true,
    gbif: false,
    parcours: false,
    categorie: false,
  });
  const [brief, setBrief] = useState<BriefingTarget | null>(null);

  // Spot creation / edition / view.
  const [placing, setPlacing] = useState(false);
  const [form, setForm] = useState<SpotForm | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  // "mine" = our fused MapLibre map; "official" = embedded Géopêche (read-only,
  // online). They cannot merge (cross-origin iframe), so they are two modes.
  const [mapMode, setMapMode] = useState<"mine" | "official">("mine");
  const [officialUrl, setOfficialUrl] = useState<string>(geopecheUrlAt());
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  // Refs mirroring state, for use inside once-registered map code.
  const layersRef = useRef(layers);
  const spotsRef = useRef(spots);
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);
  useEffect(() => {
    spotsRef.current = spots;
  }, [spots]);

  // Only one bottom panel at a time.
  const closeAllPanels = () => {
    setSheet(null);
    setViewId(null);
    setForm(null);
    setBrief(null);
    setListOpen(false);
    popup.current?.remove();
  };
  const openBriefing = (t: BriefingTarget) => {
    closeAllPanels();
    setBrief(t);
  };

  // Jump straight to the official (Géopêche) map centred on a precise point (a
  // spot, a briefed watercourse, a tapped parcours…). One-way context hand-off.
  // Declared here (before the map handlers that call it) to stay in scope.
  const openOfficialAt = (lat: number, lon: number, zoom = 15) => {
    setOfficialUrl(geopecheUrlAt(lat, lon, zoom));
    closeAllPanels();
    setLayersOpen(false);
    setMapMode("official");
  };

  const spotsFC = (): GeoJSON.FeatureCollection => ({
    type: "FeatureCollection",
    features: spotsRef.current.map((sp) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [sp.lon, sp.lat] },
      properties: { id: sp.id, name: sp.name },
    })),
  });

  // Add all custom sources + layers (idempotent). Re-run after each setStyle.
  const addOverlays = (m: maplibregl.Map) => {
    const src = (id: string, data: GeoJSON.FeatureCollection) => {
      if (!m.getSource(id)) m.addSource(id, { type: "geojson", data });
    };
    src("waterbodies", dataRef.current.bodies);
    src("rivers", dataRef.current.rivers);
    src("stations", dataRef.current.stations);
    src("obstacles", dataRef.current.obstacles);
    src("access", dataRef.current.access);
    src("gbif", dataRef.current.gbif);
    src("parcours41", dataRef.current.parcours41);
    src("fedparcours", fedParcoursFC());
    src("spots", spotsFC());

    // Open-data WMS overlays (raster; transparent outside each dept's extent, so
    // they can be added unconditionally). Added first so the vector points/lines
    // stay clickable on top. Catégorie piscicole sits below the réserves.
    for (const s of [...CATEGORIE_WMS, ...PARCOURS_WMS]) {
      if (!m.getSource(s.id)) m.addSource(s.id, { type: "raster", tiles: [wmsTileUrl(s)], tileSize: 256 });
      if (!m.getLayer(s.id))
        m.addLayer({ id: s.id, type: "raster", source: s.id, paint: { "raster-opacity": 0.8 } });
    }

    const add = (layer: maplibregl.LayerSpecification) => {
      if (!m.getLayer(layer.id)) m.addLayer(layer);
    };
    add({
      id: "waterbodies-fill",
      type: "fill",
      source: "waterbodies",
      paint: { "fill-color": "#5b8fb0", "fill-opacity": 0.35, "fill-outline-color": "#356789" },
    });
    add({
      id: "rivers-line",
      type: "line",
      source: "rivers",
      paint: { "line-color": "#2b6c8f", "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1, 14, 3.5] },
    });
    // Loir-et-Cher parcours & reserves (Pilote41, clickable). Reserves under parcours.
    add({
      id: "reserve41-line",
      type: "line",
      source: "parcours41",
      filter: ["==", ["get", "kind"], "reserve"],
      paint: {
        "line-color": "#B33A2E",
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 15, 5],
        "line-dasharray": [1.5, 1.5],
      },
    });
    add({
      id: "parcours41-line",
      type: "line",
      source: "parcours41",
      filter: ["==", ["get", "kind"], "parcours"],
      paint: {
        "line-color": "#1D6E42",
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3, 15, 6],
        "line-opacity": 0.85,
      },
    });
    // Federation-published parcours for depts without open GIS (23, 36). Solid pin
    // for exact/geocoded coordinates, amber pin for commune-approximate ones.
    add({
      id: "fedparcours-circle",
      type: "circle",
      source: "fedparcours",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 5, 13, 8],
        "circle-color": ["match", ["get", "precision"], "commune", "#C99A2E", "#1D6E42"],
        "circle-opacity": ["match", ["get", "precision"], "commune", 0.5, 0.9],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
    add({
      id: "stations-circle",
      type: "circle",
      source: "stations",
      paint: { "circle-radius": 6, "circle-color": "#16281e", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 },
    });
    add({
      id: "obstacles-circle",
      type: "circle",
      source: "obstacles",
      paint: { "circle-radius": 6, "circle-color": "#B33A2E", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 },
    });
    add({
      id: "access-circle",
      type: "circle",
      source: "access",
      paint: { "circle-radius": 6, "circle-color": "#2f6fb0", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 },
    });
    // GBIF occurrences: crayfish stand out in red, fish in purple (their added value).
    add({
      id: "gbif-circle",
      type: "circle",
      source: "gbif",
      paint: {
        "circle-radius": ["case", ["get", "crayfish"], 6, 4.5],
        "circle-color": ["case", ["get", "crayfish"], "#C2410C", "#7A4FBF"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
        "circle-opacity": 0.9,
      },
    });
    add({
      id: "spots-halo",
      type: "circle",
      source: "spots",
      paint: { "circle-radius": 13, "circle-color": "#E08A1E", "circle-opacity": 0.22 },
    });
    add({
      id: "spots-circle",
      type: "circle",
      source: "spots",
      paint: { "circle-radius": 8, "circle-color": "#E08A1E", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.5 },
    });
    applyVisibility(m);
  };

  const applyVisibility = (m: maplibregl.Map) => {
    const L = layersRef.current;
    const vis = (id: string, on: boolean) => {
      if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    };
    vis("stations-circle", L.stations);
    vis("obstacles-circle", L.obstacles);
    vis("access-circle", L.access);
    vis("gbif-circle", L.gbif);
    vis("spots-halo", L.spots);
    vis("spots-circle", L.spots);
    for (const s of PARCOURS_WMS) vis(s.id, L.parcours);
    for (const s of CATEGORIE_WMS) vis(s.id, L.categorie);
    vis("parcours41-line", L.parcours);
    vis("reserve41-line", L.parcours);
    vis("fedparcours-circle", L.parcours);
  };

  // ---- Data for the current view ----
  const loadData = async () => {
    const m = map.current;
    if (!m || !ready.current) return;
    // Cancel any still-in-flight load first, so a fast zoom-out (which early-returns
    // below) can't let a previous zoomed-in fetch resolve and repaint stale data.
    dataAbort.current?.abort();
    if (m.getZoom() < HYDRO_MINZOOM) {
      dataRef.current = { ...dataRef.current, rivers: empty(), bodies: empty(), stations: empty(), obstacles: empty(), access: empty(), gbif: empty(), parcours41: empty() };
      applyData(m);
      setStatus("Zoomez pour afficher le réseau hydrographique.");
      return;
    }
    const b = m.getBounds();
    const [w, s, e, n] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    dataAbort.current = new AbortController();
    const signal = dataAbort.current.signal;
    const L = layersRef.current;
    setStatus("Chargement des données…");
    try {
      const [rivers, bodies, stations, obstacles, access, gbif] = await Promise.all([
        fetchRivers(w, s, e, n, signal).catch(() => empty()),
        fetchWaterBodies(w, s, e, n, signal).catch(() => empty()),
        stationsInBbox(w, s, e, n, signal).catch(() => []),
        L.obstacles ? fetchObstacles(w, s, e, n, signal).catch(() => empty()) : Promise.resolve(empty()),
        L.access && m.getZoom() >= ACCESS_MINZOOM
          ? fetchAccess(w, s, e, n, signal).catch(() => [])
          : Promise.resolve([]),
        L.gbif && m.getZoom() >= GBIF_MINZOOM
          ? occurrencesInBbox(w, s, e, n, false, signal).catch(() => [])
          : Promise.resolve([]),
      ]);
      if (signal.aborted) return; // a newer view superseded this one — don't write stale data
      // Loir-et-Cher parcours/reserves: bundled offline snapshot (Pilote41), no fetch.
      dataRef.current.parcours41 = L.parcours ? PARCOURS41_SNAPSHOT : empty();
      dataRef.current.rivers = rivers as GeoJSON.FeatureCollection;
      dataRef.current.bodies = bodies as GeoJSON.FeatureCollection;
      dataRef.current.stations = {
        type: "FeatureCollection",
        features: stations.map((st) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [st.lon, st.lat] },
          properties: { code: st.code, nom: st.nom, cours: st.cours },
        })),
      };
      dataRef.current.obstacles = obstacles as GeoJSON.FeatureCollection;
      dataRef.current.access = {
        type: "FeatureCollection",
        features: (access as Awaited<ReturnType<typeof fetchAccess>>).map((a) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [a.lon, a.lat] },
          properties: { kind: a.kind, name: a.name },
        })),
      };
      dataRef.current.gbif = {
        type: "FeatureCollection",
        features: (gbif as Awaited<ReturnType<typeof occurrencesInBbox>>).map((o) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [o.lon, o.lat] },
          properties: { sci: o.sci, crayfish: o.crayfish, date: o.date },
        })),
      };
      applyData(m);
      const bits = [
        `${rivers.features.length} cours d'eau`,
        `${bodies.features.length} plan(s) d'eau`,
        `${stations.length} station(s)`,
      ];
      if (L.obstacles) bits.push(`${obstacles.features.length} obstacle(s)`);
      if (L.access) bits.push(`${(access as unknown[]).length} accès`);
      if (L.gbif) {
        const g = (gbif as unknown[]).length;
        bits.push(g >= 300 ? "300+ obs. GBIF (échantillon)" : `${g} obs. GBIF`);
      }
      setStatus(bits.join(" · "));
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setStatus("Connexion requise pour la carte (données en ligne).");
    }
  };

  // Push dataRef + spots into the live sources.
  const applyData = (m: maplibregl.Map) => {
    const set2 = (id: string, data: GeoJSON.FeatureCollection) =>
      (m.getSource(id) as maplibregl.GeoJSONSource | undefined)?.setData(data);
    set2("rivers", dataRef.current.rivers);
    set2("waterbodies", dataRef.current.bodies);
    set2("stations", dataRef.current.stations);
    set2("obstacles", dataRef.current.obstacles);
    set2("access", dataRef.current.access);
    set2("gbif", dataRef.current.gbif);
    set2("parcours41", dataRef.current.parcours41);
    set2("spots", spotsFC());
  };

  const openStation = async (code: string, nom: string, cours: string) => {
    closeAllPanels();
    setSheet({ code, name: nom, cours, loading: true, species: [] });
    speciesAbort.current?.abort();
    speciesAbort.current = new AbortController();
    try {
      const species = await speciesAtStation(code, speciesAbort.current.signal);
      setSheet({ code, name: nom, cours, loading: false, species });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setSheet({ code, name: nom, cours, loading: false, species: [], error: true });
    }
  };

  const registerHandlers = (m: maplibregl.Map) => {
    const pointer = (layer: string) => {
      m.on("mouseenter", layer, () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", layer, () => (m.getCanvas().style.cursor = ""));
    };
    ["rivers-line", "waterbodies-fill", "stations-circle", "obstacles-circle", "access-circle", "gbif-circle", "spots-circle", "parcours41-line", "reserve41-line", "fedparcours-circle"].forEach(
      pointer,
    );

    // Popup builder: the info HTML (MapLibre setHTML, as before) plus a
    // tap-through button — built with safe DOM methods — that opens the official
    // (Géopêche) map centred on the tapped point. Same one-way hand-off.
    const officialPopup = (lngLat: maplibregl.LngLat, html: string) => {
      popup.current?.setLngLat(lngLat).setHTML(html).addTo(m);
      const content = popup.current?.getElement()?.querySelector(".maplibregl-popup-content");
      if (!content) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "popup-official";
      btn.textContent = "🗺️ Voir sur la carte officielle";
      btn.addEventListener("click", () => openOfficialAt(lngLat.lat, lngLat.lng));
      content.appendChild(btn);
    };

    // Parcours (Pilote41) — show the real regulation on tap.
    m.on("click", "parcours41-line", (ev) => {
      if (placingRef.current) return;
      const p = ev.features?.[0]?.properties as Record<string, string> | undefined;
      if (!p) return;
      const bits = [p.type, p.categ, p.rive].filter(Boolean).map(esc).join(" · ");
      const nuit = p.nuit === "oui" ? '<br><b style="color:#1D6E42">🌙 Pêche de nuit autorisée</b>' : "";
      const acces = p.acces ? `<br><span style="color:#6b7168">Accès : ${esc(p.acces)}</span>` : "";
      officialPopup(
        ev.lngLat,
        `<b>${esc(p.nom)}</b>${bits ? "<br>" + bits : ""}${nuit}${acces}<br><span style="color:var(--muted);font-size:11px">Source : Pilote41 / Fédération 41</span>`,
      );
    });
    m.on("click", "reserve41-line", (ev) => {
      if (placingRef.current) return;
      const p = ev.features?.[0]?.properties as Record<string, string> | undefined;
      if (!p) return;
      const lim = [p.amont, p.aval].filter(Boolean).map(esc).join(" → ");
      officialPopup(
        ev.lngLat,
        `<b style="color:#B33A2E">⛔ ${esc(p.nom)}</b>${lim ? "<br>" + lim : ""}<br><span style="color:var(--muted);font-size:11px">Pêche interdite · Pilote41 / Féd. 41</span>`,
      );
    });

    // Federation-published parcours (Creuse 23, Indre 36). Honest about precision.
    const FED_KIND: Record<string, string> = {
      "no-kill": "Parcours no-kill",
      reserve: "Réserve de pêche",
      "carpe-nuit": "Carpe de nuit",
      parcours: "Parcours",
      "plan-eau": "Plan d'eau",
    };
    m.on("click", "fedparcours-circle", (ev) => {
      if (placingRef.current) return;
      const p = ev.features?.[0]?.properties as (FedParcours & Record<string, unknown>) | undefined;
      if (!p) return;
      const kind = FED_KIND[String(p.kind)] || "Parcours";
      const bits = [
        p.river,
        p.commune,
        p.category ? `${p.category}ᵉ cat.` : "",
        p.lengthM ? `${p.lengthM} m` : "",
        p.posts ? `${p.posts} postes` : "",
      ]
        .filter(Boolean)
        .map(esc)
        .join(" · ");
      const tech = p.techniques ? `<br>${esc(p.techniques)}` : "";
      const note = p.note ? `<br><span style="color:#6b675c">${esc(p.note)}</span>` : "";
      const approx =
        p.precision === "commune"
          ? `<br><b style="color:#b06e14">⚠️ Emplacement approximatif (commune, pas le parcours exact)</b>`
          : "";
      const src =
        typeof p.source === "string" && /^https?:\/\//.test(p.source)
          ? `<br><a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer" style="color:#1D6E42;font-size:11px">Source : fédération de pêche ↗</a>`
          : "";
      officialPopup(
        ev.lngLat,
        `<b>${esc(p.name)}</b> <span style="color:#6b675c;font-size:11px">${esc(kind)}</span>${bits ? "<br>" + bits : ""}${tech}${note}${approx}${src}`,
      );
    });

    // Tap a watercourse / water body → open the conditions briefing there.
    m.on("click", "rivers-line", (ev) => {
      if (placingRef.current) return;
      const f = ev.features?.[0];
      openBriefing({ lat: ev.lngLat.lat, lon: ev.lngLat.lng, title: riverName((f?.properties || {}) as Record<string, unknown>), subtitle: "Cours d'eau" });
    });
    m.on("click", "waterbodies-fill", (ev) => {
      if (placingRef.current) return;
      const f = ev.features?.[0];
      const name = String((f?.properties as Record<string, unknown>)?.NomEntiteHydrographique || "Plan d'eau");
      openBriefing({ lat: ev.lngLat.lat, lon: ev.lngLat.lng, title: name, subtitle: "Plan d'eau" });
    });

    m.on("click", "stations-circle", (ev) => {
      if (placingRef.current) return;
      const p = ev.features?.[0]?.properties as { code: string; nom: string; cours: string };
      if (p) openStation(p.code, p.nom, p.cours);
    });

    m.on("click", "obstacles-circle", (ev) => {
      if (placingRef.current) return;
      const p = ev.features?.[0]?.properties as Record<string, unknown>;
      if (!p) return;
      const o = obstacleInfo(p);
      popup.current
        ?.setLngLat(ev.lngLat)
        .setHTML(
          `<b>${esc(o.name)}</b><br>${esc(o.type)}${o.height ? " · " + esc(o.height) : ""}<br>${o.pass ? "Passe : " + esc(o.pass) : "Pas de passe à poissons"}`,
        )
        .addTo(m);
    });

    m.on("click", "access-circle", (ev) => {
      if (placingRef.current) return;
      const p = ev.features?.[0]?.properties as { kind: string; name: string };
      if (!p) return;
      popup.current
        ?.setLngLat(ev.lngLat)
        .setHTML(`<b>${accessIcon(p.kind as never)} ${esc(p.name)}</b><br>${accessLabel(p.kind as never)}`)
        .addTo(m);
    });

    m.on("click", "gbif-circle", (ev) => {
      if (placingRef.current) return;
      const p = ev.features?.[0]?.properties as { sci: string; crayfish: boolean; date: string };
      if (!p) return;
      const d = p.date ? String(p.date).slice(0, 10) : "date inconnue";
      popup.current
        ?.setLngLat(ev.lngLat)
        .setHTML(`<b>${p.crayfish ? "🦞 " : "🐟 "}${esc(p.sci)}</b><br>Observé le ${esc(d)}<br><span style="color:var(--muted)">Source : GBIF.org</span>`)
        .addTo(m);
    });

    m.on("click", "spots-circle", (ev) => {
      if (placingRef.current) return;
      const p = ev.features?.[0]?.properties as { id: string };
      if (p) {
        closeAllPanels();
        setViewId(p.id);
      }
    });

    // Placing mode: the next tap anywhere drops the new spot.
    m.on("click", (ev) => {
      if (!placingRef.current) return;
      placingRef.current = false;
      setPlacing(false);
      setForm({ id: null, name: "", species: [], technique: "", best: "", note: "", lat: ev.lngLat.lat, lon: ev.lngLat.lng });
    });
  };

  useEffect(() => {
    if (!mapRef.current || map.current) return;
    let moveTimer: ReturnType<typeof setTimeout> | undefined;
    const m = new maplibregl.Map({
      container: mapRef.current,
      style: BASEMAPS.carto.style as string,
      center: [1.4, 47.35],
      zoom: 9,
      attributionControl: false,
    });
    map.current = m;
    popup.current = new maplibregl.Popup({ closeButton: false, offset: 8 });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
    m.addControl(
      new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }),
      "top-left",
    );
    m.addControl(
      new maplibregl.AttributionControl({ compact: true, customAttribution: "Sandre · Hub'Eau/OFB · IGN · OSM · Open-Meteo · GBIF.org · Pilote41 (41) · Féd. pêche 23/36" }),
      "bottom-right",
    );
    m.on("error", () => setStatus("Fond de carte indisponible (hors-ligne ?)."));

    m.on("load", () => {
      addOverlays(m);
      registerHandlers(m);
      ready.current = true;
      setMapReady(true);
      m.on("moveend", () => {
        clearTimeout(moveTimer);
        moveTimer = setTimeout(loadData, 450);
      });
      loadData();
    });

    return () => {
      clearTimeout(moveTimer);
      dataAbort.current?.abort();
      speciesAbort.current?.abort();
      searchAbort.current?.abort();
      m.remove();
      map.current = null;
      ready.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Basemap switch: replace the style, then re-add overlays + data.
  const applyBasemap = (id: BasemapId) => {
    const m = map.current;
    if (!m || id === basemap) return;
    setBasemap(id);
    const b = BASEMAPS[id];
    m.setStyle((b.style ? b.style : rasterStyle(b)) as maplibregl.StyleSpecification);
    m.once("styledata", () => {
      addOverlays(m);
      applyData(m);
    });
  };

  const toggleLayer = (k: keyof LayerVis) => {
    // Compute + apply outside the setState updater: updaters must be pure (they
    // run twice under StrictMode, which would double-fire loadData()).
    const next = { ...layersRef.current, [k]: !layersRef.current[k] };
    layersRef.current = next;
    setLayers(next);
    const m = map.current;
    if (!m) return;
    applyVisibility(m);
    // Turning on a layer whose data is fetched per-view (no data yet) → fetch.
    // Includes "parcours" (Pilote41 vectors), else it stays empty until a pan.
    if (next[k] && (k === "obstacles" || k === "access" || k === "gbif" || k === "parcours")) loadData();
  };

  // Keep the spots layer in sync.
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    (m.getSource("spots") as maplibregl.GeoJSONSource | undefined)?.setData(spotsFC());
  }, [spots, mapReady]);

  // Deep-link from the Carnet: fly to a spot and open its sheet.
  useEffect(() => {
    if (!mapReady || !state.focusSpot) return;
    const sp = spots.find((s) => s.id === state.focusSpot);
    if (sp) {
      map.current?.flyTo({ center: [sp.lon, sp.lat], zoom: 14 });
      closeAllPanels();
      setViewId(sp.id);
      set({ focusSpot: null });
    } else if (state.hydrated) {
      // Spots are fully loaded and the target still isn't there → drop the stale
      // deep-link. If they haven't hydrated yet, keep it so this effect retries
      // once loadSpots() resolves (otherwise the fly-to is silently lost).
      set({ focusSpot: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.focusSpot, mapReady, spots, state.hydrated]);

  // ---- Place search (IGN geocoder) ----
  // Remember the label we just picked, so writing it into the input doesn't
  // immediately re-geocode and re-open the results dropdown over the map.
  const pickedLabel = useRef<string | null>(null);
  useEffect(() => {
    if (q.trim().length < 3) {
      setResults([]);
      return;
    }
    if (pickedLabel.current === q) {
      pickedLabel.current = null;
      return;
    }
    const t = setTimeout(() => {
      searchAbort.current?.abort();
      searchAbort.current = new AbortController();
      geocode(q.trim(), searchAbort.current.signal).then(setResults).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const goTo = (p: Place) => {
    pickedLabel.current = p.label;
    setResults([]);
    setQ(p.label);
    map.current?.flyTo({ center: [p.lon, p.lat], zoom: 12 });
  };

  // ---- Spot flow ----
  const startPlacing = () => {
    closeAllPanels();
    placingRef.current = true;
    setPlacing(true);
    setStatus("Touchez la carte à l'endroit de votre spot.");
  };
  const cancelPlacing = () => {
    placingRef.current = false;
    setPlacing(false);
    loadData();
  };
  const useGps = () => {
    setStatus("Localisation en cours…");
    locate()
      .then(({ lat, lon }) => {
        placingRef.current = false;
        setPlacing(false);
        map.current?.flyTo({ center: [lon, lat], zoom: 14 });
        setForm({ id: null, name: "", species: [], technique: "", best: "", note: "", lat, lon });
      })
      .catch((err) => setStatus(locateMessage(err)));
  };
  // v2: recenter the map on the user (no spot form).
  const recenter = () => {
    setStatus("Localisation en cours…");
    locate()
      .then(({ lat, lon }) => map.current?.flyTo({ center: [lon, lat], zoom: 13 }))
      .catch((err) => setStatus(locateMessage(err)));
  };
  const saveSpot = () => {
    if (!form) return;
    const name = form.name.trim() || "Spot sans nom";
    const fields = {
      name,
      species: form.species,
      technique: form.technique.trim(),
      best: form.best.trim(),
      note: form.note.trim(),
    };
    if (form.id) updateSpot(form.id, fields);
    else addSpot({ id: uid("s"), lat: form.lat, lon: form.lon, created: isoDay(), ...fields });
    setForm(null);
    loadData();
  };
  const editSpot = (sp: Spot) => {
    setViewId(null);
    setForm({ id: sp.id, name: sp.name, species: sp.species, technique: sp.technique, best: sp.best, note: sp.note, lat: sp.lat, lon: sp.lon });
  };

  // One-way context hand-off: switching to "official" centres Géopêche on the
  // current MapLibre view. The reverse is impossible (sealed cross-origin frame).
  const switchMode = (mode: "mine" | "official") => {
    if (mode === mapMode) return;
    if (mode === "official") {
      const c = map.current?.getCenter();
      setOfficialUrl(geopecheUrlAt(c?.lat, c?.lng, map.current?.getZoom()));
      closeAllPanels();
      setLayersOpen(false);
    }
    setMapMode(mode);
    // The map div was display:none while hidden → let it re-measure on return.
    if (mode === "mine") requestAnimationFrame(() => map.current?.resize());
  };


  // Track connectivity so the official (online-only) mode can degrade gracefully.
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const viewedSpot = viewId ? spots.find((s) => s.id === viewId) || null : null;

  return (
    <div className="carte-screen">
      <div className="pf-seg carte-modeseg">
        <button className={mapMode === "mine" ? "on" : ""} onClick={() => switchMode("mine")}>
          Ma carte
        </button>
        <button className={mapMode === "official" ? "on" : ""} onClick={() => switchMode("official")}>
          Officielle
        </button>
      </div>
      <div className="carte-mode-cap">
        {mapMode === "mine"
          ? "Conditions, eau & vos spots — hors-ligne"
          : "Parcours & réglementation (FNPF) — national, en ligne"}
      </div>

      {mapMode === "mine" && (
      <div className="carte-searchrow">
        <div className="carte-search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Lieu, rivière, plan d'eau…"
            aria-label="Rechercher un lieu"
          />
          {q && (
            <button className="clear" onClick={() => setQ("")} aria-label="Effacer">
              ✕
            </button>
          )}
          {results.length > 0 && (
            <div className="carte-results">
              {results.map((p, i) => (
                <button key={i} onClick={() => goTo(p)}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="carte-gps-btn" onClick={recenter} aria-label="Ma position">
          <Icon d="M12 2v3M12 19v3M2 12h3M19 12h3M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10z" size={20} stroke="#fbfaf7" width={1.6} />
        </button>
      </div>
      )}

      <div ref={mapRef} className="carte-map" style={mapMode === "official" ? { display: "none" } : undefined} />

      {mapMode === "official" && (
        <div className="carte-official">
          <div className="official-banner">
            <span>🎣 Carte officielle des fédérations (FNPF · Géopêche) — en ligne, lecture seule.</span>
            <a href={officialUrl} target="_blank" rel="noopener noreferrer">
              Plein écran ↗
            </a>
          </div>
          {online ? (
            <iframe
              key={officialUrl}
              src={officialUrl}
              title="Carte officielle Géopêche (FNPF)"
              className="official-frame"
              referrerPolicy="no-referrer"
              // Sandbox a third-party origin we don't control: allow the map to run
              // but withhold allow-top-navigation so it can't frame-bust the app.
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          ) : (
            <div className="official-offline">
              <p>Connexion requise pour afficher la carte officielle Géopêche.</p>
              <button onClick={() => window.open(officialUrl, "_blank", "noopener")}>
                Ouvrir dans le navigateur
              </button>
            </div>
          )}
        </div>
      )}

      {mapMode === "mine" && (
        <>
      <MapControls
        basemap={basemap}
        onBasemap={applyBasemap}
        layers={layers}
        onToggle={toggleLayer}
        onGeopeche={() => switchMode("official")}
        onList={() => {
          setLayersOpen(false);
          closeAllPanels();
          setListOpen(true);
        }}
        onOpenChange={setLayersOpen}
      />

      {placing ? (
        <div className="carte-placing">
          <span>Touchez la carte pour placer votre spot</span>
          <button onClick={useGps}>📍 Ma position</button>
          <button className="ghost" onClick={cancelPlacing}>
            Annuler
          </button>
        </div>
      ) : (
        !form &&
        !viewedSpot &&
        !brief &&
        !sheet &&
        !layersOpen && (
          <button className="carte-spot-btn" onClick={startPlacing}>
            <span className="pin">📍</span> Ajouter un spot
          </button>
        )
      )}

      <div className="carte-legend" aria-live="polite">
        {status}
        {spots.length > 0 && <span className="legend-spots"> · {spots.length} spot(s) perso</span>}
      </div>

      {/* Conditions briefing */}
      {brief && (
        <Briefing
          key={`${brief.lat},${brief.lon}`}
          target={brief}
          onClose={() => setBrief(null)}
          onOfficial={() => openOfficialAt(brief.lat, brief.lon)}
        />
      )}

      {/* Hub'Eau station sheet */}
      {sheet && (
        <div className="carte-sheet">
          <div className="sheet-head">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sheet-title">{sheet.name}</div>
              {sheet.cours && <div className="sheet-sub">{sheet.cours}</div>}
              {sheet.code && (
                <div className="sheet-code">
                  Station {sheet.code} ·{" "}
                  <a
                    href={`https://hubeau.eaufrance.fr/api/v1/etat_piscicole/observations?code_station=${encodeURIComponent(sheet.code)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    relevés Hub'Eau
                  </a>
                </div>
              )}
            </div>
            <button
              className="sheet-x"
              onClick={() => {
                speciesAbort.current?.abort();
                setSheet(null);
              }}
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
          <div className="sheet-body">
            {sheet.loading && <div className="sheet-note">Chargement des espèces…</div>}
            {sheet.error && <div className="sheet-note">Impossible de charger les espèces (réseau).</div>}
            {!sheet.loading && !sheet.error && sheet.species.length === 0 && (
              <div className="sheet-note">Aucune espèce recensée sur cette station.</div>
            )}
            {sheet.species.map((sp) => {
              const id = BY_LATIN.get(binomial(sp.latin));
              return (
                <button key={sp.latin || sp.fr} className="sheet-sp" disabled={!id} onClick={() => id && openSp(id)}>
                  <span className="sp-n">{sp.fr}</span>
                  <span className="sp-eff">{sp.effectif}</span>
                  {id && <span className="sp-go">›</span>}
                </button>
              );
            })}
            <div className="sheet-src">
              Espèces réellement inventoriées (pêches scientifiques) — Hub'Eau, API Poisson (OFB / ASPE).
              Effectifs cumulés sur toutes les campagnes de la station, pas par pêche.
            </div>
          </div>
        </div>
      )}

      {viewedSpot && (
        <SpotDetail
          spot={viewedSpot}
          onEdit={editSpot}
          onDelete={removeSpot}
          onClose={() => setViewId(null)}
          onSpecies={openSp}
          onFish={(place) => startPrise(place)}
          onBriefing={(sp) => openBriefing({ lat: sp.lat, lon: sp.lon, title: sp.name, subtitle: "Mon spot" })}
          onGo={(la, lo) => map.current?.flyTo({ center: [lo, la], zoom: 15 })}
          onOfficial={(la, lo) => openOfficialAt(la, lo)}
        />
      )}

      {form && <SpotFormPanel form={form} setForm={setForm} onSave={saveSpot} onCancel={() => setForm(null)} />}

      {listOpen && (
        <FedParcoursList
          onClose={() => setListOpen(false)}
          onGo={(la, lo, approx) => {
            setListOpen(false);
            map.current?.flyTo({ center: [lo, la], zoom: approx ? 11.5 : 13.5 });
          }}
        />
      )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SpotDetail(props: {
  spot: Spot;
  onEdit: (s: Spot) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onSpecies: (id: string) => void;
  onFish: (place: string) => void;
  onBriefing: (s: Spot) => void;
  onGo: (lat: number, lon: number) => void;
  onOfficial: (lat: number, lon: number) => void;
}) {
  const { spot, onEdit, onDelete, onClose, onSpecies, onFish, onBriefing, onGo, onOfficial } = props;
  const [arm, setArm] = useState(false);
  return (
    <div className="carte-sheet spot-sheet">
      <div className="sheet-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sheet-title">📍 {spot.name}</div>
          <button className="sheet-sub link" onClick={() => onGo(spot.lat, spot.lon)}>
            {spot.lat.toFixed(5)}, {spot.lon.toFixed(5)} · centrer
          </button>
        </div>
        <button className="sheet-x" onClick={onClose} aria-label="Fermer">
          ✕
        </button>
      </div>
      <div className="sheet-body">
        {spot.species.length > 0 && (
          <div className="spot-block">
            <div className="spot-lbl">Espèces</div>
            <div className="chips">
              {spot.species.map((id) => (
                <button key={id} className="chip" onClick={() => onSpecies(id)}>
                  {SP_NAME.get(id) || id}
                </button>
              ))}
            </div>
          </div>
        )}
        {spot.technique && (
          <div className="spot-block">
            <div className="spot-lbl">Technique / leurre / appât</div>
            <div className="spot-val">{spot.technique}</div>
          </div>
        )}
        {spot.best && (
          <div className="spot-block">
            <div className="spot-lbl">Meilleur moment</div>
            <div className="spot-val">{spot.best}</div>
          </div>
        )}
        {spot.note && (
          <div className="spot-block">
            <div className="spot-lbl">Note</div>
            <div className="spot-val">{spot.note}</div>
          </div>
        )}
        {!spot.species.length && !spot.technique && !spot.best && !spot.note && (
          <div className="sheet-note">Aucune info ajoutée. « Modifier » pour compléter.</div>
        )}

        <div className="spot-actions" style={{ marginTop: 16 }}>
          <button className="btn-light" onClick={() => onBriefing(spot)}>
            📊 Conditions ici
          </button>
          <button className="save-btn" style={{ marginTop: 0, flex: 1.2 }} onClick={() => onFish(spot.name)}>
            🎣 Je pêche ici
          </button>
        </div>

        <button className="official-jump" onClick={() => onOfficial(spot.lat, spot.lon)}>
          🗺️ Voir ce spot sur la carte officielle (parcours, réserves)
        </button>

        <div className="spot-actions">
          <button className="btn-light" onClick={() => onEdit(spot)}>
            Modifier
          </button>
          {arm ? (
            <button className="btn-danger" onClick={() => onDelete(spot.id)}>
              Confirmer la suppression
            </button>
          ) : (
            <button className="btn-danger-ghost" onClick={() => setArm(true)}>
              Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function SpotFormPanel(props: {
  form: SpotForm;
  setForm: (f: SpotForm) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { form, setForm, onSave, onCancel } = props;
  const [spq, setSpq] = useState("");
  const nq = norm(spq);
  const matches = nq
    ? SPECIES.filter(
        (s) => !form.species.includes(s.id) && (norm(s.name).includes(nq) || norm(s.latin).includes(nq)),
      ).slice(0, 12)
    : [];
  const toggleSp = (id: string) =>
    setForm({
      ...form,
      species: form.species.includes(id) ? form.species.filter((x) => x !== id) : [...form.species, id],
    });

  return (
    <div className="carte-sheet spot-form">
      <div className="sheet-head">
        <div className="sheet-title">{form.id ? "Modifier le spot" : "Nouveau spot"}</div>
        <button className="sheet-x" onClick={onCancel} aria-label="Fermer">
          ✕
        </button>
      </div>
      <div className="sheet-body">
        <div className="field">
          <label>Nom du spot *</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Le coude sous le pont, la fosse aux sandres…"
            autoFocus
          />
        </div>

        <div className="field">
          <label>Espèces vues / prises ici</label>
          {form.species.length > 0 && (
            <div className="chips" style={{ marginBottom: 8 }}>
              {form.species.map((id) => (
                <button key={id} className="chip chip-on" onClick={() => toggleSp(id)}>
                  {SP_NAME.get(id) || id} ✕
                </button>
              ))}
            </div>
          )}
          <input value={spq} onChange={(e) => setSpq(e.target.value)} placeholder="Ajouter une espèce…" />
          {matches.length > 0 && (
            <div className="chips" style={{ marginTop: 8 }}>
              {matches.map((s) => (
                <button
                  key={s.id}
                  className="chip"
                  onClick={() => {
                    toggleSp(s.id);
                    setSpq("");
                  }}
                >
                  + {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <label>Technique / leurre / appât</label>
          <input
            value={form.technique}
            onChange={(e) => setForm({ ...form, technique: e.target.value })}
            placeholder="Leurre souple 10 cm au ras du fond, dérive lente…"
          />
        </div>

        <div className="field">
          <label>Meilleur moment</label>
          <input
            value={form.best}
            onChange={(e) => setForm({ ...form, best: e.target.value })}
            placeholder="Aube en été, après une crue, coup du soir…"
          />
        </div>

        <div className="field">
          <label>Note (accès, coin précis…)</label>
          <textarea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            rows={2}
            placeholder="Se garer au lavoir, longer la berge 200 m vers l'amont."
          />
        </div>

        <div className="spot-actions">
          <button className="btn-light" onClick={onCancel}>
            Annuler
          </button>
          <button className="save-btn" style={{ marginTop: 0, flex: 1 }} onClick={onSave}>
            {form.id ? "Enregistrer" : "Créer le spot"}
          </button>
        </div>
      </div>
    </div>
  );
}
