// Cross-screen cache of the freshest fetched fishing conditions (weather,
// moon, water) — fed by Accueil/Briefing whenever they fetch that data for
// their own display, read by CatchEditor when logging a new catch. This
// module never calls the network itself: it only remembers the latest
// reading someone else already made, in memory (for the running session) and
// in localStorage (so it survives a reload).
//
// Freshness guard: a reading older than MAX_AGE_MS is treated as ABSENT, same
// principle as lib/crue.ts's own ~3h window — a catch must never carry a
// conditions snapshot that isn't honestly "right now".

import type { CatchConditions } from "../types";

const KEY = "conditions:last";

/** A reading older than this can't honestly describe "right now" (matches the
 *  ~3h trend window lib/meteo and lib/hubeau already use for their own trends,
 *  and the same guard lib/crue.ts applies to its hydro readings). */
export const MAX_AGE_MS = 3 * 3600_000;

interface StoredConditions {
  atMs: number;
  data: CatchConditions;
}

// In-memory copy for the running session — avoids a localStorage round-trip
// on every read, and works even where localStorage is unavailable (private
// browsing, some WebViews).
let memory: StoredConditions | null = null;

function readPersisted(): StoredConditions | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.atMs !== "number" || !parsed.data) return null;
    return parsed as StoredConditions;
  } catch {
    return null; // localStorage unavailable or corrupted entry — same as "nothing cached"
  }
}

function writePersisted(entry: StoredConditions): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    /* best-effort — the in-memory cache still serves the rest of this session */
  }
}

/** Record the latest conditions reading. A FULL replacement (not a merge): a
 *  caller with fewer fields than the previous snapshot (e.g. no hydro station
 *  nearby this time) must not leave stale fields from an earlier point behind. */
export function setConditions(data: CatchConditions, now: number = Date.now()): void {
  const entry: StoredConditions = { atMs: now, data };
  memory = entry;
  writePersisted(entry);
}

/** The latest conditions reading, or null if none was ever recorded, or the
 *  one on record is stale (older than MAX_AGE_MS) or from a clock that runs
 *  behind (now < atMs) — never a false "fresh". */
export function getFreshConditions(now: number = Date.now()): CatchConditions | null {
  const entry = memory ?? readPersisted();
  if (!entry) return null;
  const age = now - entry.atMs;
  if (age < 0 || age > MAX_AGE_MS) return null;
  return entry.data;
}

/** Test-only reset of the in-memory copy (localStorage is a separate concern,
 *  callers clear it themselves when needed — see the test file). */
export function clearConditions(): void {
  memory = null;
}
