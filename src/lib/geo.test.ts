import { describe, it, expect } from "vitest";
import { distKm, boxAround, boxAroundKm, compass, ago, hhmm } from "./geo";

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

// A box measured in degrees is not a box measured in kilometres: a degree of
// longitude is 111 km at the equator and 75 km at Blois. Every caller asked for
// a box in degrees and then filtered the result in kilometres, so the query
// stopped short of the radius the app went on to claim it had searched —
// boxAround(47.6, 1.3, 0.22) reaches 24,5 km north but only 16,5 km east, while
// DIST_MAX.hydro says 20. "Aucune station dans 20 km" was said without looking.
describe("boxAroundKm", () => {
  const côtés = (lat: number, lon: number, km: number) => {
    const b = boxAroundKm(lat, lon, km);
    return {
      nord: distKm(lat, lon, b.n, lon),
      sud: distKm(lat, lon, b.s, lon),
      est: distKm(lat, lon, lat, b.e),
      ouest: distKm(lat, lon, lat, b.w),
    };
  };

  it("couvre le rayon demandé dans les quatre directions", () => {
    for (const [nom, d] of Object.entries(côtés(47.59, 1.33, 20))) {
      expect(d, `côté ${nom}`).toBeGreaterThanOrEqual(20);
    }
  });

  it("tient aussi à Dunkerque, où les méridiens se resserrent", () => {
    expect(côtés(51.03, 2.37, 20).est).toBeGreaterThanOrEqual(20);
  });

  it("tient aussi à Ajaccio", () => {
    expect(côtés(41.92, 8.74, 30).est).toBeGreaterThanOrEqual(30);
  });

  it("ne balaie pas beaucoup plus large que demandé", () => {
    // Elle doit couvrir le rayon, pas tripler le volume de la réponse.
    const c = côtés(47.59, 1.33, 20);
    expect(c.est).toBeLessThan(20 * 1.6);
    expect(c.nord).toBeLessThan(20 * 1.6);
  });

  it("reste finie au pôle plutôt que de renvoyer une boîte infinie", () => {
    const b = boxAroundKm(90, 0, 20);

    expect(Number.isFinite(b.e)).toBe(true);
    expect(Number.isFinite(b.w)).toBe(true);
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
