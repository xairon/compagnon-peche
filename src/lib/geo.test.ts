import { describe, it, expect } from "vitest";
import { distKm, boxAround, compass, ago, hhmm } from "./geo";

describe("distKm", () => {
  it("is 0 for identical points", () => {
    expect(distKm(47.5, 1.3, 47.5, 1.3)).toBe(0);
  });
  it("≈111 km per degree of latitude", () => {
    expect(distKm(47, 1, 48, 1)).toBeCloseTo(111.2, 0);
  });
  it("is symmetric", () => {
    expect(distKm(47, 1, 48, 2)).toBeCloseTo(distKm(48, 2, 47, 1), 6);
  });
});

describe("boxAround", () => {
  it("builds a symmetric lon/lat box", () => {
    expect(boxAround(47, 1, 0.5)).toEqual({ w: 0.5, s: 46.5, e: 1.5, n: 47.5 });
  });
});

describe("compass", () => {
  it("maps cardinals", () => {
    expect(compass(0)).toBe("N");
    expect(compass(90)).toBe("E");
    expect(compass(180)).toBe("S");
    expect(compass(270)).toBe("O");
  });
  it("wraps past 360", () => {
    expect(compass(360)).toBe("N");
  });
});

describe("hhmm", () => {
  it("formats a time", () => {
    expect(hhmm(new Date(2026, 0, 1, 9, 5, 0))).toBe("09:05");
  });
  it("returns em-dash for null/invalid", () => {
    expect(hhmm(null)).toBe("—");
    expect(hhmm(new Date("nope"))).toBe("—");
  });
});

describe("ago", () => {
  const now = new Date("2026-07-21T12:00:00");
  it("handles sub-minute", () => {
    expect(ago(new Date(now.getTime() - 20_000).toISOString(), now)).toBe("à l'instant");
  });
  it("minutes / hours / days", () => {
    expect(ago(new Date(now.getTime() - 30 * 60_000).toISOString(), now)).toBe("il y a 30 min");
    expect(ago(new Date(now.getTime() - 3 * 3_600_000).toISOString(), now)).toBe("il y a 3 h");
    expect(ago(new Date(now.getTime() - 2 * 86_400_000).toISOString(), now)).toBe("il y a 2 j");
  });
  it("returns empty string for garbage", () => {
    expect(ago("not-a-date", now)).toBe("");
  });
});
