// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoreProvider } from "../store";
import { useStore } from "../store-hooks";
import { Onboarding } from "./Onboarding";
import { DEPARTEMENTS } from "../data/regulation";

// The app applies one département's arrêté préfectoral to every verdict it
// gives. Until now nothing ever asked which one — it just assumed Loir-et-Cher.
// The first screen is the only place where asking costs the user nothing.

// lib/pwa imports `virtual:pwa-register`, a module that only exists once
// vite-plugin-pwa has run. Nothing here tests the install prompt.
vi.mock("../lib/pwa", () => ({
  usePwa: () => ({ installable: false, promptInstall: vi.fn(), needRefresh: false }),
}));

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

/** Mirrors the two store fields under test into the DOM, so assertions read
 *  what the app would actually apply rather than a captured variable. */
function Probe() {
  const { state } = useStore();
  return (
    <>
      <span data-testid="dept">{state.dept}</span>
      <span data-testid="deptChosen">{String(state.deptChosen)}</span>
    </>
  );
}
const mount = (onDone = () => {}) =>
  render(
    <StoreProvider>
      <Onboarding onDone={onDone} />
      <Probe />
    </StoreProvider>,
  );

beforeEach(() => localStorage.clear());

describe("Onboarding — choix du département", () => {
  it("propose les trois départements couverts", () => {
    mount();

    for (const d of Object.values(DEPARTEMENTS)) {
      // Exact string, not RegExp: the names contain "(23)" and parentheses
      // would be read as a capture group.
      expect(screen.getByRole("button", { name: d.name })).toBeInTheDocument();
    }
  });

  it("retient le département choisi et le marque comme confirmé", async () => {
    mount();

    await userEvent.click(screen.getByRole("button", { name: DEPARTEMENTS["36"].name }));

    expect(screen.getByTestId("dept")).toHaveTextContent("36");
    expect(screen.getByTestId("deptChosen")).toHaveTextContent("true");
  });

  it("laisse entrer sans choisir — le bandeau prendra le relais", async () => {
    const onDone = vi.fn();
    mount(onDone);

    await userEvent.click(screen.getByRole("button", { name: /Ouvrir le carnet/i }));

    // Never gate the door of an offline-first field app on a form.
    expect(onDone).toHaveBeenCalled();
    expect(screen.getByTestId("deptChosen")).toHaveTextContent("false");
  });
});
