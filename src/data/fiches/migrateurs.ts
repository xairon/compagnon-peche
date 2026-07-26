import type { Fiche } from "./index";

// Fiches descriptives des migrateurs « base ».
//
// Groupe le plus sensible de l'appli : aloses, lamproies et esturgeon sont
// protégés, sous moratoire ou soumis à quota selon le bassin. Pour ces
// espèces-là, la fiche s'arrête à `ident` et `bio` — reconnaître et relâcher
// correctement — et ne comporte jamais de section `fish` (techniques de
// capture) ni `cook` : en ajouter une serait laisser entendre qu'on peut les
// garder, ce que l'app a justement corrigé ailleurs. Le champ `fish`
// générique déjà présent dans species-base.ts pour ces espèces ("vérifiez
// l'arrêté") reste donc seul affiché — cette fiche ne le remplace pas.
//
// Pour les espèces réellement pêchables sans réglementation particulière
// (éperlan, flet, les quatre mulets), la fiche est complète.
//
// Rien de réglementaire (maille, quota, période, statut protégé) : cela
// vient du générateur et des modules de réglementation. Rien de sanitaire :
// cela vit dans data/edibility.ts.
//
// Sources : INPN (Inventaire national du patrimoine naturel, MNHN), DORIS
// (FFESSM), FishBase, OFB (Office français de la biodiversité), et pour les
// aloses les observatoires de bassin (Logrami, Migado, Observatoire
// Migrateurs Rhône-Méditerranée).

const SRC = "INPN (MNHN) · DORIS (FFESSM) · FishBase · OFB — biologie et identification";

