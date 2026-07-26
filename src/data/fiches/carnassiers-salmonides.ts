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
const SRC = "INPN (MNHN) · FishBase · DORIS — biologie et répartition";

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
      "INPN (MNHN) · Denys, Dettai, Persat, Hautecœur & Keith (2014) — description originale · Wikipédia (fr) · Aquaportail",
    ident: {
      summary:
        "Petit brochet endémique du Sud-Ouest, à la robe marbrée de bandes obliques (et non de taches claires comme le grand brochet), au museau proportionnellement plus court.",
      traits: [
        "Robe marbrée : bandes obliques sur les flancs, larges d'1 à 1,5 écaille",
        "Museau court : environ 0,9 fois la longueur post-orbitaire",
        "Taille adulte modeste : 30–80 cm, guère plus de 41 cm chez le mâle observé",
        "Moins d'écailles sur la ligne latérale que le grand brochet (104–107 contre 115–136)",
      ],
      conf: [
        {
          n: "Brochet",
          how: "Le brochet présente des rangées de taches claires ovales sur fond sombre, jamais de bandes obliques marbrées. En pratique, le critère le plus sûr reste la localisation : le brochet aquitain n'est connu que dans les bassins de la Charente, de la Dordogne, de l'Eyre et de l'Adour (jusqu'au lac de Mouriscot au sud) — ailleurs en France, un brochet est un grand brochet.",
        },
      ],
    },
    // Personne ne « pêche le brochet aquitain » : on pêche le brochet, et dans
    // quatre bassins du Sud-Ouest c'est parfois celui-là qui vient. La section
    // décrit donc la reconnaissance et la remise à l'eau, pas une technique
    // pour le cibler — ce serait viser une espèce endémique et rare.
    fish: {
      rows: [
        ["Prise", "Capture accessoire de la pêche du brochet, dans les seuls bassins Charente, Dordogne, Eyre et Adour"],
        ["Réglementation", "Traité comme le brochet : mêmes maille, quota et période (voir la section Règles)"],
        ["Conduite à tenir", "Endémique français rare, décrit seulement en 2014 : remise à l'eau immédiate et soignée, sans le sortir de l'eau plus que nécessaire"],
        ["Ne pas confondre", "Un brochet pris hors de ces quatre bassins est un grand brochet — la localisation prime sur la robe"],
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Cours d'eau et lacs du Grand Sud-Ouest (Charente, Dordogne, Eyre, Adour)"],
        ["Statut", "Décrit en 2014, endémique français ; espèce rare, en régression possible"],
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
        "Denture vomérienne en croix (origine du nom « cristivomer »)",
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
    cook: {
      note: "Chair fine et fondante, blanche à rosée — nettement orangée chez les grands sujets qui se nourrissent de poissons. Peu d'arêtes, comme chez les autres ombles.",
      prep: [
        "Lever les filets : la peau est fine, les écailles minuscules",
        "Cuisson courte, à la meunière ou au four — la chair est grasse et sèche vite",
        "Les grands sujets se prêtent au fumage ou au gravlax",
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
    // Population française « anecdotique » (voir bio) : décrire comment le
    // cibler n'aurait pas de sens. Ce qui manquait au pêcheur, c'est de savoir
    // quoi faire s'il en accroche un — la maille de 70 cm ne suffit pas à le
    // dire, et elle est de toute façon portée par la section Règles.
    fish: {
      rows: [
        ["Prise", "Capture exceptionnelle en pêchant le carnassier ou la truite au pied du haut Rhône"],
        ["Conduite à tenir", "Population résiduelle et non pérenne : remise à l'eau immédiate, quelle que soit la taille du poisson"],
        ["Signalement", "Une capture mérite d'être signalée à la fédération départementale — les données sur l'espèce en France sont très rares"],
      ],
    },
    bio: {
      rows: [
        ["Origine", "Bassin du Danube (Europe centrale)"],
        ["Présence en France", "Introduit entre 1957 et 1960 dans les Usses (Haute-Savoie) ; n'a jamais colonisé le Rhône"],
        ["Statut actuel", "Population anecdotique, maintien incertain au pied du haut Rhône"],
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
        ["Statut", "Espèce en fort déclin sur la plupart des bassins français faute de géniteurs"],
        ["Répartition", "Historiquement Bretagne, Normandie, bassin Adour-Gaves ; aujourd'hui très localisé"],
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Deux lignées de truite régionales et deux corégones vivants supplémen-
  // taires, plus l'ombre du haut bassin de la Loire — tous des salmonidés
  // d'eau douce, réglementés comme leurs cousins déjà curatés (même maille,
  // même période 1ʳᵉ catégorie), avec la même prudence que le reste du
  // catalogue sur les identifications de terrain incertaines.
  // ═══════════════════════════════════════════════════════════════════════

  "truite-corse": {
    ficheSrc: "INPN (MNHN) · FishBase · DORIS (FFESSM) — biologie et répartition",
    ident: {
      summary:
        "Truite endémique de Corse, de Sardaigne, de Sicile et du sud de l'Italie continentale, distincte de la truite fario continentale. Robe marquée de nombreuses petites taches sombres et brun-rougeâtre, plus petites que l'œil.",
      traits: [
        "20 à 60 petites taches ocellées sur les flancs, plus petites que l'œil, noires ou brun-rougeâtre",
        "9 à 13 marques pariétales (« parr marks ») persistant chez l'adulte",
        "Caudale légèrement échancrée",
        "Vit en eaux claires et fraîches, souvent des résurgences karstiques à végétation aquatique dense",
      ],
      conf: [
        {
          n: "Truite fario",
          how: "La truite fario continentale n'est pas présente en Corse à l'état génétiquement pur ; toute truite sauvage corse est présumée être cette espèce ou un hybride. Le nombre élevé de petites taches, plus petites que l'œil, est le trait le plus caractéristique.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Résurgences karstiques et cours d'eau clairs et frais (10–20 °C), végétation aquatique dense"],
        ["Répartition", "Corse, Sardaigne, Sicile, sud de l'Italie continentale (bassin du Magra et au sud)"],
        ["Statut", "En danger critique (UICN CR, 2023) — menacée notamment par l'introgression génétique de la truite fario introduite pour l'empoissonnement"],
      ],
    },
  },

  "truite-du-rhone": {
    ficheSrc: "INPN (MNHN) · FishBase — biologie et répartition",
    ident: {
      summary:
        "Truite du Grand Sud-Est, du bassin du Rhône jusqu'à la Roya. Robe plus sombre et plus unie que la truite fario, quatre barres sombres larges caractéristiques (derrière l'ouïe, sous la dorsale, au-dessus de l'anale, à l'extrémité du pédoncule caudal), peu ou pas de points rouges.",
      traits: [
        "Quatre barres sombres larges : derrière l'opercule, sous la base de la dorsale, au-dessus de l'anale, à l'extrémité du pédoncule caudal",
        "Robe globalement plus sombre et plus unie que la truite fario",
        "Peu ou pas de points rouges, pas de marques orangées sur l'adipeuse",
        "Peut atteindre 80 cm",
      ],
      conf: [
        {
          n: "Truite fario",
          how: "La truite fario porte des points rouges bien visibles et des marques orangées sur l'adipeuse, absents ou très réduits ici ; la truite du Rhône se reconnaît à ses quatre barres sombres larges et à sa robe plus unie. Validité taxonomique débattue : certains auteurs n'y voient qu'un morphotype régional de la truite commune plutôt qu'une espèce distincte.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Rivières et ruisseaux à eau claire et fraîche, courant lent à vif"],
        ["Répartition", "Bassin du Rhône (hors bassin du Léman) jusqu'au bassin de la Roya ; Suisse occidentale et nord-ouest de l'Italie"],
        ["Statut taxonomique", "Distinguée de la truite commune, mais validité débattue — considérée par certains comme un morphotype régional plutôt qu'une espèce à part entière"],
      ],
    },
  },

  "ombre-d-auvergne": {
    ficheSrc: "INPN (MNHN) · Persat & al. (2019), description originale — Cybium",
    ident: {
      summary:
        "Ombre endémique du haut bassin de la Loire et de l'Allier, décrit en 2019 — la troisième espèce d'ombre reconnue en Europe. Corps plus allongé que l'ombre commun, museau pointu, bouche inférieure à ouverture transversale, plus de 50 points sombres sur les flancs.",
      traits: [
        "Corps plus allongé, museau pointu, profil rectiligne à convexe",
        "Bouche inférieure à ouverture transversale, lèvre supérieure charnue",
        "Plus de 50 (jusqu'à plusieurs centaines) points sombres sur les flancs",
        "Tête et œil proportionnellement plus petits que l'ombre commun",
      ],
      conf: [
        {
          n: "Ombre commun",
          how: "Les deux espèces sont très proches ; l'ombre d'Auvergne est endémique du haut bassin de la Loire et de l'Allier (Alagnon, Dore, Ance, Sioule), l'ombre commun occupe le reste du territoire français. Des lâchers d'ombre commun dans l'aire de l'ombre d'Auvergne créent un risque d'hybridation — un critère de terrain fiable et rapide manque encore.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Rivières fraîches et bien oxygénées du haut bassin de la Loire, très sensible à la qualité de l'eau"],
        ["Répartition", "Endémique de quelques rivières du haut bassin Loire-Allier : Alagnon, haute Loire, Allier, Sioule, Dore, Ance"],
        ["Statut", "Décrit en 2019 ; seulement huit populations connues, en danger (Liste rouge régionale UICN Auvergne-Rhône-Alpes)"],
        ["Menace", "Hybridation avec l'ombre commun introduit par des sociétés de pêche locales dans son aire de répartition"],
      ],
    },
  },

  "coregone-blanc": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Corégone pélagique natif des grands lacs alpins, aux côtés du corégone lavaret. Corps fuselé argenté sans tache, nageoires sans épine — un trait qui le distingue des autres corégones. Selon le lac, il porte le nom vernaculaire de « lavaret » ou d'autres noms locaux, à ne pas confondre avec l'espèce Coregonus lavaretus déjà au catalogue.",
      traits: [
        "Corps fuselé et argenté, sans tache, comme les autres corégones",
        "Aucune épine sur les nageoires dorsale et anale — un critère distinctif du genre",
        "Nageoire caudale très échancrée",
        "Vit en bancs pélagiques dans les grands lacs alpins profonds",
      ],
      conf: [
        {
          n: "Corégone / lavaret / féra",
          how: "Les deux espèces sont natives des mêmes grands lacs alpins et quasiment indissociables à l'œil. Le nom vernaculaire n'aide pas à trancher : « lavaret » désigne localement tantôt l'une, tantôt l'autre selon le lac — seule une identification experte ou génétique permet de distinguer les deux espèces avec certitude.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Grands lacs alpins profonds et froids, en bancs pélagiques"],
        ["Régime", "Zooplancton"],
        ["Répartition", "Lac du Bourget (où il est appelé localement « lavaret »), lacs d'Aiguebelette, de Nantua, de Paladru, de Laffrey, d'Issarlès"],
        ["Remarque", "Cohabite avec le corégone lavaret dans plusieurs lacs ; les deux espèces sont difficiles à distinguer sans expertise"],
      ],
    },
  },

  palee: {
    ficheSrc: SRC,
    ident: {
      summary:
        "Corégone natif des lacs suisses de Neuchâtel et Bienne, introduit au Léman et dans d'autres lacs franco-suisses. « Palée » est un nom vernaculaire ambigu : selon le lac, il peut désigner cette espèce ou d'autres corégones du même complexe.",
      traits: [
        "Corps fuselé et argenté, sans tache — silhouette générale de corégone",
        "Peut atteindre 45 cm",
        "Vit en bancs, fraie sur graviers proches du rivage jusqu'à 50 m de profondeur",
      ],
      conf: [
        {
          n: "Corégone / lavaret / féra",
          how: "Indissociable à l'œil des autres corégones du complexe présents dans les mêmes lacs. « Palée » est un nom ambigu qui désigne, selon le plan d'eau, plusieurs espèces différentes — l'identification certaine relève de l'expertise ou de la génétique, pas de l'œil nu.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Lacs profonds franco-suisses, en bancs"],
        ["Reproduction", "Sur graviers proches du rivage à grande profondeur (jusqu'à 50 m) ; novembre-décembre en eau peu profonde, décembre-février en eau profonde"],
        ["Répartition", "Native des lacs de Neuchâtel et Bienne (Suisse) ; introduite au Léman et dans d'autres lacs franco-suisses"],
        ["Remarque", "Nom vernaculaire ambigu, partagé selon les lacs avec d'autres corégones (dont Coregonus fera, éteint) — la confusion est documentée, pas seulement locale"],
      ],
    },
  },

  "brochet-italien": {
    ficheSrc: "INPN (MNHN) · MNHN (actualités) · Esoxiste.com — biologie, répartition et statut",
    ident: {
      summary:
        "Troisième espèce de brochet reconnue en France, décrite en 2011, présente dans le Sud-Est près de l'arc alpin. Robe marquée de bandes ou stries claires sur fond sombre (à l'inverse des taches claires ovales du grand brochet), moins d'écailles sur la ligne latérale.",
      traits: [
        "Robe à bandes ou stries claires sur fond sombre, plutôt que des taches ovales isolées",
        "Moins d'écailles sur la ligne latérale que le grand brochet",
        "Génétiquement distinct du brochet commun et du brochet aquitain",
      ],
      conf: [
        {
          n: "Brochet",
          how: "Le grand brochet présente des rangées de taches claires ovales sur fond sombre ; le brochet italien a des bandes ou stries plutôt que des taches isolées. Le critère le plus sûr reste la localisation : connu en France près de l'arc alpin (Sud-Est), historiquement dans le lac Léman et le lac Saint-André.",
        },
        {
          n: "Brochet aquitain",
          how: "Les deux sont des brochets régionaux distincts du grand brochet, mais sans rapport géographique : le brochet aquitain est endémique du Sud-Ouest (Charente, Dordogne, Eyre, Adour), le brochet italien du Sud-Est alpin.",
        },
      ],
    },
    // Comme pour le brochet aquitain : une espèce menacée par l'hybridation
    // avec le brochet commun repeuplé dans son aire ne se cible pas, elle se
    // reconnaît et se relâche.
    fish: {
      rows: [
        ["Prise", "Capture accessoire de la pêche du brochet, dans le Sud-Est près de l'arc alpin"],
        ["Réglementation", "Traité comme le brochet : mêmes maille, quota et période (voir la section Règles)"],
        ["Conduite à tenir", "Vulnérable (UICN VU) et en déclin par hybridation avec le brochet commun introduit dans son aire : remise à l'eau immédiate et soignée recommandée"],
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Lacs et cours d'eau du Sud-Est français et du nord de l'Italie"],
        ["Répartition", "Nord et centre de l'Italie, Sud-Est français ; historiquement lac Léman (XIXᵉ siècle) et lac Saint-André (années 1920)"],
        ["Statut", "Décrit en 2011 ; vulnérable (UICN VU, 2023) — déclin par hybridation avec le brochet commun repeuplé par des opérations d'empoissonnement"],
      ],
    },
  },
};
