import { describe, it, expect } from "vitest";
import { SPECIES } from "./species";
import { speciesStatus } from "../lib/statut";
import { priseView } from "../lib/prise";

// `priseView` reçoit désormais son horloge (voir lib/prise.ts) : ces tests
// portent sur le statut de protection, pas sur la date. Une date fixe où tout
// est ouvert isole ce qu'ils mesurent du jour où la CI tourne.
const NOW = new Date(2026, 5, 15, 10, 0, 0);

/**
 * Le drapeau `protected` a UNE seule signification, et elle est lourde.
 *
 * Il déclenche, dans « Ma prise », le verdict rouge « RELÂCHER — ne pas
 * conserver » (lib/prise) et retire de la fiche les rubriques pêche et cuisine
 * (data/fiches). L'utilisateur le lit comme : « la loi vous interdit de garder
 * cet animal ». Il ne peut donc reposer que sur un texte qui le dit.
 *
 * L'audit du 26 juillet 2026 a relu les textes primaires et trouvé 16 espèces
 * marquées pour 2 qui le méritent. La cause : l'arrêté du 8 décembre 1988
 * « fixant la liste des espèces de poissons protégées » a été lu comme une
 * interdiction de pêche alors que son article 1er n'interdit que deux choses —
 *
 *   « 1° La destruction ou l'enlèvement des oeufs ;
 *     2° La destruction, l'altération ou la dégradation des milieux
 *     particuliers, et notamment des lieux de reproduction, désignés par
 *     arrêté préfectoral, des poissons des espèces suivantes : […] »
 *
 * — pour une liste qui contient aussi le brochet, les truites et l'ombre
 * commun, pêchés et conservés tous les jours sous maille et quota. Figurer à
 * cet arrêté n'est donc PAS une interdiction de conserver l'adulte.
 * (Texte en vigueur : https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000327373)
 *
 * Ce test fige la liste. L'ajouter ou l'enlever d'une espèce sans passer ici —
 * et sans citer le texte qui l'établit — fait échouer la CI.
 */

/** Les seules espèces dont un texte interdit la CONSERVATION, avec sa base. */
const INTERDITES_DE_CONSERVATION: Record<string, string> = {
  // Arrêté du 20 décembre 2004 relatif à la protection de l'espèce Acipenser
  // sturio (JORFTEXT000000259841), art. 1er : interdit « la destruction, la
  // mutilation, la capture ou l'enlèvement », le transport, l'utilisation, la
  // mise en vente et l'achat des animaux, vivants ou morts ; art. 3 : toute
  // capture accidentelle est remise à l'eau immédiatement. Il a remplacé
  // l'arrêté du 25 janvier 1982, abrogé depuis le 07/01/2005.
  "esturgeon-europeen": "Arrêté du 20 décembre 2004, art. 1er et 3",

  // Directive 92/43/CEE « Habitats », annexe IV(a) : protection stricte —
  // « toute forme de capture ou de mise à mort intentionnelle » est interdite.
  // Zingel asper est, avec Acipenser sturio, le seul poisson d'eau douce de
  // France métropolitaine inscrit à cette annexe. RÉSERVE ASSUMÉE : la
  // transposition française (arrêté du 8 déc. 1988) ne couvre, pour lui, que
  // les œufs et les frayères — aucun texte national ne prononce l'interdiction
  // de capture. Le drapeau est maintenu parce qu'en danger critique
  // d'extinction, endémique du Rhône, et parce que se tromper dans ce sens
  // coûte une pêche que personne ne pratique, alors que l'inverse ferait
  // commettre une infraction au droit de l'Union.
  "apron-du-rhone": "Directive Habitats an. IV(a) (protection stricte)",
};

/**
 * Retirées de la liste par l'audit : un texte les cite, aucun n'interdit de les
 * conserver. Elles ne sont pas laissées nues pour autant — `season: "special"`
 * fait dire « RÉGLEMENTATION SPÉCIALE — vérifiez l'arrêté », jamais un feu vert.
 */
