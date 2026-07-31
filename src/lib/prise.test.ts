import { describe, it, expect } from "vitest";
import { priseView, parseTaille } from "./prise";
import type { Species } from "../types";
import type { SeasonRule } from "../types";
import { SPECIES } from "../data/species";
import { effectiveMaille } from "./maille";
import type { DeptId } from "../data/regulation";

// Minimal species factory — only the fields priseView reads for the "statut" step.
function sp(over: Partial<Species> & { season: SeasonRule }): Species {
  return {
    id: "x",
    name: "Poisson test",
    latin: "Testus testus",
    group: "carnassiers",
    maille: "—",
    mailleSub: "",
    quota: "—",
    quotaSub: "",
    ...over,
  };
}

const Q = { c: 0, b: 0 };

// Un « maintenant » fixe pour les tests qui ne portent pas sur la date : le
// moteur reçoit désormais son horloge, aucun test ne doit dépendre du jour où
// il tourne. 15 juin 2026 : brochet et 1ʳᵉ catégorie sont tous deux ouverts.
const NOW = new Date(2026, 5, 15, 10, 0, 0);

describe("priseView — statut (verdict keep/release)", () => {
  it("espèce protégée → RELÂCHER, tone bad", () => {
    const v = priseView(sp({ season: "toujours", protected: true }), "statut", Q, undefined, NOW);
    expect(v?.banner).toBe("RELÂCHER");
    expect(v?.tone).toBe("bad");
  });

  it("espèce invasive → NE PAS RELÂCHER VIVANT, tone bad", () => {
    const v = priseView(sp({ season: "invasive-year", invasive: true }), "statut", Q, undefined, NOW);
    expect(v?.banner).toBe("NE PAS RELÂCHER VIVANT");
    expect(v?.tone).toBe("bad");
  });

  it("espèce ordinaire ouverte → PÊCHE OUVERTE, tone good", () => {
    const v = priseView(sp({ season: "toujours" }), "statut", Q, undefined, NOW);
    expect(v?.banner).toBe("PÊCHE OUVERTE");
    expect(v?.tone).toBe("good");
  });

  it("réglementation spéciale (anguille) → jamais 'PÊCHE OUVERTE'", () => {
    const v = priseView(sp({ name: "Anguille", season: "special" }), "statut", Q, undefined, NOW);
    expect(v?.banner).toBe("RÉGLEMENTATION SPÉCIALE");
    expect(v?.tone).toBe("warn");
    expect(v?.banner).not.toBe("PÊCHE OUVERTE");
    // The wording must not imply fishing is simply open.
    expect(v?.paras.join(" ")).toMatch(/vérifiez l'arrêté/i);
  });

  it("protégé a priorité sur le statut de saison spéciale", () => {
    const v = priseView(sp({ season: "special", protected: true }), "statut", Q, undefined, NOW);
    expect(v?.banner).toBe("RELÂCHER");
  });
});

describe("priseView — maille (arrêté départemental)", () => {
  // Le cas qui compte : l'arrêté préfectoral relève la maille au-dessus du
  // socle national. Annoncer la valeur nationale enverrait le pêcheur garder
  // un poisson en infraction.
  it("le brochet en 41 se mesure à 60 cm, pas aux 50 cm nationaux", () => {
    const v = priseView(sp({ id: "brochet", name: "Brochet", season: "brochet", maille: "50 cm" }), "maille", Q, "41", NOW);
    expect(v?.title).toContain("60 cm");
    expect(v?.banner).toContain("60 cm");
    expect(v?.title).not.toContain("50 cm");
  });

  it("le sandre en 41 se mesure à 50 cm, pas aux 40 cm nationaux", () => {
    const v = priseView(sp({ id: "sandre", name: "Sandre", season: "brochet", maille: "40 cm" }), "maille", Q, "41", NOW);
    expect(v?.title).toContain("50 cm");
  });

  it("cite le département pour que le pêcheur puisse vérifier", () => {
    const v = priseView(sp({ id: "brochet", name: "Brochet", season: "brochet", maille: "50 cm" }), "maille", Q, "41", NOW);
    expect((v?.paras.join(" ") + " " + (v?.note || "")).toLowerCase()).toMatch(/loir-et-cher|arrêté/);
  });

  it("sans spécificité départementale, garde la maille nationale", () => {
    const v = priseView(sp({ id: "carpe-commune", name: "Carpe", season: "toujours", maille: "—" }), "maille", Q, "41", NOW);
    expect(v?.title).toMatch(/pas de taille légale nationale/i);
  });

  it("une espèce à maille nationale seule reste inchangée", () => {
    const v = priseView(sp({ id: "ombre", name: "Ombre", season: "cat1", maille: "30 cm" }), "maille", Q, "41", NOW);
    expect(v?.title).toContain("30 cm");
  });
});

// effectiveMaille keeps a non-numeric wording ("Interdit", "spéciale") in
// `label` precisely so a rule that has no number is not flattened into "no
// size limit" — see the comment on EffectiveMaille.label. Every other surface
// renders it (Especes, Accueil, Fiche); the decision card, the one place where
// the angler acts on it, read only `cm` and lost it.
describe("priseView — maille non chiffrée (moratoire, réglementation spéciale)", () => {
  const SPECIALE = { id: "saumon-atlantique", name: "Saumon atlantique", season: "toujours" as const };

  it("annonce la mention au lieu de « pas de taille légale »", () => {
    const v = priseView(sp({ ...SPECIALE, maille: "spéciale" }), "maille", Q, "41", NOW);

    expect(v?.title).toMatch(/spéciale/i);
    expect(v?.title).not.toMatch(/pas de taille légale/i);
  });

  it("ne dit jamais « à vous de décider » quand une règle existe", () => {
    const v = priseView(sp({ ...SPECIALE, maille: "spéciale" }), "maille", Q, "41", NOW);

    // The sentence that turns an unnumbered rule into the angler's discretion.
    expect(v?.paras.join(" ")).not.toMatch(/à vous de décider/i);
  });

  it("envoie vérifier l'arrêté plutôt que de laisser continuer sans réserve", () => {
    const v = priseView(sp({ ...SPECIALE, maille: "spéciale" }), "maille", Q, "41", NOW);

    expect(v?.banner).toMatch(/arrêté/i);
  });

  it("aucune espèce du référentiel à règle non chiffrée ne tombe sur « à vous de décider »", () => {
    // The guard that outlives this fix: it fails the day a species is added
    // with a worded maille, whatever the wording turns out to be.
    const worded = SPECIES.filter((s) => {
      const t = (s.maille || "").trim();
      return t !== "" && t !== "—" && !/\d\s*cm/.test(t);
    });
    expect(worded.length).toBeGreaterThan(0); // the corpus really does contain some

    for (const s of worded) {
      const v = priseView(s, "maille", Q, "41", NOW);
      const texte = `${v?.title ?? ""} ${v?.paras.join(" ") ?? ""}`;
      expect(texte, `${s.id} (maille « ${s.maille} »)`).not.toMatch(/pas de taille légale/i);
      expect(texte, `${s.id} (maille « ${s.maille} »)`).not.toMatch(/à vous de décider/i);
    }
  });

  it("garde « à vous de décider » quand il n'y a réellement aucune règle", () => {
    // Carp, roach, catfish: no national size, no wording. The sentence is
    // correct there and must not be collateral damage.
    const v = priseView(sp({ id: "carpe-commune", name: "Carpe", season: "toujours", maille: "—" }), "maille", Q, "41", NOW);

    expect(v?.paras.join(" ")).toMatch(/à vous de décider/i);
    expect(v?.banner).toBeUndefined();
  });
});

/**
 * Le défaut : l'app possédait les deux nombres — la taille saisie par le
 * pêcheur et la maille de l'arrêté — et ne les rapprochait jamais. « Oui, elle
 * fait la maille » restait le gros bouton principal avec 45 cm saisis pour un
 * brochet dont la maille départementale est 60 cm.
 *
 * TROIS états, pas deux. La taille est facultative (« pré-remplira le carnet ») :
 * une taille absente n'est pas une taille sous la maille, et l'app ne doit rien
 * affirmer qu'elle ne sait pas.
 */
describe("priseView — la taille saisie confronte la maille", () => {
  const brochet41 = (taille: number | null) =>
    priseView(
      sp({ id: "brochet", name: "Brochet", season: "brochet", maille: "50 cm" }),
      "maille",
      Q,
      "41", // l'arrêté du Loir-et-Cher porte le brochet à 60 cm
      NOW,
      taille,
    );

  it("sans taille saisie, la question reste posée et « oui » reste l'action principale", () => {
    const v = brochet41(null);
    expect(v?.title).toMatch(/Mesure-t-elle au moins 60 cm/);
    expect(v?.actions[0].kind).toBe("primary");
    expect(v?.actions[0].label).toMatch(/Oui, elle fait la maille/);
    // Rien n'est affirmé : ni bon, ni mauvais.
    expect(v?.tone).toBe("warn");
  });

  it("45 cm pour une maille de 60 : « elle fait la maille » n'est plus proposé", () => {
    const v = brochet41(45);
    expect(v?.actions.map((a) => a.label).join(" ")).not.toMatch(/fait la maille/i);
  });

  it("45 cm pour une maille de 60 : le verdict passe au rouge", () => {
    const v = brochet41(45);
    expect(v?.tone).toBe("bad");
    expect(v?.banner).toMatch(/SOUS LA MAILLE/);
  });

  it("45 cm pour une maille de 60 : relâcher devient l'action principale", () => {
    const v = brochet41(45);
    expect(v?.actions.find((a) => a.kind === "primary")?.label).toMatch(/relâche/i);
  });

  it("l'app cite les deux nombres, pour que le pêcheur puisse la contredire", () => {
    const texte = (brochet41(45)?.title ?? "") + " " + (brochet41(45)?.paras.join(" ") ?? "");
    expect(texte).toMatch(/45/);
    expect(texte).toMatch(/60/);
  });

  it("elle dit comment se rattraper au lieu de bloquer sur une faute de frappe", () => {
    const v = brochet41(45);
    expect(v?.paras.join(" ")).toMatch(/corrigez/i);
  });

  it("62 cm pour une maille de 60 : la maille est confirmée, pas juste supposée", () => {
    const v = brochet41(62);
    expect(v?.tone).toBe("good");
    expect(v?.actions.find((a) => a.kind === "primary")?.act).toBe("quota");
  });

  it("pile la maille passe : la loi fixe un minimum, pas un seuil strict", () => {
    const v = brochet41(60);
    expect(v?.tone).toBe("good");
    expect(v?.actions.find((a) => a.kind === "primary")?.act).toBe("quota");
  });

  it("un demi-centimètre sous la maille reste sous la maille", () => {
    const v = brochet41(59.5);
    expect(v?.tone).toBe("bad");
  });

  it("même confirmée, la remise à l'eau reste offerte (le pêcheur mesure mieux que l'app)", () => {
    const v = brochet41(62);
    expect(v?.actions.map((a) => a.act)).toContain("release");
  });

  it("la règle à l'écran reste accessible dans les trois états", () => {
    for (const t of [null, 45, 62]) {
      expect(brochet41(t)?.actions.map((a) => a.act), `taille ${t}`).toContain("ruler");
    }
  });

  it("les autres étapes ignorent la taille — elle ne concerne que la maille", () => {
    const avec = priseView(sp({ id: "brochet", name: "Brochet", season: "brochet" }), "quota", Q, "41", NOW, 45);
    const sans = priseView(sp({ id: "brochet", name: "Brochet", season: "brochet" }), "quota", Q, "41", NOW, null);
    expect(avec).toEqual(sans);
  });
});

/**
 * Le piège : `maille: "spéciale"` (saumon atlantique, esturgeons) donne
 * `cm = 0`. Une comparaison numérique y répondrait « 40 ≥ 0, elle fait la
 * maille » — un feu vert sur une espèce sous moratoire. Il n'y a pas de nombre
 * à comparer : l'app ne doit rien conclure du tout.
 */
describe("priseView — taille saisie sur une espèce sans maille chiffrée", () => {
  const saumon = (taille: number | null) =>
    priseView(
      sp({ id: "saumon-atlantique", name: "Saumon atlantique", season: "toujours", maille: "spéciale" }),
      "maille",
      Q,
      "41",
      NOW,
      taille,
    );

  it("une taille saisie ne produit jamais de feu vert", () => {
    expect(saumon(80)?.tone).not.toBe("good");
    expect(saumon(80)?.tone).toBe("warn");
  });

  it("l'app ne prétend pas que la maille est atteinte", () => {
    const texte = (saumon(80)?.title ?? "") + " " + (saumon(80)?.paras.join(" ") ?? "");
    expect(texte).not.toMatch(/fait la maille|maille atteinte/i);
  });

  it("elle renvoie toujours à l'arrêté, taille ou pas", () => {
    expect(saumon(80)?.banner).toMatch(/arrêté/i);
    expect(saumon(null)?.banner).toMatch(/arrêté/i);
  });

  it("une espèce sans aucune règle n'est pas non plus jugée sur la taille", () => {
    const carpe = (t: number | null) =>
      priseView(sp({ id: "carpe-commune", name: "Carpe", season: "toujours", maille: "—" }), "maille", Q, "41", NOW, t);
    expect(carpe(12)).toEqual(carpe(null));
  });
});

/**
 * La garde qui survit à ce correctif : elle ne connaît aucune espèce en
 * particulier. Pour chaque espèce à maille chiffrée dans chacun des trois
 * départements couverts, un centimètre sous la maille ne doit jamais ressortir
 * en vert ni proposer de la garder.
 */
describe("priseView — aucune espèce sous la maille ne reçoit un feu vert", () => {
  const DEPTS: DeptId[] = ["23", "36", "41"];

  it("un centimètre sous la maille : ton rouge et action principale = relâcher", () => {
    let couvertes = 0;
    for (const d of DEPTS) {
      for (const s of SPECIES) {
        const cm = effectiveMaille(s, d).cm;
        if (cm <= 0) continue;
        couvertes++;
        const v = priseView(s, "maille", Q, d, NOW, cm - 1);
        expect(v?.tone, `${s.id} en ${d} (maille ${cm})`).toBe("bad");
        expect(
          v?.actions.find((a) => a.kind === "primary")?.act,
          `${s.id} en ${d} (maille ${cm})`,
        ).toBe("release");
        expect(
          v?.actions.map((a) => a.label).join(" "),
          `${s.id} en ${d} (maille ${cm})`,
        ).not.toMatch(/fait la maille/i);
      }
    }
    // Sans ça, la boucle pourrait ne rien parcourir et le test ne rien prouver.
    expect(couvertes).toBeGreaterThan(20);
  });
});

/**
 * Le champ est un `<input>` libre en `inputMode="numeric"` : ce qui en sort
 * n'est pas un nombre. Une saisie illisible doit retomber sur « pas de taille »
 * — le troisième état — et surtout jamais sur 0, qui serait « sous la maille »
 * pour un pêcheur qui n'a rien mesuré.
 */
describe("parseTaille — du champ de saisie au nombre", () => {
  it("un champ vide n'est pas une taille", () => {
    expect(parseTaille("")).toBeNull();
    expect(parseTaille("   ")).toBeNull();
    expect(parseTaille(undefined)).toBeNull();
  });

  it("lit un entier", () => {
    expect(parseTaille("45")).toBe(45);
  });

  it("accepte la virgule décimale française", () => {
    expect(parseTaille("59,5")).toBe(59.5);
  });

  it("une saisie illisible n'est pas une taille", () => {
    expect(parseTaille("abc")).toBeNull();
    expect(parseTaille("45 cm et des poussières")).toBeNull();
  });

  it("zéro et les valeurs négatives ne sont pas des tailles", () => {
    // Sinon un champ à moitié effacé condamnerait un poisson parfaitement légal.
    expect(parseTaille("0")).toBeNull();
    expect(parseTaille("-3")).toBeNull();
  });
});

describe("priseView — quota (arrêté départemental)", () => {
  // Le cas relevé en revue : sp.quota vaut "—" pour la truite fario, mais le
  // Loir-et-Cher plafonne à 6/jour. L'app annonçait « pas de quota national »,
  // soit l'inverse de ce qui lie le pêcheur.
  it("la truite fario en 41 affiche le quota départemental, pas « aucun quota »", () => {
    const v = priseView(
      sp({ id: "truite-fario", name: "Truite fario", season: "cat1", quota: "—" }),
      "quota",
      Q,
      "41",
      NOW,
    );
    expect(v?.title).not.toMatch(/pas de quota national/i);
    expect(v?.paras.join(" ")).toMatch(/6 truites/i);
  });

  it("cite le département qui fixe le quota", () => {
    const v = priseView(
      sp({ id: "truite-fario", name: "Truite fario", season: "cat1", quota: "—" }),
      "quota",
      Q,
      "41",
      NOW,
    );
    expect(v?.paras.join(" ")).toMatch(/Loir-et-Cher/);
  });

  it("sans département, retombe sur le comportement national", () => {
    const v = priseView(
      sp({ id: "truite-fario", name: "Truite fario", season: "cat1", quota: "—" }),
      "quota",
      Q,
      undefined,
      NOW,
    );
    expect(v?.title).toMatch(/pas de quota national/i);
  });

  it("le cumul carnassiers R436-21 reste inchangé", () => {
    const v = priseView(sp({ id: "brochet", name: "Brochet", season: "brochet" }), "quota", Q, "41", NOW);
    expect(v?.paras.join(" ")).toMatch(/R436-21/);
  });
});

/**
 * L'app calculait le quota du jour depuis le carnet, l'affichait (« 3 / 3
 * carnassiers gardés »)… puis proposait « Quota non atteint — je continue » en
 * action PRINCIPALE. Elle se contredisait sur un plafond réglementaire.
 *
 * On ne bloque pas : le pêcheur peut être en 1ʳᵉ catégorie (seul le plafond de
 * 2 brochets s'applique) ou avoir un carnet incomplet. Mais l'app ne doit pas
 * présenter « non atteint » comme le chemin neutre quand elle sait le contraire.
 */
describe("priseView — quota atteint d'après le carnet", () => {
  const brochet = () => sp({ id: "brochet", name: "Brochet", season: "brochet" });

  it("sous le quota, « je continue » reste l'action principale", () => {
    const v = priseView(brochet(), "quota", { c: 1, b: 0 }, "41", NOW);
    expect(v?.actions[0].kind).toBe("primary");
    expect(v?.actions[0].label).toMatch(/continue/i);
  });

  it("au plafond de carnassiers, « je continue » n'est plus l'action principale", () => {
    const v = priseView(brochet(), "quota", { c: 3, b: 1 }, "41", NOW);
    const principale = v?.actions.find((a) => a.kind === "primary");
    expect(principale?.label).toMatch(/relâche/i);
  });

  it("au plafond, l'écran ne prétend plus que le quota n'est pas atteint", () => {
    const v = priseView(brochet(), "quota", { c: 3, b: 1 }, "41", NOW);
    expect(v?.actions.map((a) => a.label).join(" ")).not.toMatch(/quota non atteint/i);
  });

  it("le plafond des 2 brochets se déclenche aussi seul", () => {
    const v = priseView(brochet(), "quota", { c: 2, b: 2 }, "41", NOW);
    const principale = v?.actions.find((a) => a.kind === "primary");
    expect(principale?.label).toMatch(/relâche/i);
  });

  it("au plafond, le ton alerte au lieu de rester neutre", () => {
    const v = priseView(brochet(), "quota", { c: 3, b: 2 }, "41", NOW);
    expect(v?.tone).toBe("warn");
  });

  it("le plafond brochet ne s'applique pas à une espèce qui n'en est pas un", () => {
    const v = priseView(sp({ id: "sandre", name: "Sandre", season: "brochet" }), "quota", { c: 1, b: 2 }, "41", NOW);
    expect(v?.actions.find((a) => a.kind === "primary")?.label).toMatch(/continue/i);
  });
});

/**
 * « La période de pêche DU truite fario » : l'article était collé en dur, donc
 * faux pour toute espèce féminine — la carpe, la perche, la tanche, l'anguille.
 * La tournure évite désormais l'article plutôt que de porter le genre de
 * 78 espèces pour une seule phrase.
 */
/**
 * `priseView` lisait l'horloge système à travers `season(sp)`, donc les seules
 * bascules qui comptent — la veille de l'ouverture, le jour même, le lendemain
 * de la fermeture — n'étaient testables qu'en attendant la bonne date de
 * l'année. La convention du dépôt (src/lib/ecrevisses.ts, src/lib/carte-peche.ts)
 * est que le moteur reçoit `now` et ne le lit jamais lui-même.
 *
 * Dates 2026, calculées puis vérifiées à la main :
 *  · 1ʳᵉ catégorie — 2ᵉ samedi de mars = 14 mars ; 3ᵉ dimanche de sept. = 20 sept.
 *  · brochet — dernier dimanche de janvier = 25 janvier (ouvert ce jour-là) ;
 *    dernier samedi d'avril = 25 avril (réouverture).
 */
describe("priseView — bascules de saison, horloge injectée", () => {
  const truite = () => sp({ id: "truite-fario", name: "Truite fario", season: "cat1" });
  const brochet = () => sp({ id: "brochet", name: "Brochet", season: "brochet" });
  const j = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10, 0, 0);

  it("la veille de l'ouverture 1ʳᵉ cat., la pêche est fermée", () => {
    const v = priseView(truite(), "statut", Q, "41", j(2026, 3, 13));
    expect(v?.banner).toBe("PÊCHE FERMÉE — RELÂCHER");
    expect(v?.tone).toBe("bad");
  });

  it("le jour de l'ouverture 1ʳᵉ cat., la pêche est ouverte", () => {
    const v = priseView(truite(), "statut", Q, "41", j(2026, 3, 14));
    expect(v?.banner).toBe("PÊCHE OUVERTE");
  });

  it("le jour de la fermeture 1ʳᵉ cat. compte encore comme ouvert", () => {
    const v = priseView(truite(), "statut", Q, "41", j(2026, 9, 20));
    expect(v?.banner).toBe("PÊCHE OUVERTE");
  });

  it("le lendemain de la fermeture 1ʳᵉ cat., la pêche est fermée", () => {
    const v = priseView(truite(), "statut", Q, "41", j(2026, 9, 21));
    expect(v?.banner).toBe("PÊCHE FERMÉE — RELÂCHER");
  });

  it("le dernier dimanche de janvier, le brochet est encore ouvert", () => {
    const v = priseView(brochet(), "statut", Q, "41", j(2026, 1, 25));
    expect(v?.banner).toBe("PÊCHE OUVERTE");
  });

  it("le lendemain, le brochet est fermé", () => {
    const v = priseView(brochet(), "statut", Q, "41", j(2026, 1, 26));
    expect(v?.banner).toBe("PÊCHE FERMÉE — RELÂCHER");
  });

  it("la veille de la réouverture brochet, il est encore fermé", () => {
    const v = priseView(brochet(), "statut", Q, "41", j(2026, 4, 24));
    expect(v?.banner).toBe("PÊCHE FERMÉE — RELÂCHER");
  });

  it("le jour de la réouverture brochet, il est ouvert", () => {
    const v = priseView(brochet(), "statut", Q, "41", j(2026, 4, 25));
    expect(v?.banner).toBe("PÊCHE OUVERTE");
  });

  it("le verdict ne dépend que du `now` reçu, jamais de l'horloge système", () => {
    // Deux appels identiques à `now` près : si le moteur relisait Date.now(),
    // les deux rendraient le même verdict.
    const ferme = priseView(truite(), "statut", Q, "41", j(2026, 1, 5));
    const ouvert = priseView(truite(), "statut", Q, "41", j(2026, 5, 5));
    expect(ferme?.banner).not.toBe(ouvert?.banner);
  });
});

describe("priseView — accord du français", () => {
  it("une espèce féminine fermée ne produit pas « du »", () => {
    const v = priseView(
      sp({ id: "truite-fario", name: "Truite fario", season: "cat1" }),
      "statut",
      Q,
      "41",
      NOW,
    );
    // Hors saison seulement : on teste la phrase quelle que soit la date en
    // vérifiant qu'aucun para ne contient la faute.
    expect(v?.paras.join(" ")).not.toMatch(/du truite/i);
    expect(v?.paras.join(" ")).not.toMatch(/pour truite fario/i);
  });

  it("une espèce masculine reste correcte", () => {
    const v = priseView(sp({ id: "brochet", name: "Brochet", season: "brochet" }), "statut", Q, "41", NOW);
    expect(v?.paras.join(" ")).not.toMatch(/du brochet est fermée/i);
  });
});
