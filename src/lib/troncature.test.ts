import { describe, it, expect } from "vitest";
import { troncature, texteTroncature, compteurWfs } from "./troncature";

// Les réponses WFS du Sandre sont plafonnées par un COUNT, et rien ne le disait.
//
// Trois situations mesurées le 31/07/2026, sur une boîte de 0,5° × 0,6° autour
// de Blois :
//   CoursEau1    COUNT=500  numberMatched=10   10 features   → complet
//   PlanEau_FXX  COUNT=400  numberMatched=316  316 features  → complet
//   ObstEcoul    COUNT=200  pas de numberMatched, 200 features → saturé, total inconnu
//
// La troisième est la vraie surprise : la couche des obstacles ne publie AUCUN
// compteur. Le seul signal est que le nombre rendu égale exactement le plafond.

describe("troncature", () => {
  it("dit « complet » quand la source annonce moins que le plafond", () => {
    expect(troncature({ numberMatched: 316, rendus: 316, plafond: 400 })).toEqual({
      etat: "complet",
      rendus: 316,
      total: 316,
    });
  });

  it("dit combien manquent quand la source publie son total", () => {
    expect(troncature({ numberMatched: 340, rendus: 200, plafond: 200 })).toEqual({
      etat: "tronque",
      rendus: 200,
      total: 340,
    });
  });

  it("avoue ne pas connaître le total quand la source ne le publie pas", () => {
    // ObstEcoul : 200 rendus pour un plafond de 200, sans numberMatched. On sait
    // qu'il en manque peut-être ; on ne sait pas combien, et c'est un troisième
    // état, pas un « complet » par défaut.
    expect(troncature({ numberMatched: undefined, rendus: 200, plafond: 200 })).toEqual({
      etat: "sature",
      rendus: 200,
      total: null,
    });
  });

  it("ne crie pas à la troncature sur une réponse courte sans compteur", () => {
    expect(troncature({ numberMatched: undefined, rendus: 12, plafond: 200 }).etat).toBe("complet");
  });

  it("croit le compteur plutôt que le nombre rendu quand les deux se contredisent", () => {
    // Une source qui annonce 900 et n'en rend que 200 est tronquée, même si le
    // plafond était plus large : le compteur est l'information, pas le tri.
    expect(troncature({ numberMatched: 900, rendus: 200, plafond: 500 }).etat).toBe("tronque");
  });
});

describe("texteTroncature", () => {
  it("ne dit rien quand tout est là — une carte complète n'a pas à se justifier", () => {
    expect(texteTroncature(troncature({ numberMatched: 10, rendus: 10, plafond: 500 }), "cours d'eau")).toBeNull();
  });

  it("chiffre ce qui manque quand le total est connu", () => {
    const t = texteTroncature(troncature({ numberMatched: 340, rendus: 200, plafond: 200 }), "ouvrages");

    expect(t).toBe("200 ouvrages affichés sur 340 dans la zone — zoomez pour voir le reste.");
  });

  it("dit qu'il en manque sans inventer un total quand la source se tait", () => {
    const t = texteTroncature(troncature({ numberMatched: undefined, rendus: 200, plafond: 200 }), "ouvrages");

    expect(t).toBe(
      "200 ouvrages affichés, soit le maximum demandé — la source ne dit pas combien il y en a en tout. Zoomez pour en voir davantage.",
    );
  });
});

describe("compteurWfs", () => {
  it("lit le compteur quand la couche le publie", () => {
    expect(compteurWfs({ numberMatched: 316 })).toBe(316);
  });

  it("rend « inconnu », jamais zéro, quand la couche ne le publie pas", () => {
    // ObstEcoul n'en a pas. Le lire comme 0 ferait conclure « la source dit
    // qu'il n'y a rien », alors qu'elle n'a rien dit du tout.
    expect(compteurWfs({ features: [] })).toBeUndefined();
    expect(compteurWfs(null)).toBeUndefined();
    expect(compteurWfs({ numberMatched: "316" })).toBeUndefined();
  });
});
