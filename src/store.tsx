import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { Catch, Species, Spot, GearItem, Profile, PersonalRecipe } from "./types";
import type { DeptId } from "./data/regulation";
import {
  loadCatches,
  saveCatches,
  loadSpots,
  saveSpots,
  loadGear,
  saveGear,
  loadProfile,
  saveProfile,
  loadRecipes,
  saveRecipes,
} from "./lib/db";
import { deletePhoto } from "./lib/photos";
import { frDate, isoDay, uid } from "./lib/helpers";

export type Screen =
  | "accueil"
  | "especes"
  | "identify"
  | "fiche"
  | "prise"
  | "carnet"
  | "outils"
  | "noeuds"
  | "knot"
  | "recette"
  | "reglement"
  | "sources"
  | "credits"
  | "regle"
  | "cuisine"
  | "carte"
  | "materiel"
  | "guide-materiel"
  | "techniques"
  | "technique"
  | "statistiques"
  | "prise-detail"
  | "outils-terrain"
  | "mes-recettes"
  | "stockage";

// "prise" is not a tab — it's the central action button (a full flow), not a destination.
// v2 nav: Accueil · Espèces · Prise(central) · Carte · Carnet. "Outils" is no
// longer a tab — reached from the Accueil toolbox instead.
export type Tab = "accueil" | "especes" | "carte" | "carnet";

export type PriseStep =
  | "statut"
  | "maille"
  | "quota"
  | "choix"
  | "kill"
  | "release"
  | null;

// Guided-identifier answers: trait key → chosen value. Absent key = unanswered.
export type IdAnswers = Record<string, string>;

export interface CatchForm {
  sp: string;
  taille: string;
  lieu: string;
  garde: boolean;
}

export interface AppState {
  screen: Screen;
  tab: Tab;
  stack: Screen[];
  q: string;
  filter: string;
  spId: string | null;
  open: Record<string, boolean>;
  recent: string[];
  bigUI: boolean;
  cookStep: number;
  listening: boolean;
  ans: IdAnswers;
  prise: { sp: string | null; step: PriseStep; place?: string | null };
  catches: Catch[];
  spots: Spot[];
  gear: GearItem[];
  profile: Profile;
  recipes: PersonalRecipe[];
  formOpen: boolean;
  f: CatchForm;
  dept: DeptId;
  recipeId: string | null;
  knotId: string | null;
  techId: string | null;
  justAdded: string | null; // slot of the catch just logged (for a brief confirmation)
  focusSpot: string | null; // spot id to fly to & open when the Carte mounts (from Carnet)
  catchSlot: string | null; // slot of the catch shown on the prise-detail screen
  hydrated: boolean;
}

const TABS: Tab[] = ["accueil", "especes", "carte", "carnet"];

const initialState: AppState = {
  screen: "accueil",
  tab: "accueil",
  stack: [],
  q: "",
  filter: "tous",
  spId: null,
  open: { regle: true },
  recent: [],
  bigUI: typeof localStorage !== "undefined" && localStorage.getItem("bigUI") === "1",
  cookStep: 0,
  listening: false,
  ans: {},
  prise: { sp: null, step: null },
  catches: [],
  spots: [],
  gear: [],
  profile: { name: "", bio: "", region: "" },
  recipes: [],
  formOpen: false,
  f: { sp: "sandre", taille: "", lieu: "", garde: false },
  dept: "41",
  recipeId: null,
  knotId: null,
  techId: null,
  justAdded: null,
  focusSpot: null,
  catchSlot: null,
  hydrated: false,
};

type Patch = Partial<AppState> | ((s: AppState) => Partial<AppState>);

function reducer(state: AppState, patch: Patch): AppState {
  const p = typeof patch === "function" ? patch(state) : patch;
  return { ...state, ...p };
}

