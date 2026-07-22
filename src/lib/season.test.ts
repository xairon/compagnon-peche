import { describe, it, expect } from "vitest";
import { season } from "./season";
import type { Species } from "../types";

const sp = (over: Partial<Species>): Species => ({ season: "toujours", ...over }) as Species;

describe("season — 1ʳᵉ catégorie (salmonidés)", () => {
  const trout = sp({ season: "cat1" });
  it("open in summer (2nd Sat March → 3rd Sun September)", () => {
    // 2026: open 14 Mar → 20 Sep
    expect(season(trout, new Date(2026, 5, 15)).open).toBe(true);
  });
  it("closed in winter", () => {
    expect(season(trout, new Date(2026, 0, 15)).open).toBe(false);
    expect(season(trout, new Date(2026, 10, 1)).open).toBe(false);
  });
  it("open on the closing day itself", () => {
    expect(season(trout, new Date(2026, 8, 20, 20, 0)).open).toBe(true); // 3rd Sun Sept 2026
  });
});

describe("season — brochet (closed late Jan → late Apr)", () => {
  const pike = sp({ season: "brochet" });
  it("open outside the closure", () => {
    expect(season(pike, new Date(2026, 0, 5)).open).toBe(true); // early Jan
    expect(season(pike, new Date(2026, 5, 1)).open).toBe(true); // June
    expect(season(pike, new Date(2026, 11, 1)).open).toBe(true); // December
  });
  it("closed mid-closure", () => {
    expect(season(pike, new Date(2026, 2, 15)).open).toBe(false); // mid-March
  });
});

describe("season — special cases", () => {
  it("invasive species are always takeable", () => {
    expect(season(sp({ invasive: true, season: "cat1" }), new Date(2026, 0, 1))).toEqual({
      open: true,
      label: "Capture toute l'année",
    });
  });
  it("'toujours' species are always open", () => {
    expect(season(sp({ season: "toujours" }), new Date(2026, 0, 1)).open).toBe(true);
  });
});
