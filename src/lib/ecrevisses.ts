// Crayfish session logic — pure, clock-free. Every function takes `now` as a
// parameter and returns new objects: a balance's state is RECOMPUTED from its
// absolute drop timestamp, never decremented. That is what makes a session
// survive the app being backgrounded, frozen or killed by Android, and what
// makes all of this testable in milliseconds.

import type { Balance, CrayfishSession, CrayfishTally } from "../types";
import { uid, isoDay, frDate } from "./helpers";

/** National rule: 6 balances per angler, up to 10 in some départements. A session
 *  starts with one and the angler adds nets as they drop them, up to this cap. */
export const MAX_BALANCES = 10;
export const DEFAULT_INTERVAL_MIN = 20;
/** Past this, a still-open session is treated as forgotten (banner, no auto-close). */
export const STALE_SESSION_MS = 12 * 3600_000;

export type BalanceState = "vide" | "trempe" | "echue";

/** Absolute due timestamp, or null when the balance isn't in the water. */
export function dueAt(b: Balance): number | null {
  return b.poseeA === null ? null : b.poseeA + b.intervalMin * 60_000;
}

export function balanceState(b: Balance, now: number): BalanceState {
  const d = dueAt(b);
  if (d === null) return "vide";
  return now >= d ? "echue" : "trempe";
}

/** Seconds left (positive) or overdue (negative). null when not dropped. */
export function remainingSec(b: Balance, now: number): number | null {
  const d = dueAt(b);
  if (d === null) return null;
  return Math.round((d - now) / 1000);
}

