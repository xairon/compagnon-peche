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
];
