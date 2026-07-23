import type { Species } from "../types";
import { BASE_SPECIES } from "./species-base";

// Shared health messages. Wording is taken from the ANSES fact sheet
// "Poissons, conseils de consommation" — not paraphrased into a stronger claim.
const ANSES_GEN =
  "Espèce fortement bioaccumulatrice (PCB, dioxines, méthylmercure). Recommandation ANSES : 2 fois par mois maximum, en variant espèces et lieux de pêche.";
const ANSES_SENS =
  "Publics sensibles (femmes en âge de procréer, enceintes ou allaitantes, enfants de moins de 3 ans, adolescentes) : 1 fois tous les 2 mois maximum.";
const POLLU_LOC =
  "Indépendamment de l'espèce : certains cours d'eau sont sous arrêté préfectoral d'interdiction de consommation (PCB). Vérifiez localement — dernière vérification des données : juillet 2026.";

const CURATED: Species[] = [
  {
    id: "sandre",
    name: "Sandre",
    latin: "Sander lucioperca",
    group: "carnassiers",
    rating: "Excellent",
    ratingCls: "good",
    maille: "40 cm",
    mailleSub: "national",
    quota: "3 / jour",
    quotaSub: "carnassiers cumulés",
    season: "toujours",
    ident: {
      summary:
        "Corps fusiforme gris-vert barré de sombre, deux nageoires dorsales distinctes, dents « canines » caractéristiques. Œil vitreux.",
      traits: [
        "2 nageoires dorsales séparées",
        "Dents canines visibles",
        "Flancs gris-vert barrés",
        "Taille typique 40–70 cm",
      ],
      conf: [
        {
          n: "Perche",
          how: "La perche est plus trapue, nageoires ventrales orangées, bandes verticales plus nettes ; pas de canines.",
        },
        {
          n: "Brochet",
          how: "Le brochet a un museau en bec de canard et une seule dorsale, très reculée.",
        },
      ],
    },
    reg: {
      rows: [
        ["Maille", "40 cm (2ᵉ cat., national)"],
        ["Quota", "3 carnassiers/jour dont 2 brochets max"],
        ["Période", "2ᵉ cat. : ouverte toute l'année"],
        ["Horaires", "½ h avant lever → ½ h après coucher"],
      ],
      note: null,
      src: "Legifrance R436-18 · R436-21 · F2117",
    },
    fish: {
      rows: [
        ["Techniques", "Leurre souple, vif, drop shot"],
        ["Leurres", "Shads 7–12 cm, finesse, teintes naturelles"],
        ["Postes", "Cassures, bois noyé, piles de pont, fonds durs"],
        ["Profondeur", "2–6 m"],
        ["Moment", "Aube et crépuscule, eau teintée"],
      ],
    },
    cook: {
      note: "Chair blanche, fine, très peu d'arêtes — l'un des meilleurs poissons d'eau douce.",
      prep: [
        "Écailler (ou lever les filets peau sur table)",
        "Vider par incision ventrale",
        "Lever les filets le long de l'arête centrale",
      ],
    },
    sante: {
      paras: [
        "Non bioaccumulateur : consommation normale (repère ANSES : 2 portions de poisson par semaine, en variant).",
        POLLU_LOC,
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Grands cours d'eau lents, plans d'eau, eau teintée"],
        ["Régime", "Piscivore (ablettes, gardons)"],
        ["Reproduction", "Avril–mai, nid gardé par le mâle"],
        ["Records", "Jusqu'à 100 cm · ~12 kg"],
      ],
    },
  },
  {
    id: "brochet",
    name: "Brochet",
    latin: "Esox lucius",
    group: "carnassiers",
    rating: "Excellent",
    ratingCls: "good",
    maille: "50 cm",
    mailleSub: "nat. — 41 : à vérifier",
    quota: "2 / jour",
    quotaSub: "max. dans les 3 carnassiers",
    season: "brochet",
    ident: {
      summary:
        "Corps très allongé, museau aplati « en bec de canard », dorsale unique très reculée près de la queue. Robe verte marbrée de clair.",
      traits: [
        "Museau en bec de canard",
        "Dorsale unique, très reculée",
        "Robe verte marbrée",
        "500+ dents orientées vers l'arrière",
      ],
      conf: [
        {
          n: "Sandre",
          how: "Le sandre a deux dorsales et un museau pointu, jamais aplati.",
        },
      ],
    },
    reg: {
      rows: [
        ["Maille", "50 cm (national, R436-18)"],
        [
          "Maille 41",
          "Arrêté préfectoral 2026 : à vérifier — certains départements relèvent à 60 cm",
        ],
        ["Quota", "2 brochets max/jour (dans les 3 carnassiers)"],
        [
          "Période",
          "Fermé sauf : 1ᵉʳ janv. → dernier dim. de janv., puis dernier sam. d'avril → 31 déc.",
        ],
      ],
      note: "Valeur départementale non vérifiée : faites foi à l'arrêté 41 en vigueur (peche41.fr).",
      src: "Legifrance R436-18 · R436-21 · F2117",
    },
    fish: {
      rows: [
        ["Techniques", "Leurre (jerkbait, spinnerbait, swimbait), vif, mouche"],
        ["Leurres", "Cuillers n°3–5, jerkbaits 10–15 cm"],
        ["Postes", "Herbiers, bordures, arbres immergés, hauts-fonds"],
        ["Profondeur", "0,5–4 m"],
        ["Moment", "Journée en hiver, matin/soir en été"],
      ],
    },
    cook: {
      note: "Chair fine et réputée, mais arêtes en Y intramusculaires : préférer les gros sujets, ou la chair mixée (quenelles).",
      prep: [
        "Écailler soigneusement",
        "Vider, rincer l'abdomen",
        "Lever les filets puis retirer les arêtes en Y à la pince, ou mixer la chair",
      ],
    },
    sante: {
      paras: [
        "Non listé bioaccumulateur par l'ANSES : consommation normale (2 portions de poisson/semaine, variées).",
        POLLU_LOC,
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Herbiers, bras morts, rivières lentes et plans d'eau"],
        ["Régime", "Piscivore opportuniste, chasse à l'affût"],
        ["Reproduction", "Février–avril, prairies inondées"],
        ["Records", "Jusqu'à 130 cm · ~20 kg"],
      ],
    },
  },
  {
    id: "silure",
    name: "Silure glane",
    latin: "Silurus glanis",
    group: "carnassiers",
    rating: "Bon",
    ratingCls: "good",
    maille: "—",
    mailleSub: "voir arrêté",
    quota: "—",
    quotaSub: "pas de quota national",
    season: "toujours",
    alert: {
      title: "Consommation limitée",
      text: "Bioaccumulateur : ANSES 2×/mois max (publics sensibles : 1×/2 mois).",
    },
    ident: {
      summary:
        "Corps allongé sans écailles, tête énorme et aplatie, 6 barbillons (2 très longs). Longue nageoire anale, dorsale minuscule.",
      traits: [
        "6 barbillons dont 2 très longs",
        "Peau nue, sans écailles",
        "Anale très longue, dorsale minuscule",
        "Peut dépasser 2 m",
      ],
      conf: [
        {
          n: "Poisson-chat",
          how: "Le poisson-chat est petit (< 30 cm), possède 8 barbillons et une nageoire adipeuse ; le silure n'en a pas.",
        },
      ],
    },
    reg: {
      rows: [
        ["Maille", "Pas de taille légale nationale — voir arrêté local"],
        ["Quota", "Aucun quota national"],
        ["Période", "2ᵉ cat. : ouverte toute l'année"],
        ["Horaires", "½ h avant lever → ½ h après coucher"],
      ],
      note: null,
      src: "Legifrance R436-18 · F2117",
    },
    fish: {
      rows: [
        ["Techniques", "Vertical, clonk, gros leurres, pêche au vif"],
        ["Leurres", "Gros shads 15–25 cm, vers, bouquets de vers"],
        ["Postes", "Fosses, confluences, sous les bordures creuses"],
        ["Profondeur", "3–15 m"],
        ["Moment", "Crépuscule et nuit, crues"],
      ],
    },
    cook: {
      note: "Chair blanche ferme, sans arêtes intramusculaires. Bonne sur les sujets < 1,2 m ; dépouiller (peau épaisse), retirer le gras brun.",
      prep: [
        "Dépouiller (inciser derrière la tête, tirer la peau à la pince)",
        "Vider, retirer soigneusement le gras brun sous-cutané",
        "Lever les longes, portionner",
      ],
    },
    sante: {
      paras: [ANSES_GEN, ANSES_SENS, POLLU_LOC],
      alert: true,
    },
    bio: {
      rows: [
        ["Habitat", "Fosses des grands fleuves et rivières, plans d'eau"],
        ["Régime", "Opportuniste : poissons, écrevisses, oiseaux"],
        ["Reproduction", "Mai–juin, nid gardé"],
        ["Records", "Jusqu'à 270 cm · plus de 100 kg"],
      ],
    },
  },
  {
    id: "perche-soleil",
    name: "Perche soleil",
    latin: "Lepomis gibbosus",
    group: "autres",
    rating: "Médiocre",
    ratingCls: "warn",
    maille: "—",
    mailleSub: "sans objet",
    quota: "—",
    quotaSub: "sans objet",
    season: "invasive-year",
    invasive: true,
    alert: {
      title: "Remise à l'eau vivante interdite",
      text: "Espèce susceptible de provoquer des déséquilibres biologiques (art. R432-5). Toute capture doit être mise à mort.",
    },
    ident: {
      summary:
        "Petit poisson très trapu et coloré : flancs bleu-orangé irisés, tache noire bordée de rouge à l'opercule. Rarement plus de 15 cm.",
      traits: [
        "Robe irisée bleu et orange",
        "Tache operculaire noire et rouge",
        "Corps très haut, comprimé",
        "10–15 cm en général",
      ],
      conf: [
        {
          n: "Perche",
          how: "La perche commune est rayée verticalement, sans irisations bleues, et bien plus grande.",
        },
      ],
    },
    reg: {
      rows: [
        ["Statut", "Susceptible de provoquer des déséquilibres biologiques (R432-5)"],
        ["Obligation", "Interdit de la remettre vivante à l'eau ou de la transporter vivante"],
        ["Maille / quota", "Sans objet"],
      ],
      note: null,
      src: "Legifrance R432-5",
    },
    fish: {
      rows: [
        ["Techniques", "Pêche au coup, petits leurres (micro-cuillers)"],
        ["Appâts", "Vers, asticots"],
        ["Postes", "Bordures calmes, pontons, herbiers"],
        ["Moment", "Journée, eaux réchauffées"],
      ],
    },
    cook: {
      note: "Comestible mais petite et pleine d'arêtes : intérêt culinaire limité — en friture, comme l'éperlan.",
      prep: ["Écailler, vider, étêter", "Rincer et sécher"],
    },
    sante: {
      paras: ["Non bioaccumulateur. Consommation normale.", POLLU_LOC],
    },
    bio: {
      rows: [
        ["Origine", "Amérique du Nord, introduite au XIXᵉ siècle"],
        ["Habitat", "Eaux calmes et chaudes"],
        ["Régime", "Invertébrés, œufs et alevins — d'où son impact"],
        ["Taille", "10–15 cm, rarement plus"],
      ],
    },
  },
  {
    id: "perche",
    name: "Perche",
    latin: "Perca fluviatilis",
    group: "carnassiers",
    rating: "Excellent",
    ratingCls: "good",
    maille: "—",
    mailleSub: "voir arrêté",
    quota: "—",
    quotaSub: "hors quota carnassiers",
    season: "toujours",
    ident: {
      summary:
        "Corps trapu et bossu, 5 à 8 bandes verticales sombres, nageoires ventrales et anale rouge-orangé. Première dorsale épineuse.",
      traits: [
        "Bandes verticales sombres",
        "Nageoires ventrales orangées",
        "Première dorsale épineuse",
        "15–35 cm en général",
      ],
      conf: [
        {
          n: "Sandre",
          how: "Le sandre est plus élancé, gris, avec des canines ; la perche est bossue et orangée.",
        },
        {
          n: "Grémille",
          how: "La grémille est plus petite, sans bandes nettes, dorsales soudées.",
        },
      ],
    },
    reg: {
      rows: [
        ["Maille", "Pas de taille légale nationale — voir arrêté local"],
        ["Quota", "Hors quota carnassiers (R436-21)"],
        ["Période", "2ᵉ cat. : ouverte toute l'année"],
      ],
      note: null,
      src: "Legifrance R436-18 · R436-21",
    },
    sante: {
      paras: ["Non bioaccumulateur. Consommation normale.", POLLU_LOC],
    },
  },
  {
    id: "truite-fario",
    name: "Truite fario",
    latin: "Salmo trutta",
    group: "salmonides",
    rating: "Excellent",
    ratingCls: "good",
    maille: "23 cm",
    mailleSub: "national",
    quota: "—",
    quotaSub: "souvent 6–10/j : voir arrêté",
    season: "cat1",
    ident: {
      summary:
        "Corps fusiforme, robe brune ponctuée de points noirs et rouges auréolés de clair. Nageoire adipeuse (marque des salmonidés).",
      traits: [
        "Points rouges et noirs auréolés",
        "Nageoire adipeuse présente",
        "Queue peu échancrée",
        "20–40 cm en rivière",
      ],
      conf: [
        {
          n: "Truite arc-en-ciel",
          how: "L'arc-en-ciel porte une bande rosée latérale et des points noirs jusque sur la queue ; jamais de points rouges.",
        },
      ],
    },
    reg: {
      rows: [
        ["Maille", "23 cm (national — souvent 25 cm par arrêté local)"],
        ["Quota", "Fixé par arrêté départemental (souvent 6–10/jour)"],
        ["Période", "1ʳᵉ cat. : 2ᵉ sam. de mars → 3ᵉ dim. de septembre"],
      ],
      note: "Maille et quota souvent relevés localement : vérifiez l'arrêté de votre département.",
      src: "Legifrance R436-18 · F2117",
    },
    sante: {
      paras: ["Non bioaccumulateur. Consommation normale.", POLLU_LOC],
    },
  },
  {
    id: "carpe",
    name: "Carpe commune",
    latin: "Cyprinus carpio",
    group: "cyprinides",
    rating: "Médiocre",
    ratingCls: "warn",
    maille: "—",
    mailleSub: "voir arrêté",
    quota: "—",
    quotaSub: "no-kill fréquent",
    season: "toujours",
    alert: {
      title: "Consommation limitée",
      text: "Bioaccumulateur : ANSES 2×/mois max (publics sensibles : 1×/2 mois).",
    },
    ident: {
      summary:
        "Corps massif et haut, grandes écailles régulières, 4 barbillons (2 courts, 2 longs), longue dorsale. Variantes miroir (écailles éparses) et cuir.",
      traits: [
        "4 barbillons",
        "Longue nageoire dorsale",
        "Grandes écailles (ou miroir/cuir)",
        "Souvent 3–15 kg",
      ],
      conf: [{ n: "Carassin", how: "Le carassin n'a aucun barbillon." }],
    },
    reg: {
      rows: [
        ["Maille", "Pas de taille légale nationale"],
        ["Spécificité", "Remise à l'eau quasi systématique en pêche moderne (no-kill)"],
        [
          "Période",
          "2ᵉ cat. : ouverte toute l'année ; pêche de nuit sur parcours autorisés",
        ],
      ],
      note: null,
      src: "Legifrance R436-18",
    },
    sante: {
      paras: [ANSES_GEN, ANSES_SENS, POLLU_LOC],
      alert: true,
    },
  },
  {
    id: "gardon",
    name: "Gardon",
    latin: "Rutilus rutilus",
    group: "cyprinides",
    rating: "Médiocre",
    ratingCls: "warn",
    maille: "—",
    mailleSub: "sans objet",
    quota: "—",
    quotaSub: "sans objet",
    season: "toujours",
    ident: {
      summary:
        "Poisson argenté élancé, œil rouge-orangé, nageoires rougeâtres. L'espèce reine de la pêche au coup.",
      traits: [
        "Œil rouge-orangé",
        "Flancs argentés",
        "Dorsale à l'aplomb des ventrales",
        "10–25 cm",
      ],
      conf: [
        {
          n: "Rotengle",
          how: "Le rotengle a l'œil doré, la bouche orientée vers le haut et la dorsale nettement en retrait des ventrales.",
        },
      ],
    },
    reg: {
      rows: [
        ["Maille / quota", "Sans objet au national"],
        ["Période", "2ᵉ cat. : ouverte toute l'année"],
      ],
      note: null,
      src: "Legifrance R436-18",
    },
    sante: {
      paras: [
        "Non bioaccumulateur. Chair correcte mais très riche en arêtes en Y — friture ou farce.",
        POLLU_LOC,
      ],
    },
  },
  {
    id: "barbeau",
    name: "Barbeau fluviatile",
    latin: "Barbus barbus",
    group: "cyprinides",
    rating: "Déconseillé",
    ratingCls: "bad",
    maille: "—",
    mailleSub: "voir arrêté",
    quota: "—",
    quotaSub: "sans objet",
    season: "toujours",
    alert: {
      title: "Consommation limitée",
      text: "Bioaccumulateur : ANSES 2×/mois max (publics sensibles : 1×/2 mois). Œufs toxiques.",
    },
    ident: {
      summary:
        "Corps allongé au ventre plat, museau charnu orienté vers le bas, 4 barbillons. Poisson de courant, sur le fond.",
      traits: [
        "4 barbillons",
        "Bouche infère (vers le bas)",
        "Corps cuivré, ventre plat",
        "30–70 cm",
      ],
      conf: [
        { n: "Carpe", how: "La carpe est bien plus haute de corps, avec une longue dorsale." },
      ],
    },
    reg: {
      rows: [
        ["Maille / quota", "Pas de valeur nationale"],
        ["Période", "2ᵉ cat. : ouverte toute l'année"],
      ],
      note: null,
      src: "Legifrance R436-18",
    },
    sante: {
      paras: [
        ANSES_GEN,
        ANSES_SENS,
        "Attention : les œufs de barbeau sont toxiques (troubles digestifs) — ne jamais les consommer.",
        POLLU_LOC,
      ],
      alert: true,
    },
  },
  {
    id: "poisson-chat",
    name: "Poisson-chat",
    latin: "Ameiurus melas",
    group: "autres",
    rating: "Médiocre",
    ratingCls: "warn",
    maille: "—",
    mailleSub: "sans objet",
    quota: "—",
    quotaSub: "sans objet",
    season: "invasive-year",
    invasive: true,
    alert: {
      title: "Remise à l'eau vivante interdite",
      text: "Espèce susceptible de provoquer des déséquilibres biologiques (art. R432-5). Toute capture doit être mise à mort.",
    },
    ident: {
      summary:
        "Petit poisson brun-noir sans écailles, tête large, 8 barbillons, nageoire adipeuse. Épines pectorales piquantes — attention aux doigts.",
      traits: [
        "8 barbillons",
        "Nageoire adipeuse",
        "Peau nue brun-noir",
        "15–30 cm ; épines piquantes",
      ],
      conf: [
        {
          n: "Silure",
          how: "Le silure a 6 barbillons, pas d'adipeuse, et devient géant ; le poisson-chat reste petit.",
        },
      ],
    },
    reg: {
      rows: [
        ["Statut", "Susceptible de provoquer des déséquilibres biologiques (R432-5)"],
        ["Obligation", "Interdit de le remettre vivant à l'eau ou de le transporter vivant"],
        ["Maille / quota", "Sans objet"],
      ],
      note: null,
      src: "Legifrance R432-5",
    },
    sante: {
      paras: [
        "Non bioaccumulateur. Chair correcte en friture ; manipulez avec précaution (épines).",
        POLLU_LOC,
      ],
    },
  },
  {
    id: "black-bass",
    name: "Black-bass",
    latin: "Micropterus salmoides",
    group: "carnassiers",
    rating: "Bon",
    ratingCls: "good",
    maille: "30 cm",
    mailleSub: "national",
    quota: "3 / jour",
    quotaSub: "carnassiers cumulés",
    season: "toujours",
    ident: {
      summary:
        "Corps trapu vert bronze, large bouche fendue dépassant l'œil, bande latérale sombre irrégulière.",
      traits: [
        "Très grande bouche",
        "Bande latérale sombre",
        "Robe vert bronze",
        "25–45 cm",
      ],
      conf: [
        {
          n: "Perche",
          how: "La perche a des bandes verticales et des nageoires orangées ; le bass a une bande horizontale.",
        },
      ],
    },
    reg: {
      rows: [
        ["Maille", "30 cm (national, R436-18)"],
        ["Quota", "Compte dans les 3 carnassiers/jour"],
        [
          "Spécificité",
          "No-kill ou fenêtres de capture sur de nombreux parcours — voir arrêté",
        ],
      ],
      note: "Protections locales fréquentes (no-kill) : vérifiez l'arrêté départemental.",
      src: "Legifrance R436-18 · R436-21",
    },
    sante: {
      paras: ["Non bioaccumulateur. Consommation normale.", POLLU_LOC],
    },
  },

  // ── Extension v1.1 — poissons blancs, salmonidés, migrateur ──────────────────
  // Données sourcées (Legifrance R436-18/21, R432-5, ANSES, FishBase/INPN).
  // La plupart des cyprinidés n'ont ni maille ni quota national : « — » + note locale.
  {
    id: "breme",
    name: "Brème commune",
    latin: "Abramis brama",
    group: "cyprinides",
    rating: "Médiocre",
    ratingCls: "warn",
    maille: "—",
    mailleSub: "pas de maille nationale",
    quota: "—",
    quotaSub: "—",
    season: "toujours",
    ident: {
      summary:
        "Corps très haut et fortement comprimé, petite tête, bouche protractile tournée vers le bas ; dos gris-olive à reflets verts, flancs argentés à dorés.",
      traits: [
        "Corps très haut et aplati (le plus « plat » des cyprinidés communs)",
        "Bouche protractile orientée vers le bas (fouisseur)",
        "Longue nageoire anale",
        "Aucun barbillon",
      ],
      conf: [
        { n: "Brème bordelière", how: "La bordelière a l'œil plus grand, des nageoires teintées de rouge et une anale plus courte." },
        { n: "Gardon", how: "Le gardon est bien moins haut, avec l'œil rouge et des nageoires rougeâtres." },
      ],
    },
    reg: {
      rows: [
        ["Maille", "Aucune taille légale nationale"],
        ["Quota", "Aucun quota national"],
        ["Catégorie", "2ᵉ catégorie (eaux calmes)"],
        ["Période", "Ouverte toute l'année"],
        ["Horaires", "½ h avant lever → ½ h après coucher"],
      ],
      note: "Un arrêté préfectoral peut fixer une taille ou des restrictions locales : vérifiez le règlement de l'AAPPMA.",
      src: "Legifrance R436-18 · R436-21",
    },
    fish: {
      rows: [
        ["Techniques", "Pêche au coup et au feeder, avec amorçage"],
        ["Appâts", "Asticot, ver, pain, graines, pellets"],
        ["Postes", "Fonds vaseux, eaux lentes et calmes, en banc"],
      ],
    },
    sante: { paras: [ANSES_GEN, ANSES_SENS, POLLU_LOC], alert: true },
    bio: {
      rows: [
        ["Habitat", "Eaux calmes : étangs, lacs, canaux, rivières lentes de plaine"],
        ["Taille", "Adulte 30–50 cm couramment"],
        ["Reproduction", "Frai d'avril à juillet sur fonds durs et végétation"],
        ["Régime", "Benthivore : invertébrés et larves fouillés dans le sédiment"],
      ],
    },
  },
  {
    id: "tanche",
    name: "Tanche",
    latin: "Tinca tinca",
    group: "cyprinides",
    rating: "Bon",
    ratingCls: "good",
    maille: "—",
    mailleSub: "pas de maille nationale",
    quota: "—",
    quotaSub: "—",
    season: "toujours",
    ident: {
      summary:
        "Corps trapu et épais, peau très visqueuse à minuscules écailles, couleur vert-olive à reflets dorés, petit œil rouge-orangé ; une paire de petits barbillons aux commissures.",
      traits: [
        "Peau épaisse couverte d'un mucus abondant",
        "Écailles minuscules, corps vert sombre à doré",
        "Petit œil rouge-orangé",
        "1 barbillon à chaque commissure (1 paire)",
      ],
      conf: [
        { n: "Peu de confusion", how: "Silhouette trapue, mucus et couleur olive très caractéristiques ; guère confondable." },
      ],
    },
    reg: {
      rows: [
        ["Maille", "Aucune taille légale nationale"],
        ["Quota", "Aucun quota national"],
        ["Catégorie", "2ᵉ catégorie (eaux calmes)"],
        ["Période", "Ouverte toute l'année"],
        ["Horaires", "½ h avant lever → ½ h après coucher"],
      ],
      note: "Certains départements imposent historiquement une taille ou une période pour la tanche : vérifiez le règlement local.",
      src: "Legifrance R436-18 · R436-21",
    },
    fish: {
      rows: [
        ["Techniques", "Pêche au coup / à l'anglaise près du fond"],
        ["Appâts", "Ver, asticot, maïs, pain"],
        ["Postes", "Bordures encombrées, herbiers, fonds vaseux peu profonds"],
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux calmes à fond vaseux et végétation dense"],
        ["Taille", "Couramment < 50 cm (max ~70 cm)"],
        ["Reproduction", "Frai de mai à juillet en eau calme peu profonde"],
        ["Régime", "Omnivore : invertébrés et larves du fond"],
      ],
    },
  },
  {
    id: "ablette",
    name: "Ablette",
    latin: "Alburnus alburnus",
    group: "cyprinides",
    rating: "Bon",
    ratingCls: "good",
    maille: "—",
    mailleSub: "pas de maille nationale",
    quota: "—",
    quotaSub: "—",
    season: "toujours",
    ident: {
      summary:
        "Petit poisson élancé et comprimé, dos verdâtre et flancs très argentés ; écailles peu adhérentes, bouche orientée vers le haut (poisson de surface).",
      traits: [
        "Petite taille, corps fin et effilé très argenté",
        "Bouche orientée vers le haut (surface)",
        "Écailles brillantes se détachant facilement",
        "Vit en bancs denses près de la surface",
      ],
      conf: [
        { n: "Alevins de gardon", how: "L'ablette reste élancée, en surface, bouche supère et corps très mince." },
      ],
    },
    reg: {
      rows: [
        ["Maille", "Aucune taille légale nationale"],
        ["Quota", "Aucun quota national"],
        ["Catégorie", "2ᵉ catégorie (eaux calmes)"],
        ["Période", "Ouverte toute l'année"],
        ["Horaires", "½ h avant lever → ½ h après coucher"],
      ],
      note: null,
      src: "Legifrance R436-18 · R436-21",
    },
    fish: {
      rows: [
        ["Techniques", "Pêche au coup fine, en surface / entre deux eaux"],
        ["Appâts", "Asticot, pinkie, petite amorce"],
        ["Usage", "Très prisée comme vif pour les carnassiers"],
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Cours d'eau lents et lacs, en bancs"],
        ["Taille", "Petite espèce, 12–20 cm"],
        ["Reproduction", "Frai au printemps / début d'été"],
        ["Régime", "Zooplancton et insectes happés en surface"],
      ],
    },
  },
  {
    id: "chevesne",
    name: "Chevesne",
    latin: "Squalius cephalus",
    group: "cyprinides",
    rating: "Médiocre",
    ratingCls: "warn",
    maille: "—",
    mailleSub: "pas de maille nationale",
    quota: "—",
    quotaSub: "—",
    season: "toujours",
    ident: {
      summary:
        "Corps cylindrique, grosse tête, large bouche terminale sans barbillon ; grandes écailles cerclées de sombre, nageoires anale et pelviennes teintées d'orange ; bord de l'anale nettement convexe.",
      traits: [
        "Corps massif et cylindrique, grosse tête",
        "Large bouche terminale, sans barbillon",
        "Grandes écailles cerclées de sombre",
        "Bord de la nageoire anale convexe (critère clé)",
      ],
      conf: [
        { n: "Vandoise", how: "La vandoise a une petite bouche infère et l'anale concave ; le chevesne a une grosse bouche terminale et l'anale convexe." },
      ],
    },
    reg: {
      rows: [
        ["Maille", "Aucune taille légale nationale"],
        ["Quota", "Aucun quota national"],
        ["Catégorie", "1ʳᵉ ou 2ᵉ catégorie selon le cours d'eau"],
        ["Période", "2ᵉ cat. : toute l'année ; 1ʳᵉ cat. : période salmonidés"],
        ["Horaires", "½ h avant lever → ½ h après coucher"],
      ],
      note: "Le chevesne occupe aussi des cours d'eau de 1ʳᵉ catégorie : la période d'ouverture y suit le règlement 1ʳᵉ catégorie.",
      src: "Legifrance R436-18 · R436-21",
    },
    fish: {
      rows: [
        ["Techniques", "Pêche à vue, au toc, aux leurres, en surface"],
        ["Appâts", "Insectes, fruits, pain, petits leurres"],
        ["Comportement", "Très méfiant, omnivore opportuniste"],
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Très ubiquiste, de la zone à truite aux estuaires ; tolère les eaux médiocres"],
        ["Taille", "Couramment 30–50 cm (max ~65 cm)"],
        ["Reproduction", "Ponte en pleine eau au printemps"],
        ["Régime", "Très omnivore : insectes, fruits tombés, petits poissons, écrevisses"],
      ],
    },
  },
  {
    id: "hotu",
    name: "Hotu",
    latin: "Chondrostoma nasus",
    group: "cyprinides",
    rating: "Médiocre",
    ratingCls: "warn",
    maille: "—",
    mailleSub: "pas de maille nationale",
    quota: "—",
    quotaSub: "—",
    season: "toujours",
    ident: {
      summary:
        "Corps fusiforme argenté au museau charnu proéminent ; bouche infère à lèvre cornée noire, adaptée au broutage des algues sur les cailloux.",
      traits: [
        "Museau proéminent surplombant une bouche infère",
        "Lèvre inférieure tranchante et cornée (raclage du substrat)",
        "Corps fuselé argenté, nageoires souvent rougeâtres",
        "Aucun barbillon",
      ],
      conf: [
        { n: "Vandoise", how: "La bouche infère à lèvre cornée et le museau saillant sont propres au hotu." },
      ],
    },
    reg: {
      rows: [
        ["Maille", "Aucune taille légale nationale"],
        ["Quota", "Aucun quota national"],
        ["Catégorie", "Souvent 2ᵉ catégorie (zone à barbeau)"],
        ["Période", "Ouverte toute l'année en 2ᵉ catégorie"],
        ["Horaires", "½ h avant lever → ½ h après coucher"],
      ],
      note: "Espèce d'eau courante d'intérêt patrimonial dans certains bassins : vérifiez d'éventuelles restrictions locales.",
      src: "Legifrance R436-18 · R436-21",
    },
    fish: {
      rows: [
        ["Techniques", "Pêche au coup fine en eau courante, plombée près du fond"],
        ["Appâts", "Asticot, pâte, petits vers"],
        ["Postes", "Radiers et courants sur graviers et galets"],
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Rivières courantes à fond graveleux, en dessous de 800 m"],
        ["Taille", "Dépasse rarement 50 cm"],
        ["Reproduction", "Frai en mars–avril sur gravières courantes"],
        ["Régime", "Broute les algues (diatomées) fixées sur les cailloux"],
      ],
    },
  },
  {
    id: "goujon",
    name: "Goujon",
    latin: "Gobio gobio",
    group: "cyprinides",
    rating: "Bon",
    ratingCls: "good",
    maille: "—",
    mailleSub: "pas de maille nationale",
    quota: "—",
    quotaSub: "—",
    season: "toujours",
    ident: {
      summary:
        "Petit poisson fusiforme de fond, dos brun tacheté, une rangée de taches sombres sur les flancs ; une paire de barbillons aux commissures.",
      traits: [
        "Petite taille, corps fuselé adapté à la vie sur le fond",
        "Rangée de taches sombres le long des flancs",
        "1 barbillon à chaque commissure (1 paire)",
        "Vit en bancs sur fonds sableux et graveleux",
      ],
      conf: [
        { n: "Goujons proches", how: "Plusieurs espèces cryptiques régionales (G. occitaniae…) : distinction fine, souvent géographique." },
      ],
    },
    reg: {
      rows: [
        ["Maille", "Aucune taille légale nationale"],
        ["Quota", "Aucun quota national"],
        ["Catégorie", "1ʳᵉ ou 2ᵉ catégorie selon le cours d'eau"],
        ["Période", "2ᵉ cat. : toute l'année ; 1ʳᵉ cat. : période locale"],
        ["Horaires", "½ h avant lever → ½ h après coucher"],
      ],
      note: "Fréquent en 1ʳᵉ catégorie (compagnie de la truite) : la période y suit le règlement 1ʳᵉ catégorie.",
      src: "Legifrance R436-18 · R436-21",
    },
    fish: {
      rows: [
        ["Techniques", "Pêche au coup au fond, en grattant le substrat"],
        ["Appâts", "Ver de terre, asticot"],
        ["Usage", "Excellent vif ; chair réputée en friture"],
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Fonds sableux et graveleux, en bancs ; < 800 m"],
        ["Taille", "Petite espèce, 8–15 cm"],
        ["Reproduction", "Frai d'avril à juillet, pontes multiples collées au substrat"],
        ["Régime", "Benthivore : invertébrés et larves du fond"],
      ],
    },
  },
  {
    id: "rotengle",
    name: "Rotengle",
    latin: "Scardinius erythrophthalmus",
    group: "cyprinides",
    rating: "Médiocre",
    ratingCls: "warn",
    maille: "—",
    mailleSub: "pas de maille nationale",
    quota: "—",
    quotaSub: "—",
    season: "toujours",
    ident: {
      summary:
        "Cyprinidé argenté doré à œil et nageoires rouges, corps assez haut ; bouche orientée vers le haut et nageoire dorsale implantée nettement en arrière des pelviennes.",
      traits: [
        "Bouche supère (se nourrit en surface)",
        "Dorsale décalée en arrière, derrière l'aplomb des pelviennes",
        "Œil et nageoires rouge vif, flancs dorés",
        "Aucun barbillon",
      ],
      conf: [
        { n: "Gardon", how: "Le gardon a la bouche terminale, la dorsale à l'aplomb des pelviennes ; le rotengle a la bouche supère et la dorsale reculée." },
      ],
    },
    reg: {
      rows: [
        ["Maille", "Aucune taille légale nationale"],
        ["Quota", "Aucun quota national"],
        ["Catégorie", "2ᵉ catégorie (eaux calmes)"],
        ["Période", "Ouverte toute l'année"],
        ["Horaires", "½ h avant lever → ½ h après coucher"],
      ],
      note: null,
      src: "Legifrance R436-18 · R436-21",
    },
    fish: {
      rows: [
        ["Techniques", "Pêche au coup près de la surface, bordures"],
        ["Appâts", "Asticot, pain, graines"],
        ["Postes", "Herbiers et zones calmes ensoleillées"],
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux calmes et végétalisées : étangs, lacs, bras morts"],
        ["Taille", "15–30 cm (max ~40 cm)"],
        ["Reproduction", "Frai au printemps sur la végétation aquatique"],
        ["Régime", "Omnivore à tendance végétarienne"],
      ],
    },
  },
  {
    id: "ombre",
    name: "Ombre commun",
    latin: "Thymallus thymallus",
    group: "salmonides",
    rating: "Excellent",
    ratingCls: "good",
    maille: "30 cm",
    mailleSub: "national (R436-18)",
    quota: "—",
    quotaSub: "quota local possible",
    season: "cat1",
    alert: {
      title: "Espèce fragile, souvent réglementée",
      text: "Populations sensibles : le préfet peut fixer une ouverture spécifique (souvent plus tardive que la truite, parfois mi-mai), relever la maille (jusqu'à 35 cm) ou fermer / limiter la pêche. Ne vous fiez pas aux dates truite — vérifiez l'arrêté préfectoral du département.",
    },
    ident: {
      summary:
        "Salmonidé élancé à très grande nageoire dorsale colorée en drapeau ; nageoire adipeuse présente. Odeur de thym à la capture.",
      traits: [
        "Grande dorsale haute et colorée (bleu-violet, taches) — caractère unique",
        "Nageoire adipeuse présente (salmonidé)",
        "Corps fusiforme argenté, petites écailles",
        "Petite bouche, museau court",
      ],
      conf: [
        { n: "Truite fario", how: "L'ombre a une dorsale immense en drapeau ; la truite a une dorsale normale et un corps tacheté de rouge et noir." },
      ],
    },
    reg: {
      rows: [
        ["Taille minimale", "30 cm (national, R436-18)"],
        ["Maille relevée", "Jusqu'à 35 cm possible par arrêté (R436-19)"],
        ["Catégorie", "Généralement 1ʳᵉ catégorie (eaux à salmonidés)"],
        ["Période", "Ouverture souvent plus tardive que la truite (parfois mi-mai) — vérifier l'arrêté"],
      ],
      note: "Espèce patrimoniale fragile : réglementation locale souvent plus stricte (maille, no-kill, fermeture).",
      src: "Legifrance R436-18 · R436-19",
    },
    fish: {
      rows: [
        ["Techniques", "Pêche à la mouche (sèche, nymphe), au toc"],
        ["Milieu", "Rivières vives et fraîches (zone à ombre)"],
        ["Éthique", "Souvent relâché (no-kill) — espèce fragile"],
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Rivières fraîches, vives et oxygénées"],
        ["Taille", "Adulte 30–50 cm"],
        ["Reproduction", "Printemps (mars–mai), sur graviers"],
        ["Régime", "Invertébrés, larves, insectes de dérive"],
      ],
    },
  },
  {
    id: "omble-fontaine",
    name: "Omble de fontaine",
    latin: "Salvelinus fontinalis",
    group: "salmonides",
    rating: "Excellent",
    ratingCls: "good",
    maille: "—",
    mailleSub: "pas de maille nationale",
    quota: "—",
    quotaSub: "quota local possible",
    season: "cat1",
    alert: {
      title: "Pas de maille nationale",
      text: "L'omble de fontaine est explicitement exclu de la maille truite de 23 cm (R436-18). La taille légale dépend de l'arrêté préfectoral (souvent alignée à 23 cm en pratique). À vérifier localement.",
    },
    ident: {
      summary:
        "Salmonidé au dos marbré de vermiculures claires et aux flancs semés de points clairs et rouges cerclés de bleu ; nageoire adipeuse présente, bords des nageoires ventrales blanc puis noir.",
      traits: [
        "Dos vert sombre à marbrures claires (motif labyrinthe)",
        "Points clairs et rouges auréolés de bleu sur les flancs",
        "Bord des nageoires ventrales et anale blanc puis noir",
        "Nageoire adipeuse présente (salmonidé)",
      ],
      conf: [
        { n: "Truite fario", how: "L'omble a le dos marbré clair et des nageoires bordées de blanc ; la fario a un fond clair taché de noir et rouge, sans vermiculures." },
      ],
    },
    reg: {
      rows: [
        ["Taille minimale", "Aucune maille nationale (exclu du R436-18)"],
        ["En pratique", "Souvent 23 cm par arrêté préfectoral — à vérifier"],
        ["Catégorie", "Le plus souvent 1ʳᵉ catégorie"],
        ["Période", "1ʳᵉ cat. : 2ᵉ samedi de mars → 3ᵉ dimanche de septembre"],
      ],
      note: "Espèce nord-américaine introduite ; réglementation entièrement portée par l'arrêté préfectoral.",
      src: "Legifrance R436-18",
    },
    fish: {
      rows: [
        ["Techniques", "Mouche, toc, petits leurres (cuiller, vairon)"],
        ["Milieu", "Ruisseaux et lacs froids d'altitude"],
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux froides très oxygénées ; ruisseaux, lacs d'altitude"],
        ["Origine", "Amérique du Nord (introduite en France)"],
        ["Taille", "Adulte 20–35 cm (parfois plus en lac)"],
        ["Reproduction", "Automne (octobre–décembre), sur graviers"],
      ],
    },
  },
  {
    id: "truite-arc-en-ciel",
    name: "Truite arc-en-ciel",
    latin: "Oncorhynchus mykiss",
    group: "salmonides",
    rating: "Bon",
    ratingCls: "good",
    maille: "23 cm",
    mailleSub: "national (truites)",
    quota: "—",
    quotaSub: "souvent déversée",
    season: "cat1",
    alert: {
      title: "Souvent déversée en parcours",
      text: "Régulièrement lâchée dans des parcours de pêche : la maille de 23 cm peut ne pas s'y appliquer et les règles du parcours priment. Vérifiez le règlement du parcours ou l'arrêté préfectoral.",
    },
    ident: {
      summary:
        "Salmonidé à large bande latérale rose irisée et corps densément moucheté de noir, y compris sur la caudale ; nageoire adipeuse présente, pas de points rouges.",
      traits: [
        "Bande latérale rose à violacée le long du flanc",
        "Mouchetures noires nombreuses sur le corps ET la caudale",
        "Pas de points rouges (contrairement à la fario)",
        "Nageoire adipeuse présente (salmonidé)",
      ],
      conf: [
        { n: "Truite fario", how: "L'arc-en-ciel a une bande rose et la caudale mouchetée de noir, sans points rouges ; la fario a des points rouges et noirs." },
      ],
    },
    reg: {
      rows: [
        ["Taille minimale", "23 cm (truites, R436-18)"],
        ["Parcours de déversement", "Maille souvent non appliquée — règles du parcours"],
        ["Catégorie", "1ʳᵉ catégorie ou parcours spécifiques"],
        ["Période", "1ʳᵉ cat. : 2ᵉ samedi de mars → 3ᵉ dimanche de septembre"],
      ],
      note: "Espèce introduite, rarement acclimatée (peu de reproduction naturelle en France) ; souvent gérée par déversements.",
      src: "Legifrance R436-18",
    },
    fish: {
      rows: [
        ["Techniques", "Leurres, mouche, appâts naturels"],
        ["Milieu", "Parcours et lacs de pêche (souvent déversée)"],
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Eaux fraîches oxygénées ; élevages, parcours, lacs"],
        ["Origine", "Amérique du Nord (Pacifique), introduite"],
        ["Taille", "Adulte 25–50 cm (davantage en élevage)"],
        ["Reproduction", "Printemps ; peu acclimatée en milieu naturel français"],
      ],
    },
  },
  {
    id: "anguille",
    name: "Anguille européenne",
    latin: "Anguilla anguilla",
    group: "migrateurs",
    rating: "Déconseillé",
    ratingCls: "bad",
    maille: "—",
    mailleSub: "réglementation spéciale",
    quota: "Déclarer",
    quotaSub: "capture à déclarer sous 24 h",
    season: "special",
    alert: {
      title: "Réglementation lourde + espèce menacée",
      text: "Anguille en danger critique (règlement CE 1100/2007, plan de gestion). La civelle est interdite aux amateurs ; périodes et fermetures varient par bassin et les captures d'anguille jaune se déclarent sous 24 h. Vérifiez l'arrêté préfectoral et l'AAPPMA.",
    },
    ident: {
      summary:
        "Corps serpentiforme sans nageoires ventrales ; dorsale, caudale et anale fusionnées en un long ruban continu ; peau épaisse et visqueuse.",
      traits: [
        "Forme d'anguille, très allongée et cylindrique",
        "Nageoire continue dorsale-caudale-anale, pas de ventrales",
        "Peau gluante, petites écailles enfouies",
        "Jaune-verdâtre (anguille jaune) à argentée (avalaison)",
      ],
      conf: [
        { n: "Lamproie", how: "L'anguille a de vraies mâchoires et des nageoires pectorales ; la lamproie a une bouche-ventouse ronde, sans mâchoires ni pectorales." },
      ],
    },
    reg: {
      rows: [
        ["Civelle (< 12 cm)", "Pêche interdite aux amateurs"],
        ["Cadre", "Règlement CE 1100/2007 + plan de gestion anguille"],
        ["Déclaration", "Anguille jaune : captures à déclarer sous 24 h"],
        ["Périodes", "Variables par bassin + fermetures anticipées — à vérifier"],
      ],
      note: "Réglementation très stricte et évolutive (arrêtés annuels de fermeture). Consultez toujours l'arrêté préfectoral en vigueur.",
      src: "Legifrance R436-65-1 s. · Règl. CE 1100/2007",
    },
    fish: {
      rows: [
        ["Techniques", "Au posé (ver de terre), surtout de nuit"],
        ["Postes", "Fonds vaseux, trous, sous les berges"],
        ["Rappel", "Civelle interdite ; captures d'anguille jaune à déclarer"],
      ],
    },
    sante: {
      paras: [
        "Espèce très grasse et parmi les plus bioaccumulatrices : concentrations de PCB souvent très élevées et hétérogènes.",
        "ANSES : consommation seulement exceptionnelle quel que soit le bassin — au plus 2 fois par mois pour le grand public, 1 fois tous les 2 mois pour les publics sensibles (femmes enceintes, jeunes enfants).",
        "Interdictions locales de consommation (PCB, dioxines) sur certains cours d'eau : vérifiez les arrêtés préfectoraux.",
      ],
      alert: true,
    },
    bio: {
      rows: [
        ["Cycle", "Catadrome : reproduction en mer des Sargasses, croissance en eau douce"],
        ["Habitat", "Rivières, étangs, estuaires ; très ubiquiste"],
        ["Statut", "En danger critique (UICN), stock effondré"],
        ["Migration", "Civelle → anguille jaune → anguille argentée (avalaison)"],
      ],
    },
  },
  {
    id: "carassin",
    name: "Carassin commun",
    latin: "Carassius carassius",
    group: "cyprinides",
    rating: "Médiocre",
    ratingCls: "warn",
    maille: "—",
    mailleSub: "pas de maille nationale",
    quota: "—",
    quotaSub: "—",
    season: "toujours",
    ident: {
      summary:
        "Cyprinidé au corps haut et trapu, doré à bronze, SANS aucun barbillon ; longue nageoire dorsale à bord convexe, pédoncule caudal épais.",
      traits: [
        "Aucun barbillon (différence clé avec la carpe)",
        "Corps haut et comprimé, teinte dorée à brun-bronze",
        "Longue dorsale à profil arrondi (convexe)",
        "Caudale peu échancrée",
      ],
      conf: [
        { n: "Carpe commune", how: "Le carassin n'a AUCUN barbillon ; la carpe en a quatre (deux courts, deux longs)." },
      ],
    },
    reg: {
      rows: [
        ["Maille", "Aucune taille légale nationale"],
        ["Quota", "Aucun quota national"],
        ["Catégorie", "Surtout 2ᵉ catégorie (eaux calmes)"],
        ["Période", "Ouverte toute l'année"],
      ],
      note: "Non listé comme espèce susceptible de déséquilibres (R432-5) : remise à l'eau possible.",
      src: "Legifrance R436-18 · R432-5",
    },
    fish: {
      rows: [
        ["Techniques", "Pêche au coup, au fond"],
        ["Appâts", "Ver, maïs, pain"],
        ["Postes", "Étangs et mares vaseuses"],
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Étangs, mares, eaux calmes peu oxygénées"],
        ["Résistance", "Très tolérant (faible oxygène, gel partiel)"],
        ["Taille", "15–30 cm"],
        ["Reproduction", "Mai–juin, sur la végétation"],
      ],
    },
  },
  {
    id: "vandoise",
    name: "Vandoise",
    latin: "Leuciscus leuciscus",
    group: "cyprinides",
    rating: "Médiocre",
    ratingCls: "warn",
    maille: "—",
    mailleSub: "espèce protégée",
    quota: "—",
    quotaSub: "—",
    season: "toujours",
    protected: true,
    alert: {
      title: "Espèce protégée",
      text: "Inscrite à l'arrêté du 8 décembre 1988 (poissons protégés) : protection notamment des frayères. Le prélèvement et l'usage comme vif peuvent être restreints selon le département. Vérifiez l'arrêté préfectoral avant de conserver.",
    },
    ident: {
      summary:
        "Cyprinidé élancé et argenté, à petite bouche infère ; nageoire anale à bord concave, sans barbillon, œil jaunâtre.",
      traits: [
        "Corps allongé, argenté, dos gris-vert",
        "Petite bouche en position basse (infère)",
        "Nageoire anale à bord concave (rentrant)",
        "Aucun barbillon",
      ],
      conf: [
        { n: "Chevesne", how: "La vandoise a l'anale concave, une petite bouche et un corps mince ; le chevesne a l'anale convexe et une grosse bouche." },
        { n: "Gardon", how: "La vandoise a la bouche infère et un corps plus fuselé ; le gardon a l'œil rouge et les nageoires rougeâtres." },
      ],
    },
    reg: {
      rows: [
        ["Maille", "Aucune maille nationale spécifique"],
        ["Protection", "Espèce protégée — arrêté du 8 décembre 1988"],
        ["Portée", "Protection des zones de reproduction et habitats"],
        ["Statut local", "Restrictions possibles (prélèvement, vif) — à vérifier"],
      ],
      note: "Statut de protection nuancé : la destruction des frayères est interdite ; l'usage comme vif est contesté. Vérifiez localement.",
      src: "Arrêté du 8 décembre 1988 · Legifrance R436-18",
    },
    fish: {
      rows: [
        ["Techniques", "Pêche au coup fine, au toc, en surface"],
        ["Postes", "Courants clairs et radiers, en banc"],
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Rivières courantes, claires et oxygénées"],
        ["Comportement", "Grégaire, en bancs près de la surface"],
        ["Taille", "15–25 cm (jusqu'à ~30 cm)"],
        ["Reproduction", "Fin d'hiver–printemps, sur graviers"],
      ],
    },
  },
  {
    id: "gremille",
    name: "Grémille",
    latin: "Gymnocephalus cernuus",
    group: "carnassiers",
    rating: "Bon",
    ratingCls: "good",
    maille: "—",
    mailleSub: "pas de maille nationale",
    quota: "—",
    quotaSub: "—",
    season: "toujours",
    ident: {
      summary:
        "Petit percidé brunâtre tacheté, à dorsale épineuse continue (partie épineuse et molle soudées), sans bandes verticales nettes ; corps couvert de mucus, grands yeux.",
      traits: [
        "Corps brun-olive marbré, sans barres verticales nettes",
        "Dorsale unique continue (partie épineuse soudée à la molle)",
        "Grands yeux, joues à petites épines, peau visqueuse",
        "Petite taille (souvent 8–15 cm)",
      ],
      conf: [
        { n: "Perche", how: "La grémille est brunâtre tachetée, à dorsale continue et SANS bandes verticales ; la perche a des barres verticales nettes et deux dorsales séparées." },
      ],
    },
    reg: {
      rows: [
        ["Maille", "Aucune taille légale nationale"],
        ["Quota", "Aucun quota national"],
        ["Catégorie", "Surtout 2ᵉ catégorie"],
        ["Période", "Ouverte toute l'année"],
      ],
      note: "Non listé comme espèce susceptible de déséquilibres (R432-5).",
      src: "Legifrance R436-18 · R432-5",
    },
    fish: {
      rows: [
        ["Techniques", "Pêche au coup, au ver plombé près du fond"],
        ["Postes", "Fonds sablo-vaseux, canaux, rivières lentes"],
      ],
    },
    bio: {
      rows: [
        ["Habitat", "Fonds sablo-vaseux de lacs, canaux, rivières lentes"],
        ["Régime", "Invertébrés benthiques, larves, œufs de poissons"],
        ["Taille", "8–15 cm (jusqu'à ~20 cm)"],
        ["Reproduction", "Printemps (mars–mai), en eau calme"],
      ],
    },
  },
];

// Full national coverage = hand-curated fiches first, then generated "base" fiches.
export const SPECIES: Species[] = [...CURATED, ...BASE_SPECIES];

// Dev guard: duplicate ids would cause React key collisions and ambiguous lookups.
if (import.meta.env.DEV) {
  const ids = SPECIES.map((s) => s.id);
  const dup = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (dup.length) console.error("SPECIES: ids en double →", dup);
}
