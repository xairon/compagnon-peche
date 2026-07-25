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
};
