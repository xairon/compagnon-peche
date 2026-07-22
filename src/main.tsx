import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StoreProvider } from "./store";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initPwa } from "./lib/pwa";
import "./fonts.css";
import "./styles.css";

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
