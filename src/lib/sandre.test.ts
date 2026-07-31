import { describe, it, expect } from "vitest";
import { obstacleInfo, passeTexte, riverName } from "./sandre";

// Measured on 129 ROE obstacles around Blois (bbox 47.40,1.20 → 47.70,1.50,
// fetched 31/07/2026). The distribution is the whole argument:
//
//   dispositif de franchissement piscicole
//     117  (champ vide)            → la source ne dit RIEN
//       9  "Absence de passe"      → la source dit NON (code 0)
//       3  un dispositif nommé     → la source dit OUI
//
//   état de l'ouvrage
//     109  Existant
//      15  Détruit partiellement
//       5  Détruit entièrement
//
// The app said "pas de passe à poissons" for 126 of the 129 — for the 117 the
// ROE leaves blank as much as for the 9 it explicitly marks. The nomenclature
// carries a code 0 "Absence de passe" precisely so that "none" can be recorded;
// if blank already meant none, that code would not exist. Merging the two
// invents a negative fact on 91 % of the obstacles.

/** Properties as the Sandre WFS actually returns them (empty strings, not null). */
const roe = (p: Record<string, unknown> = {}) => ({
  NomPrincipalObstEcoul: "Clapet de Chouzy",
  CdObstEcoul: "ROE13740",
  LbTypeOuvrage: "Seuil en rivière radier",
  LbEtOuvrage: "Existant",
  HautChutEtObstEcoul: "0.8",
  LbHautChutClObstEcoul: "De 0.5m à inférieure à 1m",
  CdTypeDispFranchPiscicole1: "",
  LbTypeDispFranchPiscicole1: "",
  DateMAJObstEcoul: "2012-12-13T00:00:00",
  ...p,
});

describe("obstacleInfo — franchissement", () => {
  it("dit « oui » quand le ROE nomme un dispositif", () => {
    const o = obstacleInfo(
      roe({ CdTypeDispFranchPiscicole1: "5", LbTypeDispFranchPiscicole1: "Passe à Anguille" }),
    );

    expect(o.franchissement).toBe("oui");
    expect(o.pass).toBe("Passe à Anguille");
  });

  it("dit « non » seulement quand le ROE l'affirme (code 0)", () => {
    const o = obstacleInfo(
      roe({ CdTypeDispFranchPiscicole1: "0", LbTypeDispFranchPiscicole1: "Absence de passe" }),
    );

    expect(o.franchissement).toBe("non");
    expect(o.pass).toBeNull();
  });

  it("dit « inconnu » quand le champ est vide — 117 ouvrages sur 129", () => {
    const o = obstacleInfo(roe());

    expect(o.franchissement).toBe("inconnu");
    expect(o.pass).toBeNull();
  });

  it("ne confond pas un champ vide avec une absence affirmée", () => {
    const vide = obstacleInfo(roe());
    const absent = obstacleInfo(
      roe({ CdTypeDispFranchPiscicole1: "0", LbTypeDispFranchPiscicole1: "Absence de passe" }),
    );

    expect(vide.franchissement).not.toBe(absent.franchissement);
  });

  it("rassemble les dispositifs multiples", () => {
    const o = obstacleInfo(
      roe({
        CdTypeDispFranchPiscicole1: "7",
        LbTypeDispFranchPiscicole1: "Pré-barrage",
        CdTypeDispFranchPiscicole2: "8",
        LbTypeDispFranchPiscicole2: "Rampe",
      }),
    );

    expect(o.pass).toBe("Pré-barrage + Rampe");
    expect(o.franchissement).toBe("oui");
  });

  it("un dispositif nommé l'emporte sur une absence déclarée au rang suivant", () => {
    const o = obstacleInfo(
      roe({
        CdTypeDispFranchPiscicole1: "0",
        LbTypeDispFranchPiscicole1: "Absence de passe",
        CdTypeDispFranchPiscicole2: "5",
        LbTypeDispFranchPiscicole2: "Passe à Anguille",
      }),
    );

    expect(o.franchissement).toBe("oui");
    expect(o.pass).toBe("Passe à Anguille");
  });
});

describe("passeTexte", () => {
  it("n'écrit « pas de passe » que pour une absence affirmée", () => {
    const dit = passeTexte(
      obstacleInfo(roe({ CdTypeDispFranchPiscicole1: "0", LbTypeDispFranchPiscicole1: "Absence de passe" })),
    );

    expect(dit).toMatch(/pas de passe/i);
  });

  it("écrit « non renseigné » quand la source se tait", () => {
    const dit = passeTexte(obstacleInfo(roe()));

    expect(dit).toMatch(/non renseign/i);
    expect(dit).not.toMatch(/pas de passe/i);
  });

  it("nomme le dispositif quand il y en a un", () => {
    const dit = passeTexte(
      obstacleInfo(roe({ CdTypeDispFranchPiscicole1: "8", LbTypeDispFranchPiscicole1: "Rampe" })),
    );

    expect(dit).toContain("Rampe");
  });
});

