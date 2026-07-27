/** Une fiche enrichie du guide matériel — leurres, appâts ou fils. Les
 *  hameçons (tailles) restent en tableau `GuideEntry[]` dans gear.ts : ce
 *  sont des plages de taille, pas des types distincts, la table est déjà la
 *  bonne représentation. */
export interface GuideCard {
  id: string;
  name: string;
  summary: string; // ce que c'est
  usage: string; // comment/quand l'utiliser (animation, montage, saison)
  species?: string; // espèces ciblées, si pertinent
}

export const GEAR_CARDS: Record<"leurre" | "appat" | "fil", GuideCard[]> = {
  leurre: [
    {
      id: "leurre-souple",
      name: "Leurre souple (shad, finesse, virgule)",
      summary: "Corps en plastique souple monté sur une tête plombée, imite un petit poisson ou un ver par sa nage.",
      usage: "Lancer-ramener régulier ou saccadé, laisser couler entre deux tirées pour les touches à la descente. Adapter le grammage de la tête plombée à la profondeur et au courant.",
      species: "Sandre, perche, brochet, black-bass",
    },
    {
      id: "poisson-nageur",
      name: "Poisson-nageur (crank, jerk, minnow)",
      summary: "Leurre dur à bavette qui plonge et nage tout seul à la récupération, sans action du poignet nécessaire.",
      usage: "Récupération linéaire pour les cranks (la bavette fait le travail), ramener saccadé avec pauses pour les jerks. La taille de la bavette fixe la profondeur de nage.",
      species: "Brochet, perche, truite",
    },
    {
      id: "cuiller-tournante",
      name: "Cuiller tournante",
      summary: "Une palette métallique tourne autour d'un axe, vibrations et flash très visibles de loin.",
      usage: "Lancer-ramener simple, vitesse constante pour que la palette tourne régulièrement. Efficace en eau claire ou légèrement teintée.",
      species: "Truite, perche, chevesne",
    },
    {
      id: "cuiller-ondulante",
      name: "Cuiller ondulante",
      summary: "Une palette métallique galbée ondule en tombant ou en nageant, sans axe ni rotation.",
      usage: "Se pêche aussi bien en lancer-ramener qu'en verticale (jig) où elle plane à la descente. Bonne portée de lancer grâce à son poids.",
      species: "Brochet, truite de lac",
    },
    {
      id: "spinnerbait",
      name: "Spinnerbait / chatterbait",
      summary: "Un bras métallique porte une ou deux palettes au-dessus d'une tête plombée à jupe ou brin souple — la palette protège l'hameçon des accrochages.",
      usage: "Ramener à travers les branchages et herbiers sans craindre l'accroc grâce au bras anti-herbe. Varier la vitesse pour faire vibrer ou tourner la palette.",
      species: "Brochet, black-bass",
    },
    {
      id: "popper-stickbait",
      name: "Popper / stickbait (surface)",
      summary: "Leurre qui reste en surface, gloups et éclaboussures pour le popper, nage en zigzag pour le stickbait — attaques visibles et spectaculaires.",
      usage: "Petites tirées sèches suivies de pauses pour le popper (le bruit attire) ; ramener en walking-the-dog (poignet qui balance) pour le stickbait. Idéal tôt le matin ou au crépuscule, eau calme.",
      species: "Black-bass, chevesne, perche",
    },
    {
      id: "jig",
      name: "Leurre de traîne / jig",
      summary: "Tête plombée nue ou habillée, pêchée à la verticale ou en traîne lente sur le fond.",
      usage: "Descendre jusqu'au fond, animer par petites secousses du poignet en gardant le contact avec le fond, laisser retomber entre chaque animation.",
      species: "Sandre, perche, silure",
    },
  ],
  appat: [
    {
      id: "ver-de-terre",
      name: "Ver de terre / lombric",
      summary: "L'appât naturel le plus polyvalent, disponible partout, efficace sur presque toutes les espèces.",
      usage: "Piqué une ou deux fois pour rester vivant et remuant, ou en paquet pour les grosses bouches. Bon toute l'année, particulièrement après la pluie.",
      species: "Truite, perche, brème, tanche, anguille, chevesne",
    },
    {
      id: "asticot",
      name: "Asticot & pinkie",
      summary: "Larve de mouche, petite et très remuante, l'appât de référence de la pêche au coup.",
      usage: "Piqué par le bout le plus épais pour rester vivant, en paquet de 2-3 pour les grosses touches ou seul pour la finesse. S'amorce facilement en accompagnement.",
      species: "Poissons blancs (gardon, ablette, brème)",
    },
    {
      id: "teigne",
      name: "Teigne / ver de farine",
      summary: "Larve de mite de la cire, résistante, dégage une odeur qui attire les poissons de rivière.",
      usage: "Piquée par la tête, se conserve facilement au frais plusieurs semaines. Très utilisée à la pêche au toc en dérive.",
      species: "Truite au toc, perche, poissons de rivière",
    },
    {
      id: "mais-doux",
      name: "Maïs doux",
      summary: "Grain sucré en boîte, sélectif — filtre les petits poissons et cible les plus gros.",
      usage: "2 à 3 grains piqués sur l'hameçon, réserve du jus utilisable en amorçage. Économique et facile à transporter.",
      species: "Carpe, tanche, gardon, brème",
    },
    {
      id: "pain-pate",
      name: "Pain / pâte",
      summary: "Mie de pain ou pâte pétrie à la farine, moulée directement autour de l'hameçon.",
      usage: "Façonnée en boulette juste avant de pêcher, se ramollit vite dans l'eau donc à renouveler souvent. Aussi utile en amorçage de surface pour le chevesne.",
      species: "Chevesne, carpe, gardon",
    },
    {
      id: "bouillette",
      name: "Bouillette",
      summary: "Boule d'appât cuite à base de farines et arômes, calibrée en diamètre, conçue pour durer immergée.",
      usage: "Montée sur cheveu (voir montage cheveu), jamais piquée directement sur l'hameçon. Le parfum et la taille se choisissent selon la pression de pêche du plan d'eau.",
      species: "Carpe (pêche à la ligne plombée)",
    },
    {
      id: "vif",
      name: "Vif (petit poisson vivant)",
      summary: "Petit poisson vivant présenté entier, l'appât naturel le plus efficace pour les carnassiers.",
      usage: "Piqué à la lèvre supérieure pour nager librement, ou monté en pater-noster pour rester à un niveau donné. Vérifiez les espèces autorisées comme vif dans votre département.",
      species: "Brochet, sandre, perche",
    },
    {
      id: "ver-marin",
      name: "Vers marins (dur, arénicole)",
      summary: "Ver marin vendu en bourriche, odeur forte, prisé en zone d'influence marine.",
      usage: "Enfilé sur l'hameçon en laissant la pointe libre, à renouveler régulièrement car il s'assèche vite hors de l'eau.",
      species: "Espèces d'estuaire (flet, mulet) en zone amphihaline",
    },
  ],
  fil: [],
};
