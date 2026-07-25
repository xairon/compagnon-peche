import { useEffect, useState } from "react";
import { useStore } from "../store";
import { barStatus, currentSession, fmtDuration } from "../lib/ecrevisses";

/**
 * App-wide "session running" pill. A crayfish session outlives the screen it was
 * started from: leave it by mistake (or on purpose, to check the map) and there
 * was no way back but the toolbox. This pill sits on every navigable screen while
 * a session is open, and taps back into it.
 *
 * It carries the one number that matters at a glance — balances waiting to be
 * lifted, else the next due countdown — recomputed from absolute timestamps like
 * everything else in the module.
 *
 * `raised` lifts it clear of the offline banner, which occupies the same corner
 * and would otherwise cover it — and being offline at the water's edge is the
 * normal case here, not an edge case.
 */
export function CrayfishBar({ raised = false }: { raised?: boolean }) {
  const { state, nav } = useStore();
  const session = currentSession(state.crayfish);

  // Tick only while a session is open; the pill shows a live countdown.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    const sync = () => setNow(Date.now());
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [session]);

  if (!session) return null;

  const { due, nextSec } = barStatus(session, now);
  const label =
    due > 0
      ? `${due} à relever`
      : nextSec !== null
        ? `relève dans ${fmtDuration(nextSec)}`
        : "séance en cours";

  return (
    <button
      className={"cf-pill" + (due > 0 ? " due" : "") + (raised ? " raised" : "")}
      onClick={() => nav("ecrevisses")}
      aria-label={`Séance écrevisses en cours — ${label}. Revenir à la séance.`}
    >
      <span className="cf-pill-ic" aria-hidden="true">
        🦞
      </span>
      <span className="cf-pill-tx">{label}</span>
    </button>
  );
}
