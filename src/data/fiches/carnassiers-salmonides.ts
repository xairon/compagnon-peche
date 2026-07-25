import type { Fiche } from "./index";

// Fiches descriptives des groupes « carnassiers » (hors sandre/brochet, déjà
// rédigés à part) et « salmonides » (hors truite/ombre, déjà rédigés à part).
//
// Contenu limité à ce qui est établi et vérifiable : morphologie, habitat,
// régime, reproduction, techniques de pêche. Rien de réglementaire (la maille,
// le quota et la période viennent du générateur et des modules de
// réglementation), rien de sanitaire (les avis ANSES et les risques de
// consommation vivent dans data/edibility.ts, où chaque entrée porte sa source).
//
// Source des éléments biologiques : INPN (MNHN), FishBase et DORIS pour la
// biologie et la répartition, complétés par des sources halieutiques
// (fédérations de pêche, Esoxiste, Pêche & Poissons) pour les techniques et la
// cuisine. Une espèce dont un trait n'est pas établi n'a pas ce trait.
// La source doit couvrir TOUT ce qu'elle signe. INPN, FishBase et DORIS portent
// la biologie et la répartition, pas les grammages de leurres ni les longueurs
// de canne : la partie technique vient de la presse halieutique et des
// fédérations, et le dire évite d'attribuer à un institut une préconisation
// qu'il n'a jamais écrite.
const SRC = "INPN (MNHN) · FishBase · DORIS — biologie et répartition ; techniques : presse halieutique et fédérations de pêche";

