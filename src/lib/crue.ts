// Flood-rise heuristic — built from the SAME Hub'Eau hydrometry readings already
// shown in the briefing (`latestHydro` in ./hubeau), not from Vigicrues.
//
// Why not the official Vigicrues vigilance service: its public API
// (https://www.vigicrues.gouv.fr/services/v1.1/…) is reachable with no key and
// documents a vigilance colour per river section, but the actual JSON/GeoJSON
// responses carry no `Access-Control-Allow-Origin` header — only the OPTIONS
// preflight advertises CORS-looking headers (Access-Control-Allow-Methods /
// -Headers), the real GET response doesn't. A browser `fetch()` from this app's
// origin is therefore rejected by CORS before the payload is ever read. Verified
// 2026-07-25 with `curl -H "Origin: https://example.com" -L
// https://www.vigicrues.gouv.fr/services/v1.1/TerEntVigiCru.json`: 200 OK, JSON
// body, but no Access-Control-Allow-Origin on that response. Without a
// server-side proxy (this app is a static PWA, it has none), calling it directly
// from the client is not reliable — so this module does NOT call Vigicrues.
//
// Instead it reasons over data this app already fetches for the briefing: a
// fast, marked rise in water level (H) or flow (Q) over the ~3h window
// `latestHydro` computes is a usable early clue. This is deliberately NOT an
// official flood warning — it is a same-data-you-can-already-see heuristic.
// Every caller must say so and point to vigicrues.gouv.fr for the real map.

import type { HydroReading } from "./hubeau";

export type CrueLevel = "aucune" | "vigilance" | "alerte";

export interface CrueAssessment {
  level: CrueLevel;
  /** Human-readable triggered clues, e.g. "niveau +0.34 m en ~3 h". Empty when level is "aucune". */
  reasons: string[];
}

const RANK: Record<CrueLevel, number> = { aucune: 0, vigilance: 1, alerte: 2 };

/** A reading older than this can't honestly describe "right now" — showing a
 *  rise computed from a stale pair of points as a live alert is exactly the
 *  false-alarm risk this module exists to avoid. Matches the ~3h trend window
 *  latestHydro() already uses, so a reading fresh enough to trust its OWN trend
 *  is fresh enough to trust here too. */
const MAX_AGE_MS = 3 * 3600_000;

/** Level-rise thresholds over the ~3h window latestHydro() already computes.
 *  Heuristic, not calibrated per river: 30 cm/3h is a fast rise for most
 *  Centre-Val de Loire watercourses, 15 cm/3h is already worth a look. */
const H_ALERTE_M = 0.3;
const H_VIGILANCE_M = 0.15;

/** Flow is compared as a RELATIVE growth rate (delta over the level before the
 *  delta), never an absolute m³/s threshold: a +2 m³/s rise is nothing on the
 *  Loire and huge on a small brook, so only relative change is comparable
 *  across rivers of very different size. */
const Q_ALERTE_RATIO = 1.0; // flow at least doubled in ~3h
const Q_VIGILANCE_RATIO = 0.5; // flow up at least 50% in ~3h

function isFresh(date: string, now: number): boolean {
  const t = new Date(date).getTime();
  return Number.isFinite(t) && now - t <= MAX_AGE_MS && now - t >= 0;
}

function levelFromLevel(h: HydroReading | null, now: number): { level: CrueLevel; reason?: string } {
  if (!h || !isFresh(h.date, now) || h.delta <= 0) return { level: "aucune" };
  const txt = `niveau +${h.delta.toFixed(2)} m en ~3 h`;
  if (h.delta >= H_ALERTE_M) return { level: "alerte", reason: txt };
  if (h.delta >= H_VIGILANCE_M) return { level: "vigilance", reason: txt };
  return { level: "aucune" };
}

function levelFromFlow(q: HydroReading | null, now: number): { level: CrueLevel; reason?: string } {
  if (!q || !isFresh(q.date, now) || q.delta <= 0) return { level: "aucune" };
  const before = q.value - q.delta;
  if (before <= 0) return { level: "aucune" }; // can't derive a growth ratio from a zero/negative base
  const ratio = q.delta / before;
  const txt = `débit +${Math.round(ratio * 100)}% en ~3 h`;
  if (ratio >= Q_ALERTE_RATIO) return { level: "alerte", reason: txt };
  if (ratio >= Q_VIGILANCE_RATIO) return { level: "vigilance", reason: txt };
  return { level: "aucune" };
}

/** Pure decision: given the level (H) and flow (Q) readings already fetched from
 *  Hub'Eau for a station, and the current instant, is a fast rise underway and
 *  how loud should the briefing be about it? Never touches the network, never
 *  throws — takes plain data so it is testable without mocking fetch. */
export function assessCrue(h: HydroReading | null, q: HydroReading | null, now: number): CrueAssessment {
  const fromH = levelFromLevel(h, now);
  const fromQ = levelFromFlow(q, now);
  const level = RANK[fromH.level] >= RANK[fromQ.level] ? fromH.level : fromQ.level;
  const reasons = [fromH.reason, fromQ.reason].filter((r): r is string => !!r);
  return { level, reasons };
}

/** Display copy for a level — factual, never alarmist, always pointing at the
 *  official source rather than claiming its authority. Presentational text
 *  lives here (not in the component) so the wording is covered by the same
 *  tests as the decision it describes. Tone values match the app's existing
 *  `.verdict-banner.{good,warn,bad}` CSS classes (see Prise.tsx), reused as-is
 *  so this module needs no stylesheet change. */
export function crueLabel(level: CrueLevel): { title: string; tone: "good" | "warn" | "bad" } {
  if (level === "alerte") return { title: "Hausse rapide et marquée détectée", tone: "bad" };
  if (level === "vigilance") return { title: "Hausse du niveau ou du débit", tone: "warn" };
  return { title: "Rien de particulier détecté", tone: "good" };
}
