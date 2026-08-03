import { useEffect, useState, lazy, Suspense } from "react";
import { useStore } from "./store-hooks";
import { BottomNav } from "./components/BottomNav";
import { Icon } from "./components/Icon";
import { ICONS } from "./components/icons-data";
// Import direct et non `lazy` : RECIPES est déjà dans le bundle principal via
// Fiche et Carnet, un découpage ne gagnerait rien et poserait une question de
// précache pour un écran qui doit marcher hors-ligne.
import { Recettes } from "./screens/Recettes";
import { CrayfishBar } from "./components/CrayfishBar";
import { Onboarding } from "./components/Onboarding";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { usePwa } from "./lib/pwa";
import { UpdateToast } from "./components/UpdateToast";
import { promesseHorsLigne } from "./lib/promesse-hors-ligne";
import { useCrayfishAlerts } from "./lib/crayfish-alerts";
import { requestPersist, onPersistError, onQuotaWarning, storageInfo } from "./lib/storage";

// Tous les écrans sont code-splittés (Carte pulls in MapLibre GL, etc.) : seul
// le shell (nav, FAB, toasts) reste dans le chunk principal. Exception : Recettes
// ci-dessus.
const Accueil = lazy(() => import("./screens/Accueil").then((m) => ({ default: m.Accueil })));
const Especes = lazy(() => import("./screens/Especes").then((m) => ({ default: m.Especes })));
const Identify = lazy(() => import("./screens/Identify").then((m) => ({ default: m.Identify })));
const Fiche = lazy(() => import("./screens/Fiche").then((m) => ({ default: m.Fiche })));
const Prise = lazy(() => import("./screens/Prise").then((m) => ({ default: m.Prise })));
const Regle = lazy(() => import("./screens/Regle").then((m) => ({ default: m.Regle })));
const Carnet = lazy(() => import("./screens/Carnet").then((m) => ({ default: m.Carnet })));
const PriseDetail = lazy(() =>
  import("./screens/PriseDetail").then((m) => ({ default: m.PriseDetail })),
);
const Statistiques = lazy(() =>
  import("./screens/Statistiques").then((m) => ({ default: m.Statistiques })),
);
const Outils = lazy(() => import("./screens/Outils").then((m) => ({ default: m.Outils })));
const OutilsTerrain = lazy(() =>
  import("./screens/OutilsTerrain").then((m) => ({ default: m.OutilsTerrain })),
);
const Ecrevisses = lazy(() =>
  import("./screens/Ecrevisses").then((m) => ({ default: m.Ecrevisses })),
);
const Noeuds = lazy(() => import("./screens/Noeuds").then((m) => ({ default: m.Noeuds })));
const NoeudFiche = lazy(() =>
  import("./screens/NoeudFiche").then((m) => ({ default: m.NoeudFiche })),
);
const Recette = lazy(() => import("./screens/Recette").then((m) => ({ default: m.Recette })));
const Reglement = lazy(() =>
  import("./screens/Reglement").then((m) => ({ default: m.Reglement })),
);
const Sources = lazy(() => import("./screens/Sources").then((m) => ({ default: m.Sources })));
const Mentions = lazy(() => import("./screens/Mentions").then((m) => ({ default: m.Mentions })));
const Credits = lazy(() => import("./screens/Credits").then((m) => ({ default: m.Credits })));
const Cuisine = lazy(() => import("./screens/Cuisine").then((m) => ({ default: m.Cuisine })));
const Stockage = lazy(() => import("./screens/Stockage").then((m) => ({ default: m.Stockage })));
const Carte = lazy(() => import("./screens/Carte").then((m) => ({ default: m.Carte })));
const Materiel = lazy(() => import("./screens/Materiel").then((m) => ({ default: m.Materiel })));
const GuideMateriel = lazy(() =>
  import("./screens/Materiel").then((m) => ({ default: m.GuideMateriel })),
);
const TechniqueDetail = lazy(() =>
  import("./screens/Techniques").then((m) => ({ default: m.TechniqueDetail })),
);
const EcrevissesIdent = lazy(() =>
  import("./screens/EcrevissesIdent").then((m) => ({ default: m.EcrevissesIdent })),
);
// Index des guides coindepeche.fr : rien de tout ça ne sert hors ligne, et
// personne n'y va au démarrage.
const Guides = lazy(() => import("./screens/Guides").then((m) => ({ default: m.Guides })));

