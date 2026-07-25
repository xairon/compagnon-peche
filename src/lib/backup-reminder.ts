// Pure decision logic for two "you're at risk of losing data" nudges. No
// IndexedDB/localStorage/DOM access here — callers own persistence and
// rendering, this module only decides WHEN to show something, so both rules
// are fully unit-testable without a browser.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days without a successful export before the backup nudge kicks in. An
 *  angler uses the app in bursts around outings, not daily — a short window
 *  (a couple of days) would nag between trips for no reason. Two weeks is
 *  long enough to stay quiet during normal use, short enough that a lost or
 *  wiped phone before the next prompt stays a bounded, realistic risk. */
export const BACKUP_REMINDER_DAYS = 14;

export interface BackupReminderInput {
  /** Epoch ms of the last successful export, or null if never exported. */
  lastExportAtMs: number | null;
  /** Epoch ms of the oldest locally-created record (catch, spot, …), or null
   *  if there is no data at all yet. Used as the reference point only when
   *  nothing has ever been exported — an app with data but no backup should
   *  still eventually nudge, anchored on how long that data has been at risk. */
  oldestDataAtMs: number | null;
  now: number;
}

/** True once enough time has passed since the last backup (or since data
 *  started accumulating, if there never was one) AND there is something in
 *  the notebook actually worth losing. */
export function shouldSuggestBackup({
  lastExportAtMs,
  oldestDataAtMs,
  now,
}: BackupReminderInput): boolean {
  if (oldestDataAtMs === null) return false; // nothing to lose yet
  const since = lastExportAtMs ?? oldestDataAtMs;
  return now - since >= BACKUP_REMINDER_DAYS * DAY_MS;
}

/** Fraction of the storage quota at which we warn BEFORE a write actually
 *  fails. Deliberately well under 100%: `storage.estimate()`'s quota is an
 *  estimate that can shrink as other origins write, and a single photo (the
 *  largest object this app stores) can be a few hundred KB — better to
 *  prompt with headroom to spare than to race the next photo write against
 *  the limit. 80% leaves that margin while still being "high enough" that a
 *  casual user isn't warned during normal, moderate use. */
export const QUOTA_WARNING_RATIO = 0.8;

/** True once usage has crossed the warning ratio of the quota. False when the
 *  quota is unknown (0) — nothing meaningful to compare against, and a false
 *  "nearly full" would be misleading. */
export function isQuotaNearlyFull(usage: number, quota: number): boolean {
  if (quota <= 0) return false;
  return usage / quota >= QUOTA_WARNING_RATIO;
}
