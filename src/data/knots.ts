import type { Knot } from "../types";

export const KNOTS: Knot[] = [
  {
    id: "clinch",
    cat: "noeud",
    name: "Clinch amélioré",
    use: "Attacher un hameçon ou un leurre",
    when: "Le nœud de base pour attacher hameçons, agrafes et leurres sur nylon ou fluorocarbone jusqu'à 40/100.",
    steps: [
      "Passer le fil dans l'œillet, faire 5 à 7 tours autour du brin principal.",
      "Repasser le bout dans la première boucle contre l'œillet, puis dans la grande boucle formée.",
      "Humecter, serrer progressivement en tirant le brin principal, raser l'excédent.",
    ],
  },
  {
    id: "palomar",
    cat: "noeud",
    name: "Palomar",
    use: "Hameçon / agrafe — très solide, tresse comprise",
    when: "Excellente résistance, idéal sur tresse (drop shot, texan). Nécessite de passer le leurre dans la boucle.",
    steps: [
      "Doubler le fil et passer la boucle dans l'œillet.",
      "Faire un nœud simple avec la boucle, sans serrer.",
      "Passer l'hameçon entier dans la boucle, humecter et serrer.",
    ],
  },
  {
    id: "raccord",
    cat: "noeud",
    name: "Raccord ligne / bas de ligne",
    use: "Relier tresse et fluorocarbone",
    when: "Pour relier le corps de ligne (tresse) au bas de ligne (fluoro) sans agrafe — passe dans les anneaux.",
    steps: [
      "Former une boucle avec le fluorocarbone.",
      "Enrouler la tresse 8 à 10 fois autour des deux brins de la boucle.",
      "Repasser la tresse dans la boucle, humecter, serrer les deux côtés, raser.",
    ],
  },
  {
    id: "boucle",
    cat: "noeud",
    name: "Boucle simple (chirurgien)",
    use: "Créer une boucle en bout de ligne",
    when: "Boucle rapide pour montages boucle-dans-boucle (pêche au coup, bas de ligne prêts).",
    steps: [
      "Doubler le fil sur 15 cm.",
      "Faire deux nœuds simples successifs avec le fil doublé.",
      "Humecter et serrer ; la boucle doit rester bien ronde.",
    ],
  },
  {
    id: "sang",
    cat: "noeud",
    name: "Nœud de sang",
    use: "Relier deux fils de diamètre proche",
    when: "Le nœud de référence pour raccorder deux nylons ou deux fluorocarbones de diamètre similaire (bas de ligne, réparation de casse).",
    steps: [
      "Superposer les deux brins sur 15 cm, en sens opposés.",
      "Enrouler chaque brin 5 à 6 fois autour de l'autre, en partant du centre vers l'extérieur.",
      "Repasser les deux bouts au centre, en sens inverse l'un de l'autre, puis humecter et serrer progressivement les deux côtés.",
    ],
  },
  {
    id: "albright",
    cat: "noeud",
    name: "Albright",
    use: "Relier deux fils de diamètre très différent",
    when: "Backing/tresse épaisse vers bas de ligne fin, ou corps de ligne vers un fil beaucoup plus fin — là où le nœud de sang glisse.",
    steps: [
      "Former une boucle avec le fil le plus épais, la tenir entre deux doigts.",
      "Passer le fil fin dans la boucle et l'enrouler 10 à 12 fois autour des deux brins de la boucle, en revenant vers l'ouverture.",
      "Repasser le bout du fil fin dans la boucle par le même côté qu'à l'entrée, humecter et serrer progressivement en tenant les deux fils épais.",
    ],
  },
  {
    id: "chaise",
    cat: "noeud",
    name: "Nœud de chaise",
    use: "Boucle fixe et solide en bout de ligne",
    when: "Amarrer une embarcation, fixer une ligne à un point fixe (piquet, anneau) — une boucle qui ne glisse jamais et se défait pourtant facilement après tension.",
    steps: [
      "Former une petite boucle sur le brin dormant, environ 30 cm avant le bout.",
      "Faire passer le bout du fil dans cette boucle, par en dessous.",
      "Passer le bout derrière le brin dormant puis le repasser dans la petite boucle, dans le sens inverse ; humecter et serrer en tenant le brin dormant.",
    ],
  },
  {
    id: "dropshot",
    cat: "montage",
    name: "Drop shot",
    use: "Sandre et perche en verticale ou au posé",
    when: "Présenter un leurre souple au-dessus du fond, plomb en bas : idéal cassures et postes profonds.",
    steps: [
      "Nouer l'hameçon au palomar en laissant 30–80 cm de fil sous le nœud.",
      "Repasser le brin dans l'œillet pour que l'hameçon pointe vers le haut.",
      "Fixer le plomb drop shot à l'extrémité ; escher le leurre par la tête.",
    ],
  },
  {
    id: "texan",
    cat: "montage",
    name: "Montage texan",
    use: "Pêcher dans les obstacles sans accrocher",
    when: "Leurre souple anti-herbe pour brochet et bass dans le bois noyé et les herbiers.",
    steps: [
      "Enfiler un plomb balle sur le fil, pointe vers le leurre.",
      "Nouer un hameçon texan (clinch ou palomar).",
      "Piquer le leurre par la tête puis rentrer la pointe dans le corps (anti-accroc).",
    ],
  },
  {
    id: "paternoster",
    cat: "montage",
    name: "Pater-noster",
    use: "Pêche au vif ou au posé",
    when: "Montage classique pour le vif (sandre, brochet) : le plomb au fond, l'esche à distance sur une potence.",
    steps: [
      "Former une potence (boucle) sur le corps de ligne à 40–60 cm du bas.",
      "Fixer le plomb à l'extrémité du corps de ligne.",
      "Monter le bas de ligne esché boucle-dans-boucle sur la potence.",
    ],
  },
];
