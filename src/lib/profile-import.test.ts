import { describe, it, expect } from "vitest";
import { isProfileEmpty } from "./storage";

/**
 * L'import ne remplit le profil que s'il est vide, pour ne jamais écraser ce
 * que l'utilisateur a saisi. Le prédicat ignorait la carte de pêche : un profil
 * ne contenant qu'une AAPPMA et une année de validité passait pour vide et
 * disparaissait à la première restauration de sauvegarde.
 */
describe("isProfileEmpty", () => {
  it("un profil absent est vide", () => {
    expect(isProfileEmpty(undefined)).toBe(true);
    expect(isProfileEmpty(null)).toBe(true);
    expect(isProfileEmpty({})).toBe(true);
  });

  it("un nom suffit à le rendre non vide", () => {
    expect(isProfileEmpty({ name: "Nicolas" })).toBe(false);
  });

  it("la carte de pêche seule suffit — c'est une donnée saisie à la main", () => {
    expect(isProfileEmpty({ aappma: "AAPPMA de Blois" })).toBe(false);
    expect(isProfileEmpty({ carteAnnee: 2026 })).toBe(false);
  });

  it("une carte détaillée compte autant que l'ancienne année nue", () => {
    // Même piège, nouveau champ : un profil ne portant qu'une journalière
    // passerait pour vide et serait écrasé à la première restauration.
    expect(isProfileEmpty({ carte: { type: "journaliere", debut: "2026-07-31" } })).toBe(false);
  });

  it("des champs vides restent vides", () => {
    expect(isProfileEmpty({ name: "", bio: "", region: "" })).toBe(true);
  });
});
