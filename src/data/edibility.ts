// Sourced edibility (comestibilité) + health overlay, keyed by species id.
// Verified 2026-07-22 — see scripts/species-list/_edibility-verified.json.
// Nothing is invented: species with no sourced data simply have no entry (the
// fiche shows nothing rather than a guess). "non" = protected / no-take (a
// verified legal fact), never a taste judgement.
//
// Sources: Arrêté du 8 déc. 1988 & 25 janv. 1982 (Légifrance) · ANSES avis PCB
// 2011/2015 (bioaccumulateurs) · arrêté 14 fév. 2018 (EEE) · SFMU (choléra des
// barbeaux) · fédérations de pêche & références culinaires (DORIS, Fishipedia).

export type EdibleStatus = "oui" | "réglementé" | "non";

export interface Edible {
  status: EdibleStatus;
  bones?: "peu" | "moyen" | "beaucoup";
  taste?: string;
  anses?: string; // contaminant consumption advisory
  prep?: string; // handling / toxicity note
  source: string;
}

const CULINARY = "Fédérations de pêche · références culinaires";
const ANSES = "ANSES (avis PCB 2011/2015)";
const A1988 = "Arrêté du 8 décembre 1988 (espèces protégées)";
const ANSES_TXT =
  "Espèce fortement bioaccumulatrice (PCB/dioxines) : l'ANSES recommande de limiter à 2 fois/mois (population générale) et 1 fois tous les 2 mois pour les publics sensibles (femmes enceintes/allaitantes, enfants < 3 ans, filles et adolescentes).";
const ANSES_ANGUILLE =
  "Espèce TRÈS fortement bioaccumulatrice — la plus concernée par les PCB/dioxines : ANSES 2 fois/mois max (population générale), 1 fois tous les 2 mois pour les publics sensibles.";
const RELACHE = "Espèce protégée — capture interdite, remise à l'eau immédiate et soignée.";

