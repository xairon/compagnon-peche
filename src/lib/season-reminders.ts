// Upcoming season deadlines — pure, clock-free. season.ts already knows how to
// tell, for a given instant, whether a rule (cat1, brochet…) is open; this
// module does NOT re-derive the nth-weekday regulatory dates (2ᵉ samedi de
// mars, dernier dimanche de janvier…) — it scans day by day and asks season()
// for its verdict, so season.ts stays the single source of truth for the
// actual dates. Every function takes `now` as a parameter, same convention as
// src/lib/ecrevisses.ts.

import type { Species } from "../types";
import { season } from "./season";

/** How many days ahead we start mentioning an upcoming opening/closing. A
 *  week is enough to plan a session (book a day off, check the weather, buy
 *  bait) without nagging for a month before a date nobody can act on yet. */
export const REMINDER_WINDOW_DAYS = 7;

export type SeasonReminderKind = "ouverture" | "fermeture";

/** The two national rules that actually have a transition date — "toujours",
 *  "invasive-year" and "special" never flip, so there is nothing to announce
 *  for them (see season.ts). */
export type SeasonReminderRule = "cat1" | "brochet";

export interface SeasonReminder {
  rule: SeasonReminderRule;
  label: string;
  kind: SeasonReminderKind;
  date: Date;
  inDays: number;
}

const RULES: { rule: SeasonReminderRule; label: string }[] = [
  { rule: "cat1", label: "Truite & salmonidés (1ʳᵉ catégorie)" },
  { rule: "brochet", label: "Brochet" },
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** A minimal Species stand-in — season() only reads `.season` and `.invasive`
 *  for these two rules, so we don't need a real fiche. */
function ruleOpenOn(rule: SeasonReminderRule, at: Date): boolean {
  return season({ season: rule } as Species, at).open;
}

/** The next open/close transition for one rule within `windowDays` of `now`,
 *  or null when none falls in the window. */
function nextTransition(
  rule: SeasonReminderRule,
  now: Date,
  windowDays: number,
): { kind: SeasonReminderKind; date: Date; inDays: number } | null {
  const today = startOfDay(now);
  const openNow = ruleOpenOn(rule, now);
  for (let i = 1; i <= windowDays; i++) {
    const day = addDays(today, i);
    const open = ruleOpenOn(rule, day);
    if (open === openNow) continue;
    if (openNow && !open) {
      // Closes between day i-1 (the last open day, announced as the closing
      // date) and day i — see season.ts's own "closing day itself is still
      // open" comment.
      return { kind: "fermeture", date: addDays(today, i - 1), inDays: i - 1 };
    }
    return { kind: "ouverture", date: day, inDays: i };
  }
  return null;
}

/** Upcoming open/close deadlines within the window, soonest first. Pure:
 *  takes `now`, never reads the clock itself. */
export function upcomingSeasonReminders(
  now: Date,
  windowDays: number = REMINDER_WINDOW_DAYS,
): SeasonReminder[] {
  const out: SeasonReminder[] = [];
  for (const { rule, label } of RULES) {
    const t = nextTransition(rule, now, windowDays);
    if (t) out.push({ rule, label, ...t });
  }
  return out.sort((a, b) => a.inDays - b.inDays);
}
