import { get, set } from "idb-keyval";
import type { Catch, Spot, GearItem, Profile, PersonalRecipe } from "../types";

// The catch notebook lives 100% on the device (IndexedDB). Nothing is ever
// transmitted — see the privacy note on the Sources screen.
const KEY = "carnet:catches";
const SPOTS_KEY = "carnet:spots";
const GEAR_KEY = "fish-gear"; // shared with the Materiel screen (single source of truth)
const PROFILE_KEY = "carnet:profile";
const RECIPES_KEY = "carnet:recipes";

const EMPTY_PROFILE: Profile = { name: "", bio: "", region: "" };

// Slots of the old demo catches that used to ship with the app. Cleaned out of
// existing installs on load so the notebook is empty ("vanilla") for everyone.
const DEMO_SLOTS = new Set(["seed1", "seed2"]);

export async function loadCatches(): Promise<Catch[]> {
  try {
    const stored = await get<Catch[]>(KEY);
    if (stored === undefined) return []; // fresh install: empty notebook, no demo data
    // One-time cleanup of the retired demo catches (keeps the user's own entries).
    const cleaned = stored.filter((c) => !DEMO_SLOTS.has(c.slot));
    if (cleaned.length !== stored.length) await set(KEY, cleaned);
    return cleaned;
  } catch {
    return [];
  }
}

export async function saveCatches(catches: Catch[]): Promise<void> {
  try {
    await set(KEY, catches);
  } catch {
    /* storage unavailable — keep working in memory */
  }
}

// Personal spots — same device-only storage. Empty by default (no fake data).
export async function loadSpots(): Promise<Spot[]> {
  try {
    return (await get<Spot[]>(SPOTS_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function saveSpots(spots: Spot[]): Promise<void> {
  try {
    await set(SPOTS_KEY, spots);
  } catch {
    /* storage unavailable — keep working in memory */
  }
}

// Tacklebox gear — single source of truth in the store, shared with Materiel.
export async function loadGear(): Promise<GearItem[]> {
  try {
    return (await get<GearItem[]>(GEAR_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function saveGear(gear: GearItem[]): Promise<void> {
  try {
    await set(GEAR_KEY, gear);
  } catch {
    /* storage unavailable — keep working in memory */
  }
}

// Personal recipes — device-only. Empty by default (no fake data).
export async function loadRecipes(): Promise<PersonalRecipe[]> {
  try {
    return (await get<PersonalRecipe[]>(RECIPES_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function saveRecipes(recipes: PersonalRecipe[]): Promise<void> {
  try {
    await set(RECIPES_KEY, recipes);
  } catch {
    /* storage unavailable — keep working in memory */
  }
}

// Local, device-only angler identity.
export async function loadProfile(): Promise<Profile> {
  try {
    return (await get<Profile>(PROFILE_KEY)) ?? EMPTY_PROFILE;
  } catch {
    return EMPTY_PROFILE;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    await set(PROFILE_KEY, profile);
  } catch {
    /* storage unavailable — keep working in memory */
  }
}
