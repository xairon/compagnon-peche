// The six crayfish an angler meets in Centre-Val de Loire. Regulatory wording
// follows the house rule: the national figure first, the préfectoral arrêté
// always as the last word — never a bare green light.

export interface Crayfish {
  id: string;
  name: string;
  latin: string;
  /** true = pêchable (envahissante) ; false = fermée toute l'année ici.
   *  Reste la réponse pratique au bord de l'eau (« puis-je la garder ? ») ;
   *  le mécanisme légal, lui, vit dans `statut`. */
  pechable: boolean;
  /** The one sentence that matters when the balance comes out of the water. */
  note: string;
  /** La base légale réelle. Surtout PAS « espèce protégée » pour justifier une
   *  interdiction de capture : l'arrêté du 21 juillet 1983 ne protège que
   *  l'habitat, ne vise pas les pattes grêles, et l'interdiction de pêcher vient
   *  de R436-10 (fenêtre de 10 jours max) que l'arrêté préfectoral n'ouvre pas. */
  statut: string;
  /** Renseigné seulement quand la présence locale est douteuse — l'app le dit
   *  plutôt que de présenter l'espèce comme banalement rencontrable. */
  presence?: string;
  /** Calqué sur Species.ident : même vocabulaire dans toute l'app. */
  ident?: {
    summary: string;
    traits: string[];
    conf: { n: string; how: string }[];
  };
}

