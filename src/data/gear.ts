// Tacklebox reference data: gear categories + a buyer's/beginner's guide to the
// right baits, hooks, lures and lines. Educational reference (common knowledge).

export type GearCategory =
  | "canne"
  | "moulinet"
  | "ligne"
  | "leurre"
  | "appat"
  | "hamecon"
  | "flotteur"
  | "plomb"
  | "accessoire";

export const GEAR_CATEGORIES: { id: GearCategory; label: string }[] = [
  { id: "canne", label: "Cannes" },
  { id: "moulinet", label: "Moulinets" },
  { id: "ligne", label: "Fils & lignes" },
  { id: "leurre", label: "Leurres" },
  { id: "appat", label: "Appâts" },
  { id: "hamecon", label: "Hameçons" },
  { id: "flotteur", label: "Flotteurs" },
  { id: "plomb", label: "Plombs & lestes" },
  { id: "accessoire", label: "Accessoires" },
];

export const CAT_LABEL: Record<GearCategory, string> = Object.fromEntries(
  GEAR_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<GearCategory, string>;

export interface GuideEntry {
  name: string;
  detail: string;
}
export interface GuideSection {
  title: string;
  intro?: string;
  entries: GuideEntry[];
}

export const GEAR_GUIDE: GuideSection[] = [
  {
    title: "Appâts naturels",
    intro: "Le bon appât dépend du poisson visé et de la saison.",
    entries: [
      { name: "Ver de terre / lombric", detail: "Le plus polyvalent : truite, perche, brème, tanche, anguille, chevesne." },
      { name: "Asticot & pinkie", detail: "Poissons blancs (gardon, ablette, brème) à la pêche au coup." },
      { name: "Teigne / ver de farine", detail: "Truite au toc, perche, poissons de rivière." },
      { name: "Maïs doux", detail: "Carpe, tanche, gardon, brème ; sélectif et économique." },
      { name: "Pain / pâte", detail: "Chevesne, carpe, gardon ; à l'esche ou en amorçage." },
      { name: "Bouillette", detail: "Pêche de la carpe à la ligne plombée (montage cheveu)." },
      { name: "Vif (petit poisson vivant)", detail: "Carnassiers (brochet, sandre, perche) — respectez les espèces autorisées localement." },
      { name: "Vers marins (dur, arénicole)", detail: "Espèces d'estuaire (flet, mulet) en zone amphihaline." },
    ],
  },
  {
    title: "Leurres",
    entries: [
      { name: "Leurre souple (shad, finesse, virgule)", detail: "Sandre, perche, brochet, black-bass ; monté sur tête plombée." },
      { name: "Poisson-nageur (crank, jerk, minnow)", detail: "Leurre dur à bavette qui nage et plonge ; brochet, perche, truite." },
      { name: "Cuiller tournante", detail: "Palette qui tourne, très visuelle ; truite, perche, chevesne." },
      { name: "Cuiller ondulante", detail: "Métal qui ondule ; brochet, truite de lac." },
      { name: "Spinnerbait / chatterbait", detail: "Bras + palette anti-herbe ; brochet, black-bass dans le couvert." },
      { name: "Popper / stickbait (surface)", detail: "Attaques spectaculaires en surface ; black-bass, chevesne, perche." },
      { name: "Leurre de traîne / jig", detail: "Pêche verticale ou profonde ; sandre, perche, silure." },
    ],
  },
  {
    title: "Hameçons — tailles",
    intro:
      "Numérotation inversée : plus le numéro est grand, plus l'hameçon est petit. Au-delà de 1, on passe aux tailles « /0 » qui grossissent.",
    entries: [
      { name: "N° 20 à 14 (très petits)", detail: "Ablette, gardon, petits blancs, esches fines." },
      { name: "N° 12 à 8 (petits/moyens)", detail: "Gardon, brème, tanche, truite au ver." },
      { name: "N° 6 à 2 (moyens)", detail: "Carpe, barbeau, gros vers, bouillettes." },
      { name: "N° 1 à 2/0 (gros)", detail: "Carnassiers au vif/leurre souple, black-bass." },
      { name: "3/0 à 8/0 (très gros)", detail: "Brochet, silure ; montages puissants." },
      { name: "Simple / triple", detail: "Triple sur poissons-nageurs ; simple pour le no-kill (moins de dégâts)." },
      { name: "Sans ardillon (barbless)", detail: "Décrochage facile, obligatoire sur certains parcours no-kill." },
    ],
  },
  {
    title: "Fils & lignes",
    entries: [
      { name: "Nylon (monofilament)", detail: "Élastique, économique, polyvalent débutant ; corps de ligne au coup." },
      { name: "Fluorocarbone", detail: "Quasi invisible et résistant à l'abrasion ; bas de ligne aux leurres." },
      { name: "Tresse", detail: "Très fine, sans élasticité, grande sensibilité ; pêche aux leurres, souvent + bas de ligne fluoro." },
      { name: "Bas de ligne acier / titane", detail: "Indispensable pour le brochet (dents) et le silure." },
    ],
  },
];
