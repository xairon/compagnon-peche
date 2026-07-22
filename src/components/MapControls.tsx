import { useState } from "react";
import { BASEMAPS, type BasemapId } from "../lib/basemaps";

export interface LayerVis {
  obstacles: boolean;
  access: boolean;
  stations: boolean;
  spots: boolean;
  gbif: boolean;
  parcours: boolean;
  categorie: boolean;
}

type LayerDef = { key: keyof LayerVis; icon: string; label: string };

// Our map's own value — what Géopêche does NOT provide: live conditions, fish
// data, obstacles, access, personal spots. Offline & real-time.
const CONDITION_LAYERS: LayerDef[] = [
  { key: "stations", icon: "🐟", label: "Stations poisson (Hub'Eau)" },
  { key: "gbif", icon: "🔬", label: "Observations & écrevisses (GBIF)" },
  { key: "obstacles", icon: "🚧", label: "Obstacles (barrages)" },
  { key: "access", icon: "🅿️", label: "Accès (parking, mise à l'eau)" },
  { key: "spots", icon: "📍", label: "Mes spots" },
];

// Regulation domain — Géopêche's territory. We only carry an OFFLINE subset for
// the user's region (41 Pilote41 · 23/36 fédérations); the "Officielle" mode is
// the full national atlas. Kept clearly separate to avoid duplicating it.
const PARCOURS_LAYERS: LayerDef[] = [
  { key: "parcours", icon: "🎣", label: "Réserves & parcours (41 · 23 · 36)" },
  { key: "categorie", icon: "🗺️", label: "Catégorie piscicole 1ʳᵉ/2ᵉ" },
];

const BASE_IDS: BasemapId[] = ["carto", "satellite", "plan"];

export function MapControls({
  basemap,
  onBasemap,
  layers,
  onToggle,
  onGeopeche,
  onList,
  onOpenChange,
}: {
  basemap: BasemapId;
  onBasemap: (id: BasemapId) => void;
  layers: LayerVis;
  onToggle: (k: keyof LayerVis) => void;
  onGeopeche: () => void;
  onList: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    onOpenChange?.(next);
  };
  return (
    <div className={"map-controls" + (open ? " open" : "")}>
      <button className="mc-toggle" onClick={toggle} aria-expanded={open}>
        {open ? "✕" : "⧉"} <span>Calques</span>
      </button>
      {open && (
        <div className="mc-panel">
          <div className="mc-label">Fond de carte</div>
          <div className="mc-basemaps">
            {BASE_IDS.map((id) => (
              <button
                key={id}
                className={"mc-base" + (basemap === id ? " on" : "")}
                onClick={() => onBasemap(id)}
              >
                {BASEMAPS[id].label}
              </button>
            ))}
          </div>
          <div className="mc-label" style={{ marginTop: 12 }}>
            Conditions &amp; repérage
          </div>
          <div className="mc-layers">
            {CONDITION_LAYERS.map((l) => (
              <button
                key={l.key}
                className={"mc-layer" + (layers[l.key] ? " on" : "")}
                onClick={() => onToggle(l.key)}
                role="switch"
                aria-checked={layers[l.key]}
              >
                <span className="mc-dot" /> {l.icon} {l.label}
              </button>
            ))}
          </div>

          <div className="mc-group-sep" />
          <div className="mc-label">Parcours &amp; réglementation</div>
          <div className="mc-sublabel">
            Domaine de la carte officielle. Ici, un aperçu hors-ligne de votre région.
          </div>
          <div className="mc-layers">
            {PARCOURS_LAYERS.map((l) => (
              <button
                key={l.key}
                className={"mc-layer" + (layers[l.key] ? " on" : "")}
                onClick={() => onToggle(l.key)}
                role="switch"
                aria-checked={layers[l.key]}
              >
                <span className="mc-dot" /> {l.icon} {l.label}
              </button>
            ))}
          </div>
          <button type="button" className="mc-list" onClick={onList}>
            📋 Liste des parcours (Creuse &amp; Indre)
          </button>
          <button type="button" className="mc-geopeche" onClick={onGeopeche}>
            🗺️ Couverture nationale → Officielle <span className="ext">↗</span>
          </button>
          <div className="mc-note">
            Affichés hors-ligne sur cette carte : Loir-et-Cher (41, Pilote41) et les parcours publiés
            par les fédérations de la Creuse (23) et de l'Indre (36). Pour <b>tous</b> les parcours de
            France (no-kill, réserves, dates, tailles), à jour, basculez sur l'onglet «&nbsp;Officielle&nbsp;».
          </div>
        </div>
      )}
    </div>
  );
}
