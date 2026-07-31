import { describe, it, expect } from "vitest";
import { REG_YEAR, VERIFIE_LE, ARRETES, regOutdated } from "./version";
import { DEPARTEMENTS } from "./regulation";

// Sizes and quotas are a frozen snapshot of the 2026 arrêtés, but the opening
// and closing dates are RECOMPUTED for the current year (cat1Season, "never
// hard-code a year"). On 1 January the app would therefore show 2027 dates
// beside 2026 sizes, with nothing saying so.

describe("regOutdated", () => {
  it("est faux pendant la saison couverte", () => {
    expect(regOutdated(new Date(REG_YEAR, 6, 15))).toBe(false);
    expect(regOutdated(new Date(REG_YEAR, 11, 31))).toBe(false);
  });

  it("devient vrai au 1er janvier suivant", () => {
    // The exact moment the recomputed dates start disagreeing with the sizes.
    expect(regOutdated(new Date(REG_YEAR + 1, 0, 1))).toBe(true);
  });

  it("reste vrai les années suivantes", () => {
    expect(regOutdated(new Date(REG_YEAR + 3, 5, 1))).toBe(true);
  });

  it("n'est pas déclenché par une horloge d'appareil réglée dans le passé", () => {
    // An angler whose phone thinks it is 2019 should not be told the data is
    // stale — it is their clock that is wrong.
    expect(regOutdated(new Date(REG_YEAR - 2, 3, 1))).toBe(false);
  });
});

describe("millésime", () => {
  it("nomme l'arrêté de chaque département couvert", () => {
    for (const id of Object.keys(DEPARTEMENTS)) {
      expect(ARRETES[id as keyof typeof ARRETES], `arrêté manquant pour ${id}`).toBeTruthy();
    }
  });

  it("porte une date de vérification lisible par la machine", () => {
    expect(VERIFIE_LE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(VERIFIE_LE).getFullYear()).toBe(REG_YEAR);
  });
});

describe("corvée annuelle", () => {
  it("RÉCLAME LA MISE À JOUR quand l'année en cours dépasse le millésime", () => {
    // Deliberate tripwire. If this fails, the app is serving last season's
    // sizes and quotas: re-read the three arrêtés préfectoraux, update
    // DEPT_REG, then bump REG_YEAR and VERIFIE_LE in src/data/version.ts.
    expect(
      regOutdated(new Date()),
      `Réglementation ${REG_YEAR} périmée — vérifiez les arrêtés et mettez à jour src/data/version.ts`,
    ).toBe(false);
  });
});
