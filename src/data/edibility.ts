// Sourced edibility (comestibilité) + health overlay, keyed by species id.
// Verified 2026-07-22 — see scripts/species-list/_edibility-verified.json.
// Nothing is invented: species with no sourced data simply have no entry (the
// fiche shows nothing rather than a guess). "non" = a national text forbids
// KEEPING the animal (verified legal fact), never a taste judgement — see the
// audit of 2026-07: the arrêté du 8 déc. 1988 is not such a text, it protects
// eggs and spawning grounds. Species listed there are "réglementé".
//
// Sources: Arrêté du 8 déc. 1988 & 20 déc. 2004 (Légifrance) · ANSES avis PCB
// 2011/2015 (bioaccumulateurs) · arrêté 14 fév. 2018 (EEE) · SFMU (choléra des
// barbeaux) · fédérations de pêche & références culinaires (DORIS, Fishipedia) ·
// de Haro L., « Intoxications par organismes aquatiques », Médecine Tropicale
// 2008;68(4):367-374 (ichtyootoxisme/ichtyohémotoxisme) · Eve O. et al.,
// Urgence-Pratique, reproduit avec l'autorisation du Dr J.-C. Deslandes
// (ichtyohémotoxisme — poissons à sang toxique).

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
const A1988 = "Arrêté du 8 décembre 1988, art. 1er (œufs et frayères) · arrêtés préfectoraux";
// Fished salmonids (ombre, omble chevalier, corégone): NOT on the 1988 protected
// list — they have a legal size + local quota. Cite the salmonid regulation, not
// "protégé 1988", which contradicts their pêchable status in regulation/species.
const SALMO = "Réglementation salmonicole (R436-18/19 · arrêtés préfectoraux)";
// Amphihaline migrators: the 1988 arrêté protects only eggs/spawning grounds, not
// the adults — whose take is governed by basin moratoria/arrêtés. Cite both honestly.
const MIGRATEUR =
  "Arrêté 8 déc. 1988 (œufs/frayères) · moratoires & arrêtés de bassin (pêche de l'adulte)";
const ANSES_TXT =
  "Espèce fortement bioaccumulatrice (PCB/dioxines) : l'ANSES recommande de limiter à 2 fois/mois (population générale) et 1 fois tous les 2 mois pour les publics sensibles (femmes enceintes/allaitantes, enfants < 3 ans, filles et adolescentes).";
const ANSES_ANGUILLE =
  "Espèce TRÈS fortement bioaccumulatrice — la plus concernée par les PCB/dioxines. L'ANSES en recommande une consommation exceptionnelle QUEL QUE SOIT LE BASSIN VERSANT (là où les autres espèces peuvent être assouplies en eau propre) : 2 fois/mois maximum en population générale, 1 fois tous les 2 mois pour les publics sensibles.";
// The arrêté du 8 déc. 1988 protects eggs and spawning grounds; it never
// forbids keeping the adult (the pike and the trout are on the same list).
// Saying "capture interdite" here contradicted the law and the fiche.
const A1988_TXT =
  "L'arrêté du 8 décembre 1988 protège ses œufs et ses frayères, pas l'adulte : la conserver n'est pas interdit au niveau national. Espèce peu recherchée et souvent rare — remise à l'eau conseillée, et vérifiez l'arrêté préfectoral, qui peut restreindre le prélèvement ou l'usage comme vif.";
const HABITATS_TXT =
  "Espèce d'intérêt communautaire (Directive Habitats an. II) que l'arrêté du 8 décembre 1988 ne vise pas : aucune interdiction nationale de la conserver. Espèce rare — remise à l'eau conseillée, et vérifiez l'arrêté préfectoral.";
// Risque de MILIEU, pas d'espèce : les PCB se concentrent dans les sédiments et
// remontent la chaîne chez les poissons de fond, quelle que soit l'espèce. Ce
// n'est donc pas un avis ANSES nominatif comme celui de l'anguille ou de la
// carpe : la règle est portée par les arrêtés préfectoraux, et c'est vers eux
// qu'il faut renvoyer plutôt que d'inventer une recommandation par espèce.
const ARRETE_PCB =
  "Arrêtés préfectoraux d'interdiction/limitation de consommation (PCB) · ANSES, avis « Consommation de poissons d'eau douce et PCB »";
// Lignées décrites par scission récente d'une espèce commune : leur usage
// culinaire est celui de l'espèce sœur, et la source doit le dire — sans quoi
// une extrapolation passerait pour une donnée propre à l'espèce.
const CRYPTIQUE = (soeur: string) =>
  ` · usage rapporté au ${soeur}, dont cette lignée cryptique est indissociable sur le terrain (pas de donnée culinaire propre)`;
// SFMU + littérature médicale (de Haro 2008) nomment explicitement B. barbus ET
// B. meridionalis parmi les barbeaux européens responsables du « choléra des
// barbeaux » (ichtyootoxisme par les œufs) — donc pas une extrapolation.
const SFMU_BARBEAU =
  "SFMU (choléra des barbeaux, sfmu.org/toxin) · de Haro L., Médecine Tropicale 2008;68(4):367-374 — cite nommément B. barbus et B. meridionalis";
