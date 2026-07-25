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
};
