import { describe, it, expect } from "vitest";
import { coursDuPoint, REFERENTIEL_SANDRE } from "./cours-du-point";
import type { FeatureCollection } from "./sandre";

// Le chaînon qui manquait : savoir SUR QUEL cours d'eau se trouve le pêcheur.
//
// Vérifié le 31/07/2026 sur la boîte de Blois : le WFS Sandre CoursEau1 publie
// CdEntiteHydrographique = "----0000" pour « la Loire », et Hub'Eau
// temperature/station publie code_cours_eau = "----0000" pour la même. Même
// référentiel Carthage, même valeur : le rapprochement se fait par code, jamais
// par libellé.

const fc = (props: Record<string, unknown>[]): FeatureCollection => ({
  type: "FeatureCollection",
  features: props.map((p) => ({ type: "Feature", geometry: null, properties: p })),
});

const LOIRE = { CdEntiteHydrographique: "----0000", NomEntiteHydrographique: "la Loire" };
const CISSE = { CdEntiteHydrographique: "K4464001", NomEntiteHydrographique: "la Cisse" };

describe("coursDuPoint", () => {
  it("nomme le cours d'eau quand la zone n'en contient qu'un", () => {
    const c = coursDuPoint(fc([LOIRE]));

    expect(c?.nom).toBe("Loire");
    expect(c?.code).toBe(`${REFERENTIEL_SANDRE}:----0000`);
  });

  it("accepte plusieurs tronçons du MÊME cours d'eau", () => {
    // CoursEau1 découpe un fleuve en tronçons : trois entrées « la Loire »
    // ne sont pas une ambiguïté.
    const c = coursDuPoint(fc([LOIRE, LOIRE, LOIRE]));

    expect(c?.code).toBe(`${REFERENTIEL_SANDRE}:----0000`);
  });

  it("n'en choisit aucun quand la zone en contient deux — un confluent n'est pas une réponse", () => {
    expect(coursDuPoint(fc([LOIRE, CISSE]))).toBeNull();
  });

  it("ne répond rien sur une zone vide", () => {
    expect(coursDuPoint(fc([]))).toBeNull();
  });

  it("ignore un tronçon sans code plutôt que de lui en inventer un", () => {
    const c = coursDuPoint(fc([LOIRE, { NomEntiteHydrographique: "sans code" }]));

    expect(c?.code).toBe(`${REFERENTIEL_SANDRE}:----0000`);
  });

  it("déclare le référentiel du Sandre comme celui de Hub'Eau, et pas « inconnu »", () => {
    // Sans cette déclaration, cleCours() préfixerait "?" et le code ne
    // s'apparierait jamais à celui de temperature/station — le critère du cours
    // d'eau ne se déclencherait tout simplement pas.
    expect(REFERENTIEL_SANDRE).toBe("CoursEau_Carthage2017");
  });
});
