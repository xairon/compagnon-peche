// Vintage of the regulatory snapshot.
//
// Sizes, quotas and departmental notes in regulation.ts are transcribed from the
// arrêtés préfectoraux of one season and then frozen. The opening and closing
// dates are NOT: cat1Season recomputes them for whatever year it is asked about
// ("never hard-code a year"). Those two facts together mean that on 1 January
// the app would quote next season's dates beside last season's sizes, with
// nothing on screen admitting it.
//
// Hence a machine-readable vintage: the UI can warn, and version.test.ts fails
// the build once the year turns — the only mechanism that reliably reminds a
// maintainer of a once-a-year chore.

import type { DeptId } from "./regulation";

/** Season the embedded sizes, quotas and notes are transcribed from. */
export const REG_YEAR = 2026;

/** When those values were last checked against the source texts (ISO date). */
export const VERIFIE_LE = "2026-07-22";

/** The exact text each department's figures come from. */
export const ARRETES: Record<DeptId, string> = {
  "23": "Arrêté préfectoral n° 23-2025-12-19-00001 (pêche 2026)",
  "36": "Arrêté préfectoral n° 36-2025-12-12-00002 (pêche 2026)",
  "41": "Arrêté préfectoral annuel 2026 (préfecture / peche41.fr)",
};

/**
 * Whether the embedded regulation is older than the season now being fished.
 *
 * Compares years rather than a rolling 12 months: a fishing season IS a
 * calendar year here, and the arrêtés are published in December for the year
 * that follows. A device clock set in the past never triggers it — that is the
 * clock being wrong, not the data.
 */
export function regOutdated(now: Date = new Date()): boolean {
  return now.getFullYear() > REG_YEAR;
}
