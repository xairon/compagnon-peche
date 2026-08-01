import { useStore } from "../store-hooks";
import { KNOTS } from "../data/knots";
import { Icon } from "../components/Icon";
import { ICONS } from "../components/icons-data";
import { ALL_KNOT_MEDIA } from "../components/media-helpers";
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
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{k.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{k.use}</div>
                </div>
                <span style={{ color: "var(--chev-ink)" }}>›</span>
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
  // Une illustration, ou rien. Les fiches que ni Commons ni un schéma maison
  // propre ne couvrent (wacky, anglaise, feeder) n'affichent aucun cadre : un
  // cadre vide se lirait comme une image cassée, et leur texte se suffit.
  const media = ALL_KNOT_MEDIA[knot.id];

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
        {media && (
          <div className="knot-illus">
            <img
              src={import.meta.env.BASE_URL + media.file}
              alt={`${knot.name} — ${knot.use}`}
              decoding="async"
            />
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
    </main>
  );
}
