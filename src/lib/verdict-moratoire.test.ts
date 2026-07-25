import { describe, it, expect } from "vitest";
import { priseView } from "./prise";
import { SPECIES } from "../data/species";

/**
 * Aucune espèce sous moratoire ne doit recevoir un feu vert.
 *
 * Un audit a retiré `protected: true` du saumon atlantique — juridiquement
 * fondé (l'arrêté du 8 déc. 1988 ne protège que les œufs et les frayères) —
 * mais le parcours ne connaissait pas la notion de moratoire : le verdict est
 * passé de « RELÂCHER » à « PÊCHE OUVERTE », pour une espèce dont la pêche est
 * fermée sur la plupart des bassins et soumise à TAC et timbre migrateur.
 * Plus permissif que la réalité : exactement ce qu'une app réglementaire ne
 * doit jamais faire.
 *
 * Ce test échoue si un moratoire redevient un feu vert.
 */
const sousMoratoire = SPECIES.filter((sp) =>
  JSON.stringify(sp.alert ?? "").toLowerCase().includes("moratoire"),
);

describe("verdict — espèces sous moratoire", () => {
  it("il y en a bien dans le jeu de données (sinon le test ne prouve rien)", () => {
    expect(sousMoratoire.length).toBeGreaterThan(0);
  });

  it("aucune ne reçoit « PÊCHE OUVERTE »", () => {
    const feuxVerts = sousMoratoire
      .map((sp) => ({ id: sp.id, v: priseView(sp, "statut", { c: 0, b: 0 }, "41") }))
      .filter(({ v }) => v?.banner === "PÊCHE OUVERTE")
      .map(({ id }) => id);
    expect(feuxVerts).toEqual([]);
  });

  it("aucune n'est présentée avec un ton « good »", () => {
    const bons = sousMoratoire
      .map((sp) => ({ id: sp.id, v: priseView(sp, "statut", { c: 0, b: 0 }, "41") }))
      .filter(({ v }) => v?.tone === "good")
      .map(({ id }) => id);
    expect(bons).toEqual([]);
  });

  it("le saumon atlantique renvoie vers l'arrêté du bassin", () => {
    const sp = SPECIES.find((s) => s.id === "saumon-atlantique");
    const v = priseView(sp, "statut", { c: 0, b: 0 }, "41");
    expect((v?.paras.join(" ") + " " + v?.title).toLowerCase()).toMatch(/arrêté|vérifi/);
  });
});
