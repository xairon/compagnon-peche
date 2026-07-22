// Morphological traits for the guided identifier — documented field-guide facts
// (body form, barbels, adipose fin, mouth position, dorsal fin, adult size), not
// estimates. A trait left `undefined` means "not asserted here" — the engine then
// never excludes that species on that question (honest handling of partial data).
//
// Sources: standard European freshwater ichthyology (Keith & Allardi, Muus &
// Dahlström, FishBase). Family-level facts (e.g. every salmonid has an adipose
// fin; crucian carps have NO barbels; Silurus has none while Ameiurus has one)
// are used deliberately.

export type Silhouette = "serpentiforme" | "allonge" | "fusiforme" | "trapu" | "plat";
export type Barb = "0" | "2" | "4" | "6+";
export type Bouche = "infere" | "terminale" | "supere" | "gueule" | "ventouse";
export type Dorsale = "une" | "deux" | "epineuse";
export type Taille = "petit" | "moyen" | "grand" | "tres-grand";

export interface IdTrait {
  silhouette?: Silhouette;
  barb?: Barb;
  adipeuse?: boolean;
  bouche?: Bouche;
  dorsale?: Dorsale;
  taille?: Taille;
}

export type TraitKey = keyof IdTrait;

export interface TraitOption {
  val: string;
  label: string;
  sub?: string; // example species / hint
  icon?: string; // SVG path (silhouette only)
}

export interface TraitMeta {
  key: TraitKey;
  title: string;
  hint?: string;
  options: TraitOption[];
}

const SHAPE_ICONS: Record<string, string> = {
  serpentiforme: "M2 14c5-6 8 4 13-2s8 4 13-2 8 2 12-2",
  allonge: "M3 12c8-2.5 30-2.5 38 0c-8 2.5-30 2.5-38 0z",
  fusiforme: "M6 12c5-5 22-5 32 0c-10 5-27 5-32 0z",
  trapu: "M10 12c3-8 18-8 24 0c-6 8-21 8-24 0z",
  plat: "M4 12c6-4 30-4 36 0c-6 4-30 4-36 0z",
};

// Question catalogue. The engine only shows a question when it still splits the
// remaining candidates, and only the options at least one candidate actually has.
export const TRAIT_META: TraitMeta[] = [
  {
    key: "silhouette",
    title: "Silhouette générale",
    hint: "La forme d'ensemble du corps, vue de côté",
    options: [
      { val: "serpentiforme", label: "Serpentiforme", sub: "anguille, lamproie", icon: SHAPE_ICONS.serpentiforme },
      { val: "allonge", label: "Allongé, élancé", sub: "brochet, barbeau, silure", icon: SHAPE_ICONS.allonge },
      { val: "fusiforme", label: "Fuselé (torpille)", sub: "truite, gardon, chevesne", icon: SHAPE_ICONS.fusiforme },
      { val: "trapu", label: "Haut & large", sub: "carpe, brème, perche", icon: SHAPE_ICONS.trapu },
      { val: "plat", label: "Aplati (poisson plat)", sub: "flet", icon: SHAPE_ICONS.plat },
    ],
  },
  {
    key: "barb",
    title: "Barbillons (moustaches)",
    hint: "Les petits filaments autour de la bouche",
    options: [
      { val: "0", label: "Aucun", sub: "la plupart des poissons" },
      { val: "2", label: "2 barbillons", sub: "goujon, tanche" },
      { val: "4", label: "4 barbillons", sub: "carpe, barbeau, esturgeon" },
      { val: "6+", label: "6 ou plus", sub: "silure, poisson-chat, loche" },
    ],
  },
  {
    key: "bouche",
    title: "Bouche",
    hint: "Sa position et sa forme",
    options: [
      { val: "gueule", label: "Grande gueule de prédateur", sub: "brochet, sandre, silure" },
      { val: "terminale", label: "Au bout, droite", sub: "gardon, truite" },
      { val: "infere", label: "Vers le bas (fouit le fond)", sub: "barbeau, brème, hotu" },
      { val: "supere", label: "Vers le haut", sub: "rotengle, ablette" },
      { val: "ventouse", label: "Ventouse ronde, sans mâchoire", sub: "lamproies" },
    ],
  },
  {
    key: "adipeuse",
    title: "Nageoire adipeuse",
    hint: "Une petite nageoire charnue entre la dorsale et la queue",
    options: [
      { val: "oui", label: "Présente", sub: "truites, ombre, poisson-chat" },
      { val: "non", label: "Absente" },
    ],
  },
  {
    key: "dorsale",
    title: "Nageoire(s) dorsale(s)",
    hint: "Sur le dos",
    options: [
      { val: "une", label: "Une seule, souple" },
      { val: "deux", label: "Deux séparées", sub: "perche, sandre, mulet" },
      { val: "epineuse", label: "À rayons épineux", sub: "black-bass, perche-soleil, épinoche" },
    ],
  },
  {
    key: "taille",
    title: "Taille adulte courante",
    options: [
      { val: "petit", label: "Moins de 20 cm", sub: "goujon, vairon, ablette" },
      { val: "moyen", label: "20 à 45 cm", sub: "gardon, truite, perche" },
      { val: "grand", label: "45 à 90 cm", sub: "brochet, carpe, barbeau" },
      { val: "tres-grand", label: "Plus de 90 cm", sub: "silure, esturgeon" },
    ],
  },
];