export const EDIBILITY: Record<string, Edible> = {
  // ── Carnassiers ──────────────────────────────────────────────
  brochet: {
    status: "oui",
    bones: "beaucoup",
    taste: "Chair blanche fine et maigre, très appréciée (quenelles, beurre blanc) ; peut être vaseux selon le milieu.",
    prep: "Nombreuses arêtes en « Y » à retirer ; œufs (rogue) réputés indigestes/purgatifs, surtout en période de fraie.",
    source: CULINARY,
  },
  "brochet-aquitain": {
    status: "réglementé",
    bones: "beaucoup",
    taste: "Chair blanche fine comparable au brochet ; arêtes en « Y ».",
    prep: "Endémique du Sud-Ouest à fort enjeu de conservation : relâche recommandée ; réglementation « brochet ».",
    source: CULINARY,
  },
  sandre: {
    status: "oui",
    bones: "peu",
    taste: "Chair blanche fine et ferme, sans goût de vase — l'un des meilleurs poissons d'eau douce.",
    prep: "Se lève facilement en filets ; attention aux rayons épineux de la dorsale.",
    source: CULINARY,
  },
  perche: {
    status: "oui",
    bones: "peu",
    taste: "Chair fine, ferme et délicate, très recherchée.",
    prep: "Écailles très adhérentes : on lève les filets plutôt que d'écailler.",
    source: CULINARY,
  },
  "black-bass": {
    status: "oui",
    bones: "peu",
    taste: "Chair blanche correcte ; espèce sportive le plus souvent relâchée (no-kill).",
    prep: "Souvent soumis à taille/quota locaux ; usage no-kill recommandé par les fédérations.",
    source: CULINARY,
  },
  "black-bass-petite-bouche": {
    status: "oui",
    bones: "peu",
    taste: "Chair blanche correcte ; espèce sportive le plus souvent relâchée (no-kill).",
    prep: "Souvent soumis à taille/quota locaux ; usage no-kill recommandé par les fédérations.",
    source: CULINARY,
  },
  silure: {
    status: "oui",
    bones: "peu",
    taste: "Chair blanche ferme sans arêtes intramusculaires ; plus grasse/forte sur les gros sujets.",
    anses: ANSES_TXT + " Éviter surtout les très gros individus (forte accumulation).",
    prep: "Privilégier les sujets de taille moyenne ; retirer la peau (pas d'écailles).",
    source: ANSES,
  },
  aspe: {
    status: "oui",
    bones: "beaucoup",
    taste: "Chair blanche correcte mais riche en arêtes.",
    prep: "Cyprinidé piscivore non indigène (arrivé par les canaux) ; non protégé.",
    source: CULINARY,
  },
  gremille: {
    status: "oui",
    bones: "moyen",
    taste: "Chair fine réputée mais poisson minuscule et épineux — rendement négligeable.",
    prep: "Rayons épineux ; mucus abondant à rincer.",
    source: CULINARY,
  },

  // ── Salmonidés ───────────────────────────────────────────────
  "truite-fario": {
    status: "oui",
    bones: "moyen",
    taste: "Chair fine, savoureuse, rosée à blanche selon l'alimentation — excellente.",
    prep: "Pêche autorisée sous réglementation 1ʳᵉ catégorie (taille, quota, période).",
    source: CULINARY,
  },
  "truite-arc-en-ciel": {
    status: "oui",
    bones: "peu",
    taste: "Chair fine, qualité régulière ; le plus souvent issue d'élevage/lâchers.",
    source: CULINARY,
  },
  "omble-fontaine": {
    status: "oui",
    bones: "moyen",
    taste: "Chair fine, proche de la truite — excellente.",
    prep: "Nord-américain introduit ; réglementation salmonicole (non protégé).",
    source: CULINARY,
  },
  "omble-chevalier": {
    status: "réglementé",
    bones: "peu",
    taste: "Chair fine, fondante et délicate — poisson noble des lacs alpins.",
    prep: "Protégé (arrêté 1988) : pêche seulement dans certains lacs, réglementation stricte (taille, quota).",
    source: A1988,
  },
  "coregone-lavaret": {
    status: "réglementé",
    bones: "moyen",
    taste: "Chair blanche fine et délicate, très recherchée en cuisine lacustre.",
    prep: "Genre protégé (arrêté 1988) ; pêche réglementée dans les grands lacs.",
    source: A1988,
  },
  ombre: {
    status: "réglementé",
    bones: "moyen",
    taste: "Chair fine et délicate ; légère odeur de thym à la capture.",
    prep: "Protégé (arrêté 1988) : très réglementé, taille élevée, souvent pratiqué en no-kill.",
    source: A1988,
  },

  // ── Cyprinidés & apparentés ──────────────────────────────────
  carpe: {
    status: "oui",
    bones: "beaucoup",
    taste: "Chair correcte mais parfois grasse et vaseuse selon le milieu (carpe de Noël en Europe centrale).",
    anses: ANSES_TXT,
    prep: "Dévasage recommandé ; nombreuses arêtes ; très majoritairement pêchée en no-kill en France.",
    source: ANSES,
  },
  tanche: {
    status: "oui",
    bones: "moyen",
    taste: "Chair fine et blanche, appréciée, mais goût de vase fréquent selon le milieu.",
    prep: "Dévasage recommandé ; œufs pouvant être indigestes en période de fraie.",
    source: CULINARY,
  },
  breme: {
    status: "oui",
    bones: "beaucoup",
    taste: "Chair molle, fade et souvent vaseuse — peu valorisée.",
    anses: ANSES_TXT,
    prep: "Très nombreuses petites arêtes intramusculaires.",
    source: ANSES,
  },
  "breme-bordeliere": {
    status: "oui",
    bones: "beaucoup",
    taste: "Proche de la brème commune, chair fade et pleine d'arêtes.",
    prep: "Très nombreuses petites arêtes.",
    source: CULINARY,
  },
  gardon: {
    status: "oui",
    bones: "beaucoup",
    taste: "Chair correcte mais fade, surtout consommée en friture.",
    prep: "Nombreuses petites arêtes ; NON classé bioaccumulateur fort par l'ANSES.",
    source: CULINARY,
  },
  rotengle: {
    status: "oui",
    bones: "beaucoup",
    taste: "Proche du gardon, chair fade, en friture.",
    prep: "Nombreuses petites arêtes.",
    source: CULINARY,
  },
  chevesne: {
    status: "oui",
    bones: "beaucoup",
    taste: "Chair blanche fade, souvent molle — peu intéressante.",
    prep: "Très nombreuses petites arêtes ; à consommer très frais.",
    source: CULINARY,
  },
  "chevesne-catalan": {
    status: "oui",
    bones: "beaucoup",
    taste: "Comme le chevesne : chair fade et pleine d'arêtes.",
    prep: "À consommer très frais.",
    source: CULINARY,
  },
  barbeau: {
    status: "oui",
    bones: "beaucoup",
    taste: "Chair blanche correcte mais fade et bourrée d'arêtes.",
    anses: ANSES_TXT,
    prep: "⚠️ ŒUFS (ROGUE) TOXIQUES — à ne JAMAIS consommer (« choléra des barbeaux » : diarrhées, crampes) ; écarter aussi la chair ventrale en période de fraie (mai-juillet).",
    source: ANSES + " · SFMU",
  },
  goujon: {
    status: "oui",
    bones: "moyen",
    taste: "Chair fine et délicate — excellent petit poisson de friture.",
    prep: "Consommé entier en friture.",
    source: CULINARY,
  },
  ablette: {
    status: "oui",
    bones: "moyen",
    taste: "Chair fine, savoureuse — classique de la friture.",
    prep: "Petit poisson consommé entier en friture.",
    source: CULINARY,
  },
  hotu: {
    status: "oui",
    bones: "beaucoup",
    taste: "Chair blanche fade et très bourrée d'arêtes — peu prisée.",
    prep: "Retirer le péritoine (membrane ventrale noire) ; NE PAS confondre avec le toxostome (protégé).",
    source: CULINARY,
  },

  // ── Migrateurs (réglementés) ─────────────────────────────────
  anguille: {
    status: "réglementé",
    bones: "peu",
    taste: "Chair grasse et fine, historiquement très prisée (matelote, anguille fumée).",
    anses: ANSES_ANGUILLE,
    prep: "En danger critique : pêche strictement encadrée (règlement européen anguille) — ne prélever que là où c'est légal.",
    source: ANSES,
  },
  "grande-alose": {
    status: "réglementé",
    bones: "beaucoup",
    taste: "Chair fine et savoureuse mais extrêmement riche en arêtes (grillée à l'oseille).",
    prep: "Protégée (arrêté 1988) ; moratoires sur plusieurs bassins — ne consommer que si la capture est légale.",
    source: A1988,
  },
  "alose-feinte-atlantique": {
    status: "réglementé",
    bones: "beaucoup",
    taste: "Comme la grande alose : savoureuse mais très riche en arêtes.",
    prep: "Protégée (arrêté 1988) ; moratoires locaux — ne consommer que si légal.",
    source: A1988,
  },
  "alose-feinte-mediterraneenne": {
    status: "réglementé",
    bones: "beaucoup",
    taste: "Savoureuse mais très riche en arêtes.",
    prep: "Protégée (arrêté 1988) ; moratoires locaux — ne consommer que si légal.",
    source: A1988,
  },
  "lamproie-marine": {
    status: "réglementé",
    bones: "peu",
    taste: "Chair grasse, dense et charnue, sans arêtes (mets recherché : lamproie à la bordelaise).",
    prep: "Protégée (arrêté 1988) ; moratoires récents (Gironde 2023) — ne consommer que si légal.",
    source: A1988,
  },
  "lamproie-de-riviere": {
    status: "réglementé",
    bones: "peu",
    taste: "Chair grasse et dense, sans arêtes.",
    prep: "Protégée (arrêté 1988) ; moratoires locaux — ne consommer que si légal.",
    source: A1988,
  },
  "mulet-porc": {
    status: "oui",
    bones: "moyen",
    taste: "Chair blanche correcte ; goût pouvant être vaseux/estuarien selon le milieu (œufs séchés = poutargue).",
    prep: "Euryhalin (estuaires, cours d'eau bas) ; meilleure qualité en eaux propres.",
    source: CULINARY,
  },
  "mulet-dore": { status: "oui", bones: "moyen", taste: "Chair blanche correcte ; qualité meilleure en eaux propres.", source: CULINARY },
  "mulet-lippu": { status: "oui", bones: "moyen", taste: "Chair blanche correcte ; qualité meilleure en eaux propres.", source: CULINARY },
  "mulet-cabot": { status: "oui", bones: "moyen", taste: "Chair blanche correcte ; qualité meilleure en eaux propres.", source: CULINARY },

  // ── Invasives (comestibles mais ne pas relâcher vivantes) ────
  "perche-soleil": {
    status: "oui",
    bones: "moyen",
    taste: "Chair fine mais poisson minuscule — rendement dérisoire.",
    prep: "Espèce exotique envahissante : remise à l'eau vivante interdite dans de nombreux départements — ne pas relâcher vivante.",
    source: CULINARY,
  },
  "poisson-chat": {
    status: "oui",
    bones: "peu",
    taste: "Chair blanche correcte, sans arêtes intramusculaires.",
    prep: "Espèce exotique envahissante : remise à l'eau vivante interdite (à détruire). ⚠️ Rayons épineux qui piquent à la manipulation ; retirer la peau (pas d'écailles).",
    source: CULINARY,
  },

  // ── Protégées / no-take (comestible = non, fait légal) ───────
  vandoise: { status: "non", prep: RELACHE, source: A1988 },
  "vandoise-rostree": { status: "non", prep: RELACHE, source: A1988 },
  "vandoise-du-bearn": { status: "non", prep: RELACHE, source: A1988 },
  "ide-melanote": { status: "non", prep: RELACHE, source: A1988 },
  "barbeau-meridional": { status: "non", prep: RELACHE, source: A1988 },
  bouviere: { status: "non", prep: RELACHE, source: A1988 },
  "apron-du-rhone": { status: "non", prep: RELACHE, source: A1988 },
  toxostome: { status: "non", prep: "Espèce protégée (Directive Habitats) — remise à l'eau. Souvent confondue avec le hotu.", source: "Directive Habitats / protection nationale" },
  "blennie-fluviatile": { status: "non", prep: RELACHE, source: A1988 },
  "lamproie-de-planer": { status: "non", prep: RELACHE, source: A1988 },
  "loche-d-etang": { status: "non", prep: RELACHE, source: A1988 },
  "loche-de-riviere": { status: "non", prep: RELACHE, source: A1988 },
  "esturgeon-europeen": {
    status: "non",
    prep: "STRICTEMENT PROTÉGÉ (Acipenser sturio, en danger critique) : pêche, détention, transport et vente interdits — relâcher toute capture accidentelle.",
    source: "Arrêté du 25 janvier 1982",
  },
};
