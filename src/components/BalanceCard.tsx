import type { Balance } from "../types";
import { balanceState, remainingSec, fmtDuration } from "../lib/ecrevisses";

/**
 * One balance in the session grid.
 *
 * Tap semantics are deliberate: an empty balance drops on a single tap, an
 * overdue one is lifted-and-redropped in the same gesture, but a SOAKING one
 * only expands — a stray tap must never silently reset a running countdown.
 */
export function BalanceCard({
  b,
  now,
  expanded,
  onToggle,
  onPose,
  onReleve,
  onOptions,
}: {
  b: Balance;
  now: number;
  expanded: boolean;
  onToggle: () => void;
  onPose: () => void;
  onReleve: () => void;
  onOptions: () => void;
}) {
  const st = balanceState(b, now);
  const rem = remainingSec(b, now);

  const main = st === "vide" ? "Poser" : fmtDuration(rem as number);
  const sub =
    st === "vide"
      ? "pas à l'eau"
      : st === "echue"
        ? "de retard — à relever"
        : "avant relève";

  return (
    <div className={"bal-card bal-" + st}>
      <button
        className="bal-main"
        onClick={st === "vide" ? onPose : st === "echue" ? onReleve : onToggle}
        aria-label={
          st === "vide"
            ? `Poser la balance ${b.n}`
            : st === "echue"
              ? `Relever la balance ${b.n}`
              : `Balance ${b.n}, ${fmtDuration(rem as number)} avant relève`
        }
      >
        <div className="bal-head">
          <span className="bal-n">{b.n}</span>
          {b.label && <span className="bal-lbl">{b.label}</span>}
          {b.releves > 0 && <span className="bal-rel">{b.releves} relève{b.releves > 1 ? "s" : ""}</span>}
        </div>
        <div className="bal-time">{main}</div>
        <div className="bal-sub">{sub}</div>
      </button>

      {expanded && st === "trempe" && (
        <div className="bal-actions">
          <button className="btn-light" onClick={onReleve}>
            Relever maintenant
          </button>
          <button className="btn-light" onClick={onOptions}>
            Options
          </button>
        </div>
      )}

      {st !== "trempe" && (
        <button className="bal-opt" onClick={onOptions} aria-label={`Options de la balance ${b.n}`}>
          ⋯
        </button>
      )}
    </div>
  );
}
