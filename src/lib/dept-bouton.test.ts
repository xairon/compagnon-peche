import { describe, it, expect } from "vitest";
import { etatBoutonDept, extraitsReg } from "./dept-bouton";
import { DEPARTEMENTS, DEPT_REG, type DeptId } from "../data/regulation";

// Le bouton département de l'Accueil doit dire ce que l'app SAIT, pas ce
// qu'elle suppose : « on ne vous a jamais demandé » et « vous avez répondu 41 »
// ne peuvent pas s'afficher pareil — le défaut (Loir-et-Cher, « 6 truites/jour »)
// est plus permissif que la loi de l'Indre (« 6 salmonidés dont 2 fario max »).

describe("etatBoutonDept", () => {
  it("annonce la réglementation appliquée quand le pêcheur a choisi", () => {
    const e = etatBoutonDept({ dept: "36", deptChosen: true, outOfZoneDept: null });

    expect(e.ton).toBe("confirme");
    expect(e.nom).toBe("Indre (36)");
  });

  it("distingue « jamais demandé » de « choisi » — un défaut n'est pas une réponse", () => {
    const e = etatBoutonDept({ dept: "41", deptChosen: false, outOfZoneDept: null });

    expect(e.ton).toBe("defaut");
  });

  it("signale le hors-zone en nommant le département détecté", () => {
    const e = etatBoutonDept({ dept: "41", deptChosen: true, outOfZoneDept: "37" });

    expect(e.ton).toBe("hors-zone");
    expect(e.detail).toContain("37");
  });

  it("le hors-zone prime sur le défaut : c'est le constat le plus précis", () => {
    const e = etatBoutonDept({ dept: "41", deptChosen: false, outOfZoneDept: "37" });

    expect(e.ton).toBe("hors-zone");
  });

  it("nomme toujours le département dont la réglementation est réellement appliquée", () => {
    // Hors zone, l'app continue d'appliquer le 41 : le taire laisserait croire
    // que les chiffres affichés viennent du 37.
    const e = etatBoutonDept({ dept: "41", deptChosen: true, outOfZoneDept: "37" });

    expect(e.nom).toBe(DEPARTEMENTS["41"].name);
  });
});

describe("extraitsReg", () => {
  it("cite la valeur entière, jamais tronquée — « sinon 23 cm » change le verdict", () => {
    const truite = extraitsReg("23").find((e) => e.cle === "truiteMaille");

    expect(truite?.valeur).toBe(DEPT_REG["23"].truiteMaille);
    expect(truite?.valeur).toContain("sinon 23 cm");
  });

  it("chaque département couvert rend un extrait distinct — sinon le choix ne se voit pas", () => {
    const rendu = (id: DeptId) =>
      extraitsReg(id)
        .map((e) => `${e.label}: ${e.valeur}`)
        .join(" | ");

    const tous = (Object.keys(DEPARTEMENTS) as DeptId[]).map(rendu);

    expect(new Set(tous).size).toBe(tous.length);
  });

  it("ne retient que des champs réellement présents dans DEPT_REG", () => {
    for (const e of extraitsReg("41")) {
      expect(DEPT_REG["41"][e.cle]).toBe(e.valeur);
    }
  });
});