// Le statut légal n'est jamais écrit ici : il vient du générateur et des
// modules de réglementation, et l'app l'affiche déjà en bandeau. Une fiche qui
// le répète crée une seconde source pour une valeur de droit — l'une d'elles
// était fausse (« capture et détention interdites » pour la lamproie de Planer,
// quand l'arrêté cité ne protège que les œufs et les habitats).
export const MIGRATEURS: Record<string, Fiche> = {
  // ---------------------------------------------------------------------
  // Aloses — protégées au titre de la Directive Habitats, pêche de l'adulte
  // sous moratoire ou quota selon le bassin. Identification uniquement.
  // ---------------------------------------------------------------------

  "grande-alose": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Grand clupéidé argenté au corps fusiforme, ventre caréné par une rangée de scutelles pointues. Une seule tache sombre marquée derrière l'opercule (parfois suivie d'une ou deux taches plus pâles) et de très nombreuses branchiospines fines et serrées.",
      traits: [
        "Une seule tache sombre nette derrière l'opercule",
        "80 à 130 branchiospines fines sur le premier arc branchial",
        "Ventre caréné (scutelles en dents de scie)",
        "Taille courante 50–70 cm, peut dépasser 1 m",
      ],
      conf: [
        {
          n: "Alose feinte atlantique",
          how: "L'alose feinte porte une rangée de 4 à 8 taches sombres derrière l'opercule (contre une seule chez la grande alose) et beaucoup moins de branchiospines (40–60 contre 80–130). Elle dépasse rarement 64 cm.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Anadrome : grandit en mer, remonte les grands fleuves pour frayer"],
        ["Régime", "Planctonophage en mer ; ne s'alimente plus une fois entrée en rivière"],
        ["Reproduction", "Mai–juin, la nuit, en surface — frai bruyant et visible dit « bull »"],
        ["Conservation", "Population en fort déclin sur l'ensemble des bassins français"],
      ],
    },
  },

  "alose-feinte-atlantique": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Clupéidé argenté proche de la grande alose, mais plus petit et marqué d'une rangée de plusieurs taches sombres derrière l'opercule. Présente sur la façade atlantique et la Manche.",
      traits: [
        "Rangée de 4 à 8 taches sombres derrière l'opercule",
        "40 à 60 branchiospines sur le premier arc branchial",
        "Ventre caréné (scutelles)",
        "Taille courante 30–50 cm, dépasse rarement 64 cm",
      ],
      conf: [
        {
          n: "Grande alose",
          how: "La grande alose n'a qu'une seule tache sombre derrière l'opercule et 80 à 130 branchiospines (contre 4–8 taches et 40–60 branchiospines ici) ; elle atteint aussi une taille plus importante.",
        },
        {
          n: "Alose feinte méditerranéenne",
          how: "Morphologiquement très proches, ces deux formes ne se rencontrent pas sur les mêmes bassins : l'atlantique fréquente la façade Atlantique-Manche, la méditerranéenne le Rhône et les fleuves côtiers du Languedoc. Le bassin de capture tranche.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Anadrome : estuaires et côtes, remonte les fleuves atlantiques pour frayer"],
        ["Régime", "Planctonophage en mer ; jeûne durant la migration de reproduction"],
        ["Reproduction", "Mai–juillet, la nuit, en surface (« bull »)"],
        ["Conservation", "Population en fort déclin sur les bassins français"],
      ],
    },
  },

  "alose-feinte-mediterraneenne": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Forme méditerranéenne de l'alose feinte, longtemps classée comme sous-espèce du Rhône. Corps argenté, dos vert-bleu à reflets métalliques, rangée de taches sombres derrière l'opercule. Endémique du bassin méditerranéen.",
      traits: [
        "Rangée de 4 à 8 taches sombres derrière l'opercule",
        "Dos bleu-vert métallique, flancs et ventre argentés",
        "Ventre caréné (scutelles)",
        "Plus petite que la grande alose, qui est elle absente du bassin méditerranéen",
      ],
      conf: [
        {
          n: "Alose feinte atlantique",
          how: "Quasi identique à l'œil, mais les deux formes ne se croisent pas géographiquement : la méditerranéenne se capture sur le Rhône et les fleuves côtiers du Languedoc (Aude, Orb, Hérault, Vidourle) et des Pyrénées-Orientales, l'atlantique sur la façade Atlantique-Manche.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Anadrome : Méditerranée et fleuves côtiers du Rhône au Roussillon"],
        ["Régime", "Planctonophage en mer ; jeûne durant la migration de reproduction"],
        ["Reproduction", "Avril–juin, la nuit, en surface"],
        ["Conservation", "Endémique méditerranéenne, en déclin"],
      ],
    },
  },

  // ---------------------------------------------------------------------
  // Lamproies — la Planer est protégée (jamais pêchable) ; la marine et la
  // de rivière sont des migrateurs réglementés (moratoire/quota par bassin).
  // Identification uniquement dans les trois cas.
  // ---------------------------------------------------------------------

  "lamproie-marine": {
    ficheSrc: SRC,
    ident: {
      summary:
        "La plus grande des lamproies françaises, corps cylindrique jaunâtre marbré de brun, sans mâchoires : bouche en ventouse circulaire hérissée de dents cornées sur tout le disque. Deux nageoires dorsales rapprochées, de même hauteur.",
      traits: [
        "Coloration marbrée jaune-brun caractéristique",
        "Disque buccal entièrement recouvert de dents cornées fortes et pointues",
        "Deux dorsales rapprochées, de même hauteur",
        "Taille adulte 60–120 cm",
      ],
      conf: [
        {
          n: "Lamproie de rivière",
          how: "Plus petite (30–50 cm), le disque ne porte que quelques dents (pas la totalité de la surface), et les deux nageoires dorsales sont nettement séparées par un intervalle, la seconde plus haute et triangulaire.",
        },
        {
          n: "Anguille européenne",
          how: "L'anguille a de vraies mâchoires et des nageoires pectorales ; la lamproie n'a ni l'une ni l'autre, seulement une bouche-ventouse ronde.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Anadrome : mer côtière puis grands fleuves pour la reproduction"],
        ["Régime", "Parasite en mer (se fixe sur d'autres poissons) ; jeûne en rivière"],
        ["Reproduction", "Printemps, nid de galets creusé en eau courante"],
        ["Conservation", "Population en fort déclin sur les bassins français"],
      ],
    },
  },

  "lamproie-de-riviere": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Lamproie migratrice de taille moyenne, corps cylindrique gris-bleuté à brun. Disque buccal ne portant que quelques dents, deux nageoires dorsales bien séparées par un espace net, la seconde triangulaire et plus haute que la première.",
      traits: [
        "Taille adulte 30–50 cm",
        "Disque buccal peu denté (quelques dents, pas toute la surface)",
        "Deux dorsales séparées par un intervalle net",
        "Coloration gris-bleuté à brune, sans marbrures marquées",
      ],
      conf: [
        {
          n: "Lamproie marine",
          how: "Plus grande (jusqu'à 120 cm), marbrée de brun, disque buccal entièrement hérissé de dents fortes, et les deux dorsales sont rapprochées et de même hauteur (contre nettement séparées ici).",
        },
        {
          n: "Lamproie de Planer",
          how: "La Planer ne dépasse pas 19 cm, ses deux dorsales se touchent (contiguës) et son disque ne porte que de rares denticules émoussés, non fonctionnels — c'est une espèce non parasite qui ne migre jamais en mer.",
        },
        {
          n: "Anguille européenne",
          how: "L'anguille a de vraies mâchoires et des nageoires pectorales ; la lamproie n'a qu'une bouche-ventouse ronde, sans pectorales.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Anadrome : estuaires et côtes, remonte les fleuves pour frayer"],
        ["Régime", "Parasite en mer et en estuaire (se fixe sur d'autres poissons) ; jeûne en rivière"],
        ["Reproduction", "Hiver–printemps, nid de galets creusé en eau courante"],
        ["Conservation", "Population en déclin sur les bassins français"],
      ],
    },
  },

  "lamproie-de-planer": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Petite lamproie exclusivement dulçaquicole, qui ne migre jamais en mer. Corps cylindrique gris-brun, adulte non parasite dont l'appareil digestif s'atrophie à la métamorphose. Les deux nageoires dorsales sont contiguës, presque jointives.",
      traits: [
        "Petite taille adulte : 9–19 cm",
        "Deux nageoires dorsales contiguës (se touchant presque)",
        "Disque buccal peu fonctionnel, quelques denticules émoussés seulement",
        "Ne quitte jamais l'eau douce ; passe l'essentiel de sa vie enfouie en larve",
      ],
      conf: [
        {
          n: "Lamproie de rivière",
          how: "Plus grande (30–50 cm), migratrice (descend en mer puis remonte), disque buccal fonctionnel et denté, et les deux dorsales sont nettement séparées par un intervalle — contiguës ici.",
        },
        {
          n: "Anguille européenne",
          how: "L'anguille a de vraies mâchoires et des nageoires pectorales ; la lamproie de Planer n'a qu'une bouche en ventouse, sans pectorales, et reste toujours petite.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Petits cours d'eau à fond meuble (sable, limon) où la larve reste enfouie plusieurs années"],
        ["Régime", "Larve filtreuse (détritus, micro-organismes) ; adulte non parasite, ne s'alimente plus"],
        ["Reproduction", "Mars–avril, sur substrat minéral, puis mort peu après la fraie"],
        ["Conservation", "Inscrite à la Directive Habitats ; populations fragmentées"],
      ],
    },
  },

  // ---------------------------------------------------------------------
  // Esturgeon — protection totale, en danger critique. Identification et
  // consigne de relâche uniquement.
  // ---------------------------------------------------------------------

  "esturgeon-europeen": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Poisson archaïque au squelette en grande partie cartilagineux, sans écailles mais porteur de cinq rangées longitudinales de plaques osseuses (scutelles). Museau pointu en rostre, bouche protractile sous la tête précédée de quatre barbillons.",
      traits: [
        "Cinq rangées de plaques osseuses (scutelles) le long du corps",
        "Museau pointu en rostre, bouche ventrale précédée de 4 barbillons ronds",
        "Peau nue entre les rangées de plaques, jamais couverte d'écailles",
        "Nageoire caudale asymétrique (hétérocerque, lobe supérieur plus long)",
      ],
      conf: [
        {
          n: "Silure glane",
          how: "Le silure a la peau totalement nue et lisse, sans aucune plaque osseuse, et porte 6 barbillons (2 longs sur la mâchoire supérieure, 4 courts sous le menton) contre 4 barbillons ronds pour l'esturgeon. Toute capture ressemblant à un esturgeon doit être relâchée immédiatement quoi qu'il en soit — mais l'identifier correctement permet de signaler la capture, utile au suivi de l'espèce.",
        },
        // La confusion qui compte vraiment. Les esturgeons d'élevage échappés
        // sont aujourd'hui bien plus nombreux dans les eaux françaises que le
        // sturio sauvage, et la distinction se joue sur des comptages de
        // scutelles — hors de portée au bord de l'eau. La consigne est donc la
        // même dans les trois cas, et c'est ce que la fiche doit dire.
        {
          n: "Esturgeon sibérien",
          how: "Espèce d'élevage échappée, aujourd'hui plus fréquente en eau douce que l'esturgeon européen sauvage. La distinction repose sur le nombre d'écussons dorsaux, latéraux et ventraux — une affaire de spécialistes. N'essayez pas de trancher au bord de l'eau : relâchez et déclarez sur sturio.eu.",
        },
        {
          n: "Sterlet",
          how: "Autre esturgeon d'élevage, plus petit, à rostre fin et relevé et à écussons latéraux nombreux et clairs. Là encore, la détermination sûre est affaire de spécialistes : relâchez et déclarez.",
        },
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Anadrome : estuaire de la Gironde et bassin Gironde-Garonne-Dordogne, seule population sauvage française"],
        ["Longévité", "Peut dépasser 100 ans, croissance très lente"],
        ["Reproduction", "Dernière reproduction naturelle constatée en 1994 ; programme de réintroduction en cours depuis 2007"],
        ["Conservation", "En danger critique d'extinction (UICN) — une seule population relictuelle en France"],
      ],
    },
  },

  // ---------------------------------------------------------------------
  // Esturgeons d'élevage échappés — ni protégés, ni distinguables.
  //
  // Ils n'étaient pas au catalogue : un pêcheur qui en prenait un n'avait que
  // la fiche de l'esturgeon européen, qui dit « pêche totalement interdite ».
  // Les ajouter sans traiter la confusion aurait créé le défaut inverse — une
  // fiche « espèce introduite » rassurante sous laquelle se cache peut-être un
  // sturio en danger critique.
  //
  // Ces deux fiches disent donc exactement la même chose que celle du sturio :
  // relâchez, déclarez. C'est le seul message qui reste vrai quelle que soit
  // l'espèce réellement au bout de la ligne.
  // ---------------------------------------------------------------------

  "esturgeon-siberien": {
    ficheSrc:
      "INPN (MNHN) · FishBase · Observatoire des poissons Seine-Normandie · programme LIFE Sturio / MIGADO",
    ident: {
      summary:
        "Esturgeon d'élevage échappé, morphologiquement très proche de l'esturgeon européen : cinq rangées de plaques osseuses, rostre pointu, quatre barbillons sous le museau. Rostre généralement plus court et plus arrondi que celui du sturio, mais le caractère varie avec l'âge.",
      traits: [
        "Cinq rangées de scutelles, peau nue entre les rangées — comme tous les esturgeons",
        "Quatre barbillons frangés en avant de la bouche ventrale",
        "Rostre plutôt court et arrondi chez l'adulte",
        "La détermination sûre passe par le comptage des écussons dorsaux, latéraux et ventraux",
      ],
      conf: [
        {
          n: "Esturgeon européen",
          how: "C'est LA confusion à connaître : le sturio est en danger critique et strictement protégé, l'esturgeon sibérien ne l'est pas. Mais la distinction repose sur des comptages d'écussons qu'on ne fait pas au bord de l'eau. Traitez toute capture comme un esturgeon européen : relâchez-la immédiatement et déclarez-la sur sturio.eu.",
        },
        {
          n: "Sterlet",
          how: "Le sterlet est nettement plus petit, à rostre fin et retroussé, avec des écussons latéraux plus nombreux et clairs. Les deux sont des esturgeons d'élevage échappés : même conduite à tenir.",
        },
      ],
    },
    bio: {
      rows: [
        ["Origine", "Sibérie (bassins de l'Ob à la Kolyma) ; élevé en France depuis 1989 pour le caviar d'Aquitaine"],
        ["Présence en France", "Uniquement par échappées d'élevage — Dordogne, Gironde, Charente-Maritime, et la Garonne après la rupture de digue de 1999"],
        ["Reproduction", "Aucune reproduction naturelle constatée en France à ce jour"],
        ["Conservation", "Non applicable sur la Liste rouge française (espèce introduite) ; en danger critique dans son aire d'origine"],
      ],
    },
  },

  sterlet: {
    ficheSrc: "INPN (MNHN) · FishBase · programme LIFE Sturio / MIGADO",
    ident: {
      summary:
        "Le plus petit des esturgeons européens, au rostre fin, allongé et nettement retroussé vers le haut. Écussons latéraux nombreux (souvent plus de 50) et clairs, tranchant sur le fond sombre du corps. Barbillons frangés.",
      traits: [
        "Rostre fin, long et retroussé — le trait le plus visible du genre",
        "Écussons latéraux nombreux et clairs, bien contrastés",
        "Barbillons frangés (et non lisses)",
        "Taille modeste : le plus petit esturgeon d'Europe",
      ],
      conf: [
        {
          n: "Esturgeon européen",
          how: "Le sturio a un rostre plus large et moins retroussé et des écussons latéraux moins nombreux — mais la détermination sûre se fait par comptage, pas à vue. Le sturio étant strictement protégé et en danger critique, traitez toute capture comme telle : relâchez et déclarez sur sturio.eu.",
        },
        {
          n: "Esturgeon sibérien",
          how: "L'esturgeon sibérien est plus massif, à rostre plus court et arrondi. Tous deux sont des échappés d'élevage : même conduite à tenir.",
        },
      ],
    },
    bio: {
      rows: [
        ["Origine", "Bassins de la mer Noire, de la Caspienne et de la Baltique ; introduit en France par l'aquaculture et des lâchers d'agrément"],
        ["Présence en France", "Sporadique, entièrement dépendante des échappées et des lâchers"],
        ["Reproduction", "Pas de reproduction naturelle établie en France"],
        ["Conservation", "Non applicable sur la Liste rouge française (espèce introduite)"],
      ],
    },
  },

  // ---------------------------------------------------------------------
  // Éperlan et flet — pas de statut particulier, fiche complète.
  // ---------------------------------------------------------------------

  "eperlan": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Petit poisson argenté proche des salmonidés, reconnaissable à sa nageoire adipeuse et à son odeur caractéristique de concombre frais dès la sortie de l'eau. Dos vert olive, flancs argentés à bande brillante.",
      traits: [
        "Nageoire adipeuse présente (comme les salmonidés)",
        "Odeur de concombre frais très marquée",
        "Bouche fendue portant de petites dents visibles, y compris sur la langue",
        "Taille courante 10–20 cm, jusqu'à 30 cm"
      ],
      conf: [
        {
          n: "Ablette",
          how: "L'ablette n'a jamais de nageoire adipeuse (l'éperlan en a une, bien visible entre dorsale et caudale) et ne dégage pas d'odeur de concombre.",
        },
      ],
    },
    fish: {
      rows: [
        ["Techniques", "Ligne fine à plusieurs hameçons (paternoster), touche légère"],
        ["Appâts", "Petits morceaux de ver, asticot, ou mini-leurres métalliques"],
        ["Postes", "Embouchures, estuaires et cours aval des fleuves, en bancs"],
        ["Moment", "Hiver, lors de la remontée vers les frayères"],
      ],
    },
    cook: {
      note: "Chair fine et délicate. Traditionnellement frit entier comme du blanchaille, croustillant, se mange tête et arêtes comprises sur les petits sujets.",
      prep: ["Vider les sujets les plus gros seulement", "Fariner légèrement", "Friture vive, quelques minutes"],
    },
    bio: {
      rows: [
        ["Habitat", "Anadrome : eaux côtières et estuaires, remonte les fleuves pour frayer"],
        ["Régime", "Zooplancton, petits crustacés, larves de poissons"],
        ["Reproduction", "Février–avril, en eau courante peu profonde"],
        ["Répartition", "Limite sud de son aire en France : estuaire de la Gironde ; populations en déclin"],
      ],
    },
  },

  "flet": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Poisson plat amphihalin, les deux yeux le plus souvent du côté droit — mais près d'un tiers des individus les porte à gauche, une particularité rare chez les poissons plats. Peau rugueuse marquée de petits tubercules osseux le long de la ligne latérale et à la base des nageoires dorsale et anale.",
      traits: [
        "Corps aplati, brun-gris tacheté côté yeux, blanc côté aveugle",
        "Tubercules osseux rugueux le long de la ligne latérale (peau lisse chez la plie)",
        "Environ 30 % des individus ont les yeux à gauche, une proportion inhabituelle chez les poissons plats",
        "Taille courante 25–30 cm, jusqu'à 60 cm",
      ],
      conf: [],
    },
    fish: {
      rows: [
        ["Techniques", "Surfcasting léger, pose au fond, dérive"],
        ["Appâts", "Arénicole, gravette (ver de vase), crabe mou"],
        ["Postes", "Embouchures, chenaux d'estuaire, fonds sablo-vaseux"],
        ["Moment", "Marée montante, eau agitée à trouble"],
        ["Réglementation réelle", "Régi par la pêche maritime (maille selon la façade) — pas par le socle eau douce affiché plus haut, que cette application ne couvre pas"],
      ],
    },
    cook: {
      note: "Chair fine et peu épaisse, moins ferme que celle de la plie. Se cuisine entier (meunière) ou en filets, cuisson rapide pour ne pas la dessécher.",
      prep: ["Écailler (peau rugueuse) et vider", "Lever les filets ou cuisiner entier", "Cuisson courte, à feu modéré"],
    },
    bio: {
      rows: [
        ["Habitat", "Euryhalin : côtes, estuaires, remonte loin en eau douce"],
        ["Régime", "Mollusques bivalves, crustacés, vers, petits poissons"],
        ["Reproduction", "Hiver, en mer côtière"],
        ["Répartition", "Très commun sur les côtes d'Europe de l'Ouest, jusqu'en Méditerranée occidentale"],
      ],
    },
  },

  // ---------------------------------------------------------------------
  // Mulets — quatre espèces très proches, pas de statut particulier.
  // Les distinguer se joue sur la lèvre, la paupière adipeuse et les taches.
  // ---------------------------------------------------------------------

  "mulet-cabot": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Le plus massif des mulets, grosse tête arrondie et paupières adipeuses épaisses recouvrant une bonne partie de l'œil. Lèvre supérieure fine, sans papilles.",
      traits: [
        "Paupières adipeuses très développées, couvrant largement l'œil",
        "Tête large et arrondie, museau court",
        "Lèvre supérieure fine, non papilleuse",
        "Taille courante 30–50 cm, peut dépasser 70 cm",
      ],
      conf: [
        {
          n: "Mulet lippu",
          how: "Le mulet lippu a une lèvre supérieure épaisse couverte de plusieurs rangées de papilles (visible au toucher comme à l'œil), et sa paupière adipeuse est bien moins développée que celle du cabot.",
        },
        {
          n: "Mulet doré",
          how: "Le mulet doré porte une tache jaune d'or nette sur le haut de l'opercule, absente chez le cabot, et sa paupière adipeuse est réduite à un simple bourrelet.",
        },
      ],
    },
    fish: {
      rows: [
        ["Techniques", "Coup fin, feeder léger, méfiant — approche discrète"],
        ["Appâts", "Pain amorcé, asticot, petits morceaux de crevette"],
        ["Postes", "Ports, estuaires, embouchures, eaux calmes et peu profondes"],
        ["Moment", "Journée, eau claire, souvent visible en surface"],
      ],
    },
    cook: {
      note: "Chair blanche et ferme, appréciée grillée ou au four. Ses œufs, une fois séchés et salés, donnent la poutargue (boutargue), spécialité méditerranéenne.",
      prep: ["Écailler et vider", "Griller entier ou lever les filets", "Œufs : salage puis séchage pour la poutargue"],
    },
    bio: {
      rows: [
        ["Habitat", "Côtes, estuaires, lagunes ; tolère de très fortes variations de salinité"],
        ["Régime", "Détritus, algues, micro-organismes filtrés dans la vase"],
        ["Reproduction", "Fin d'été–automne, en mer"],
        ["Répartition", "Toutes les côtes françaises, plus abondant en Méditerranée"],
      ],
    },
  },

  "mulet-dore": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Mulet reconnaissable à sa tache jaune d'or nette sur le haut de l'opercule, parfois doublée d'une tache plus diffuse derrière l'œil. Paupière adipeuse réduite à un simple bourrelet.",
      traits: [
        "Tache jaune d'or caractéristique sur le haut de l'opercule",
        "Paupière adipeuse rudimentaire (peu développée)",
        "Pas de tache noire à la base des pectorales",
        "Taille courante 30–45 cm",
      ],
      conf: [
        {
          n: "Mulet porc",
          how: "Le mulet porc n'a pas de tache dorée sur l'opercule mais porte à la place une tache noire nette à la base des pectorales, absente chez le mulet doré.",
        },
        {
          n: "Mulet cabot",
          how: "Le mulet cabot n'a pas de tache dorée et possède des paupières adipeuses épaisses couvrant largement l'œil, bien plus développées que le simple bourrelet du mulet doré.",
        },
      ],
    },
    fish: {
      rows: [
        ["Techniques", "Coup fin, feeder léger, méfiant — approche discrète"],
        ["Appâts", "Pain amorcé, asticot, petits morceaux de crevette"],
        ["Postes", "Ports, estuaires, lagunes, eaux calmes"],
        ["Moment", "Journée, eau claire"],
        ["Réglementation réelle", "Régi par la pêche maritime/estuarienne, comme les autres mulets — pas par le socle eau douce affiché plus haut, que cette application ne couvre pas"],
      ],
    },
    cook: {
      note: "Chair blanche correcte, un peu moins prisée que celle du mulet cabot. Se cuisine grillée ou au four.",
      prep: ["Écailler et vider", "Griller entier ou lever les filets"],
    },
    bio: {
      rows: [
        ["Habitat", "Côtes atlantiques et méditerranéennes, estuaires, lagunes"],
        ["Régime", "Détritus, algues, micro-organismes filtrés dans la vase"],
        ["Reproduction", "Fin d'été–automne, en mer"],
        ["Répartition", "Atlantique (Écosse au Cap-Vert), Méditerranée, mer Noire"],
      ],
    },
  },

  "mulet-lippu": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Mulet à la lèvre supérieure épaisse, couverte de trois à cinq rangées de papilles bien visibles — le trait le plus simple pour le reconnaître. Tête plus pointue que celle du mulet cabot vue de dessus.",
      traits: [
        "Lèvre supérieure épaisse, papilleuse (3 à 5 rangées de papilles)",
        "Tête étroite et pointue vue de dessus",
        "Paupière adipeuse peu développée",
        "Taille courante 30–50 cm",
      ],
      conf: [
        {
          n: "Mulet cabot",
          how: "Le mulet cabot a une lèvre supérieure fine et lisse, sans papilles, et des paupières adipeuses épaisses couvrant largement l'œil — l'inverse du mulet lippu.",
        },
        {
          n: "Mulet doré",
          how: "Le mulet doré a une lèvre fine et porte une tache jaune d'or sur l'opercule, absente chez le mulet lippu.",
        },
      ],
    },
    fish: {
      rows: [
        ["Techniques", "Coup fin, feeder léger, méfiant — approche discrète"],
        ["Appâts", "Pain amorcé, asticot, petits morceaux de crevette"],
        ["Postes", "Ports, digues, estuaires, zones rocheuses peu profondes"],
        ["Moment", "Journée, eau claire"],
        ["Réglementation réelle", "Régi par la pêche maritime/estuarienne, comme les autres mulets — pas par le socle eau douce affiché plus haut, que cette application ne couvre pas"],
      ],
    },
    cook: {
      note: "Chair blanche correcte. Se cuisine grillée, au four ou en filets.",
      prep: ["Écailler et vider", "Griller entier ou lever les filets"],
    },
    bio: {
      rows: [
        ["Habitat", "Côtes rocheuses et sableuses, estuaires, lagunes"],
        ["Régime", "Détritus, algues, micro-organismes filtrés dans la vase"],
        ["Reproduction", "Fin d'été–automne, en mer"],
        ["Répartition", "Toutes les côtes françaises"],
      ],
    },
  },

  "mulet-porc": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Mulet marqué d'une tache noire nette à la base de pectorales courtes et arrondies, sans tache dorée sur l'opercule. Petites écailles couvrant la tête jusque devant les yeux.",
      traits: [
        "Tache noire nette à la base des nageoires pectorales",
        "Pas de tache dorée sur l'opercule",
        "Petites écailles remontant jusque devant les yeux",
        "Taille courante 30–40 cm, jusqu'à 70 cm",
      ],
      conf: [
        {
          n: "Mulet doré",
          how: "Le mulet doré porte une tache jaune d'or sur l'opercule et n'a pas de tache noire à la base des pectorales — l'inverse du mulet porc.",
        },
        {
          n: "Mulet lippu",
          how: "Le mulet lippu a une lèvre supérieure épaisse et papilleuse ; celle du mulet porc est fine et basse, sans papilles.",
        },
      ],
    },
    fish: {
      rows: [
        ["Techniques", "Coup fin, feeder léger, méfiant — approche discrète"],
        ["Appâts", "Pain amorcé, asticot, petits morceaux de crevette"],
        ["Postes", "Estuaires, embouchures, basses rivières, eaux calmes"],
        ["Moment", "Journée, eau claire"],
        ["Réglementation réelle", "Régi par la pêche maritime/estuarienne, comme les autres mulets — pas par le socle eau douce affiché plus haut, que cette application ne couvre pas"],
      ],
    },
    cook: {
      note: "Chair blanche correcte. Se cuisine grillée, au four ou en filets.",
      prep: ["Écailler et vider", "Griller entier ou lever les filets"],
    },
    bio: {
      rows: [
        ["Habitat", "Côtes, estuaires, remonte volontiers loin en eau douce"],
        ["Régime", "Détritus, algues, micro-organismes filtrés dans la vase"],
        ["Reproduction", "Fin d'été–automne, en mer"],
        ["Répartition", "Toutes les côtes françaises et bassins fluviaux associés"],
      ],
    },
  },

  // ---------------------------------------------------------------------
  // Bar commun et mulet sauteur — espèces surtout marines qui remontent
  // volontiers estuaires et basses rivières, comme les mulets et le flet
  // ci-dessus. Le socle « Maille/Quota/Période » du haut de fiche est le
  // socle EAU DOUCE (R436-18/21) : il ne s'applique pas à ces deux espèces,
  // régies par la pêche maritime. C'est pourquoi la vraie règle est explicitée
  // ici en toutes lettres plutôt que dans le socle national — un renvoi vers
  // « reg » n'aurait rien affiché de juste.
  //
  // Le bar est le cas le plus sensible : en régression, ses quotas de pêche de
  // loisir sont revus CHAQUE ANNÉE par règlement européen. Les chiffres
  // ci-dessous sont ceux en vigueur au 26 janvier 2026 (règlement UE 2026/249)
  // — à vérifier avant chaque sortie, comme pour le saumon plus haut.
  // ---------------------------------------------------------------------

  "bar-commun": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Corps allongé argenté, dos gris-bleu, deux nageoires dorsales bien séparées (épineuse puis molle). Une tache sombre plus ou moins visible sur l'opercule ; les jeunes portent des points noirs sur le dos, qui s'estompent avec l'âge.",
      traits: [
        "Deux nageoires dorsales nettement séparées, de taille comparable",
        "Tache sombre variable sur le bord de l'opercule",
        "Dos gris-bleu, flancs et ventre argentés",
        "Jeunes tachetés de noir sur le dos, adultes unis",
      ],
      conf: [],
    },
    fish: {
      rows: [
        ["Techniques", "Leurre (jig, popper, plug de surface), vif, appât naturel (crabe, ver, sardine)"],
        ["Postes", "Estuaires, embouchures, ports, roches battues, surf de plage"],
        ["Moment", "Marée montante à mi-marée, aube et crépuscule"],
        [
          "Réglementation réelle",
          "Régi par la pêche maritime de loisir (taille, quota, périodes selon la façade et révisés chaque année) — pas par le socle eau douce affiché plus haut, que cette application ne couvre pas. Renseignez-vous auprès des textes de pêche maritime en vigueur avant de conserver une capture.",
        ],
      ],
    },
    cook: {
      note: "Chair blanche ferme et délicate, l'un des poissons les plus recherchés des côtes françaises. Attention : au restaurant, « loup » désigne parfois un poisson différent (loup de mer/rascasse selon la région) — le vrai bar reste le meilleur choix.",
      prep: ["Écailler et vider, ou lever les filets", "Cuisson entière au four ou en croûte de sel", "Filets poêlés côté peau pour la croustiller"],
    },
    bio: {
      rows: [
        ["Habitat", "Surtout marin (fonds sableux ou rocheux du littoral), pénètre volontiers en eaux saumâtres, ports et parties terminales des fleuves côtiers"],
        ["Régime", "Invertébrés (crevettes, mollusques) chez le jeune, franchement piscivore à l'âge adulte"],
        ["Reproduction", "Printemps, en mer ; œufs pélagiques"],
        ["Conservation", "En régression sur les stocks du nord (Manche/Atlantique), suivis de près depuis le milieu des années 2010"],
      ],
    },
  },

  "mulet-sauteur": {
    ficheSrc: SRC,
    ident: {
      summary:
        "Mulet des eaux côtières, corps fuselé argenté proche des autres mulets, connu pour ses sauts hors de l'eau qui lui donnent son nom. Se distingue surtout par sa préférence pour les eaux plus au large que ses cousins estuariens.",
      traits: [
        "Corps fuselé, argenté, silhouette typique des mulets",
        "Saute fréquemment hors de l'eau, plus que les autres mulets",
        "Taille courante 30 cm, jusqu'à 40 cm",
        "Bouche sans papilles ni paupière adipeuse marquée",
      ],
      conf: [
        {
          n: "Mulet cabot",
          how: "Le mulet cabot a une grosse tête arrondie et des paupières adipeuses épaisses ; le mulet sauteur a une tête plus fine et des paupières peu développées.",
        },
      ],
    },
    fish: {
      rows: [
        ["Techniques", "Coup fin, feeder léger, amorçage discret"],
        ["Postes", "Eaux côtières, parfois lagunes et estuaires"],
        ["Réglementation réelle", "Régi par la pêche maritime/estuarienne, comme les autres mulets — pas par le socle eau douce affiché plus haut"],
      ],
    },
    cook: {
      note: "Chair blanche correcte, comme les autres mulets, moins recherchée que celle du mulet cabot.",
      prep: ["Écailler et vider", "Griller entier ou lever les filets"],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux côtières, plus au large que les autres mulets ; pénètre parfois lagunes et estuaires"],
        ["Régime", "Zooplancton puis organismes benthiques chez le jeune ; algues et détritus végétaux chez l'adulte"],
        ["Reproduction", "Été, en mer ; œufs pélagiques"],
        ["Répartition", "Méditerranée, mer Noire, mer d'Azov, côtes atlantiques du Maroc à la France"],
      ],
    },
  },

  // ---------------------------------------------------------------------
  // Saumon rose — le seul migrateur du catalogue dont la consigne est de
  // GARDER la capture plutôt que de la relâcher. Introduit massivement en
  // Russie pour la pêche commerciale, il colonise l'Atlantique depuis et
  // apparaît de façon récurrente dans les rivières françaises depuis 2017.
  // Le conserver et le signaler (échantillon d'écailles, tête pour analyse
  // otolithique) sert le suivi de sa colonisation — le relâcher reviendrait
  // à l'aider à s'implanter, contrairement à un migrateur menacé qu'on
  // protège en le remettant à l'eau.
  // ---------------------------------------------------------------------

  "saumon-rose": {
    ficheSrc:
      "CDR-EEE (Centre de ressources espèces exotiques envahissantes) · INRAE · Observatoire des poissons migrateurs de Bretagne",
    ident: {
      summary:
        "Petit saumon du Pacifique, corps fusiforme argenté en mer, le mâle développant en rivière une bosse dorsale prononcée et une mâchoire crochue. Nageoire caudale marquée de grandes taches ovales, contrairement au saumon atlantique.",
      traits: [
        "Grandes taches ovales sur toute la nageoire caudale (absentes ou réduites chez le saumon atlantique)",
        "Le mâle reproducteur développe une bosse dorsale marquée et une mâchoire crochue",
        "Très petites écailles comparé au saumon atlantique",
        "Cycle de vie court : 2 ans seulement, contre plusieurs années pour le saumon atlantique",
      ],
      conf: [
        {
          n: "Saumon atlantique",
          how: "Le saumon rose a de grandes taches ovales sur toute la caudale et des écailles bien plus petites ; le saumon atlantique n'a pas ces taches et le mâle ne développe pas de bosse dorsale aussi marquée.",
        },
      ],
    },
    fish: {
      rows: [
        ["Prise", "Capture accessoire en pêchant le saumon ou la truite de mer, en rivière lors de la remontée (fin d'été)"],
        [
          "Conduite à tenir",
          "À l'inverse des autres migrateurs de cette fiche : gardez la capture plutôt que de la relâcher — c'est la recommandation officielle par précaution, pour freiner son implantation",
        ],
        [
          "Signalement",
          "Notez date, lieu, longueur et poids ; prélevez une trentaine d'écailles 2-3 cm au-dessus de la ligne latérale ; conservez la tête au congélateur pour analyse des otolithes. Déclarez via un formulaire de déclaration truite de mer du CNICS en précisant « saumon rose »",
        ],
      ],
    },
    bio: {
      rows: [
        ["Habitat d'origine", "Pacifique Nord ; cycle de vie le plus court des saumons du Pacifique (2 ans)"],
        ["Introduction", "Introduit massivement en Russie dès les années 1950 pour la pêche commerciale ; colonise l'Atlantique depuis"],
        ["Présence en France", "Premier signalement en 2017 (Canche, Pas-de-Calais) ; récidive en 2017, 2021 et 2023 en Normandie, Bretagne et dans le Nord"],
        ["Conservation", "Non applicable (UICN NA) — espèce introduite, en cours de colonisation surveillée"],
      ],
    },
  },
};
