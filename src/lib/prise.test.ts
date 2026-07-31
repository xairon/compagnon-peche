import { describe, it, expect } from "vitest";
import { priseView } from "./prise";
import type { Species } from "../types";
import type { SeasonRule } from "../types";
import { SPECIES } from "../data/species";

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

describe("priseView — statut (verdict keep/release)", () => {
  it("espèce protégée → RELÂCHER, tone bad", () => {
    const v = priseView(sp({ season: "toujours", protected: true }), "statut", Q);
    expect(v?.banner).toBe("RELÂCHER");
    expect(v?.tone).toBe("bad");
  });

  it("espèce invasive → NE PAS RELÂCHER VIVANT, tone bad", () => {
    const v = priseView(sp({ season: "invasive-year", invasive: true }), "statut", Q);
    expect(v?.banner).toBe("NE PAS RELÂCHER VIVANT");
    expect(v?.tone).toBe("bad");
  });

  it("espèce ordinaire ouverte → PÊCHE OUVERTE, tone good", () => {
    const v = priseView(sp({ season: "toujours" }), "statut", Q);
    expect(v?.banner).toBe("PÊCHE OUVERTE");
    expect(v?.tone).toBe("good");
  });

  it("réglementation spéciale (anguille) → jamais 'PÊCHE OUVERTE'", () => {
    const v = priseView(sp({ name: "Anguille", season: "special" }), "statut", Q);
    expect(v?.banner).toBe("RÉGLEMENTATION SPÉCIALE");
    expect(v?.tone).toBe("warn");
    expect(v?.banner).not.toBe("PÊCHE OUVERTE");
    // The wording must not imply fishing is simply open.
    expect(v?.paras.join(" ")).toMatch(/vérifiez l'arrêté/i);
  });

  it("protégé a priorité sur le statut de saison spéciale", () => {
    const v = priseView(sp({ season: "special", protected: true }), "statut", Q);
    expect(v?.banner).toBe("RELÂCHER");
  });
});

describe("priseView — maille (arrêté départemental)", () => {
  // Le cas qui compte : l'arrêté préfectoral relève la maille au-dessus du
  // socle national. Annoncer la valeur nationale enverrait le pêcheur garder
  // un poisson en infraction.
  it("le brochet en 41 se mesure à 60 cm, pas aux 50 cm nationaux", () => {
    const v = priseView(sp({ id: "brochet", name: "Brochet", season: "brochet", maille: "50 cm" }), "maille", Q, "41");
    expect(v?.title).toContain("60 cm");
    expect(v?.banner).toContain("60 cm");
    expect(v?.title).not.toContain("50 cm");
  });

  it("le sandre en 41 se mesure à 50 cm, pas aux 40 cm nationaux", () => {
    const v = priseView(sp({ id: "sandre", name: "Sandre", season: "brochet", maille: "40 cm" }), "maille", Q, "41");
    expect(v?.title).toContain("50 cm");
  });

  it("cite le département pour que le pêcheur puisse vérifier", () => {
    const v = priseView(sp({ id: "brochet", name: "Brochet", season: "brochet", maille: "50 cm" }), "maille", Q, "41");
    expect((v?.paras.join(" ") + " " + (v?.note || "")).toLowerCase()).toMatch(/loir-et-cher|arrêté/);
  });

  it("sans spécificité départementale, garde la maille nationale", () => {
    const v = priseView(sp({ id: "carpe-commune", name: "Carpe", season: "toujours", maille: "—" }), "maille", Q, "41");
    expect(v?.title).toMatch(/pas de taille légale nationale/i);
  });

  it("une espèce à maille nationale seule reste inchangée", () => {
    const v = priseView(sp({ id: "ombre", name: "Ombre", season: "cat1", maille: "30 cm" }), "maille", Q, "41");
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
    const v = priseView(sp({ ...SPECIALE, maille: "spéciale" }), "maille", Q, "41");

    expect(v?.title).toMatch(/spéciale/i);
    expect(v?.title).not.toMatch(/pas de taille légale/i);
  });

  it("ne dit jamais « à vous de décider » quand une règle existe", () => {
    const v = priseView(sp({ ...SPECIALE, maille: "spéciale" }), "maille", Q, "41");

    // The sentence that turns an unnumbered rule into the angler's discretion.
    expect(v?.paras.join(" ")).not.toMatch(/à vous de décider/i);
  });

  it("envoie vérifier l'arrêté plutôt que de laisser continuer sans réserve", () => {
    const v = priseView(sp({ ...SPECIALE, maille: "spéciale" }), "maille", Q, "41");

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
      const v = priseView(s, "maille", Q, "41");
      const texte = `${v?.title ?? ""} ${v?.paras.join(" ") ?? ""}`;
      expect(texte, `${s.id} (maille « ${s.maille} »)`).not.toMatch(/pas de taille légale/i);
      expect(texte, `${s.id} (maille « ${s.maille} »)`).not.toMatch(/à vous de décider/i);
    }
  });

  it("garde « à vous de décider » quand il n'y a réellement aucune règle", () => {
    // Carp, roach, catfish: no national size, no wording. The sentence is
    // correct there and must not be collateral damage.
    const v = priseView(sp({ id: "carpe-commune", name: "Carpe", season: "toujours", maille: "—" }), "maille", Q, "41");

    expect(v?.paras.join(" ")).toMatch(/à vous de décider/i);
    expect(v?.banner).toBeUndefined();
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
    );
    expect(v?.paras.join(" ")).toMatch(/Loir-et-Cher/);
  });

  it("sans département, retombe sur le comportement national", () => {
    const v = priseView(
      sp({ id: "truite-fario", name: "Truite fario", season: "cat1", quota: "—" }),
      "quota",
      Q,
    );
    expect(v?.title).toMatch(/pas de quota national/i);
  });

  it("le cumul carnassiers R436-21 reste inchangé", () => {
    const v = priseView(sp({ id: "brochet", name: "Brochet", season: "brochet" }), "quota", Q, "41");
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
    const v = priseView(brochet(), "quota", { c: 1, b: 0 }, "41");
    expect(v?.actions[0].kind).toBe("primary");
    expect(v?.actions[0].label).toMatch(/continue/i);
  });

  it("au plafond de carnassiers, « je continue » n'est plus l'action principale", () => {
    const v = priseView(brochet(), "quota", { c: 3, b: 1 }, "41");
    const principale = v?.actions.find((a) => a.kind === "primary");
    expect(principale?.label).toMatch(/relâche/i);
  });

  it("au plafond, l'écran ne prétend plus que le quota n'est pas atteint", () => {
    const v = priseView(brochet(), "quota", { c: 3, b: 1 }, "41");
    expect(v?.actions.map((a) => a.label).join(" ")).not.toMatch(/quota non atteint/i);
  });

  it("le plafond des 2 brochets se déclenche aussi seul", () => {
    const v = priseView(brochet(), "quota", { c: 2, b: 2 }, "41");
    const principale = v?.actions.find((a) => a.kind === "primary");
    expect(principale?.label).toMatch(/relâche/i);
  });

  it("au plafond, le ton alerte au lieu de rester neutre", () => {
    const v = priseView(brochet(), "quota", { c: 3, b: 2 }, "41");
    expect(v?.tone).toBe("warn");
  });

  it("le plafond brochet ne s'applique pas à une espèce qui n'en est pas un", () => {
    const v = priseView(sp({ id: "sandre", name: "Sandre", season: "brochet" }), "quota", { c: 1, b: 2 }, "41");
    expect(v?.actions.find((a) => a.kind === "primary")?.label).toMatch(/continue/i);
  });
});

/**
 * « La période de pêche DU truite fario » : l'article était collé en dur, donc
 * faux pour toute espèce féminine — la carpe, la perche, la tanche, l'anguille.
 * La tournure évite désormais l'article plutôt que de porter le genre de
 * 78 espèces pour une seule phrase.
 */
describe("priseView — accord du français", () => {
  it("une espèce féminine fermée ne produit pas « du »", () => {
    const v = priseView(
      sp({ id: "truite-fario", name: "Truite fario", season: "cat1" }),
      "statut",
      Q,
      "41",
    );
    // Hors saison seulement : on teste la phrase quelle que soit la date en
    // vérifiant qu'aucun para ne contient la faute.
    expect(v?.paras.join(" ")).not.toMatch(/du truite/i);
    expect(v?.paras.join(" ")).not.toMatch(/pour truite fario/i);
  });

  it("une espèce masculine reste correcte", () => {
    const v = priseView(sp({ id: "brochet", name: "Brochet", season: "brochet" }), "statut", Q, "41");
    expect(v?.paras.join(" ")).not.toMatch(/du brochet est fermée/i);
  });
});
