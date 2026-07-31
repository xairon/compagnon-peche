import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StoreProvider } from "./store";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initPwa } from "./lib/pwa";
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
