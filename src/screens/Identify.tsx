import { useStore } from "../store";
import { Media } from "../components/Media";
import type { Species } from "../types";
import { candidates, nextQuestions, answerLabel, IDENTIFIER_COVERAGE } from "../lib/identify";

export function Identify() {
  const { state, set, back, openSp } = useStore();
  const a = state.ans;
  const cands = candidates(a);
  const questions = nextQuestions(a, cands);
  const chips = Object.entries(a);
  const narrowed = chips.length > 0;
  const few = narrowed && cands.length <= 6;

  const setAns = (k: string, v: string) => set((s) => ({ ans: { ...s.ans, [k]: v } }));
  const removeAns = (k: string) =>
    set((s) => {
      const n = { ...s.ans };
      delete n[k];
      return { ans: n };
    });
  const reset = () => set({ ans: {} });

  const gallery = (title: string, emphatic: boolean) => (
    <>
      <div className="id-res-h">
        <span>{title}</span>
        <span className="n">{cands.length}</span>
      </div>
      <div className={"id-grid" + (emphatic ? " emphatic" : "")}>
        {cands.map((sp) => (
          <CandCard key={sp.id} sp={sp} onOpen={() => openSp(sp.id)} />
        ))}
      </div>
    </>
  );

  return (
    <div className="screen id-screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div style={{ flex: 1 }}>
          <div className="topbar-title">Identifier ma prise</div>
          <div className="h-sub">
            {cands.length} espèce{cands.length > 1 ? "s" : ""} possible{cands.length > 1 ? "s" : ""}
            {!narrowed && ` · ${IDENTIFIER_COVERAGE} au catalogue`}
          </div>
        </div>
        {narrowed && (
          <button className="id-reset" onClick={reset}>
            Recommencer
          </button>
        )}
      </div>

      <div className="pad" style={{ paddingTop: 8 }}>
        {!narrowed && (
          <div className="id-intro">
            Répondez uniquement à ce que vous voyez sur le poisson. Les questions s'adaptent à chaque
            choix — impossible de tomber sur une combinaison qui n'existe pas.
          </div>
        )}

        {narrowed && (
          <div className="id-chips">
            {chips.map(([k, v]) => (
              <button key={k} className="id-chip" onClick={() => removeAns(k)}>
                {answerLabel(k, v)} <span className="x">✕</span>
              </button>
            ))}
          </div>
        )}

        {/* When we're down to a handful, surface them first. */}
        {few && gallery("Espèces probables", true)}

        {questions.map((q) => (
          <div key={q.key} className="id-q">
            <div className="id-q-h">
              <span className="t">{q.title}</span>
              {q.hint && <span className="s">{q.hint}</span>}
            </div>
            <div className="id-opts">
              {q.options.map((o) => (
                <button key={o.val} className="id-opt" onClick={() => setAns(q.key, o.val)}>
                  {o.icon && (
                    <svg className="ic" viewBox="0 0 44 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                      <path d={o.icon} />
                    </svg>
                  )}
                  <span className="tx">
                    <span className="l">{o.label}</span>
                    {o.sub && <span className="sub">{o.sub}</span>}
                  </span>
                  <span className="cnt">{o.count}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {questions.length === 0 && !few && (
          <div className="id-done">
            Plus aucun critère ne départage ces espèces — comparez les photos ci-dessous.
          </div>
        )}

        {/* Full list at the bottom unless already shown emphatically above. */}
        {!few && gallery(narrowed ? "Espèces possibles" : "Toutes les espèces", false)}

        <div className="id-foot">
          Identification par critères morphologiques documentés (silhouette, barbillons, nageoire
          adipeuse, bouche, dorsale, taille). {IDENTIFIER_COVERAGE} espèces couvertes.
        </div>
      </div>
    </div>
  );
}

function CandCard({ sp, onOpen }: { sp: Species; onOpen: () => void }) {
  return (
    <button type="button" className="id-cand" onClick={onOpen} aria-label={`Fiche ${sp.name}`}>
      <div className="id-cand-img">
        <Media kind="species" id={sp.id} placeholder={sp.name} />
      </div>
      <div className="id-cand-cap">
        <div className="n">{sp.name}</div>
        <div className="lt">{sp.latin}</div>
      </div>
    </button>
  );
}
