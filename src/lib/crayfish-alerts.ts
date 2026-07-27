// App-level alerting for a crayfish session. Deliberately NOT inside the
// Écrevisses screen: between two relèves the angler looks at the map or logs a
// catch, and the alert has to survive that. Mounted once in App, this runs for
// as long as a session is open, whatever screen is displayed.
//
// It holds no clock state of its own: every second (and on every return from
// background) it recomputes from the absolute timestamps with the pure helpers,
// so it never re-renders the app just to tick.

import { useEffect, useRef } from "react";
import { useStore } from "../store-hooks";
import { notifyBalance } from "./notify";
import { requestWake, releaseWake } from "./wakelock";
import { currentSession, dueAt, dueBalances, markNotified, remainingSec } from "./ecrevisses";
import type { Balance } from "../types";

/** Key of the alert in flight — balance + the due date being alerted. */
const inFlightKey = (b: Balance) => b.id + ":" + dueAt(b);

export function useCrayfishAlerts(): void {
  const { state, updateCrayfishSession } = useStore();
  const session = currentSession(state.crayfish);
  const running = session !== null;

  // Latest session for the interval callback, without restarting the interval
  // on every save (the session object is new after each edit). Only ever READ
  // from — the mark is written back through updateCrayfishSession, which applies
  // it to the session in state, so a tick landing between an edit and the next
  // flush of this ref can't revert that edit (nor revive a deleted session).
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  });

  // `notifiedFor` is the durable de-dup, but it only lands on the next render:
  // this guards the window in between (StrictMode's double effect, a second
  // pass before the dispatch commits) so the vibration never fires twice.
  const firing = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!running) return;
    const check = () => {
      const s = sessionRef.current;
      if (!s) return;
      const now = Date.now();
      const due = dueBalances(s.balances, now).filter((b) => !firing.current.has(inFlightKey(b)));
      if (due.length === 0) return;
      for (const b of due) firing.current.add(inFlightKey(b));
      const ids = due.map((b) => b.id);
      updateCrayfishSession(s.id, (cur) => markNotified(cur, ids));
      for (const b of due) notifyBalance(b.n, b.label, -(remainingSec(b, now) as number), b.id);
    };
    check(); // a balance may already be overdue on mount
    const id = setInterval(check, 1000);
    // Catch-up path: Android froze the page, we recompute the moment it's back.
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [running, updateCrayfishSession]);

  // The wake lock follows the intent stored on the session, not a screen's
  // local state: one requestWake, one releaseWake, released when it ends.
  const wantWake = session?.wake === true;
  useEffect(() => {
    if (!wantWake) return;
    requestWake();
    return () => releaseWake();
  }, [wantWake]);
}
