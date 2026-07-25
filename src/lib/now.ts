import { useEffect, useState } from "react";

/**
 * A clock the render can read purely.
 *
 * Several screens computed freshness with `Date.now()` in the middle of render
 * — impure, and worse, silently frozen: the briefing memoised its flood check
 * on the fetched reading, so a page left open kept re-using the staleness
 * verdict from the moment of the fetch. Reading this hook instead makes the
 * value part of React's state, so it re-renders when it actually changes.
 *
 * Default cadence is a minute: every consumer here judges ages in hours or
 * days, so ticking faster would only cost renders.
 */
export function useNow(everyMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    // A phone that was asleep can come back hours later without a tick having
    // fired — recompute the moment the page is visible again.
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [everyMs]);
  return now;
}

/** Whether a dated reading is older than `maxAgeMs` at `now`. Pure, so the
 *  staleness rule itself is testable without waiting or mocking a clock. */
export function isStale(date: string | number | undefined | null, now: number, maxAgeMs: number): boolean {
  if (date === undefined || date === null || date === "") return false;
  const t = typeof date === "number" ? date : new Date(date).getTime();
  if (!Number.isFinite(t)) return false;
  return now - t > maxAgeMs;
}
