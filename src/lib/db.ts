import { get, set } from "idb-keyval";
import type { Catch, Spot, GearItem, Profile, PersonalRecipe } from "../types";
import { reportPersistError, clearPersistError } from "./storage";

// The catch notebook lives 100% on the device (IndexedDB). Nothing is ever
// transmitted — see the privacy note on the Sources screen.
const KEY = "carnet:catches";
const SPOTS_KEY = "carnet:spots";
const GEAR_KEY = "fish-gear"; // shared with the Materiel screen (single source of truth)
const PROFILE_KEY = "carnet:profile";
const RECIPES_KEY = "carnet:recipes";

const EMPTY_PROFILE: Profile = { name: "", bio: "", region: "" };

// Data schema version, for forward-compatible migrations. Bump when the stored
// shape changes and add a step in runMigrations().
export const SCHEMA_VERSION = 1;
const VERSION_KEY = "schema:version";

/** Run any pending data migrations, then stamp the current version. Best-effort:
 *  a failure here must never block the app. Called once before hydration. */
export async function runMigrations(): Promise<void> {
  try {
    const v = (await get<number>(VERSION_KEY)) ?? 0;
    // Future migrations go here, e.g. `if (v < 2) { …reshape… }`.
    if (v !== SCHEMA_VERSION) await set(VERSION_KEY, SCHEMA_VERSION);
  } catch {
    /* versioning is best-effort — never block startup */
  }
}

// Slots of the old demo catches that used to ship with the app. Cleaned out of
// existing installs on load so the notebook is empty ("vanilla") for everyone.
const DEMO_SLOTS = new Set(["seed1", "seed2"]);

// NOTE: load* throw on a real IndexedDB error (they no longer mask it as an empty
// result). The store distinguishes "genuinely empty" from "couldn't read" and, on
// a read error, suspends persistence so it never overwrites still-present data
// with an empty array. Only `undefined` (fresh install) yields the empty default.
export async function loadCatches(): Promise<Catch[]> {
  const stored = await get<Catch[]>(KEY);
  if (stored === undefined) return []; // fresh install: empty notebook, no demo data
  // One-time cleanup of the retired demo catches (keeps the user's own entries).
  const cleaned = stored.filter((c) => !DEMO_SLOTS.has(c.slot));
  if (cleaned.length !== stored.length) await set(KEY, cleaned);
  return cleaned;
}

export async function saveCatches(catches: Catch[]): Promise<void> {
  try {
    await set(KEY, catches);
    clearPersistError();
  } catch (e) {
    reportPersistError(e); // keep working in memory, but warn the user
  }
}

// Personal spots — same device-only storage. Empty by default (no fake data).
export async function loadSpots(): Promise<Spot[]> {
  return (await get<Spot[]>(SPOTS_KEY)) ?? [];
}

export async function saveSpots(spots: Spot[]): Promise<void> {
  try {
    await set(SPOTS_KEY, spots);
    clearPersistError();
  } catch (e) {
    reportPersistError(e); // keep working in memory, but warn the user
  }
}

// Tacklebox gear — single source of truth in the store, shared with Materiel.
export async function loadGear(): Promise<GearItem[]> {
  return (await get<GearItem[]>(GEAR_KEY)) ?? [];
}

export async function saveGear(gear: GearItem[]): Promise<void> {
  try {
    await set(GEAR_KEY, gear);
    clearPersistError();
  } catch (e) {
    reportPersistError(e); // keep working in memory, but warn the user
  }
}

// Personal recipes — device-only. Empty by default (no fake data).
export async function loadRecipes(): Promise<PersonalRecipe[]> {
  return (await get<PersonalRecipe[]>(RECIPES_KEY)) ?? [];
}

export async function saveRecipes(recipes: PersonalRecipe[]): Promise<void> {
  try {
    await set(RECIPES_KEY, recipes);
    clearPersistError();
  } catch (e) {
    reportPersistError(e); // keep working in memory, but warn the user
  }
}

// Local, device-only angler identity.
export async function loadProfile(): Promise<Profile> {
  return (await get<Profile>(PROFILE_KEY)) ?? EMPTY_PROFILE;
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    await set(PROFILE_KEY, profile);
    clearPersistError();
  } catch (e) {
    reportPersistError(e); // keep working in memory, but warn the user
  }
}
