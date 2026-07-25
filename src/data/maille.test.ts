import { describe, it, expect } from "vitest";
import { strictestCm, localMaille } from "./regulation";

describe("strictestCm", () => {
  it("lit une taille simple", () => {
    expect(strictestCm("60 cm")).toBe(60);
  });

  it("ignore la catégorie entre parenthèses", () => {
    expect(strictestCm("50 cm (2ᵉ cat.)")).toBe(50);
  });

  // Un arrêté peut poser une exception : « 20 cm sur les cours listés, sinon
  // 23 cm ». Retenir la plus GRANDE est le seul choix sûr — annoncer 20 cm
  // ferait garder un poisson en infraction hors des cours listés, alors que
  // l'inverse ne fait que relâcher un poisson qu'on aurait pu garder.
  it("retient la plus grande quand l'arrêté en donne plusieurs", () => {
    expect(strictestCm("20 cm (cours listés : Thaurion, Maulde…) sinon 23 cm")).toBe(23);
  });

  it("gère la virgule décimale", () => {
    expect(strictestCm("23,5 cm")).toBe(23.5);
  });

  it("rend null quand aucune taille n'est mentionnée", () => {
    expect(strictestCm("à vérifier sur l'arrêté")).toBeNull();
    expect(strictestCm("")).toBeNull();
  });

  it("n'attrape pas un nombre qui n'est pas une taille", () => {
    expect(strictestCm("3 carnassiers/jour dont 2 brochets")).toBeNull();
  });
});

describe("localMaille", () => {
  it("rend la maille départementale du brochet", () => {
    const m = localMaille("41", "brochet");
    expect(m).not.toBeNull();
    expect(m?.cm).toBe(60);
    expect(m?.text).toContain("60 cm");
  });

  it("couvre le brochet aquitain comme le brochet", () => {
    expect(localMaille("41", "brochet-aquitain")?.cm).toBe(60);
  });

  it("rend la maille départementale du sandre", () => {
    expect(localMaille("41", "sandre")?.cm).toBe(50);
  });

  it("rend la maille départementale de la truite", () => {
    expect(localMaille("36", "truite-fario")?.cm).toBe(23);
  });

  it("les trois départements relèvent le brochet à 60 cm", () => {
    for (const d of ["23", "36", "41"] as const) {
      expect(localMaille(d, "brochet")?.cm).toBe(60);
    }
  });

  it("rend null pour une espèce sans spécificité départementale", () => {
    expect(localMaille("41", "carpe-commune")).toBeNull();
    expect(localMaille("41", "gardon")).toBeNull();
  });
});
