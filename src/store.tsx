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
import { readPrefs, writePrefs } from "./lib/prefs";
import { frDate, isoDay, uid } from "./lib/helpers";
import { addSession, reconcileSessions } from "./lib/ecrevisses";
import {
  CTX_DEFAUT,
  contexteNettoye,
  ecranParent,
  ongletDe,
  versUrl,
  type PriseEtape,
} from "./lib/nav-conventions";
import {
  lirePoint,
  memeEndroit,
  patchDePoint,
  pointDeEtat,
  pointDepuisUrl,
  type PointNav,
} from "./lib/nav-historique";

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
  | "mentions-legales"
  | "credits"
  | "guides"
  | "regle"
  | "cuisine"
  | "carte"
  | "materiel"
  | "guide-materiel"
  | "technique"
  | "statistiques"
  | "prise-detail"
  | "outils-terrain"
  | "stockage"
  | "ecrevisses"
  | "ecrevisses-ident";

// "prise" is not a tab — it's the central action button (a full flow), not a destination.
// v2 nav: Accueil · Espèces · Prise(central) · Carte · Carnet. "Outils" is no
// longer a tab — reached from the Accueil toolbox instead.
export type Tab = "accueil" | "especes" | "carte" | "carnet";

// Segment shown by the Carnet. In the store, not in the screen: closing a bilan
// has to land on "Écrevisses", otherwise the session just closed isn't visible.
export type CarnetSeg = "prises" | "spots" | "ecrevisses" | "recettes";

// La liste vit dans la table des routes : l'étape est un mot d'URL
// (`#/prise/sandre/maille`) avant d'être un état, et c'est là qu'un lien reçu
// est validé.
export type PriseStep = PriseEtape | null;

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
  // Il n'y a plus de pile de navigation dans l'état : c'est l'historique du
  // navigateur qui la tient (voir lib/nav-historique.ts). Une pile maison en
  // parallèle était une seconde vérité, que le geste retour d'Android ne
  // consultait pas — et c'est exactement pour ça qu'il fermait l'app.
  q: string;
  filter: string;
  spId: string | null;
  open: Record<string, boolean>;
  recent: string[];
  bigUI: boolean;
  cookStep: number;
  listening: boolean;
  ans: IdAnswers;
  // Le parcours « Ma prise », à plat : l'espèce et l'étape sont du contexte de
  // navigation (une entrée d'historique par étape, voir nav-conventions.ts),
  // `prisePlace` non — c'est le spot d'où le parcours a été lancé, il ne dit
  // rien de l'endroit affiché et ne se remet pas à zéro en changeant d'écran.
  priseSp: string | null;
  priseStep: PriseStep;
  prisePlace: string | null;
  catches: Catch[];
  spots: Spot[];
  gear: GearItem[];
  profile: Profile;
  recipes: PersonalRecipe[];
  crayfish: CrayfishSession[];
  formOpen: boolean;
  f: CatchForm;
  dept: DeptId;
  // Whether `dept` is the user's own answer or just the default. The app quotes
  // one département's arrêté on every verdict, so "we never asked" and "they
  // told us 41" must not look the same — the former warrants a warning.
  deptChosen: boolean;
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

// Built at provider mount, not at module load: preferences are read
// synchronously (see lib/prefs.ts) so the very first paint already quotes the
// right arrêté and draws controls at the right size. Doing it at module scope
// would freeze the values for the lifetime of the module — surviving a page
// load, but not a provider remount, and untestable.
const makeInitialState = (): AppState => {
  const prefs = readPrefs();
  // Lien profond. Il est résolu ICI, avant le premier rendu, et pas dans un
  // effet : sinon un lien partagé afficherait l'accueil le temps d'une frame
  // avant de sauter sur la fiche, et cette frame parasite laisserait en plus
  // une entrée d'historique de plus que d'écrans visités.
  const lien = typeof window === "undefined" ? null : pointDepuisUrl(window.location.hash);
  return {
    screen: lien?.screen ?? "accueil",
    tab: lien?.tab ?? "accueil",
    carnetSeg: "prises",
    q: "",
    filter: "tous",
    open: { regle: true },
    recent: [],
    bigUI: prefs.bigUI,
    listening: false,
    ans: {},
    prisePlace: null,
    catches: [],
    spots: [],
    gear: [],
    profile: { name: "", bio: "", region: "" },
    recipes: [],
    crayfish: [],
    formOpen: false,
    f: { sp: "sandre", taille: "", lieu: "", garde: false },
    dept: prefs.dept,
    deptChosen: prefs.deptChosen,
    justAdded: null,
    // Les onze champs de contexte de navigation en un seul endroit — soit ceux
    // du lien profond, soit tous à zéro. Les lister un par un ici, c'était la
    // porte ouverte à en oublier un au prochain écran ajouté.
    ...(lien?.ctx ?? CTX_DEFAUT),
    outOfZoneDept: null,
    hydrated: false,
    loadOk: true,
  };
};