const ENCADREES_SANS_INTERDICTION: Record<string, string> = {
  // Arrêté du 8 déc. 1988, art. 1er — œufs et frayères uniquement.
  // (noms de l'arrêté entre parenthèses quand la taxonomie a changé depuis)
  vandoise: "Arrêté 8 déc. 1988 (Leuciscus leuciscus) — œufs et frayères",
  "ide-melanote": "Arrêté 8 déc. 1988 (Leuciscus idus) — œufs et frayères",
  "barbeau-meridional": "Arrêté 8 déc. 1988 (Barbus meridionalis) — œufs et frayères",
  bouviere: "Arrêté 8 déc. 1988 (Rhodeus sericeus) — œufs et frayères",
  "loche-d-etang": "Arrêté 8 déc. 1988 (Misgurnus fossilis) — œufs et frayères",
  "loche-de-riviere": "Arrêté 8 déc. 1988 (Cobitis taenia) — œufs et frayères",
  "blennie-fluviatile": "Arrêté 8 déc. 1988 (Blennius fluviatilis) — œufs et frayères",
  "lamproie-de-planer": "Arrêté 8 déc. 1988 (Lampetra planeri) — œufs et frayères",
  // Décrites/revalidées après 1988 : la note de l'OFB du 22 février 2019
  // (N. Poulet, relecture G. Denys) attribue à un taxon issu d'une scission le
  // statut réglementaire de l'espèce initialement listée — ici la vandoise
  // commune, donc les œufs et les frayères, et rien de plus.
  "vandoise-rostree": "Arrêté 8 déc. 1988 par héritage (note OFB 22 fév. 2019)",
  "vandoise-du-bearn": "Arrêté 8 déc. 1988 par héritage (note OFB 22 fév. 2019)",
  // Absents de l'arrêté du 8 décembre 1988. Directive Habitats annexe II =
  // désignation de sites Natura 2000, pas d'interdiction de prélèvement ;
  // l'annexe V permet d'encadrer l'exploitation, elle ne l'interdit pas.
  blageon: "Directive Habitats an. II — aucun texte national",
  toxostome: "Directive Habitats an. II et V — aucun texte national",
  "chabot-commun": "Directive Habitats an. II — aucun texte national",
  "chabot-fluviatile": "Directive Habitats an. II — aucun texte national",
  // Lignées cryptiques du même complexe Cottus gobio (ou, pour le chabot du
  // Lez, espèce à part entière) : même lecture de la Directive Habitats an.
  // II, même absence de l'arrêté du 8 déc. 1988.
  "chabot-du-bearn": "Directive Habitats an. II — aucun texte national",
  "chabot-d-auvergne": "Directive Habitats an. II — aucun texte national",
  "chabot-des-pyrenees": "Directive Habitats an. II — aucun texte national",
  "chabot-du-lez": "Directive Habitats an. II — aucun texte national",
  "chabot-de-rhenanie": "Directive Habitats an. II — aucun texte national",
};

const sp = (id: string) => SPECIES.find((s) => s.id === id)!;

describe("protection — la liste des espèces interdites de conservation", () => {
  it("les espèces attendues existent toutes", () => {
    for (const id of [
      ...Object.keys(INTERDITES_DE_CONSERVATION),
      ...Object.keys(ENCADREES_SANS_INTERDICTION),
    ]) {
      expect(sp(id), `espèce inconnue : ${id}`).toBeDefined();
    }
  });

  it("aucune autre espèce ne porte le drapeau `protected`", () => {
    const portees = SPECIES.filter((s) => s.protected)
      .map((s) => s.id)
      .sort();
    expect(portees).toEqual(Object.keys(INTERDITES_DE_CONSERVATION).sort());
  });

  it("chaque espèce interdite de conservation porte bien le drapeau", () => {
    for (const id of Object.keys(INTERDITES_DE_CONSERVATION)) {
      expect(sp(id).protected, `${id} doit rester protected`).toBe(true);
    }
  });

  it("une espèce protégée déclenche le verdict rouge « ne pas conserver »", () => {
    for (const id of Object.keys(INTERDITES_DE_CONSERVATION)) {
      const v = priseView(sp(id), "statut", { c: 0, b: 0 }, undefined, NOW)!;
      expect(v.tone, id).toBe("bad");
      expect(v.banner, id).toBe("RELÂCHER");
    }
  });
});

describe("protection — les espèces encadrées sans interdiction de conservation", () => {
  it("ne portent plus `protected` : aucun texte n'interdit de les garder", () => {
    for (const id of Object.keys(ENCADREES_SANS_INTERDICTION)) {
      expect(sp(id).protected, `${id} ne doit plus être protected`).toBeUndefined();
    }
  });

  it("ne sont pas laissées nues : régime spécial, donc « vérifiez l'arrêté »", () => {
    for (const id of Object.keys(ENCADREES_SANS_INTERDICTION)) {
      const s = sp(id);
      expect(s.season, `${id} doit rester au régime spécial`).toBe("special");
      expect(s.alert?.text, `${id} doit expliquer son régime`).toBeTruthy();
    }
  });

  it("l'app ne leur donne jamais un feu vert franc", () => {
    for (const id of Object.keys(ENCADREES_SANS_INTERDICTION)) {
      const s = sp(id);
      expect(speciesStatus(s).cls, id).not.toBe("good");
      const v = priseView(s, "statut", { c: 0, b: 0 }, undefined, NOW)!;
      expect(v.tone, id).toBe("warn");
      expect(v.banner, id).toBe("RÉGLEMENTATION SPÉCIALE");
    }
  });

  it("elle ne leur fait pas dire non plus « à relâcher — ne pas conserver »", () => {
    for (const id of Object.keys(ENCADREES_SANS_INTERDICTION)) {
      const v = priseView(sp(id), "statut", { c: 0, b: 0 }, undefined, NOW)!;
      expect(v.banner, id).not.toBe("RELÂCHER");
    }
  });
});

/**
 * Le piège de fond, celui qui a produit les 14 drapeaux de trop : lire
 * « l'espèce figure à l'arrêté du 8 décembre 1988 » comme « sa pêche est
 * interdite ». Ces trois-là figurent au même article 1er et se pêchent sous
 * maille et quota — si une régression remettait l'arrêté au rang
 * d'interdiction, elles tomberaient avec les autres.
 */
describe("protection — le contre-exemple qui prouve la lecture de l'arrêté 1988", () => {
  for (const id of ["brochet", "truite-fario", "ombre"]) {
    it(`${id} figure à l'arrêté du 8 décembre 1988 et reste conservable`, () => {
      expect(sp(id).protected, `${id} n'est pas interdit de conservation`).toBeUndefined();
      expect(sp(id).maille, `${id} a une maille : on le garde donc bien`).not.toBe("—");
    });
  }
});
