import { useStore } from "../store-hooks";
import { KNOTS } from "../data/knots";
import { Icon } from "../components/Icon";
import { ICONS } from "../components/icons-data";
import "./noeuds.css";

export function Noeuds() {
  const { nav, back } = useStore();
  const groups = [
    { label: "Nœuds", items: KNOTS.filter((k) => k.cat === "noeud") },
    { label: "Montages", items: KNOTS.filter((k) => k.cat === "montage") },
  ];

  return (
    <main className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <h1 className="topbar-title">Nœuds &amp; montages</h1>
      </div>
      <div style={{ padding: "6px 18px 24px" }}>
        {groups.map((g) => (
          <div key={g.label}>
            <div className="label" style={{ margin: "14px 0 8px" }}>
              {g.label}
            </div>
            {g.items.map((k) => (
              <button
                key={k.id}
                type="button"
                className="tile"
                onClick={() => nav("knot", { knotId: k.id })}
              >
                <Icon d={ICONS.knot} size={21} stroke="var(--icon-muted)" />
                <div className="grow-1">
                  <div className="noeud-tuile-nom">{k.name}</div>
                  <div className="noeud-tuile-usage">{k.use}</div>
                </div>
                <span className="noeud-chevron">›</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
