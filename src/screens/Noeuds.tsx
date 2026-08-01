import { useState } from "react";
import { useStore } from "../store-hooks";
import { KNOTS } from "../data/knots";
import { BESOINS } from "../data/besoins";
import type { BesoinId } from "../types";
import { ALL_KNOT_MEDIA } from "../components/media-helpers";
import { Icon } from "../components/Icon";
import { ICONS } from "../components/icons-data";
import "./noeuds.css";

export function Noeuds() {
  const { nav, back } = useStore();
  // Filtre local : il n'a pas à survivre à la navigation. Le filtre des espèces
  // est dans le store parce qu'on y revient en boucle depuis une fiche ; ici on
  // ouvre un nœud et on repart.
  const [besoin, setBesoin] = useState<BesoinId | null>(null);

  const visibles = besoin ? KNOTS.filter((k) => k.besoins.includes(besoin)) : KNOTS;
  const groups = [
    { label: "Nœuds", items: visibles.filter((k) => k.cat === "noeud") },
    { label: "Montages", items: visibles.filter((k) => k.cat === "montage") },
  ].filter((g) => g.items.length > 0);

  return (
    <main className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <h1 className="topbar-title">Nœuds &amp; montages</h1>
      </div>

      <div className="chips noeud-filtres">
        {BESOINS.map((b) => (
          <button
            key={b.id}
            type="button"
            className={"chip" + (besoin === b.id ? " chip-on" : "")}
            aria-pressed={besoin === b.id}
            onClick={() => setBesoin(besoin === b.id ? null : b.id)}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="noeud-corps">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="label noeud-label">{g.label}</div>
            {g.items.map((k) => {
              const media = ALL_KNOT_MEDIA[k.id];
              return (
                <button
                  key={k.id}
                  type="button"
                  className="tile"
                  data-testid="tuile-noeud"
                  onClick={() => nav("knot", { knotId: k.id })}
                >
                  {media ? (
                    // `alt=""` délibéré : le nom du nœud est dans le même bouton,
                    // une alternative textuelle le répéterait à chaque tuile.
                    <img
                      className="noeud-vignette"
                      src={import.meta.env.BASE_URL + media.file}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="noeud-vignette noeud-vignette-vide">
                      <Icon d={ICONS.knot} size={21} stroke="var(--icon-muted)" />
                    </span>
                  )}
                  <div className="grow-1">
                    <div className="noeud-tuile-nom">{k.name}</div>
                    <div className="noeud-tuile-usage">{k.use}</div>
                  </div>
                  <span className="noeud-chevron">›</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </main>
  );
}
