import { describe, it, expect } from "vitest";
import { EDIBILITY } from "./edibility";
import { BASE_SPECIES } from "./species-base";

// Regression for the audit finding: "base" species (auto-generated, no cuisine/
// santé section) can still carry a real, sourced sanitary risk that their fiche
// never mentions. The example: the barbeau méridional's eggs are toxic exactly
// like the barbeau fluviatile's (curated fiche, which does warn), but nothing
// said so. These tests check the *content* of the warning, not just its
// presence — a stray truthy string would pass a presence-only check.

describe("barbeau méridional — toxicité des œufs (parité avec le barbeau fluviatile)", () => {
  const ed = EDIBILITY["barbeau-meridional"];

  it("a une entrée dans l'overlay de comestibilité", () => {
    expect(ed).toBeDefined();
  });

  it("reste 'non' consommable : c'est une espèce protégée, pas un jugement de goût", () => {
    expect(ed.status).toBe("non");
  });

  it("signale la toxicité des œufs (choléra des barbeaux)", () => {
    expect(ed.prep).toMatch(/œufs?.{0,20}toxiques?/i);
    expect(ed.prep).toMatch(/choléra des barbeaux/i);
  });

  it("cite une source médicale nommant explicitement B. meridionalis, pas seulement B. barbus", () => {
    expect(ed.source).toMatch(/SFMU|Médecine Tropicale/i);
    expect(ed.source).toMatch(/meridionalis/i);
  });

  it("la fiche « base » du barbeau méridional existe toujours et reste protégée", () => {
    const sp = BASE_SPECIES.find((s) => s.id === "barbeau-meridional");
    expect(sp?.depth).toBe("base");
    expect(sp?.protected).toBe(true);
  });
});

describe("brochet aquitain — précaution sur les œufs, par analogie avec le brochet", () => {
  const ed = EDIBILITY["brochet-aquitain"];

  it("signale une précaution sur les œufs", () => {
    expect(ed.prep).toMatch(/œufs?/i);
  });

  it("formule la précaution comme une analogie, pas comme un fait établi pour l'espèce", () => {
    // E. aquitanicus itself was never studied — the source string must say so,
    // so nobody mistakes this for a directly sourced fact about this species.
    expect(ed.source).toMatch(/analogie|non étudié/i);
  });
});

describe("lamproies pêchables — toxicité du sang cru (ichtyohémotoxisme)", () => {
  for (const id of ["lamproie-marine", "lamproie-de-riviere"] as const) {
    it(`${id} : signale que le sang cru est toxique et que la cuisson le neutralise`, () => {
      const ed = EDIBILITY[id];
      expect(ed).toBeDefined();
      expect(ed.prep).toMatch(/sang toxique/i);
      expect(ed.prep).toMatch(/cui(t|sez|sson)/i);
    });
  }

  it("la lamproie de Planer (protégée, jamais consommée) n'a pas été traitée — hors périmètre", () => {
    // Documented as an explicit omission in the audit report, not an oversight:
    // it's fully protected and too small (~15 cm) to ever be a real consumption
    // scenario, so this test only pins down that no fake entry was invented.
    expect(EDIBILITY["lamproie-de-planer"]?.prep).not.toMatch(/sang toxique/i);
  });
});
