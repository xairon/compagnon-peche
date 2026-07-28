import { useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import type { Catch, Species, Spot, GearItem, Profile, PersonalRecipe, CrayfishSession } from "./types";
import type { DeptId } from "./data/regulation";
import { StateCtx, ActionsCtx } from "./store-context";
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
  loadCrayfish,
  saveCrayfish,
  runMigrations,
} from "./lib/db";
import { deletePhoto } from "./lib/photos";
import { reportReadError } from "./lib/storage";
import { frDate, isoDay, uid } from "./lib/helpers";
import { addSession, reconcileSessions } from "./lib/ecrevisses";

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
  | "stockage"
  | "ecrevisses";

// "prise" is not a tab — it's the central action button (a full flow), not a destination.
// v2 nav: Accueil · Espèces · Prise(central) · Carte · Carnet. "Outils" is no
// longer a tab — reached from the Accueil toolbox instead.
export type Tab = "accueil" | "especes" | "carte" | "carnet";

// Segment shown by the Carnet. In the store, not in the screen: closing a bilan
// has to land on "Écrevisses", otherwise the session just closed isn't visible.
export type CarnetSeg = "prises" | "spots" | "ecrevisses";

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
  carnetSeg: CarnetSeg;
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
  crayfish: CrayfishSession[];
  formOpen: boolean;
  f: CatchForm;
  dept: DeptId;
  recipeId: string | null;
  knotId: string | null;
  techId: string | null;
  justAdded: string | null; // slot of the catch just logged (for a brief confirmation)
  focusSpot: string | null; // spot id to fly to & open when the Carte mounts (from Carnet)
  gearFocusId: string | null; // gear card id to scroll to & open when GuideMateriel mounts (from a fiche espèce or une autre carte gear)
  catchSlot: string | null; // slot of the catch shown on the prise-detail screen
  bilanSession: string | null; // crayfish session whose bilan the Écrevisses screen shows (from Carnet, to correct a closed one)
  // Département code (e.g. "37") detected by GPS when it falls OUTSIDE the app's
  // covered zone (23/36/41) — null otherwise. Kept in the store (not local state)
  // so the warning can also be shown wherever regulation is displayed (Reglement).
  outOfZoneDept: string | null;
  hydrated: boolean;
  loadOk: boolean; // false if reading stored data failed — persistence is suspended
}

const TABS: Tab[] = ["accueil", "especes", "carte", "carnet"];

const initialState: AppState = {
  screen: "accueil",
  tab: "accueil",
  carnetSeg: "prises",
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
  crayfish: [],
  formOpen: false,
  f: { sp: "sandre", taille: "", lieu: "", garde: false },
  dept: "41",
  recipeId: null,
  knotId: null,
  techId: null,
  justAdded: null,
  focusSpot: null,
  gearFocusId: null,
  catchSlot: null,
  bilanSession: null,
  outOfZoneDept: null,
  hydrated: false,
  loadOk: true,
};

type Patch = Partial<AppState> | ((s: AppState) => Partial<AppState>);

function reducer(state: AppState, patch: Patch): AppState {
  const p = typeof patch === "function" ? patch(state) : patch;
  return { ...state, ...p };
}

export interface Store {
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
  addCrayfishSession: (session: CrayfishSession) => void;
  saveCrayfishSession: (session: CrayfishSession) => void;
  updateCrayfishSession: (id: string, updater: (s: CrayfishSession) => CrayfishSession) => void;
  removeCrayfishSession: (id: string) => void;
}

