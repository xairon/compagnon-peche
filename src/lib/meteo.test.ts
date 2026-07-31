import { describe, it, expect } from "vitest";
import { parseMeteo, SchemaError } from "./meteo";

// No test covered this module until an audit of the data sources found three
// defects at once, each verified against the live API on 2026-07-31 from Blois.

/** Shape of a real Open-Meteo response, trimmed to what the parser reads. */
function reponse(over: Record<string, unknown> = {}) {
  return {
    elevation: 76,
    current: {
      time: "2026-07-31T12:00",
      temperature_2m: 23.4,
      apparent_temperature: 23.1,
      relative_humidity_2m: 65,
      precipitation: 0,
      cloud_cover: 32,
      wind_speed_10m: 9,
      wind_direction_10m: 30,
      wind_gusts_10m: 19,
      surface_pressure: 1009.1,
      pressure_msl: 1017.9,
      weather_code: 3,
    },
    // Hourly, one point per hour: the trend looks back exactly 3 indices, so a
    // sparse series would silently clamp to the start of the array.
    hourly: {
      time: [
        "2026-07-31T08:00",
        "2026-07-31T09:00",
        "2026-07-31T10:00",
        "2026-07-31T11:00",
        "2026-07-31T12:00",
      ],
      temperature_2m: [19, 21, 22, 23, 23.4],
      precipitation_probability: [0, 0, 0, 5, 5],
      surface_pressure: [1010.6, 1010.4, 1010, 1009.6, 1009.1],
      pressure_msl: [1019.4, 1019.2, 1018.8, 1018.4, 1017.9],
    },
    // past_days=1 is requested for the 3 h pressure trend, and Open-Meteo
    // applies it to `daily` too: the first entry is YESTERDAY.
    daily: {
      time: ["2026-07-30", "2026-07-31", "2026-08-01"],
      weather_code: [95, 3, 3],
      temperature_2m_max: [29, 29, 28],
      temperature_2m_min: [19, 19, 18],
      precipitation_sum: [4.2, 0, 0],
      wind_speed_10m_max: [22, 14, 15],
    },
    ...over,
  };
}

describe("parseMeteo — prévision journalière", () => {
  it("écarte la journée d'hier que past_days ramène", () => {
    // Measured on the live API: daily.time started at 2026-07-30 with
    // weather_code 95 — yesterday's thunderstorm shown as the headline.
    const m = parseMeteo(reponse());

    expect(m.days.map((d) => d.date)).toEqual(["2026-07-31", "2026-08-01"]);
  });

  it("ne met pas l'orage de la veille en tête de prévision", () => {
    const m = parseMeteo(reponse());

    expect(m.days[0].code).toBe(3);
  });
});

describe("parseMeteo — pression", () => {
  it("rapporte la pression au niveau de la mer, celle dont parlent les pêcheurs", () => {
    // surface_pressure at 76 m reads 1009 — the angler concludes "basse
    // pression" while an anticyclone sits at 1018. The gap grows with altitude.
    const m = parseMeteo(reponse());

    expect(m.now.pressure).toBe(1017.9);
  });

  it("calcule la tendance sur la même grandeur que celle affichée", () => {
    const m = parseMeteo(reponse());

    // Sea level, 3 h back : 1017.9 − 1019.2 = −1.3 → baisse.
    // Sur la pression de surface le même écart vaut −1.3 aussi, mais la valeur
    // affichée serait 1009 : c'est la cohérence chiffre/flèche qui est en jeu.
    expect(m.pressureTrend).toBe("falling");
  });
});

describe("parseMeteo — réponses partielles", () => {
  it("refuse une réponse sans bloc current, au lieu de produire des NaN", () => {
    // A 200 without `current` used to sail through and surface as "0 °C".
    expect(() => parseMeteo(reponse({ current: undefined }))).toThrow(SchemaError);
  });

  it("laisse une valeur nulle nulle, plutôt que de la transformer en zéro", () => {
    const j = reponse();
    (j.current as Record<string, unknown>).temperature_2m = null;

    const m = parseMeteo(j);

    // Math.round(null) is 0 — a real temperature reading of zero degrees.
    expect(m.now.temp).toBeNull();
  });

  it("survit à une prévision journalière absente", () => {
    expect(() => parseMeteo(reponse({ daily: undefined }))).not.toThrow();
    expect(parseMeteo(reponse({ daily: undefined })).days).toEqual([]);
  });
});