describe("obstacleInfo — état de l'ouvrage", () => {
  it("signale un ouvrage détruit entièrement", () => {
    // "Barrage de Blois" est dans le ROE, et détruit. L'app le posait sur la
    // carte comme un obstacle, sans le dire.
    const o = obstacleInfo(roe({ LbEtOuvrage: "Détruit entièrement" }));

    expect(o.debout).toBe(false);
    expect(o.etat).toBe("Détruit entièrement");
  });

  it("signale un ouvrage détruit partiellement, qui barre encore", () => {
    const o = obstacleInfo(roe({ LbEtOuvrage: "Détruit partiellement" }));

    expect(o.debout).toBe(true);
    expect(o.etat).toBe("Détruit partiellement");
  });

  it("ne dit rien de l'état quand l'ouvrage est simplement existant", () => {
    expect(obstacleInfo(roe()).etat).toBeNull();
    expect(obstacleInfo(roe()).debout).toBe(true);
  });

  it("ne suppose pas qu'un ouvrage est debout quand l'état manque", () => {
    const o = obstacleInfo(roe({ LbEtOuvrage: "" }));

    expect(o.etat).toBeNull();
    expect(o.debout).toBe(true); // on n'invente pas la destruction non plus
  });
});

describe("obstacleInfo — hauteur", () => {
  it("préfère la hauteur mesurée", () => {
    expect(obstacleInfo(roe({ HautChutEtObstEcoul: "1.25" })).height).toBe("1.25 m de chute");
  });

  it("retombe sur la classe de hauteur — 32 ouvrages sur les 38 sans mesure", () => {
    const o = obstacleInfo(roe({ HautChutEtObstEcoul: "" }));

    expect(o.height).toBe("0,5 à 1 m de chute");
  });

  it("traduit une classe ouverte vers le bas", () => {
    const o = obstacleInfo(
      roe({ HautChutEtObstEcoul: "", LbHautChutClObstEcoul: "Inférieure à 0.5m" }),
    );

    expect(o.height).toBe("moins de 0,5 m de chute");
  });

  it("traduit une classe ouverte vers le haut", () => {
    const o = obstacleInfo(
      roe({ HautChutEtObstEcoul: "", LbHautChutClObstEcoul: "Supérieure à 5m" }),
    );

    expect(o.height).toBe("plus de 5 m de chute");
  });

  it("ne dit rien quand la classe est indéterminée", () => {
    const o = obstacleInfo(
      roe({ HautChutEtObstEcoul: "", LbHautChutClObstEcoul: "Indéterminée" }),
    );

    expect(o.height).toBe("");
  });

  it("ne dit rien quand rien n'est renseigné", () => {
    expect(obstacleInfo(roe({ HautChutEtObstEcoul: "", LbHautChutClObstEcoul: "" })).height).toBe("");
  });

  it("ignore une hauteur non numérique plutôt que d'afficher NaN", () => {
    const o = obstacleInfo(roe({ HautChutEtObstEcoul: "n.c.", LbHautChutClObstEcoul: "" }));

    expect(o.height).toBe("");
  });
});

describe("obstacleInfo — fraîcheur de la fiche", () => {
  it("porte la date de mise à jour du ROE", () => {
    // 21 des 129 fiches n'en ont pas, et la moitié des autres datent d'avant
    // 2016 : l'ouvrage décrit peut avoir été effacé depuis.
    expect(obstacleInfo(roe()).maj).toBe("2012-12-13T00:00:00");
  });

  it("rend null quand la date manque", () => {
    expect(obstacleInfo(roe({ DateMAJObstEcoul: "" })).maj).toBeNull();
  });
});

describe("obstacleInfo — identité", () => {
  it("retombe sur le code ROE quand l'ouvrage n'est pas nommé", () => {
    const o = obstacleInfo(roe({ NomPrincipalObstEcoul: "" }));

    expect(o.name).toBe("ROE13740");
  });

  it("garde le type déclaré", () => {
    expect(obstacleInfo(roe()).type).toBe("Seuil en rivière radier");
  });
});

describe("riverName", () => {
  it("retire la nature du cours d'eau du libellé Sandre", () => {
    // Le Sandre écrit « rivière la cisse » ; on garde l'article, qui fait
    // partie du nom en français.
    expect(riverName({ NomEntiteHydrographique: "rivière la cisse" })).toBe("La cisse");
  });

  it("ne rend pas un libellé vide", () => {
    expect(riverName({})).toBe("Cours d'eau");
  });
});
