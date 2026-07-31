// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoreProvider } from "../store";
import { CatchEditor } from "./CatchEditor";
import { MapControls } from "./MapControls";
import { Carnet } from "../screens/Carnet";
import { Ecrevisses } from "../screens/Ecrevisses";
import { Especes } from "../screens/Especes";
import { Materiel } from "../screens/Materiel";

/**
 * Les bascules doivent DIRE leur état, pas seulement le peindre.
 *
 * Avant ce lot, l'état d'un filtre, d'un onglet ou d'un choix gardé/relâché
 * n'existait que dans un `className` et une couleur de fond : un lecteur
 * d'écran lisait « Carnassiers, bouton » aussi bien quand le filtre était actif
 * que quand il ne l'était pas, et rien n'annonçait le changement au clic.
 *
 * CE QUE CE FICHIER NE COUVRE PAS : les bascules de Carte.tsx et Prise.tsx
 * (autres lots), et le bouton « gants » de App.tsx — qui, lui, portait déjà
 * `aria-pressed`.
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

function dansStore(el: React.ReactElement) {
  return render(<StoreProvider>{el}</StoreProvider>);
}

describe("Bascules — l'état est annoncé, pas seulement peint", () => {
  it("Espèces : le filtre de groupe dit lequel est actif, et le suit", async () => {
    const user = userEvent.setup();
    dansStore(<Especes />);

    expect(screen.getByRole("button", { name: "Toutes" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const carnassiers = screen.getByRole("button", { name: "Carnassiers" });
    expect(carnassiers).toHaveAttribute("aria-pressed", "false");

    await user.click(carnassiers);

    expect(carnassiers).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Toutes" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("Carnet : l'onglet ouvert se distingue des trois autres", async () => {
    const user = userEvent.setup();
    dansStore(<Carnet />);

    const prises = await screen.findByRole("button", { name: /^Prises/ });
    const spots = screen.getByRole("button", { name: /^Spots/ });
    expect(prises).toHaveAttribute("aria-pressed", "true");
    expect(spots).toHaveAttribute("aria-pressed", "false");

    await user.click(spots);
    expect(spots).toHaveAttribute("aria-pressed", "true");
  });

  it("Matériel : l'onglet matériel / ensembles dit lequel est ouvert", async () => {
    const user = userEvent.setup();
    dansStore(<Materiel />);

    const mat = await screen.findByRole("button", { name: /Mon matériel/ });
    const ens = screen.getByRole("button", { name: /Mes ensembles/ });
    expect(mat).toHaveAttribute("aria-pressed", "true");
    expect(ens).toHaveAttribute("aria-pressed", "false");

    await user.click(ens);
    expect(ens).toHaveAttribute("aria-pressed", "true");
  });

  it("Écrevisses : le temps de trempe retenu est annoncé", async () => {
    const user = userEvent.setup();
    dansStore(<Ecrevisses />);
    await screen.findByRole("heading", { level: 1 });

    const vingt = screen.getByRole("button", { name: "20 min" });
    const trente = screen.getByRole("button", { name: "30 min" });
    expect(vingt).toHaveAttribute("aria-pressed", "true");
    expect(trente).toHaveAttribute("aria-pressed", "false");

    await user.click(trente);
    expect(trente).toHaveAttribute("aria-pressed", "true");
  });

  it("Éditeur de prise : gardé / relâché est une bascule, et le dit", async () => {
    const user = userEvent.setup();
    dansStore(<CatchEditor onSave={() => {}} onCancel={() => {}} />);

    const garde = screen.getByRole("button", { name: "Gardé" });
    const relache = screen.getByRole("button", { name: "Relâché" });
    // Par défaut la prise est relâchée : c'est ce que doit lire un lecteur d'écran.
    expect(relache).toHaveAttribute("aria-pressed", "true");
    expect(garde).toHaveAttribute("aria-pressed", "false");

    await user.click(garde);
    expect(garde).toHaveAttribute("aria-pressed", "true");
    expect(relache).toHaveAttribute("aria-pressed", "false");
  });

  it("Éditeur de prise : l'espèce retenue et le matériel coché sont annoncés", async () => {
    const user = userEvent.setup();
    dansStore(<CatchEditor onSave={() => {}} onCancel={() => {}} />);

    // L'espèce par défaut est le sandre.
    const sandre = screen.getByRole("button", { name: "Sandre" });
    const brochet = screen.getByRole("button", { name: "Brochet" });
    expect(sandre).toHaveAttribute("aria-pressed", "true");
    expect(brochet).toHaveAttribute("aria-pressed", "false");

    await user.click(brochet);
    expect(brochet).toHaveAttribute("aria-pressed", "true");
    expect(sandre).toHaveAttribute("aria-pressed", "false");
  });

  it("Matériel : cocher un élément d'un ensemble s'annonce comme une case", async () => {
    const user = userEvent.setup();
    dansStore(<Materiel />);

    // Un ensemble se compose d'éléments existants : il en faut un.
    await user.click(await screen.findByRole("button", { name: /Ajouter du matériel/ }));
    await user.type(screen.getByLabelText(/^Nom$/), "Canne spinning");
    await user.click(screen.getByRole("button", { name: "Ajouter" }));

    await user.click(screen.getByRole("button", { name: /Mes ensembles/ }));
    await user.click(screen.getByRole("button", { name: /Créer un ensemble/ }));

    const ligne = screen.getByRole("checkbox", { name: /Canne spinning/ });
    expect(ligne).toHaveAttribute("aria-checked", "false");
    await user.click(ligne);
    expect(ligne).toHaveAttribute("aria-checked", "true");
  });

  it("Carte — calques : le fond de carte choisi est annoncé", async () => {
    const user = userEvent.setup();
    render(
      <MapControls
        basemap="carto"
        onBasemap={() => {}}
        layers={{
          obstacles: false,
          access: false,
          stations: true,
          spots: false,
          gbif: false,
          parcours: false,
          categorie: false,
        }}
        onToggle={() => {}}
        onGeopeche={() => {}}
        onList={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Calques/ }));

    expect(screen.getByRole("button", { name: "Carte" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Satellite" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
