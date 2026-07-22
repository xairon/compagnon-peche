// Domain model for the freshwater-fishing companion.
// Regulatory and health data is sourced (Legifrance, ANSES, R432-5), never invented;
// any value not verified is left null or flagged so the UI says "à vérifier".

export type SpeciesGroup =
  | "carnassiers"
  | "cyprinides"
  | "salmonides"
  | "migrateurs"
  | "autres";

export type Rating = "Excellent" | "Bon" | "Médiocre" | "Déconseillé" | "Interdit";
export type RatingClass = "good" | "warn" | "bad";

/** How the open/closed season is computed for a species. */
export type SeasonRule = "toujours" | "cat1" | "brochet" | "invasive-year";

export interface Confusion {
  n: string; // name of the confusable species
  how: string; // how to tell them apart
}

/** A sub-preparation of a complex dish (a sauce, a farce, quenelles…). */
export interface RecipeComponent {
  title: string;
  ing: string[];
  steps: string[];
}

export interface Recipe {
  id: string;
  species: string[]; // species ids this recipe applies to (allows substitution)
  title: string;
  origin: string;
  author?: string; // chef or book author
  source?: string; // precise citation (book + year, chef, press)
  year?: number;
  difficulty: 1 | 2 | 3; // 1 facile · 2 moyen · 3 difficile
  prep: number; // minutes
  cook: number; // minutes
  rest?: number; // minutes (maturation / repos)
  bivouac?: boolean; // realizable on the bank with minimal gear
  tools?: string[];
  techniques?: string[]; // technique ids used (e.g. "ikejime", "arete-oseille")
  safety?: string | null; // sanitary note (raw → freezing, etc.)
  intro?: string; // historical / culinary note
  ing: string[];
  steps: string[];
  components?: RecipeComponent[];
}

/** A reusable culinary / handling technique (ikejime, garum, désarêtage…). */
export interface Technique {
  id: string;
  name: string;
  category: "abattage" | "preparation" | "conservation" | "cuisson";
  summary: string;
  steps: { title: string; detail: string; tool?: string | null; goal?: string | null }[];
  tools?: string[];
  safety?: string | null;
  source?: string;
  speciesNote?: [string, string][]; // [species id, anatomy note]
}

export interface Alert {
  title: string;
  text: string;
}

export interface Species {
  id: string;
  name: string;
  latin: string;
  group: SpeciesGroup;
  /** Comestibility. Optional: "base" species (long tail) aren't rated yet. */
  rating?: Rating;
  ratingCls?: RatingClass;
  /** Legal minimum size shown in the verdict bar, or "—" when none nationally. */
  maille: string;
  mailleSub: string;
  quota: string;
  quotaSub: string;
  season: SeasonRule;
  /** "base" = auto-generated coverage (taxonomy + regulation + bio), fiche not yet enriched. */
  depth?: "base";
  family?: string;
  cdNom?: string;
  /** Protected species (arrêté 8 déc. 1988 / Habitats) — fishing forbidden, release required. */
  protected?: boolean;
  /** Invasive / "susceptible de déséquilibres" — must not be released alive (R432-5). */
  invasive?: boolean;
  alert?: Alert;
  ident?: {
    summary: string;
    traits: string[];
    conf: Confusion[];
  };
  reg?: {
    rows: [string, string][];
    note: string | null;
    src: string;
  };
  fish?: {
    rows: [string, string][];
  };
  cook?: {
    note: string;
    prep: string[];
  };
  sante?: {
    paras: string[];
    alert?: boolean;
  };
  bio?: {
    rows: [string, string][];
  };
}

export interface Knot {
  id: string;
  cat: "noeud" | "montage";
  name: string;
  use: string;
  when: string;
  steps: string[];
}

/** A catch logged in the offline notebook (carnet), persisted in IndexedDB.
 *  Everything beyond species + size is optional (rich, retro-compatible). */
export interface Catch {
  slot: string; // stable local id
  sp: string; // species display name
  spid: string; // species id
  iso: string; // yyyy-mm-dd (for quota-of-the-day)
  time?: string; // "HH:MM" local capture time (for time-of-day insights)
  size: string; // e.g. "52 cm"
  n: number; // numeric size (cm) for records
  weight?: number; // kg
  date: string; // localized display date
  place: string; // free-text place
  spotId?: string; // linked personal spot
  lat?: number;
  lon?: number;
  gearIds?: string[]; // tacklebox item ids used
  bait?: string; // bait / lure
  technique?: string;
  photo?: string; // IndexedDB blob key ("photo:<slot>")
  note?: string;
  kept: boolean;
}

/** An item in the tacklebox (gear), persisted in IndexedDB, linkable to catches. */
export interface GearItem {
  id: string;
  cat: import("./data/gear").GearCategory;
  name: string;
  detail: string;
}

/** The local, device-only angler identity shown on the profile. Never transmitted. */
export interface Profile {
  name: string;
  bio: string;
  region: string;
  avatar?: string; // IndexedDB blob key
}

/** A personal fishing spot the user declares on the map, persisted in IndexedDB. */
export interface Spot {
  id: string; // stable local id
  name: string;
  lat: number;
  lon: number;
  species: string[]; // species ids seen / caught here
  technique: string; // technique, leurre or appât that works
  best: string; // best moment (season / time of day)
  note: string; // free note (access, precise corner, souvenirs…)
  created: string; // yyyy-mm-dd
}

/** A recipe the user writes themselves — stored 100% on-device (IndexedDB),
 *  linkable to one or more species. Never transmitted. */
export interface PersonalRecipe {
  id: string; // stable local id
  title: string;
  species: string[]; // linked species ids
  photo?: string; // IndexedDB blob key
  ing: string[]; // ingredients, one per line
  steps: string[]; // preparation steps, one per line
  note?: string; // free note (source, souvenir, adaptation…)
  created: string; // yyyy-mm-dd
}

/** Official enrichment generated by scripts/enrich-species.mjs (INPN + FISHMORPH).
 *  Empty until the script is run on a networked machine; the fiche shows it if present. */
export interface SpeciesEnrichment {
  source: string;
  cdNom?: string;
  nameOfficial?: string; // official French vernacular (TaxRef)
  redList?: string; // Liste Rouge nationale code: LC/NT/VU/EN/CR/DD/NA/NE/RE
  redListLabel?: string;
  protected?: boolean; // national protection present
  morph?: Record<string, number>; // FISHMORPH traits
  morphSource?: string;
}

export interface SourceEntry {
  t: string;
  d: string;
}
