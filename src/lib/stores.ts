// Single registry of every IndexedDB store holding user data.
//
// Kept in its own module on purpose: db.ts imports the persist-error reporter
// from storage.ts, so storage.ts cannot import db.ts back without a cycle.
// Both import this instead.
//
// Export and import derive their key list from STORES, so a new store cannot be
// added and silently left out of the backup — which is exactly how crayfish
// sessions ended up missing from a file labelled "sauvegarde complète".
//
// The string values are the on-disk keys: never change one without a migration.
export const STORES = {
  catches: "carnet:catches",
  spots: "carnet:spots",
  gear: "fish-gear", // shared with the Materiel screen (single source of truth)
  bundles: "fish-bundles", // gear combos, written directly by Materiel
  profile: "carnet:profile",
  recipes: "carnet:recipes",
  crayfish: "carnet:crayfish",
} as const;

export type StoreName = keyof typeof STORES;
