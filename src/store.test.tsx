// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useEffect } from "react";
import { render, screen, act } from "@testing-library/react";
import { StoreProvider } from "./store";
import { useStore } from "./store-hooks";
import { readPrefs } from "./lib/prefs";

// IndexedDB does not exist in jsdom, so the notebook stores are mocked. What is
// under test here is the *preferences* path, which is deliberately localStorage
// and synchronous — see lib/prefs.ts.
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

/** Renders the department the store currently applies, and exposes `set`. */
let setState: ReturnType<typeof useStore>["set"];
function Probe() {
  const { state, set } = useStore();
  // In an effect, not during render: assigning to an outer binding while
  // rendering is a side effect, and React may re-render at any time.
  useEffect(() => {
    setState = set;
  }, [set]);
  return <span data-testid="dept">{state.dept}</span>;
}
const mount = () =>
  render(
    <StoreProvider>
      <Probe />
    </StoreProvider>,
  );

beforeEach(() => localStorage.clear());

describe("département actif", () => {
  it("démarre sur le Loir-et-Cher quand l'utilisateur n'a jamais choisi", () => {
    mount();

    expect(screen.getByTestId("dept")).toHaveTextContent("41");
  });

  it("repart sur le département choisi au lancement suivant", () => {
    // The bug this locks down: `dept` was hard-coded in initialState and no
    // persistence effect touched it, so an Indre angler was silently put back
    // on Loir-et-Cher rules — a MORE permissive salmonid quota than their own.
    const first = mount();
    act(() => setState({ dept: "36" }));
    first.unmount();

    mount();

    expect(screen.getByTestId("dept")).toHaveTextContent("36");
  });

  it("écrit le choix là où prefs le relit", () => {
    mount();

    act(() => setState({ dept: "23" }));

    expect(readPrefs().dept).toBe("23");
  });

  it("persiste aussi le mode gants, sans attendre l'hydratation d'IndexedDB", () => {
    const first = mount();
    act(() => setState({ bigUI: true }));
    first.unmount();

    mount();

    expect(readPrefs().bigUI).toBe(true);
  });
});
