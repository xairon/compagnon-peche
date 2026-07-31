import { useStore } from "../store-hooks";
import { KNOTS } from "../data/knots";
import { Icon } from "../components/Icon";
import { ICONS } from "../components/icons-data";
import { Media } from "../components/Media";
import { ALL_KNOT_MEDIA } from "../components/media-helpers";
import { ALL_KNOT_STEP_MEDIA } from "../data/knot-diagrams";

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
                <Icon d={ICONS.knot} size={21} stroke="#4A5D52" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{k.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{k.use}</div>
                </div>
                <span style={{ color: "#95907f" }}>›</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

export function KnotDetail() {
  const { state, back } = useStore();
  const knot = KNOTS.find((k) => k.id === state.knotId);
  if (!knot) return null;
  const stepMedia = ALL_KNOT_STEP_MEDIA[knot.id];
  // Repli : une fiche sans séquence par étape garde son ancien schéma unique,
  // s'il existe (les 7 fiches d'origine avant upgrade).
  const hasLegacyDiagram = !stepMedia && !!ALL_KNOT_MEDIA[knot.id];

  return (
    <main className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div>
          <h1 className="topbar-title">{knot.name}</h1>
          <div className="h-sub">{knot.use}</div>
        </div>
      </div>
      <div style={{ padding: "10px 18px 24px" }}>
        {hasLegacyDiagram && (
          <div className="knot-diagram">
            <Media kind="knot" id={knot.id} placeholder={knot.name} />
          </div>
        )}
        {knot.steps.map((s, i) => {
          const media = stepMedia?.[i];
          return (
            <div key={i} className="knot-step">
              <div className="num">{i + 1}</div>
              <div style={{ flex: 1 }}>
                {media && (
                  <img
                    className="knot-step-img"
                    src={import.meta.env.BASE_URL + media.file}
                    alt={`${knot.name} — étape ${i + 1}`}
                    loading="lazy"
                  />
                )}
                <div className="cap">{s}</div>
              </div>
            </div>
          );
        })}
        <div className="info">
          <b>Quand l'utiliser :</b> {knot.when}
        </div>
      </div>
    </main>
  );
}
