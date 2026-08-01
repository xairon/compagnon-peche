// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StoreProvider } from "../store";
import { Especes } from "./Especes";
import { CLE_COIN } from "../lib/prefs-coin";
import type { CoinEspeces } from "../lib/especes-du-coin";

// Le filtre masque — c'est ce qui a été demandé — mais il dit toujours combien,
// et il se défait en un appui. Les relevés ASPE ne sont pas exhaustifs :
// l'électro-pêche capture mal les gros silures et les carpes de fond.

const COIN: CoinEspeces = {
  ids: ["brochet", "sandre", "perche"],
  ecrevisses: ["louisiane"],
  inconnus: ["Cyprinidae sp."],
  stations: [{ code: "04052800", nom: "COSSON à CHAILLES", dist: 5.06 }],
  lat: 47.586,
  lon: 1.336,
  releveIso: "2026-08-01",
};

const poser = () => render(
  <StoreProvider>
    <Especes />
  </StoreProvider>,
);

beforeEach(() => localStorage.clear());
// `unstubAllGlobals` en plus de `restoreAllMocks` : sans lui, le `navigator`
// stubé par les deux derniers tests fuirait sur les suivants.
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Especes — filtre du coin", () => {
  it("ne masque rien tant que le pêcheur n'a rien demandé", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify(COIN));
    poser();

    // Un relevé enregistré ne doit PAS allumer le filtre au lancement :
    // ouvrir l'app et trouver 95 espèces déjà masquées serait une surprise.
    expect(screen.getByLabelText("Fiche Brochet")).toBeTruthy();
    expect(screen.getByLabelText("Fiche Ablette")).toBeTruthy();
  });

  it("masque les espèces hors relevé quand la bascule est allumée", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify(COIN));
    poser();

    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));

    expect(screen.getByLabelText("Fiche Brochet")).toBeTruthy();
    expect(screen.queryByLabelText("Fiche Ablette")).toBeNull();
  });

  it("dit combien d'espèces il cache, et les rend en un appui", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify(COIN));
    poser();
    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));

    const reste = screen.getByRole("button", { name: /126 autres espèces/i });
    fireEvent.click(reste);

    expect(screen.getByLabelText("Fiche Ablette")).toBeTruthy();
  });

  it("cite ses stations et la date du relevé", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify(COIN));
    poser();
    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));

    // La provenance n'est pas décorative : elle est ce qui permet au pêcheur
    // de juger si le relevé parle bien de son coin.
    expect(screen.getByText(/COSSON à CHAILLES/)).toBeTruthy();
    expect(screen.getByText(/5,1 km/)).toBeTruthy();
    expect(screen.getByText(/01\/08\/2026/)).toBeTruthy();
  });

  it("n'écrit jamais le mot « rivière »", () => {
    // Une station retenue peut être à 14 km sur un autre ruisseau. Dire
    // « votre rivière » affirmerait ce qui n'a pas été constaté.
    localStorage.setItem(CLE_COIN, JSON.stringify(COIN));
    const { container } = poser();
    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));

    expect(container.textContent).not.toMatch(/rivière/i);
  });

  it("se combine avec un groupe au lieu de le remplacer", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify(COIN));
    poser();
    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));
    fireEvent.click(screen.getByRole("button", { name: "Carnassiers" }));

    expect(screen.getByLabelText("Fiche Brochet")).toBeTruthy();
    // La perche est au relevé et carnassière ; le gardon n'est ni l'un ni
    // l'autre. Si le coin remplaçait le groupe, l'un des deux sortirait.
    expect(screen.getByLabelText("Fiche Perche")).toBeTruthy();
    expect(screen.queryByLabelText("Fiche Gardon")).toBeNull();
  });

  it("annonce les taxons sans fiche et les écrevisses, séparément", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify(COIN));
    poser();
    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));

    expect(screen.getByText(/1 taxon relevé n'a pas de fiche/)).toBeTruthy();
    expect(screen.getByText(/1 écrevisse relevée/)).toBeTruthy();
  });

  it("dit que la liste ne peut pas être établie hors-ligne, sans relevé", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("hors-ligne");
    }));
    // `navigator` n'est PAS étalé ici : ses propriétés vivent sur le prototype,
    // et `{...navigator}` rend un objet vide selon l'environnement. `locate()`
    // ne lit que `geolocation` — c'est tout ce qu'il faut fournir.
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: 47.586, longitude: 1.336 } } as GeolocationPosition),
      },
    });
    poser();

    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));

    await waitFor(() =>
      expect(screen.getByText(/Sans réseau, la liste des relevés/)).toBeTruthy(),
    );
    // Et surtout : la grille n'a pas été vidée.
    expect(screen.getByLabelText("Fiche Ablette")).toBeTruthy();
  });

  it("relaie le refus de géolocalisation tel quel", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (_ok: PositionCallback, ko: PositionErrorCallback) =>
          ko({ code: 1 } as GeolocationPositionError),
      },
    });
    poser();

    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));

    await waitFor(() => expect(screen.getByText(/Localisation refusée/)).toBeTruthy());
  });
});