type Patch = Partial<AppState> | ((s: AppState) => Partial<AppState>);

function reducer(state: AppState, patch: Patch): AppState {
  const p = typeof patch === "function" ? patch(state) : patch;
  return { ...state, ...p };
}

export interface Store {
  state: AppState;
  set: (patch: Patch) => void;
  replace: (patch: Patch) => void;
  nav: (screen: Screen, extra?: Partial<AppState>) => void;
  back: () => void;
  goTab: (t: Tab, extra?: Partial<AppState>) => void;
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
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);
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

  // Preferences do NOT wait on hydration. The six effects above guard on
  // `loadOk` because they could otherwise overwrite a still-present notebook
  // with an empty array; prefs come from localStorage, which is read
  // synchronously before the first render, so there is nothing to clobber.
  useEffect(() => {
    writePrefs({ dept: state.dept, deptChosen: state.deptChosen, bigUI: state.bigUI });
  }, [state.dept, state.deptChosen, state.bigUI]);

  // ── Navigation ↔ historique du navigateur ────────────────────────────────
  //
  // `refHist` retient le DERNIER point synchronisé avec l'historique. Il sert à
  // deux choses : savoir qu'un changement d'état vient d'être causé par un
  // retour (auquel cas il ne faut surtout pas repousser l'entrée qu'on vient de
  // dépiler), et savoir à quelle profondeur on se trouve.
  const refHist = useRef<{ point: PointNav | null; remplacer: boolean }>({
    point: null,
    remplacer: true,
  });

  // L'endroit courant, dérivé du seul état qui compte pour la navigation.
  // Mémoïsé pour que l'effet de synchronisation ne se déclenche pas à chaque
  // frappe dans un champ de recherche ou à chaque prise ajoutée.
  const { screen: ecranCourant, tab: ongletCourant } = state;
  const { spId, recipeId, knotId, techId, catchSlot } = state;
  const { focusSpot, gearFocusId, bilanSession, cookStep } = state;
  const { priseSp, priseStep } = state;
  const point = useMemo(
    () =>
      pointDeEtat(
        {
          screen: ecranCourant,
          tab: ongletCourant,
          spId,
          recipeId,
          knotId,
          techId,
          catchSlot,
          focusSpot,
          gearFocusId,
          bilanSession,
          cookStep,
          priseSp,
          priseStep,
        },
        0,
      ),
    [
      ecranCourant,
      ongletCourant,
      spId,
      recipeId,
      knotId,
      techId,
      catchSlot,
      focusSpot,
      gearFocusId,
      bilanSession,
      cookStep,
      priseSp,
      priseStep,
    ],
  );

  // Une entrée d'historique par endroit visité. L'effet vit ICI, dans le
  // provider, et pas dans App : la frontière d'erreur d'App est keyée par
  // l'écran et se remonte donc à chaque navigation — un effet posé sous elle
  // se rejouerait et empilerait une entrée de trop par écran.
  useEffect(() => {
    const h = refHist.current;
    if (memeEndroit(h.point, point)) {
      // Déjà à cet endroit : c'est un retour qui vient de nous y remettre, ou
      // un rendu sans changement de navigation. Rien à écrire.
      h.remplacer = false;
      return;
    }
    const profondeur =
      h.point === null || h.remplacer ? h.point?.profondeur ?? 0 : h.point.profondeur + 1;
    const suivant: PointNav = { ...point, profondeur };
    const url = versUrl(suivant.screen, suivant.ctx);
    // Le tout premier point REMPLACE l'entrée courante. Sans ça, l'app
    // s'ouvrirait avec une entrée à elle sous les pieds, et le premier geste
    // retour ne ferait que revenir à l'écran déjà affiché au lieu de quitter.
    if (h.point === null || h.remplacer) window.history.replaceState({ nav: suivant }, "", url);
    else window.history.pushState({ nav: suivant }, "", url);
    refHist.current = { point: suivant, remplacer: false };
  }, [point]);

  // Le geste retour d'Android, le bouton retour du navigateur, et notre propre
  // `back()` arrivent tous ici. L'entrée porte l'écran ET son contexte, donc le
  // retour restitue exactement ce qu'on avait quitté — y compris le bilan
  // d'écrevisses en cours de correction, que l'ancien `nav()` effaçait.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const p =
        lirePoint(e.state) ??
        pointDepuisUrl(window.location.hash) ?? {
          screen: "accueil" as Screen,
          tab: "accueil" as Tab,
          ctx: { ...CTX_DEFAUT },
          profondeur: 0,
        };
      // Marqué AVANT le dispatch : l'effet de synchronisation verra qu'on est
      // déjà à cet endroit et n'ira pas repousser l'entrée dépilée.
      refHist.current = { point: p, remplacer: false };
      dispatch(patchDePoint(p));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const actions = useMemo<Actions>(() => {
    const set = (patch: Patch) => dispatch(patch);
    // Comme `set`, mais l'entrée d'historique courante est CORRIGÉE au lieu
    // qu'une nouvelle soit empilée. Pour les changements qui touchent au
    // contexte de navigation sans être un déplacement :
    //   — un écran qui oublie le repère qu'il vient de consommer (la carte a
    //     volé jusqu'au spot, le guide matériel a déplié la bonne carte) ;
    //   — l'étape d'une recette guidée, qui doit se retrouver dans l'URL au
    //     rechargement sans qu'il faille vingt gestes retour pour sortir.
    // Sans ça, chacun de ces changements fabriquerait une entrée fantôme, et
    // le geste retour d'Android donnerait l'impression de ne rien faire.
    const replace: Store["replace"] = (patch) => {
      refHist.current.remplacer = true;
      dispatch(patch);
    };
    // Une navigation en avant efface TOUT le contexte que l'écran d'arrivée ne
    // réclame pas (table dans lib/nav-conventions.ts), et l'appelant fournit
    // celui qu'il réclame — `extra` passe en dernier, il gagne toujours.
    // Avant, seul `bilanSession` était effacé : les huit autres identifiants
    // traînaient d'écran en écran. Ce qui est perdu ici est repris par
    // l'historique au retour, entrée par entrée.
    //
    // L'ONGLET, lui, ne bouge pas : ouvrir une recette depuis une fiche espèce
    // laisse « Espèces » allumé, parce que c'est de là qu'on vient et que c'est
    // là que le retour ramène. Seuls les liens profonds, qui n'ont pas
    // d'origine à préserver, déduisent l'onglet de la table (`ongletDe`).
    const nav: Store["nav"] = (screen, extra) =>
      dispatch({ ...contexteNettoye(screen), screen, ...(extra || {}) });
    // Le retour est délégué au navigateur : il dépile SON entrée, l'événement
    // `popstate` rend le point complet, et l'effet ci-dessous le réapplique.
    // C'est ce qui fait que ce bouton et le geste retour d'Android font la même
    // chose par construction, et non parce qu'on a pensé à les garder d'accord.
    const back: Store["back"] = () => {
      const h = refHist.current;
      if (h.point && h.point.profondeur > 0) {
        window.history.back();
        return;
      }
      // Profondeur 0 : rien derrière. Soit on est à la racine et il n'y a rien
      // à faire — le geste système sortira de l'app, ce qui est le comportement
      // attendu et non un défaut. Soit l'app a été ouverte DIRECTEMENT sur un
      // écran profond par un lien, et une flèche « ‹ » qui ferme l'app serait
      // absurde : on replie sur l'écran parent, en REMPLAÇANT l'entrée pour ne
      // pas fabriquer une profondeur qui piégerait le geste suivant.
      const courant = stateRef.current.screen;
      if (courant === "accueil") return;
      const parent = ecranParent(courant);
      h.remplacer = true;
      dispatch({ ...contexteNettoye(parent), screen: parent, tab: ongletDe(parent) });
    };
    const goTab: Store["goTab"] = (t, extra) =>
      dispatch({ ...contexteNettoye(t), screen: t, tab: t, ...(extra || {}) });
    // The central action: opens the full "prise" flow at its start, from anywhere.
    // An optional `place` (e.g. a spot name) pre-fills the catch location.
    // L'espèce et l'étape sont remises à zéro À LA MAIN : l'écran `prise` les
    // RÉCLAME, donc `contexteNettoye` les laisse passer exprès (c'est ce qui
    // permet au retour de les restituer). Le bouton central, lui, ouvre
    // toujours le parcours à son commencement.
    const startPrise: Store["startPrise"] = (place) =>
      dispatch({
        ...contexteNettoye("prise"),
        screen: "prise",
        priseSp: null,
        priseStep: null,
        prisePlace: place ?? null,
      });
    const openSp: Store["openSp"] = (id) => {
      dispatch((s) => ({
        open: { regle: true },
        recent: [id, ...s.recent.filter((r) => r !== id)].slice(0, 5),
        ...contexteNettoye("fiche"),
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
          place: s.prisePlace || "—", // pre-filled when the flow started from a spot
          kept,
          slot: uid("p"),
        };
        return {
          catches: [entry, ...s.catches],
          ...contexteNettoye("carnet"),
          screen: "carnet",
          tab: "carnet",
          // `contexteNettoye` a déjà effacé l'espèce et l'étape ; le spot, lui,
          // n'est pas du contexte de navigation et se range ici.
          prisePlace: null,
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
      replace,
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
