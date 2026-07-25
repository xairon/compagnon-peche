import { describe, it, expect } from "vitest";
import { SPECIES } from "./species";
import { localMaille } from "./regulation";

// Régression pour le défaut « deux écrans, deux vérités sur la maille brochet » :
// la fiche brochet affichait un doute ("à vérifier — certains départements
// relèvent à 60 cm" / "valeur départementale non vérifiée") alors que
// regulation.ts affirme 60 cm comme fait sourcé (arrêtés 23/36/41). La fiche
// ne doit plus contredire ce que le moteur de décision (localMaille) applique
// réellement.
describe("brochet — la fiche ne contredit plus regulation.ts", () => {
  const brochet = SPECIES.find((s) => s.id === "brochet");

  it("existe et porte une section réglementation", () => {
    expect(brochet?.reg).toBeDefined();
  });

  it("ne qualifie plus la valeur départementale de non vérifiée", () => {
    const text = JSON.stringify(brochet?.reg);
    expect(text).not.toMatch(/non vérifiée/i);
    expect(text).not.toMatch(/à vérifier — certains départements/i);
  });

  it("cite 60 cm comme valeur départementale, cohérente avec regulation.ts", () => {
    const deptRow = brochet?.reg?.rows.find(([k]) => /maille départementale/i.test(k));
    expect(deptRow?.[1]).toMatch(/60 cm/);
    for (const d of ["23", "36", "41"] as const) {
      expect(localMaille(d, "brochet")?.cm).toBe(60);
    }
  });

  it("garde malgré tout un rappel de vérifier l'arrêté (jamais un feu vert sec)", () => {
    const text = brochet?.reg?.note ?? "";
    expect(text).toMatch(/vérifi/i);
  });
});
