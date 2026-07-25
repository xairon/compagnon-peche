import { describe, it, expect } from "vitest";
import { strictestCm, localMaille, cat1Season, cat1OuvertureLabel, cat1FermetureLabel, localRegRows } from "./regulation";

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

// Les dates d'ouverture/fermeture de la 1ʳᵉ catégorie ne doivent JAMAIS être
// recopiées en dur (elles périment chaque année) : elles doivent être calculées
// à la demande, comme le fait déjà src/lib/season.ts (2ᵉ samedi de mars → 3ᵉ
// dimanche de septembre). Ces tests échouent si quelqu'un les remplace par une
// constante figée du type "14 mars 2026".
describe("cat1Season (dates dérivées, pas codées en dur)", () => {
  it("2027 : l'ouverture tombe un samedi de mars", () => {
    const { open } = cat1Season(2027);
    expect(open.getDay()).toBe(6); // samedi
    expect(open.getMonth()).toBe(2); // mars (0-indexé)
    expect(open.getFullYear()).toBe(2027);
  });

  it("2027 : la fermeture tombe un dimanche de septembre", () => {
    const { close } = cat1Season(2027);
    expect(close.getDay()).toBe(0); // dimanche
    expect(close.getMonth()).toBe(8); // septembre
    expect(close.getFullYear()).toBe(2027);
  });

  it("2028 : la même règle s'applique, avec une date différente de 2027", () => {
    const { open: open2027 } = cat1Season(2027);
    const { open: open2028, close: close2028 } = cat1Season(2028);
    expect(open2028.getDay()).toBe(6);
    expect(open2028.getMonth()).toBe(2);
    expect(open2028.getFullYear()).toBe(2028);
    expect(close2028.getDay()).toBe(0);
    expect(close2028.getMonth()).toBe(8);
    expect(open2028.getTime()).not.toBe(open2027.getTime());
  });

  it("les libellés reflètent l'année demandée, jamais 2026 en dur", () => {
    expect(cat1OuvertureLabel(2027)).toContain("2027");
    expect(cat1OuvertureLabel(2027)).not.toContain("2026");
    expect(cat1FermetureLabel(2028)).toContain("2028");
    expect(cat1FermetureLabel(2028)).not.toContain("2026");
  });

  it("localRegRows relaie les dates calculées pour l'année demandée", () => {
    const rows = localRegRows("41", "truite-fario", 2027);
    const ouverture = rows.find(([k]) => k === "Ouverture (1ʳᵉ cat.)");
    const fermeture = rows.find(([k]) => k === "Fermeture (1ʳᵉ cat.)");
    expect(ouverture?.[1]).toBe(cat1OuvertureLabel(2027));
    expect(fermeture?.[1]).toBe(cat1FermetureLabel(2027));
  });
});