export const ECREVISSES: Crayfish[] = [
  {
    id: "louisiane",
    name: "Écrevisse de Louisiane",
    latin: "Procambarus clarkii",
    pechable: true,
    note: "Pêchable — remise à l'eau vivante et transport vivant interdits (R432-5).",
    statut:
      "Pêchable, sans taille minimale. Espèce susceptible de provoquer des déséquilibres biologiques (R432-5) : la remettre vivante à l'eau ou la transporter vivante est interdit.",
    ident: {
      summary:
        "La plus envahissante des écrevisses de France : grande, rouge sombre, les pinces couvertes de tubercules rouges saillants.",
      traits: [
        "Tubercules rouges sur toute la pince, pas seulement dessous",
        "Épine interne sur le carpopodite (famille des Cambaridae)",
        "Rostre à bords convergents, sans crête médiane",
        "Céphalothorax rugueux",
        "Peut dépasser 15 cm",
      ],
      conf: [
        {
          n: "Écrevisse à pattes rouges",
          how: "Vérifiez l'épine interne du carpopodite, le segment juste avant la grosse pince : la Louisiane en a une, la pattes rouges jamais. C'est le test le plus sûr — binaire, indépendant de la lumière, et il marche même sur les juvéniles. Ne vous fiez pas à la couleur : la Louisiane va du bordeaux à l'olive.",
        },
      ],
    },
  },
  {
    id: "americaine",
    name: "Écrevisse américaine",
    latin: "Faxonius limosus",
    pechable: true,
    note: "Pêchable — remise à l'eau vivante et transport vivant interdits (R432-5).",
    statut:
      "Pêchable, sans taille minimale. Espèce susceptible de provoquer des déséquilibres biologiques (R432-5) : la remettre vivante à l'eau ou la transporter vivante est interdit.",
    ident: {
      summary:
        "Petite écrevisse envahissante, la plus anciennement installée en France, reconnaissable aux bandes rougeâtres en travers de l'abdomen.",
      traits: [
        "Bandes rougeâtres en travers des anneaux de l'abdomen",
        "Épine interne sur le carpopodite (famille des Cambaridae)",
        "Rostre en gouttière, à bords parallèles",
        "Épines avant et après le sillon cervical",
        "Taille modeste, dépasse rarement 10 cm",
      ],
      conf: [
        {
          n: "Écrevisse de Louisiane",
          how: "Toutes deux ont l'épine du carpopodite, donc toutes deux sont pêchables — l'erreur est sans conséquence légale. L'américaine reste plus petite et porte des bandes nettes en travers de l'abdomen, là où la Louisiane est uniformément rouge sombre à tubercules.",
        },
      ],
    },
  },
  {
    id: "signal",
    name: "Écrevisse signal",
    latin: "Pacifastacus leniusculus",
    pechable: true,
    note: "Pêchable — remise à l'eau vivante et transport vivant interdits (R432-5).",
    statut:
      "Pêchable, sans taille minimale. Espèce susceptible de provoquer des déséquilibres biologiques (R432-5) : la remettre vivante à l'eau ou la transporter vivante est interdit.",
    ident: {
      summary:
        "Grosse écrevisse envahissante nord-américaine, lisse et trapue. Une tache claire à l'articulation de chaque pince lui donne son nom — et c'est elle qui la distingue de l'espèce fermée qu'on lui confond le plus.",
      traits: [
        "Tache blanche à bleutée à l'articulation de la pince — le « signal »",
        "Deux crêtes derrière l'œil",
        "Céphalothorax lisse",
        "Pinces lisses, rouges en dessous",
        "Rostre à bords parallèles",
      ],
      conf: [
        {
          n: "Écrevisse à pattes blanches",
          how: "C'est la confusion qui coûte cher : la pattes blanches est fermée toute l'année. Cherchez la tache claire à l'articulation de la pince — le signal en a une, la pattes blanches aucune. Le dessous des pinces (rouge chez le signal, blanc chez la pattes blanches) confirme, mais se juge mal sur un animal couvert de vase. Dans le doute, relâchez.",
        },
      ],
    },
  },
  {
    id: "pattes-blanches",
    name: "Écrevisse à pattes blanches",
    latin: "Austropotamobius pallipes",
    pechable: false,
    note: "Remise à l'eau immédiate, sans la sortir de l'eau si possible.",
    statut:
      "Pêche fermée toute l'année dans l'Indre et la Creuse (arrêtés préfectoraux 2026). R436-10 prévoit une fenêtre de dix jours au maximum, que ces arrêtés n'ouvrent pas. L'arrêté du 21 juillet 1983 protège en outre son habitat. Loir-et-Cher : à vérifier sur l'arrêté en vigueur.",
    ident: {
      summary:
        "La seule écrevisse autochtone encore régulièrement observée dans la région. Corps brun-olive, pinces rugueuses dont le dessous est blanc sale — d'où son nom.",
      traits: [
        "Une seule crête derrière l'œil (les autres en ont deux)",
        "Dessous des pinces blanc à beige",
        "Rostre triangulaire, à bords lisses",
        "Pinces rugueuses, granuleuses",
        "Taille courante 8–9 cm",
      ],
      conf: [
        {
          n: "Écrevisse signal",
          how: "Le signal porte une tache blanc-turquoise nette à l'articulation de la pince ; la pattes blanches n'en a aucune. Vérifiez cela en premier : c'est une marque franche, là où la couleur du dessous des pinces se juge mal sur un animal boueux. Le signal a aussi deux crêtes derrière l'œil au lieu d'une.",
        },
      ],
    },
  },
  {
    id: "pattes-grelles",
    name: "Écrevisse à pattes grêles",
    latin: "Astacus leptodactylus",
    pechable: false,
    note: "Remise à l'eau immédiate.",
    statut:
      "Pêche fermée toute l'année dans l'Indre et la Creuse (arrêtés préfectoraux 2026), au même titre que les autres écrevisses visées par R436-10. Introduite au XIXᵉ siècle mais considérée aujourd'hui comme autochtone ; l'arrêté de 1983 sur l'habitat ne la vise pas. Loir-et-Cher : à vérifier.",
    ident: {
      summary:
        "Écrevisse au corps clair et aux pinces remarquablement longues et étroites, qui lui valent son nom. La DREAL Centre-Val de Loire la compte parmi les cinq espèces de la région.",
      traits: [
        "Pinces longues, étroites, effilées — le trait qui la nomme",
        "Deux crêtes derrière l'œil",
        "Crête médiane du rostre dentelée",
        "Face ventrale beige, petite tache rouge à l'articulation de la pince",
        "Épines sur les flancs et sur les pinces",
      ],
      conf: [
        {
          n: "Écrevisse à pattes rouges",
          how: "Même famille, même nombre de crêtes derrière l'œil, même rostre dentelé : aucun repère anatomique franc ne les sépare. Ce sont les pinces qui tranchent — nettement plus longues et fines ici — et le dessous, beige contre rouge vif. C'est un jugement, pas un test ; les deux sont fermées de toute façon, donc l'erreur entre elles est sans conséquence.",
        },
      ],
    },
  },
  {
    id: "pattes-rouges",
    name: "Écrevisse à pattes rouges",
    latin: "Astacus astacus",
    pechable: false,
    note: "Remise à l'eau immédiate.",
    statut:
      "Pêche fermée toute l'année dans l'Indre et la Creuse (arrêtés préfectoraux 2026) ; R436-10 prévoit une fenêtre de dix jours au maximum que ces arrêtés n'ouvrent pas. Habitat protégé par l'arrêté du 21 juillet 1983. Loir-et-Cher : à vérifier.",
    presence:
      "Présence actuelle incertaine dans les départements couverts : aucun relevé postérieur à 1990, et la DREAL Centre-Val de Loire ne la compte pas parmi les espèces de la région (son aire d'origine est le quart nord-est). Elle reste nommée dans les arrêtés, donc conservée ici par précaution.",
    ident: {
      summary:
        "Grande écrevisse brun-olive aux pinces massives et rugueuses, dont le dessous est franchement rouge.",
      traits: [
        "Deux crêtes derrière l'œil",
        "Dessous des pinces rouge vif",
        "Crête médiane du rostre dentelée",
        "Pinces massives et rugueuses",
        "Épines derrière le sillon cervical",
      ],
      conf: [
        {
          n: "Écrevisse de Louisiane",
          how: "Vérifiez l'épine interne du carpopodite, le segment juste avant la grosse pince : la Louisiane en a une, la pattes rouges jamais. Test binaire, indépendant de la couleur — qui trompe, la Louisiane allant du bordeaux à l'olive — et valable sur les juvéniles.",
        },
        {
          n: "Écrevisse à pattes grêles",
          how: "Très proches. Les pinces de la pattes grêles sont nettement plus longues et effilées, et son dessous est beige là où celui de la pattes rouges est rouge vif. Les deux sont fermées, donc se tromper entre elles ne porte pas à conséquence.",
        },
      ],
    },
  },
];