// Per-species traits. Only assert what is documented; omit the rest.
export const ID_TRAITS: Record<string, IdTrait> = {
  // ── Carnassiers / Percidés / Centrarchidés ──
  sandre: { silhouette: "allonge", barb: "0", adipeuse: false, bouche: "gueule", dorsale: "deux", taille: "grand" },
  brochet: { silhouette: "allonge", barb: "0", adipeuse: false, bouche: "gueule", dorsale: "une", taille: "tres-grand" },
  "brochet-aquitain": { silhouette: "allonge", barb: "0", adipeuse: false, bouche: "gueule", dorsale: "une", taille: "grand" },
  silure: { silhouette: "allonge", barb: "6+", adipeuse: false, bouche: "gueule", dorsale: "une", taille: "tres-grand" },
  perche: { silhouette: "trapu", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "deux", taille: "moyen" },
  gremille: { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "infere", dorsale: "epineuse", taille: "petit" },
  "black-bass": { silhouette: "trapu", barb: "0", adipeuse: false, bouche: "gueule", dorsale: "epineuse", taille: "grand" },
  "black-bass-petite-bouche": { silhouette: "allonge", barb: "0", adipeuse: false, bouche: "gueule", dorsale: "epineuse", taille: "moyen" },
  aspe: { silhouette: "allonge", barb: "0", adipeuse: false, bouche: "gueule", dorsale: "une", taille: "grand" },
  "apron-du-rhone": { silhouette: "allonge", barb: "0", adipeuse: false, bouche: "infere", dorsale: "deux", taille: "petit" },

  // ── Salmonidés (adipeuse présente, dorsale simple, sans barbillon) ──
  "truite-fario": { silhouette: "fusiforme", barb: "0", adipeuse: true, bouche: "terminale", dorsale: "une", taille: "moyen" },
  "truite-arc-en-ciel": { silhouette: "fusiforme", barb: "0", adipeuse: true, bouche: "terminale", dorsale: "une", taille: "grand" },
  "omble-fontaine": { silhouette: "fusiforme", barb: "0", adipeuse: true, bouche: "terminale", dorsale: "une", taille: "moyen" },
  "omble-chevalier": { silhouette: "fusiforme", barb: "0", adipeuse: true, bouche: "terminale", dorsale: "une", taille: "grand" },
  ombre: { silhouette: "fusiforme", barb: "0", adipeuse: true, bouche: "infere", dorsale: "une", taille: "moyen" },
  "coregone-lavaret": { silhouette: "fusiforme", barb: "0", adipeuse: true, bouche: "terminale", dorsale: "une", taille: "moyen" },
  cristivomer: { silhouette: "fusiforme", barb: "0", adipeuse: true, bouche: "terminale", dorsale: "une", taille: "grand" },
  huchon: { silhouette: "allonge", barb: "0", adipeuse: true, bouche: "gueule", dorsale: "une", taille: "tres-grand" },
  "saumon-atlantique": { silhouette: "fusiforme", barb: "0", adipeuse: true, bouche: "terminale", dorsale: "une", taille: "grand" },

  // ── Cyprinidés ──
  carpe: { silhouette: "trapu", barb: "4", adipeuse: false, bouche: "infere", dorsale: "une", taille: "tres-grand" },
  carassin: { silhouette: "trapu", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "moyen" },
  "carassin-argente": { silhouette: "trapu", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "moyen" },
  "poisson-rouge": { silhouette: "trapu", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "moyen" },
  "amour-blanc": { silhouette: "allonge", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "tres-grand" },
  "carpe-argentee": { silhouette: "trapu", barb: "0", adipeuse: false, bouche: "supere", dorsale: "une", taille: "tres-grand" },
  gardon: { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "moyen" },
  rotengle: { silhouette: "trapu", barb: "0", adipeuse: false, bouche: "supere", dorsale: "une", taille: "moyen" },
  breme: { silhouette: "trapu", barb: "0", adipeuse: false, bouche: "infere", dorsale: "une", taille: "grand" },
  "breme-bordeliere": { silhouette: "trapu", barb: "0", adipeuse: false, bouche: "infere", dorsale: "une", taille: "moyen" },
  tanche: { silhouette: "trapu", barb: "2", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "grand" },
  barbeau: { silhouette: "allonge", barb: "4", adipeuse: false, bouche: "infere", dorsale: "une", taille: "grand" },
  "barbeau-meridional": { silhouette: "allonge", barb: "4", adipeuse: false, bouche: "infere", dorsale: "une", taille: "moyen" },
  goujon: { silhouette: "allonge", barb: "2", adipeuse: false, bouche: "infere", dorsale: "une", taille: "petit" },
  "goujon-auvergne": { silhouette: "allonge", barb: "2", adipeuse: false, bouche: "infere", dorsale: "une", taille: "petit" },
  "goujon-ukraine": { silhouette: "allonge", barb: "2", adipeuse: false, bouche: "infere", dorsale: "une", taille: "petit" },
  "goujon-occitan": { silhouette: "allonge", barb: "2", adipeuse: false, bouche: "infere", dorsale: "une", taille: "petit" },
  chevesne: { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "gueule", dorsale: "une", taille: "grand" },
  "chevesne-catalan": { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "moyen" },
  vandoise: { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "moyen" },
  "vandoise-rostree": { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "moyen" },
  "ide-melanote": { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "grand" },
  ablette: { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "supere", dorsale: "une", taille: "petit" },
  spirlin: { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "petit" },
  "able-de-heckel": { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "supere", dorsale: "une", taille: "petit" },
  hotu: { silhouette: "allonge", barb: "0", adipeuse: false, bouche: "infere", dorsale: "une", taille: "moyen" },
  toxostome: { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "infere", dorsale: "une", taille: "moyen" },
  blageon: { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "petit" },
  pseudorasbora: { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "supere", dorsale: "une", taille: "petit" },

  // ── Migrateurs ──
  anguille: { silhouette: "serpentiforme", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "grand" },
  "lamproie-marine": { silhouette: "serpentiforme", barb: "0", adipeuse: false, bouche: "ventouse", taille: "grand" },
  "lamproie-de-riviere": { silhouette: "serpentiforme", barb: "0", adipeuse: false, bouche: "ventouse", taille: "moyen" },
  "lamproie-de-planer": { silhouette: "serpentiforme", barb: "0", adipeuse: false, bouche: "ventouse", taille: "petit" },
  "grande-alose": { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "grand" },
  "alose-feinte-atlantique": { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "grand" },
  "alose-feinte-mediterraneenne": { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "grand" },
  "esturgeon-europeen": { silhouette: "allonge", barb: "4", adipeuse: false, bouche: "infere", dorsale: "une", taille: "tres-grand" },
  flet: { silhouette: "plat", barb: "0", adipeuse: false, bouche: "terminale", taille: "grand" },
  "mulet-cabot": { silhouette: "allonge", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "deux", taille: "grand" },
  "mulet-dore": { silhouette: "allonge", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "deux", taille: "grand" },
  "mulet-lippu": { silhouette: "allonge", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "deux", taille: "grand" },
  "mulet-porc": { silhouette: "allonge", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "deux", taille: "grand" },

  // ── Autres ──
  "perche-soleil": { silhouette: "trapu", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "epineuse", taille: "petit" },
  "poisson-chat": { silhouette: "allonge", barb: "6+", adipeuse: true, bouche: "gueule", dorsale: "une", taille: "moyen" },
  "chabot-commun": { silhouette: "allonge", barb: "0", adipeuse: false, bouche: "gueule", dorsale: "deux", taille: "petit" },
  "chabot-fluviatile": { silhouette: "allonge", barb: "0", adipeuse: false, bouche: "gueule", dorsale: "deux", taille: "petit" },
  "blennie-fluviatile": { silhouette: "serpentiforme", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "petit" },
  epinoche: { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "supere", dorsale: "epineuse", taille: "petit" },
  epinochette: { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "supere", dorsale: "epineuse", taille: "petit" },
  gambusie: { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "supere", dorsale: "une", taille: "petit" },
  "loche-franche": { silhouette: "allonge", barb: "6+", adipeuse: false, bouche: "infere", dorsale: "une", taille: "petit" },
  "loche-de-riviere": { silhouette: "allonge", barb: "6+", adipeuse: false, bouche: "infere", dorsale: "une", taille: "petit" },
  "loche-d-etang": { silhouette: "serpentiforme", barb: "6+", adipeuse: false, bouche: "infere", dorsale: "une", taille: "moyen" },
  bouviere: { silhouette: "trapu", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "petit" },
  vairon: { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "petit" },
  "vairon-basque": { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "petit" },
  "vairon-de-garonne": { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "petit" },
  "vairon-du-danube": { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "petit" },
  "vairon-du-languedoc": { silhouette: "fusiforme", barb: "0", adipeuse: false, bouche: "terminale", dorsale: "une", taille: "petit" },
};
