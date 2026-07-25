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

const SRC = "INPN (MNHN) · FishBase — biologie et répartition";

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
    bio: {
      rows: [
        ["Habitat", "Eaux courantes et bien oxygénées, zone à barbeau, fonds de graviers"],
        ["Régime", "Invertivore : petites proies dérivant dans le courant, insectes de surface"],
        ["Reproduction", "Mai–juillet, plusieurs pontes fractionnées sur graviers"],
        ["Taille", "Couramment 8–12 cm"],
      ],
    },
  },
};
