import { describe, it, expect } from "vitest";
import {
  classeO2,
  classeSaturationO2,
  sursaturationO2,
  classePh,
  classeGlobale,
  classeLabel,
  isStaleQuality,
  isTooFar,
  MAX_DIST_KM,
} from "./qualiteEau";

describe("classeO2 — seuils SEQ-Eau v2 (mg/L O2)", () => {
  it("8 mg/L pile au seuil → très bon (borne incluse)", () => {
    expect(classeO2(8)).toBe("tres_bon");
  });
  it("9 mg/L → très bon", () => {
    expect(classeO2(9)).toBe("tres_bon");
  });
  it("7 mg/L → bon", () => {
    expect(classeO2(7)).toBe("bon");
  });
  it("6 mg/L pile au seuil → bon", () => {
    expect(classeO2(6)).toBe("bon");
  });
  it("5 mg/L → moyen", () => {
    expect(classeO2(5)).toBe("moyen");
  });
  it("3.5 mg/L → médiocre", () => {
    expect(classeO2(3.5)).toBe("mediocre");
  });
  it("2 mg/L → mauvais", () => {
    expect(classeO2(2)).toBe("mauvais");
  });
});

describe("classeSaturationO2 — seuils SEQ-Eau v2 (%)", () => {
  it("95% → très bon", () => {
    expect(classeSaturationO2(95)).toBe("tres_bon");
  });
  it("90% pile au seuil → très bon", () => {
    expect(classeSaturationO2(90)).toBe("tres_bon");
  });
  it("80% → bon", () => {
    expect(classeSaturationO2(80)).toBe("bon");
  });
  it("60% → moyen", () => {
    expect(classeSaturationO2(60)).toBe("moyen");
  });
  it("40% → médiocre", () => {
    expect(classeSaturationO2(40)).toBe("mediocre");
  });
  it("10% → mauvais", () => {
    expect(classeSaturationO2(10)).toBe("mauvais");
  });

  it("reste fidèle à la grille au-dessus de 100 %, qui n'y pose aucune borne", () => {
    // Vérifié sur la grille officielle (p. 2, « Taux de saturation en oxygène (%) » :
    // 90 / 70 / 50 / 30) : SEQ-Eau v2 ne borne QUE le déficit. Inventer une
    // borne haute et la présenter comme SEQ-Eau serait fabriquer une source.
    expect(classeSaturationO2(224)).toBe("tres_bon");
  });
});

describe("sursaturationO2 — ce que la grille ne couvre pas", () => {
  // Mesuré sur Hub'Eau v2, département 41, 500 analyses du paramètre 1312 :
  // 127 au-dessus de 110 %, 91 au-dessus de 120 %, maximum 224 %. Une eau à
  // 224 % de saturation est en pleine efflorescence algale — production diurne
  // massive, donc anoxie nocturne et poisson qui décroche. La grille la classe
  // « très bonne » parce qu'elle a été bâtie pour détecter le manque d'oxygène,
  // pas l'excès. L'app ne peut ni contredire la grille ni se taire.
  it("ne signale rien dans la plage que la grille sait juger", () => {
    expect(sursaturationO2(95)).toBe(false);
    expect(sursaturationO2(60)).toBe(false);
  });

  it("signale une sursaturation franche", () => {
    expect(sursaturationO2(224)).toBe(true);
    expect(sursaturationO2(130)).toBe(true);
  });

  it("ne se déclenche pas sur une variation diurne ordinaire", () => {
    // Un cours d'eau sain oscille couramment autour de 100-110 % l'après-midi.
    expect(sursaturationO2(110)).toBe(false);
  });
});

describe("classePh — bandes emboîtées autour de la neutralité (SEQ-Eau v2 p.4)", () => {
  it("7.0 (neutre) → très bon", () => {
    expect(classePh(7.0)).toBe("tres_bon");
  });
  it("6.5 pile à la borne basse très bon → très bon", () => {
    expect(classePh(6.5)).toBe("tres_bon");
  });
  it("8.2 pile à la borne haute très bon → très bon", () => {
    expect(classePh(8.2)).toBe("tres_bon");
  });
  it("6.0 (dans la bande bon, hors très bon) → bon", () => {
    expect(classePh(6.0)).toBe("bon");
  });
  it("8.7 (dans la bande bon côté haut) → bon", () => {
    expect(classePh(8.7)).toBe("bon");
  });
  it("5.7 (bande moyen) → moyen", () => {
    expect(classePh(5.7)).toBe("moyen");
  });
  it("9.3 (bande moyen côté haut) → moyen", () => {
    expect(classePh(9.3)).toBe("moyen");
  });
  it("4.8 (bande médiocre) → médiocre", () => {
    expect(classePh(4.8)).toBe("mediocre");
  });
  it("3.0 (hors grille) → mauvais", () => {
    expect(classePh(3.0)).toBe("mauvais");
  });
  it("11 (trop basique, hors grille) → mauvais", () => {
    expect(classePh(11)).toBe("mauvais");
  });
});

describe("classeGlobale — le paramètre le plus dégradé l'emporte", () => {
  it("aucun paramètre fourni → null", () => {
    expect(classeGlobale([])).toBeNull();
    expect(classeGlobale([undefined, undefined])).toBeNull();
  });
  it("un seul paramètre → sa propre classe", () => {
    expect(classeGlobale(["bon"])).toBe("bon");
  });
  it("tous très bons → très bon", () => {
    expect(classeGlobale(["tres_bon", "tres_bon", "tres_bon"])).toBe("tres_bon");
  });
  it("un paramètre mauvais parmi de bons → mauvais (déclassant)", () => {
    expect(classeGlobale(["tres_bon", "bon", "mauvais"])).toBe("mauvais");
  });
  it("ignore les paramètres absents", () => {
    expect(classeGlobale(["bon", undefined, "moyen"])).toBe("moyen");
  });
});

describe("classeLabel — ton réutilisant .verdict-banner.{good,warn,bad}", () => {
  it("très bon / bon → ton good", () => {
    expect(classeLabel("tres_bon").tone).toBe("good");
    expect(classeLabel("bon").tone).toBe("good");
  });
  it("moyen → ton warn", () => {
    expect(classeLabel("moyen").tone).toBe("warn");
  });
  it("médiocre / mauvais → ton bad", () => {
    expect(classeLabel("mediocre").tone).toBe("bad");
    expect(classeLabel("mauvais").tone).toBe("bad");
  });
});

describe("isStaleQuality — fraîcheur (~18 mois)", () => {
  it("date d'aujourd'hui → pas ancienne", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(isStaleQuality(today)).toBe(false);
  });
  it("date de plus de 540 jours → ancienne", () => {
    const old = new Date(Date.now() - 600 * 86400000).toISOString().slice(0, 10);
    expect(isStaleQuality(old)).toBe(true);
  });
  it("date invalide → jamais une exception, considérée non ancienne", () => {
    expect(() => isStaleQuality("n'importe quoi")).not.toThrow();
    expect(isStaleQuality("n'importe quoi")).toBe(false);
  });
});

describe("isTooFar / MAX_DIST_KM — seuil de distance", () => {
  it("pile au seuil → pas trop loin (borne incluse)", () => {
    expect(isTooFar(MAX_DIST_KM)).toBe(false);
  });
  it("juste au-delà du seuil → trop loin", () => {
    expect(isTooFar(MAX_DIST_KM + 0.01)).toBe(true);
  });
  it("station toute proche → pas trop loin", () => {
    expect(isTooFar(0.5)).toBe(false);
  });
});
