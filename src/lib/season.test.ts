import { describe, it, expect } from "vitest";
import { SPECIES } from "../data/species";
import { season } from "./season";
import type { Species } from "../types";

const sp = (over: Partial<Species>): Species => ({ season: "toujours", ...over }) as Species;

describe("season — 1ʳᵉ catégorie (salmonidés)", () => {
  const trout = sp({ season: "cat1" });
  it("open in summer (2nd Sat March → 3rd Sun September)", () => {
    // 2026: open 14 Mar → 20 Sep
    expect(season(trout, new Date(2026, 5, 15)).open).toBe(true);
  });
  it("closed in winter", () => {
    expect(season(trout, new Date(2026, 0, 15)).open).toBe(false);
    expect(season(trout, new Date(2026, 10, 1)).open).toBe(false);
  });
  it("open on the closing day itself", () => {
    expect(season(trout, new Date(2026, 8, 20, 20, 0)).open).toBe(true); // 3rd Sun Sept 2026
  });
});

describe("season — brochet (closed late Jan → late Apr)", () => {
  const pike = sp({ season: "brochet" });
  it("open outside the closure", () => {
    expect(season(pike, new Date(2026, 0, 5)).open).toBe(true); // early Jan
    expect(season(pike, new Date(2026, 5, 1)).open).toBe(true); // June
    expect(season(pike, new Date(2026, 11, 1)).open).toBe(true); // December
  });
  it("closed mid-closure", () => {
    expect(season(pike, new Date(2026, 2, 15)).open).toBe(false); // mid-March
  });
});

describe("fermeture des carnassiers en 2ᵉ catégorie", () => {
  const sandre = SPECIES.find((s) => s.id === "sandre")!;
  const brochet = SPECIES.find((s) => s.id === "brochet")!;

  // Le code de l'environnement interdit vif/leurres susceptibles de prendre le
  // brochet pendant sa fermeture en 2ᵉ cat. — ce sont exactement les méthodes du
  // sandre, que la FDPPMA 36 ferme d'ailleurs sur la même fenêtre. Afficher
  // « ouverte toute l'année » était un faux feu vert.
  it("le sandre est fermé pendant la fermeture du brochet", () => {
    const mars = new Date(2026, 2, 15); // 15 mars 2026, en pleine fermeture
    expect(season(sandre, mars).open).toBe(false);
    expect(season(brochet, mars).open).toBe(false);
  });

  it("le sandre est ouvert hors de cette fenêtre", () => {
    const juillet = new Date(2026, 6, 15);
    expect(season(sandre, juillet).open).toBe(true);
  });

  it("le libellé de fermeture ne parle pas que du brochet", () => {
    const mars = new Date(2026, 2, 15);
    // Un libellé « Brochet fermé » sur une fiche sandre est incompréhensible.
    expect(season(sandre, mars).label).not.toContain("Brochet fermé");
  });
});

describe("season — special cases", () => {
  it("invasive species are always takeable", () => {
    expect(season(sp({ invasive: true, season: "cat1" }), new Date(2026, 0, 1))).toEqual({
      open: true,
      label: "Capture toute l'année",
    });
  });
  it("'toujours' species are always open", () => {
    expect(season(sp({ season: "toujours" }), new Date(2026, 0, 1)).open).toBe(true);
  });
});
