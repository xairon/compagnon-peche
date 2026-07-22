import { describe, it, expect } from "vitest";
import { sunTimes, moonIllumination, moonPhaseName } from "./astro";

const BLOIS = { lat: 47.586, lon: 1.336 };

describe("sunTimes", () => {
  const t = sunTimes(new Date("2026-06-21T12:00:00Z"), BLOIS.lat, BLOIS.lon);
  it("returns ordered dawn < sunrise < noon < sunset < dusk", () => {
    expect(t.sunrise).toBeInstanceOf(Date);
    expect(t.sunset).toBeInstanceOf(Date);
    expect(t.dawn!.getTime()).toBeLessThan(t.sunrise!.getTime());
    expect(t.sunrise!.getTime()).toBeLessThan(t.noon.getTime());
    expect(t.noon.getTime()).toBeLessThan(t.sunset!.getTime());
    expect(t.sunset!.getTime()).toBeLessThan(t.dusk!.getTime());
  });
  it("has a long day at the summer solstice (>15 h between sunrise and sunset)", () => {
    const hours = (t.sunset!.getTime() - t.sunrise!.getTime()) / 3_600_000;
    expect(hours).toBeGreaterThan(15);
    expect(hours).toBeLessThan(17);
  });
});

describe("moonIllumination", () => {
  it("fraction is in [0,1] and phase in [0,1)", () => {
    for (const iso of ["2026-01-01", "2026-03-15", "2026-07-21", "2026-11-30"]) {
      const m = moonIllumination(new Date(iso + "T12:00:00Z"));
      expect(m.fraction).toBeGreaterThanOrEqual(0);
      expect(m.fraction).toBeLessThanOrEqual(1);
      expect(m.phase).toBeGreaterThanOrEqual(0);
      expect(m.phase).toBeLessThan(1);
    }
  });
});

describe("moonPhaseName", () => {
  it("names the cardinal phases", () => {
    expect(moonPhaseName(0)).toBe("Nouvelle lune");
    expect(moonPhaseName(0.5)).toBe("Pleine lune");
    expect(moonPhaseName(0.25)).toBe("Premier quartier");
    expect(moonPhaseName(0.75)).toBe("Dernier quartier");
  });
});
