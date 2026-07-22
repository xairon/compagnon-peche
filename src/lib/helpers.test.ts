import { describe, it, expect } from "vitest";
import { norm, isoDay, quotaToday, dayPart, uid, repere } from "./helpers";
import type { Catch } from "../types";

describe("norm", () => {
  it("strips accents and lowercases", () => {
    expect(norm("Brème")).toBe("breme");
    expect(norm("Écrevisse")).toBe("ecrevisse");
    expect(norm("")).toBe("");
  });
});

describe("isoDay", () => {
  it("uses LOCAL date (not UTC)", () => {
    expect(isoDay(new Date(2026, 6, 21, 23, 30))).toBe("2026-07-21");
    expect(isoDay(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

const mk = (spid: string, iso: string, kept: boolean): Catch =>
  ({ slot: spid + iso, sp: spid, spid, iso, size: "—", n: 0, date: iso, place: "", kept }) as Catch;

describe("quotaToday (R436-21: 3 carnassiers/j dont 2 brochets)", () => {
  const now = new Date(2026, 6, 21);
  it("counts only today's kept carnassiers", () => {
    const catches = [
      mk("sandre", "2026-07-21", true),
      mk("brochet", "2026-07-21", true),
      mk("brochet", "2026-07-21", false), // released → not counted
      mk("gardon", "2026-07-21", true), // not a carnassier
      mk("sandre", "2026-07-20", true), // yesterday
    ];
    expect(quotaToday(catches, now)).toEqual({ c: 2, b: 1 });
  });
  it("both black-bass species count as carnassiers", () => {
    const catches = [mk("black-bass", "2026-07-21", true), mk("black-bass-petite-bouche", "2026-07-21", true)];
    expect(quotaToday(catches, now)).toEqual({ c: 2, b: 0 });
  });
});

describe("dayPart", () => {
  it("buckets by hour", () => {
    expect(dayPart("06:30")).toBe("Aube");
    expect(dayPart("12:00")).toBe("Midi");
    expect(dayPart("23:00")).toBe("Nuit");
    expect(dayPart("03:00")).toBe("Nuit");
    expect(dayPart("09:00")).toBe("Matin");
    expect(dayPart("19:00")).toBe("Soir");
  });
  it("returns null for missing/invalid", () => {
    expect(dayPart(undefined)).toBeNull();
    expect(dayPart("xx:yy")).toBeNull();
  });
});

describe("uid", () => {
  it("prefixes and is unique", () => {
    const a = uid("p");
    const b = uid("p");
    expect(a.startsWith("p")).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe("repere", () => {
  it("gives a bigger reference for a bigger fish", () => {
    expect(repere(8)).toMatch(/carte bancaire/);
    expect(repere(60)).toMatch(/coude/);
  });
});
