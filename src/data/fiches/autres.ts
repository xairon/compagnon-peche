import type { Fiche } from "./index";

// Fiches descriptives du groupe « autres » : petits poissons de fond, espèces
// protégées, invasives ou de faible intérêt halieutique (loches, chabots,
// épinoches, blennie, gambusie, vairons, lote, crapet...).
//
// Ce groupe rassemble des espèces qu'on rencontre en identifiant une prise
// accessoire ou en observant, pas en les ciblant. Beaucoup sont protégées
// (voir `protected` dans species-base.ts) : pour celles-ci, la fiche se limite
// à `ident` et `bio` — reconnaître et relâcher correctement est l'usage, et
// donner une technique de capture serait un contresens. `cook` n'a de sens que
// pour les rares espèces réellement consommées.
//
// Contenu limité à ce qui est établi et vérifiable. Rien de réglementaire (la
// maille, le quota, la période, le statut protégé/invasif viennent du
// générateur et des modules de réglementation), rien de sanitaire (ANSES et
// consommation vivent dans data/edibility.ts). Une espèce dont un trait n'est
// pas établi n'a pas ce trait.
//
// Source : INPN (MNHN) et DORIS (FFESSM) pour l'identification, la biologie et
// la répartition, complétés par FishBase et des sources halieutiques pour les
// quelques espèces pêchées ou consommées.
const SRC = "INPN (MNHN) · DORIS (FFESSM) — biologie et répartition ; techniques : fédérations de pêche";

// Le statut légal n'est jamais écrit ici : il vient du générateur et des
// modules de réglementation, et l'app l'affiche déjà en bandeau. Une fiche qui
// le répète crée une seconde source pour une valeur de droit — l'une d'elles
// était fausse (« capture et détention interdites » pour la lamproie de Planer,
// quand l'arrêté cité ne protège que les œufs et les habitats).

// Les vairons régionaux (basque, de Garonne, du Danube, du Languedoc) ont été
// séparés du vairon commun par la génétique, pas par un usage différent : au
// bord de l'eau c'est le même petit poisson, pris de la même façon et cuisiné
// de la même façon. Plutôt que de recopier quatre fois une donnée qui n'est
// propre à aucun d'eux, l'usage est décrit une fois et rapporté explicitement
// au vairon commun — comme le fait déjà data/edibility.ts pour ces lignées.
const VAIRON_FISH = {
  rows: [
    ["Usage", "Appât vif classique pour la truite, le brochet et le sandre"],
    ["Capture", "Pêche au coup à l'hameçon fin, ou à la carafe"],
    ["Postes", "Ruisseaux frais et oxygénés, en bancs près des bordures"],
    ["Remarque", "Usage rapporté au vairon commun, dont cette lignée est indissociable au bord de l'eau"],
  ] as [string, string][],
};
const VAIRON_COOK = {
  note: "Comme le vairon commun : petit poisson de friture, traditionnel dans les régions de tête de bassin. Usage rapporté à l'espèce commune, faute de donnée culinaire propre à cette lignée.",
  prep: [
    "Ne pas écailler : les écailles sont minuscules",
    "Vider les sujets les plus gros, garder les petits entiers",
    "Fariner puis friture vive et brève",
  ],
};

// Les quatre gobies ponto-caspiens partagent la même source, la même confusion
// décisive avec le chabot (protégé) et la même conduite légale — voir le
// commentaire au-dessus de leurs entrées pour le détail de cette dernière.
const SRC_GOBIE =
  "DORIS (FFESSM) · FishBase · SNPN · Observatoire des poissons Seine-Normandie · CDR-EEE — biologie, répartition et invasion";

const GOBIE_CONF_CHABOT = {
  n: "Chabot commun",
  how: "Le critère qui tranche à coup sûr : les gobies ont les nageoires pelviennes soudées en un disque ventouse sur le ventre (un trait de famille des Gobiidae) ; le chabot a deux nageoires pelviennes bien séparées, sans ventouse. Le chabot est protégé — dans le doute, relâchez.",
};

function gobieFish(transportInterdit: string) {
  return {
    rows: [
      ["Prise", "Prise fréquente en pêchant au fond dans les secteurs colonisés"],
      [
        "Ne pas transporter vivant",
        `Interdit de l'introduire ailleurs, y compris comme vif (art. L432-10, jusqu'à 9 000 € d'amende) : ${transportInterdit}`,
      ],
      [
        "Sur place",
        "La remise à l'eau au point même de capture n'est pas interdite — l'espèce y est déjà établie ; c'est le déplacer qui l'est",
      ],
    ] as [string, string][],
  };
}