/** Actions are the store minus its state — a referentially STABLE object. */
export type Actions = Omit<Store, "state">;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Latest state for actions that need to read it (removeCatch/removeRecipe),
  // without making the action object depend on state (keeps it stable).
  const stateRef = useRef(state);
  // Keep the ref current after each commit. removeCatch/removeRecipe read it on
  // user events, which always fire after the latest render has committed.
  useEffect(() => {
    stateRef.current = state;
  });

  // Hydrate the notebook + spots + gear + profile + recipes from IndexedDB once.
  // Each load is guarded independently: a read error yields the default AND flips
  // loadOk to false, which suspends persistence so a transient read failure can't
  // overwrite still-present data with empty arrays.
  useEffect(() => {
    let alive = true;
    (async () => {
      await runMigrations();
      let ok = true;
      const safe = async <T,>(p: Promise<T>, d: T): Promise<T> => {
        try {
          return await p;
        } catch {
          ok = false;
          return d;
        }
      };
      const [catches, spots, gear, profile, recipes, crayfish] = await Promise.all([
        safe(loadCatches(), [] as Catch[]),
        safe(loadSpots(), [] as Spot[]),
        safe(loadGear(), [] as GearItem[]),
        safe(loadProfile(), { name: "", bio: "", region: "" } as Profile),
        safe(loadRecipes(), [] as PersonalRecipe[]),
        safe(loadCrayfish(), [] as CrayfishSession[]),
      ]);
      if (!alive) return;
      // Merge, don't replace: if the user logged a catch/spot before IndexedDB
      // finished loading, prepend it rather than dropping it (state starts empty,
      // so normally this is just the loaded data). The crayfish merge is the one
      // place two open sessions could meet, so it goes through reconcileSessions:
      // the invariant holds structurally, not by a UI guard.
      dispatch((s) => ({
        catches: [...s.catches, ...catches],
        spots: [...s.spots, ...spots],
        gear,
        profile,
        recipes: [...s.recipes, ...recipes],
        crayfish: reconcileSessions([...s.crayfish, ...crayfish]),
        hydrated: true,
        loadOk: ok,
      }));
      if (!ok) reportReadError();
    })();
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
    if (!state.hydrated || !state.loadOk) return;
    saveCatches(state.catches);
  }, [state.catches, state.hydrated, state.loadOk]);

  useEffect(() => {
    if (!state.hydrated || !state.loadOk) return;
    saveSpots(state.spots);
  }, [state.spots, state.hydrated, state.loadOk]);

  useEffect(() => {
    if (!state.hydrated || !state.loadOk) return;
    saveGear(state.gear);
  }, [state.gear, state.hydrated, state.loadOk]);

  useEffect(() => {
    if (!state.hydrated || !state.loadOk) return;
    saveProfile(state.profile);
  }, [state.profile, state.hydrated, state.loadOk]);

  useEffect(() => {
    if (!state.hydrated || !state.loadOk) return;
    saveRecipes(state.recipes);
  }, [state.recipes, state.hydrated, state.loadOk]);

  useEffect(() => {
    if (!state.hydrated || !state.loadOk) return;
    saveCrayfish(state.crayfish);
  }, [state.crayfish, state.hydrated, state.loadOk]);

  const actions = useMemo<Actions>(() => {
    const set = (patch: Patch) => dispatch(patch);
    // `bilanSession` is reset by default: navigating INTO the écrevisses module
    // means "show me the session", never "re-open the bilan I left by the tab bar".
    // The Carnet's "Corriger le bilan" passes it explicitly, and `extra` wins.
    const nav: Store["nav"] = (screen, extra) =>
      dispatch((s) => ({ stack: [...s.stack, s.screen], screen, bilanSession: null, ...(extra || {}) }));
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
      const photo = stateRef.current.catches.find((c) => c.slot === slot)?.photo;
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
      const photo = stateRef.current.recipes.find((r) => r.id === id)?.photo;
      if (photo) deletePhoto(photo);
      dispatch((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) }));
    };
    // Crayfish sessions. The screen computes the next session with the pure
    // helpers of lib/ecrevisses and hands the whole object back — the store is
    // deliberately thin glue here, so all the logic stays testable.
    // addSession enforces the "one open session at a time" invariant; saveCrayfishSession upserts by id.
    const addCrayfishSession: Store["addCrayfishSession"] = (session) =>
      dispatch((s) => ({ crayfish: addSession(s.crayfish, session) }));
    const saveCrayfishSession: Store["saveCrayfishSession"] = (session) =>
      dispatch((s) => ({
        crayfish: s.crayfish.some((c) => c.id === session.id)
          ? s.crayfish.map((c) => (c.id === session.id ? session : c))
          : [session, ...s.crayfish],
      }));
    // Same, but applied to the CURRENT session in state instead of a snapshot the
    // caller is holding: a background tick (the alert loop) can no longer revert an
    // edit committed in between, nor resurrect a session deleted meanwhile — unlike
    // saveCrayfishSession, an unknown id is a no-op, never an insert.
    const updateCrayfishSession: Store["updateCrayfishSession"] = (id, updater) =>
      dispatch((s) => ({
        crayfish: s.crayfish.some((c) => c.id === id)
          ? s.crayfish.map((c) => (c.id === id ? updater(c) : c))
          : s.crayfish,
      }));
    const removeCrayfishSession: Store["removeCrayfishSession"] = (id) =>
      dispatch((s) => ({ crayfish: s.crayfish.filter((c) => c.id !== id) }));
    return {
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
      addCrayfishSession,
      saveCrayfishSession,
      updateCrayfishSession,
      removeCrayfishSession,
    };
    // Actions are built once and stay stable (they use dispatch + stateRef).
  }, []);

  return (
    <ActionsCtx.Provider value={actions}>
      <StateCtx.Provider value={state}>{children}</StateCtx.Provider>
    </ActionsCtx.Provider>
  );
}
