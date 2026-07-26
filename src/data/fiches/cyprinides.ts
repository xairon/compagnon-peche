import type { Fiche } from "./index";

// Fiches descriptives des cyprinidés « base ».
//
// Contenu limité à ce qui est établi et vérifiable : morphologie, habitat,
// régime, reproduction, techniques de pêche. Rien de réglementaire (la maille,
// le quota et la période viennent du générateur et des modules de
// réglementation), rien de sanitaire (les avis ANSES et les risques de
// consommation vivent dans data/edibility.ts, où chaque entrée porte sa source).
//
// Source des éléments biologiques : INPN (Inventaire national du patrimoine
// naturel, MNHN) et FishBase, complétés par les fédérations de pêche pour les
// techniques. Une espèce dont un trait n'est pas établi n'a pas ce trait.

const SRC = "INPN (MNHN) · FishBase — biologie et répartition ; techniques : fédérations de pêche";

// Les trois goujons régionaux sont des lignées séparées du goujon commun par la
// génétique, pas par un usage différent : dans la poêle c'est la même friture.
// L'usage est donc écrit une fois et rapporté explicitement à l'espèce sœur,
// comme le fait data/edibility.ts pour ces mêmes lignées.
const GOUJON_COOK = {
  note: "Chair fine et délicate, comme celle du goujon commun dont cette lignée est indissociable au bord de l'eau : le poisson de friture par excellence. Usage rapporté à l'espèce commune, faute de donnée culinaire propre.",
  prep: [
    "Ne pas lever de filets : le poisson se consomme entier",
    "Vider les plus gros sujets, garder les petits tels quels",
    "Fariner puis friture vive et brève",
  ],
};

