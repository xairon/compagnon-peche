import { describe, it, expect } from "vitest";
import { ECREVISSES, PECHABLES, crayfishById, REG_BALANCES, MAILLE_NOTE } from "./ecrevisses";

describe("données écrevisses", () => {
  it("couvre les cinq espèces attendues", () => {
    expect(ECREVISSES.map((e) => e.id).sort()).toEqual(
      ["americaine", "louisiane", "pattes-blanches", "pattes-rouges", "signal"].sort(),
    );
  });

  it("les identifiants sont uniques", () => {
    expect(new Set(ECREVISSES.map((e) => e.id)).size).toBe(ECREVISSES.length);
  });

  it("exactement trois espèces pêchables", () => {
    expect(PECHABLES.map((e) => e.id).sort()).toEqual(["americaine", "louisiane", "signal"]);
  });

  it("les deux espèces protégées ne sont pas pêchables", () => {
    expect(crayfishById("pattes-blanches")?.pechable).toBe(false);
    expect(crayfishById("pattes-rouges")?.pechable).toBe(false);
  });

  it("chaque espèce pêchable rappelle l'interdiction de remise à l'eau vivante", () => {
    for (const e of PECHABLES) expect(e.note).toMatch(/vivante?/i);
  });

  it("chaque espèce protégée impose la remise à l'eau", () => {
    for (const e of ECREVISSES.filter((x) => !x.pechable)) {
      expect(e.note).toMatch(/remise à l'eau/i);
    }
  });

  it("crayfishById rend undefined pour un id inconnu", () => {
    expect(crayfishById("truite")).toBeUndefined();
  });

  it("le rappel réglementaire cite le plafond de balances et le diamètre", () => {
    const txt = REG_BALANCES.join(" ");
    expect(txt).toMatch(/6 balances/);
    expect(txt).toMatch(/30 cm/);
  });

  it("la maille de 9 cm n'est jamais présentée comme une autorisation", () => {
    expect(MAILLE_NOTE).toMatch(/9 cm/);
    expect(MAILLE_NOTE).toMatch(/protégée/i);
  });
});
