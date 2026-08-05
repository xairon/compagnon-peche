// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoreProvider } from "../store";
import { CatchEditor } from "./CatchEditor";

/**
 * La galerie, en plus de l'appareil photo, dans l'éditeur du carnet.
 *
 * Même exigence que l'écran Consigner (prise-consigner.test.tsx) : un
 * `capture="environment"` force l'appareil photo sur mobile, et le pêcheur
 * qui veut reprendre un cliché déjà pris ne peut pas. L'éditeur du carnet
 * (ajout et correction d'une prise) doit offrir les deux sources — la prise
 * d'image directe reste le geste principal, le picker natif l'alternative.
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

const vraiC = URL.createObjectURL;
const vraiR = URL.revokeObjectURL;
beforeEach(() => {
  URL.createObjectURL = (() => "blob:essai") as typeof URL.createObjectURL;
  URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
});
afterEach(() => {
  URL.createObjectURL = vraiC;
  URL.revokeObjectURL = vraiR;
});

const dansStore = (el: React.ReactElement) =>
  render(<StoreProvider>{el}</StoreProvider>);

/** L'entrée « appareil photo » — la première des deux. */
const inputAppareil = () =>
  document.querySelectorAll<HTMLInputElement>('input[type="file"]')[0];
/** L'entrée « galerie » — la seconde, sans capture. */
const inputGalerie = () =>
  document.querySelectorAll<HTMLInputElement>('input[type="file"]')[1];

describe("CatchEditor — la galerie en plus de l'appareil photo", () => {
  it("propose les deux sources : appareil photo et galerie", () => {
    dansStore(<CatchEditor onSave={() => {}} onCancel={() => {}} />);

    expect(screen.getByText(/Prendre une photo/)).toBeInTheDocument();
    expect(screen.getByText(/Choisir dans la galerie/)).toBeInTheDocument();
  });

  it("seule l'entrée appareil force la capture — la galerie garde le picker ouvert", () => {
    dansStore(<CatchEditor onSave={() => {}} onCancel={() => {}} />);

    expect(inputAppareil()).toHaveAttribute("capture", "environment");
    expect(inputGalerie()).not.toHaveAttribute("capture");
  });

  it("un fichier choisi dans la galerie alimente l'aperçu", async () => {
    const user = userEvent.setup();
    dansStore(<CatchEditor onSave={() => {}} onCancel={() => {}} />);

    await user.upload(inputGalerie(), new File(["abc"], "souvenir.jpg", { type: "image/jpeg" }));

    expect(screen.getByRole("img", { name: "Photo de la prise" })).toBeInTheDocument();
  });

  it("l'input est vidé après sélection : reprendre le même cliché le re-déclenche", async () => {
    const user = userEvent.setup();
    dansStore(<CatchEditor onSave={() => {}} onCancel={() => {}} />);

    await user.upload(inputGalerie(), new File(["abc"], "souvenir.jpg", { type: "image/jpeg" }));
    // Le fichier ne doit pas rester « en attente » dans l'input : sinon,
    // re-choisir le même cliché (après l'avoir retiré) ne déclencherait rien.
    expect(inputGalerie().value).toBe("");
  });
});
