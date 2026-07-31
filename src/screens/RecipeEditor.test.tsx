// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoreProvider } from "../store";
import { RecipeEditor } from "./RecipeEditor";
import { SPECIES } from "../data/species";
import { nePasPecher } from "../data/peche-interdite";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
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

const rendre = () =>
  render(
    <StoreProvider>
      <RecipeEditor onDone={() => {}} onCancel={() => {}} />
    </StoreProvider>,
  );

/**
 * La garde de `data/peche-interdite.ts` s'appliquait au corpus embarqué mais pas
 * au sélecteur d'espèces de l'éditeur : on pouvait lier SA recette à
 * l'esturgeon européen, espèce protégée, et l'app affichait ensuite « Ma recette
 * · Esturgeon européen » — la seule phrase de l'app qui présente une espèce
 * protégée comme quelque chose qu'on cuisine.
 */
describe("RecipeEditor — sélecteur d'espèces", () => {
  it("ne propose aucune espèce protégée", async () => {
    const user = userEvent.setup();
    rendre();
    const protegee = SPECIES.find((s) => s.protected)!;
    expect(protegee).toBeDefined();

    await user.type(screen.getByLabelText(/Rechercher l'espèce/i), protegee.name);
    expect(screen.queryByRole("button", { name: protegee.name })).toBeNull();
  });

  it("propose toujours les espèces ordinaires", async () => {
    const user = userEvent.setup();
    rendre();
    await user.type(screen.getByLabelText(/Rechercher l'espèce/i), "brochet");
    expect(screen.getByRole("button", { name: "Brochet" })).toBeInTheDocument();
  });

  it("aucune espèce protégée du catalogue ne ressort, cherchée par son propre nom", async () => {
    const protegees = SPECIES.filter((s) => s.protected);
    expect(protegees.length).toBeGreaterThan(0);
    for (const sp of protegees) {
      const user = userEvent.setup();
      const { unmount } = rendre();
      await user.type(screen.getByLabelText(/Rechercher l'espèce/i), sp.name);
      expect(screen.queryByRole("button", { name: sp.name })).toBeNull();
      unmount();
    }
  });

  // Le régime spécial, lui, RESTE proposé : anguille et aloses sont légalement
  // pêchables selon le bassin, et le corpus embarqué garde leurs recettes (avec
  // leur avertissement). Les retirer d'ici serait plus strict que la loi, et
  // plus strict que le reste de l'app.
  it("laisse choisir une espèce sous régime spécial", async () => {
    const user = userEvent.setup();
    rendre();
    const speciale = SPECIES.find((s) => !s.protected && nePasPecher(s))!;
    await user.type(screen.getByLabelText(/Rechercher l'espèce/i), speciale.name);
    expect(screen.getByRole("button", { name: speciale.name })).toBeInTheDocument();
  });
});
