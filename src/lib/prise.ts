import type { Species } from "../types";
import type { PriseStep } from "../store";
import { season } from "./season";
import { QUOTA_CARNASSIERS, QUOTA_BROCHETS } from "./helpers";
import { DEPARTEMENTS, type DeptId } from "../data/regulation";
import { effectiveMaille } from "./maille";
import { effectiveQuota } from "./quota";
import { etapeSuivante, etapesSautees } from "./prise-etapes";
import type { PriseEtape } from "./nav-conventions";

export type ActKind = "primary" | "danger" | "default";
export interface PriseAction {
  label: string;
  act: string;
  kind: ActKind;
}
export interface PriseView {
  bd: string;
  kickFg: string;
  titleFg: string;
  kicker: string;
  title: string;
  paras: string[];
  list: { n: string; t: string }[];
  note: string | null;
  actions: PriseAction[];
  /** Big color verdict shown first (what blocks the decision), read in < 3 s. */
  tone?: "bad" | "warn" | "good";
  banner?: string;
}

const btn = (label: string, act: string, kind: ActKind = "default"): PriseAction => ({
  label,
  act,
  kind,
});

/**
 * Ce qu'annonce le bouton de progression, selon où il mène RÉELLEMENT.
 *
 * « Continuer — vérifier la maille » était écrit en dur sur l'étape statut. Sur
 * une perche, qui n'a pas de maille, il promettait un écran que le parcours ne
 * traverse plus.
 */
const LIBELLE_SUIVANT: Record<PriseEtape, string> = {
  statut: "Continuer",
  maille: "Continuer — vérifier la maille",
  quota: "Continuer — vérifier le quota",
  choix: "Continuer — garder ou relâcher ?",
  kill: "Continuer",
  release: "Continuer",
  consigner: "Continuer — noter la prise",
  "consigner-rel": "Continuer — noter la prise",
};

/**
 * The measured size, in centimetres, out of the free-text field — or null when
 * the angler has not given one.
 *
 * The field is optional ("facultatif, pré-remplira le carnet"), so ABSENT and
 * BELOW THE MAILLE are two different things and must stay that way: an empty
 * field is not a small fish. Anything unreadable, zero or negative also returns
 * null rather than a number, because a half-erased field must never be read as
 * "0 cm" — that would condemn a perfectly legal fish.
 */
