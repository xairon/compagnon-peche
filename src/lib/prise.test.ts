import { describe, it, expect } from "vitest";
import { priseView } from "./prise";
import type { Species } from "../types";
import type { SeasonRule } from "../types";

// Minimal species factory — only the fields priseView reads for the "statut" step.
function sp(over: Partial<Species> & { season: SeasonRule }): Species {
  return {
    id: "x",
    name: "Poisson test",
    latin: "Testus testus",
    group: "carnassiers",
    maille: "—",
    mailleSub: "",
    quota: "—",
    quotaSub: "",
    ...over,
  };
}

const Q = { c: 0, b: 0 };

describe("priseView — statut (verdict keep/release)", () => {
  it("espèce protégée → RELÂCHER, tone bad", () => {
    const v = priseView(sp({ season: "toujours", protected: true }), "statut", Q);
    expect(v?.banner).toBe("RELÂCHER");
    expect(v?.tone).toBe("bad");
  });

  it("espèce invasive → NE PAS RELÂCHER VIVANT, tone bad", () => {
    const v = priseView(sp({ season: "invasive-year", invasive: true }), "statut", Q);
    expect(v?.banner).toBe("NE PAS RELÂCHER VIVANT");
    expect(v?.tone).toBe("bad");
  });

  it("espèce ordinaire ouverte → PÊCHE OUVERTE, tone good", () => {
    const v = priseView(sp({ season: "toujours" }), "statut", Q);
    expect(v?.banner).toBe("PÊCHE OUVERTE");
    expect(v?.tone).toBe("good");
  });

  it("réglementation spéciale (anguille) → jamais 'PÊCHE OUVERTE'", () => {
    const v = priseView(sp({ name: "Anguille", season: "special" }), "statut", Q);
    expect(v?.banner).toBe("RÉGLEMENTATION SPÉCIALE");
    expect(v?.tone).toBe("warn");
    expect(v?.banner).not.toBe("PÊCHE OUVERTE");
    // The wording must not imply fishing is simply open.
    expect(v?.paras.join(" ")).toMatch(/vérifiez l'arrêté/i);
  });

  it("protégé a priorité sur le statut de saison spéciale", () => {
    const v = priseView(sp({ season: "special", protected: true }), "statut", Q);
    expect(v?.banner).toBe("RELÂCHER");
  });
});