interface Store {
  state: AppState;
  set: (patch: Patch) => void;
  nav: (screen: Screen, extra?: Partial<AppState>) => void;
  back: () => void;
  goTab: (t: Tab) => void;
  startPrise: (place?: string) => void;
  openSp: (id: string) => void;
  addCatch: (sp: Species, kept: boolean, size?: string) => void;
  addCatchFull: (entry: Catch) => void;
  updateCatch: (slot: string, patch: Partial<Catch>) => void;
  removeCatch: (slot: string) => void;
  addSpot: (spot: Spot) => void;
  updateSpot: (id: string, patch: Partial<Spot>) => void;
  removeSpot: (id: string) => void;
  setGear: (gear: GearItem[]) => void;
  setProfile: (patch: Partial<Profile>) => void;
  addRecipe: (recipe: PersonalRecipe) => void;
  updateRecipe: (id: string, patch: Partial<PersonalRecipe>) => void;
  removeRecipe: (id: string) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate the notebook + spots + gear + profile + recipes from IndexedDB once.
  useEffect(() => {
    let alive = true;
    Promise.all([loadCatches(), loadSpots(), loadGear(), loadProfile(), loadRecipes()]).then(
      ([catches, spots, gear, profile, recipes]) => {
        // Merge, don't replace: if the user logged a catch/spot before IndexedDB
        // finished loading, prepend it rather than dropping it (state starts empty,
        // so normally this is just the loaded data).
        if (alive)
          dispatch((s) => ({
            catches: [...s.catches, ...catches],
            spots: [...s.spots, ...spots],
            gear,
            profile,
            recipes: [...s.recipes, ...recipes],
            hydrated: true,
          }));
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  // Persist after hydration whenever the data changes. We intentionally do NOT
  // skip the first post-hydration save: if the user logged an entry before
  // IndexedDB finished loading, the hydration effect merges it in, and that merged
  // state is exactly what the first save must persist (skipping it lost the write).
  // The one redundant write of just-loaded data on mount is harmless.
  useEffect(() => {
    if (!state.hydrated) return;
    saveCatches(state.catches);
  }, [state.catches, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    saveSpots(state.spots);
  }, [state.spots, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    saveGear(state.gear);
  }, [state.gear, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    saveProfile(state.profile);
  }, [state.profile, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    saveRecipes(state.recipes);
  }, [state.recipes, state.hydrated]);

  const store = useMemo<Store>(() => {
    const set = (patch: Patch) => dispatch(patch);
    const nav: Store["nav"] = (screen, extra) =>
      dispatch((s) => ({ stack: [...s.stack, s.screen], screen, ...(extra || {}) }));
    const back: Store["back"] = () =>
      dispatch((s) => {
        const st = [...s.stack];
        const prev = st.pop() || "accueil";
        return {
          screen: prev,
          stack: st,
          tab: (TABS as string[]).includes(prev) ? (prev as Tab) : s.tab,
        };
      });
    const goTab: Store["goTab"] = (t) => dispatch({ screen: t, tab: t, stack: [] });
    // The central action: opens the full "prise" flow at its start, from anywhere.
    // An optional `place` (e.g. a spot name) pre-fills the catch location.
    const startPrise: Store["startPrise"] = (place) =>
      dispatch({ screen: "prise", prise: { sp: null, step: null, place: place ?? null }, stack: [] });
    const openSp: Store["openSp"] = (id) => {
      dispatch((s) => ({
        open: { regle: true },
        recent: [id, ...s.recent.filter((r) => r !== id)].slice(0, 5),
        stack: [...s.stack, s.screen],
        screen: "fiche",
        spId: id,
      }));
    };
    // From the "Ma prise" flow: log the catch in ONE tap (opt-out). We create the
    // entry directly with what's already known (species, decision, measured size),
    // land on the carnet, and flag it for a brief "ajoutée ✓" confirmation.
    const addCatch: Store["addCatch"] = (sp, kept, size) => {
      const cm = size ? parseInt(size) : 0;
      dispatch((s) => {
        const entry: Catch = {
          sp: sp.name,
          spid: sp.id,
          iso: isoDay(),
          size: cm ? cm + " cm" : "— cm",
          n: cm || 0,
          date: frDate(),
          place: s.prise.place || "—", // pre-filled when the flow started from a spot
          kept,
          slot: uid("p"),
        };
        return {
          catches: [entry, ...s.catches],
          screen: "carnet",
          tab: "carnet",
          stack: [],
          prise: { sp: null, step: null },
          formOpen: false,
          justAdded: entry.slot,
        };
      });
    };
    // Rich retroactive add from the Carnet form (full Catch object).
    const addCatchFull: Store["addCatchFull"] = (entry) =>
      dispatch((s) => ({ catches: [entry, ...s.catches], justAdded: entry.slot }));
    // Edit an existing catch (from its detail screen).
    const updateCatch: Store["updateCatch"] = (slot, patch) =>
      dispatch((s) => ({
        catches: s.catches.map((c) => (c.slot === slot ? { ...c, ...patch } : c)),
      }));
    // Delete a logged catch (mis-tap, wrong species/size). Persisted. Also frees
    // its photo blob so no orphan is left in IndexedDB, whatever the caller.
    const removeCatch: Store["removeCatch"] = (slot) => {
      const photo = state.catches.find((c) => c.slot === slot)?.photo;
      if (photo) deletePhoto(photo);
      dispatch((s) => ({
        catches: s.catches.filter((c) => c.slot !== slot),
        justAdded: s.justAdded === slot ? null : s.justAdded,
      }));
    };
    // Tacklebox gear (single source of truth) and local profile identity.
    const setGear: Store["setGear"] = (gear) => dispatch({ gear });
    const setProfile: Store["setProfile"] = (patch) =>
      dispatch((s) => ({ profile: { ...s.profile, ...patch } }));
    // Personal spots: create / edit / delete, persisted to IndexedDB.
    const addSpot: Store["addSpot"] = (spot) =>
      dispatch((s) => ({ spots: [spot, ...s.spots] }));
    const updateSpot: Store["updateSpot"] = (id, patch) =>
      dispatch((s) => ({ spots: s.spots.map((sp) => (sp.id === id ? { ...sp, ...patch } : sp)) }));
    const removeSpot: Store["removeSpot"] = (id) =>
      dispatch((s) => ({ spots: s.spots.filter((sp) => sp.id !== id) }));
    // Personal recipes: create / edit / delete, persisted to IndexedDB.
    const addRecipe: Store["addRecipe"] = (recipe) =>
      dispatch((s) => ({ recipes: [recipe, ...s.recipes] }));
    const updateRecipe: Store["updateRecipe"] = (id, patch) =>
      dispatch((s) => ({ recipes: s.recipes.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
    const removeRecipe: Store["removeRecipe"] = (id) => {
      const photo = state.recipes.find((r) => r.id === id)?.photo;
      if (photo) deletePhoto(photo);
      dispatch((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) }));
    };
    return {
      state,
      set,
      nav,
      back,
      goTab,
      startPrise,
      openSp,
      addCatch,
      addCatchFull,
      updateCatch,
      removeCatch,
      addSpot,
      updateSpot,
      removeSpot,
      setGear,
      setProfile,
      addRecipe,
      updateRecipe,
      removeRecipe,
    };
  }, [state]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used within StoreProvider");
  return s;
}
