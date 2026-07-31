import { describe, it, expect } from "vitest";
import {
  fusionnerCoursEau,
  classesAuZoom,
  texteClassesMasquees,
  CLASSES_HYDRO,
  CLASSE_MINZOOM,
} from "./reseau-hydro";
import type { FeatureCollection } from "./sandre";

// fetchRivers n'interrogeait que CoursEau1. Le Sandre publie CoursEau1 à
// CoursEau5, par ordre de Strahler croissant — les grands cours d'eau d'abord,
// les ruisseaux en dernier.
//
// Mesuré le 31/07/2026 sur une boîte de 0,5° × 0,6° autour de Blois :
//   CoursEau1  10 tronçons   973 ko
//   CoursEau2   1 tronçon     34 ko
//   CoursEau3   4 tronçons    70 ko
//   CoursEau4  25 tronçons   191 ko
//   CoursEau5  15 tronçons    49 ko
// La carte montrait 10 cours d'eau sur 55 : elle affichait les fleuves et
// ratait les ruisseaux — précisément là où on pêche la truite.

const fc = (n: number, classe: string): FeatureCollection => ({
  type: "FeatureCollection",
  numberMatched: n,
  features: Array.from({ length: n }, (_, i) => ({
    type: "Feature" as const,
    geometry: null,
    properties: { CdEntiteHydrographique: `${classe}-${i}`, Classe: classe },
  })),
});

describe("fusionnerCoursEau", () => {
  it("réunit les cinq couches en un seul réseau", () => {
    const r = fusionnerCoursEau([fc(10, "1"), fc(1, "2"), fc(4, "3"), fc(25, "4"), fc(15, "5")]);

    expect(r.fc.features.length).toBe(55);
  });

  it("conserve la classe de chaque tronçon, pour que le trait puisse s'affiner", () => {
    const r = fusionnerCoursEau([fc(2, "1"), fc(3, "5")]);
    const classes = r.fc.features.map((f) => f.properties?.["Classe"]);

    expect(classes).toEqual(["1", "1", "5", "5", "5"]);
  });

  it("additionne les compteurs quand toutes les couches en publient un", () => {
    const r = fusionnerCoursEau([fc(10, "1"), fc(4, "3")]);

    expect(r.numberMatched).toBe(14);
  });

  it("n'annonce aucun total dès qu'une couche se tait", () => {
    // Additionner en comptant l'absente pour zéro annoncerait un total plus
    // petit que la réalité, et une carte amputée passerait pour complète.
    const muette: FeatureCollection = { type: "FeatureCollection", features: [] };
    const r = fusionnerCoursEau([fc(10, "1"), muette]);

    expect(r.numberMatched).toBeUndefined();
  });

  it("survit à une couche absente — un échec réseau n'efface pas les autres", () => {
    const r = fusionnerCoursEau([fc(10, "1"), null, fc(4, "3")]);

    expect(r.fc.features.length).toBe(14);
  });

  it("ne rend rien plutôt qu'un réseau vide déguisé en réseau", () => {
    expect(fusionnerCoursEau([]).fc.features).toEqual([]);
  });
});

describe("CLASSES_HYDRO et CLASSE_MINZOOM", () => {
  it("couvre les cinq couches publiées par le Sandre", () => {
    expect(CLASSES_HYDRO).toEqual([1, 2, 3, 4, 5]);
  });

  it("montre les grands cours d'eau plus tôt que les ruisseaux", () => {
    // CoursEau1 pesait à lui seul 973 ko sur la boîte mesurée, et les cinq
    // couches 1,32 Mo. Tout charger au premier niveau de zoom triplerait le
    // volume pour afficher des ruisseaux illisibles à cette échelle.
    expect(CLASSE_MINZOOM[1]).toBeLessThan(CLASSE_MINZOOM[5]);
  });

  it("garde les seuils croissants avec l'ordre de Strahler", () => {
    for (let i = 1; i < CLASSES_HYDRO.length; i++) {
      expect(CLASSE_MINZOOM[CLASSES_HYDRO[i]!]).toBeGreaterThanOrEqual(
        CLASSE_MINZOOM[CLASSES_HYDRO[i - 1]!],
      );
    }
  });
});

describe("classesAuZoom", () => {
  it("ne demande que les grands cours d'eau au zoom régional", () => {
    expect(classesAuZoom(9)).toEqual([1]);
  });

  it("ajoute les ordres suivants à mesure qu'on zoome", () => {
    expect(classesAuZoom(10)).toEqual([1, 2, 3]);
    expect(classesAuZoom(11)).toEqual([1, 2, 3, 4, 5]);
    expect(classesAuZoom(15)).toEqual([1, 2, 3, 4, 5]);
  });

  it("ne demande rien sous le seuil de la couche", () => {
    expect(classesAuZoom(8)).toEqual([]);
  });
});

describe("texteClassesMasquees", () => {
  it("dit que des cours d'eau manquent parce qu'on n'a pas zoomé — pas parce qu'il n'y en a pas", () => {
    // Sans ça, une carte à laquelle on a délibérément retiré 45 tronçons sur 55
    // se lit comme une carte complète.
    expect(texteClassesMasquees(9)).toMatch(/zoom/i);
  });

  it("se tait quand tout le réseau est demandé", () => {
    expect(texteClassesMasquees(12)).toBeNull();
  });
});
