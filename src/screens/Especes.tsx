import { useStore } from "../store";
import { SPECIES } from "../data/species";
import { DEPARTEMENTS } from "../data/regulation";
import { Icon, ICONS } from "../components/Icon";
import { Media } from "../components/Media";
import { norm, ratingFg } from "../lib/helpers";
import { season } from "../lib/season";
import type { Species } from "../types";

function statusPill(sp: Species): { label: string; cls: string } {
  if (sp.protected || sp.invasive) return { label: "À relâcher", cls: "bad" };
  if (!season(sp).open) return { label: "● Fermée", cls: "bad" };
  return { label: "● Ouverte", cls: "good" };
}

const GROUPS: [string, string][] = [
  ["tous", "Toutes"],
  ["carnassiers", "Carnassiers"],
  ["cyprinides", "Cyprinidés"],
  ["salmonides", "Salmonidés"],
  ["migrateurs", "Migrateurs"],
  ["autres", "Autres"],
];

function flag(sp: Species): { label: string; amber: boolean } | null {
  if (sp.protected) return { label: "Protégée", amber: false };
  if (sp.invasive) return { label: "Invasive", amber: false };
  if (sp.sante?.alert) return { label: "ANSES", amber: true };
  return null;
}

export function Especes() {
  const { state, set, nav, openSp } = useStore();
  const deptName = DEPARTEMENTS[state.dept].name;
  const nq = norm(state.q);
  const list = SPECIES.filter(
    (sp) =>
      (state.filter === "tous" || sp.group === state.filter) &&
      (!nq || norm(sp.name).includes(nq) || norm(sp.latin).includes(nq)),
  );

  const micAvail =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  function startVoice() {
    try {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) return;
      const r = new SR();
      r.lang = "fr-FR";
      set({ listening: true });
      r.onresult = (e: any) => set({ q: e.results[0][0].transcript, listening: false });
      r.onend = () => set({ listening: false });
      r.onerror = () => set({ listening: false });
      r.start();
    } catch {
      set({ listening: false });
    }
  }

  const recentSp = state.recent
    .map((id) => SPECIES.find((s) => s.id === id))
    .filter(Boolean) as Species[];

  return (
    <div className="screen">
      <div style={{ padding: "22px 18px 0" }}>
        <div className="h1">Espèces</div>
        <div className="h-sub">Eau douce · France — dépt. actif : {deptName}</div>

        <div className="search">
          <Icon d={ICONS.search} size={19} stroke="var(--muted)" width={1.6} />
          <input
            value={state.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Rechercher (sandre, brochet…)"
          />
          {state.q.length > 0 && (
            <button className="clear" onClick={() => set({ q: "" })} aria-label="Effacer la recherche">
              ✕
            </button>
          )}
          {micAvail && (
            <button className="icon-btn" onClick={startVoice} aria-label="Recherche vocale">
              <Icon d={ICONS.mic} size={20} stroke={state.listening ? "#B33A2E" : "var(--muted)"} width={1.6} />
            </button>
          )}
        </div>

        <button className="cta-dark" style={{ marginTop: 12 }} onClick={() => nav("identify")}>
          <Icon d={ICONS.identifyEye} size={22} stroke="#8FBFA4" width={1.5} />
          <span className="grow">
            <span className="t">Identifier ma prise</span>
            <span className="s">Je ne connais pas l'espèce — assistant par critères</span>
          </span>
          <span style={{ color: "#5E7A6A", fontSize: 18 }}>›</span>
        </button>

        {recentSp.length > 0 && (
          <div style={{ marginTop: 15 }}>
            <div className="label" style={{ marginBottom: 7 }}>
              Vu récemment
            </div>
            <div className="chips">
              {recentSp.map((sp) => (
                <button
                  key={sp.id}
                  className="chip"
                  style={{ fontWeight: 550 }}
                  onClick={() => openSp(sp.id)}
                >
                  {sp.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="chips" style={{ margin: "16px -18px 0", padding: "0 18px 4px" }}>
          {GROUPS.map(([id, label]) => {
            const active = state.filter === id;
            return (
              <button
                key={id}
                className="chip"
                style={{
                  border: `1px solid ${active ? "#16281E" : "#E6E2D8"}`,
                  background: active ? "#16281E" : "#FFFFFF",
                  color: active ? "#FBFAF7" : "#3A3E36",
                }}
                onClick={() => set({ filter: id })}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid2" style={{ padding: "16px 18px 24px" }}>
        {list.map((sp) => {
          const fl = flag(sp);
          return (
            <button
              key={sp.id}
              type="button"
              className="sp-card"
              onClick={() => openSp(sp.id)}
              aria-label={`Fiche ${sp.name}`}
            >
              <div className="thumb">
                <Media kind="species" id={sp.id} placeholder={`Photo ${sp.name}`} />
                {fl && <span className={"flag" + (fl.amber ? " amber" : "")}>{fl.label}</span>}
              </div>
              <div className="sp-name">
                <span
                  className="dot"
                  style={{
                    background: sp.invasive
                      ? "#B33A2E"
                      : sp.ratingCls
                        ? ratingFg(sp.ratingCls)
                        : "#C2BEB2",
                  }}
                />
                <span className="n">{sp.name}</span>
              </div>
              <div className="sp-latin">{sp.latin}</div>
              <div className="sp-status">
                {(() => {
                  const st = statusPill(sp);
                  return <span className={"sp-pill " + st.cls}>{st.label}</span>;
                })()}
                <span className="sp-pill neutral">{sp.maille !== "—" ? sp.maille : "Pas de maille"}</span>
              </div>
            </button>
          );
        })}
      </div>

      {list.length === 0 && (
        <div style={{ padding: "10px 18px 30px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          Aucune espèce ne correspond à « {state.q} ».
          <br />
          Essayez l'
          <button className="link-inline" onClick={() => nav("identify")}>
            identification guidée
          </button>
          .
        </div>
      )}
    </div>
  );
}
