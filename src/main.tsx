import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StoreProvider } from "./store";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initPwa } from "./lib/pwa";
import { prefetchHeavyScreens } from "./lib/prefetch";
import { installGlobalErrorHandlers } from "./lib/global-errors";
import "./fonts.css";
import "./styles.css";

// Before render: an error thrown during the first paint should still surface.
// Covers what ErrorBoundary structurally cannot — rejections, event handlers,
// timers. Nothing leaves the device.
installGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <StoreProvider>
        <App />
      </StoreProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// Register the service worker (prompt mode) + capture the install prompt.
initPwa();

// L'écran Carte (MapLibre ≈ 970 Ko) se précharge pendant l'inactivité du
// démarrage : le premier passage sur l'onglet Carte ne paie plus le
// téléchargement. Voir lib/prefetch.ts.
prefetchHeavyScreens();
