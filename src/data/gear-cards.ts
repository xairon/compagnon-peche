/** Une fiche enrichie du guide matériel — leurres, appâts ou fils. Les
 *  hameçons (tailles) restent en tableau `GuideEntry[]` dans gear.ts : ce
 *  sont des plages de taille, pas des types distincts, la table est déjà la
 *  bonne représentation.
 *
 *  `species`, `filIds` et `hamecon` sont la SEULE source de vérité de leurs
 *  liens respectifs : une fiche espèce ne stocke jamais "je suis citée par
 *  X" (elle le déduit en filtrant GEAR_CARDS), et une fiche fil ne stocke
 *  jamais "ces leurres m'utilisent" (elle le déduit en scannant filIds). */
export interface GuideCard {
  id: string;
  name: string;
  summary: string; // ce que c'est
  usage: string; // comment/quand l'utiliser (animation, montage, saison)
  species?: string[]; // ids réels de SPECIES, tapables — jamais du texte libre
  filIds?: string[]; // leurres uniquement : ids vers GEAR_CARDS.fil
  hamecon?: string; // texte libre renvoyant à la table des tailles (ex. "N° 1 à 2/0") — pas un lien, la table n'a pas de fiches individuelles
}

export const GEAR_CARDS: Record<"leurre" | "appat" | "fil", GuideCard[]> = {
  leurre: [
    {
      id: "leurre-souple",
      name: "Leurre souple (shad, finesse, virgule)",
      summary: "Corps en plastique souple monté sur une tête plombée, imite un petit poisson ou un ver par sa nage.",
      usage: "Lancer-ramener régulier ou saccadé, laisser couler entre deux tirées pour les touches à la descente. Adapter le grammage de la tête plombée à la profondeur et au courant.",
      species: ["sandre", "perche", "brochet", "black-bass"],
      filIds: ["tresse", "fluorocarbone", "bas-de-ligne-acier"],
      hamecon: "Crochet intégré à la tête plombée, généralement N° 1 à 2/0.",
    },
    {
      id: "poisson-nageur",
      name: "Poisson-nageur (crank, jerk, minnow)",
      summary: "Leurre dur à bavette qui plonge et nage tout seul à la récupération, sans action du poignet nécessaire.",
      usage: "Récupération linéaire pour les cranks (la bavette fait le travail), ramener saccadé avec pauses pour les jerks. La taille de la bavette fixe la profondeur de nage.",
      species: ["brochet", "perche", "truite-fario", "truite-arc-en-ciel"],
      filIds: ["fluorocarbone", "bas-de-ligne-acier"],
      hamecon: "Triples d'origine, généralement N° 6 à 2 selon la taille du leurre.",
    },
    {
      id: "cuiller-tournante",
      name: "Cuiller tournante",
      summary: "Une palette métallique tourne autour d'un axe, vibrations et flash très visibles de loin.",
      usage: "Lancer-ramener simple, vitesse constante pour que la palette tourne régulièrement. Efficace en eau claire ou légèrement teintée.",
      species: ["truite-fario", "truite-arc-en-ciel", "perche", "chevesne"],
      filIds: ["fluorocarbone"],
      hamecon: "Triple d'origine, N° 8 à 4.",
    },
    {
      id: "cuiller-ondulante",
      name: "Cuiller ondulante",
      summary: "Une palette métallique galbée ondule en tombant ou en nageant, sans axe ni rotation.",
      usage: "Se pêche aussi bien en lancer-ramener qu'en verticale (jig) où elle plane à la descente. Bonne portée de lancer grâce à son poids. Bas de ligne acier devant le brochet (dents), fluorocarbone devant la truite, qui se méfie du câble.",
      species: ["brochet", "truite-fario"],
      filIds: ["tresse", "fluorocarbone", "bas-de-ligne-acier"],
      hamecon: "Triple ou simple d'origine, N° 6 à 1.",
    },
    {
      id: "spinnerbait",
      name: "Spinnerbait / chatterbait",
      summary: "Un bras métallique porte une ou deux palettes au-dessus d'une tête plombée à jupe ou à brin souple — la palette protège l'hameçon des accrochages.",
      usage: "Ramener à travers les branchages et herbiers sans craindre l'accroc grâce au bras anti-herbe. Varier la vitesse pour faire vibrer ou tourner la palette.",
      species: ["brochet", "black-bass"],
      filIds: ["tresse", "bas-de-ligne-acier"],
      hamecon: "Simple intégré à la tête plombée, N° 1 à 2/0.",
    },
    {
      id: "popper-stickbait",
      name: "Popper / stickbait (surface)",
      summary: "Leurre qui reste en surface, gloups et éclaboussures pour le popper, nage en zigzag pour le stickbait — attaques visibles et spectaculaires.",
      usage: "Petites tirées sèches suivies de pauses pour le popper (le bruit attire) ; ramener en walking-the-dog (poignet qui balance) pour le stickbait. Idéal tôt le matin ou au crépuscule, eau calme.",
      species: ["black-bass", "chevesne", "perche"],
      filIds: ["tresse", "fluorocarbone"],
      hamecon: "Triples d'origine, N° 8 à 4.",
    },
    {
      id: "jig",
      name: "Jig (pêche verticale)",
      summary: "Tête plombée nue ou habillée, pêchée à la verticale ou en traîne lente sur le fond.",
      usage: "Descendre jusqu'au fond, animer par petites secousses du poignet en gardant le contact avec le fond, laisser retomber entre chaque animation.",
      species: ["sandre", "perche", "silure"],
      filIds: ["tresse"],
      hamecon: "Simple intégré, N° 1 à 3/0 selon le grammage.",
    },
  ],
  appat: [
    {
      id: "ver-de-terre",
      name: "Ver de terre / lombric",
      summary: "L'appât naturel le plus polyvalent, disponible partout, efficace sur presque toutes les espèces.",
      usage: "Piqué une ou deux fois pour rester vivant et remuant, ou en paquet pour les grosses bouches. Bon toute l'année, particulièrement après la pluie.",
      species: ["truite-fario", "truite-arc-en-ciel", "perche", "breme", "tanche", "anguille", "chevesne"],
      hamecon: "N° 10 à 4 selon la taille du ver et du poisson visé.",
    },
    {
      id: "asticot",
      name: "Asticot & pinkie",
      summary: "Larve de mouche, petite et très remuante, l'appât de référence de la pêche au coup.",
      usage: "Piqué par le bout le plus épais pour rester vivant, en paquet de 2-3 pour les grosses touches ou seul pour la finesse. S'amorce facilement en accompagnement.",
      species: ["gardon", "ablette", "breme"],
      hamecon: "N° 20 à 14, fins de fer.",
    },
    {
      id: "teigne",
      name: "Teigne (larve de la fausse teigne de la cire)",
      summary: "Larve blanc crème et molle, élevée sur la cire des ruches, très odorante. À ne pas confondre avec le ver de farine, une autre larve vendue séparément.",
      usage: "Piquée par la tête, une ou deux par hameçon. Se conserve plusieurs semaines au frais. L'appât de référence de la pêche au toc en dérive ; le ver de farine, plus ferme et moins odorant, s'utilise de la même façon mais tient mieux à l'hameçon.",
      species: ["truite-fario", "perche"],
      hamecon: "N° 14 à 10.",
    },
    {
      id: "mais-doux",
      name: "Maïs doux",
      summary: "Grain sucré en boîte, sélectif — filtre les petits poissons et cible les plus gros.",
      usage: "2 à 3 grains piqués sur l'hameçon, réserve du jus utilisable en amorçage. Économique et facile à transporter.",
      species: ["carpe", "tanche", "gardon", "breme"],
      hamecon: "N° 8 à 4.",
    },
    {
      id: "pain-pate",
      name: "Pain / pâte",
      summary: "Mie de pain ou pâte pétrie à la farine, moulée directement autour de l'hameçon.",
      usage: "Façonnée en boulette juste avant de pêcher, se ramollit vite dans l'eau donc à renouveler souvent. Aussi utile en amorçage de surface pour le chevesne.",
      species: ["chevesne", "carpe", "gardon"],
      hamecon: "N° 8 à 4.",
    },
    {
      id: "bouillette",
      name: "Bouillette",
      summary: "Boule d'appât cuite à base de farines et arômes, calibrée en diamètre, conçue pour durer immergée.",
      usage: "Montée sur cheveu (voir montage cheveu), jamais piquée directement sur l'hameçon. Le parfum et la taille se choisissent selon la pression de pêche du plan d'eau.",
      species: ["carpe"],
      hamecon: "N° 4 à 2, monté sur cheveu (jamais piqué directement).",
    },
    {
      id: "vif",
      name: "Vif (petit poisson vivant)",
      summary: "Petit poisson vivant présenté entier, l'appât naturel le plus efficace pour les carnassiers.",
      usage: "Piqué à la lèvre supérieure pour nager librement, ou monté en pater-noster pour rester à un niveau donné. Vérifiez les espèces autorisées comme vif dans votre département.",
      species: ["brochet", "sandre", "perche"],
      hamecon: "N° 1 à 2/0, simple ou triple selon montage.",
    },
    {
      id: "ver-marin",
      name: "Vers marins (dur, arénicole)",
      summary: "Ver marin vendu en bourriche, odeur forte, prisé en zone d'influence marine.",
      usage: "Enfilé sur l'hameçon en laissant la pointe libre, à renouveler régulièrement car il s'assèche vite hors de l'eau.",
      species: ["flet", "mulet-cabot"],
      hamecon: "N° 4 à 1.",
    },
  ],
  fil: [
    {
      id: "nylon",
      name: "Nylon (monofilament)",
      summary: "Fil élastique et économique, le plus polyvalent pour débuter — flotte légèrement, absorbe les à-coups.",
      usage: "Corps de ligne au coup ou aux leurres pour un budget serré. Se détend avec le temps et le soleil : à renouveler régulièrement (une fois par saison en usage régulier).",
    },
    {
      id: "fluorocarbone",
      name: "Fluorocarbone",
      summary: "Quasi invisible sous l'eau (indice de réfraction proche de celui de l'eau), résistant à l'abrasion, coule.",
      usage: "En bas de ligne devant une tresse ou un nylon pour la discrétion, ou en corps de ligne complet en pêche fine et méfiante.",
    },
    {
      id: "tresse",
      name: "Tresse",
      summary: "Fibres tressées, très fine à résistance égale, sans élasticité — transmet chaque touche et chaque mouvement du leurre.",
      usage: "Corps de ligne aux leurres pour la sensibilité et la puissance de ferrage, presque toujours complétée par un bas de ligne fluorocarbone pour la discrétion.",
    },
    {
      id: "bas-de-ligne-acier",
      name: "Bas de ligne acier / titane",
      summary: "Câble métallique gainé ou torsadé, seul matériau que les dents ou l'abrasion ne peuvent pas trancher.",
      usage: "Indispensable devant un vif ou un leurre pour le brochet (dents) et le silure (abrasion) — un fluorocarbone, même épais, peut être sectionné net.",
    },
  ],
};
