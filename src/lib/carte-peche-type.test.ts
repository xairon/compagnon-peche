import { describe, it, expect } from "vitest";
import {
  statutCarte,
  finValidite,
  joursRestants,
  phraseReciprocite,
  RECIPROCITES,
  type CarteDePeche,
} from "./carte-peche";

// Jusqu'ici l'app ne connaissait qu'une carte annuelle. Or la FNPF en vend aussi
// à la journée et à la semaine : dire à un pêcheur muni d'une journalière qu'il
// est « en règle jusqu'au 31 décembre » est une fausse assurance sur exactement
// le document qu'un garde lui demandera.

const jour = (a: number, m: number, j: number) => new Date(a, m - 1, j, 10, 0);

describe("statutCarte — cartes courtes", () => {
  it("une journalière ne vaut que son jour", () => {
    const c: CarteDePeche = { type: "journaliere", debut: "2026-07-31" };

    expect(statutCarte(c, jour(2026, 7, 31))).toBe("expire-bientot");
    expect(statutCarte(c, jour(2026, 8, 1))).toBe("perimee");
  });

  it("une journalière n'est pas valide la veille de son jour", () => {
    const c: CarteDePeche = { type: "journaliere", debut: "2026-07-31" };

    expect(statutCarte(c, jour(2026, 7, 30))).toBe("pas-encore-valide");
  });

  it("une hebdomadaire couvre sept jours consécutifs, premier jour compris", () => {
    const c: CarteDePeche = { type: "hebdomadaire", debut: "2026-07-27" };

    expect(statutCarte(c, jour(2026, 7, 27))).toBe("valide");
    expect(statutCarte(c, jour(2026, 8, 2))).toBe("expire-bientot"); // 7ᵉ jour
    expect(statutCarte(c, jour(2026, 8, 3))).toBe("perimee");
  });

  it("sans date de début, une carte courte reste inconnue — on ne devine pas l'achat", () => {
    expect(statutCarte({ type: "journaliere" }, jour(2026, 7, 31))).toBe("absente");
  });
});

describe("statutCarte — cartes annuelles", () => {
  it("garde le comportement connu sur une année en cours", () => {
    const c: CarteDePeche = { type: "annuelle", annee: 2026 };

    expect(statutCarte(c, jour(2026, 7, 25))).toBe("valide");
    expect(statutCarte(c, jour(2026, 12, 5))).toBe("expire-bientot");
    expect(statutCarte(c, jour(2027, 1, 1))).toBe("perimee");
  });

  it("une carte de l'année prochaine n'autorise pas à pêcher aujourd'hui", () => {
    // Les cartes N+1 sont en vente dès novembre. « Valide » sur une carte 2027
    // au 1ᵉʳ décembre 2026 dirait au pêcheur qu'il est en règle alors qu'il ne
    // l'est pas : la carte ne prend effet que le 1ᵉʳ janvier.
    expect(statutCarte({ type: "annuelle", annee: 2027 }, jour(2026, 12, 1))).toBe(
      "pas-encore-valide",
    );
  });

  it("l'interfédérale et la mineure suivent la même année civile", () => {
    expect(statutCarte({ type: "interfederale", annee: 2026 }, jour(2026, 7, 25))).toBe("valide");
    expect(statutCarte({ type: "mineure", annee: 2026 }, jour(2027, 1, 1))).toBe("perimee");
  });

  it("rien de renseigné → absente, pas « périmée »", () => {
    expect(statutCarte(undefined, jour(2026, 7, 25))).toBe("absente");
    expect(statutCarte({ type: "annuelle" }, jour(2026, 7, 25))).toBe("absente");
  });
});