export function parseTaille(input: string | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const t = input.trim().replace(",", ".");
  if (t === "") return null;
  // Number("45 cm") is NaN — good: a size we cannot read is a size we don't have.
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** French decimal notation, for a size we print back to the angler. */
function cmLabel(n: number): string {
  return String(n).replace(".", ",") + " cm";
}

const base = (): PriseView => ({
  bd: "#E6E2D8",
  kickFg: "#A8A495",
  titleFg: "#1A201C",
  kicker: "",
  title: "",
  paras: [],
  list: [],
  note: null,
  actions: [],
});

/**
 * The decision-flow card for the current species and step. Returns null when idle.
 *
 * `now` is a parameter and never read from the clock here — same convention as
 * src/lib/ecrevisses.ts and src/lib/carte-peche.ts. It is what makes the only
 * verdicts that can change overnight (opening eve, opening day, the day after
 * the close) testable at all; before that, `season(sp)` read `new Date()` deep
 * inside and no test could reach a boundary except by waiting for it.
 */
export function priseView(
  sp: Species | undefined,
  step: PriseStep,
  quota: { c: number; b: number },
  dept: DeptId | undefined,
  now: Date,
  taille: number | null = null,
): PriseView | null {
  if (!sp || !step) return null;
  const seas = season(sp, now);
  const V = base();

  // L'étape d'après, dérivée du parcours de CETTE espèce (lib/prise-etapes).
  // Les boutons de progression la demandent au lieu de nommer une étape en dur :
  // « Continuer — vérifier la maille » menait à la maille même sur une perche,
  // qui n'en a pas. Le libellé suit la destination réelle.
  const apres = etapeSuivante(sp, dept, step);
  // `apres` ne vaut null que sur `kill`/`release`, qui ferment le parcours et
  // n'appellent jamais ce bouton. Le repli sur `choix` est un garde-fou de type,
  // pas un chemin : il vaut mieux revenir à la décision que rendre `null`.
  const suivant = (label?: string) =>
    btn(label ?? LIBELLE_SUIVANT[apres ?? "choix"], apres ?? "choix", "primary");

  if (step === "statut") {
    if (sp.protected)
      return {
        ...V,
        bd: "#B33A2E",
        kickFg: "#B33A2E",
        titleFg: "#B33A2E",
        tone: "bad",
        banner: "RELÂCHER",
        kicker: "Espèce protégée ou menacée",
        title: "À relâcher — ne pas conserver",
        paras: [
          sp.name +
            " est une espèce protégée ou menacée. Ne la conservez pas : relâchez-la immédiatement, avec le plus grand soin. Selon l'espèce et le département, sa pêche peut être restreinte ou totalement interdite (comme l'esturgeon) — vérifiez l'arrêté préfectoral.",
        ],
        actions: [btn("Gestes pour bien relâcher", "release", "primary")],
      };
    if (sp.invasive)
      return {
        ...V,
        bd: "#B33A2E",
        kickFg: "#B33A2E",
        titleFg: "#B33A2E",
        tone: "bad",
        banner: "NE PAS RELÂCHER VIVANT",
        kicker: "Statut légal — " + (sp.invasiveBasis ?? "R432-5"),
        title: "Interdit de la remettre vivante à l'eau",
        paras: [
          sp.invasiveBasis
            ? sp.name +
              " est une espèce exotique envahissante réglementée (" +
              sp.invasiveBasis +
              ") : sa réintroduction / remise à l'eau vivante dans le milieu naturel est interdite — la capture ne doit pas être relâchée vivante."
            : sp.name +
              " est classée susceptible de provoquer des déséquilibres biologiques. La remise à l'eau vivante et le transport vivant sont interdits : la capture doit être mise à mort.",
        ],
        actions: [
          btn("Comment la mettre à mort proprement", "kill", "danger"),
          btn("J'ai compris — annuler", "cancel"),
        ],
      };
    if (!seas.open)
      return {
        ...V,
        bd: "#B33A2E",
        kickFg: "#B33A2E",
        titleFg: "#B33A2E",
        tone: "bad",
        banner: "PÊCHE FERMÉE — RELÂCHER",
        kicker: "Période de pêche",
        title: "Pêche fermée aujourd'hui",
        paras: [
          // Tournure sans article : « la période de pêche DU truite fario » était
          // faux pour toute espèce féminine (la carpe, la perche, la tanche…), et
          // porter le genre de 78 espèces pour une seule phrase n'en valait pas
          // le prix.
          sp.name + " : la période de pêche est fermée à cette date. Remise à l'eau immédiate et soignée.",
        ],
        actions: [btn("Gestes pour bien relâcher", "release", "primary")],
      };
    // Special regulatory status (eel): no simple national period — declaration +
    // basin-specific closures. Never show a plain green "open" verdict here.
    if (sp.season === "special")
      return {
        ...V,
        bd: "#B8860B",
        kickFg: "#8A6D0B",
        titleFg: "#5C4708",
        tone: "warn",
        banner: "RÉGLEMENTATION SPÉCIALE",
        kicker: "Statut légal",
        title: "Pêche réglementée — vérifiez l'arrêté",
        paras: [
          sp.name +
            " relève d'une réglementation spéciale : les périodes d'ouverture et de fermeture varient selon le bassin et l'arrêté préfectoral, et la capture peut devoir être déclarée. Ne considérez pas la pêche comme ouverte par défaut — vérifiez l'arrêté en vigueur avant de conserver.",
        ],
        note: sp.reg && sp.reg.note ? sp.reg.note : null,
        actions: [
          suivant("J'ai vérifié — continuer"),
          btn("Gestes pour bien relâcher", "release"),
        ],
      };
    const openParas = [
      sp.name +
        " : aucune interdiction nationale à cette date (" +
        seas.label.toLowerCase() +
        // La phrase annonçait « Passons à la maille » quelle que soit l'espèce.
        // Une perche n'a pas d'étape maille : la promesse était fausse d'un mot.
        ")." +
        (apres === "maille"
          ? " Passons à la maille."
          : apres === "choix"
            ? " Rien d'autre à vérifier ici : reste à décider."
            : ""),
    ];
    // "toujours" species are only open year-round in 2nd-category water. On a
    // 1st-category (trout) stretch, all fishing follows the trout dates — and the
    // app can't know the category from here, so we say so instead of implying it.
    if (sp.season === "toujours")
      openParas.push(
        "⚠️ Vrai en 2ᵉ catégorie. En 1ʳᵉ catégorie (eaux à truite/salmonidés), toute pêche suit les dates truite : du 2ᵉ samedi de mars au 3ᵉ dimanche de septembre. Vérifiez la catégorie du cours d'eau.",
      );
    // The brochet verdict uses the national 2nd-category dates. In 1st-category it
    // follows the trout opening, and several départements set their own brochet
    // dates (sometimes closed in January) — flag it so we never imply "open" where
    // it is locally closed.
    else if (sp.season === "brochet")
      openParas.push(
        "⚠️ Dates de 2ᵉ catégorie. En 1ʳᵉ catégorie, le brochet suit l'ouverture truite (2ᵉ samedi de mars), et certains arrêtés départementaux fixent des dates propres (parfois fermé en janvier). Vérifiez la catégorie et l'arrêté local.",
      );
    return {
      ...V,
      tone: "good",
      banner: "PÊCHE OUVERTE",
      kicker: "Statut légal",
      title: "Espèce autorisée, pêche ouverte",
      paras: openParas,
      actions: [suivant()],
    };
  }

  if (step === "maille") {
    // One resolution for the whole app (see lib/maille): the size input and the
    // on-screen ruler read the same value, so the flow can no longer announce
    // 60 cm here and measure 50 one tap later.
    const m = effectiveMaille(sp, dept);
    const has = m.cm > 0;
    const size = m.cm + " cm";
    // A species can have no number and still be governed by a rule: the salmon
    // under moratorium and two sturgeons carry maille "spéciale", the European
    // sturgeon "Interdit". effectiveMaille keeps that wording in `label` for
    // exactly this reason — flattening it to "no national size" and offering
    // "sinon, à vous de décider" hands the angler a discretion the law does not
    // give them. Every other screen already prints the label.
    const special = !has && m.label !== null;
    // The whole point of this step, and what the app used to skip: it holds
    // BOTH numbers — the size the angler typed and the size the arrêté sets —
    // and never compared them. "Oui, elle fait la maille" stayed the big
    // primary button with 45 cm entered for a 60 cm brochet.
    //
    // Three states, because the field is optional:
    //   · null      — nothing measured. Assert nothing; keep asking.
    //   · >= m.cm   — the app knows it makes the size.
    //   · <  m.cm   — the app knows it does not, and must stop offering to keep it.
    // The comparison only exists when there IS a number to compare against:
    // `maille: "spéciale"` yields cm = 0, and "80 ≥ 0" would be a green light
    // on a species under moratorium.
    const mesuree = has ? taille : null;
    const sousLaMaille = mesuree !== null && mesuree < m.cm;
    const faitLaMaille = mesuree !== null && mesuree >= m.cm;
    const deptLine =
      // Only claim "stricter than national" when it actually is: most arrêtés
      // restate the national figure, and saying otherwise contradicts itself.
      m.aboveNational && dept && m.text
        ? [
            `${DEPARTEMENTS[dept].name} : ${m.text} — au-dessus du socle national (${sp.maille}). Vérifiez l'arrêté en vigueur.`,
          ]
        : m.local && dept && m.text
          ? [`${DEPARTEMENTS[dept].name} : ${m.text}. Vérifiez l'arrêté en vigueur.`]
          : [];

    if (sousLaMaille) {
      const mesure = cmLabel(mesuree);
      return {
        ...V,
        bd: "#B33A2E",
        kickFg: "#B33A2E",
        titleFg: "#B33A2E",
        tone: "bad",
        banner: "SOUS LA MAILLE — RELÂCHER",
        kicker: m.aboveNational ? "Maille — arrêté départemental" : "Maille — taille légale minimale",
        title: `${mesure} : sous la maille de ${size}`,
        paras: [
          `Vous avez mesuré ${mesure}, la maille est de ${size}. Remise à l'eau obligatoire, immédiate et soignée : conserver un poisson sous la maille est une infraction.`,
          // Never trap the angler on a typo: the size field sits right below
          // this card, so the way out is to correct the number, not to override
          // a legal limit with a button.
          "Erreur de mesure ? Corrigez la taille saisie ci-dessous — du bout du museau à l'extrémité de la queue.",
          ...deptLine,
        ],
        note: sp.reg && sp.reg.note ? sp.reg.note : null,
        actions: [
          btn("Je relâche — les bons gestes", "release", "primary"),
          btn("Mesurer — règle à l'écran", "ruler"),
        ],
      };
    }

    if (faitLaMaille) {
      const mesure = cmLabel(mesuree);
      return {
        ...V,
        tone: "good",
        banner: "MAILLE ATTEINTE — " + mesure,
        kicker: m.aboveNational ? "Maille — arrêté départemental" : "Maille — taille légale minimale",
        title: `${mesure} : la maille de ${size} est atteinte`,
        paras: [
          `${mesure} atteint la maille de ${size} — à condition que la mesure aille bien du bout du museau à l'extrémité de la queue. La maille n'est pas le seul filtre : le quota du jour vient ensuite.`,
          ...deptLine,
        ],
        note: sp.reg && sp.reg.note ? sp.reg.note : null,
        actions: [
          suivant(),
          // The angler measures better than the app: leave the door open.
          btn("Je me suis trompé — elle est sous la maille", "release"),
          btn("Mesurer — règle à l'écran", "ruler"),
        ],
      };
    }

    return {
      ...V,
      tone: "warn",
      banner: has ? "MESURER — " + size : special ? "VÉRIFIER L'ARRÊTÉ" : undefined,
      kicker: m.aboveNational ? "Maille — arrêté départemental" : "Maille — taille légale minimale",
      title: has
        ? "Mesure-t-elle au moins " + size + " ?"
        : special
          ? `Maille : ${m.label} — réglementation spéciale`
          : "Pas de taille légale nationale",
      paras: [
        has
          ? "Mesurez du bout du museau à l'extrémité de la queue. Sous la maille : remise à l'eau obligatoire, immédiate et soignée."
          : special
            ? "Cette espèce ne relève pas d'une taille chiffrée mais d'une règle particulière (moratoire, interdiction, arrêté spécifique). Vérifiez l'arrêté en vigueur avant toute décision."
            : "Aucune maille nationale pour cette espèce — un arrêté local peut en fixer une : vérifiez. Sinon, à vous de décider.",
        ...deptLine,
      ],
      note: sp.reg && sp.reg.note ? sp.reg.note : null,
      actions: has
        ? [
            suivant("Oui, elle fait la maille"),
            btn("Non — sous la maille", "release"),
            btn("Mesurer — règle à l'écran", "ruler"),
          ]
        : [suivant()],
    };
  }

  if (step === "quota") {
    const kicker = "Quota journalier";
    // The R436-21 daily limit (3 carnassiers, dont 2 brochets) applies ONLY to
    // sandre / brochet (incl. brochet aquitain) / black-bass (the
    // QUOTA_CARNASSIERS list) — NOT to every species in the "carnassiers"
    // taxonomic group (perche, grémille, aspe are excluded). Other species carry
    // their own quota field; eels are a declaration obligation, not a quota.
    const isCarnassier = QUOTA_CARNASSIERS.includes(sp.id);
    const declare = sp.quota === "Déclarer";
    // The arrêté can set a quota where the national text sets none: a truite
    // fario has sp.quota === "—", yet Loir-et-Cher caps it at 6/jour. Reading
    // sp.quota alone announced "pas de quota national" — the opposite of what
    // binds the angler — while the fiche screen showed the real figure.
    const q = effectiveQuota(sp, dept);
    const otherQuota = !isCarnassier && !declare && q.text !== null;

    if (isCarnassier) {
      // The app already counts the day's kept fish; presenting "quota non
      // atteint" as the primary path while its own line says "3 / 3" was the app
      // contradicting itself on a legal cap. We don't block — the angler may be
      // on 1ʳᵉ-catégorie water (only the 2-brochet cap applies there) or have an
      // incomplete carnet — but the emphasis follows what we actually know.
      const isBrochet = QUOTA_BROCHETS.includes(sp.id);
      const atteint = quota.c >= 3 || (isBrochet && quota.b >= 2);
      return {
        ...V,
        tone: atteint ? "warn" : undefined,
        kicker,
        title: atteint ? "Quota du jour atteint" : "Où en êtes-vous du quota ?",
        paras: [
          "Rappel : 3 carnassiers par jour et par pêcheur (sandre + brochet + black-bass), dont 2 brochets maximum (art. R436-21). Ce cumul vaut en 2ᵉ catégorie ; en 1ʳᵉ catégorie, seul le plafond de 2 brochets/jour s'applique.",
          "D'après votre carnet aujourd'hui : " +
            quota.c +
            " / 3 carnassiers gardés, dont " +
            quota.b +
            " / 2 brochets.",
          ...(atteint
            ? [
                "Votre carnet indique que le plafond est atteint : la remise à l'eau s'impose, sauf si vous pêchez en 1ʳᵉ catégorie (où seul le plafond de 2 brochets vaut) ou si votre carnet est incomplet.",
              ]
            : []),
        ],
        actions: atteint
          ? [
              btn("Je relâche", "release", "primary"),
              btn("1ʳᵉ catégorie ou carnet incomplet — continuer", apres ?? "choix"),
            ]
          : [
              suivant("Quota non atteint — je continue"),
              btn("Quota atteint — je relâche", "release"),
            ],
      };
    }
    if (declare) {
      return {
        ...V,
        kicker,
        title: "Capture à déclarer",
        paras: [
          (sp.quotaSub && sp.quotaSub !== "—" ? sp.quotaSub : "Capture à déclarer") + ".",
          "Ce n'est pas le quota des 3 carnassiers (R436-21) : vérifiez l'arrêté préfectoral et les modalités de déclaration de votre bassin.",
        ],
        actions: [suivant()],
      };
    }
    if (otherQuota) {
      return {
        ...V,
        kicker,
        title: "Quota spécifique",
        paras: [
          "Quota pour cette espèce : " +
            q.text +
            (!q.local && sp.quotaSub && sp.quotaSub !== "—" ? " (" + sp.quotaSub + ")" : "") +
            ".",
          q.local && dept
            ? `Fixé par l'arrêté de ${DEPARTEMENTS[dept].name}. Vérifiez le texte en vigueur.`
            : "Un arrêté préfectoral peut préciser ou restreindre ce quota.",
        ],
        actions: [suivant()],
      };
    }
    return {
      ...V,
      kicker,
      title: "Pas de quota national",
      paras: ["Aucun quota national pour cette espèce. Un arrêté local peut en fixer un."],
      actions: [suivant()],
    };
  }

  if (step === "choix") {
    // Ce qui a été sauté se dit ICI, sur le premier écran d'après. Sur une
    // perche, `statut` mène directement à la décision : sans cette ligne, deux
    // écrans auraient disparu sans que rien ne le signale, et leur absence
    // aurait valu affirmation qu'aucune règle n'existe.
    const sautees = etapesSautees(sp, dept);
    return {
      ...V,
      note: sautees.length > 0 ? texteSautees(sp, sautees) : null,
      kicker: "La décision",
      title: "Garder ou relâcher ?",
      paras: [
        "Comestibilité : " +
          (sp.rating || "à documenter") +
          "." +
          (sp.sante && sp.sante.alert
            ? " Attention : espèce bioaccumulatrice — fréquence de consommation limitée (ANSES)."
            : " "),
        "Garder implique de la tuer proprement, tout de suite. Relâcher implique de le faire vite et bien.",
      ],
      actions: [
        btn("Je garde — mise à mort propre", "kill", "primary"),
        btn("Je relâche — les bons gestes", "release"),
      ],
    };
  }

  if (step === "kill") {
    return {
      ...V,
      kicker: "Mise à mort propre et rapide",
      title: "Faire vite, faire bien",
      list: [
        {
          n: "1",
          t: "Assommer d'un coup sec et ferme sur le crâne, juste au-dessus des yeux (percussion), avec un assommoir ou un objet lourd.",
        },
        {
          n: "2",
          t: "Pour les poissons destinés à la table : saigner aussitôt en incisant les branchies (ikejime complet possible sur sandre et silure : tige dans le cerveau puis la moelle).",
        },
        {
          n: "3",
          t: "Conserver au frais immédiatement : glacière, glace, ou linge humide à l'ombre.",
        },
      ],
      note: "Geste éthique et réglementaire : ne jamais laisser un poisson mourir à l'air libre.",
      actions: [btn("Noter la prise", "consigner", "primary"), btn("Terminer sans noter", "done")],
    };
  }

  if (step === "release") {
    return {
      ...V,
      kicker: "Remise à l'eau",
      title: "Maximiser ses chances de survie",
      list: [
        { n: "1", t: "Mains toujours mouillées avant de toucher le poisson — jamais de linge sec." },
        {
          n: "2",
          t: "Décrocher dans l'eau si possible ; pince longue si l'hameçon est profond, couper le bas de ligne s'il est engamé.",
        },
        { n: "3", t: "Moins de 30 secondes hors de l'eau. Pas de doigts dans les ouïes ni les yeux." },
        {
          n: "4",
          t: "Réanimer face au courant, tenir le poisson jusqu'à ce qu'il reparte seul.",
        },
      ],
      actions: [
        btn("Noter la prise (relâchée)", "consigner-rel", "primary"),
        btn("Terminer sans noter", "done"),
      ],
    };
  }

  if (step === "consigner" || step === "consigner-rel") {
    const gardee = step === "consigner";
    const sautees = etapesSautees(sp, dept);
    return {
      ...V,
      kicker: gardee ? "Noter la prise — gardée" : "Noter la prise — relâchée",
      title: "Ce que vous en gardez",
      paras: [
        gardee
          ? `${sp.name} comptera dans votre carnet du jour, donc dans le quota.`
          : `${sp.name} sera notée relâchée : elle ne compte pas dans le quota.`,
        "Rien n'est obligatoire ici. Ce qui reste vide reste vide dans le carnet.",
      ],
      note: sautees.length > 0 ? texteSautees(sp, sautees) : null,
      // Les champs sont rendus par l'écran (Prise.tsx) : ce sont des saisies, pas
      // du texte. Les boutons, eux, restent décrits ici comme partout ailleurs.
      actions: [
        btn("Enregistrer dans le carnet", gardee ? "tocarnet" : "tocarnet-rel", "primary"),
        btn("Terminer sans enregistrer", "done"),
      ],
    };
  }

  return null;
}

/**
 * Ce que le parcours a sauté, dit à l'écran.
 *
 * L'étape maille écrivait « Aucune maille nationale pour cette espèce — un
 * arrêté local peut en fixer une : vérifiez ». L'app refuse donc d'affirmer
 * qu'aucune règle n'existe : elle ne connaît que le socle national et les
 * arrêtés de trois départements. Sauter l'étape SANS RIEN DIRE ferait cette
 * affirmation à sa place — c'est le seul risque que le raccourci introduit, et
 * cette phrase est ce qui l'annule.
 *
 * Elle nomme ce qui manque à l'app, jamais ce qui manque à la loi.
 */
export function texteSautees(sp: Species, sautees: PriseEtape[]): string {
  const quoi =
    sautees.length === 2
      ? "ni maille ni quota"
      : sautees[0] === "maille"
        ? "pas de maille"
        : "pas de quota";
  return `L'app ne connaît ${quoi} pour ${sp.name} — ni au socle national, ni dans les arrêtés qu'elle porte. Un arrêté local peut en fixer : vérifiez celui en vigueur.`;
}

export const STEP_ORDER: Record<string, number> = {
  statut: 1,
  maille: 2,
  quota: 3,
  choix: 4,
  kill: 5,
  release: 5,
};

// PREV_STEP a disparu avec ce lot : le chemin de retour n'est plus déduit d'une
// table parallèle mais dépilé de l'historique du navigateur, qui sait par où on
// est réellement passé (y compris les raccourcis, que cette table oubliait).
