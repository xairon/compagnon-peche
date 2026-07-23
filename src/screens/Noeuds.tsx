import { useStore } from "../store";
import { KNOTS } from "../data/knots";
import { Icon, ICONS } from "../components/Icon";
import { Media, ALL_KNOT_MEDIA } from "../components/Media";

export function Noeuds() {
  const { nav, back } = useStore();
  const groups = [
    { label: "Nœuds", items: KNOTS.filter((k) => k.cat === "noeud") },
    { label: "Montages", items: KNOTS.filter((k) => k.cat === "montage") },
  ];

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div className="topbar-title">Nœuds &amp; montages</div>
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
                <Icon d={ICONS.knot} size={21} stroke="#4A5D52" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{k.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{k.use}</div>
                </div>
                <span style={{ color: "#C9C3B4" }}>›</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function KnotDetail() {
  const { state, back } = useStore();
  const knot = KNOTS.find((k) => k.id === state.knotId);
  if (!knot) return null;
  const hasDiagram = !!ALL_KNOT_MEDIA[knot.id];

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div>
          <div className="topbar-title">{knot.name}</div>
          <div className="h-sub">{knot.use}</div>
        </div>
      </div>
      <div style={{ padding: "10px 18px 24px" }}>
        {hasDiagram && (
          <div className="knot-diagram">
            <Media kind="knot" id={knot.id} placeholder={knot.name} />
          </div>
        )}
        {knot.steps.map((s, i) => (
          <div key={i} className="knot-step">
            <div className="num">{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div className="cap">{s}</div>
            </div>
          </div>
        ))}
        <div className="info">
          <b>Quand l'utiliser :</b> {knot.when}
        </div>
      </div>
    </div>
  );
}