describe("finValidite / joursRestants", () => {
  it("place la fin d'une annuelle au 31 décembre", () => {
    expect(finValidite({ type: "annuelle", annee: 2026 })).toEqual(new Date(2026, 11, 31));
  });

  it("place la fin d'une hebdomadaire six jours après son début", () => {
    expect(finValidite({ type: "hebdomadaire", debut: "2026-07-27" })).toEqual(
      new Date(2026, 7 - 1, 27 + 6),
    );
  });

  it("compte 0 jour restant le dernier jour valable", () => {
    expect(joursRestants({ type: "journaliere", debut: "2026-07-31" }, jour(2026, 7, 31))).toBe(0);
  });

  it("ne renvoie rien quand la carte n'a pas de date exploitable", () => {
    expect(finValidite({ type: "journaliere" })).toBeNull();
    expect(joursRestants({ type: "journaliere" }, jour(2026, 7, 31))).toBeNull();
  });
});

describe("phraseReciprocite", () => {
  it("couvre les quatre réseaux plus « aucune » et « inconnue »", () => {
    expect(RECIPROCITES).toEqual(["EHGO", "CHI", "URNE", "interfederale", "aucune", "inconnue"]);
  });

  it("n'annonce toujours aucun nombre pour le CHI, l'URNE et l'interfédérale", () => {
    // coindepeche.fr donnait CHI 39 / URNE 14 sur sa page tarifs et CHI 32 /
    // URNE 24 dans son guide. Aucun des deux réseaux ne publie son propre
    // décompte : au 31/07/2026 le site du CHI répond 500 sur ses pages de
    // présentation et de réciprocité, et le domaine de l'URNE n'existe plus
    // (redirection « domaine inconnu » de WordPress.com). Le seul chiffre
    // officiel — CHI 36 / URNE 17, page réciprocité de la FNPF — ne porte
    // aucun millésime. Un chiffre sans date n'est pas un chiffre de la saison.
    for (const r of RECIPROCITES.filter((x) => x !== "EHGO")) {
      expect(phraseReciprocite(r), r).not.toMatch(/\d/);
    }
  });

  it("donne la composition de l'EHGO, la seule que la source publie datée", () => {
    // ehgo.fr écrit « 34 fédérations pour 37 départements (4 en région
    // parisienne) », sur un site qui se date lui-même de 2026 (« L'EHGO
    // 2026 : 34 fédérations », actualités de juillet 2026). Les deux chiffres
    // se recoupent : l'entrée « Île-de-France » est une fédération pour
    // quatre départements. La valeur 35 des sources secondaires est infirmée.
    const p = phraseReciprocite("EHGO");

    expect(p).toMatch(/34/);
    expect(p).toMatch(/37/);
  });

  it("cite la source du seul chiffre qu'elle avance", () => {
    // Un chiffre sans source dans cette app est un chiffre inventé. La règle
    // est la même que pour la réglementation : on dit d'où ça vient.
    expect(phraseReciprocite("EHGO")).toMatch(/ehgo\.fr/i);
  });

  it("n'avance aucun montant, faute de tarif national à la source", () => {
    // Recherché au canal officiel le 31/07/2026 : cartedepeche.fr ne publie
    // aucun tarif millésimé, seulement des moyennes qu'il qualifie lui-même
    // d'indicatives et qui varient selon la saisie (100 € ou 114 € pour la même
    // carte). La FNPF annonce 112 € pour l'interfédérale là où l'EHGO annonce
    // 114 €, et aucune des deux pages n'est datée 2026. Le prix payé dépend de
    // l'AAPPMA : il n'existe pas de tarif national à embarquer.
    for (const r of RECIPROCITES) {
      expect(phraseReciprocite(r), r).not.toMatch(/€|euro/i);
    }
  });

  it("dit clairement qu'elle ne sait pas quand le pêcheur ne l'a pas renseignée", () => {
    expect(phraseReciprocite("inconnue")).toMatch(/vérifi/i);
  });

  it("ne prétend pas qu'une carte sans réciprocité vaut ailleurs", () => {
    expect(phraseReciprocite("aucune")).toMatch(/seul|uniquement/i);
  });
});
