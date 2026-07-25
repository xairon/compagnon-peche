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
        ["Statut", "Endémique du bassin du Rhône, en danger critique — remise à l'eau immédiate en cas de capture accidentelle"],
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
        ["Statut", "Œufs et frayères protégés ; seule blennie d'eau douce d'Europe, bassins méditerranéens"],
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
        ["Statut", "Espèce protégée, indissociable de la présence de moules d'eau douce"],
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
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux vives et fraîches à fond de galets et graviers, aussi certains lacs d'altitude"],
        ["Comportement", "Sédentaire et territorial, caché le jour sous les pierres, chasse au crépuscule ; nageur médiocre, sans vessie natatoire"],
        ["Reproduction", "Le mâle prépare un nid dans les galets, la femelle y dépose 100 à 500 œufs"],
        ["Statut", "Protégé, intérêt communautaire (Directive Habitats) ; forme un complexe de plusieurs espèces proches en Europe"],
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
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Systèmes fluviaux, plutôt que lacs et étangs"],
        ["Statut taxonomique", "Séparée du chabot commun (Cottus gobio) en 2005 par étude génétique"],
        ["Répartition", "Bassins du nord-ouest de l'Europe, dont une partie du bassin de la Seine"],
        ["Statut", "Protégée comme le chabot commun"],
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
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux stagnantes et boueuses, enfouie dans les sédiments le jour"],
        ["Comportement", "Peut respirer l'air atmosphérique par l'intestin pour survivre en eau très pauvre en oxygène"],
        ["Reproduction", "Avril–juin, jusqu'à 150 000 œufs déposés sur la végétation aquatique"],
        ["Statut", "Rare et menacée, protégée, Directive Habitats"],
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
        ["Statut", "Protégée, Directive Habitats — œufs et frayères protégés"],
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
    bio: {
      rows: [
        ["Habitat", "Petits cours d'eau de montagne à faible pente, près des berges en eau calme sur graviers"],
        ["Régime", "Insectivore à tendance omnivore : plancton, algues"],
        ["Reproduction", "Avril–juin (jusqu'en août en altitude), migration vers des affluents graveleux"],
        ["Statut", "Décrite en 2007 (Phoxinus bigerri), endémique du bassin Adour-Garonne"],
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
    bio: {
      rows: [
        ["Habitat", "Petits cours d'eau de montagne à faible pente, berges à faible courant, fond sableux ou graveleux"],
        ["Comportement", "Grégaire"],
        ["Reproduction", "Avril–juillet"],
        ["Statut", "Décrit en 2020 (Phoxinus dragarum) ; peut s'hybrider avec d'autres vairons — espèce récente, littérature encore limitée"],
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
    bio: {
      rows: [
        ["Répartition en France", "Bassin du Léman et du haut Rhin (première mention : Rupt de Mad, bassin Rhin-Moselle)"],
        ["Répartition européenne", "Allemagne, Autriche, Bulgarie, Macédoine du Nord, Serbie, Suisse — bassin du Danube"],
        ["Statut taxonomique", "Longtemps confondu avec le vairon commun (Phoxinus phoxinus), revalidé en 2017"],
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
    bio: {
      rows: [
        ["Répartition", "Bassins côtiers méditerranéens du Languedoc"],
        ["Statut taxonomique", "Espèce cryptique du complexe Phoxinus, distinguée récemment par génétique et robe nuptiale"],
        ["Remarque", "Littérature encore limitée sur cette espèce récemment décrite"],
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
};
