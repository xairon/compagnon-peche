import { describe, it, expect } from "vitest";
import { effectiveMaille } from "./maille";
import { SPECIES } from "../data/species";

const sp = (id: string) => SPECIES.find((s) => s.id === id)!;

describe("effectiveMaille", () => {
  it("retient l'arrêté départemental quand il est plus strict", () => {
    const m = effectiveMaille(sp("brochet"), "41");
    expect(m.cm).toBe(60);
    expect(m.local).toBe(true);
    expect(m.aboveNational).toBe(true);
  });

  it("ne prétend pas « au-dessus du national » quand la valeur est identique", () => {
    // Black-bass : 30 cm au national comme dans les trois arrêtés.
    const m = effectiveMaille(sp("black-bass"), "41");
    expect(m.cm).toBe(30);
    expect(m.aboveNational).toBe(false);
  });

  // Le garde-fou qui manquait : l'invariant « l'arrêté ne peut qu'être plus
  // strict » est FAUX (R436-19 laisse le préfet abaisser la maille truite sur
  // certains cours). En annoncer la plus petite ferait garder un poisson en
  // infraction ailleurs dans le département — on ne descend jamais sous le
  // socle national.
  it("ne descend jamais sous le socle national", () => {
    const m = effectiveMaille(sp("truite-fario"), "23");
    expect(m.cm).toBeGreaterThanOrEqual(23);
  });

  it("sans spécificité départementale, rend la maille nationale", () => {
    const m = effectiveMaille(sp("ombre"), "41");
    expect(m.cm).toBe(30);
    expect(m.local).toBe(false);
    expect(m.aboveNational).toBe(false);
  });

  it("rend 0 pour une espèce sans maille légale", () => {
    const m = effectiveMaille(sp("gardon"), "41");
    expect(m.cm).toBe(0);
    expect(m.local).toBe(false);
  });

  it("sans département, s'en tient au national", () => {
    expect(effectiveMaille(sp("brochet"), undefined).cm).toBe(50);
  });

  it("le sandre passe à 50 cm dans les trois départements", () => {
    for (const d of ["23", "36", "41"] as const) {
      expect(effectiveMaille(sp("sandre"), d).cm).toBe(50);
    }
  });

  it("garde le texte de l'arrêté, exceptions comprises, pour vérification", () => {
    const m = effectiveMaille(sp("truite-fario"), "23");
    expect(m.text).toMatch(/cours listés/i);
  });
});

/**
 * Réduire toute maille à un entier effaçait les formulations non numériques :
 * l'esturgeon européen, protégé en tout point du territoire, passait de
 * « Interdit » à « Pas de maille » — strictement plus permissif que la loi.
 */
describe("effectiveMaille — mailles non numériques", () => {
  it("conserve « Interdit » pour l'esturgeon européen", () => {
    const m = effectiveMaille(sp("esturgeon-europeen"), "41");
    expect(m.cm).toBe(0);
    expect(m.label).toBe("Interdit");
  });

  it("conserve la formulation du saumon plutôt que de l'effacer", () => {
    const m = effectiveMaille(sp("saumon-atlantique"), "41");
    expect(m.label).not.toBeNull();
    expect(m.label).not.toBe("0 cm");
  });

  it("une espèce sans maille du tout ne porte pas de libellé", () => {
    expect(effectiveMaille(sp("gardon"), "41").label).toBeNull();
  });

  it("une maille numérique s'affiche en centimètres", () => {
    expect(effectiveMaille(sp("brochet"), "41").label).toBe("60 cm");
  });
});
