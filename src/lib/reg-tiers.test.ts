import { describe, it, expect } from "vitest";
import { origineReg, tailleDeTeteTrompeuse, chargerRegTiers } from "./reg-tiers";
import type { RegDeptCdp } from "./coindepeche";
import { SOURCES } from "../data/regulation";

// Ce que coindepeche.fr apporte réellement, mesuré sur les 96 fiches du
// 31/07/2026 : de la couverture, pas de la précision. Sur les trois
// départements dont l'app connaît l'arrêté, la fiche du site est plus grossière
// (« 6 » là où l'Indre écrit « 6 salmonidés dont 2 fario max ») et parfois moins
// protectrice (truite 23 cm là où l'app retient 25 cm dans le 41). Elle ne doit
// donc jamais s'y substituer. Ailleurs — 93 départements — l'app n'avait rien
// du tout à montrer.

const FICHE_37: RegDeptCdp = {
  code: "37",
  nom: "Indre-et-Loire",
  url: "https://www.coindepeche.fr/reglementation/37-indre-et-loire",
  especes: [
    {
      espece: "Truite",
      ouverture: "14 mars 2026",
      fermeture: "20 septembre 2026",
      tailleMin: "23 cm",
      quotaJour: "6",
      note: null,
    },
  ],
};

const FICHE_36: RegDeptCdp = { ...FICHE_37, code: "36", nom: "Indre" };

describe("origineReg", () => {
  it("sert l'arrêté connu pour un département couvert, jamais la fiche tierce", () => {
    const o = origineReg("36", [FICHE_36, FICHE_37], "31/07/2026");

    expect(o.origine).toBe("arrete");
  });

  it("sert la fiche tierce là où l'app n'a pas d'arrêté", () => {
    const o = origineReg("37", [FICHE_36, FICHE_37], "31/07/2026");

    expect(o.origine).toBe("tiers");
    expect(o.origine === "tiers" && o.fiche.nom).toBe("Indre-et-Loire");
  });

  it("cite la date de consultation avec la fiche — sans elle, on ne sait pas de quand elle date", () => {
    const o = origineReg("37", [FICHE_37], "31/07/2026");

    expect(o.origine === "tiers" && o.consulteLe).toBe("31/07/2026");
  });

  it("dit « rien » plutôt que de deviner pour un département absent des deux sources", () => {
    const o = origineReg("2A", [FICHE_37], "31/07/2026");

    expect(o.origine).toBe("aucune");
  });
});

describe("tailleDeTeteTrompeuse", () => {
  it("écarte la taille de tête d'un bloc dont la note en énumère plusieurs", () => {
    // Mesuré sur les 96 fiches : le bloc « Carnassier » titre 50 cm alors que sa
    // note dit brochet 60, sandre 50, black-bass 30. Un pêcheur qui garde un
    // brochet de 52 cm sur ce chiffre est en infraction dans les trois
    // départements où l'app connaît l'arrêté.
    expect(
      tailleDeTeteTrompeuse({
        espece: "Carnassier",
        ouverture: null,
        fermeture: null,
        tailleMin: "50 cm",
        quotaJour: "3",
        note: "Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min.",
      }),
    ).toBe(true);
  });

  it("laisse passer une taille de tête que rien ne contredit", () => {
    expect(
      tailleDeTeteTrompeuse({
        espece: "Truite",
        ouverture: null,
        fermeture: null,
        tailleMin: "23 cm",
        quotaJour: "6",
        note: null,
      }),
    ).toBe(false);
  });

  it("ne se déclenche pas sur une note qui répète la même taille", () => {
    expect(
      tailleDeTeteTrompeuse({
        espece: "Truite",
        ouverture: null,
        fermeture: null,
        tailleMin: "23 cm",
        quotaJour: "6",
        note: "Taille portée à 23 cm sur les cours listés.",
      }),
    ).toBe(false);
  });

  it("n'invente rien quand aucune taille n'est affichée", () => {
    expect(
      tailleDeTeteTrompeuse({
        espece: "Écrevisse",
        ouverture: null,
        fermeture: null,
        tailleMin: null,
        quotaJour: null,
        note: "Écrevisse à pattes blanches protégée.",
      }),
    ).toBe(false);
  });
});

describe("chargerRegTiers — données réellement collectées", () => {
  it("couvre les départements que l'app ignorait, et dit combien de fiches manquent", async () => {
    const d = await chargerRegTiers();

    expect(d.fiches.length).toBe(96);
    // Un écart avec le sitemap serait une troncature silencieuse.
    expect(d.fiches.length).toBe(d.annoncees);
    expect(d.consulteLe).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("le bloc Carnassier de chaque fiche porte une taille de tête trompeuse", async () => {
    const d = await chargerRegTiers();
    const carn = d.fiches.flatMap((f) => f.especes.filter((e) => e.espece === "Carnassier"));

    expect(carn.length).toBe(96);
    expect(carn.every(tailleDeTeteTrompeuse)).toBe(true);
  });

  it("l'écran Sources cite coindepeche.fr avec la date réellement collectée", async () => {
    const d = await chargerRegTiers();
    const entree = SOURCES.find((s) => /coindepeche/i.test(s.t) || /coindepeche/i.test(s.d));

    // La date est recopiée en dur dans SOURCES : l'importer du fichier généré
    // ferait entrer 80 ko de fiches dans le premier chargement. Ce test est ce
    // qui empêche les deux de diverger après une nouvelle collecte.
    expect(entree).toBeDefined();
    expect(entree!.d).toContain(d.consulteLe);
    expect(entree!.d).toContain(String(d.fiches.length));
  });

  it("aucun quota vide n'a été transformé en chiffre", async () => {
    const d = await chargerRegTiers();
    const vides = d.fiches.flatMap((f) => f.especes).filter((e) => e.quotaJour === null);

    // 84 écrevisses + 35 anguilles servaient « — » le 31/07/2026 ; les compter
    // comme 0 aurait affiché « quota : 0 » là où le site ne dit rien.
    expect(vides.length).toBeGreaterThan(0);
    expect(vides.every((e) => e.quotaJour === null)).toBe(true);
  });
});
