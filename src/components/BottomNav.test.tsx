// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { StoreProvider } from "../store";
import { BottomNav } from "./BottomNav";

/**
 * La barre du bas est le seul moyen de changer d'onglet, et elle n'était qu'un
 * `<div>` : `grep "<nav"` sur src/ rendait 0. Un lecteur d'écran n'avait donc
 * aucun repère de navigation à atteindre — il fallait parcourir tout l'écran
 * pour retomber dessus.
 */
vi.mock("../lib/db", () => ({
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

describe("BottomNav", () => {
  it("est un repère de navigation, et se nomme", () => {
    render(
      <StoreProvider>
        <BottomNav />
      </StoreProvider>,
    );

    const nav = screen.getByRole("navigation", { name: "Navigation principale" });
    expect(nav).toBeInTheDocument();
  });

  it("porte les cinq destinations, dont « Ma prise »", () => {
    render(
      <StoreProvider>
        <BottomNav />
      </StoreProvider>,
    );

    const nav = screen.getByRole("navigation");
    for (const nom of [/Accueil/, /Espèces/, /Ma prise/, /Carte/, /Carnet/]) {
      expect(within(nav).getByRole("button", { name: nom })).toBeInTheDocument();
    }
  });

  it("marque l'onglet courant avec aria-current, pas seulement une couleur", () => {
    render(
      <StoreProvider>
        <BottomNav />
      </StoreProvider>,
    );

    // L'onglet par défaut est l'accueil.
    expect(screen.getByRole("button", { name: "Accueil" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "Carnet" })).not.toHaveAttribute("aria-current");
  });
});
