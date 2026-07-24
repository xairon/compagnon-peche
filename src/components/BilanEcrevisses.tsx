import { useState } from "react";
import { useStore } from "../store";
import { ECREVISSES, PECHABLES, crayfishById } from "../data/ecrevisses";
import { addTally, tallyTotal } from "../lib/ecrevisses";
import type { CrayfishSession } from "../types";

/**
 * End-of-session tally. Steppers only — big targets, one hand, wet fingers.
 * The fishable species are offered first; declaring a protected one swaps the
 * counter for the release warning, because that is the decision that matters.
 *
 * Nothing is held in a local draft: every step and every keystroke is written
 * through to the session, so leaving with "‹", a reload or Android killing the
 * page can't lose a count of 40 écrevisses made with wet hands. The screen also
 * serves to CORRECT a closed session, opened from the carnet.
 */
export function BilanEcrevisses({
  session,
  onClose,
}: {
  session: CrayfishSession;
  onClose: () => void;
}) {
  const { set, updateCrayfishSession } = useStore();
  const closed = session.fin !== null;
  const tally = session.tally;
  const note = session.note ?? "";
  const [showAll, setShowAll] = useState(session.tally.some((t) => !crayfishById(t.spId)?.pechable));

  const shown = showAll ? ECREVISSES : PECHABLES;
  const countOf = (id: string) => tally.find((t) => t.spId === id)?.count ?? 0;
  // The bilan can run against a still-open session (the Terminer flow opens it
  // before `fin` is stamped), so useCrayfishAlerts is writing the SAME session
  // concurrently. Both go through updateCrayfishSession (functional, in-order
  // against current state), and stay safe only because they touch DISJOINT
  // fields: the bilan writes tally/note/fin, the alert loop writes
  // balances[].notifiedFor. Do not write balances from here, or a due-balance
  // notification landing in the same tick would clobber it (and vice-versa).
  //
  // The count > 0 filter belongs to the clôture, NOT here: a species stepped down
  // to zero must stay visible at its 0 instead of vanishing under the finger.
  const bump = (id: string, d: number) =>
    updateCrayfishSession(session.id, (s) => ({ ...s, tally: addTally(s.tally, id, d) }));
  const setNote = (v: string) => updateCrayfishSession(session.id, (s) => ({ ...s, note: v }));

  const finish = () => {
    updateCrayfishSession(session.id, (s) => ({
      ...s,
      tally: s.tally.filter((t) => t.count > 0),
      note: (s.note ?? "").trim() || undefined,
      // Re-closing an already closed session keeps its original end: correcting a
      // total must not stretch the session's duration to today.
      fin: s.fin ?? Date.now(),
    }));
    // Land on the Écrevisses segment, so the session just closed is in view.
    set({ screen: "carnet", tab: "carnet", stack: [], carnetSeg: "ecrevisses", bilanSession: null });
  };

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={onClose} aria-label={closed ? "Retour au carnet" : "Retour à la séance"}>
          ‹
        </button>
        <div style={{ flex: 1 }}>
          <div className="topbar-title">{closed ? "Corriger le bilan" : "Bilan de séance"}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
            {session.lieu} · {closed ? session.date : null}
            {closed ? " · " : null}
            {session.balances.length} balance
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
          {closed ? "Enregistrer la correction" : "Enregistrer et clôturer"}
        </button>
      </div>
    </div>
  );
}
