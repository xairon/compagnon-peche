import { useState } from "react";
import { useStore } from "../store";
import { SPECIES } from "../data/species";
import { Icon, ICONS } from "../components/Icon";
import { Media } from "../components/Media";
import { HoldButton } from "../components/HoldButton";
import { quotaToday, norm } from "../lib/helpers";
import { season } from "../lib/season";
import { priseView, STEP_ORDER, PREV_STEP, type ActKind } from "../lib/prise";

function actStyle(kind: ActKind) {
  if (kind === "primary") return { bd: "#16281E", bg: "#16281E", fg: "#FBFAF7" };
  if (kind === "danger") return { bd: "#B33A2E", bg: "#B33A2E", fg: "#FBFAF7" };
  return { bd: "#E6E2D8", bg: "#FFFFFF", fg: "#22271F" };
}

export function Prise() {
  const { state, set, nav, addCatch } = useStore();
  const [pq, setPq] = useState("");
  const [size, setSize] = useState("");
  const qt = quotaToday(state.catches);
  const sp = SPECIES.find((s) => s.id === state.prise.sp);
  const pv = priseView(sp, state.prise.step, qt);
  const choosing = !state.prise.step;

  const nq = norm(pq);
  const found = SPECIES.filter(
    (s) => !nq || norm(s.name).includes(nq) || norm(s.latin).includes(nq),
  );
  const recentSp = state.recent.map((id) => SPECIES.find((s) => s.id === id)).filter(Boolean);
  const pick = (id: string) => set((st) => ({ prise: { ...st.prise, sp: id, step: "statut" } }));
  const ui = state.bigUI ? { fs: "17.5px", h: 66 } : { fs: "15px", h: 54 };

  // Protected/invasive/out-of-season jump straight from "statut" to kill/release,
  // skipping choix. Back must return to "statut" then — never to "garder ou relâcher".
  const shortcut = !!sp && (!!sp.protected || !!sp.invasive || !season(sp).open);
  const step = state.prise.step;
  const isShortcutStep = shortcut && (step === "kill" || step === "release");

  const setPrise = (s: typeof state.prise.step) =>
    set((st) => ({ prise: { ...st.prise, step: s } }));

  const goBack = () => {
    const prev = isShortcutStep ? "statut" : PREV_STEP[step as string];
    if (prev) setPrise(prev);
    else set((st) => ({ prise: { ...st.prise, sp: null, step: null } }));
  };

  const handleAct = (act: string) => {
    if (act === "cancel" || act === "done") {
      set({ prise: { sp: null, step: null }, screen: "especes", tab: "especes", stack: [] });
    } else if (act === "ruler") {
      nav("regle");
    } else if (act === "tocarnet" && sp) {
      addCatch(sp, true, size);
    } else if (act === "tocarnet-rel" && sp) {
      addCatch(sp, false, size);
    } else {
      setPrise(act as typeof state.prise.step);
    }
  };

  return (
    <div className="screen">
      <div style={{ padding: "22px 18px 8px" }}>
        <div className="h1">Ma prise</div>
        <div className="h-sub">Garder ou relâcher — le bon geste, tout de suite</div>
      </div>

      <div className="quota-bar">
        <Icon d="M4 6v12M8 6v12M12 6v12M16 6v12M3 16l16-9" size={18} stroke="#4A5D52" />
        <div className="txt">
          <b>Quota du jour</b> (carnet) : {qt.c} / 3 carnassiers · {qt.b} / 2 brochets
        </div>
      </div>

      {state.prise.place && (
        <div className="prise-place">
          📍 Enregistrée à&nbsp;: <b>{state.prise.place}</b>
        </div>
      )}

      {choosing && (
        <div style={{ padding: "4px 18px 24px" }}>
          <div className="search" style={{ marginTop: 6 }}>
            <Icon d={ICONS.search} size={18} stroke="var(--muted)" />
            <input
              value={pq}
              onChange={(e) => setPq(e.target.value)}
              placeholder="Quelle est ta prise ? (nom du poisson)"
              aria-label="Rechercher l'espèce"
            />
            {pq && (
              <button className="clear" onClick={() => setPq("")} aria-label="Effacer">
                ✕
              </button>
            )}
          </div>

          <button className="cta-dark" style={{ marginTop: 12 }} onClick={() => nav("identify")}>
            <Icon d={ICONS.identifyEye} size={22} stroke="#8FBFA4" width={1.5} />
            <span className="grow">
              <span className="t">Je ne connais pas l'espèce</span>
              <span className="s">Identification guidée par critères</span>
            </span>
            <span style={{ color: "#5E7A6A", fontSize: 18 }}>›</span>
          </button>

          {!pq && recentSp.length > 0 && (
            <>
              <div className="label" style={{ margin: "18px 0 8px" }}>
                Vu récemment
              </div>
              <div className="chips">
                {recentSp.map((s) => (
                  <button key={s!.id} className="chip" onClick={() => pick(s!.id)}>
                    {s!.name}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="label" style={{ margin: "18px 0 10px" }}>
            {pq ? `${found.length} résultat(s)` : "Toutes les espèces"}
          </div>
          <div className="grid2">
            {found.map((s) => (
              <button key={s.id} type="button" className="sp-card" onClick={() => pick(s.id)}>
                <div className="thumb">
                  <Media kind="species" id={s.id} placeholder={s.name} />
                </div>
                <div className="sp-name">
                  <span className="n">{s.name}</span>
                </div>
                <div className="sp-latin">{s.latin}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!choosing && pv && (
        <div style={{ padding: "4px 18px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <button className="round-btn" onClick={goBack} aria-label="Étape précédente">
              ‹
            </button>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {sp?.name}
              {!isShortcutStep && ` · étape ${STEP_ORDER[step as string] || 1} / 5`}
            </div>
            <button
              onClick={() => set((st) => ({ prise: { ...st.prise, sp: null, step: null } }))}
              style={{
                marginLeft: "auto",
                border: "none",
                background: "transparent",
                fontSize: 12.5,
                color: "var(--muted)",
                textDecoration: "underline",
              }}
            >
              Annuler
            </button>
          </div>

          {!isShortcutStep && (
            <div className="prise-steps" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={"pstep" + (n <= (STEP_ORDER[step as string] || 1) ? " on" : "")}
                />
              ))}
            </div>
          )}

          {pv.banner && (
            <div className={"verdict-banner " + (pv.tone || "")}>
              {pv.tone === "bad" && (
                <Icon d={ICONS.alert} size={22} stroke="currentColor" width={1.8} />
              )}
              <span className="vb-word">{pv.banner}</span>
            </div>
          )}

          <div className="prise-card" style={{ border: `1px solid ${pv.bd}` }}>
            <div className="prise-kicker" style={{ color: pv.kickFg }}>
              {pv.kicker}
            </div>
            <div className="prise-title" style={{ color: pv.titleFg }}>
              {pv.title}
            </div>
            {pv.paras.map((t, i) => (
              <p key={i} style={{ fontSize: 14, lineHeight: 1.55, color: "#3A3E36", margin: "10px 0 0" }}>
                {t}
              </p>
            ))}
            {pv.list.map((li) => (
              <div
                key={li.n}
                style={{ display: "flex", gap: 9, fontSize: 13.5, lineHeight: 1.5, color: "#3A3E36", marginTop: 9 }}
              >
                <span style={{ color: "#1D6E42", fontWeight: 700, flexShrink: 0 }}>{li.n}</span>
                <span>{li.t}</span>
              </div>
            ))}
            {pv.note && <div className="note" style={{ marginTop: 14 }}>{pv.note}</div>}
          </div>

          {state.prise.step === "maille" && sp && sp.maille !== "—" && (
            <div className="field" style={{ marginTop: 14 }}>
              <label>Taille mesurée (cm) — facultatif, pré-remplira le carnet</label>
              <input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                inputMode="numeric"
                placeholder={`≥ ${parseInt(sp.maille)} cm`}
              />
            </div>
          )}

          <div className="prise-actions">
            {pv.actions.map((a, i) => {
              const st = actStyle(a.kind);
              const style = {
                width: "100%",
                minHeight: ui.h,
                borderRadius: 14,
                fontSize: ui.fs,
                fontWeight: 600 as const,
                border: `1.5px solid ${st.bd}`,
                background: st.bg,
                color: st.fg,
                padding: 12,
              };
              // "Garder / mise à mort" requires a deliberate hold — no accidental gloved tap.
              if (a.act === "kill") {
                return (
                  <HoldButton key={i} style={style} onConfirm={() => handleAct(a.act)}>
                    {a.label} · maintenez
                  </HoldButton>
                );
              }
              return (
                <button key={i} onClick={() => handleAct(a.act)} style={style}>
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
