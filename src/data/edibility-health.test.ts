import { describe, it, expect } from "vitest";
import { EDIBILITY, ANSES_GEN, ANSES_SENS } from "./edibility";
import { BASE_SPECIES } from "./species-base";
import { SPECIES } from "./species";

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

  // L'audit de protection (2026-07) a vérifié l'arrêté du 8 décembre 1988 :
  // son article 1er n'interdit que « la destruction ou l'enlèvement des oeufs »
  // et la dégradation des frayères — jamais la capture. Le barbeau méridional y
  // figure au même titre que le brochet et les truites, qui se conservent tous
  // les jours. « non » (= un texte interdit de le garder) était donc faux ;
  // « réglementé » dit ce qui est vrai, et la mise en garde sanitaire reste.
  it("est 'réglementé' et non 'non' : aucun texte national n'interdit de le garder", () => {
    expect(ed.status).toBe("réglementé");
  });

  it("signale la toxicité des œufs (choléra des barbeaux)", () => {
    expect(ed.prep).toMatch(/œufs?.{0,20}toxiques?/i);
    expect(ed.prep).toMatch(/choléra des barbeaux/i);
  });

  it("cite une source médicale nommant explicitement B. meridionalis, pas seulement B. barbus", () => {
    expect(ed.source).toMatch(/SFMU|Médecine Tropicale/i);
    expect(ed.source).toMatch(/meridionalis/i);
  });

  it("la fiche « base » existe toujours et n'est jamais présentée comme ouverte", () => {
    const sp = BASE_SPECIES.find((s) => s.id === "barbeau-meridional");
    expect(sp?.depth).toBe("base");
    // Plus `protected` (voir ci-dessus), mais pas nu pour autant : le régime
    // spécial fait dire « vérifiez l'arrêté » au lieu d'un feu vert.
    expect(sp?.protected).toBeUndefined();
    expect(sp?.season).toBe("special");
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

/**
 * Couverture et discipline de l'overlay, depuis que les 58 espèces « base » y
 * ont toutes une entrée. Une fiche muette sur la consommation était le trou
 * d'origine ; le trou symétrique — une recommandation sanitaire étendue à une
 * espèce que la source ne nomme pas — serait pire, et c'est celui-là que les
 * deux derniers tests surveillent.
 */
describe("avis ANSES — une seule source", () => {
  // L'avis vivait en double : edibility.ts (onglet Comestibilité) et species.ts
  // (onglet Santé). Deux textes, deux fichiers, deux onglets de la MÊME fiche —
  // corriger l'un laissait l'autre faux.
  it("le texte affiché en Santé vient bien des constantes d'edibility", () => {
    const carpe = SPECIES.find((s) => s.id === "carpe")!;
    const paras = carpe.sante!.paras;
    expect(paras).toContain(ANSES_GEN);
    expect(paras).toContain(ANSES_SENS);
  });

  it("le texte affiché en Comestibilité contient les deux mêmes phrases", () => {
    const ed = EDIBILITY["carpe"];
    expect(ed.anses).toContain(ANSES_GEN);
    expect(ed.anses).toContain(ANSES_SENS);
  });
});

describe("comestibilité — couverture et sourçage", () => {
  it("chaque espèce « base » a son entrée", () => {
    const sans = BASE_SPECIES.filter((s) => !EDIBILITY[s.id]).map((s) => s.id);
    expect(sans).toEqual([]);
  });

  it("aucune entrée n'affirme sans citer sa source", () => {
    const muettes = Object.entries(EDIBILITY)
      .filter(([, e]) => !e.source || e.source.trim() === "")
      .map(([id]) => id);
    expect(muettes).toEqual([]);
  });

  /**
   * L'avis PCB de l'ANSES nomme cinq espèces fortement bioaccumulatrices. Le
   * porter sur une sixième « qui lui ressemble » (la carpe argentée n'est pas
   * une carpe, l'amour blanc non plus) serait exactement l'invention que cette
   * app refuse. Ce test fige la liste : l'élargir demandera de citer l'avis.
   */
  it("l'avis ANSES ne porte que sur les espèces que l'avis nomme", () => {
    const NOMMEES = ["anguille", "barbeau", "breme", "carpe", "silure"];
    const porteuses = Object.entries(EDIBILITY)
      .filter(([, e]) => e.anses)
      .map(([id]) => id)
      .sort();
    expect(porteuses).toEqual(NOMMEES);
  });

  /**
   * Le flet est un poisson de fond d'estuaire : le risque PCB est réel mais
   * c'est un risque de milieu, porté par les arrêtés préfectoraux, pas un avis
   * ANSES par espèce. Sa fiche doit renvoyer à l'arrêté — et surtout ne pas
   * fabriquer une fréquence de consommation que personne n'a publiée.
   */
  it("le flet renvoie à l'arrêté préfectoral, sans inventer de fréquence", () => {
    const ed = EDIBILITY["flet"];
    expect(ed.prep).toMatch(/arrêté préfectoral/i);
    expect(ed.anses).toBeUndefined();
    expect(ed.prep).not.toMatch(/fois (par|tous les)/i);
  });

  /**
   * Les lignées décrites par scission récente (goujons, vairons régionaux)
   * n'ont pas de donnée culinaire propre. Leur entrée est légitime — c'est le
   * même poisson dans l'assiette — à condition que la source le dise.
   */
  it("les lignées cryptiques annoncent que leur usage est rapporté à l'espèce sœur", () => {
    const CRYPTIQUES = [
      "goujon-occitan",
      "goujon-auvergne",
      "goujon-ukraine",
      "vairon-basque",
      "vairon-de-garonne",
      "vairon-du-danube",
      "vairon-du-languedoc",
    ];
    const sans = CRYPTIQUES.filter((id) => !/lignée cryptique/i.test(EDIBILITY[id]?.source ?? ""));
    expect(sans).toEqual([]);
  });
});