/** m:ss, or h:mm:ss past the hour. Sign-agnostic — the caller words the delay. */
export function fmtDuration(sec: number): string {
  const s = Math.abs(Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** A whole session's elapsed time — deliberately NOT shaped like a countdown, so
 *  "3 h 24" can never be read as "3:24:07 left". */
export function fmtElapsed(sec: number): string {
  const s = Math.abs(Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")}`;
  return `${m} min`;
}

/** Balances that came due and haven't been notified for THIS due date yet.
 *  The mark lives on the balance (`notifiedFor`), so it persists: a remount, a
 *  navigation or a reload never replays an alert the angler already got, and a
 *  balance dropped again becomes notifiable anew (its due date moved). */
export function dueBalances(balances: Balance[], now: number): Balance[] {
  return balances.filter((b) => balanceState(b, now) === "echue" && b.notifiedFor !== dueAt(b));
}

/** Stamp the current due date on the given balances — "these have been alerted". */
export function markNotified(s: CrayfishSession, ids: string[]): CrayfishSession {
  return mapBalances(s, (b) =>
    ids.includes(b.id) ? { ...b, notifiedFor: dueAt(b) ?? undefined } : b,
  );
}

/** Remember whether the angler asked for the screen to stay on. */
export function setWake(s: CrayfishSession, on: boolean): CrayfishSession {
  return { ...s, wake: on };
}

/** Add a session, enforcing the "one open session at a time" invariant: while
 *  one is still running, a new one is refused rather than shadowing it (a second
 *  open session would be unreachable through currentSession, hence unclosable). */
export function addSession(sessions: CrayfishSession[], s: CrayfishSession): CrayfishSession[] {
  if (currentSession(sessions)) return sessions;
  return [s, ...sessions];
}

/** Last instant we can PROVE the angler touched this session: its most recent
 *  balance drop, or, if none was ever dropped, its start. Never a made-up now. */
export function lastActivity(s: CrayfishSession): number {
  return s.balances.reduce((last, b) => (b.poseeA !== null && b.poseeA > last ? b.poseeA : last), s.debut);
}

/** Bring a list back to the "one open session at a time" invariant, whatever the
 *  route it took to get here (addSession guards creation, this guards the merge of
 *  the hydrated list with what's already in state). The most recently started open
 *  session stays open — it is the one the angler is looking at; every other one is
 *  closed on its last known activity. Nothing is deleted, no timestamp is invented:
 *  a shadowed session would otherwise stay "en cours" forever, unreachable through
 *  currentSession() and thus impossible to close or to give a bilan. */
export function reconcileSessions(sessions: CrayfishSession[]): CrayfishSession[] {
  const open = sessions.filter((s) => s.fin === null);
  if (open.length <= 1) return sessions;
  const keep = open.reduce((a, b) => (b.debut > a.debut ? b : a));
  return sessions.map((s) =>
    s.fin === null && s.id !== keep.id ? { ...s, fin: lastActivity(s) } : s,
  );
}

/** Display order: overdue first (longest overdue on top), then soaking (closest
 *  to due first), then empty ones by number. Never mutates the input. */
export function sortBalances(balances: Balance[], now: number): Balance[] {
  const rank: Record<BalanceState, number> = { echue: 0, trempe: 1, vide: 2 };
  return [...balances].sort((a, b) => {
    const ra = rank[balanceState(a, now)];
    const rb = rank[balanceState(b, now)];
    if (ra !== rb) return ra - rb;
    const sa = remainingSec(a, now);
    const sb = remainingSec(b, now);
    if (sa === null || sb === null) return a.n - b.n;
    return sa - sb;
  });
}

/** The soonest balance still soaking, or null. */
export function nextDue(balances: Balance[], now: number): { balance: Balance; inSec: number } | null {
  let best: { balance: Balance; inSec: number } | null = null;
  for (const b of balances) {
    if (balanceState(b, now) !== "trempe") continue;
    const inSec = remainingSec(b, now) as number;
    if (!best || inSec < best.inSec) best = { balance: b, inSec };
  }
  return best;
}

/** What the app-wide "session running" pill needs to say, at a given instant:
 *  how many balances are waiting to be lifted, and how long until the next one
 *  comes due. Pure — the pill just formats this. */
export function barStatus(
  session: CrayfishSession | null,
  now: number,
): { due: number; nextSec: number | null } {
  if (!session) return { due: 0, nextSec: null };
  const due = session.balances.filter((b) => balanceState(b, now) === "echue").length;
  return { due, nextSec: nextDue(session.balances, now)?.inSec ?? null };
}

export function makeBalances(count: number, intervalMin: number): Balance[] {
  const n = Math.max(1, Math.min(MAX_BALANCES, Math.floor(count) || 1));
  return Array.from({ length: n }, (_, i) => ({
    id: uid("b"),
    n: i + 1,
    intervalMin,
    poseeA: null,
    releves: 0,
  }));
}

export function createSession(opts: {
  count: number;
  intervalMin: number;
  lieu: string;
  spotId?: string;
  now: number;
}): CrayfishSession {
  const d = new Date(opts.now);
  return {
    id: uid("cs"),
    iso: isoDay(d),
    date: frDate(d),
    debut: opts.now,
    fin: null,
    lieu: opts.lieu,
    spotId: opts.spotId,
    intervalMin: opts.intervalMin,
    balances: makeBalances(opts.count, opts.intervalMin),
    tally: [],
  };
}

function mapBalances(
  s: CrayfishSession,
  fn: (b: Balance) => Balance,
): CrayfishSession {
  return { ...s, balances: s.balances.map(fn) };
}

export function poseBalance(s: CrayfishSession, id: string, now: number): CrayfishSession {
  return mapBalances(s, (b) => (b.id === id ? { ...b, poseeA: now } : b));
}

/** Drop every balance still out of the water — the "je lance la batterie" button. */
export function poseAll(s: CrayfishSession, now: number): CrayfishSession {
  return mapBalances(s, (b) => (b.poseeA === null ? { ...b, poseeA: now } : b));
}

/** Lift a balance. By default it goes straight back in the water (one gesture). */
export function releveBalance(
  s: CrayfishSession,
  id: string,
  now: number,
  repose = true,
): CrayfishSession {
  return mapBalances(s, (b) =>
    b.id === id ? { ...b, poseeA: repose ? now : null, releves: b.releves + 1 } : b,
  );
}

export function updateBalance(
  s: CrayfishSession,
  id: string,
  patch: Partial<Balance>,
): CrayfishSession {
  return mapBalances(s, (b) => (b.id === id ? { ...b, ...patch } : b));
}

/** Remove a balance and renumber the rest so the displayed numbers stay 1…N.
 *  Refuses to remove the last one: a session without balances is a state nextDue,
 *  sortBalances and the header were never meant to describe. */
export function removeBalance(s: CrayfishSession, id: string): CrayfishSession {
  if (s.balances.length <= 1) return s;
  const kept = s.balances.filter((b) => b.id !== id);
  return { ...s, balances: kept.map((b, i) => ({ ...b, n: i + 1 })) };
}

/** Add an empty balance, refusing to exceed the regulatory cap. */
export function addBalance(s: CrayfishSession): CrayfishSession {
  if (s.balances.length >= MAX_BALANCES) return s;
  const b: Balance = {
    id: uid("b"),
    n: s.balances.length + 1,
    intervalMin: s.intervalMin,
    poseeA: null,
    releves: 0,
  };
  return { ...s, balances: [...s.balances, b] };
}

/** Add `delta` to a species' count, creating the row on first use. Never negative. */
export function addTally(tally: CrayfishTally[], spId: string, delta: number): CrayfishTally[] {
  const found = tally.some((t) => t.spId === spId);
  if (!found) return [...tally, { spId, count: Math.max(0, delta) }];
  return tally.map((t) => (t.spId === spId ? { ...t, count: Math.max(0, t.count + delta) } : t));
}

export function tallyTotal(tally: CrayfishTally[]): number {
  return tally.reduce((sum, t) => sum + t.count, 0);
}

export function currentSession(sessions: CrayfishSession[]): CrayfishSession | null {
  return sessions.find((s) => s.fin === null) ?? null;
}

/** A session left open for more than 12 h: the UI offers to close it, and never
 *  closes it on its own — that would silently lose the bilan. */
export function isStaleSession(s: CrayfishSession, now: number): boolean {
  return s.fin === null && now - s.debut > STALE_SESSION_MS;
}
