import { describe, it, expect } from "vitest";
import { SPECIES } from "./species";
import { localMaille, NATIONAL_SIZES, strictestCm } from "./regulation";
import { season } from "../lib/season";
import type { Species } from "../types";

// Régression pour le défaut « deux écrans, deux vérités sur la maille brochet » :
// la fiche brochet affichait un doute ("à vérifier — certains départements
// relèvent à 60 cm" / "valeur départementale non vérifiée") alors que
// regulation.ts affirme 60 cm comme fait sourcé (arrêtés 23/36/41). La fiche
// ne doit plus contredire ce que le moteur de décision (localMaille) applique
// réellement.
describe("brochet — la fiche ne contredit plus regulation.ts", () => {
  const brochet = SPECIES.find((s) => s.id === "brochet");

  it("existe et porte une section réglementation", () => {
    expect(brochet?.reg).toBeDefined();
  });

  it("ne qualifie plus la valeur départementale de non vérifiée", () => {
    const text = JSON.stringify(brochet?.reg);
    expect(text).not.toMatch(/non vérifiée/i);
    expect(text).not.toMatch(/à vérifier — certains départements/i);
  });

  it("cite 60 cm comme valeur départementale, cohérente avec regulation.ts", () => {
    const deptRow = brochet?.reg?.rows.find(([k]) => /maille départementale/i.test(k));
    expect(deptRow?.[1]).toMatch(/60 cm/);
    for (const d of ["23", "36", "41"] as const) {
      expect(localMaille(d, "brochet")?.cm).toBe(60);
    }
  });

  it("garde malgré tout un rappel de vérifier l'arrêté (jamais un feu vert sec)", () => {
    const text = brochet?.reg?.note ?? "";
    expect(text).toMatch(/vérifi/i);
  });
});

// Régression pour le même défaut de fond que ci-dessus, généralisé : le brochet
// avait déjà divergé une fois entre le tableau NATIONAL_SIZES (« la » vérité
// nationale, affichée dans l'écran Réglement) et le champ `maille` de sa fiche
// espèce (species.ts). Ce test compare les DEUX chiffres pour chaque espèce
// nationale qui a une ligne dans NATIONAL_SIZES, pour qu'un futur écart soit
// détecté par la CI avant de tromper un pêcheur, pas après.
describe("NATIONAL_SIZES — cohérente avec le champ maille des espèces", () => {
  // Association explicite ligne NATIONAL_SIZES → id(s) d'espèce(s) concernée(s)
  // dans species.ts/species-base.ts. Les écrevisses ne sont pas un `Species`
  // (gérées à part par data/ecrevisses.ts) : exclues de la couverture ci-dessous.
  const MAPPING: [string, string[]][] = [
    ["Brochet", ["brochet", "brochet-aquitain"]],
    ["Sandre (2ᵉ cat.)", ["sandre"]],
    ["Black-bass (2ᵉ cat.)", ["black-bass", "black-bass-petite-bouche"]],
    ["Truites", ["truite-fario", "truite-arc-en-ciel"]],
    ["Ombre commun", ["ombre"]],
    ["Huchon", ["huchon"]],
  ];

  it("couvre toutes les lignes « poisson » de NATIONAL_SIZES", () => {
    const covered = new Set(MAPPING.map(([label]) => label));
    const fishRows = NATIONAL_SIZES.filter(([label]) => !/écrevisse/i.test(label));
    for (const [label] of fishRows) {
      expect(covered.has(label)).toBe(true);
    }
  });

  for (const [label, ids] of MAPPING) {
    for (const id of ids) {
      it(`${label} (${id}) : même taille en cm dans NATIONAL_SIZES et species.maille`, () => {
        const nationalRow = NATIONAL_SIZES.find(([l]) => l === label);
        expect(nationalRow).toBeDefined();
        const nationalCm = strictestCm(nationalRow![1]);

        const sp = SPECIES.find((s) => s.id === id);
        expect(sp).toBeDefined();
        const speciesCm = strictestCm(sp!.maille);

        expect(speciesCm).toBe(nationalCm);
      });
    }
  }
});

// Régression pour le défaut « deux écrans, deux vérités » découvert sur le
// sandre : le sandre fermait désormais avec le brochet (season.ts, règle
// "brochet"), mais sa ligne reg.rows "Période" affirmait encore "2ᵉ cat. :
// ouverte toute l'année" — une pastille rouge "● Fermée" en haut de fiche et
// un "toujours ouvert" quelques lignes plus bas, sur le même écran. Voir aussi
// l'anecdote esturgeon dans src/screens/Fiche.tsx.
//
// Ce test généralise l'invariant à TOUTES les espèces plutôt qu'au seul
// sandre : une espèce dont season() calcule au moins une fenêtre fermée dans
// l'année ne doit pas avoir une ligne "Période" qui prétend être ouverte
// toute l'année sans mentionner de fermeture (« fermé »/« sauf »).
describe("reg.rows Période — cohérente avec season() pour toutes les espèces", () => {
  // Un échantillon mensuel suffit : les fenêtres de fermeture actuelles
  // (brochet, 1ʳᵉ catégorie) durent plusieurs semaines et retombent forcément
  // sur au moins un 15 du mois.
  const SAMPLE_DATES = Array.from({ length: 12 }, (_, m) => new Date(2026, m, 15));

  function hasClosedWindow(sp: Species): boolean {
    return SAMPLE_DATES.some((d) => !season(sp, d).open);
  }

  // Texte qui affirme sans réserve une ouverture toute l'année : mentionne
  // "toute l'année" sans jamais évoquer une fermeture ("ferm…") ni une
  // exception ("sauf"). Le texte du brochet ("Fermé sauf : …") ou de
  // brochet-aquitain ("Fermeture spécifique…") ne matchent donc pas.
  function claimsOpenAllYearUnconditionally(text: string): boolean {
    return /toute l'ann[ée]e/i.test(text) && !/ferm/i.test(text) && !/\bsauf\b/i.test(text);
  }

  for (const sp of SPECIES) {
    const periodeRow = sp.reg?.rows.find(([k]) => /^périodes?$/i.test(k));
    if (!periodeRow) continue;
    const [, text] = periodeRow;

    it(`${sp.id} : la ligne "${periodeRow[0]}" ne contredit pas une fermeture calculée par season()`, () => {
      if (hasClosedWindow(sp)) {
        expect(claimsOpenAllYearUnconditionally(text)).toBe(false);
      }
    });
  }
});