// Le même article ne cite que « le brochet » (Esox lucius) ; le brochet aquitain
// (Esox aquitanicus, décrit en 2014) n'a pas été étudié spécifiquement — la note
// ci-dessous est donc formulée comme une précaution par analogie, pas un fait établi.
const ICHTYOOTOX_BROCHET =
  "de Haro L., Médecine Tropicale 2008;68(4):367-374 (toxicité des œufs chez Esox lucius ; E. aquitanicus non étudié spécifiquement — précaution par analogie)";
const ICHTYOHEMO_LAMPROIE =
  "Eve O. et al., Urgence-Pratique (reproduit avec l'autorisation du Dr J.-C. Deslandes) — liste la lamproie parmi les poissons à sang toxique (toxine thermolabile, détruite à 56 °C/15 min)";

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
    prep: "Endémique du Sud-Ouest à fort enjeu de conservation : relâche recommandée ; réglementation « brochet ». Par analogie avec le brochet commun (œufs toxiques/purgatifs) et par précaution — cette espèce n'ayant pas été étudiée spécifiquement — ne consommez jamais les œufs.",
    source: CULINARY + " · " + ICHTYOOTOX_BROCHET,
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
    prep: "Salmonidé pêché des lacs alpins, non protégé par l'arrêté 1988 : réglementation stricte (taille, quota, souvent no-kill). Vérifiez l'arrêté du lac.",
    source: SALMO,
  },
  "coregone-lavaret": {
    status: "réglementé",
    bones: "moyen",
    taste: "Chair blanche fine et délicate, très recherchée en cuisine lacustre.",
    prep: "Salmonidé lacustre pêché, non protégé par l'arrêté 1988 : pêche réglementée dans les grands lacs (taille, quota).",
    source: SALMO,
  },
  ombre: {
    status: "réglementé",
    bones: "moyen",
    taste: "Chair fine et délicate ; légère odeur de thym à la capture.",
    prep: "Salmonidé pêché, non protégé par l'arrêté 1988 : très réglementé (maille élevée, ouverture spécifique possible, souvent no-kill).",
    source: SALMO,
  },

  // ── Cyprinidés & apparentés ──────────────────────────────────
  carassin: {
    status: "oui",
    bones: "beaucoup",
    taste: "Chair molle et arêtée, prenant facilement le goût de vase du milieu où le poisson vit — moins appréciée que celle de la carpe.",
    prep: "Dégorger quelques jours en eau claire améliore nettement le goût. Non listé R432-5 : remise à l'eau possible.",
    source: CULINARY,
  },
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
    prep: "Sang cru toxique (ichtyohémotoxisme, comme la lamproie et le congre) : la toxine est détruite par la cuisson, mais évitez tout contact du sang avec une plaie ou les yeux pendant l'habillage, et ne goûtez jamais la chair crue. En danger critique par ailleurs : pêche strictement encadrée (règlement européen anguille) — ne prélever que là où c'est légal.",
    source: ANSES,
  },
  "grande-alose": {
    status: "réglementé",
    bones: "beaucoup",
    taste: "Chair fine et savoureuse mais extrêmement riche en arêtes (grillée à l'oseille).",
    prep: "Œufs/frayères protégés (arrêté 1988) ; adulte pêché sous moratoire/quota selon le bassin — ne consommer que si la capture est légale.",
    source: MIGRATEUR,
  },
  "alose-feinte-atlantique": {
    status: "réglementé",
    bones: "beaucoup",
    taste: "Comme la grande alose : savoureuse mais très riche en arêtes.",
    prep: "Œufs/frayères protégés (arrêté 1988) ; adulte sous moratoires/quotas locaux — ne consommer que si légal.",
    source: MIGRATEUR,
  },
  "alose-feinte-mediterraneenne": {
    status: "réglementé",
    bones: "beaucoup",
    taste: "Savoureuse mais très riche en arêtes.",
    prep: "Œufs/frayères protégés (arrêté 1988) ; adulte sous restrictions locales — ne consommer que si légal.",
    source: MIGRATEUR,
  },
  "lamproie-marine": {
    status: "réglementé",
    bones: "peu",
    taste: "Chair grasse, dense et charnue, sans arêtes (mets recherché : lamproie à la bordelaise).",
    prep: "Œufs/frayères protégés (arrêté 1988) ; adulte sous moratoires récents (Gironde 2023) — ne consommer que si légal. ⚠️ Sang toxique à l'état cru (ichtyohémotoxisme, comme l'anguille ou le congre) : saignez et cuisez soigneusement (toxine détruite par la chaleur), évitez tout contact avec une plaie ou les yeux.",
    source: MIGRATEUR + " · " + ICHTYOHEMO_LAMPROIE,
  },
  "lamproie-de-riviere": {
    status: "réglementé",
    bones: "peu",
    taste: "Chair grasse et dense, sans arêtes.",
    prep: "Œufs/frayères protégés (arrêté 1988) ; adulte sous restrictions de bassin — ne consommer que si légal. ⚠️ Sang toxique à l'état cru (ichtyohémotoxisme, comme l'anguille ou le congre) : saignez et cuisez soigneusement (toxine détruite par la chaleur), évitez tout contact avec une plaie ou les yeux.",
    source: MIGRATEUR + " · " + ICHTYOHEMO_LAMPROIE,
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
  vandoise: { status: "réglementé", prep: A1988_TXT, source: A1988 },
  "vandoise-rostree": {
    status: "réglementé",
    // No longer "à confirmer": the AFB/OFB note of 22 Feb. 2019 (Poulet, rev.
    // Denys) says a taxon split off after 1988 inherits the listed species'
    // status — so this one carries Leuciscus leuciscus's, eggs and spawning
    // grounds included, and nothing more.
    prep: A1988_TXT,
    source: A1988 + " (statut hérité de Leuciscus leuciscus, note OFB 22 fév. 2019)",
  },
  "vandoise-du-bearn": {
    status: "réglementé",
    prep: A1988_TXT,
    source: A1988 + " (statut hérité de Leuciscus leuciscus, note OFB 22 fév. 2019)",
  },
  "ide-melanote": { status: "réglementé", prep: A1988_TXT, source: A1988 },
  "barbeau-meridional": {
    status: "réglementé",
    prep:
      A1988_TXT +
      " Comme chez le barbeau fluviatile, ses œufs (rogue) sont toxiques (« choléra des barbeaux » : douleurs abdominales, diarrhées, vomissements) — à ne jamais consommer, y compris en cas de confusion entre les deux espèces.",
    source: A1988 + " · " + SFMU_BARBEAU,
  },
  bouviere: { status: "réglementé", prep: A1988_TXT, source: A1988 },
  "apron-du-rhone": {
    status: "non",
    prep: "Protection stricte (Directive Habitats an. IV : capture intentionnelle interdite ; Berne an. II) et danger critique d'extinction — remise à l'eau immédiate de toute capture accidentelle.",
    source: "Directive Habitats an. IV · convention de Berne an. II · " + A1988,
  },
  toxostome: {
    status: "réglementé",
    prep: HABITATS_TXT + " Souvent confondu avec le hotu.",
    source: "Directive Habitats an. II et V",
  },
  "blennie-fluviatile": { status: "réglementé", prep: A1988_TXT, source: A1988 },
  "lamproie-de-planer": { status: "réglementé", prep: A1988_TXT, source: A1988 },
  "loche-d-etang": { status: "réglementé", prep: A1988_TXT, source: A1988 },
  "loche-de-riviere": { status: "réglementé", prep: A1988_TXT, source: A1988 },
  "esturgeon-europeen": {
    status: "non",
    prep: "STRICTEMENT PROTÉGÉ (Acipenser sturio, en danger critique) : capture, détention, transport et vente interdits — relâcher immédiatement toute capture accidentelle.",
    // The arrêté du 25 janv. 1982 previously cited here has been abrogated
    // since 2005-01-07; the text in force is the arrêté du 20 déc. 2004.
    source: "Arrêté du 20 décembre 2004 (JORFTEXT000000259841)",
  },

  // Les deux esturgeons d'élevage échappés. Ils ne sont PAS protégés — et
  // pourtant leur statut ici est « non ». Ce n'est pas une erreur : la
  // littérature les dit indissociables du sturio sans comptage d'écussons, et
  // l'app ne peut pas fabriquer une certitude que le pêcheur n'a pas. Le seul
  // conseil qui reste vrai dans les deux cas est de ne pas consommer.
  //
  // Un chiffre de caviar ou une note de goût ici serait pire qu'inutile : elle
  // donnerait envie de garder un poisson qui est peut-être un sturio.
  "esturgeon-siberien": {
    status: "non",
    prep: "Espèce elle-même non protégée, mais impossible à distinguer avec certitude de l'esturgeon européen (comptage des écussons dorsaux, latéraux et ventraux — affaire de spécialistes), lequel est en danger critique et strictement protégé depuis 2004. Ne consommez pas : relâchez et déclarez la capture sur sturio.eu.",
    source:
      "Arrêté du 20 décembre 2004 (A. sturio) · programme LIFE Sturio / MIGADO (conduite en cas de capture accidentelle) · Observatoire des poissons Seine-Normandie",
  },
  sterlet: {
    status: "non",
    prep: "Espèce elle-même non protégée, mais confusion possible avec l'esturgeon européen, strictement protégé et en danger critique. Ne consommez pas : relâchez et déclarez la capture sur sturio.eu.",
    source:
      "Arrêté du 20 décembre 2004 (A. sturio) · programme LIFE Sturio / MIGADO (conduite en cas de capture accidentelle)",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Espèces « base » restantes.
  //
  // Dernier bloc : les 30 espèces auto-générées qui n'avaient encore aucune
  // entrée ici, et dont la fiche ne disait donc rien de la consommation.
  //
  // Deux règles tenues :
  //   · aucun avis ANSES n'est étendu par ressemblance. L'avis PCB nomme cinq
  //     espèces (anguille, barbeau fluviatile, brème, carpe, silure) ; ni
  //     l'amour blanc, ni la carpe argentée, ni le carassin ne sont de
  //     celles-là, quelle que soit leur allure. Là où le risque est de milieu
  //     et non d'espèce (poisson de fond d'estuaire), c'est dit comme tel et
  //     renvoyé à l'arrêté préfectoral, qui est le vrai porteur de la règle.
  //   · « non » reste un fait légal (protection), jamais un jugement de goût.
  //     Une espèce minuscule mais pêchable est « oui » avec un rendement
  //     honnêtement décrit — comme la perche-soleil plus haut.
  // ═══════════════════════════════════════════════════════════════════════

  // ── Directive Habitats an. II, absentes de l'arrêté du 8 déc. 1988 ──
  blageon: { status: "réglementé", prep: HABITATS_TXT, source: "Directive Habitats an. II" },
  "chabot-commun": {
    status: "réglementé",
    prep: HABITATS_TXT + " Complexe d'espèces.",
    source: "Directive Habitats an. II",
  },
  "chabot-fluviatile": {
    status: "réglementé",
    prep: HABITATS_TXT + " Complexe d'espèces.",
    source: "Directive Habitats an. II",
  },

  // ── Réglementées (pêchables, mais pas partout ni n'importe comment) ──
  "saumon-atlantique": {
    status: "réglementé",
    bones: "peu",
    taste: "Chair rosée, grasse et fine — le poisson le plus prisé des rivières à migrateurs.",
    prep: "Pêche encadrée rivière par rivière : TAC de bassin, timbre migrateur, carnet de capture et marquage obligatoires. En 2026 la pêche est fermée sur la plupart des bassins — ne conservez une capture qu'après avoir vérifié l'arrêté COGEPOMI en vigueur.",
    source: MIGRATEUR,
  },
  "lote-de-riviere": {
    status: "réglementé",
    bones: "peu",
    taste: "Chair blanche ferme et fine, sans arêtes gênantes ; son foie, très gras, a une réputation ancienne de mets rare — le seul gadidé de nos rivières.",
    prep: "Espèce en forte régression, classée vulnérable sur la Liste rouge nationale et protégée par arrêté préfectoral dans plusieurs départements : vérifiez localement avant d'en conserver une.",
    source: CULINARY + " · DORIS (FFESSM) · UICN Liste rouge France (poissons d'eau douce)",
  },
  cristivomer: {
    status: "réglementé",
    bones: "peu",
    taste: "Chair fine, rosée à orangée chez les grands sujets — l'omble des grands lacs profonds.",
    prep: "Maille nationale de 35 cm ; période et quotas fixés par arrêté préfectoral sur les lacs où il est présent.",
    source: CULINARY + " · " + SALMO,
  },
  huchon: {
    status: "réglementé",
    bones: "peu",
    taste: "Chair blanche à rosée, ferme — grand salmonidé danubien.",
    prep: "Maille nationale de 70 cm. Présence française marginale et issue d'introductions : population trop fragile pour être prélevée, la remise à l'eau est la conduite raisonnable.",
    source: CULINARY + " · " + SALMO,
  },
  flet: {
    status: "réglementé",
    bones: "peu",
    taste: "Poisson plat à chair blanche correcte, plus molle et moins fine que celle de la plie.",
    prep: "Poisson de fond d'estuaire, milieu où les PCB se concentrent dans les sédiments : plusieurs estuaires sont sous arrêté préfectoral d'interdiction ou de limitation de consommation — vérifiez avant de consommer une prise. Relève par ailleurs de la réglementation de pêche maritime (maille selon la façade).",
    source: ARRETE_PCB + " · " + CULINARY,
  },

  // ── Petites espèces de friture ───────────────────────────────
  eperlan: {
    status: "oui",
    bones: "moyen",
    taste: "Chair blanche fine et savoureuse, à l'odeur caractéristique de concombre — poisson de friture classique des guinguettes.",
    prep: "Consommé entier en friture, sans être vidé pour les petits sujets. Chair fragile, à cuisiner très frais. Populations en fort déclin : prélevez peu.",
    source: CULINARY,
  },
  vairon: {
    status: "oui",
    bones: "moyen",
    taste: "Petit poisson à chair fine, traditionnellement consommé en friture (« friture de vairons ») dans les régions de tête de bassin.",
    prep: "Consommé entier en friture. Sert aussi d'appât vif classique — son usage comme vif obéit aux règles locales sur le transport de poissons vivants.",
    source: CULINARY,
  },
  spirlin: {
    status: "oui",
    bones: "moyen",
    taste: "Chair fine mais poisson menu (8–12 cm) : intérêt de friture, comme l'ablette.",
    prep: "Consommé entier en friture.",
    source: CULINARY,
  },
  "loche-franche": {
    status: "oui",
    bones: "peu",
    taste: "Petite loche à chair fine, sans écailles ; consommée en friture là où elle est abondante.",
    prep: "À ne pas confondre avec la loche d'étang et la loche de rivière, toutes deux protégées : celles-là se relâchent.",
    source: CULINARY + " · " + A1988,
  },
  "able-de-heckel": {
    status: "oui",
    bones: "moyen",
    taste: "Poisson minuscule (moins de 9 cm) sans intérêt culinaire réel.",
    prep: "En régression marquée dans ses petites eaux stagnantes — mieux vaut le relâcher.",
    source: CULINARY,
  },
  epinoche: {
    status: "oui",
    taste: "Poisson minuscule (5–7 cm) hérissé d'épines dorsales : aucun usage culinaire en France.",
    prep: "Non protégée, mais sans intérêt de consommation — bio-indicateur de la qualité de l'eau.",
    source: CULINARY,
  },
  epinochette: {
    status: "oui",
    taste: "Poisson minuscule (4–6 cm) : aucun usage culinaire en France.",
    prep: "Non protégée, mais sans intérêt de consommation.",
    source: CULINARY,
  },

  // ── Lignées cryptiques : mêmes usages que l'espèce sœur ──────
  // Ces espèces ont été décrites par scission récente d'une espèce commune et
  // sont indissociables d'elle au bord de l'eau. Leur usage culinaire est donc
  // celui de l'espèce sœur — c'est dit explicitement plutôt que présenté comme
  // une donnée propre à chacune.
  "goujon-occitan": {
    status: "oui",
    bones: "moyen",
    taste: "Chair fine et délicate, comme celle du goujon commun dont il est indissociable sur le terrain — excellent poisson de friture.",
    prep: "Consommé entier en friture.",
    source: CULINARY + CRYPTIQUE("goujon commun"),
  },
  "goujon-auvergne": {
    status: "oui",
    bones: "moyen",
    taste: "Chair fine et délicate, comme celle du goujon commun dont il est indissociable sur le terrain — excellent poisson de friture.",
    prep: "Consommé entier en friture.",
    source: CULINARY + CRYPTIQUE("goujon commun"),
  },
  "goujon-ukraine": {
    status: "oui",
    bones: "moyen",
    taste: "Petit goujon (jusqu'à 11 cm) à l'usage culinaire de ses congénères : friture.",
    prep: "Consommé entier en friture.",
    source: CULINARY + CRYPTIQUE("goujon commun"),
  },
  "vairon-basque": {
    status: "oui",
    bones: "moyen",
    taste: "Usage identique à celui du vairon commun : friture.",
    prep: "Consommé entier en friture.",
    source: CULINARY + CRYPTIQUE("vairon commun"),
  },
  "vairon-de-garonne": {
    status: "oui",
    bones: "moyen",
    taste: "Usage identique à celui du vairon commun : friture.",
    prep: "Endémique du bassin Garonne-Adour, décrit en 2020 — population mal connue, prélevez peu.",
    source: CULINARY + CRYPTIQUE("vairon commun"),
  },
  "vairon-du-danube": {
    status: "oui",
    bones: "moyen",
    taste: "Usage identique à celui du vairon commun : friture.",
    prep: "Consommé entier en friture.",
    source: CULINARY + CRYPTIQUE("vairon commun"),
  },
  "vairon-du-languedoc": {
    status: "oui",
    bones: "moyen",
    taste: "Usage identique à celui du vairon commun : friture.",
    prep: "Consommé entier en friture.",
    source: CULINARY + CRYPTIQUE("vairon commun"),
  },

  // ── Cyprinidés introduits ou marginaux ───────────────────────
  vimbe: {
    status: "oui",
    bones: "beaucoup",
    taste: "Chair correcte mais très arêtée ; traditionnellement fumée en Europe de l'Est, où l'espèce est bien plus commune qu'en France.",
    prep: "Inciser les flancs pour sectionner les arêtes, ou fumer. Présence française marginale, limitée au nord-est.",
    source: CULINARY,
  },
  "amour-blanc": {
    status: "oui",
    bones: "beaucoup",
    taste: "Chair blanche correcte, ferme, mais très arêtée — espèce largement consommée en Asie, peu en France.",
    prep: "Nombreuses arêtes intramusculaires : inciser les flancs en croisillons. Introduit pour désherber les plans d'eau et ne s'y reproduisant pas, il n'est présent que là où il a été empoissonné.",
    source: CULINARY,
  },
  "carpe-argentee": {
    status: "oui",
    bones: "beaucoup",
    taste: "Chair blanche fade et extrêmement arêtée ; poisson d'aquaculture ailleurs dans le monde, sans tradition culinaire française.",
    prep: "Arêtes intramusculaires nombreuses et fines : inciser profondément les flancs, ou réserver la chair à des préparations broyées (quenelles, boulettes).",
    source: CULINARY,
  },
  "carassin-argente": {
    status: "oui",
    bones: "beaucoup",
    taste: "Chair molle, arêtée, prenant facilement le goût de vase du milieu où le poisson vit.",
    prep: "Dégorger en eau claire améliore le goût. Introduit et écologiquement envahissant, sans figurer sur la liste R432-5 : sa remise à l'eau n'est donc pas interdite au niveau national, mais un arrêté local peut en disposer autrement.",
    source: CULINARY,
  },
  "poisson-rouge": {
    status: "oui",
    bones: "beaucoup",
    taste: "Même chair molle et arêtée que le carassin argenté, dont il est très proche ; aucun usage culinaire en France.",
    prep: "Établi localement à partir de lâchers d'aquarium et de bassin — un poisson d'ornement relâché, pas une espèce de table.",
    source: CULINARY,
  },

  // ── Introduites envahissantes ────────────────────────────────
  "crapet-de-roche": {
    status: "oui",
    bones: "moyen",
    taste: "Chair blanche fine, comme les autres centrarchidés, mais poisson petit — rendement faible.",
    prep: "Centrarchidé nord-américain introduit, à présence localisée : ne le relâchez pas dans un autre milieu que celui où il a été pris.",
    source: CULINARY,
  },
  gambusie: {
    status: "oui",
    taste: "Poisson minuscule (3–6 cm) : aucun usage culinaire.",
    prep: "Espèce exotique envahissante (règlement UE 1143/2014 · arrêté du 14 février 2018) : introduction et transport interdits — ne pas la relâcher ailleurs, ni la transporter vivante.",
    source: "Règlement (UE) 1143/2014 · arrêté du 14 février 2018 (EEE)",
  },
  pseudorasbora: {
    status: "oui",
    taste: "Poisson minuscule (5–8 cm) : aucun usage culinaire.",
    prep: "Espèce exotique envahissante (règlement UE 1143/2014) : introduction et transport interdits — ne pas la relâcher ailleurs, ni s'en servir de vif. Porteur sain d'un parasite qui touche les poissons, non l'homme : le risque est écologique, pas sanitaire.",
    source: "Règlement (UE) 1143/2014 · arrêté du 14 février 2018 (EEE)",
  },

  // Les quatre gobies ponto-caspiens. Statut légal distinct du pseudorasbora et
  // de la gambusie ci-dessus : ils ne sont PAS listés au règlement UE 1143/2014
  // (considérés indigènes du sud-est de l'aire biogéographique européenne),
  // leur interdiction d'introduction relève de l'art. L432-10 du code de
  // l'environnement (voir data/fiches/autres.ts pour le détail). Citer
  // « règlement UE 1143/2014 » ici serait une base légale fausse.
  "gobie-demi-lune": {
    status: "oui",
    taste: "Poisson minuscule (jusqu'à 9 cm) : aucun usage culinaire.",
    prep: "Introduction et transport interdits ailleurs qu'au point de capture (art. L432-10 du code de l'environnement) : ne pas s'en servir de vif hors du plan d'eau où il a été pris.",
    source: "Art. L432-10 code de l'environnement · arrêté du 17 décembre 1985",
  },
  "gobie-de-kessler": {
    status: "oui",
    taste: "Poisson petit (jusqu'à 22 cm) et osseux : aucun usage culinaire connu en France.",
    prep: "Introduction et transport interdits ailleurs qu'au point de capture (art. L432-10 du code de l'environnement) : ne pas s'en servir de vif hors du plan d'eau où il a été pris.",
    source: "Art. L432-10 code de l'environnement · arrêté du 17 décembre 1985",
  },
  "gobie-a-taches-noires": {
    status: "oui",
    taste: "Poisson petit (jusqu'à 35 cm) : aucun usage culinaire en France, malgré une pêche commerciale dans son aire d'origine.",
    prep: "Introduction et transport interdits ailleurs qu'au point de capture (art. L432-10 du code de l'environnement) : ne pas s'en servir de vif hors du plan d'eau où il a été pris.",
    source: "Art. L432-10 code de l'environnement · arrêté du 17 décembre 1985",
  },
  "gobie-fluviatile": {
    status: "oui",
    taste: "Poisson minuscule (jusqu'à 20 cm) : aucun usage culinaire en France.",
    prep: "Introduction et transport interdits ailleurs qu'au point de capture (art. L432-10 du code de l'environnement) : ne pas s'en servir de vif hors du plan d'eau où il a été pris.",
    source: "Art. L432-10 code de l'environnement · arrêté du 17 décembre 1985",
  },

  "carpe-a-grosse-tete": {
    status: "oui",
    bones: "beaucoup",
    taste: "Chair blanche filtreuse comparable à celle de la carpe argentée, peu prisée en France faute de tradition culinaire locale.",
    prep: "Comme la carpe argentée : arêtes intramusculaires nombreuses et fines, inciser profondément ou réserver à des préparations broyées.",
    source: CULINARY,
  },
  "tete-de-boule": {
    status: "oui",
    taste: "Poisson minuscule (jusqu'à 10 cm) : aucun usage culinaire.",
    prep: "Non représenté sur la liste des espèces autorisées (arrêté du 17 déc. 1985) : ne l'introduisez pas ailleurs, y compris comme vif (art. L432-10).",
    source: "Art. L432-10 code de l'environnement · arrêté du 17 décembre 1985",
  },
  "umbre-pygmee": {
    status: "oui",
    taste: "Poisson minuscule (jusqu'à 15 cm), discret et rare : aucun usage culinaire, aucune raison de le prélever.",
    prep: "Naturalisé localement depuis plus d'un siècle sans mesure de gestion connue à ce jour ; sa rareté justifie à elle seule de le relâcher.",
    source: CULINARY,
  },
  guppy: {
    status: "oui",
    taste: "Poisson minuscule (quelques centimètres) : aucun usage culinaire.",
    prep: "Ne subsiste en France métropolitaine que dans de très rares refuges d'eau chaude — sa population connue est trop localisée pour justifier un prélèvement.",
    source: CULINARY,
  },
  "loche-asiatique": {
    status: "oui",
    taste: "Petite loche introduite : pas de tradition culinaire française.",
    prep: "Issue du commerce aquariophile ; ne pas la transporter vivante vers un autre plan d'eau. Vérifiez d'abord qu'il ne s'agit pas de la loche d'étang, protégée (voir Identification).",
    source: CULINARY,
  },
  "loche-a-grandes-ecailles": {
    status: "oui",
    taste: "Un seul individu jamais signalé en France : aucun usage culinaire à documenter.",
    prep: "Vérifiez d'abord qu'il ne s'agit pas de la loche d'étang, protégée (voir Identification) — la ressemblance est la première chose à trancher, avant toute question de consommation.",
    source: "Cuinet et al. (2024), BioInvasions Records 13(2):541-550",
  },

  "bar-commun": {
    status: "réglementé",
    bones: "peu",
    taste: "Chair blanche ferme et délicate — l'un des poissons les plus recherchés des côtes françaises.",
    prep: "Espèce en régression : régie par la pêche maritime de loisir (taille, quota et périodes selon la façade, révisés chaque année), pas par la réglementation eau douce de cette fiche, que cette application ne couvre pas. Renseignez-vous auprès des textes de pêche maritime en vigueur avant de conserver une capture.",
    source: CULINARY,
  },
  "mulet-sauteur": {
    status: "réglementé",
    bones: "moyen",
    taste: "Chair blanche correcte, comme les autres mulets, moins recherchée que celle du mulet cabot.",
    prep: "Relève de la réglementation de pêche maritime/estuarienne, comme les autres mulets du catalogue.",
    source: CULINARY,
  },
  joel: {
    status: "oui",
    bones: "peu",
    taste: "Chair fine, traditionnellement frite entière avec l'anchois et la sardine dans les étangs méditerranéens.",
    prep: "Poisson minuscule pêché en bancs à la senne ; se cuisine entier, sans écailler ni vider.",
    source: CULINARY,
  },
  "gobie-tachete": {
    status: "oui",
    taste: "Poisson minuscule (jusqu'à 6 cm) : aucun usage culinaire.",
    prep: "Espèce native, sans intérêt de consommation — à ne pas confondre avec les gobies ponto-caspiens invasifs (voir Identification).",
    source: CULINARY,
  },
  "gobie-des-sables": {
    status: "oui",
    taste: "Petit poisson côtier : aucun usage culinaire.",
    prep: "Espèce native, sans intérêt de consommation — à ne pas confondre avec les gobies ponto-caspiens invasifs (voir Identification).",
    source: CULINARY,
  },
  syngnathe: {
    status: "oui",
    taste: "Corps cuirassé filiforme : aucun usage culinaire.",
    prep: "Espèce native sans intérêt de consommation ; museau tubulaire et corps cuirassé le rendent de toute façon impropre à la préparation.",
    source: CULINARY,
  },

  // ── Chabots cryptiques et endémiques — même régime que le chabot commun ──
  "chabot-du-bearn": {
    status: "réglementé",
    prep: HABITATS_TXT + " Complexe d'espèces.",
    source: "Directive Habitats an. II",
  },
  "chabot-d-auvergne": {
    status: "réglementé",
    prep: HABITATS_TXT + " Complexe d'espèces.",
    source: "Directive Habitats an. II",
  },
  "chabot-des-pyrenees": {
    status: "réglementé",
    prep: HABITATS_TXT + " Complexe d'espèces.",
    source: "Directive Habitats an. II",
  },
  "chabot-du-lez": {
    status: "réglementé",
    prep:
      HABITATS_TXT +
      " Endémique d'un unique tronçon de 3 km à la source du Lez (Hérault), en danger critique (UICN CR) : remise à l'eau immédiate conseillée en priorité.",
    source: "Directive Habitats an. II",
  },
  "chabot-de-rhenanie": {
    status: "réglementé",
    prep: HABITATS_TXT + " Complexe d'espèces.",
    source: "Directive Habitats an. II",
  },

  "aphanius-de-corse": {
    status: "oui",
    taste: "Poisson minuscule (jusqu'à 7 cm), endémique corse : aucun usage culinaire, aucune raison de le prélever.",
    prep: "Quasi menacé (UICN NT) : sa rareté justifie à elle seule de le relâcher.",
    source: CULINARY,
  },
  "goujon-de-l-adour": {
    status: "oui",
    bones: "moyen",
    taste: "Chair fine et délicate, comme celle du goujon commun dont cette lignée est indissociable au bord de l'eau — excellent poisson de friture.",
    prep: "Consommé entier en friture.",
    source: CULINARY + CRYPTIQUE("goujon commun"),
  },
  "vandoise-au-long-museau": {
    status: "oui",
    bones: "moyen",
    taste: "Chair blanche correcte, arêtée comme les autres vandoises.",
    prep: "Endémique à aire restreinte (bassins Lot-Tarn-Dordogne-Garonne) : prélevez peu, une population locale mal connue mérite la prudence.",
    source: CULINARY,
  },
  "blageon-italien": {
    status: "oui",
    bones: "moyen",
    taste: "Chair fine mais poisson menu, comme le blageon commun.",
    prep: "Présent en France uniquement dans les Alpes-Maritimes : population marginale, prélevez peu.",
    source: CULINARY,
  },
  "breme-du-danube": {
    status: "oui",
    bones: "beaucoup",
    taste: "Chair comparable aux autres brèmes, arêtée.",
    prep: "Introduite et très localisée (Alsace, mentions occasionnelles en Bourgogne) : sans intérêt particulier à cibler.",
    source: CULINARY,
  },
  "epirine-lippue": {
    status: "oui",
    bones: "moyen",
    taste: "Poisson introduit sans tradition culinaire française.",
    prep: "Présence isolée dans le Sud-Ouest et l'Aude, d'origine accidentelle : sans intérêt particulier à cibler.",
    source: CULINARY,
  },

  "truite-corse": {
    status: "réglementé",
    bones: "moyen",
    taste: "Chair fine, comme la truite fario dont elle est proche.",
    prep: "En danger critique (UICN CR), menacée par l'introgression génétique de la truite fario introduite : remise à l'eau recommandée malgré l'absence de statut de protection distinct.",
    source: CULINARY,
  },
  "truite-du-rhone": {
    status: "oui",
    bones: "moyen",
    taste: "Chair fine, comme la truite fario dont la validité en tant qu'espèce distincte est débattue.",
    prep: "Réglementée comme la truite fario (maille, période 1ʳᵉ catégorie).",
    source: CULINARY,
  },
  "ombre-d-auvergne": {
    status: "réglementé",
    bones: "peu",
    taste: "Chair fine, comme l'ombre commun dont elle est très proche.",
    prep: "Seulement huit populations connues, en danger : remise à l'eau recommandée malgré l'absence de statut de protection distinct — et attention à ne pas la confondre avec l'ombre commun introduit localement.",
    source: CULINARY,
  },
  "coregone-blanc": {
    status: "oui",
    bones: "moyen",
    taste: "Chair blanche fine et délicate, comme le corégone lavaret dont elle est difficile à distinguer.",
    prep: "Lever les filets ; cuisson courte à la meunière ou au four.",
    source: CULINARY,
  },
  palee: {
    status: "oui",
    bones: "moyen",
    taste: "Chair blanche fine, comme les autres corégones du complexe.",
    prep: "Lever les filets ; cuisson courte à la meunière ou au four. « Palée » désigne selon le lac plusieurs espèces différentes — ne pas se fier au seul nom vernaculaire.",
    source: CULINARY,
  },
  "vairon-ligerien": {
    status: "oui",
    bones: "moyen",
    taste: "Usage identique à celui du vairon commun : friture.",
    prep: "Consommé entier en friture.",
    source: CULINARY + CRYPTIQUE("vairon commun"),
  },
  "vairon-italien": {
    status: "oui",
    taste: "Un seul individu jamais signalé en France : aucun usage culinaire à documenter.",
    prep: "Statut de population inconnu — sans intérêt à cibler.",
    source: "GBIF · Denys & al. — premier signalement français (2010)",
  },

  "loche-d-espagne": {
    status: "oui",
    taste: "Chair comparable à la loche franche dont cette lignée est indissociable au bord de l'eau.",
    prep: "Population restreinte au bassin de l'Adour : sans intérêt particulier à cibler.",
    source: CULINARY + CRYPTIQUE("loche franche"),
  },
  "loche-leopard": {
    status: "oui",
    taste: "Chair comparable à la loche franche dont cette lignée est indissociable au bord de l'eau.",
    prep: "Endémique à aire restreinte (Tech, Têt) : prélevez peu.",
    source: CULINARY + CRYPTIQUE("loche franche"),
  },
  "loche-du-lez": {
    status: "oui",
    taste: "Chair comparable à la loche franche dont cette lignée est indissociable au bord de l'eau.",
    prep: "Ne pas confondre avec le chabot du Lez (Cottus petiti), protégé — deux espèces sans rapport qui partagent le même nom de rivière.",
    source: CULINARY + CRYPTIQUE("loche franche"),
  },
  "loche-transalpine": {
    status: "oui",
    taste: "Petite loche introduite, sans tradition culinaire française.",
    prep: "Présence isolée en basse Durance depuis 1995 : sans intérêt particulier à cibler. Vérifiez d'abord qu'il ne s'agit pas de la loche de rivière, protégée.",
    source: CULINARY,
  },
  "epinochette-neuf-epines": {
    status: "oui",
    taste: "Poisson minuscule : aucun usage culinaire.",
    prep: "Porte le même nom vernaculaire que l'épinochette (Pungitius laevis) déjà au catalogue, mais c'est une espèce distincte — sans intérêt de consommation dans les deux cas.",
    source: CULINARY,
  },
  "epinochette-du-poitou": {
    status: "oui",
    taste: "Poisson minuscule (moins de 5 cm), endémique du Centre-Ouest : aucun usage culinaire.",
    prep: "Quasi menacée (UICN NT) : sa rareté justifie à elle seule de la relâcher.",
    source: CULINARY,
  },
  "carpe-koi-sauvage": {
    status: "oui",
    bones: "beaucoup",
    taste: "Chair comparable à la carpe commune, dont la plupart des individus rencontrés en France sont d'ailleurs des hybrides.",
    prep: "Arêtes intramusculaires comme la carpe commune : inciser les flancs en croisillons.",
    source: CULINARY,
  },
  "rotengle-italien": {
    status: "oui",
    bones: "beaucoup",
    taste: "Chair comparable au rotengle commun, arêtée.",
    prep: "Présence française limitée à une extension frontalière avec l'Italie : sans intérêt particulier à cibler.",
    source: CULINARY,
  },
  "saumon-rose": {
    status: "réglementé",
    bones: "peu",
    taste: "Chair rosée à orangée, comestible et couramment consommée (pêchée commercialement en Russie et en Amérique du Nord).",
    prep: "En France, la consigne officielle est de GARDER la capture (par précaution, pour freiner l'implantation de l'espèce) et de la signaler avec échantillon d'écailles et tête pour analyse — voir la section Pêcher pour la procédure complète.",
    source: "CDR-EEE · INRAE · Observatoire des poissons migrateurs de Bretagne",
  },
  "brochet-italien": {
    status: "réglementé",
    bones: "beaucoup",
    taste: "Chair comparable au brochet commun.",
    prep: "Vulnérable (UICN VU) et en déclin par hybridation avec le brochet commun : remise à l'eau recommandée malgré l'absence de statut de protection distinct.",
    source: CULINARY,
  },
};
