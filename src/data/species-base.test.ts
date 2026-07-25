import { describe, it, expect } from "vitest";
import { BASE_SPECIES } from "./species-base";
import { season } from "../lib/season";

// Régression pour le défaut « la gambusie n'est pas étiquetée invasive » :
// Gambusia holbrooki figure à l'annexe II-4 de l'arrêté du 14 février 2018
// (espèces exotiques envahissantes, règl. UE 1143/2014). Sans `invasive: true`,
// la fiche n'affichait pas l'interdiction de remise à l'eau vivante.
describe("gambusie — statut d'espèce exotique envahissante", () => {
  const gambusie = BASE_SPECIES.find((s) => s.id === "gambusie");

  it("existe dans le socle national", () => {
    expect(gambusie).toBeDefined();
  });

  it("est marquée invasive, avec sa base légale propre (comme le pseudorasbora)", () => {
    expect(gambusie?.invasive).toBe(true);
    expect(gambusie?.invasiveBasis).toBe("règl. UE 1143/2014 · arrêté 14 fév. 2018");
  });

  it("sa fiche affiche l'interdiction de remise à l'eau vivante", () => {
    const statutRow = gambusie?.reg?.rows.find(([k]) => k === "Statut");
    expect(statutRow?.[1]).toMatch(/exotique envahissante/i);
  });

  it("la saison la considère capturable toute l'année, comme toute espèce invasive", () => {
    expect(gambusie && season(gambusie, new Date(2026, 0, 15))).toEqual({
      open: true,
      label: "Capture toute l'année",
    });
  });
});
