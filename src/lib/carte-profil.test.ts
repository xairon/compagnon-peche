import { describe, it, expect } from "vitest";
import { carteDuProfil } from "./carte-profil";

// Des profils existent déjà sur les appareils des testeurs, avec une année nue
// et rien d'autre. Les lire comme autre chose qu'une carte annuelle inventerait
// une information ; ne pas les lire du tout ferait disparaître le rappel
// d'échéance de gens qui l'avaient déjà.

describe("carteDuProfil", () => {
  it("lit une carte complète quand le profil en porte une", () => {
    const c = carteDuProfil({
      carte: { type: "hebdomadaire", debut: "2026-07-27", reciprocite: "EHGO" },
    });

    expect(c).toEqual({ type: "hebdomadaire", debut: "2026-07-27", reciprocite: "EHGO" });
  });

  it("relit un ancien profil — une année nue est une carte annuelle", () => {
    expect(carteDuProfil({ carteAnnee: 2026 })).toEqual({ type: "annuelle", annee: 2026 });
  });

  it("la carte détaillée prime sur l'ancienne année, jamais l'inverse", () => {
    const c = carteDuProfil({
      carteAnnee: 2024,
      carte: { type: "journaliere", debut: "2026-07-31" },
    });

    expect(c?.type).toBe("journaliere");
  });

  it("rien de renseigné → rien, et surtout pas une carte par défaut", () => {
    expect(carteDuProfil({})).toBeUndefined();
  });

  it("ne fabrique pas de réciprocité — non renseignée reste non renseignée", () => {
    expect(carteDuProfil({ carteAnnee: 2026 })?.reciprocite).toBeUndefined();
  });
});