export const AUTRES: Record<string, Fiche> = {
  // --- Espèces protégées : ident + bio uniquement ---------------------------

  "apron-du-rhone": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Petit percidé benthique au corps allongé et cylindrique, quatre selles sombres en travers du dos beige-jaunâtre. Yeux rapprochés sur le dessus de la tête, comme posté à l'affût.",
      traits: [
        "Corps cylindrique, aplati ventralement, adapté au fond",
        "4 bandes/selles sombres transversales sur fond clair",
        "Yeux hauts et rapprochés",
        "Taille courante 10–15 cm",
      ],
      conf: [
        {
          n: "Chabot commun",
          how: "Le chabot n'a pas de bandes transversales nettes mais une livrée mouchetée irrégulière, et une tête bien plus large et aplatie que le corps ; l'apron garde un corps cylindrique du museau à la queue.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Zones courantes à fond de galets des rivières du bassin rhodanien, 30–450 m d'altitude"],
        ["Comportement", "Solitaire, immobile et camouflé le jour ; chasse au crépuscule"],
        ["Régime", "Invertébrés benthiques (vers, larves), probablement alevins"],
        ["Conservation", "Endémique du bassin du Rhône, en danger critique d'extinction (UICN)"],
      ],
    },
  },

  "blennie-fluviatile": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Seule blennie d'eau douce d'Europe. Corps allongé sans écailles, peau lisse et gluante, brun-vert marqué de petits points sombres sur les flancs jaune-vert. Longue nageoire dorsale continue.",
      traits: [
        "Peau nue, sans écailles",
        "Flancs jaune-vert tachetés de points noirs",
        "Dorsale unique très longue, courant sur presque tout le dos",
        "Taille courante ~8 cm, jusqu'à 15 cm",
      ],
      conf: [
        {
          n: "Chabot commun",
          how: "Le chabot a une tête large et aplatie disproportionnée par rapport au corps, deux nageoires dorsales séparées et des écailles absentes différemment réparties ; la blennie a une seule longue dorsale continue et une peau lisse uniforme.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Cours d'eau lents, canaux et lacs du pourtour méditerranéen, sur fonds de galets"],
        ["Comportement", "Grégaire en juvénile, territoriale à l'âge adulte"],
        ["Longévité", "Jusqu'à 4 ans"],
        ["Répartition", "Seule blennie d'eau douce d'Europe ; bassins méditerranéens"],
      ],
    },
  },

  bouviere: {
    ficheSrc: SRC,
    ident: {
      summary:
        "Petit cyprinidé au corps haut, comprimé latéralement, presque ovale. Dos gris-vert, flancs argentés marqués d'une bande bleutée qui court de la queue jusqu'au milieu du corps.",
      traits: [
        "Corps haut et bossu, très comprimé",
        "Bande longitudinale bleutée sur la moitié arrière du corps",
        "Taille 5–8 cm, exceptionnellement 10 cm",
        "Mâle en fraie : livrée rose violacé irisée, nageoire anale rouge clair",
      ],
      conf: [
        {
          n: "Brème bordelière",
          how: "La brème bordelière est bien plus grande (15–30 cm), au corps plus allongé et sans bande bleutée ; la bouvière ne dépasse guère 8 cm.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux calmes et végétalisées : étangs, canaux, lacs, rivières à faible courant"],
        ["Régime", "Surtout herbivore : phytoplancton, débris végétaux, un peu d'invertébrés"],
        ["Reproduction", "Avril–juin (jusqu'en août) : la femelle pond via un long ovipositeur à l'intérieur d'une moule d'eau douce vivante (anodonte, mulette) où les œufs se développent"],
        ["Écologie", "Indissociable de la présence de moules d'eau douce, où elle dépose ses œufs"],
      ],
    },
  },

  "chabot-commun": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Petit poisson de fond à la tête large (un tiers du corps), yeux rapprochés et hauts, bouche large et terminale. Brun à gris, tacheté de sombre, ventre blanc sale.",
      traits: [
        "Tête très large et aplatie par rapport au corps",
        "Pas d'écailles, peau nue",
        "Deux nageoires dorsales rapprochées",
        "Taille 8–15 cm, jusqu'à 18 cm chez le mâle",
      ],
      conf: [
        {
          n: "Loche franche",
          how: "La loche franche a un corps cylindrique allongé et six barbillons bien visibles autour de la bouche ; le chabot a une tête massive aplatie et pas de barbillons.",
        },
        {
          n: "Gobie de Kessler",
          how: "Les quatre gobies ponto-caspiens envahissent aujourd'hui le Rhin, la Moselle et le Rhône — là même où vit le chabot. Le critère qui tranche à coup sûr : le gobie a les nageoires pelviennes soudées en disque ventouse ventral, le chabot a deux nageoires pelviennes bien séparées. Le chabot est protégé — dans le doute, relâchez.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux vives et fraîches à fond de galets et graviers, aussi certains lacs d'altitude"],
        ["Comportement", "Sédentaire et territorial, caché le jour sous les pierres, chasse au crépuscule ; nageur médiocre, sans vessie natatoire"],
        ["Reproduction", "Le mâle prépare un nid dans les galets, la femelle y dépose 100 à 500 œufs"],
        ["Taxonomie", "Forme un complexe de plusieurs espèces proches en Europe"],
      ],
    },
  },

  "chabot-fluviatile": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Très proche du chabot commun — longtemps considérée comme la même espèce avant qu'une étude génétique de 2005 ne les distingue. Mêmes traits généraux : tête large, corps trapu, sans écailles.",
      traits: [
        "Nageoires pectorales plus développées que chez le chabot commun",
        "Tête large, yeux hauts et rapprochés",
        "Pas d'écailles",
        "Taille 8–15 cm",
      ],
      conf: [
        {
          n: "Chabot commun",
          how: "Les deux espèces sont quasi indissociables à l'œil ; le critère le plus fiable reste le bassin versant. Le chabot fluviatile occupe les bassins atlantiques, de la Garonne à l'Escaut (Loire, Seine, Somme) ; le chabot commun domine à l'est, sur l'axe Rhin-Rhône.",
        },
        {
          n: "Gobie de Kessler",
          how: "Le gobie de Kessler et les trois autres gobies ponto-caspiens ont les nageoires pelviennes soudées en disque ventouse ventral ; le chabot fluviatile, comme tous les chabots, a deux nageoires pelviennes bien séparées. Le chabot est protégé — dans le doute, relâchez.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Systèmes fluviaux, plutôt que lacs et étangs"],
        ["Taxonomie", "Séparée du chabot commun (Cottus gobio) en 2005 par étude génétique"],
        ["Répartition", "Bassins du nord-ouest de l'Europe, dont une partie du bassin de la Seine"],
        ["Conservation", "Populations localisées, sensibles à la qualité de l'eau"],
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Trois autres lignées cryptiques du complexe Cottus gobio, plus le chabot
  // du Lez (espèce à part entière, mais même traitement : protégée, terrain
  // indissociable de ses cousins). Comme pour le chabot fluviatile ci-dessus,
  // le seul critère fiable est le bassin versant — jamais l'apparence.
  //
  // Source : INPN (MNHN), FishBase, SNPN (chabot du Lez) — identification,
  // répartition et statut de protection.
  // ═══════════════════════════════════════════════════════════════════════

  "chabot-du-bearn": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Lignée cryptique du complexe chabot, indissociable à l'œil du chabot commun et des autres chabots régionaux. Seule la répartition géographique permet de la reconnaître : bassin de l'Adour.",
      traits: [
        "Tête large et aplatie, corps trapu sans écailles — traits communs à tous les chabots",
        "Deux nageoires dorsales rapprochées",
        "Taille 8–15 cm",
        "Endémique du bassin de l'Adour",
      ],
      conf: [
        {
          n: "Chabot commun",
          how: "Indissociable à l'œil ; seule la répartition tranche — le chabot du Béarn est propre au bassin de l'Adour, le chabot commun occupe un territoire bien plus large. Les deux sont protégés : dans le doute, relâchez.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Cours d'eau vifs et frais à fond de galets, comme les autres chabots"],
        ["Répartition", "Endémique du bassin de l'Adour"],
        ["Taxonomie", "Lignée cryptique du complexe Cottus gobio"],
        ["Conservation", "Quasi menacé (UICN NT, 2023)"],
      ],
    },
  },

  "chabot-d-auvergne": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Lignée cryptique du complexe chabot, indissociable à l'œil de ses cousins. Seule la répartition géographique permet de la reconnaître : Massif central.",
      traits: [
        "Tête large et aplatie, corps trapu sans écailles — traits communs à tous les chabots",
        "Deux nageoires dorsales rapprochées",
        "Taille 8–15 cm",
        "Endémique du Massif central",
      ],
      conf: [
        {
          n: "Chabot commun",
          how: "Indissociable à l'œil ; seule la répartition tranche — le chabot d'Auvergne est propre au Massif central, le chabot commun occupe un territoire bien plus large. Les deux sont protégés : dans le doute, relâchez.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Cours d'eau vifs et frais à fond de galets, comme les autres chabots"],
        ["Répartition", "Endémique du Massif central"],
        ["Taxonomie", "Lignée cryptique du complexe Cottus gobio"],
        ["Conservation", "Données insuffisantes (UICN DD, 2023)"],
      ],
    },
  },

  "chabot-des-pyrenees": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Lignée cryptique du complexe chabot, indissociable à l'œil de ses cousins. Seule la répartition géographique permet de la reconnaître : Pyrénées.",
      traits: [
        "Tête large et aplatie, corps trapu sans écailles — traits communs à tous les chabots",
        "Deux nageoires dorsales rapprochées",
        "Taille 8–15 cm",
        "Endémique des Pyrénées",
      ],
      conf: [
        {
          n: "Chabot commun",
          how: "Indissociable à l'œil ; seule la répartition tranche — le chabot des Pyrénées est propre à la chaîne pyrénéenne, le chabot commun occupe un territoire bien plus large. Les deux sont protégés : dans le doute, relâchez.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Cours d'eau vifs et frais à fond de galets, comme les autres chabots"],
        ["Répartition", "Endémique des Pyrénées"],
        ["Taxonomie", "Lignée cryptique du complexe Cottus gobio"],
        ["Conservation", "Quasi menacé (UICN NT, 2023)"],
      ],
    },
  },

  "chabot-du-lez": {
    ficheSrc: SRC + " · SNPN — le chabot du Lez",
    ident: {
      summary:
        "Chabot minuscule et extrêmement localisé, indissociable à l'œil de ses cousins régionaux. Ne vit que sur trois kilomètres à la source du Lez, près de Montpellier — le lieu de capture suffit à l'identifier.",
      traits: [
        "Très petite taille : 5–6 cm",
        "Tête large et aplatie, corps trapu sans écailles — traits communs à tous les chabots",
        "Uniquement présent aux trois premiers kilomètres du Lez (Hérault)",
      ],
      conf: [
        {
          n: "Chabot commun",
          how: "Indissociable à l'œil ; c'est le lieu qui identifie ce chabot à coup sûr — il ne vit nulle part ailleurs qu'à la source du Lez. Les deux sont protégés : dans le doute, relâchez.",
        },
        {
          n: "Loche du Lez (loche du Languedoc)",
          how: "Le nom prête à confusion mais ce sont deux espèces sans rapport, d'ordres différents : le chabot du Lez est un chabot à tête large, restreint aux trois premiers kilomètres du Lez ; la loche du Lez est une loche allongée à barbillons, présente sur un territoire bien plus vaste (Lez, Tech, Adour, Garonne).",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Résurgence karstique fraîche, sur trois kilomètres seulement, en amont de Montferrier-sur-Lez"],
        ["Répartition", "Endémique le plus restreint des chabots français — trois kilomètres de rivière, rien d'autre"],
        ["Taxonomie", "Espèce à part entière (et non une simple lignée du complexe Cottus gobio)"],
        ["Conservation", "En danger critique (UICN CR, 2023) ; site Natura 2000 dédié à cette espèce"],
      ],
    },
  },

  "chabot-de-rhenanie": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Lignée cryptique du complexe chabot, indissociable à l'œil de ses cousins. Seule la répartition géographique permet de la reconnaître : bassins du Rhin et de la Meuse.",
      traits: [
        "Tête large et aplatie, corps trapu sans écailles — traits communs à tous les chabots",
        "Deux nageoires dorsales rapprochées",
        "Taille 8–10 cm",
        "Bassins du Rhin et de la Meuse",
      ],
      conf: [
        {
          n: "Chabot commun",
          how: "Indissociable à l'œil ; seule la répartition tranche — le chabot de Rhénanie occupe les bassins du Rhin et de la Meuse. Les deux sont protégés : dans le doute, relâchez.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Petits cours d'eau frais à fond de graviers, comme les autres chabots"],
        ["Répartition", "Bassins du Rhin et de la Meuse, en amont jusqu'à Mannheim (Allemagne)"],
        ["Taxonomie", "Lignée cryptique du complexe Cottus gobio"],
        ["Conservation", "Préoccupation mineure (UICN LC, 2023)"],
      ],
    },
  },

  "aphanius-de-corse": {
    ficheSrc: "INPN (MNHN) · FishBase — biologie et répartition",
    ident: {
      summary:
        "Minuscule poisson des lagunes et eaux saumâtres corses, corps trapu, robe argentée barrée de sombre — plus marquée chez la femelle, orangée chez le mâle en période de reproduction.",
      traits: [
        "Très petite taille : jusqu'à 7 cm",
        "Corps trapu, robe barrée de sombre",
        "Mâle à nageoire caudale jaune-orangé, plus marqué en période de reproduction",
        "Vit en groupes dans les lagunes et embouchures corses",
      ],
      conf: [],
    },
    bio: {
      rows: [
        ["Habitat", "Lagunes côtières, eaux saumâtres à douces, embouchures, mares et fossés — exclusivement en Corse"],
        ["Régime", "Petits invertébrés"],
        ["Conservation", "Quasi menacé (UICN NT, 2022) ; endémique corse au sens français"],
      ],
    },
  },

  "loche-d-etang": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Loche allongée et cylindrique des eaux stagnantes, à la tête conique et la caudale arrondie. Se reconnaît à ses dix barbillons autour de la bouche et à ses flancs rayés de bandes sombres et cuivrées.",
      traits: [
        "10 barbillons autour de la bouche — le plus grand nombre parmi les loches françaises",
        "2 bandes sombres et 2 bandes cuivrées le long des flancs",
        "Taille 15–30 cm",
        "Mâle : nageoires pectorales plus longues",
      ],
      conf: [
        {
          n: "Loche franche",
          how: "La loche franche n'a que 6 barbillons et vit en eau vive et fraîche, sur graviers ; la loche d'étang en a 10 et vit enfouie dans la vase des eaux stagnantes.",
        },
        {
          n: "Loche asiatique",
          how: "La loche asiatique (introduite) a une robe tachetée avec une tache noire nette à la base de la caudale ; la loche d'étang a des bandes sombres et cuivrées continues, sans tache caudale. Dans le doute, relâchez : la loche d'étang est protégée.",
        },
        {
          n: "Loche à grandes écailles",
          how: "La loche à grandes écailles (introduite, un seul signalement français à ce jour) n'a pas de motif de couleur net et des crêtes adipeuses hautes ; la loche d'étang a des bandes continues bien marquées. Dans le doute, relâchez : la loche d'étang est protégée.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux stagnantes et boueuses, enfouie dans les sédiments le jour"],
        ["Comportement", "Peut respirer l'air atmosphérique par l'intestin pour survivre en eau très pauvre en oxygène"],
        ["Reproduction", "Avril–juin, jusqu'à 150 000 œufs déposés sur la végétation aquatique"],
        ["Conservation", "Rare et menacée sur l'ensemble de son aire française"],
      ],
    },
  },

  "loche-de-riviere": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Petite loche en ruban, corps allongé couvert de très petites écailles, flancs marqués de rangées de taches sombres alignées. Porte une épine rétractile cachée sous l'œil.",
      traits: [
        "Épine sous-orbitaire rétractile (d'où le nom loche « épineuse »)",
        "6 barbillons",
        "Taches sombres alignées en rangées sur les flancs, celles du bas plus grandes",
        "Taille 6–12 cm",
      ],
      conf: [
        {
          n: "Loche franche",
          how: "La loche franche n'a pas d'épine sous l'œil, une tête plus large et aplatie, des barbillons plus longs, et vit en eau vive de tête de bassin ; la loche de rivière vit en eaux lentes de plaine (rivières, lacs, gravières) et porte l'épine caractéristique.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Cours d'eau de plaine à courant lent, lacs, gravières"],
        ["Comportement", "Fouisseuse, s'enterre dans le sable ou la vase"],
        ["Conservation", "Populations fragmentées, en régression"],
      ],
    },
  },

  // --- Petites espèces sans intérêt halieutique : ident + bio ---------------

  epinoche: {
    ficheSrc: SRC,
    ident: {
      summary:
        "Minuscule poisson reconnaissable à ses trois épines indépendantes dressées devant la dorsale. Dos vert-brun argenté, flancs argentés, pédoncule caudal très fin.",
      traits: [
        "3 épines libres devant la nageoire dorsale",
        "Une épine recourbée devant la nageoire anale",
        "Pédoncule caudal mince, parfois caréné",
        "Taille 5–8 cm",
      ],
      conf: [
        {
          n: "Épinochette",
          how: "L'épinochette porte 8 à 12 épines dorsales dressées en crête au lieu de 3, et un corps encore plus fin et filiforme.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux peu profondes et végétalisées : rivières, lacs, étangs ; tolère aussi les eaux saumâtres et salées"],
        ["Régime", "Très vorace : vers, crustacés, larves d'insectes, œufs et alevins"],
        ["Reproduction", "Le mâle construit un nid d'herbes aquatiques à deux ouvertures, le défend et le ventile jusqu'à l'éclosion"],
        ["Remarque", "Bio-indicateur ; le mâle arbore une gorge et un ventre rouge-orangé vif en période de reproduction"],
      ],
    },
  },

  epinochette: {
    ficheSrc: SRC,
    ident: {
      summary:
        "Cousine encore plus petite et filiforme de l'épinoche, reconnaissable à sa crête de 8 à 12 épines dressées devant la dorsale au lieu de 3.",
      traits: [
        "8 à 12 épines dorsales indépendantes, dressées en crête",
        "Silhouette filiforme, plus fine que l'épinoche",
        "Taille jusqu'à 8 cm",
      ],
      conf: [
        {
          n: "Épinoche à trois épines",
          how: "L'épinoche n'a que 3 épines devant la dorsale ; l'épinochette en a 8 à 12 — le compte des épines est le critère de terrain le plus fiable.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux douces, plutôt fraîches, du nord et de l'est du territoire"],
        ["Régime", "Zooplancton, petits crustacés, insectes benthiques"],
        ["Remarque", "Espèce plus septentrionale que l'épinoche en France"],
      ],
    },
  },

  "loche-franche": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Petite loche cylindrique des ruisseaux à truite, tête aplatie garnie de six barbillons bien visibles. Dos et flancs marbrés irrégulièrement de brun sur fond jaunâtre, ventre blanc-rosé.",
      traits: [
        "6 barbillons longs autour de la bouche",
        "Tête large et aplatie",
        "Marbrures brunes irrégulières sur le dos et les flancs",
        "Taille jusqu'à 12 cm",
      ],
      conf: [
        {
          n: "Loche de rivière",
          how: "La loche de rivière a une épine rétractile sous l'œil (absente ici) et vit en eaux lentes de plaine ; la loche franche vit en eau vive et fraîche de tête de bassin, sur graviers.",
        },
      ],
    },
    fish: {
      rows: [
        ["Capture", "Prise accessoire de la pêche au coup au fond, en ruisseau à truite"],
        ["Appâts", "Petit ver, asticot, posés au ras du substrat"],
        ["Moment", "Active la nuit : les prises sont surtout de fin de journée"],
        ["Attention", "Ne pas la confondre avec la loche d'étang et la loche de rivière, protégées : celles-là se relâchent"],
      ],
    },
    cook: {
      note: "Petite loche sans écailles à chair fine, consommée en friture là où elle est abondante — jamais une pêche que l'on cible, toujours un complément.",
      prep: ["Rincer : la peau est nue, il n'y a rien à écailler", "Vider les plus gros sujets", "Fariner puis friture vive"],
    },
    bio: {
      rows: [
        ["Habitat", "Petits cours d'eau vifs, clairs et bien oxygénés, sur fonds de graviers, galets ou sable"],
        ["Comportement", "Cachée le jour sous les pierres ou en bordure végétalisée, active la nuit"],
        ["Régime", "Larves d'insectes et petits crustacés (gammares) détectés au toucher grâce aux barbillons"],
        ["Reproduction", "Avril–juillet, plusieurs pontes de plusieurs dizaines de milliers d'œufs sur graviers et végétation"],
      ],
    },
  },

  "vairon-basque": {
    ficheSrc:
      "INPN (MNHN) · Poissons endémiques du bassin Adour-Garonne (UFBAG) — biologie et répartition",
    ident: {
      summary:
        "Petit cyprinidé du bassin de l'Adour, appartenant au complexe des vairons français récemment scindé en plusieurs espèces. Dos gris marbré de sombre, bande longitudinale noire sur les flancs, ventre blanc.",
      traits: [
        "Museau arrondi, caudale fourchue",
        "Bande longitudinale noire jusqu'à la caudale",
        "Taille inférieure à 10 cm",
        "Robe nuptiale (avril–août) : flancs jaune-ocre, ventre noir, nageoires inférieures orangées chez le mâle",
      ],
      conf: [
        {
          n: "Vairon commun",
          how: "Hors période de fraie, les deux espèces sont quasi impossibles à distinguer à l'œil nu ; le critère fiable est géographique : le vairon basque est propre au bassin de l'Adour et aux Pyrénées, le vairon commun occupe le reste du territoire (dont le bassin de la Seine).",
        },
      ],
    },
    fish: VAIRON_FISH,
    cook: VAIRON_COOK,
    bio: {
      rows: [
        ["Habitat", "Petits cours d'eau de montagne à faible pente, près des berges en eau calme sur graviers"],
        ["Régime", "Insectivore à tendance omnivore : plancton, algues"],
        ["Reproduction", "Avril–juin (jusqu'en août en altitude), migration vers des affluents graveleux"],
        ["Taxonomie", "Décrite en 2007 (Phoxinus bigerri), endémique du bassin Adour-Garonne"],
      ],
    },
  },

  vairon: {
    ficheSrc: SRC,
    ident: {
      summary:
        "Petit cyprinidé grégaire aux formes rondes, brun-vert sombre sur le dos, clair sur le ventre, flancs marqués de taches sombres parfois réunies en barres verticales.",
      traits: [
        "Corps trapu, écailles très petites",
        "Taches sombres sur les flancs, parfois en barres verticales",
        "Taille 5–10 cm",
        "Robe nuptiale du mâle : noir, blanc, rouge, jaune citron voire vert vif",
      ],
      conf: [
        {
          n: "Able de Heckel",
          how: "Les deux ont une ligne latérale incomplète — ce critère ne les sépare pas. Le vairon est trapu, brun-vert marbré de sombre, avec une bouche terminale ; l'able de Heckel est mince, argenté et translucide, bouche nettement tournée vers le haut.",
        },
      ],
    },
    fish: {
      rows: [
        ["Usage", "Appât vif classique pour la truite, le brochet et le sandre"],
        ["Capture", "Pêche au coup ou à la carafe"],
        ["Postes", "Cours d'eau à truite, en bancs de plusieurs centaines d'individus"],
      ],
    },
    cook: {
      note: "Poisson de friture traditionnel des régions de tête de bassin (« friture de vairons ») : menu mais à chair fine, consommé entier.",
      prep: [
        "Ne pas écailler : les écailles sont minuscules",
        "Vider les sujets les plus gros, garder les petits entiers",
        "Fariner puis friture vive et brève",
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux fraîches, claires et oxygénées — typiquement les cours d'eau à truite"],
        ["Comportement", "Grégaire, en bancs de centaines d'individus"],
        ["Reproduction", "Mai–juillet, 200 à 1 000 œufs déposés sur graviers"],
        ["Remarque", "Complexe cryptique : plusieurs espèces de vairons ont été séparées en France depuis 2020"],
      ],
    },
  },

  "vairon-de-garonne": {
    ficheSrc:
      "INPN (MNHN) · Poissons endémiques du bassin Adour-Garonne (UFBAG) — biologie et répartition",
    ident: {
      summary:
        "Vairon endémique du bassin de la Garonne, décrit en 2020, morphologiquement quasi identique au vairon commun hors période de reproduction. Ligne latérale interrompue, bande noire longitudinale sur les flancs.",
      traits: [
        "Museau arrondi, caudale fourchue",
        "Ligne latérale interrompue",
        "Bande longitudinale noire jusqu'à la caudale",
        "Taille inférieure à 10 cm",
      ],
      conf: [
        {
          n: "Vairon commun",
          how: "Distinction fiable surtout géographique : le vairon de Garonne est endémique du bassin Adour-Garonne, le vairon commun occupe les autres bassins français. En période de reproduction (avril–juillet), le mâle du vairon de Garonne développe des bandes verticales sombres et une bande verte longitudinale, absentes chez le vairon commun.",
        },
      ],
    },
    fish: VAIRON_FISH,
    cook: VAIRON_COOK,
    bio: {
      rows: [
        ["Habitat", "Petits cours d'eau de montagne à faible pente, berges à faible courant, fond sableux ou graveleux"],
        ["Comportement", "Grégaire"],
        ["Reproduction", "Avril–juillet"],
        ["Taxonomie", "Décrit en 2020 (Phoxinus dragarum) ; peut s'hybrider avec d'autres vairons — espèce récente, littérature encore limitée"],
      ],
    },
  },

  "vairon-du-danube": {
    ficheSrc:
      "INPN (MNHN) · Denys & Manné (2019), première mention en France — MNHN/IRD",
    ident: {
      summary:
        "Vairon du complexe Phoxinus, revalidé comme espèce distincte en 2017 et repéré pour la première fois en France en 2019 par analyse génétique. L'identification de terrain n'est aujourd'hui pas établie avec certitude — la confirmation reste moléculaire.",
      traits: [
        "Morphologie générale du genre Phoxinus : corps fuselé, museau arrondi",
        "Taille jusqu'à environ 9 cm",
      ],
      conf: [],
    },
    fish: VAIRON_FISH,
    cook: VAIRON_COOK,
    bio: {
      rows: [
        ["Répartition en France", "Bassin du Léman et du haut Rhin (première mention : Rupt de Mad, bassin Rhin-Moselle)"],
        ["Répartition européenne", "Allemagne, Autriche, Bulgarie, Macédoine du Nord, Serbie, Suisse — bassin du Danube"],
        ["Taxonomie", "Longtemps confondu avec le vairon commun (Phoxinus phoxinus), revalidé en 2017"],
        ["Remarque", "Espèce à peine documentée en France ; toute identification de terrain doit rester prudente"],
      ],
    },
  },

  "vairon-du-languedoc": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Vairon endémique des bassins méditerranéens du Languedoc, membre du complexe français des vairons scindé en plusieurs espèces distinctes. Morphologiquement proche du vairon commun hors période de fraie.",
      traits: [
        "Morphologie générale du genre Phoxinus : corps fuselé, museau arrondi, caudale fourchue",
        "Taille inférieure à 10 cm",
      ],
      conf: [
        {
          n: "Vairon commun",
          how: "Hors reproduction, la distinction fiable est géographique : le vairon du Languedoc est propre aux bassins méditerranéens (Hérault et environs), le vairon commun occupe le reste du territoire. En fraie, seule l'observation de la robe nuptiale ou l'analyse génétique permet de trancher avec certitude.",
        },
      ],
    },
    fish: VAIRON_FISH,
    cook: VAIRON_COOK,
    bio: {
      rows: [
        ["Répartition", "Bassins côtiers méditerranéens du Languedoc"],
        ["Taxonomie", "Espèce cryptique du complexe Phoxinus, distinguée récemment par génétique et robe nuptiale"],
        ["Remarque", "Littérature encore limitée sur cette espèce récemment décrite"],
      ],
    },
  },

  "vairon-ligerien": {
    ficheSrc: "INPN (MNHN) · Denys, Dettaï, Persat, Daszkiewicz, Hautecœur & Keith (2020) — description originale",
    ident: {
      summary:
        "Vairon endémique du bassin de la Loire, décrit en 2020 en même temps que le vairon de Garonne. Morphologiquement proche du vairon commun hors période de fraie ; le mâle nuptial se distingue par des barres vertes et un ventre rouge.",
      traits: [
        "Morphologie générale du genre Phoxinus : corps fuselé, museau arrondi, caudale fourchue",
        "Taille inférieure à 10 cm (jusqu'à 7,4 cm mesurés)",
        "Robe nuptiale du mâle : barres vertes, ventre rouge",
      ],
      conf: [
        {
          n: "Vairon commun",
          how: "Hors reproduction, la distinction fiable est géographique : le vairon ligérien est endémique du bassin de la Loire (et de la Sèvre Niortaise), introduit depuis dans les bassins de la Garonne et du Rhône. En fraie, la robe nuptiale (barres vertes, ventre rouge du mâle) aide à trancher.",
        },
      ],
    },
    fish: VAIRON_FISH,
    cook: VAIRON_COOK,
    bio: {
      rows: [
        ["Habitat", "Cours d'eau clairs et peu profonds à faible courant, fond sableux ou graveleux ; très commun dans tout le bassin de la Loire"],
        ["Répartition", "Endémique des bassins de la Loire et de la Sèvre Niortaise ; introduit dans les bassins de la Garonne et du Rhône"],
        ["Taxonomie", "Décrit en 2020, en même temps que le vairon de Garonne"],
      ],
    },
  },

  "vairon-italien": {
    ficheSrc: "GBIF · Denys & al. — premier signalement français (2010), publié depuis",
    ident: {
      summary:
        "Vairon originaire du bassin adriatique nord et du moyen Danube, signalé une seule fois en France : un mâle capturé en 2010 dans le bassin du Léman. Morphologiquement proche des autres vairons hors période de fraie.",
      traits: [
        "Morphologie générale du genre Phoxinus : corps fuselé, museau arrondi, caudale fourchue",
        "Taille inférieure à 10 cm",
        "Robe nuptiale caractéristique décrite chez le mâle capturé en France",
      ],
      conf: [
        {
          n: "Vairon commun",
          how: "Hors reproduction, quasi indissociable ; seule l'analyse génétique ou une robe nuptiale bien observée permet de confirmer l'identification.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Cours d'eau du bassin adriatique nord et du moyen Danube — le même type de milieu que le vairon commun"],
        ["Répartition d'origine", "Italie, Slovénie, Croatie, Bosnie-Herzégovine (bassin adriatique nord et moyen Danube)"],
        ["Présence en France", "Un seul individu connu à ce jour : un mâle capturé le 31 mai 2010 à Publier (Haute-Savoie, bassin du Léman). Statut de population inconnu"],
      ],
    },
  },

  // --- Espèce invasive : ident + bio, pas de pêche ni de cuisine -------------

  gambusie: {
    ficheSrc: SRC,
    ident: {
      summary:
        "Minuscule poisson vivipare au corps trapu, gris-brun terne, à forte différence de taille entre les sexes. La femelle, nettement plus grande que le mâle, porte une tache sombre à l'anus.",
      traits: [
        "Femelle 5–6 cm, mâle rarement plus de 3 cm",
        "Corps trapu, coloration terne gris-brun",
        "Bouche supère, orientée vers le haut",
        "Nageoire anale du mâle modifiée en organe copulateur (gonopode)",
      ],
      conf: [
        {
          n: "Épinoche à trois épines",
          how: "L'épinoche a trois épines libres bien visibles devant la dorsale ; la gambusie n'en a aucune et a une bouche tournée vers le haut, adaptée à la capture de proies en surface.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux calmes et peu profondes : étangs, marais, canaux, bras morts, bassins ornementaux"],
        ["Reproduction", "Vivipare, maturité précoce, croissance rapide, cycle de vie court"],
        ["Introduction", "Introduite en France dès 1924 (Corse) puis 1927 (continent) pour lutter contre les moustiques"],
        ["Impact", "Efficacité anti-moustique très limitée en pratique ; espèce exotique envahissante menaçant des espèces indigènes par compétition"],
      ],
    },
  },

  // --- Espèces à intérêt halieutique ou culinaire réel -----------------------

  "crapet-de-roche": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Petit centrarchidé nord-américain au corps haut et très aplati latéralement, brun vif, tache noire sur l'opercule, iris rouge-orangé caractéristique.",
      traits: [
        "Deux nageoires dorsales réunies",
        "Tache noire nette sur l'opercule",
        "Iris rouge-orangé",
        "Nageoire anale à 6 épines (contre 3 chez la perche-soleil)",
        "Taille courante 15–20 cm, jusqu'à 33 cm",
      ],
      conf: [
        {
          n: "Perche soleil",
          how: "La perche soleil a une nageoire anale à 3 épines et une robe multicolore vive ; le crapet de roche a 6 épines anales et une coloration brune plus terne, avec l'iris rouge-orangé net.",
        },
      ],
    },
    fish: {
      rows: [
        ["Techniques", "Pêche au coup, ultra-léger, petites imitations — combatif pour sa taille"],
        ["Appâts", "Ver, asticot, petits leurres souples et cuillers"],
        ["Postes", "Abris rocheux, blocs et souches des rivières lentes de la Saône et de la Loire"],
        ["Conduite à tenir", "Centrarchidé nord-américain introduit : ne le transportez pas vivant vers un autre milieu"],
      ],
    },
    cook: {
      note: "Chair blanche fine, de la qualité des autres centrarchidés, mais poisson petit : le rendement en filets reste faible.",
      prep: [
        "Écailles adhérentes : lever les filets plutôt qu'écailler",
        "Attention aux épines dorsales et anales en manipulant",
        "Filets poêlés ou panés",
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Rivières et fonds rocheux ou graveleux"],
        ["Reproduction", "Juin–juillet vers 15–20 °C ; le mâle creuse un nid, garde les œufs puis les jeunes"],
        ["Longévité", "10 à 12 ans"],
        ["Origine", "Amérique du Nord, introduit en France au début du XXe siècle ; présence localisée (Saône, Loire)"],
      ],
    },
  },

  "lote-de-riviere": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Seul poisson d'eau douce apparenté à la morue en France. Corps serpentiforme, peau grise marbrée de jaune-brun, gluante. Un long barbillon unique sous le menton.",
      traits: [
        "Un long barbillon médian sous la mâchoire inférieure",
        "Corps allongé, presque cylindrique, peau nue et gluante",
        "Deux nageoires dorsales : une courte, une très longue comme l'anale",
        "Caudale arrondie",
      ],
      conf: [
        {
          n: "Anguille européenne",
          how: "L'anguille n'a aucun barbillon et une peau tout aussi gluante mais un corps encore plus fin et serpentiforme sur toute sa longueur ; la lote a un unique barbillon sous le menton et une tête plus large et aplatie.",
        },
      ],
    },
    fish: {
      rows: [
        ["Techniques", "Lignes de fond ou lignes dormantes posées la nuit, ver de terre"],
        ["Moment", "Activité crépusculaire et nocturne exclusivement"],
        ["Postes", "Cachée le jour sous pierres, racines ou berges ; chasse la nuit sur le fond"],
      ],
    },
    cook: {
      note: "Chair blanche ferme, mais c'est surtout le foie qui est recherché — une spécialité prisée dans l'est de la France comme en Scandinavie, comparable en richesse au foie de morue.",
      prep: [
        "Vider avec soin pour prélever le foie intact",
        "Foie poêlé rapidement ou en accompagnement d'un beurre blanc",
        "Chair en filets, cuisson courte",
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Grands cours d'eau frais et bien oxygénés, lacs profonds, surtout à l'est et au nord-est"],
        ["Comportement", "Benthique et solitaire, strictement crépusculaire à nocturne"],
        ["Conservation", "En régression marquée sur une grande partie de son aire française"],
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Gobies ponto-caspiens — invasion en cours, catalogue absent jusqu'ici.
  //
  // Quatre espèces arrivées par les canaux depuis le bassin de la mer Noire et
  // de la Caspienne (Rhin dès 2007, puis Moselle, Rhône et estuaire de la
  // Seine). Un pêcheur du Nord-Est ou du couloir rhodanien en prend
  // régulièrement en pêchant au fond, sans qu'aucune fiche n'existe pour lui
  // dire ce que c'est.
  //
  // Statut légal à ne pas confondre avec celui du pseudorasbora ou de la
  // gambusie : ces quatre gobies ne figurent PAS au règlement UE 1143/2014 (ils
  // sont considérés indigènes du sud-est de l'aire biogéographique
  // européenne), et ne sont pas davantage sur R432-5. Leur interdiction
  // d'introduction relève d'un autre texte — l'art. L432-10 du code de
  // l'environnement (introduction d'une espèce non représentée dans les eaux
  // concernées, jusqu'à 9 000 € d'amende), qui vise le TRANSPORT vivant et
  // l'usage comme vif ailleurs, pas la remise à l'eau sur place : relâcher au
  // point de capture n'est pas interdit puisque l'espèce y est déjà établie.
  // Écrire « ne pas relâcher » sans cette nuance affirmerait une obligation
  // qui n'existe pas.
  //
  // Confusion majeure avec le chabot (Cottus), lui protégé : le critère qui
  // tranche à coup sûr est que les gobies ont les nageoires pelviennes soudées
  // en un disque ventouse ventral, un trait de famille des Gobiidae que le
  // chabot n'a pas.
  //
  // Source : DORIS (FFESSM), FishBase, SNPN, Observatoire des poissons
  // Seine-Normandie, CDR-EEE (Centre de ressources espèces exotiques
  // envahissantes) pour la répartition française et la chronologie d'invasion.

  "gobie-demi-lune": {
    ficheSrc: SRC_GOBIE,
    ident: {
      summary:
        "Le plus petit et le plus discret des quatre gobies ponto-caspiens : robe grise à bandes obliques ou verticales plus sombres, bouche nettement orientée vers le bas.",
      traits: [
        "Taille modeste : jusqu'à 9 cm",
        "Bandes sombres verticales ou obliques sur fond gris",
        "Bouche orientée vers le bas",
        "Nageoires pelviennes soudées en disque ventouse — trait de famille des Gobiidae",
      ],
      conf: [
        GOBIE_CONF_CHABOT,
        {
          n: "Gobie fluviatile",
          how: "Le gobie fluviatile a des reflets bleutés sur les flancs, absents ici ; les deux restent proches en taille et se distinguent surtout par la robe.",
        },
      ],
    },
    fish: gobieFish("ne le mettez pas au seau à vifs, ne le déplacez pas vers un autre plan d'eau"),
    bio: {
      rows: [
        ["Habitat", "Eaux calmes à lentement courantes, végétation dense ou blocs rocheux"],
        ["Régime", "Invertébrés benthiques"],
        ["Reproduction", "Avril–août ; le mâle garde les œufs déposés dans une cavité"],
        ["Invasion en France", "Premier des quatre gobies ponto-caspiens détecté en France, dans le Rhin en 2007"],
      ],
    },
  },

  "gobie-de-kessler": {
    ficheSrc: SRC_GOBIE,
    ident: {
      summary:
        "Le plus massif des quatre gobies ponto-caspiens. Bouche orientée vers le haut — à l'inverse des trois autres — et nageoires pectorales barrées de gris et de jaune pâle.",
      traits: [
        "Corps massif, le plus trapu des quatre",
        "Bouche orientée vers le haut (les trois autres l'ont vers le bas)",
        "Nageoires pectorales barrées verticalement gris/jaune pâle",
        "Nageoires pelviennes soudées en disque ventouse",
      ],
      conf: [
        GOBIE_CONF_CHABOT,
        {
          n: "Gobie à taches noires",
          how: "Le gobie à taches noires a la bouche orientée vers le bas et une tache noire nette sur la première dorsale, absentes chez le gobie de Kessler.",
        },
        {
          n: "Gobie des sables",
          how: "Les petits gobies natifs des côtes françaises (gobie des sables, gobie tacheté) ne dépassent pas une dizaine de centimètres et vivent sur les sables et vases côtiers ; le gobie de Kessler est bien plus massif et colonise des rivières précises (Rhin, Moselle, Rhône), souvent loin de toute influence saline.",
        },
      ],
    },
    fish: gobieFish("ne le mettez pas au seau à vifs, ne le déplacez pas vers un autre plan d'eau"),
    bio: {
      rows: [
        ["Habitat", "Cours inférieurs, lagunes, lacs et grands fleuves à fond rocheux ou végétalisé"],
        ["Régime", "Crustacés (mysidacés, amphipodes) et petits poissons, dont d'autres gobies"],
        ["Reproduction", "Maturité à 2 ans, mars–mai ; œufs adhésifs déposés sur pierres et coquilles, gardés par le mâle"],
        ["Invasion en France", "Détecté dans le Rhin en 2010, en expansion par le canal Rhin-Main-Danube"],
      ],
    },
  },

  "gobie-a-taches-noires": {
    ficheSrc: SRC_GOBIE,
    ident: {
      summary:
        "Le plus impactant et le plus répandu des quatre gobies ponto-caspiens en France. Tache noire nette sur la première nageoire dorsale, bouche orientée vers le bas ; le mâle devient entièrement noir en période de reproduction.",
      traits: [
        "Tache noire bien visible sur la première nageoire dorsale",
        "Bouche orientée vers le bas",
        "Mâle entièrement noir en période de reproduction",
        "Taille jusqu'à 35 cm — le plus grand des quatre",
      ],
      conf: [
        GOBIE_CONF_CHABOT,
        {
          n: "Gobie de Kessler",
          how: "Le gobie de Kessler a la bouche orientée vers le haut et pas de tache noire sur la dorsale ; il est aussi plus massif.",
        },
      ],
    },
    fish: gobieFish("ne le mettez pas au seau à vifs, ne le déplacez pas vers un autre plan d'eau"),
    bio: {
      rows: [
        ["Habitat", "Eaux peu profondes, saumâtres ou douces, fond rocheux ou végétalisé ; tolère de très faibles teneurs en oxygène"],
        ["Régime", "Large spectre d'invertébrés et petits poissons, surtout des mollusques"],
        ["Reproduction", "Avril–septembre, pontes répétées tous les 18–20 jours ; le mâle garde les œufs jusqu'à l'éclosion"],
        ["Impact", "Dévore œufs et alevins et concurrence les poissons de fond indigènes (gardon, perche, chabot) — le plus impactant des quatre"],
        ["Invasion en France", "Détecté dans le Rhin en 2011 ; colonise aujourd'hui Rhin, Moselle, Rhône et l'estuaire de la Seine"],
      ],
    },
  },

  "gobie-fluviatile": {
    ficheSrc: SRC_GOBIE,
    ident: {
      summary:
        "Le plus récemment arrivé des quatre gobies ponto-caspiens en France. Petite taille, bouche orientée vers le bas, flancs à reflets bleutés caractéristiques.",
      traits: [
        "Petite taille : jusqu'à 20 cm, souvent moins",
        "Bouche orientée vers le bas",
        "Reflets bleutés sur les flancs",
        "Nageoires pelviennes soudées en disque ventouse",
      ],
      conf: [
        GOBIE_CONF_CHABOT,
        {
          n: "Gobie demi-lune",
          how: "Le gobie demi-lune est marqué de bandes sombres obliques ou verticales et n'a pas les reflets bleutés du gobie fluviatile.",
        },
      ],
    },
    fish: gobieFish("ne le mettez pas au seau à vifs, ne le déplacez pas vers un autre plan d'eau"),
    bio: {
      rows: [
        ["Habitat", "Zones littorales, estuaires, lagunes, grands et moyens cours d'eau à fond sableux ou vaseux"],
        ["Régime", "Invertébrés, surtout des mollusques"],
        ["Reproduction", "Avril–juillet, localement jusqu'en septembre ; le mâle garde les œufs 3 à 4 jours"],
        ["Invasion en France", "Le plus récent des quatre : premier individu capturé en Moselle (Berg-sur-Moselle) en juin 2014"],
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Trois introductions discrètes et un signalement unique.
  //
  // Umbre pygmée et guppy : introduites de longue date (1910 pour l'umbre) ou
  // tout juste documentées (guppy, 2024), mais sans mesure de gestion connue —
  // `invasive: false` n'est pas un oubli, c'est ce que les sources disent.
  //
  // Les deux loches asiatiques (Misgurnus) sont la confusion qui compte dans
  // ce lot : la loche d'étang (Misgurnus fossilis), déjà au catalogue, est
  // protégée — et les critères qui la séparent de ses cousines introduites
  // sont précis (patron de couleur, tache caudale, hauteur des crêtes
  // adipeuses), pas une impression générale. Sourcé sur Cuinet et al. (2024,
  // BioInvasions Records) pour M. dabryanus, dont l'unique mention française
  // est un individu photographié puis relâché — le signalement le dit
  // explicitement plutôt que de laisser croire à une population établie.
  // ═══════════════════════════════════════════════════════════════════════

  "umbre-pygmee": {
    ficheSrc:
      "INPN (MNHN) · FishBase · Keith & Allardi — biologie et historique d'introduction en France",
    ident: {
      summary:
        "Petit poisson trapu au corps peu comprimé, vert olive à brun sombre, surnommé « poisson-chien ». Dix à douze fines rayures sombres longitudinales, une bande sombre traversant l'œil et une barre noire à la base de la caudale.",
      traits: [
        "Corps trapu, peu comprimé latéralement",
        "10 à 12 rayures sombres longitudinales fines",
        "Bande sombre traversant l'œil",
        "Barre noire nette à la base de la caudale",
      ],
      conf: [],
    },
    bio: {
      rows: [
        ["Habitat", "Marais, fossés et eaux stagnantes acides, souvent envasées et très pauvres en oxygène — respiration aérienne facultative"],
        ["Régime", "Larves d'insectes, vers, mollusques, crustacés, alevins"],
        ["Reproduction", "Avril–mai ; les larves restent environ 6 jours dans un nid algal"],
        ["Introduction en France", "Introduite d'Amérique du Nord en étang dès 1910–1911 (Charolais, Saône-et-Loire) puis 1913 (Allier)"],
        ["Présence actuelle", "Naturalisée localement dans des zones humides acides du nord et de l'ouest (dont la Marne), en populations discrètes et méconnues"],
      ],
    },
  },

  guppy: {
    ficheSrc:
      "FishBase · SFI-Cybium (Denys et al. 2024) — première population établie documentée en France métropolitaine",
    ident: {
      summary:
        "Minuscule poisson vivipare, très connu en aquariophilie. Le mâle, nettement plus petit que la femelle, porte une nageoire anale modifiée en organe reproducteur et une robe colorée et variable ; la femelle est plus grande et terne.",
      traits: [
        "Très petite taille : mâle jusqu'à 5 cm, femelle jusqu'à 6 cm",
        "Mâle coloré et bariolé, femelle terne et plus grande",
        "Nageoire anale du mâle modifiée en organe reproducteur (gonopode)",
        "Vivipare : la femelle donne naissance à des jeunes déjà formés",
      ],
      conf: [],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux chaudes (18–28 °C) : sources thermales, canaux et fossés bien végétalisés à faible prédation"],
        ["Régime", "Zooplancton, petits insectes, détritus"],
        ["Reproduction", "Vivipare, portées de 20 à 40 jeunes toutes les 4 à 6 semaines ; la femelle peut stocker le sperme pour des pontes différées"],
        ["Présence en France", "Espèce tropicale ne survivant pas aux hivers métropolitains en pleine nature ; première population établie documentée dans un bassin alimenté par une source thermale (parc des Thermes, Juvignac, Hérault, signalée en 2024)"],
      ],
    },
  },

  "loche-asiatique": {
    ficheSrc:
      "Cuinet et al. (2024), BioInvasions Records 13(2):541-550 · INPN (MNHN) · FishBase — identification et présence en France",
    ident: {
      summary:
        "Loche asiatique introduite par l'aquariophilie (loche « dojo » ou « loche météo », sensible aux variations de pression). Robe à motif de taches sombres, une tache noire nette à la base supérieure de la caudale, crêtes adipeuses basses sur le pédoncule caudal.",
      traits: [
        "Robe à taches sombres (pas de bandes continues)",
        "Tache noire nette à la base supérieure de la nageoire caudale",
        "Crêtes adipeuses basses sur le pédoncule caudal",
        "Devient agitée avant les changements de pression atmosphérique — d'où le nom de « loche météo »",
      ],
      conf: [
        {
          n: "Loche d'étang",
          how: "La loche d'étang, protégée, a un patron de bandes sombres et cuivrées continues, sans tache noire caudale ; la loche asiatique a une robe tachetée et une tache noire nette à la base de la caudale. Dans le doute, relâchez : la loche d'étang est protégée.",
        },
        {
          n: "Loche à grandes écailles",
          how: "La loche à grandes écailles n'a ni motif de couleur net ni tache caudale, et ses crêtes adipeuses sont hautes ; la loche asiatique a une robe tachetée, une tache caudale nette et des crêtes basses.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux calmes à lentement courantes, substrat vaseux ; tolère de très faibles teneurs en oxygène grâce à une respiration intestinale"],
        ["Régime", "Large spectre : zooplancton, invertébrés benthiques, végétaux"],
        ["Introduction en France", "Issue du commerce aquariophile ; un individu isolé signalé dans l'Orge (bassin de la Seine) en 2010"],
        ["Présence actuelle", "Population établie depuis l'automne 2021 dans le ruisseau du Schadgraben à Geispolsheim (bassin du Rhin, près de Strasbourg)"],
      ],
    },
  },

  "loche-a-grandes-ecailles": {
    ficheSrc: "Cuinet et al. (2024), BioInvasions Records 13(2):541-550 — premier signalement français",
    ident: {
      summary:
        "Loche asiatique introduite, très proche de la loche asiatique (dojo) mais sans motif de couleur net et sans tache caudale noire ; crêtes adipeuses hautes sur le pédoncule caudal — le critère le plus fiable à l'œil.",
      traits: [
        "Pas de motif de couleur net (ni bandes, ni taches marquées)",
        "Pas de tache noire à la base de la caudale",
        "Crêtes adipeuses hautes sur le pédoncule caudal",
        "Peut dépasser 25 cm",
      ],
      conf: [
        {
          n: "Loche d'étang",
          how: "La loche d'étang, protégée, a un patron de bandes sombres et cuivrées continues ; la loche à grandes écailles n'a pas de motif net. Dans le doute, relâchez : la loche d'étang est protégée.",
        },
        {
          n: "Loche asiatique",
          how: "La loche asiatique a une robe tachetée, une tache noire nette à la base de la caudale et des crêtes adipeuses basses ; la loche à grandes écailles n'a ni motif net ni tache caudale, et ses crêtes sont hautes.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat d'origine", "Bassins du Yangtsé et de la rivière des Perles (Chine), Taïwan ; eaux lentiques et lotiques à substrat vaseux"],
        ["Régime", "Zooplancton, macroinvertébrés et algues"],
        ["Reproduction", "Peut se reproduire par gynogenèse (sans fécondation par un mâle) — un facteur qui favoriserait son caractère envahissant"],
        [
          "Présence en France",
          "Un seul individu connu à ce jour : capturé, photographié puis relâché dans le ruisseau de la Lanterne (affluent de l'Ognon, bassin du Rhône, Doubs) le 22 juillet 2020. Statut de population inconnu — probablement un lâcher aquariophile isolé, à surveiller",
        ],
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Petites espèces estuariennes et lagunaires, natives — à ne pas confondre
  // avec les invasions déjà cataloguées.
  //
  // Les deux Pomatoschistus sont eux-mêmes des Gobiidae : ils ont donc le même
  // disque ventouse ventral que les quatre gobies ponto-caspiens, ce qui
  // écarte ce critère comme différenciateur ici. Ce qui sépare les deux
  // groupes en pratique, c'est le lieu et la taille : les Pomatoschistus sont
  // minuscules (10 cm max) et vivent sur les sables et vases côtiers, lagunes
  // et estuaires de toutes les côtes françaises ; les quatre invasifs sont
  // plus grands et colonisent des rivières précises (Rhin, Moselle, Rhône,
  // Seine), souvent bien en amont de l'influence saline.
  // ═══════════════════════════════════════════════════════════════════════

  joel: {
    ficheSrc: "INPN (MNHN) · FishBase — biologie et répartition",
    ident: {
      summary:
        "Petit poisson argenté vivant en bancs denses, corps allongé semi-transparent, bande argentée longitudinale caractéristique sur les flancs. Deux nageoires dorsales bien séparées, l'œil grand par rapport au museau.",
      traits: [
        "Bande argentée longitudinale nette sur les flancs",
        "Corps allongé, semi-transparent",
        "Deux nageoires dorsales séparées",
        "Vit en bancs denses, souvent en surface"
      ],
      conf: [],
    },
    bio: {
      rows: [
        ["Habitat", "Très euryhalin : lagunes côtières, étangs méditerranéens, estuaires, bas des fleuves, occasionnellement l'eau douce"],
        ["Régime", "Petits crustacés, vers, mollusques, larves de poissons"],
        ["Reproduction", "Pontes fractionnées, œufs à filaments accrochés aux algues, 2 à 6 m de profondeur"],
        ["Usage traditionnel", "Pêché à la senne dans les étangs méditerranéens, traditionnellement pour la friture (avec l'anchois et la sardine)"],
      ],
    },
  },

  "gobie-tachete": {
    ficheSrc: "INPN (MNHN) · FishBase — biologie et répartition",
    ident: {
      summary:
        "Minuscule gobie natif des côtes françaises, corps trapu et translucide, tacheté de brun. Nageoires pelviennes soudées en disque ventouse comme tous les gobies — mais sa taille modeste et son habitat côtier le distinguent des gobies ponto-caspiens invasifs.",
      traits: [
        "Très petite taille : jusqu'à 6 cm",
        "Corps trapu, translucide, tacheté de brun",
        "Nageoires pelviennes soudées en disque ventouse (trait de tous les Gobiidae)",
        "Vit sur sables et vases d'estuaires et lagunes côtières",
      ],
      conf: [
        {
          n: "Gobie de Kessler",
          how: "Les quatre gobies ponto-caspiens invasifs sont nettement plus grands (jusqu'à 35 cm pour le gobie à taches noires) et colonisent des rivières précises (Rhin, Moselle, Rhône, Seine), souvent loin de l'influence saline ; le gobie tacheté, natif, reste minuscule (6 cm) et vit sur les sables et vases côtiers de toutes les côtes françaises. Le disque ventouse ne distingue pas les deux groupes : ce sont tous des Gobiidae.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Estuaires, lagunes, vasières côtières — toutes les côtes françaises"],
        ["Régime", "Petits invertébrés benthiques"],
        ["Reproduction", "Le mâle garde les œufs déposés dans une cavité ou sous une coquille"],
        ["Conservation", "Natif, préoccupation mineure au niveau mondial"],
      ],
    },
  },

  "gobie-des-sables": {
    ficheSrc: "INPN (MNHN) · FishBase — biologie et répartition",
    ident: {
      summary:
        "Gobie natif des fonds sableux côtiers et estuariens, un peu plus grand que le gobie tacheté mais tout aussi discret. Corps translucide à brunâtre, nageoires pelviennes soudées en disque ventouse comme tous les gobies.",
      traits: [
        "Petite taille : quelques centimètres, plus grand que le gobie tacheté",
        "Corps translucide à brunâtre, tacheté",
        "Nageoires pelviennes soudées en disque ventouse (trait de tous les Gobiidae)",
        "Vit enfoui dans le sable des fonds côtiers et estuariens",
      ],
      conf: [
        {
          n: "Gobie de Kessler",
          how: "Les quatre gobies ponto-caspiens invasifs sont nettement plus grands et colonisent des rivières précises (Rhin, Moselle, Rhône, Seine) ; le gobie des sables, natif, reste sur les fonds sableux côtiers et estuariens de toutes les côtes françaises. Le disque ventouse ne distingue pas les deux groupes : ce sont tous des Gobiidae.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Fonds sableux côtiers et estuariens, enfoui le jour"],
        ["Régime", "Petits invertébrés benthiques"],
        ["Conservation", "Natif, préoccupation mineure au niveau mondial ; données insuffisantes en France (Liste rouge nationale)"],
      ],
    },
  },

  syngnathe: {
    ficheSrc: "INPN (MNHN) · FishBase — biologie et répartition",
    ident: {
      summary:
        "Cousin d'eau saumâtre et douce de l'hippocampe, corps très allongé et cuirassé d'anneaux osseux, museau tubulaire. Le mâle porte une poche incubatrice ventrale sous la queue.",
      traits: [
        "Corps en forme de tige, cuirassé d'anneaux osseux",
        "Museau tubulaire, bouche minuscule à son extrémité",
        "Le mâle porte les œufs dans une poche ventrale sous la queue",
        "Nage lentement, ondulant parmi la végétation",
      ],
      conf: [],
    },
    bio: {
      rows: [
        ["Habitat", "Très euryhalin : végétation ou détritus sur sable et vase, mer, estuaires et eau douce"],
        ["Régime", "Petits invertébrés, aspirés par le museau tubulaire"],
        ["Reproduction", "Le mâle féconde 10 à 60 œufs déposés dans sa poche ventrale et les porte 20 à 32 jours selon la température"],
        ["Conservation", "Préoccupation mineure au niveau mondial (UICN LC)"],
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Trois lignées cryptiques du complexe loche franche, plus une loche
  // italienne introduite accidentellement, et les deux épinochettes qui
  // ferment le catalogue. Dernier lot pour boucler la liste de référence
  // (moins les corégones et cyprinodontes éteints, volontairement exclus).
  // ═══════════════════════════════════════════════════════════════════════

  "loche-d-espagne": {
    ficheSrc: "INPN (MNHN) · FishBase — biologie et répartition",
    ident: {
      summary:
        "Lignée cryptique du complexe loche franche, revalidée en 2021, indissociable à l'œil de la loche franche commune. Seule la répartition géographique permet de la reconnaître : bassin de l'Adour.",
      traits: [
        "6 barbillons autour de la bouche, tête aplatie — traits communs à toutes les loches franches",
        "Marbrures brunes sur fond jaunâtre",
        "Taille jusqu'à 12 cm",
        "Bassin de l'Adour (France) et Espagne du Nord",
      ],
      conf: [
        {
          n: "Loche franche",
          how: "Indissociable à l'œil ; seule la répartition tranche — la loche d'Espagne est propre au bassin de l'Adour, la loche franche occupe le reste du territoire.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Cours d'eau vifs et frais à fond de graviers, comme la loche franche"],
        ["Répartition", "Bassin de l'Adour (France), Ebro et Cantabrique oriental (Espagne)"],
        ["Taxonomie", "Revalidée en 2021 après avoir été considérée comme un synonyme"],
      ],
    },
  },

  "loche-leopard": {
    ficheSrc: "INPN (MNHN) · Gauliard, Dettaï, Persat, Keith & Denys (2019) — description originale, Cybium",
    ident: {
      summary:
        "Lignée cryptique du complexe loche franche, décrite en 2019, indissociable à l'œil de la loche franche commune. Seule la répartition géographique permet de la reconnaître : bassins du Tech et de la Têt.",
      traits: [
        "6 barbillons autour de la bouche, tête aplatie — traits communs à toutes les loches franches",
        "Marbrures brunes sur fond jaunâtre",
        "Taille jusqu'à 12 cm",
        "Endémique des bassins du Tech et de la Têt (Pyrénées-Orientales)",
      ],
      conf: [
        {
          n: "Loche franche",
          how: "Indissociable à l'œil ; seule la répartition tranche — la loche léopard est endémique des bassins du Tech et de la Têt (Pyrénées-Orientales), la loche franche occupe le reste du territoire.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Cours d'eau vifs et frais à fond de graviers, comme la loche franche"],
        ["Répartition", "Endémique des bassins du Tech et de la Têt (Pyrénées-Orientales, Catalogne française)"],
        ["Taxonomie", "Décrite en 2019 ; type collecté sur la Têt à Néfiach"],
      ],
    },
  },

  "loche-du-lez": {
    ficheSrc: "INPN (MNHN) · FishBase — biologie et répartition",
    ident: {
      summary:
        "Lignée cryptique du complexe loche franche, indissociable à l'œil de la loche franche commune. Nommée d'après le Lez, l'un des cours d'eau de son aire — à ne pas confondre avec le chabot du Lez, une espèce totalement différente qui partage le même nom de rivière.",
      traits: [
        "6 barbillons autour de la bouche, tête aplatie — traits communs à toutes les loches franches",
        "Marbrures brunes sur fond jaunâtre",
        "Taille jusqu'à 7 cm",
        "Bassins du Lez, du Tech, de l'Adour et de la Garonne",
      ],
      conf: [
        {
          n: "Loche franche",
          how: "Indissociable à l'œil ; seule la répartition tranche — la loche du Lez occupe les bassins du Lez, du Tech, de l'Adour et de la Garonne.",
        },
        {
          n: "Chabot du Lez",
          how: "Le nom prête à confusion mais ce sont deux espèces sans rapport, d'ordres différents : le chabot du Lez (Cottus petiti) est un chabot à tête large protégé, endémique des trois premiers kilomètres du Lez ; la loche du Lez est une loche allongée à barbillons, présente sur un territoire bien plus vaste (Lez, Tech, Adour, Garonne).",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Cours d'eau vifs et frais à fond de graviers, comme la loche franche"],
        ["Répartition", "Bassins du Lez, du Tech, de l'Adour et de la Garonne"],
        ["Étymologie", "Nommée en l'honneur de l'ichtyologiste Jean-Pierre Quignard"],
      ],
    },
  },

  "loche-transalpine": {
    ficheSrc: "INPN (MNHN) · FishBase — biologie et répartition",
    ident: {
      summary:
        "Loche italienne introduite accidentellement en France, proche de la loche de rivière. Corps allongé, deux taches noires nettes à la base de la nageoire caudale.",
      traits: [
        "Corps allongé, ne dépassant guère 10 cm",
        "Deux taches noires nettes à la base de la caudale",
        "Vit sur fonds sableux à débris organiques, en bordure des cours d'eau de piémont et de plaine",
      ],
      conf: [
        {
          n: "Loche de rivière",
          how: "Les deux espèces sont proches ; la loche transalpine est endémique du nord de l'Italie et n'est présente en France que par introduction accidentelle (basse Durance depuis 1995), la loche de rivière est native et protégée sur le reste du territoire. Dans le doute, relâchez.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Biotopes marginaux peu profonds des rivières de piémont et de plaine, fonds sableux à débris organiques"],
        ["Origine", "Endémique du nord de l'Italie"],
        ["Présence en France", "Introduite accidentellement ; signalée dans la basse vallée de la Durance depuis 1995"],
      ],
    },
  },

  "epinochette-neuf-epines": {
    ficheSrc: "INPN (MNHN) · FishBase — biologie et répartition",
    ident: {
      summary:
        "Petit gastérostéidé du nord et de l'est de la France, à ne pas confondre avec l'épinochette (Pungitius laevis) déjà au catalogue : les deux espèces portent le même nom vernaculaire « épinochette », y compris dans les bases officielles.",
      traits: [
        "6 à 12 épines dorsales (en moyenne 9-10), aussi longues que la nageoire anale",
        "Petite taille, quelques centimètres",
        "Nord et est de la France : bassins Seine, Meuse, Escaut, côtiers de la Manche",
      ],
      conf: [
        {
          n: "Épinochette",
          how: "Les deux espèces portent officiellement le même nom vernaculaire « épinochette » — Pungitius laevis (déjà au catalogue) et Pungitius pungitius (ici) ne se distinguent de façon fiable que par le nombre d'épines dorsales (plus nombreuses ici, 6 à 12) et l'analyse génétique.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux calmes végétalisées, comme les autres gastérostéidés"],
        ["Répartition", "Nord et est de la France (Seine, Meuse, Escaut, côtiers de la Manche), pénétrant jusqu'en Saône ; large répartition holarctique (Asie du Nord, Amérique du Nord, Europe septentrionale)"],
      ],
    },
  },

  "epinochette-du-poitou": {
    ficheSrc: "INPN (MNHN) · Denys & al. (2018) — révalidation · FishBase",
    ident: {
      summary:
        "Petit gastérostéidé endémique du Centre-Ouest français, décrit en 1848 puis synonymisé avec l'épinochette à neuf épines avant d'être revalidé en 2018 comme espèce distincte.",
      traits: [
        "Morphologie générale des épinochettes : petite taille, épines dorsales",
        "Très petite taille : 3,9 cm (mâle) à 4,6 cm (femelle)",
        "Endémique du Centre-Ouest français",
      ],
      conf: [
        {
          n: "Épinochette",
          how: "Longtemps confondue avec les autres épinochettes ; seule la répartition (Centre-Ouest : Vienne, estuaire de la Gironde, Dordogne, Charente, Sèvre Niortaise, Ligneron) et l'analyse génétique permettent de la distinguer avec certitude.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux calmes végétalisées, cours d'eau et zones estuariennes du Centre-Ouest"],
        ["Répartition", "Bassin de la Vienne, estuaire de la Gironde, affluents de la Dordogne, Charente, Sèvre Niortaise, Ligneron"],
        ["Taxonomie", "Décrite en 1848, synonymisée puis revalidée en 2018 (Denys & al.)"],
        ["Conservation", "Quasi menacée (Liste rouge française, UICN NT)"],
      ],
    },
  },
};
