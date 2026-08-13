// @vitest-environment jsdom
// Validation des mesures du carnet (BUG-01/BUG-02 du rapport QA 2026-08-11).
// Une taille négative ou une valeur extrême ne doit pas entrer dans le carnet :
// message d'erreur visible, enregistrement bloqué.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoreProvider } from "../store";
import { CatchEditor } from "./CatchEditor";

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

const dansStore = (el: React.ReactElement) =>
  render(<StoreProvider>{el}</StoreProvider>);

describe("CatchEditor — validation des mesures (QA 2026-08-11)", () => {
  it("rejette une taille négative (BUG-01) : message + enregistrement bloqué", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    dansStore(<CatchEditor onSave={onSave} onCancel={() => {}} />);

    await user.type(screen.getByLabelText("Taille (cm)"), "-10");
    await user.click(screen.getByRole("button", { name: "Ajouter la prise" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/La taille doit être un nombre entier entre 1 et 300 cm/);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejette une valeur extrême (BUG-02) : taille 999999 et poids 999999", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    dansStore(<CatchEditor onSave={onSave} onCancel={() => {}} />);

    await user.type(screen.getByLabelText("Taille (cm)"), "999999");
    await user.type(screen.getByLabelText("Poids (kg)"), "999999");
    await user.click(screen.getByRole("button", { name: "Ajouter la prise" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/taille/);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejette un poids non numérique", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    dansStore(<CatchEditor onSave={onSave} onCancel={() => {}} />);

    await user.type(screen.getByLabelText("Taille (cm)"), "52");
    await user.type(screen.getByLabelText("Poids (kg)"), "abc");
    await user.click(screen.getByRole("button", { name: "Ajouter la prise" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/poids/);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("le message disparaît dès qu'on retouche le champ, puis la saisie passe", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    dansStore(<CatchEditor onSave={onSave} onCancel={() => {}} />);

    const taille = screen.getByLabelText("Taille (cm)");
    await user.type(taille, "-10");
    await user.click(screen.getByRole("button", { name: "Ajouter la prise" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Correction : la saisie devient valide, l'erreur disparaît, onSave passe.
    await user.clear(taille);
    await user.type(taille, "52");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ajouter la prise" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].n).toBe(52);
  });

  it("accepte un poids en virgule française", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    dansStore(<CatchEditor onSave={onSave} onCancel={() => {}} />);

    await user.type(screen.getByLabelText("Taille (cm)"), "52");
    await user.type(screen.getByLabelText("Poids (kg)"), "1,8");
    await user.click(screen.getByRole("button", { name: "Ajouter la prise" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].weight).toBe(1.8);
  });
});
