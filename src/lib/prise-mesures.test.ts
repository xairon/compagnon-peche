// Tests de la validation des mesures (BUG-01/BUG-02 du rapport QA 2026-08-11).
import { describe, it, expect } from "vitest";
import {
  MAX_POIDS_KG,
  MAX_TAILLE_CM,
  parsePoids,
  parseTaille,
  tailleRecordValide,
} from "./prise-mesures";

describe("parseTaille", () => {
  it("accepte une taille normale", () => {
    expect(parseTaille("52")).toEqual({ value: 52, erreur: null });
  });

  it("accepte une taille au maximum plausible (silure record du monde ~285 cm)", () => {
    expect(parseTaille("285")).toEqual({ value: 285, erreur: null });
  });

  it("accepte les zéros de tête", () => {
    expect(parseTaille("052")).toEqual({ value: 52, erreur: null });
  });

  it("rejette les tailles négatives (BUG-01)", () => {
    const r = parseTaille("-10");
    expect(r.value).toBeNull();
    expect(r.erreur).toMatch(/entre 1 et/);
  });

  it("rejette les valeurs extrêmes (BUG-02 : 999999)", () => {
    const r = parseTaille("999999");
    expect(r.value).toBeNull();
    expect(r.erreur).toMatch(/entre 1 et/);
  });

  it("rejette zéro", () => {
    expect(parseTaille("0").erreur).not.toBeNull();
  });

  it("rejette les non-entiers (décimal, texte)", () => {
    expect(parseTaille("32.5").erreur).not.toBeNull();
    expect(parseTaille("abc").erreur).not.toBeNull();
  });

  it("accepte le champ vide (mesure absente)", () => {
    expect(parseTaille("")).toEqual({ value: null, erreur: null });
    expect(parseTaille("   ")).toEqual({ value: null, erreur: null });
  });
});

describe("parsePoids", () => {
  it("accepte un poids normal (virgule française)", () => {
    expect(parsePoids("1,8")).toEqual({ value: 1.8, erreur: null });
    expect(parsePoids("0.4")).toEqual({ value: 0.4, erreur: null });
  });

  it("rejette les valeurs extrêmes (BUG-02 : 999999)", () => {
    const r = parsePoids("999999");
    expect(r.value).toBeNull();
    expect(r.erreur).toMatch(/entre 0 et/);
  });

  it("rejette les poids négatifs", () => {
    expect(parsePoids("-2").erreur).not.toBeNull();
  });

  it("rejette zéro et les valeurs non numériques", () => {
    expect(parsePoids("0").erreur).not.toBeNull();
    expect(parsePoids("abc").erreur).not.toBeNull();
  });

  it("rejette au-delà du plafond", () => {
    expect(parsePoids(String(MAX_POIDS_KG + 1)).erreur).not.toBeNull();
    expect(parsePoids(String(MAX_POIDS_KG))).toEqual({ value: MAX_POIDS_KG, erreur: null });
  });

  it("accepte le champ vide (poids facultatif)", () => {
    expect(parsePoids("")).toEqual({ value: null, erreur: null });
  });
});

describe("tailleRecordValide", () => {
  it("borne le record : ignore les valeurs corrompues", () => {
    expect(tailleRecordValide(999999)).toBe(false);
    expect(tailleRecordValide(-10)).toBe(false);
    expect(tailleRecordValide(0)).toBe(false);
    expect(tailleRecordValide(52)).toBe(true);
    expect(tailleRecordValide(285)).toBe(true);
    expect(tailleRecordValide(MAX_TAILLE_CM)).toBe(true);
  });
});