export function App() {
  const { state, set, nav } = useStore();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [onboarded, setOnboarded] = useState(() => {
    try {
      return localStorage.getItem("onboarded") === "1";
    } catch {
      return true;
    }
  });
  const { needRefresh, applyUpdate, reportUpdate, maj, majReportable, reserve } = usePwa();
  const [persistMsg, setPersistMsg] = useState<string | null>(null);

  // Balance alerts live here, not in the Écrevisses screen: one tap on the nav
  // must not tear down the only thing that tells the angler to go pull a net.
  useCrayfishAlerts();

  // Surface silent IndexedDB write failures (quota, private mode) so a catch is
  // never implied "saved ✓" when it wasn't persisted.
  useEffect(() => onPersistError(setPersistMsg), []);

  // The same warning, but BEFORE the failure: storage nearly full is worth saying
  // everywhere, not only on the Stockage screen nobody visits until it's too late.
  const [quotaWarn, setQuotaWarn] = useState(false);
  useEffect(() => onQuotaWarning(setQuotaWarn), []);

  // onQuotaWarning only ever fires from a storageInfo() read, and until now
  // the only callers were the Stockage screen (on mount) and CatchEditor
  // (after a photo write) — so on a phone that's already saturated, reopening
  // the app stayed silent until the user happened to visit Stockage. Prime the
  // reading once at startup. The Storage API can be absent (older WebView):
  // fail silently, same as requestPersist below.
  useEffect(() => {
    storageInfo().catch(() => {});
  }, []);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Ask for persistent storage once, so the notebook + photos aren't evicted.
  useEffect(() => {
    requestPersist();
  }, []);

  // The gloves preference is persisted by the store, alongside the department
  // (lib/prefs.ts). It used to be written here too, from a second copy of the
  // key — one owner is enough.

  const finishOnboarding = () => {
    try {
      localStorage.setItem("onboarded", "1");
    } catch {
      /* ignore */
    }
    setOnboarded(true);
  };

  // All hooks are declared above — safe to early-return the onboarding screen.
  if (!onboarded) return <Onboarding onDone={finishOnboarding} />;

  const s = state.screen;
  // Detail screens (fiche) are nav-less with their own sticky action (v2).
  const showNav = s !== "cuisine" && s !== "fiche";
  const showFab = showNav && s !== "carte";
  // The "session running" pill follows the nav chrome, minus the screens that
  // are the session itself (already there) or its bilan.
  const showCrayfishPill = showNav && s !== "ecrevisses";

  return (
    <div className="app-frame" data-big={state.bigUI ? "1" : undefined}>
      {/* Per-screen boundary (keyed by screen so it resets on navigation): a
          render error in one screen shows recovery there while nav/chrome survive. */}
      <ErrorBoundary key={s}>
      <Suspense fallback={<div className="screen-loading">Chargement…</div>}>
        {s === "accueil" && <Accueil />}
        {s === "especes" && <Especes />}
        {s === "identify" && <Identify />}
        {s === "fiche" && <Fiche />}
        {s === "prise" && <Prise />}
        {s === "regle" && <Regle />}
        {s === "carnet" && <Carnet />}
        {s === "prise-detail" && <PriseDetail />}
        {s === "statistiques" && <Statistiques />}
        {s === "stockage" && <Stockage />}
        {s === "outils" && <Outils />}
        {s === "outils-terrain" && <OutilsTerrain />}
        {s === "ecrevisses" && <Ecrevisses />}
        {s === "ecrevisses-ident" && <EcrevissesIdent />}
        {s === "noeuds" && <Noeuds />}
        {s === "knot" && <NoeudFiche />}
        {s === "recette" && <Recette />}
        {s === "recettes" && <Recettes />}
        {s === "reglement" && <Reglement />}
        {s === "sources" && <Sources />}
        {s === "mentions-legales" && <Mentions />}
        {s === "credits" && <Credits />}
        {s === "guides" && <Guides />}
        {s === "cuisine" && <Cuisine />}
        {s === "carte" && <Carte />}
        {s === "materiel" && <Materiel />}
        {s === "guide-materiel" && <GuideMateriel />}
        {s === "technique" && <TechniqueDetail />}
      </Suspense>
      </ErrorBoundary>

      {/* La phrase suit l'état RÉEL de la réserve. Depuis que le précache est
          découpé (29 entrées au lieu de 250), « toutes les fiches restent
          disponibles » n'est vrai qu'une fois les 221 illustrations descendues :
          avant, le texte des fiches et la réglementation sont là, les photos
          pas encore. Voir lib/promesse-hors-ligne.ts. */}
      {offline && showNav && (
        <div className="offline">{promesseHorsLigne(reserve).texte}</div>
      )}

      {persistMsg && (
        <div className="persist-warn" role="alert">
          <span>{persistMsg}</span>
          <button onClick={() => nav("stockage")}>Gérer</button>
        </div>
      )}

      {/* A write that already failed outranks a warning about the next one. */}
      {!persistMsg && quotaWarn && (
        <div className="persist-warn" role="status">
          <span>Stockage bientôt plein — sauvegardez vos données pour ne rien perdre.</span>
          <button onClick={() => nav("stockage")}>Gérer</button>
        </div>
      )}

      {needRefresh && (
        <UpdateToast
          maj={maj}
          reportable={majReportable}
          onApply={() => applyUpdate()}
          onReport={() => reportUpdate()}
        />
      )}

      {showFab && (
        <button
          className="fab"
          title="Mode une main / gants"
          aria-label="Mode une main / gants"
          aria-pressed={state.bigUI}
          style={{ background: state.bigUI ? "var(--green)" : "var(--card)" }}
          onClick={() => set((st) => ({ bigUI: !st.bigUI }))}
        >
          <Icon d={ICONS.gloves} size={24} stroke={state.bigUI ? "var(--on-accent-warm)" : "var(--icon-muted)"} width={1.6} />
        </button>
      )}

      {showCrayfishPill && (
        <CrayfishBar raised={offline || !!persistMsg || quotaWarn || needRefresh} />
      )}

      {showNav && <BottomNav />}
    </div>
  );
}
