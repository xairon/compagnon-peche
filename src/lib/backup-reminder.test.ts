import { describe, it, expect } from "vitest";
import {
  BACKUP_REMINDER_DAYS,
  shouldSuggestBackup,
  QUOTA_WARNING_RATIO,
  isQuotaNearlyFull,
} from "./backup-reminder";

const T0 = 1_700_000_000_000; // instant de référence arbitraire
const DAY = 24 * 60 * 60 * 1000;

describe("shouldSuggestBackup", () => {
  it("rien à proposer quand le carnet est vide (jamais eu de données)", () => {
    expect(
      shouldSuggestBackup({ lastExportAtMs: null, oldestDataAtMs: null, now: T0 }),
    ).toBe(false);
  });

  it("jamais exporté, données très récentes → pas encore de rappel", () => {
    expect(
      shouldSuggestBackup({ lastExportAtMs: null, oldestDataAtMs: T0, now: T0 + DAY }),
    ).toBe(false);
  });

  it("jamais exporté, données vieilles de plus du délai → rappel", () => {
    expect(
      shouldSuggestBackup({
        lastExportAtMs: null,
        oldestDataAtMs: T0,
        now: T0 + (BACKUP_REMINDER_DAYS + 1) * DAY,
      }),
    ).toBe(true);
  });

  it("pile au seuil → rappel (borne inclusive)", () => {
    expect(
      shouldSuggestBackup({
        lastExportAtMs: null,
        oldestDataAtMs: T0,
        now: T0 + BACKUP_REMINDER_DAYS * DAY,
      }),
    ).toBe(true);
  });

  it("déjà exporté récemment → pas de rappel, même avec de vieilles données", () => {
    expect(
      shouldSuggestBackup({
        lastExportAtMs: T0 + 100 * DAY,
        oldestDataAtMs: T0,
        now: T0 + 101 * DAY,
      }),
    ).toBe(false);
  });

  it("exporté il y a longtemps, données ajoutées depuis → le compte repart de l'export", () => {
    expect(
      shouldSuggestBackup({
        lastExportAtMs: T0,
        oldestDataAtMs: T0 + 50 * DAY, // une prise plus récente que l'export
        now: T0 + (BACKUP_REMINDER_DAYS + 1) * DAY,
      }),
    ).toBe(true);
  });
});

describe("isQuotaNearlyFull", () => {
  it("faux largement sous le seuil", () => {
    expect(isQuotaNearlyFull(10, 100)).toBe(false);
  });

  it("vrai au ratio d'alerte", () => {
    expect(isQuotaNearlyFull(QUOTA_WARNING_RATIO * 100, 100)).toBe(true);
  });

  it("vrai au-delà du ratio d'alerte", () => {
    expect(isQuotaNearlyFull(95, 100)).toBe(true);
  });

  it("faux quand le quota est inconnu (0) — rien à comparer", () => {
    expect(isQuotaNearlyFull(500, 0)).toBe(false);
  });
});
