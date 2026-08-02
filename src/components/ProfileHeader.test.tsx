// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoreProvider } from "../store";
import { ProfileHeader } from "./ProfileHeader";

// L'en-tête du profil affiche une fiche, puis un formulaire, aux mêmes places de
// l'arbre React. Rien ne garantissait que React ne recycle pas un champ de la
// fiche en champ du formulaire — et il le faisait.

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

/** Les avertissements React de développement passent par console.error. Les
 *  laisser filer, c'est les laisser revenir : on les capture et on échoue. */
let errors: string[] = [];
let spy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  localStorage.clear();
  errors = [];
  spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  });
});
afterEach(() => spy.mockRestore());

const mount = () =>
  render(
    <StoreProvider>
      <ProfileHeader />
    </StoreProvider>,
  );

describe("ProfileHeader — ouverture du formulaire", () => {
  it("n'émet aucun avertissement React en ouvrant l'édition", async () => {
    const user = userEvent.setup();
    mount();

    await user.click(screen.getByRole("button", { name: "Modifier le profil" }));

    expect(screen.getByPlaceholderText("Votre nom")).toBeInTheDocument();
    expect(errors).toEqual([]);
  });

  // React ne signale « uncontrolled input to be controlled » qu'une fois par
  // processus : un second test sur console.error passerait au vert sans rien
  // prouver. La cause, elle, se teste directement — et à chaque fois.
  it("ne recycle pas l'input fichier de l'avatar en champ de texte", async () => {
    const user = userEvent.setup();
    const { container } = mount();

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Modifier le profil" }));

    // Si React réutilise le nœud DOM, l'input fichier EST devenu le champ nom.
    expect(fileInput).not.toBe(screen.getByPlaceholderText("Votre nom"));
  });
});
