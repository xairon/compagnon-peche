import { describe, it, expect } from "vitest";
import { assessCrue, crueLabel } from "./crue";
import type { HydroReading } from "./hubeau";

const T0 = 1_700_000_000_000; // instant de référence arbitraire
const H = 3600_000;

function reading(over: Partial<HydroReading> = {}): HydroReading {
  return {
    value: 1,
    unit: "m",
    date: new Date(T0).toISOString(),
    trend: "stable",
    delta: 0,
    ...over,
  };
}

describe("assessCrue — niveau (H)", () => {
  it("aucune donnée → aucune", () => {
    expect(assessCrue(null, null, T0)).toEqual({ level: "aucune", reasons: [] });
  });

  it("niveau stable → aucune", () => {
    const h = reading({ value: 1.2, delta: 0.01 });
    expect(assessCrue(h, null, T0).level).toBe("aucune");
  });

  it("niveau en baisse, même forte → aucune (une décrue n'est pas une alerte)", () => {
    const h = reading({ value: 1.2, delta: -0.5 });
    expect(assessCrue(h, null, T0).level).toBe("aucune");
  });

  it("hausse de 20 cm en 3h → vigilance", () => {
    const h = reading({ value: 1.2, delta: 0.2 });
    const a = assessCrue(h, null, T0);
    expect(a.level).toBe("vigilance");
    expect(a.reasons[0]).toContain("niveau");
  });

  it("hausse de 35 cm en 3h → alerte", () => {
    const h = reading({ value: 1.5, delta: 0.35 });
    expect(assessCrue(h, null, T0).level).toBe("alerte");
  });

  it("juste sous le seuil vigilance (14 cm) → aucune", () => {
    const h = reading({ value: 1.14, delta: 0.14 });
    expect(assessCrue(h, null, T0).level).toBe("aucune");
  });

  it("pile au seuil alerte (30 cm) → alerte (borne incluse)", () => {
    const h = reading({ value: 1.3, delta: 0.3 });
    expect(assessCrue(h, null, T0).level).toBe("alerte");
  });
});

describe("assessCrue — débit (Q), en variation relative", () => {
  it("débit qui double en 3h → alerte", () => {
    const q = reading({ unit: "m³/s", value: 4, delta: 2 }); // 2 -> 4
    expect(assessCrue(null, q, T0).level).toBe("alerte");
  });

  it("débit +60% en 3h → vigilance", () => {
    const q = reading({ unit: "m³/s", value: 1.6, delta: 0.6 }); // 1 -> 1.6
    expect(assessCrue(null, q, T0).level).toBe("vigilance");
  });

  it("même delta absolu, gros cours d'eau → pas d'alerte (variation relative faible)", () => {
    const q = reading({ unit: "m³/s", value: 102, delta: 2 }); // 100 -> 102, +2%
    expect(assessCrue(null, q, T0).level).toBe("aucune");
  });

  it("débit qui part de zéro → aucune (ratio non calculable, pas de fausse alerte)", () => {
    const q = reading({ unit: "m³/s", value: 2, delta: 2 }); // before = 0
    expect(assessCrue(null, q, T0).level).toBe("aucune");
  });
});

describe("assessCrue — combinaison H + Q", () => {
  it("prend le niveau le plus élevé des deux signaux", () => {
    const h = reading({ value: 1.2, delta: 0.2 }); // vigilance
    const q = reading({ unit: "m³/s", value: 4, delta: 2 }); // alerte
    const a = assessCrue(h, q, T0);
    expect(a.level).toBe("alerte");
    expect(a.reasons).toHaveLength(2);
  });

  it("un seul signal en hausse suffit", () => {
    const h = reading({ value: 1.2, delta: 0.2 });
    const q = reading({ unit: "m³/s", value: 1, delta: 0 });
    expect(assessCrue(h, q, T0).level).toBe("vigilance");
  });
});

describe("assessCrue — fraîcheur de la donnée", () => {
  it("relevé de plus de 3h → aucune, même avec une forte hausse (donnée pas assez fraîche pour être fiable)", () => {
    const h = reading({ value: 1.5, delta: 0.35, date: new Date(T0 - 4 * H).toISOString() });
    expect(assessCrue(h, null, T0).level).toBe("aucune");
  });

  it("relevé pile à la limite (3h) → encore pris en compte", () => {
    const h = reading({ value: 1.5, delta: 0.35, date: new Date(T0 - 3 * H).toISOString() });
    expect(assessCrue(h, null, T0).level).toBe("alerte");
  });

  it("date invalide → aucune, jamais une exception", () => {
    const h = reading({ value: 1.5, delta: 0.35, date: "n'importe quoi" });
    expect(() => assessCrue(h, null, T0)).not.toThrow();
    expect(assessCrue(h, null, T0).level).toBe("aucune");
  });

  it("date dans le futur (horloge locale décalée) → aucune, pas de fausse confiance", () => {
    const h = reading({ value: 1.5, delta: 0.35, date: new Date(T0 + H).toISOString() });
    expect(assessCrue(h, null, T0).level).toBe("aucune");
  });
});

describe("crueLabel", () => {
  it("aucune → ton neutre (réutilise .verdict-banner.good)", () => {
    expect(crueLabel("aucune").tone).toBe("good");
  });
  it("vigilance → ton warn (réutilise .verdict-banner.warn)", () => {
    expect(crueLabel("vigilance").tone).toBe("warn");
  });
  it("alerte → ton bad (réutilise .verdict-banner.bad)", () => {
    expect(crueLabel("alerte").tone).toBe("bad");
  });
});
