// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoreProvider } from "../store";
import { CatchEditor } from "./CatchEditor";
import { RecipeEditor } from "../screens/RecipeEditor";
import { Ecrevisses } from "../screens/Ecrevisses";
import { Materiel } from "../screens/Materiel";

/**
 * Balayage des formulaires : un `<label>` doit désigner un champ.
 *
 * Ce n'est pas un point de théorie sur les lecteurs d'écran. Un label associé
 * étend la zone cliquable du champ AU LIBELLÉ : toucher le mot « Poids » pose
 * le curseur dans la case. Sans association, la cible se réduit à la case
 * seule — la moitié — et c'est avec des gants mouillés, au bord de l'eau, que
 * ça se paie.
 *
 * Mesuré le 31/07/2026 avant ce lot : 37 `<label>` dans le dépôt, un seul
 * `htmlFor` (components/RegTiers.tsx). Les 4 labels d'Écrevisses enveloppent
 * déjà leur champ (association implicite, valide).
 *
 * CE QUE CE BALAYAGE NE COUVRE PAS : ProfileHeader (8 labels), Carte (5) et
 * Prise (1) appartiennent à d'autres lots de la vague — ils ne sont ni montés
 * ni corrigés ici. Voir le rapport du lot.
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

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

/** Tous les <label> porteurs de texte doivent désigner un champ. */
function labelsOrphelins(root: HTMLElement): string[] {
  return [...root.querySelectorAll("label")]
    .filter((l) => (l.textContent || "").trim().length > 0)
    .filter((l) => l.control === null)
    .map((l) => (l.textContent || "").trim());
}

function dansStore(el: React.ReactElement) {
  return render(<StoreProvider>{el}</StoreProvider>);
}

describe("Formulaires — chaque libellé désigne son champ", () => {
  it("CatchEditor : aucun label orphelin", () => {
    const { container } = dansStore(<CatchEditor onSave={() => {}} onCancel={() => {}} />);
    expect(labelsOrphelins(container)).toEqual([]);
  });

  it("CatchEditor : toucher « Poids (kg) » atteint bien le champ du poids", async () => {
    const user = userEvent.setup();
    dansStore(<CatchEditor onSave={() => {}} onCancel={() => {}} />);

    const champ = screen.getByLabelText(/Poids \(kg\)/);
    await user.type(champ, "1,8");
    expect(champ).toHaveValue("1,8");
  });

  it("CatchEditor : les huit autres libellés atteignent leur champ", () => {
    dansStore(<CatchEditor onSave={() => {}} onCancel={() => {}} />);
    for (const libelle of [
      /Taille \(cm\)/,
      /^Date$/,
      /^Heure$/,
      /^Lieu$/,
      /Appât \/ leurre/,
      /^Technique$/,
      /^Note$/,
    ]) {
      expect(screen.getByLabelText(libelle)).toBeInTheDocument();
    }
  });

  it("RecipeEditor : aucun label orphelin", () => {
    const { container } = dansStore(
      <RecipeEditor onDone={() => {}} onCancel={() => {}} />,
    );
    expect(labelsOrphelins(container)).toEqual([]);
    expect(screen.getByLabelText(/^Titre$/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ingrédients/)).toBeInTheDocument();
  });

  it("Matériel : le formulaire d'ajout n'a aucun label orphelin", async () => {
    const user = userEvent.setup();
    const { container } = dansStore(<Materiel />);

    await user.click(await screen.findByRole("button", { name: /Ajouter du matériel/ }));

    expect(labelsOrphelins(container)).toEqual([]);
    expect(screen.getByLabelText(/^Nom$/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Détail/)).toBeInTheDocument();
  });

  it("Écrevisses : les labels enveloppants restent associés", async () => {
    const { container } = dansStore(<Ecrevisses />);
    await screen.findByRole("heading", { level: 1 });
    expect(labelsOrphelins(container)).toEqual([]);
  });
});
