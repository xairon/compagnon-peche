import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { distKm, distKmPolyligne, boxAround, boxAroundKm, compass, ago, hhmm } from "./geo";

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

// Distance d'un point à une polyligne — le chaînon qui manquait pour savoir sur
// quel cours d'eau se tient le pêcheur. Le sommet le plus proche ne suffit pas :
// le Sandre publie des axes très inégalement échantillonnés, et un tronçon qui
// passe à 20 m peut n'avoir son premier sommet qu'à 800 m.
//
// Les géométries Sandre sont en [lon, lat] et arrivent en LineString COMME en
// MultiLineString — les deux ont été observées le 31/07/2026 dans une même
// réponse sa:TronconHydrographique autour de Blois.
describe("distKmPolyligne", () => {
  const ligne = (pts: [number, number][]) => ({ type: "LineString", coordinates: pts });

  it("est nulle sur un sommet de la ligne", () => {
    expect(distKmPolyligne(47.5, 1.3, ligne([[1.3, 47.5], [1.4, 47.5]]))!).toBeCloseTo(0, 6);
  });

  it("mesure jusqu'au SEGMENT, pas jusqu'au sommet le plus proche", () => {
    // Deux sommets à 0,1° l'un de l'autre, le point juste au-dessus du milieu.
    // Le sommet le plus proche est à ~4,2 km ; le segment, lui, passe à 1,1 km.
    const d = distKmPolyligne(47.51, 1.35, ligne([[1.3, 47.5], [1.4, 47.5]]))!;
    const sommet = Math.min(distKm(47.51, 1.35, 47.5, 1.3), distKm(47.51, 1.35, 47.5, 1.4));

    expect(d).toBeCloseTo(distKm(47.51, 1.35, 47.5, 1.35), 2);
    expect(d).toBeLessThan(sommet / 3);
  });

  it("s'arrête aux extrémités : au-delà du segment, c'est le sommet qui compte", () => {
    // Projection hors du segment — la perpendiculaire n'existe pas, la réponse
    // est la distance au bout de la ligne.
    const d = distKmPolyligne(47.5, 1.5, ligne([[1.3, 47.5], [1.4, 47.5]]))!;

    expect(d).toBeCloseTo(distKm(47.5, 1.5, 47.5, 1.4), 2);
  });

  it("lit les coordonnées en [lon, lat], comme le Sandre les publie", () => {
    // Si l'ordre était inversé, ce point tomberait à des centaines de km.
    expect(distKmPolyligne(47.5, 1.3, ligne([[1.3, 47.5], [1.3, 47.6]]))!).toBeLessThan(0.01);
  });

  it("prend la plus proche des parties d'un MultiLineString", () => {
    const multi = {
      type: "MultiLineString",
      coordinates: [
        [[2.0, 47.5], [2.1, 47.5]],
        [[1.3, 47.5], [1.4, 47.5]],
      ],
    };

    expect(distKmPolyligne(47.5, 1.35, multi)!).toBeLessThan(0.01);
  });

  it("rend null — pas zéro, pas l'infini — quand la géométrie ne situe rien", () => {
    // Un tronçon qu'on ne sait pas placer n'est ni proche ni lointain : il est
    // illisible, et le dire est le seul état honnête.
    expect(distKmPolyligne(47.5, 1.3, null)).toBeNull();
    expect(distKmPolyligne(47.5, 1.3, undefined)).toBeNull();
    expect(distKmPolyligne(47.5, 1.3, { type: "Point", coordinates: [1.3, 47.5] })).toBeNull();
    expect(distKmPolyligne(47.5, 1.3, ligne([]))).toBeNull();
    expect(distKmPolyligne(47.5, 1.3, { type: "MultiLineString", coordinates: [] })).toBeNull();
  });

  it("accepte une ligne réduite à un point plutôt que de diviser par zéro", () => {
    const d = distKmPolyligne(47.5, 1.3, ligne([[1.4, 47.5]]))!;

    expect(d).toBeCloseTo(distKm(47.5, 1.3, 47.5, 1.4), 4);
  });

  it("retrouve les distances mesurées sur la vraie couche Sandre à Blois", () => {
    // Réponse RÉELLE de sa:TronconHydrographique, boîte de 1 km autour de
    // 47,586 / 1,336 (Blois), capturée le 31/07/2026. Trois tronçons, trois
    // cours d'eau : la Loire à 161 m, un ruisseau à 1051 m, les Mées à 1302 m.
    // C'est exactement le cas que l'ancien coursDuPoint jugeait « ambigu ».
    const fc = JSON.parse(
      readFileSync(
        fileURLToPath(new URL("./__fixtures__/sandre-troncon-blois.json", import.meta.url)),
        "utf8",
      ),
    );
    const m = fc.features
      .map((f: { properties: Record<string, string>; geometry: unknown }) => ({
        cours: f.properties.CdCoursEau,
        m: Math.round(distKmPolyligne(47.586, 1.336, f.geometry)! * 1000),
      }))
      .sort((a: { m: number }, b: { m: number }) => a.m - b.m);

    expect(m).toEqual([
      { cours: "----0000", m: 161 },
      { cours: "K4795300", m: 1051 },
      { cours: "K4475000", m: 1302 },
    ]);
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
