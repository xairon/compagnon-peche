import type { Technique } from "../types";

// Reusable techniques (killing, preparation, preservation) linked from recipes.
// Sourced from the project brief: IKEPODE/SMIDAP (ikejime), garum de Tours
// (Thierry Bouvet), and classic culinary practice. Sanitary values below.

export const TECHNIQUES: Technique[] = [
  {
    id: "ikejime",
    name: "Ikejime — abattage de précision",
    category: "abattage",
    summary:
      "Technique japonaise qui neutralise instantanément le système nerveux du poisson vivant : moins de stress, chair immaculée, meilleure conservation et umami plus prononcé après maturation.",
    steps: [
      {
        title: "1. Décérébration",
        detail: "Perforez le crâne juste au-dessus des yeux d'un geste sec pour détruire le cerveau.",
        tool: "Poinçon (tegaki)",
        goal: "Mort cérébrale instantanée — stoppe douleur et libération d'acide lactique.",
      },
      {
        title: "2. Démédullation",
        detail: "Insérez une tige le long du canal rachidien pour détruire la moelle épinière.",
        tool: "Tige acier à mémoire de forme",
        goal: "Supprime les spasmes post-mortem et préserve les réserves d'ATP.",
      },
      {
        title: "3. Saignée",
        detail: "Sectionnez les branchies et entaillez le pédoncule caudal.",
        tool: "Couteau tranchant",
        goal: "Exsanguination complète (le cœur bat encore par réflexe).",
      },
      {
        title: "4. Décompression (optionnelle)",
        detail: "Ponctionnez la vessie natatoire sous les écailles si le poisson vient des profondeurs.",
        tool: "Aiguille creuse",
        goal: "Évite l'éclatement des organes sous la pression interne.",
      },
      {
        title: "5. Refroidissement",
        detail: "Immergez aussitôt le poisson saigné dans un bac d'eau glacée claire.",
        tool: "Bac d'eau glacée",
        goal: "Évacue le sang (vecteur d'oxydation), retarde la rigor mortis.",
      },
    ],
    tools: ["Poinçon / tegaki", "Tige acier", "Couteau", "Bac d'eau glacée"],
    safety:
      "Geste éthique et sanitaire : une agonie longue dégrade la chair (acide lactique, hématomes) et raccourcit la conservation.",
    source:
      "Protocole étudié par le programme IKEPODE / SMIDAP (Pays de la Loire). Note : le rapport 2025 nuance le gain sur poissons d'eau douce (écarts parfois faibles les premiers jours) ; les durées de maturation (5–20 j) sont des ordres de grandeur.",
    speciesNote: [
      ["sandre", "Ikejime complet possible (tige dans le cerveau puis la moelle)."],
      ["silure", "Gros sujets : la saignée est essentielle ; récupérer le sang pour lier les sauces."],
      ["brochet", "Repérer le point de perforation au-dessus des yeux, crâne osseux."],
    ],
  },
  {
    id: "maturation",
    name: "Maturation en chambre froide",
    category: "preparation",
    summary:
      "Après un ikejime propre, la chair s'affine 5 à 20 jours au froid : l'ATP se dégrade lentement en acides inosiniques qui exacerbent l'umami. La préparation se rapproche du travail de l'artisan boucher.",
    steps: [
      { title: "Poisson exsangue", detail: "Partez d'un poisson traité en ikejime, saigné et refroidi." },
      { title: "Froid maîtrisé", detail: "Conservez à 0–2 °C, non filmé serré, sur grille, à l'abri de l'humidité stagnante." },
      { title: "Durée", detail: "5 à 20 jours selon l'espèce et la taille ; la rigor mortis retardée laisse les enzymes travailler." },
    ],
    safety: "Réservez la maturation longue aux poissons abattus en ikejime, très frais et parfaitement saignés.",
    source: "Pratique issue de la valorisation ligérienne (chefs + IKEPODE).",
  },
  {
    id: "desaretage-brochet",
    name: "Gérer les arêtes en Y (brochet)",
    category: "preparation",
    summary:
      "Le brochet porte des centaines d'arêtes intramusculaires ramifiées en « Y ». Deux stratégies : la transformation (chair mixée en quenelles/farce) ou le retrait patient à la pince sur de gros filets.",
    steps: [
      { title: "Lever les filets", detail: "Levez les filets le long de l'arête centrale, peau conservée ou non." },
      { title: "Option pince", detail: "Sur gros sujets, repérez les rangées d'arêtes en Y et retirez-les une à une à la pince à désarêter." },
      { title: "Option mixage", detail: "Sinon, mixez la chair finement (quenelles, farce) : les arêtes broyées ne gênent plus." },
    ],
    tools: ["Couteau à filet", "Pince à désarêter", "Cutter / mixeur"],
    source: "Pratique culinaire classique (quenelles de brochet).",
    speciesNote: [["brochet", "Arêtes en Y intramusculaires — la transformation reste la voie la plus sûre."]],
  },
  {
    id: "degorgeage",
    name: "Dégorgeage (goût de vase)",
    category: "preparation",
    summary:
      "Les poissons d'eaux calmes (carpe, tanche) peuvent présenter un goût de vase. Une purge en eau claire, avant l'abattage, nettoie leur système digestif et affine la chair.",
    steps: [
      { title: "Eau claire courante", detail: "Placez le poisson vivant en eau claire (idéalement courante) plusieurs jours." },
      { title: "Alternative rapide", detail: "À défaut, faites dégorger la chair 1 h en eau vinaigrée avant cuisson." },
      { title: "Mucus", detail: "Brossez/lavez le mucus au gros sel avant de préparer (voir sécurité)." },
    ],
    source: "Traités culinaires du XIXe–XXe siècle (préparation de la carpe).",
    speciesNote: [
      ["carpe", "Dégorgeage recommandé pour les sujets d'étang."],
      ["tanche", "Peau très visqueuse : brossage au gros sel indispensable."],
    ],
  },
  {
    id: "arete-oseille",
    name: "Dissoudre les arêtes à l'oseille",
    category: "preparation",
    summary:
      "L'acide oxalique de l'oseille ramollit et « fond » les fines arêtes de l'alose à la cuisson. Une réaction chimique naturelle qui rend ce poisson très arêteux enfin agréable à déguster.",
    steps: [
      { title: "Chemiser d'oseille", detail: "Tapissez généreusement la cavité et l'extérieur du poisson d'oseille fraîche." },
      { title: "Cuisson longue au four", detail: "Cuisez à four chaud (≈ 200 °C) 40 min, en arrosant, pour laisser l'acide agir." },
      { title: "Résultat", detail: "Les arêtes fines se ramollissent nettement ; la chair grasse reste fondante." },
    ],
    safety: "Ne remplace pas la cuisson à cœur : ne consommez pas l'alose crue ou tiède.",
    source: "Technique régionale ligérienne (alose à l'oseille).",
    speciesNote: [["grande-alose", "Densité d'arêtes fines très élevée — l'oseille est la parade traditionnelle."]],
  },
  {
    id: "sterilisation-arete",
    name: "Stériliser pour fondre les arêtes",
    category: "conservation",
    summary:
      "En conserve, une stérilisation prolongée sous pression dissout la matrice calcique des arêtes de l'alose : elles disparaissent dans la sauce et le poisson devient parfaitement fondant.",
    steps: [
      { title: "Saisir puis conditionner", detail: "Saisissez les darnes, disposez-les en bocaux avec garniture et sauce." },
      { title: "Stérilisation sous pression", detail: "La dissolution des arêtes demande une stérilisation longue et intense. N'appliquez qu'un barème temps/température OFFICIEL et validé pour conserves de poisson (autoclave/stérilisateur) — voir les fiches DGCCRF/DGAL et le manuel de votre appareil. Aucune durée n'est donnée ici : un barème approximatif expose au botulisme." },
      { title: "Effet", detail: "La chaleur prolongée dissout la matrice calcique des arêtes ; ouvrez de préférence après un long affinage." },
    ],
    tools: ["Bocaux à stériliser", "Autocuiseur / stérilisateur"],
    safety:
      "Respectez STRICTEMENT un barème temps/température de stérilisation OFFICIEL et validé (bocaux propres, joints neufs) : risque botulique. Aucune durée n'est fournie ici — suivez un barème de source sûre (DGCCRF/DGAL, notice de l'autoclave).",
    source: "Conserves d'alose à la bordelaise (tradition ; Le Pêcheur Professionnel).",
    speciesNote: [["grande-alose", "La stérilisation transforme le défaut (arêtes) en atout de texture."]],
  },
  {
    id: "garum",
    name: "Garum — fermentation zéro déchet",
    category: "conservation",
    summary:
      "Condiment antique remis au goût du jour sur la Loire : une sauce lacto-fermentée d'une puissance umami exceptionnelle, obtenue en salant fortement chairs, viscères et carcasses. Idéale pour valoriser les excédents de pêche et les parures.",
    steps: [
      { title: "Composition", detail: "Environ 75 % de chair + viscères + carcasses de poissons, 25 % de sel marin." },
      { title: "Macération", detail: "En fût, à l'abri de la lumière, au moins un an : les enzymes digèrent les protéines en acides aminés." },
      { title: "Récolte", detail: "Filtrez l'élixir ambré, très concentré en acide glutamique (umami)." },
      { title: "Usage", detail: "Quelques gouttes remplacent le sel : légumes sautés, sauce tomate, vinaigrette, plats mijotés." },
    ],
    tools: ["Fût / bocal", "Sel marin"],
    safety:
      "Le sel (≈ 25 %) inhibe les bactéries de putréfaction — ne réduisez pas cette proportion. Fermentation à l'abri de la lumière.",
    source: "Garum de Tours, réhabilité par le pêcheur Thierry Bouvet.",
    speciesNote: [
      ["gremille", "Petites espèces et « friture » sans usage direct : parfaites pour le garum."],
      ["breme", "Espèces abondantes et arêteuses valorisées en condiment."],
    ],
  },
];

/** Sanitary reference surfaced on raw/cold-smoked recipes and in the technique guide. */
export const SAFETY = {
  parasites:
    "Les poissons d'eau douce peuvent héberger des parasites (nématodes type Anisakis, Gnathostoma ; trématodes). Consommés crus ou peu cuits, ils exposent à des parasitoses.",
  congelation:
    "Tout poisson destiné à être mangé cru (tartare, ceviche, sushi) ou fumé à froid (< 60 °C) doit être congelé à cœur : −20 °C pendant au moins 24 h, ou −35 °C pendant 15 h. L'acidité des marinades et le sel ne suffisent pas à tuer les parasites.",
  mucus:
    "Le mucus (abondant chez l'anguille, la tanche, la carpe) favorise la prolifération bactérienne : lavez soigneusement ou brossez au gros sel avant de préparer la chair.",
  source: "Repères FAO / réglementation UE (congélation assainissante) — à confirmer localement.",
};
