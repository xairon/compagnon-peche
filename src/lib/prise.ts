import type { Species } from "../types";
import type { PriseStep } from "../store";
import { season } from "./season";
import { QUOTA_CARNASSIERS } from "./helpers";

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

/** The decision-flow card for the current species and step. Returns null when idle. */
export function priseView(
  sp: Species | undefined,
  step: PriseStep,
  quota: { c: number; b: number },
): PriseView | null {
  if (!sp || !step) return null;
  const seas = season(sp);
  const V = base();

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
        kicker: "Statut légal — R432-5",
        title: "Interdit de la remettre vivante à l'eau",
        paras: [
          sp.name +
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
          "La période de pêche du " +
            sp.name.toLowerCase() +
            " est fermée à cette date. Remise à l'eau immédiate et soignée.",
        ],
        actions: [btn("Gestes pour bien relâcher", "release", "primary")],
      };
    const openParas = [
      "Aucune interdiction nationale pour " +
        sp.name.toLowerCase() +
        " à cette date (" +
        seas.label.toLowerCase() +
        "). Passons à la maille.",
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
      actions: [btn("Continuer — vérifier la maille", "maille", "primary")],
    };
  }

  if (step === "maille") {
    const has = sp.maille !== "—";
    return {
      ...V,
      tone: "warn",
      banner: has ? "MESURER — " + sp.maille : undefined,
      kicker: "Maille — taille légale minimale",
      title: has ? "Mesure-t-elle au moins " + sp.maille + " ?" : "Pas de taille légale nationale",
      paras: [
        has
          ? "Mesurez du bout du museau à l'extrémité de la queue. Sous la maille : remise à l'eau obligatoire, immédiate et soignée."
          : "Aucune maille nationale pour cette espèce — un arrêté local peut en fixer une : vérifiez. Sinon, à vous de décider.",
      ],
      note: sp.reg && sp.reg.note ? sp.reg.note : null,
      actions: has
        ? [
            btn("Oui, elle fait la maille", "quota", "primary"),
            btn("Non — sous la maille", "release"),
            btn("Mesurer — règle à l'écran", "ruler"),
          ]
        : [btn("Continuer", "quota", "primary")],
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
    const otherQuota = !isCarnassier && !declare && sp.quota !== "—";

    if (isCarnassier) {
      return {
        ...V,
        kicker,
        title: "Où en êtes-vous du quota ?",
        paras: [
          "Rappel : 3 carnassiers par jour et par pêcheur (sandre + brochet + black-bass), dont 2 brochets maximum (art. R436-21). Ce cumul vaut en 2ᵉ catégorie ; en 1ʳᵉ catégorie, seul le plafond de 2 brochets/jour s'applique.",
          "D'après votre carnet aujourd'hui : " +
            quota.c +
            " / 3 carnassiers gardés, dont " +
            quota.b +
            " / 2 brochets.",
        ],
        actions: [
          btn("Quota non atteint — je continue", "choix", "primary"),
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
        actions: [btn("Continuer", "choix", "primary")],
      };
    }
    if (otherQuota) {
      return {
        ...V,
        kicker,
        title: "Quota spécifique",
        paras: [
          "Quota pour cette espèce : " +
            sp.quota +
            (sp.quotaSub && sp.quotaSub !== "—" ? " (" + sp.quotaSub + ")" : "") +
            ".",
          "Un arrêté préfectoral peut préciser ou restreindre ce quota.",
        ],
        actions: [btn("Continuer", "choix", "primary")],
      };
    }
    return {
      ...V,
      kicker,
      title: "Pas de quota national",
      paras: ["Aucun quota national pour cette espèce. Un arrêté local peut en fixer un."],
      actions: [btn("Continuer", "choix", "primary")],
    };
  }

  if (step === "choix") {
    return {
      ...V,
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
      actions: [btn("Ajouter au carnet", "tocarnet", "primary"), btn("Terminer", "done")],
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
        btn("Ajouter au carnet (relâché)", "tocarnet-rel", "primary"),
        btn("Terminer", "done"),
      ],
    };
  }

  return null;
}

export const STEP_ORDER: Record<string, number> = {
  statut: 1,
  maille: 2,
  quota: 3,
  choix: 4,
  kill: 5,
  release: 5,
};

export const PREV_STEP: Record<string, PriseStep> = {
  maille: "statut",
  quota: "maille",
  choix: "quota",
  kill: "choix",
  release: "choix",
};
