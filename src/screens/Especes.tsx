import { useStore } from "../store-hooks";
import { SPECIES } from "../data/species";
import { DEPARTEMENTS } from "../data/regulation";
import { Icon } from "../components/Icon";
import { ICONS } from "../components/icons-data";
import { Media } from "../components/Media";
import { ratingFg } from "../lib/helpers";
import { speciesStatus } from "../lib/statut";
import { matchSpecies } from "../lib/recherche";
import { effectiveMaille } from "../lib/maille";
import type { Species } from "../types";

// Web Speech API: still absent from TypeScript's DOM lib, and prefixed on WebKit.
// Only the members the voice search actually touches are declared.
interface SpeechRecognitionLike {
  lang: string;
  start: () => void;
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function speechCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

// Le statut vient de lib/statut, partagé avec l'accueil et la fiche : la
// pastille ne peut plus dire « ouverte » là où le parcours dit « vérifiez
// l'arrêté ».
const statusPill = (sp: Species) => speciesStatus(sp);

const GROUPS: [string, string][] = [
  ["tous", "Toutes"],
  ["carnassiers", "Carnassiers"],
  ["cyprinides", "Cyprinidés"],
  ["salmonides", "Salmonidés"],
  ["migrateurs", "Migrateurs"],
  ["autres", "Autres"],
];

// Deux badges au plus : le statut légal ET l'alerte sanitaire, qui ne se
// remplacent pas. Le silure, le plus bioaccumulateur du catalogue, n'affichait
// jamais « ANSES » parce que son badge « Invasive » sortait en premier.
function flags(sp: Species): { label: string; amber: boolean }[] {
  const out: { label: string; amber: boolean }[] = [];
  if (sp.protected) out.push({ label: "Protégée", amber: false });
  else if (sp.invasive) out.push({ label: "Invasive", amber: false });
  if (sp.sante?.alert) out.push({ label: "ANSES", amber: true });
  return out;
}

export function Especes() {
  const { state, set, nav, openSp } = useStore();
  const deptName = DEPARTEMENTS[state.dept].name;
  const list = SPECIES.filter(
    (sp) =>
      (state.filter === "tous" || sp.group === state.filter) &&
      matchSpecies(sp, state.q),
  );

  const micAvail = !!speechCtor();

  function startVoice() {
    try {
      const SR = speechCtor();
      if (!SR) return;
      const r = new SR();
      r.lang = "fr-FR";
      set({ listening: true });
      r.onresult = (e) => set({ q: e.results[0][0].transcript, listening: false });
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
    <main className="screen">
      <div style={{ padding: "22px 18px 0" }}>
        <h1 className="h1">Espèces</h1>
        <div className="h-sub">Eau douce · France — dépt. actif : {deptName}</div>

        <div className="search">
          <Icon d={ICONS.search} size={19} stroke="var(--muted)" width={1.6} />
          <input
            value={state.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Rechercher (sandre, brochet…)"
            aria-label="Rechercher une espèce"
          />
          {state.q.length > 0 && (
            <button className="clear" onClick={() => set({ q: "" })} aria-label="Effacer la recherche">
              ✕
            </button>
          )}
          {micAvail && (
            <button className="icon-btn" onClick={startVoice} aria-label="Recherche vocale">
              <Icon d={ICONS.mic} size={20} stroke={state.listening ? "var(--red)" : "var(--muted)"} width={1.6} />
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
                aria-pressed={active}
                style={{
                  border: `1px solid ${active ? "var(--green-dark)" : "var(--line-strong)"}`,
                  background: active ? "var(--green-dark)" : "var(--card)",
                  color: active ? "var(--paper)" : "var(--body)",
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
          const fl = flags(sp);
          return (
            <button
              key={sp.id}
              type="button"
              className="sp-card"
              onClick={() => openSp(sp.id)}
              aria-label={`Fiche ${sp.name}`}
            >
              <div className="thumb">
                <Media kind="species" id={sp.id} placeholder={sp.name} />
                {fl.length > 0 && (
                  <div className="flags">
                    {fl.map((f) => (
                      <span key={f.label} className={"flag" + (f.amber ? " amber" : "")}>
                        {f.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="sp-name">
                <span
                  className="dot"
                  style={{
                    background: sp.invasive
                      ? "var(--red)"
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
                <span className="sp-pill neutral">
                  {effectiveMaille(sp, state.dept).label ?? "Pas de maille"}
                </span>
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
    </main>
  );
}