export const CYPRINIDES: Record<string, Fiche> = {
  "breme-bordeliere": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Cyprinidé au corps très comprimé latéralement, argenté à reflets bleutés. Se distingue de la brème commune par ses grands yeux et ses nageoires paires teintées de rouge à leur base.",
      traits: [
        "Corps haut et plat, argenté",
        "Œil grand — diamètre proche de la longueur du museau",
        "Base des nageoires pectorales et ventrales rougeâtre",
        "Taille courante 15–30 cm",
      ],
      conf: [
        {
          n: "Brème commune",
          how: "La brème commune est plus sombre, bronze, avec un œil nettement plus petit et des nageoires uniformément grises. Elle dépasse souvent 40 cm, ce que la bordelière ne fait pas.",
        },
        {
          n: "Gardon",
          how: "Le gardon a un corps bien moins haut, plus fuselé, et l'iris rouge.",
        },
      ],
    },
    fish: {
      rows: [
        ["Techniques", "Pêche au coup, feeder, anglaise"],
        ["Appâts", "Asticot, ver de vase, pain, graines fines"],
        ["Postes", "Fonds vaseux, zones lentes, bordures de canaux"],
        ["Profondeur", "1–4 m"],
        ["Moment", "Journée, activité soutenue en eau réchauffée"],
      ],
    },
    cook: {
      note: "Chair blanche mais très arêtée, d'un intérêt culinaire limité. Traditionnellement préparée en friture pour les petits sujets, ou en quenelles où les arêtes sont broyées.",
      prep: [
        "Écailler et vider",
        "Inciser les flancs en croisillons pour sectionner les arêtes intramusculaires",
        "Friture vive pour les petits sujets, ou chair broyée en quenelles",
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux lentes ou stagnantes, fonds vaseux, canaux et étangs"],
        ["Régime", "Invertébrés benthiques, zooplancton, débris végétaux"],
        ["Reproduction", "Mai–juin, en bancs sur la végétation immergée"],
        ["Taille", "Couramment 15–30 cm, rarement au-delà de 35 cm"],
      ],
    },
  },

  "ide-melanote": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Cyprinidé robuste au corps fuselé, dos sombre et flancs argentés, nageoires inférieures et caudale nettement rougeâtres. La forme d'ornement (« orfe ») est orange vif.",
      traits: [
        "Corps épais, plus trapu qu'un chevesne",
        "Nageoires anale, ventrales et caudale rouges",
        "Bouche terminale, petite",
        "Peut dépasser 50 cm",
      ],
      conf: [
        {
          n: "Chevesne",
          how: "Le chevesne a une bouche nettement plus large, une tête plus massive et des écailles bordées de sombre ; sa nageoire anale est convexe, celle de l'ide est concave.",
        },
        {
          n: "Rotengle",
          how: "Le rotengle est plus haut de corps, doré, avec la dorsale nettement en retrait des ventrales.",
        },
      ],
    },
    fish: {
      rows: [
        ["Techniques", "Pêche au coup, anglaise, petits leurres"],
        ["Appâts", "Ver, asticot, graines, petits poissons-nageurs"],
        ["Postes", "Grands cours d'eau lents, plans d'eau, sous la surface"],
        ["Profondeur", "0,5–3 m"],
        ["Moment", "Aube et fin de journée"],
      ],
    },
    cook: {
      note: "Chair correcte mais arêtée, meilleure sur les gros sujets. Se prête au four ou à la friture selon la taille.",
      prep: ["Écailler et vider", "Inciser les flancs pour sectionner les arêtes", "Cuisson au four ou friture"],
    },
    bio: {
      rows: [
        ["Habitat", "Grands cours d'eau lents, lacs, parfois eaux saumâtres"],
        ["Régime", "Omnivore : invertébrés, végétaux, petits poissons chez les adultes"],
        ["Reproduction", "Avril–juin sur substrat végétal ou graveleux"],
        ["Taille", "Couramment 30–50 cm, peut dépasser 60 cm"],
      ],
    },
  },

  "able-de-heckel": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Très petit cyprinidé argenté au corps allongé, à la ligne latérale incomplète — un caractère qui le distingue de l'ablette. Rarement plus de 9 cm.",
      traits: [
        "Ligne latérale interrompue après quelques écailles",
        "Bouche nettement orientée vers le haut",
        "Corps translucide, reflets bleutés",
        "Taille 5–9 cm",
      ],
      conf: [
        {
          n: "Ablette",
          how: "L'ablette a une ligne latérale complète, court sur tout le flanc, et atteint 15–20 cm.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Petits plans d'eau végétalisés, mares, bras morts"],
        ["Régime", "Zooplancton, petits invertébrés de surface"],
        ["Reproduction", "Avril–juin, pontes fractionnées sur les plantes"],
        ["Taille", "5–9 cm — espèce à courte durée de vie"],
      ],
    },
  },

  "carassin-argente": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Cyprinidé trapu au corps haut, gris argenté à bronze, sans barbillons. Très résistant aux eaux pauvres en oxygène, il colonise vite les plans d'eau.",
      traits: [
        "Aucun barbillon (contrairement à la carpe)",
        "Corps haut, dos bombé",
        "Dorsale longue, à bord légèrement concave",
        "Péritoine noir visible à l'ouverture",
      ],
      conf: [
        {
          n: "Carpe commune",
          how: "La carpe porte quatre barbillons autour de la bouche ; le carassin n'en a aucun.",
        },
        {
          n: "Carassin commun",
          how: "Le carassin commun est plus doré, à dorsale convexe et péritoine clair ; le gibèle est gris argenté à dorsale concave.",
        },
      ],
    },
    fish: {
      rows: [
        ["Techniques", "Pêche au coup, feeder"],
        ["Appâts", "Ver de vase, asticot, pain, graines"],
        ["Postes", "Étangs, mares, bras morts, fonds vaseux"],
        ["Profondeur", "0,5–3 m"],
        ["Moment", "Journée, surtout en eau réchauffée"],
      ],
    },
    cook: {
      note: "Chair blanche mais molle et très arêtée, qui prend facilement le goût du milieu — le carassin d'un étang vaseux est immangeable, celui d'une eau claire est correct.",
      prep: [
        "Garder le poisson quelques jours en eau claire (dégorger) atténue le goût de vase",
        "Écailler et vider, inciser les flancs en croisillons pour sectionner les arêtes",
        "Friture pour les petits sujets, chair broyée en quenelles pour les gros",
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux stagnantes, y compris très pauvres en oxygène"],
        ["Régime", "Omnivore : invertébrés, détritus, végétaux"],
        ["Reproduction", "Mai–juillet ; populations parfois exclusivement femelles (gynogenèse)"],
        ["Taille", "Couramment 15–35 cm"],
      ],
    },
  },

  "poisson-rouge": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Cyprinidé sans barbillon. La forme ornementale, orange à rouge, est la seule combinaison de cette couleur chez les Carassius ; les populations retournées à l'état sauvage prennent une robe brune à argentée, parfois encore marquée de taches orange ou blanches résiduelles qui trahissent leur origine.",
      traits: [
        "Aucun barbillon",
        "Robe brune à argentée à l'état sauvage, parfois tachetée d'orange résiduel",
        "Museau plus effilé que le carassin argenté",
        "Peut atteindre 25–30 cm en bassin, davantage en milieu naturel",
      ],
      conf: [
        {
          n: "Carassin argenté (gibèle)",
          how: "Le poisson rouge retourné à l'état sauvage ressemble beaucoup au gibèle mais reste moins haut de corps ; des taches orange ou blanches résiduelles, absentes chez le gibèle, trahissent une origine ornementale.",
        },
        {
          n: "Carpe commune",
          how: "La carpe porte quatre barbillons autour de la bouche ; le poisson rouge n'en a aucun.",
        },
      ],
    },
    fish: {
      rows: [
        ["Techniques", "Pêche au coup, feeder"],
        ["Appâts", "Ver de vase, asticot, pain, graines"],
        ["Postes", "Étangs, mares, eaux calmes très végétalisées"],
        ["Profondeur", "0,5–2 m"],
        ["Moment", "Journée, en eau réchauffée"],
      ],
    },
    cook: {
      note: "Même chair molle et arêtée que le carassin argenté, dont il est très proche. Aucune tradition culinaire en France : c'est un poisson d'ornement relâché, pas un poisson de table.",
      prep: [
        "Dégorger en eau claire si la prise vient d'un étang vaseux",
        "Inciser les flancs en croisillons pour sectionner les arêtes",
        "Friture, ou chair broyée en quenelles",
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux calmes et végétalisées ; très tolérant à la pollution et au manque d'oxygène"],
        ["Régime", "Omnivore : invertébrés, végétaux, détritus"],
        ["Reproduction", "Juin–juillet, pontes multiples sur la végétation"],
        ["Taille", "Populations sauvages issues de lâchers ; 15–30 cm couramment"],
      ],
    },
  },

  "amour-blanc": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Grande carpe herbivore au corps allongé, presque cylindrique, moins haut que la carpe commune. Grandes écailles nettement bordées de sombre dessinant un quadrillage sur les flancs. Bouche terminale, sans aucun barbillon.",
      traits: [
        "Corps allongé, fuselé, moins haut que la carpe commune",
        "Grandes écailles bordées de noir formant un quadrillage visible",
        "Bouche terminale, sans barbillon",
        "Grande taille : couramment 60–100 cm, peut dépasser 1 m",
      ],
      conf: [
        {
          n: "Carpe commune",
          how: "La carpe commune est plus haute de corps et porte quatre barbillons autour de la bouche ; l'amour blanc n'en a aucun et reste plus fuselé.",
        },
        {
          n: "Carpe argentée",
          how: "La carpe argentée a les yeux placés très bas sur la tête et une carène sans écailles sous le ventre, de la gorge à l'anus ; l'amour blanc a les yeux en position normale et un ventre normalement écaillé.",
        },
      ],
    },
    fish: {
      rows: [
        ["Techniques", "Canne à carpe, montage cheveu, appâts flottants ou coulants"],
        ["Appâts", "Maïs, graines, bouillettes végétales, tiger nuts ; pain ou salade en surface"],
        ["Postes", "Bordures et zones végétalisées, souvent entre deux eaux ou en surface"],
        ["Profondeur", "Variable — surveiller la surface près des herbiers"],
        ["Moment", "Journée, en eau chaude, sur les zones d'herbiers actifs"],
      ],
    },
    cook: {
      note: "Chair blanche et maigre, mais très arêtée (arêtes intramusculaires nombreuses). Consommation marginale en France ; se prépare traditionnellement fumée à chaud ou en terrine, la chair hachée puis tamisée pour écarter les arêtes.",
      prep: [
        "Écailler et vider, lever les filets",
        "Hacher finement et tamiser pour quenelles ou terrines, ou fumer à chaud",
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Plans d'eau et grands cours d'eau lents, riches en végétation aquatique"],
        ["Régime", "Strictement herbivore : plantes aquatiques"],
        ["Reproduction", "Ne se reproduit pas naturellement en France ; populations entretenues par empoissonnement"],
        ["Taille", "Introduite en France en 1957 ; peut dépasser 1 m pour plusieurs dizaines de kg"],
      ],
    },
  },

  "carpe-argentee": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Grande carpe asiatique filtreuse, dos gris argenté sans motif, tête large sans écailles. Yeux placés très bas sur la tête, tournés vers le bas ; carène sans écailles sous le ventre, de la gorge jusqu'à l'anus.",
      traits: [
        "Yeux en position très basse sur la tête",
        "Carène ventrale sans écailles, de la gorge à l'anus",
        "Aucun barbillon, dos gris argenté uni",
        "Saute hors de l'eau quand elle est effrayée",
      ],
      conf: [
        {
          n: "Carpe commune",
          how: "La carpe commune porte quatre barbillons et n'a ni carène ventrale ni position oculaire aussi basse.",
        },
        {
          n: "Amour blanc (carpe herbivore)",
          how: "L'amour blanc a les yeux en position normale, un ventre normalement écaillé et de grandes écailles bordées de noir en quadrillage — absentes chez la carpe argentée.",
        },
      ],
    },
    // Filtreuse : elle ne prend pas un appât. La section dit ce qui est vrai —
    // on ne la pêche pas à la ligne — plutôt que d'inventer un montage.
    fish: {
      rows: [
        ["Techniques", "Filtreuse de plancton : elle ne se prend pratiquement pas à l'appât. Les captures relèvent de la pêche au filet ou de l'accrochage accidentel"],
        ["Postes", "Pleine eau des grands plans d'eau où elle a été introduite"],
        ["Sécurité", "Saute haut hors de l'eau quand elle est dérangée : un gros sujet peut heurter un pêcheur ou un bateau"],
      ],
    },
    cook: {
      note: "Chair blanche fade et extrêmement arêtée. Poisson d'aquaculture ailleurs dans le monde, sans tradition culinaire française.",
      prep: [
        "Lever les filets, puis inciser profondément la chair pour sectionner les arêtes fines",
        "Réserver de préférence à des préparations broyées : quenelles, boulettes, terrines",
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Grands plans d'eau et cours d'eau lents ; espèce introduite, présence localisée en France"],
        ["Régime", "Filtreur de plancton (phytoplancton surtout), via des branchiospines fines"],
        ["Reproduction", "Ne se reproduit pas dans les conditions françaises (besoin de longs fleuves chauds à fort courant)"],
        ["Taille", "Peut dépasser 1 m et plusieurs dizaines de kg"],
      ],
    },
  },

  "pseudorasbora": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Très petit cyprinidé introduit, corps trapu argenté à reflets bleu-violacé, ligne sombre le long des flancs. Bouche petite, presque verticale et tournée vers le haut, sans aucun barbillon.",
      traits: [
        "Petite taille : 5–8 cm, rarement au-delà de 11 cm",
        "Bouche petite, presque verticale, sans barbillon",
        "Ligne sombre le long de la ligne latérale",
        "Croissant sombre sur le bord arrière de chaque écaille",
      ],
      conf: [
        {
          n: "Goujon",
          how: "Le goujon porte une paire de barbillons aux commissures de la bouche ; le pseudorasbora n'en a aucun et a la bouche tournée vers le haut.",
        },
      ],
    },
    // Espèce exotique envahissante : la section ne dit pas comment la prendre
    // (personne ne la cible) mais quoi faire quand elle arrive au bout de la
    // ligne, ce qui est le vrai moment de décision pour le pêcheur.
    fish: {
      rows: [
        ["Prise", "Prise accessoire très fréquente de la pêche au coup en étang et en canal"],
        ["Ne pas s'en servir de vif", "Le transport et l'introduction sont interdits (règlement UE 1143/2014) : ne le mettez pas au seau à vifs"],
        ["Conduite à tenir", "Ne le relâchez pas dans un autre plan d'eau que celui où il a été pris"],
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux calmes ou stagnantes, étangs, mares, cours d'eau lents — très tolérant"],
        ["Régime", "Zooplancton et petits invertébrés ; consomme aussi des œufs d'autres poissons"],
        ["Reproduction", "Maturité dès la première année, forte fécondité — un des moteurs de son invasivité"],
        ["Taille", "5–8 cm ; longévité faible, 2 à 3 ans en général"],
      ],
    },
  },

  spirlin: {
    ficheSrc: SRC,
    ident: {
      summary:
        "Petit cyprinidé élancé proche de l'ablette, dos brun-gris et flancs argentés traversés d'une bande sombre. Ligne latérale incurvée bordée de deux rangées de points sombres — le trait qui lui donne son nom.",
      traits: [
        "Deux rangées de points sombres le long de la ligne latérale incurvée",
        "Base des nageoires teintée d'orange",
        "Nageoire caudale profondément fourchue",
        "Petite taille : 8–12 cm, rarement 15 cm",
      ],
      conf: [
        {
          n: "Ablette",
          how: "L'ablette n'a pas les deux rangées de points sombres le long de la ligne latérale et sa base des nageoires reste claire, sans teinte orange.",
        },
        {
          n: "Goujon",
          how: "Le goujon vit sur le fond, corps plus cylindrique, avec une paire de barbillons ; le spirlin nage en pleine eau, sans barbillon.",
        },
      ],
    },
    fish: {
      rows: [
        ["Techniques", "Pêche au coup fine, en dérive dans le courant"],
        ["Appâts", "Asticot, petit ver, mouche noyée"],
        ["Postes", "Radiers et courants vifs sur fond de graviers"],
        ["Profondeur", "0,3–1 m"],
        ["Usage", "Souvent capturé comme prise annexe ; utilisé comme vif pour carnassiers"],
      ],
    },
    cook: {
      note: "Chair fine, mais poisson menu (8–12 cm) : le même usage que l'ablette, la friture.",
      prep: ["Écailler sommairement, vider les plus gros sujets", "Fariner puis friture vive et brève"],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux courantes et bien oxygénées, zone à barbeau, fonds de graviers"],
        ["Régime", "Invertivore : petites proies dérivant dans le courant, insectes de surface"],
        ["Reproduction", "Mai–juillet, plusieurs pontes fractionnées sur graviers"],
        ["Taille", "Couramment 8–12 cm"],
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Endémiques, lignées cryptiques et espèces marginales.
  //
  // Dernier bloc de cyprinidés sans aucune section descriptive. Beaucoup sont
  // protégées (arrêté 8 déc. 1988 / Directive Habitats) : leur fiche s'arrête
  // à `bio`, sans `fish` ni `cook`, pour la même raison que les migrateurs —
  // décrire comment les prendre laisserait entendre qu'on peut les garder.
  //
  // Les traits que la source n'établit pas (régime, période de fraie des
  // lignées récemment décrites) sont simplement absents : mieux vaut une
  // ligne manquante qu'une ligne extrapolée depuis l'espèce sœur.
  //
  // Catégories UICN : Liste rouge mondiale, millésime indiqué par FishBase
  // (consulté le 25 juillet 2026).
  // ═══════════════════════════════════════════════════════════════════════

  "barbeau-meridional": {
    ficheSrc: SRC,
    bio: {
      rows: [
        ["Habitat", "Cours supérieurs et moyens à eau vive, claire et bien oxygénée, sur sable et graviers (5–25 °C)"],
        ["Régime", "Petits invertébrés benthiques, rarement des végétaux"],
        ["Taille", "Petit barbeau : couramment 20 cm, maximum connu 27 cm"],
        ["Répartition", "Fleuves côtiers méditerranéens du Besòs (Catalogne) au Var, bassin du Rhône et hauts affluents de la Garonne"],
        ["Conservation", "Quasi menacé (UICN NT, 2023)"],
      ],
    },
  },

  blageon: {
    ficheSrc: SRC,
    bio: {
      rows: [
        ["Habitat", "Parties moyennes des rivières claires à courant vif et fond de graviers (10–20 °C), en bancs"],
        ["Régime", "Invertébrés et algues"],
        ["Reproduction", "Sur fond de graviers, en eau courante rapide"],
        ["Taille", "Couramment 15 cm, maximum connu 25 cm"],
        ["Répartition", "Bassins méditerranéens et rhodaniens ; France de l'Est et du Sud-Est"],
        ["Conservation", "Préoccupation mineure au niveau mondial (UICN LC, 2023)"],
      ],
    },
  },

  toxostome: {
    ficheSrc: SRC,
    bio: {
      rows: [
        ["Habitat", "Petites rivières à eau claire sur fond de galets et graviers"],
        ["Régime", "Invertébrés et végétaux, broutés sur le substrat (bouche infère)"],
        ["Reproduction", "Mai–juin, en bancs nombreux ; éclosion en ~8 jours à 15 °C"],
        ["Taille", "Jusqu'à 30 cm et 350 g"],
        ["Répartition", "Endémique franco-ibérique : France et nord-est de l'Espagne"],
        ["Conservation", "Quasi menacé (UICN NT, 2023) ; menacé notamment par l'hybridation avec le hotu introduit"],
      ],
    },
  },

  "vandoise-rostree": {
    ficheSrc: SRC,
    bio: {
      rows: [
        ["Habitat", "Secteurs courants, à eau claire et fraîche, avec des fosses profondes"],
        ["Régime", "Non établi par les sources consultées pour cette espèce"],
        ["Reproduction", "De nuit, dans les courants rapides sur fond de galets, à proximité des fosses"],
        ["Taille", "Jusqu'à 40 cm — la plus grande des vandoises françaises"],
        ["Répartition", "Versant atlantique de la Loire à la Garonne, versant méditerranéen du Tech à l'Aude"],
        ["Taxonomie", "Décrite en 2002 par scission de la vandoise commune"],
        ["Conservation", "Quasi menacé (UICN NT, 2023)"],
      ],
    },
  },

  "vandoise-du-bearn": {
    ficheSrc: SRC,
    bio: {
      rows: [
        ["Habitat", "Ruisseaux et rivières à courant, eau claire et fraîche, avec des fosses profondes"],
        ["Régime", "Non établi par les sources consultées pour cette espèce"],
        ["Taille", "Jusqu'à 28 cm"],
        ["Répartition", "Endémique du seul bassin de l'Adour"],
        ["Conservation", "Quasi menacé (UICN NT, 2023, critère B1b(iii)) — une aire minuscule est sa principale fragilité"],
      ],
    },
  },

  "chevesne-catalan": {
    ficheSrc: SRC,
    fish: {
      rows: [
        ["Prise", "Capture accessoire en pêchant le chevesne : coup, ultra-léger, mouche sèche"],
        ["Postes", "Radiers et courants modérés sur graviers du Tech et de l'Agly"],
        ["Conduite à tenir", "Espèce vulnérable à aire française minuscule — remise à l'eau immédiate recommandée, même en l'absence de protection réglementaire"],
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Rivières à eau claire, fond de graviers, secteurs à courant modéré"],
        ["Taille", "Petit chevesne : ~13 cm chez le mâle, jusqu'à 20 cm chez la femelle"],
        ["Répartition", "Endémique catalan : nord-est de l'Espagne, et en France les seuls bassins du Tech et de l'Agly (peut-être l'Aude)"],
        ["Conservation", "Vulnérable (UICN VU, 2023). Menacé d'introgression par le chevesne commun là où les deux se rencontrent"],
      ],
    },
  },

  "goujon-occitan": {
    ficheSrc: SRC,
    fish: {
      rows: [
        ["Techniques", "Pêche au coup au fond, en grattant le substrat — comme le goujon commun"],
        ["Appâts", "Petit ver de terre, asticot"],
        ["Postes", "Fonds de sable des rivières de coteaux à courant modéré"],
        ["Remarque", "Rien ne le distingue du goujon commun au bord de l'eau : c'est la répartition qui tranche"],
      ],
    },
    cook: GOUJON_COOK,
    bio: {
      rows: [
        ["Habitat", "Rivières de coteaux à courant modéré, sur fond de sable"],
        ["Taille", "Jusqu'à ~13 cm"],
        ["Répartition", "Endémique de France : bassin de la Garonne et fleuves méditerranéens entre Rhône et Pyrénées"],
        ["Conservation", "Préoccupation mineure (UICN LC, 2023)"],
      ],
    },
  },

  "goujon-auvergne": {
    ficheSrc: SRC,
    fish: {
      rows: [
        ["Techniques", "Pêche au coup au fond, en grattant le substrat — comme le goujon commun"],
        ["Appâts", "Petit ver de terre, asticot"],
        ["Postes", "Rivières de coteaux et de moyenne montagne à courant modéré à vif"],
        ["Remarque", "Indissociable du goujon commun sur le terrain : c'est la répartition qui tranche"],
      ],
    },
    cook: GOUJON_COOK,
    bio: {
      rows: [
        ["Habitat", "Rivières de coteaux à courant modéré à vif"],
        ["Taille", "Jusqu'à ~15 cm — le plus grand des goujons français"],
        ["Répartition", "Endémique du Massif central : hauts bassins de la Loire, de la Dordogne et du Lot"],
        ["Conservation", "Préoccupation mineure (UICN LC, 2023)"],
      ],
    },
  },

  "goujon-ukraine": {
    ficheSrc: SRC,
    fish: {
      rows: [
        ["Techniques", "Pêche au coup au fond ; espèce nocturne, plus active en fin de journée"],
        ["Appâts", "Asticot, petit ver"],
        ["Postes", "Fonds de sable des rivières de plaine à courant modéré (Rhin, Meuse)"],
      ],
    },
    cook: GOUJON_COOK,
    bio: {
      rows: [
        ["Habitat", "Fond des rivières de plaine à courant modéré, préférence marquée pour le sable ; actif la nuit"],
        ["Régime", "Larves d'insectes et invertébrés benthiques de taille moyenne"],
        ["Reproduction", "Ponte en pleine eau, les deux sexes remontant vers la surface ; jusqu'à 4 pontes par saison, à ~2 semaines d'intervalle"],
        ["Taille", "Jusqu'à ~11 cm ; longévité maximale connue 5 ans"],
        ["Répartition", "Bassins de la mer Noire et de la Baltique, bassin sud de la mer du Nord (Elbe, Rhin) — en France, Rhin et Meuse"],
        ["Conservation", "Préoccupation mineure (UICN LC, 2023)"],
      ],
    },
  },

  vimbe: {
    ficheSrc: SRC,
    fish: {
      rows: [
        ["Techniques", "Pêche au coup et au feeder, appâts posés sur le fond"],
        ["Appâts", "Ver, asticot, esches de fond — l'espèce fouille le substrat"],
        ["Postes", "Grandes et moyennes rivières, radiers de graviers au moment du frai"],
        ["Moment", "Rassemblements marqués au printemps, à la remontée de mars à mai"],
      ],
    },
    cook: {
      note: "Chair correcte mais très arêtée. Traditionnellement fumée en Europe de l'Est, où l'espèce est bien plus commune qu'en France.",
      prep: [
        "Écailler et vider",
        "Inciser les flancs en croisillons pour sectionner les arêtes intramusculaires",
        "Friture pour les petits sujets, fumage à chaud pour les gros",
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Estuaires saumâtres, rivières moyennes à grandes, quelques grands lacs subalpins (10–20 °C)"],
        ["Régime", "Surtout petits mollusques et larves d'insectes, prélevés sur le fond"],
        ["Reproduction", "Sur graviers, dans les radiers peu profonds à courant rapide ; migration amorcée en septembre, ralentie l'hiver, reprise de mars à mai"],
        ["Taille", "Couramment 20 cm, jusqu'à 50 cm"],
        ["Répartition", "Bassins caspien, pontique, de la Marmara et de la Baltique ; bassin de la mer du Nord de l'Elbe à l'Ems — en France, présence marginale au nord-est"],
        ["Conservation", "Préoccupation mineure (UICN LC, 2022)"],
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Deux cyprinidés introduits, statuts très différents malgré l'apparence.
  //
  // La carpe à grosse tête est stockée en étang comme sa cousine la carpe
  // argentée, déjà au catalogue : incapable de se reproduire seule en France
  // (enquête 2011 : aucun individu pêché en rivière en trois décennies), donc
  // pas d'`invasive` — comme carpe-argentee et amour-blanc.
  //
  // Le tête-de-boule est l'inverse : minuscule et introduit par les seaux à
  // vifs des pêcheurs eux-mêmes, avec des populations sauvages isolées et
  // documentées (Champagne, Alsace, Île-de-France, Berry, Savoie). Non
  // représenté sur la liste de l'arrêté du 17 déc. 1985 : l'introduire ailleurs
  // relève du même art. L432-10 que les gobies ponto-caspiens — la fiche donne
  // la conduite à tenir pour l'usage réel qui l'a introduit, l'utilisation
  // comme vif.
  // ═══════════════════════════════════════════════════════════════════════

  "carpe-a-grosse-tete": {
    ficheSrc:
      "INPN (MNHN) · FishBase · GT IBMA (Centre de ressources espèces exotiques envahissantes) — biologie, statut en France",
    ident: {
      summary:
        "Grande carpe asiatique filtreuse, proche de la carpe argentée. Corps gris sombre marqué de nombreuses petites taches noires éparses, tête large, œil placé bas mais moins extrême que chez la carpe argentée.",
      traits: [
        "Nombreuses petites taches noires éparses sur le corps",
        "Tête large (27 à 35 % de la longueur du corps)",
        "Œil bas sur la tête, sans atteindre la position extrême de la carpe argentée",
        "Carène ventrale sans écailles, des pelviennes à l'anus",
      ],
      conf: [
        {
          n: "Carpe argentée",
          how: "La carpe argentée est uniformément argentée sans taches, avec les yeux encore plus bas ; la carpe à grosse tête porte de nombreuses petites taches noires éparses sur un fond plus sombre.",
        },
        {
          n: "Carpe commune",
          how: "La carpe commune porte quatre barbillons et n'a ni carène ventrale ni position oculaire aussi basse.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Grands plans d'eau et rivières à niveau fluctuant ; recherche les eaux chaudes et peu profondes"],
        ["Régime", "Zooplancton et algues, filtrés en continu — y compris en eau froide dès 4 °C"],
        ["Reproduction", "Nécessite une eau très turbide, chaude (22–30 °C) et à fort courant : conditions absentes des eaux françaises"],
        ["Présence en France", "Introduite en étangs pour l'entretien du plancton ; une enquête de 2011 n'a trouvé aucun individu pêché en rivière en trois décennies — pas de reproduction naturelle établie"],
      ],
    },
  },

  "tete-de-boule": {
    ficheSrc: "INPN (MNHN) · FishBase — biologie et statut en France",
    ident: {
      summary:
        "Minuscule cyprinidé nord-américain, corps trapu et court, bouche terminale. Le mâle reproducteur développe un épais coussinet spongieux sur la nuque, absent chez la femelle.",
      traits: [
        "Très petite taille : jusqu'à 10 cm",
        "Ligne latérale incomplète, n'atteignant pas la dorsale",
        "Coussinet spongieux sur la nuque chez le mâle reproducteur",
        "Bouche terminale, corps trapu",
      ],
      conf: [
        {
          n: "Vairon commun",
          how: "Le vairon commun a une ligne latérale complète et pas de coussinet nucal ; le tête-de-boule a la ligne latérale incomplète et, chez le mâle en période de reproduction, ce coussinet spongieux caractéristique.",
        },
      ],
    },
    fish: {
      rows: [
        ["Origine de sa présence", "Introduit par les seaux à vifs de pêcheurs de carnassiers, pas par une voie naturelle"],
        [
          "Ne pas transporter vivant",
          "Non représenté sur la liste de l'arrêté du 17 déc. 1985 : l'introduire dans une eau où il n'est pas déjà établi relève de l'art. L432-10 (jusqu'à 9 000 € d'amende) — ne le mettez pas au seau à vifs vers un autre plan d'eau",
        ],
        ["Sur place", "Rien n'interdit de le relâcher là où il a été pris — c'est le déplacer qui pose problème"],
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Mares boueuses de tête de bassin, ruisseaux, petites rivières et étangs ; tolère une eau chaude, trouble et pauvre en oxygène"],
        ["Régime", "Détritus et algues"],
        ["Reproduction", "En eau calme ; le mâle garde le territoire et nettoie les œufs avec son coussinet nucal"],
        ["Présence en France", "Populations sauvages isolées et localisées, apparues entre 2001 et 2012 : Champagne, Alsace, Île-de-France, Berry, Savoie"],
        ["Risque sanitaire", "Suspecté vecteur de la yersiniose (maladie de la bouche rouge), qui touche truites et anguilles"],
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Cinq cyprinidés d'eau douce sans rapport les uns avec les autres : une
  // lignée cryptique de goujon (même usage que le goujon commun), une
  // vandoise endémique du Massif central, un blageon et une brème italiens
  // et danubiens présents en marge du territoire français, et un cyprinidé
  // balkanique introduit accidentellement dans le Sud-Ouest.
  // ═══════════════════════════════════════════════════════════════════════

  "goujon-de-l-adour": {
    ficheSrc: "INPN (MNHN) · FishBase — biologie et répartition",
    ident: {
      summary:
        "Lignée cryptique du complexe goujon, indissociable à l'œil du goujon commun. Seule la répartition géographique permet de la reconnaître : bassin de l'Adour et péninsule Ibérique.",
      traits: [
        "Corps fuselé de fond, une paire de barbillons — traits communs à tous les goujons",
        "Taille jusqu'à 13,5 cm",
        "Bassin de l'Adour et péninsule Ibérique",
      ],
      conf: [
        {
          n: "Goujon",
          how: "Indissociable à l'œil du goujon commun ; c'est la répartition qui tranche — le goujon de l'Adour est propre au bassin de l'Adour et à la péninsule Ibérique.",
        },
      ],
    },
    fish: {
      rows: [
        ["Techniques", "Pêche au coup au fond, en grattant le substrat — comme le goujon commun"],
        ["Appâts", "Petit ver de terre, asticot"],
        ["Postes", "Fonds sableux ou graveleux des rivières et eaux lentes du bassin de l'Adour"],
      ],
    },
    cook: GOUJON_COOK,
    bio: {
      rows: [
        ["Habitat", "Cours d'eau à courant modéré, fonds sableux ou graveleux ; eaux lentes de plaine"],
        ["Répartition", "Bassin de l'Adour (France) et péninsule Ibérique"],
        ["Conservation", "Quasi menacé (UICN NT, 2023)"],
      ],
    },
  },

  "vandoise-au-long-museau": {
    ficheSrc: "INPN (MNHN) · FishBase — biologie et répartition",
    ident: {
      summary:
        "Vandoise endémique du Massif central et du Sud-Ouest, au museau plus effilé que la vandoise commune — le trait qui lui donne son nom.",
      traits: [
        "Museau nettement plus long et pointu que la vandoise commune",
        "Corps fuselé argenté, silhouette générale de vandoise",
        "Endémique des bassins du Lot, du Tarn, de la Dordogne et de la Garonne",
      ],
      conf: [
        {
          n: "Vandoise",
          how: "La vandoise au long museau a, comme son nom l'indique, un museau nettement plus long et pointu que la vandoise commune ; la répartition aide aussi — elle est propre aux bassins du Lot, du Tarn, de la Dordogne et de la Garonne.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Cours d'eau à courant modéré à vif, fonds graveleux"],
        ["Répartition", "Endémique des bassins du Lot, du Tarn, de la Dordogne et de la Garonne (Massif central, Aquitaine)"],
        ["Conservation", "Préoccupation mineure (UICN LC)"],
      ],
    },
  },

  "blageon-italien": {
    ficheSrc: "INPN (MNHN) · FishBase — biologie et répartition",
    ident: {
      summary:
        "Cousin italien du blageon, présent en France uniquement dans les Alpes-Maritimes, aux confins des bassins frontaliers avec l'Italie. Corps fuselé argenté, bande sombre longitudinale comme le blageon commun.",
      traits: [
        "Corps fuselé, bande sombre longitudinale — silhouette générale de blageon",
        "Taille jusqu'à 17 cm",
        "Présent en France uniquement dans les Alpes-Maritimes",
      ],
      conf: [
        {
          n: "Blageon",
          how: "Le blageon italien n'est présent en France que dans les Alpes-Maritimes (bassins frontaliers avec l'Italie) ; le blageon commun occupe le Rhône et l'Est/Sud-Est du territoire. Les deux sont proches à l'œil, la répartition tranche.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Cours d'eau et ruisseaux intermittents, invertébrés benthiques et algues épilithiques au menu"],
        ["Répartition", "Alpes-Maritimes (France), nord et centre de l'Italie, Suisse"],
        ["Conservation", "Préoccupation mineure (UICN LC)"],
      ],
    },
  },

  "breme-du-danube": {
    ficheSrc: "INPN (MNHN) · FishBase — biologie et répartition",
    ident: {
      summary:
        "Brème danubienne introduite dans le Rhin en 1995, à la présence française très localisée. Corps haut et comprimé comme les autres brèmes, mais plus rhéophile — elle recherche le courant.",
      traits: [
        "Corps haut et comprimé latéralement — silhouette générale de brème",
        "Plus rhéophile que les brèmes indigènes : recherche les zones à courant des grands cours d'eau",
      ],
      conf: [
        {
          n: "Brème bordelière",
          how: "La brème du Danube reste cantonnée aux grands cours d'eau à courant, contrairement à la brème bordelière qui affectionne aussi les eaux calmes ; sa présence française se limite au Rhin et occasionnellement à la Bourgogne.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Grands cours d'eau de plaine, zones à courant du chenal principal, fonds graveleux ou végétation immergée pour le frai"],
        ["Reproduction", "Avril–mai, en zone courante"],
        ["Présence en France", "Introduite dans le Rhin en 1995 ; présence très localisée en Alsace, mentions occasionnelles en Bourgogne"],
        ["Conservation", "Non applicable (UICN NA) — espèce introduite"],
      ],
    },
  },

  "epirine-lippue": {
    ficheSrc: "INPN (MNHN) · FishBase — biologie et répartition",
    ident: {
      summary:
        "Cyprinidé balkanique introduit accidentellement dans le Sud-Ouest français, probablement lors d'un empoissonnement en goujons dans les années 1980. Corps allongé argenté à reflets sombres, d'où son nom (« pictum », peint).",
      traits: [
        "Corps allongé, argenté, marqué de reflets ou motifs sombres discrets",
        "Taille jusqu'à 18 cm",
        "Fréquente les cours d'eau à courant modéré, fonds graveleux ou sableux",
      ],
      conf: [],
    },
    bio: {
      rows: [
        ["Habitat", "Rivières et cours d'eau à courant modéré, fonds graveleux ou sableux"],
        ["Origine", "Endémique des Balkans occidentaux (bassin du lac de Skadar notamment)"],
        ["Présence en France", "Signalée dans le Sud-Ouest et l'Aude depuis les années 1980 ; introduction probablement accidentelle lors d'un empoissonnement en goujons. Populations établies ou possiblement établies"],
        ["Conservation", "Non applicable (UICN NA) — espèce introduite"],
      ],
    },
  },

  "carpe-koi-sauvage": {
    ficheSrc: "FishBase — biologie et distinction taxonomique",
    ident: {
      summary:
        "Ancêtre est-asiatique de la carpe koï ornementale, longtemps considéré comme une simple forme de la carpe commune avant d'être reconnu comme une espèce distincte. Corps argenté, nageoires pelvienne, anale et lobe inférieur de la caudale teintés de rouge — la carpe commune n'a pas cette teinte.",
      traits: [
        "Nageoires pelvienne, anale et lobe inférieur de la caudale rougeâtres",
        "Quatre barbillons, comme la carpe commune",
        "Corps argenté plutôt que bronze-doré",
      ],
      conf: [
        {
          n: "Carpe commune",
          how: "La carpe commune n'a pas la teinte rouge des nageoires pelvienne, anale et du lobe inférieur de la caudale. En pratique, la plupart des koïs relâchées ou échappées en France sont hybridées avec la carpe commune : la distinction sur le terrain n'est pas fiable, seule la génétique tranche avec certitude.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Cours d'eau et plans d'eau, tolère une légère salinité"],
        ["Origine", "Bassins de l'Amour au fleuve Rouge (Chine, Vietnam, Laos)"],
        ["Présence en France", "Par lâchers ou échappées de bassins ornementaux ; le plus souvent hybridée avec la carpe commune, sans population « pure » identifiée"],
        ["Conservation", "Préoccupation mineure (UICN LC, 2020)"],
      ],
    },
  },

  "rotengle-italien": {
    ficheSrc: "INPN (MNHN) · FishBase — biologie et répartition",
    ident: {
      summary:
        "Cousin italien du rotengle, présent en France par extension frontalière dans le Sud-Est. Silhouette générale de rotengle : bouche supère, dorsale reculée, œil et nageoires teintés de rouge.",
      traits: [
        "Bouche orientée vers le haut, nageoire dorsale nettement en arrière des pelviennes — silhouette de rotengle",
        "Œil et nageoires teintés de rouge, comme le rotengle commun",
        "Aucun barbillon",
      ],
      conf: [
        {
          n: "Rotengle",
          how: "Quasi indissociable du rotengle commun à l'œil ; la répartition est le repère principal — le rotengle italien est propre au bassin du Pô et à l'Adriatique (Italie), avec une extension frontalière dans le Sud-Est français.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux calmes et végétalisées, comme le rotengle commun"],
        ["Répartition", "Bassin du Pô et Adriatique à l'est du Pô (Italie), Saint-Marin, Suisse ; localité précise en France mal documentée dans les sources consultées"],
        ["Taxonomie", "Espèce distincte du rotengle commun (Scardinius erythrophthalmus), reconnue depuis 1845"],
      ],
    },
  },
};
