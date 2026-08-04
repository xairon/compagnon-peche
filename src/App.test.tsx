// @vitest-environment jsdom
//
// Test de régression App : le contrat de layout du shell.
//
// `.app-frame` est une flex column à hauteur fixe (100dvh) avec `overflow:
// hidden` ; `.screen` (l'écran) est `flex: 1; overflow-y: auto` en tant
// qu'ENFANT DIRECT de `.app-frame`, et `.bottom-nav` ferme la colonne
// (`flex-shrink: 0`). Si un wrapper s'intercale, le `flex: 1` de l'écran ne
// s'applique plus, le contenu grandit, et la barre du bas est poussée sous le
// cadre puis coupée — « je n'ai plus la barre du bas » (régression réelle du
// commit ea4edbb, remontée par l'utilisateur après déploiement).
//
// Ce test verrouille : la barre du bas EST rendue par App, et l'écran reste un
// enfant DIRECT de `.app-frame` (aucun wrapper).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { StoreProvider } from "./store";
import { App } from "./App";

// NB : `virtual:pwa-register` est résolu par l'alias de vitest.config.ts
// (stub dans src/test-utils/) — le plugin n'existe pas sous vitest.

vi.mock("./lib/db", () => ({
  runMigrations: vi.fn(async () => {}),
  loadCatches: vi.fn(async () => []),
  saveCatches: vi.fn(async () => {}),
  loadSpots: vi.fn(async () => []),
  saveSpots: vi.fn(async () => {}),
  loadGear: vi.fn(async () => []),
  saveGear: vi.fn(async () => {}),
  loadProfile: vi.fn(async () => ({ name: "", bio: "", region: "" })),
  saveProfile: vi.fn(async () => {}),
  loadRecipes: vi.fn(async () => []),
  saveRecipes: vi.fn(async () => {}),
  loadCrayfish: vi.fn(async () => []),
  saveCrayfish: vi.fn(async () => {}),
}));

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
  keys: vi.fn(async () => []),
  clear: vi.fn(async () => {}),
}));

vi.mock("./lib/photos", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./lib/photos")>();
  return {
    ...mod,
    usePhotoUrl: vi.fn(() => null),
    savePhoto: vi.fn(async () => {}),
    deletePhoto: vi.fn(async () => {}),
    downscaleImage: vi.fn(async (f: File) => f),
  };
});

beforeEach(() => {
  localStorage.setItem("onboarded", "1");
});

function monterApp() {
  return render(
    <StoreProvider>
      <App />
    </StoreProvider>,
  );
}

/** La barre du bas est rendue (et l'écran d'accueil a fini de charger). */
async function attendreBarre() {
  await waitFor(
    () =>
      expect(
        screen.getByRole("navigation", { name: "Navigation principale" }),
      ).toBeInTheDocument(),
    { timeout: 3000 },
  );
}

describe("App — le shell garde la barre du bas", () => {
  it("rend la barre de navigation sur l'accueil", async () => {
    monterApp();
    await attendreBarre();
    expect(screen.getByRole("button", { name: /Accueil/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Carnet/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ma prise/ })).toBeInTheDocument();
  });

  it("l'écran reste un enfant DIRECT de .app-frame (contrat flex du shell)", async () => {
    const { container } = monterApp();
    await attendreBarre();
    // Le chunk lazy met ~1 s à se résoudre sous vitest : attendre l'écran,
    // pas seulement la barre (qui s'affiche dès le premier rendu).
    await waitFor(
      () =>
        expect(
          container.querySelector(".app-frame > main.screen, .app-frame > .screen"),
        ).not.toBeNull(),
      { timeout: 5000 },
    );
    const frame = container.querySelector(".app-frame");
    expect(frame).not.toBeNull();
    // Échec si un wrapper (ex. <div ref>) s'intercale : le flex: 1 de
    // l'écran meurt et BottomNav sort du cadre (overflow: hidden).
    // (Pas de `:scope >` : jsdom ne l'implémente pas dans querySelector.)
    expect(container.querySelector(".app-frame > .bottom-nav")).not.toBeNull();
  });
});
