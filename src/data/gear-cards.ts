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
  appat: [],
  fil: [],
};