export const CARNASSIERS_SALMONIDES: Record<string, Fiche> = {
  // --- Carnassiers ---------------------------------------------------------

  aspe: {
    ficheSrc: SRC,
    ident: {
      summary:
        "Grand cyprinidé prédateur au corps élancé, dos vert olive à reflets argentés et bleutés, ventre blanc-gris. Bouche large et retroussée vers le haut, mâchoire inférieure saillante.",
      traits: [
        "Corps fuselé, légèrement comprimé latéralement",
        "Carène entre nageoires ventrales et anus",
        "Bouche grande, orientée vers le haut, mâchoire inférieure proéminente",
        "Nageoires anale et caudale échancrées",
        "Taille courante 40–75 cm, jusqu'à 120 cm",
      ],
      conf: [
        {
          n: "Chevesne",
          how: "Le chevesne a une bouche large mais horizontale, jamais retroussée vers le haut, et une tête plus massive et arrondie ; l'aspe a la mâchoire inférieure qui dépasse nettement la supérieure.",
        },
      ],
    },
    fish: {
      rows: [
        ["Techniques", "Leurres de surface et subsurface, poissons-nageurs, cuiller ondulante"],
        ["Postes", "Proche de la surface, en chasse sur bancs d'ablettes et de gardons"],
        ["Moment", "Aube et crépuscule, parfois chasses visibles en surface"],
        ["Comportement", "Juvéniles en groupes près des berges, adultes solitaires au fil de l'eau"],
      ],
    },
    cook: {
      note: "Chair intéressante mais arêtes en Y disposées en rangées autour et dans les filets, comme chez le brochet — un désossage soigné à l'américaine est nécessaire.",
      prep: [
        "Lever les filets",
        "Inciser autour et le long des rangées d'arêtes en Y pour les retirer",
        "Cuisson au choix une fois désossé (poêle, four)",
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Rivières et fleuves clairs et oxygénés, parfois grands lacs"],
        ["Régime", "Piscivore à l'âge adulte (ablettes, gardons) ; plancton et larves en juvénile"],
        ["Reproduction", "Avril–juin, en eaux vives sur fonds graveleux, 50 000 à 1 000 000 d'œufs"],
        ["Répartition", "Introduit et en expansion (Rhin, Ill, Moselle, canal Rhône-Rhin)"],
      ],
    },
  },

  "black-bass-petite-bouche": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Centrarchidé robuste au corps comprimé latéralement, flancs marqués de barres verticales sombres sur fond brun-vert. Dorsale en deux parties nettement séparées.",
      traits: [
        "Dorsale antérieure épineuse (~10 rayons), dorsale postérieure souple (13–15 rayons)",
        "Commissure de la bouche n'atteignant pas l'aplomb de l'œil",
        "Flancs à barres verticales sombres irrégulières",
        "Taille courante 20–38 cm",
      ],
      conf: [
        {
          n: "Black-bass",
          how: "Chez le black-bass (à grande bouche), la commissure de la bouche dépasse l'aplomb de l'œil ; chez le black-bass à petite bouche, elle s'arrête avant l'œil — le critère le plus fiable en main.",
        },
        {
          n: "Perche",
          how: "La perche a deux dorsales bien séparées mais des bandes verticales plus nettes et régulières, et des nageoires ventrales et anale orangées, absentes chez le black-bass.",
        },
      ],
    },
    fish: {
      rows: [
        ["Techniques", "Leurres souples, crankbaits, popper, pêche au vif"],
        ["Postes", "Zones rocheuses, arbres immergés, eaux claires et fraîches de lacs et rivières"],
        ["Reproduction", "Mai–juin vers 18 °C, nid gardé par le mâle"],
        ["Répartition", "Présence localisée en France (bassins du Rhin, de la Moselle)"],
      ],
    },
    cook: {
      note: "Chair blanche, ferme et feuilletée, au goût délicat rappelant le loup en version eau douce. Se prête à toutes les cuissons.",
      prep: ["Écailler et vider", "Lever les filets", "Poêle, grill ou papillote selon la taille"],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux claires et fraîches, zones rocheuses de lacs et rivières"],
        ["Régime", "Piscivore et invertivore (écrevisses, petits poissons, insectes)"],
        ["Reproduction", "Nid en fond graveleux, gardé par le mâle jusqu'à l'éclosion"],
        ["Répartition", "Origine nord-américaine, introduit ; moins établi en France que le black-bass à grande bouche"],
      ],
    },
  },

  "brochet-aquitain": {
    ficheSrc:
      "INPN (MNHN) · Denys, Dettai, Persat, Hautecœur & Keith (2014) — description originale de l'espèce",
    ident: {
      summary:
        "Petit brochet endémique du Sud-Ouest, à la robe marbrée de bandes obliques (et non de taches claires comme le grand brochet), au museau proportionnellement plus court.",
      traits: [
        "Robe marbrée : bandes obliques sur les flancs, larges d'1 à 1,5 écaille",
        "Museau court : environ 0,9 fois la longueur post-orbitaire",
        "Taille adulte modeste : le plus souvent 30–50 cm, nettement moins que le brochet commun",
        "Moins d'écailles sur la ligne latérale que le grand brochet (104–107 contre 115–136)",
      ],
      conf: [
        {
          n: "Brochet",
          how: "Le brochet présente des rangées de taches claires ovales sur fond sombre, jamais de bandes obliques marbrées. En pratique, le critère le plus sûr reste la localisation : le brochet aquitain n'est connu que dans les bassins de la Charente, de la Dordogne, de l'Eyre et de l'Adour (jusqu'au lac de Mouriscot au sud) — ailleurs en France, un brochet est un grand brochet.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Cours d'eau et lacs du Grand Sud-Ouest (Charente, Dordogne, Eyre, Adour)"],
        ["Taxonomie", "Décrit en 2014, endémique français ; espèce rare"],
        ["Longévité", "15 à 20 ans"],
        ["Menace", "Risque d'hybridation avec le grand brochet introduit dans son aire"],
      ],
    },
  },

  // --- Salmonidés ------------------------------------------------------------

  "coregone-lavaret": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Salmonidé pélagique au corps fuselé et hydrodynamique, dos gris-bleu à gris-vert, flancs argentés, ventre blanc nacré. Tête petite et pointue, bouche petite et infère, sans aucune tache sur le corps.",
      traits: [
        "Nageoire adipeuse présente (trait des salmonidés)",
        "Corps sans aucune tache, contrairement aux truites et ombles",
        "Bouche petite, orientée vers le bas — adaptée au gobage de plancton",
        "Nageoire caudale très échancrée",
        "Taille courante 25–45 cm, jusqu'à 60 cm",
      ],
      conf: [
        {
          n: "Truite fario",
          how: "La truite porte des taches noires et rouges bien visibles sur le corps ; le corégone en est totalement dépourvu, quel que soit le lac.",
        },
      ],
    },
    fish: {
      rows: [
        ["Technique", "Pêche « à la gambe » : potences de mouches imitant des chironomes"],
        ["Matériel", "Canne courte et souple (dite « canin », 1,2–2,4 m) pour voir la touche"],
        ["Montage", "Plomb poire de 15 à 40 g en bout de ligne selon la profondeur"],
        ["Comportement", "Bancs pélagiques, près du fond en début de saison puis étalés dans la colonne d'eau à mesure que l'eau se réchauffe"],
      ],
    },
    cook: {
      note: "Chair blanche, fine et délicate, au goût subtil légèrement iodé, mais présentant de fines arêtes comme la plupart des poissons de lac.",
      prep: [
        "Lever les filets (le poissonnier le fait bien, la peau est fine)",
        "Cuisson courte : à la meunière quelques minutes, ou en croûte de sel au four",
        "Poêlée à l'unilatérale, côté peau, pour préserver le moelleux",
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Grands lacs alpins profonds et froids (Léman, Bourget, Annecy, Aiguebelette)"],
        ["Régime", "Zooplancton et larves de chironomes, capturés un à un en pleine eau"],
        ["Reproduction", "À partir de 2 ans, en bancs"],
        ["Remarque", "« Lavaret » et « féra » désignent des populations locales du même complexe Coregonus selon le lac"],
      ],
    },
  },

  cristivomer: {
    ficheSrc: SRC,
    ident: {
      summary:
        "Grand salmonidé nord-américain introduit dans les lacs d'altitude, au corps robuste, robe gris foncé à brunâtre marbrée, ponctuée de taches claires blanches ou jaunâtres sur le corps et les nageoires dorsale et caudale.",
      traits: [
        "Taches claires irrégulières et marbrures, y compris sur la caudale",
        "Nageoire caudale nettement fourchue",
        "Dents portées par une crête du vomer — d'où le nom « cristivomer » (crista, la crête)",
        "Coloration plus terne que l'omble chevalier, sans teinte rougeâtre",
      ],
      conf: [
        {
          n: "Omble chevalier",
          how: "L'omble chevalier a des taches rondes claires (roses, crème ou orangées) sans marbrures ni halo, un ventre orange vif à rouge chez le mâle en fraie, et une caudale moins fourchue ; le cristivomer est plus terne, marbré y compris sur la caudale, et dépourvu de teintes rougeâtres.",
        },
      ],
    },
    fish: {
      rows: [
        ["Techniques", "Shads sur tête plombée (7–15 cm), cuillers ondulantes 5–20 g, jigs jusqu'à 30 g"],
        ["Postes", "Cassures, tombants et zones profondes, près du fond"],
        ["Profondeur", "Plus de 10 m en été — poisson lucifuge"],
        ["Moment", "Faible luminosité : tôt le matin, temps couvert"],
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Lacs profonds et froids d'altitude, souvent au-delà de 2 000 m dans les Pyrénées"],
        ["Origine", "Amérique du Nord, introduit en France dès 1950 pour la pêche sportive"],
        ["Répartition", "Pyrénées puis Alpes ; reproduction naturelle non avérée dans les lacs alpins et du Massif central"],
      ],
    },
  },

  huchon: {
    ficheSrc: SRC,
    ident: {
      summary:
        "Très grand salmonidé au corps allongé, section presque circulaire, dos brun-rouge marqué de nombreuses taches sombres en forme de X ou de croissant. Écailles minuscules.",
      traits: [
        "Taches en forme de X ou de croissant sur le dos et les flancs",
        "180 à 200 écailles le long de la ligne latérale — beaucoup plus fines que chez la truite",
        "Corps massif, presque cylindrique",
        "Peut atteindre 1,5 m et 50 kg dans son aire d'origine",
      ],
      conf: [
        {
          n: "Truite fario",
          how: "La truite fario porte des taches rondes noires et rouges bien distinctes ; le huchon a des taches allongées en X ou en croissant, et un corps nettement plus massif et cylindrique.",
        },
      ],
    },
    bio: {
      rows: [
        ["Origine", "Bassin du Danube (Europe centrale)"],
        ["Présence en France", "Introduit entre 1957 et 1960 dans les Usses (Haute-Savoie) ; n'a jamais colonisé le Rhône"],
        ["Conservation", "Population anecdotique, maintien incertain au pied du haut Rhône"],
        ["Habitat d'origine", "Grandes rivières vives du bassin danubien"],
      ],
    },
  },

  "omble-chevalier": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Salmonidé lacustre à la peau lisse et satinée, corps fusiforme. Dos gris-bleu à vert olive foncé, flancs argentés ponctués de petites taches claires roses, crème ou orangées, ventre orange vif à rouge chez le mâle en période de fraie.",
      traits: [
        "Taches rondes claires sur les flancs, sans marbrures",
        "Liseré blanc puis trait noir sur le bord d'attaque des nageoires inférieures — critère fiable en main",
        "Ventre orange à rouge vif chez le mâle reproducteur",
        "Taille courante 35–50 cm dans les lacs français",
      ],
      conf: [
        {
          n: "Cristivomer (touladi)",
          how: "Le cristivomer est plus terne, marbré (y compris sur la caudale) et dépourvu de teintes rougeâtres ; l'omble chevalier a des taches rondes nettes et un ventre vivement coloré en fraie.",
        },
        {
          n: "Truite fario",
          how: "La truite fario porte des taches noires en plus des claires, et n'a pas le liseré blanc suivi d'un trait noir sur les nageoires inférieures.",
        },
      ],
    },
    fish: {
      rows: [
        ["Matériel", "Canne spinning ou casting polyvalente selon les leurres"],
        ["Ligne", "Bas de ligne discret, surtout en eau claire"],
        ["Postes", "Grands lacs alpins profonds, entre 4 et 12 °C"],
        ["Reproduction", "Automne–hiver, sur frayères à substrat grossier bien oxygéné"],
      ],
    },
    cook: {
      note: "Chair rosée, fine et délicate, à mi-chemin entre la truite et le saumon, au goût subtil légèrement sucré.",
      prep: [
        "Vider et lever les filets",
        "Cuisson simple pour préserver la délicatesse : grillé, poché ou au four",
        "Se prête aussi au tartare sur un poisson très frais",
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Grands lacs alpins profonds et froids : Léman, Annecy, Bourget, quelques lacs d'altitude"],
        ["Thermie", "Sténotherme d'eau froide, recherche en permanence 4–12 °C"],
        ["Reproduction", "Automne–hiver, en profondeur sur substrat grossier"],
        ["Origine", "Espèce relique des périodes glaciaires ; introductions ponctuelles en altitude, y compris Pyrénées"],
      ],
    },
  },

  "saumon-atlantique": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Grand salmonidé migrateur au corps fuselé argenté en mer, devenant plus terne et taché à l'approche de la reproduction en rivière. Pédoncule caudal fin, nageoire adipeuse présente.",
      traits: [
        "Corps argenté en phase marine, taches noires en forme de croix apparaissant en eau douce",
        "Pédoncule caudal étroit, queue peu échancrée chez l'adulte",
        "Mâchoire du mâle reproducteur crochue (« bec »)",
        "Taille très variable selon le nombre d'hivers passés en mer",
      ],
      conf: [
        {
          n: "Truite fario",
          how: "En rivière, un tacon ou un saumon adulte se distingue par un pédoncule caudal plus fin et une nageoire caudale davantage échancrée ; la truite a un pédoncule plus épais et une caudale presque carrée.",
        },
      ],
    },
    bio: {
      rows: [
        ["Cycle", "Migrateur amphihalin : naissance en rivière, croissance en mer, retour se reproduire en eau douce"],
        ["Habitat de fraie", "Têtes de bassin à courant vif et fond graveleux"],
        ["Conservation", "En fort déclin sur la plupart des bassins français, faute de géniteurs"],
        ["Répartition", "Historiquement Bretagne, Normandie, bassin Adour-Gaves ; aujourd'hui très localisé"],
      ],
    },
  },
};
