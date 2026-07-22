import { useEffect, useState, lazy, Suspense } from "react";
import { useStore } from "./store";
import { BottomNav } from "./components/BottomNav";
import { Icon, ICONS } from "./components/Icon";
import { Accueil } from "./screens/Accueil";
import { Especes } from "./screens/Especes";
import { Identify } from "./screens/Identify";
import { Fiche } from "./screens/Fiche";
import { Prise } from "./screens/Prise";
import { Regle } from "./screens/Regle";
import { Carnet } from "./screens/Carnet";
import { PriseDetail } from "./screens/PriseDetail";
import { Statistiques } from "./screens/Statistiques";
import { Outils } from "./screens/Outils";
import { OutilsTerrain } from "./screens/OutilsTerrain";
import { MesRecettes } from "./screens/MesRecettes";
import { Noeuds, KnotDetail } from "./screens/Noeuds";
import { Recette } from "./screens/Recette";
import { Reglement } from "./screens/Reglement";
import { Sources } from "./screens/Sources";
import { Credits } from "./screens/Credits";
import { Cuisine } from "./screens/Cuisine";
import { Stockage } from "./screens/Stockage";
import { Onboarding } from "./components/Onboarding";
import { usePwa } from "./lib/pwa";
import { requestPersist } from "./lib/storage";

// Heavier / non-startup screens are code-split (Carte pulls in MapLibre GL).
const Carte = lazy(() => import("./screens/Carte").then((m) => ({ default: m.Carte })));
const Materiel = lazy(() => import("./screens/Materiel").then((m) => ({ default: m.Materiel })));
const GuideMateriel = lazy(() =>
  import("./screens/Materiel").then((m) => ({ default: m.GuideMateriel })),
);
const Techniques = lazy(() =>
  import("./screens/Techniques").then((m) => ({ default: m.Techniques })),
);
const TechniqueDetail = lazy(() =>
  import("./screens/Techniques").then((m) => ({ default: m.TechniqueDetail })),
);

export function App() {
  const { state, set } = useStore();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [onboarded, setOnboarded] = useState(() => {
    try {
      return localStorage.getItem("onboarded") === "1";
    } catch {
      return true;
    }
  });
  const { needRefresh, applyUpdate } = usePwa();

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

  // Persist the gloves / big-UI preference across sessions.
  useEffect(() => {
    try {
      localStorage.setItem("bigUI", state.bigUI ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [state.bigUI]);

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

  return (
    <div className="app-frame" data-big={state.bigUI ? "1" : undefined}>
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
        {s === "mes-recettes" && <MesRecettes />}
        {s === "noeuds" && <Noeuds />}
        {s === "knot" && <KnotDetail />}
        {s === "recette" && <Recette />}
        {s === "reglement" && <Reglement />}
        {s === "sources" && <Sources />}
        {s === "credits" && <Credits />}
        {s === "cuisine" && <Cuisine />}
        {s === "carte" && <Carte />}
        {s === "materiel" && <Materiel />}
        {s === "guide-materiel" && <GuideMateriel />}
        {s === "techniques" && <Techniques />}
        {s === "technique" && <TechniqueDetail />}
      </Suspense>

      {offline && showNav && (
        <div className="offline">Hors-ligne — toutes les fiches restent disponibles</div>
      )}

      {needRefresh && (
        <div className="update-toast">
          <span>Nouvelle version disponible</span>
          <button onClick={() => applyUpdate()}>Mettre à jour</button>
        </div>
      )}

      {showFab && (
        <button
          className="fab"
          title="Mode une main / gants"
          aria-label="Mode une main / gants"
          aria-pressed={state.bigUI}
          style={{ background: state.bigUI ? "#1D6E42" : "#FFFFFF" }}
          onClick={() => set((st) => ({ bigUI: !st.bigUI }))}
        >
          <Icon d={ICONS.gloves} size={24} stroke={state.bigUI ? "#FBFAF7" : "#4A5D52"} width={1.6} />
        </button>
      )}

      {showNav && <BottomNav />}
    </div>
  );
}
