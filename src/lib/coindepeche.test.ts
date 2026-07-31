import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseRegCoindepeche } from "./coindepeche";

// Test de contrat sur charge utile réelle : les deux fichiers sont les pages
// telles que coindepeche.fr les a servies le 31/07/2026. Si le site change son
// gabarit, ces tests ne bougent pas — mais le scraper qui rejoue le parseur sur
// des pages fraîches, lui, cassera, et c'est le but : on saura que la donnée
// importée n'est plus celle qu'on croit lire.

const fixture = (n: string) =>
  readFileSync(fileURLToPath(new URL(`./__fixtures__/${n}`, import.meta.url)), "utf8");

const INDRE = fixture("coindepeche-reglementation-36-indre.html");
const PYRA = fixture("coindepeche-reglementation-64-pyrenees-atlantiques.html");
const URL_INDRE = "https://www.coindepeche.fr/reglementation/36-indre";

describe("parseRegCoindepeche", () => {
  it("lit le département dans le titre de la page", () => {
    const r = parseRegCoindepeche(INDRE, URL_INDRE);

    expect(r?.code).toBe("36");
    expect(r?.nom).toBe("Indre");
  });

  it("relève les quatre blocs espèce servis pour l'Indre", () => {
    const r = parseRegCoindepeche(INDRE, URL_INDRE);

    expect(r?.especes.map((e) => e.espece)).toEqual([
      "Truite",
      "Carnassier",
      "Anguille",
      "Écrevisse",
    ]);
  });

  it("recopie les valeurs telles qu'affichées, sans les réinterpréter", () => {
    const r = parseRegCoindepeche(INDRE, URL_INDRE);
    const truite = r?.especes.find((e) => e.espece === "Truite");

    expect(truite).toMatchObject({
      ouverture: "14 mars 2026",
      fermeture: "20 septembre 2026",
      // Espace insécable entre le nombre et l'unité, comme le site le sert.
      // Le normaliser en espace ordinaire serait une retouche : on ne retouche
      // pas la typographie d'une source qu'on cite.
      tailleMin: "23 cm",
      quotaJour: "6",
    });
  });

  it("« — » devient inconnu, jamais zéro ni « aucune limite »", () => {
    const r = parseRegCoindepeche(INDRE, URL_INDRE);
    const ecrevisse = r?.especes.find((e) => e.espece === "Écrevisse");

    // Le site n'affiche pas de quota écrevisse. Ne pas savoir n'est pas
    // « pas de quota » : la confusion autoriserait un prélèvement illimité.
    expect(ecrevisse?.quotaJour).toBeNull();
    expect(ecrevisse?.tailleMin).toBeNull();
  });

  it("conserve la note entière, décodée", () => {
    const r = parseRegCoindepeche(INDRE, URL_INDRE);
    const ecrevisse = r?.especes.find((e) => e.espece === "Écrevisse");

    expect(ecrevisse?.note).toBe(
      "Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année.",
    );
  });

  it("n'importe aucun statut ouvert/fermé — c'est l'horloge du site, pas une règle", () => {
    const r = parseRegCoindepeche(INDRE, URL_INDRE);

    expect(Object.keys(r!.especes[0]!).sort()).toEqual([
      "espece",
      "fermeture",
      "note",
      "ouverture",
      "quotaJour",
      "tailleMin",
    ]);
  });

  it("lit un département où le saumon existe, avec ses propres dates", () => {
    const r = parseRegCoindepeche(
      PYRA,
      "https://www.coindepeche.fr/reglementation/64-pyrenees-atlantiques",
    );
    const saumon = r?.especes.find((e) => e.espece === "Saumon");

    expect(r?.code).toBe("64");
    expect(saumon?.ouverture).toBe("21 mars 2026");
    expect(saumon?.quotaJour).toBe("1");
  });

  it("refuse une page qui n'est pas une fiche départementale", () => {
    expect(parseRegCoindepeche("<html><body>rien</body></html>", URL_INDRE)).toBeNull();
  });

  it("garde l'URL d'origine — la provenance voyage avec la donnée", () => {
    expect(parseRegCoindepeche(INDRE, URL_INDRE)?.url).toBe(URL_INDRE);
  });
});