export const PECHABLES = ECREVISSES.filter((e) => e.pechable);

/** Le premier tri à faire, parce qu'il tranche six espèces d'un coup et qu'il ne
 *  dépend ni de la couleur ni de la lumière. Affiché en tête de l'écran
 *  d'identification. */
export const TRI_CARPOPODITE =
  "Regardez le carpopodite — le segment juste avant la grosse pince. S'il porte une épine interne, c'est une envahissante nord-américaine (américaine ou Louisiane), pêchable. Sinon, c'est une écrevisse de la famille des Astacidae : signal (pêchable), ou l'une des trois espèces fermées toute l'année.";

/** Mise en garde à afficher avec les critères : ils valent pour des adultes, et
 *  la couleur varie au sein d'une même population. */
export const IDENT_CAVEAT =
  "Ces critères sont moins fiables sur les juvéniles, et la couleur varie d'un individu à l'autre. Quand la décision est légale, ne tranchez jamais sur la seule couleur : dans le doute, relâchez.";

export function crayfishById(id: string): Crayfish | undefined {
  return ECREVISSES.find((e) => e.id === id);
}

/** Shown on the session setup screen. */
export const REG_BALANCES = [
  "6 balances au maximum par pêcheur (repère national) — jusqu'à 10 dans certains départements.",
  "Diamètre maximal d'une balance : 30 cm.",
  "Espèces pêchables : 1ʳᵉ catégorie du 14/03 au 20/09, 2ᵉ catégorie toute l'année (Indre 2026). L'app ne sait pas sur quelle catégorie d'eau vous êtes — vérifiez.",
  "Écrevisses à pattes blanches, rouges, grêles et des torrents : pêche fermée toute l'année (Indre et Creuse 2026).",
  "Périodes et cours d'eau autorisés : vérifiez l'arrêté préfectoral en vigueur.",
];

export const REG_SOURCE =
  "Code de l'environnement, art. R436-10 · R436-18 · R436-23 à R436-29 · R432-5 · arrêté du 21 juillet 1983 · arrêtés préfectoraux 2026 (36, 23)";

/** The 9 cm figure exists (R436-18) but the species it targets isn't fished
 *  here: it is displayed WITH that caveat, never as a permission. */
export const MAILLE_NOTE =
  "Une maille de 9 cm figure au R436-18 pour l'écrevisse à pattes rouges, mais elle ne se pêche pas ici : les arrêtés préfectoraux 2026 de l'Indre et de la Creuse n'ouvrent aucun des dix jours que R436-10 rend possibles (Loir-et-Cher : à vérifier). Les trois espèces pêchables n'ont pas de taille minimale.";
