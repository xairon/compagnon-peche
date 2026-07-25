import { describe, it, expect } from "vitest";
import { analysePrises, MIN_DOCUMENTED, silenceMessage, BIAS_NOTE } from "./analysePrises";
import type { Catch, CatchConditions } from "../types";

let n = 0;
function make(conditions?: CatchConditions): Catch {
  n++;
  return {
    slot: `c${n}`,
    sp: "Sandre",
    spid: "sandre",
    iso: "2026-06-01",
    size: "52 cm",
    n: 52,
    date: "1 juin 2026",
    place: "Loire",
    kept: true,
    conditions,
  };
}

describe("analysePrises — seuil de silence", () => {
  it("moins de 12 prises documentées → non prêt, indique combien manquent", () => {
    const catches = Array.from({ length: 5 }, () => make({ pressureTrend: "falling" }));
    const a = analysePrises(catches);
    expect(a.ready).toBe(false);
    expect(a.documented).toBe(5);
    expect(a.missing).toBe(MIN_DOCUMENTED - 5);
    expect(a.insights).toEqual([]);
  });

  it("les prises sans instantané de conditions ne comptent pas comme documentées", () => {
    const catches = [
      ...Array.from({ length: 3 }, () => make({ pressureTrend: "falling" })),
      ...Array.from({ length: 20 }, () => make(undefined)),
    ];
    const a = analysePrises(catches);
    expect(a.documented).toBe(3);
    expect(a.ready).toBe(false);
  });

  it("pile à 12 prises documentées → prêt (borne incluse)", () => {
    const catches = Array.from({ length: 12 }, () => make({}));
    const a = analysePrises(catches);
    expect(a.ready).toBe(true);
    expect(a.missing).toBe(0);
  });

  it("11 prises documentées → encore non prêt", () => {
    const catches = Array.from({ length: 11 }, () => make({}));
    expect(analysePrises(catches).ready).toBe(false);
  });
});

describe("analysePrises — répartition plate : n'affiche rien", () => {
  it("tendance de pression également répartie sur 3 valeurs → aucun insight pression", () => {
    const catches = [
      ...Array.from({ length: 4 }, () => make({ pressureTrend: "falling" })),
      ...Array.from({ length: 4 }, () => make({ pressureTrend: "rising" })),
      ...Array.from({ length: 4 }, () => make({ pressureTrend: "stable" })),
    ];
    const a = analysePrises(catches);
    expect(a.ready).toBe(true);
    expect(a.insights.find((i) => i.key === "pressureTrend")).toBeUndefined();
  });
});

describe("analysePrises — tendance nette : affiche un insight factuel", () => {
  it("pression en baisse sur les 2/3 exactement (8/12) → insight présent, borne incluse", () => {
    const catches = [
      ...Array.from({ length: 8 }, () => make({ pressureTrend: "falling" })),
      ...Array.from({ length: 4 }, () => make({ pressureTrend: "rising" })),
    ];
    const a = analysePrises(catches);
    const insight = a.insights.find((i) => i.key === "pressureTrend");
    expect(insight).toBeDefined();
    expect(insight!.sentence).toContain("8 de vos 12 prises documentées");
    expect(insight!.sentence).toContain("en baisse");
    expect(insight!.pct).toBe(67);
  });

  it("juste sous 2/3 (7/12) → pas d'insight pression", () => {
    const catches = [
      ...Array.from({ length: 7 }, () => make({ pressureTrend: "falling" })),
      ...Array.from({ length: 5 }, () => make({ pressureTrend: "rising" })),
    ];
    const a = analysePrises(catches);
    expect(a.insights.find((i) => i.key === "pressureTrend")).toBeUndefined();
  });

  it("débit/niveau nettement en hausse → insight débit factuel", () => {
    const catches = [
      ...Array.from({ length: 10 }, () => make({ flowTrend: "rising" })),
      ...Array.from({ length: 2 }, () => make({ flowTrend: "falling" })),
    ];
    const a = analysePrises(catches);
    const insight = a.insights.find((i) => i.key === "flowTrend");
    expect(insight).toBeDefined();
    expect(insight!.sentence).toContain("10 de vos 12 prises documentées");
    expect(insight!.sentence).toContain("en hausse");
  });

  it("phase de lune concentrée → insight lune, formulé comme repère traditionnel", () => {
    const catches = [
      ...Array.from({ length: 9 }, () => make({ moonPhase: 0.5 })), // Pleine lune
      ...Array.from({ length: 3 }, () => make({ moonPhase: 0 })), // Nouvelle lune
    ];
    const a = analysePrises(catches);
    const insight = a.insights.find((i) => i.key === "moonPhase");
    expect(insight).toBeDefined();
    expect(insight!.sentence).toContain("9 de vos 12 prises documentées");
    expect(insight!.sentence.toLowerCase()).toContain("pleine lune");
  });

  it("température de l'eau concentrée sur une tranche → insight température", () => {
    const catches = [
      ...Array.from({ length: 9 }, () => make({ waterTemp: 8 })), // froide
      ...Array.from({ length: 3 }, () => make({ waterTemp: 22 })), // chaude
    ];
    const a = analysePrises(catches);
    const insight = a.insights.find((i) => i.key === "waterTemp");
    expect(insight).toBeDefined();
    expect(insight!.sentence).toContain("9 de vos 12 prises documentées");
    expect(insight!.sentence).toContain("froide");
  });

  it("une dimension avec moins de 12 valeurs (même si le total documenté est prêt) n'affiche rien", () => {
    const catches = [
      ...Array.from({ length: 12 }, () => make({ pressureTrend: "falling" })),
      // waterTemp renseigné sur seulement 5 de ces prises
    ];
    catches.slice(0, 5).forEach((c) => (c.conditions!.waterTemp = 8));
    const a = analysePrises(catches);
    expect(a.insights.find((i) => i.key === "pressureTrend")).toBeDefined();
    expect(a.insights.find((i) => i.key === "waterTemp")).toBeUndefined();
  });
});

describe("silenceMessage", () => {
  it("singulier à 1", () => {
    expect(silenceMessage(1)).toContain("1 prise documentée");
  });
  it("pluriel au-delà de 1", () => {
    expect(silenceMessage(4)).toContain("4 prises documentées");
  });
});

describe("BIAS_NOTE", () => {
  it("nomme le biais : seules les prises sont comptées, pas les sorties bredouilles", () => {
    expect(BIAS_NOTE.toLowerCase()).toContain("bredouille");
  });
});
