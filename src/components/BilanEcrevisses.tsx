import { useState } from "react";
import { useStore } from "../store";
import { ECREVISSES, crayfishById } from "../data/ecrevisses";
import { addTally, tallyTotal } from "../lib/ecrevisses";
import type { CrayfishSession } from "../types";

/**
 * End-of-session tally. Steppers only — big targets, one hand, wet fingers.
 * The fishable species are offered first; declaring a protected one swaps the
 * counter for the release warning, because that is the decision that matters.
 */
export function BilanEcrevisses({
  session,
  onClose,
}: {
  session: CrayfishSession;
  onClose: () => void;
}) {
  const { set, saveCrayfishSession } = useStore();
  const [tally, setTally] = useState(session.tally);
  const [note, setNote] = useState(session.note || "");
  const [showAll, setShowAll] = useState(session.tally.some((t) => !crayfishById(t.spId)?.pechable));

  const shown = showAll ? ECREVISSES : ECREVISSES.filter((e) => e.pechable);
  const countOf = (id: string) => tally.find((t) => t.spId === id)?.count ?? 0;
  const bump = (id: string, d: number) => setTally((t) => addTally(t, id, d));

  const finish = () => {
    saveCrayfishSession({
      ...session,
      tally: tally.filter((t) => t.count > 0),
      note: note.trim() || undefined,
      fin: Date.now(),
    });
    set({ screen: "carnet", tab: "carnet", stack: [] });
  };

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={onClose} aria-label="Retour à la séance">
          ‹
        </button>
        <div style={{ flex: 1 }}>
          <div className="topbar-title">Bilan de séance</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
            {session.lieu} · {session.balances.length} balance
            {session.balances.length > 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div className="pad">
        <div className="ecr-total">
          <b>{tallyTotal(tally)}</b> écrevisse{tallyTotal(tally) > 1 ? "s" : ""} au total
        </div>

        {shown.map((e) => (
          <div key={e.id} className={"ecr-sp" + (e.pechable ? "" : " protegee")}>
            <div className="ecr-sp-tx">
              <div className="n">{e.name}</div>
              <div className="l">{e.latin}</div>
              <div className="w">{e.note}</div>
            </div>
            <div className="ecr-step">
              <button onClick={() => bump(e.id, -1)} aria-label={`Une ${e.name} de moins`}>
                −
              </button>
              <span>{countOf(e.id)}</span>
              <button onClick={() => bump(e.id, 1)} aria-label={`Une ${e.name} de plus`}>
                +
              </button>
            </div>
          </div>
        ))}

        {!showAll && (
          <button className="btn-light ecr-more" onClick={() => setShowAll(true)}>
            J'ai relevé une espèce protégée
          </button>
        )}

        <div className="label" style={{ margin: "20px 0 8px" }}>
          Note
        </div>
        <textarea
          className="ecr-input"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Conditions, coin qui a donné, remarques…"
        />

        <button className="ecr-start" onClick={finish}>
          Enregistrer et clôturer
        </button>
      </div>
    </div>
  );
}
