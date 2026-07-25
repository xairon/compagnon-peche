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

describe("priseView — maille (arrêté départemental)", () => {
  // Le cas qui compte : l'arrêté préfectoral relève la maille au-dessus du
  // socle national. Annoncer la valeur nationale enverrait le pêcheur garder
  // un poisson en infraction.
  it("le brochet en 41 se mesure à 60 cm, pas aux 50 cm nationaux", () => {
    const v = priseView(sp({ id: "brochet", name: "Brochet", season: "brochet", maille: "50 cm" }), "maille", Q, "41");
    expect(v?.title).toContain("60 cm");
    expect(v?.banner).toContain("60 cm");
    expect(v?.title).not.toContain("50 cm");
  });

  it("le sandre en 41 se mesure à 50 cm, pas aux 40 cm nationaux", () => {
    const v = priseView(sp({ id: "sandre", name: "Sandre", season: "brochet", maille: "40 cm" }), "maille", Q, "41");
    expect(v?.title).toContain("50 cm");
  });

  it("cite le département pour que le pêcheur puisse vérifier", () => {
    const v = priseView(sp({ id: "brochet", name: "Brochet", season: "brochet", maille: "50 cm" }), "maille", Q, "41");
    expect((v?.paras.join(" ") + " " + (v?.note || "")).toLowerCase()).toMatch(/loir-et-cher|arrêté/);
  });

  it("sans spécificité départementale, garde la maille nationale", () => {
    const v = priseView(sp({ id: "carpe-commune", name: "Carpe", season: "toujours", maille: "—" }), "maille", Q, "41");
    expect(v?.title).toMatch(/pas de taille légale nationale/i);
  });

  it("une espèce à maille nationale seule reste inchangée", () => {
    const v = priseView(sp({ id: "ombre", name: "Ombre", season: "cat1", maille: "30 cm" }), "maille", Q, "41");
    expect(v?.title).toContain("30 cm");
  });
});
