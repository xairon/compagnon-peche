// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StoreProvider } from "../store";
import { useStore } from "../store-hooks";
import { Especes } from "./Especes";
import { CLE_COIN } from "../lib/prefs-coin";
import { PORTEE_COIN_KM, type CoinEspeces } from "../lib/especes-du-coin";

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

  it("dit qu'aucune station n'est à moins de 15 km — distinct du hors-ligne", async () => {
    // La source A répondu ; elle dit juste qu'il n'y a rien dans la boîte.
    // Confondre ce cas avec le hors-ligne ferait dire à l'écran une absence
    // qu'il n'a jamais constatée.
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: 47.586, longitude: 1.336 } } as GeolocationPosition),
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ count: 0, data: [] }), { status: 200 })),
    );
    poser();

    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));

    await waitFor(() =>
      expect(
        screen.getByText(
          new RegExp(`Aucune station de pêche scientifique à moins de ${PORTEE_COIN_KM} km`),
        ),
      ).toBeTruthy(),
    );
    expect(screen.queryByText(/Sans réseau/)).toBeNull();
    // La grille n'a pas été vidée pour autant.
    expect(screen.getByLabelText("Fiche Ablette")).toBeTruthy();
  });

  it("un relevé résolu après le démontage ne casse rien et ne bascule pas le store", async () => {
    // Le pêcheur appuie, quitte l'écran avant la réponse, et la réponse arrive
    // quand même. Sans garde, `set({ coin: true })` toucherait le store
    // GLOBAL — qui, lui, survit à l'écran — pour un écran déjà quitté.
    let resoudreGeo!: PositionCallback;
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) => {
          resoudreGeo = ok;
        },
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes("/stations?")
          ? new Response(
              JSON.stringify({
                data: [
                  {
                    code_station: "04052800",
                    libelle_station: "COSSON à CHAILLES",
                    latitude: 47.586,
                    longitude: 1.336,
                  },
                ],
              }),
              { status: 200 },
            )
          : new Response(JSON.stringify({ data: [] }), { status: 200 }),
      ),
    );
    const erreurs = vi.spyOn(console, "error").mockImplementation(() => {});

    function Sonde() {
      const { state } = useStore();
      return <span data-testid="coin-store">{String(state.coin)}</span>;
    }

    const { rerender } = render(
      <StoreProvider>
        <Sonde />
        <Especes />
      </StoreProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));

    // Démonte Especes seul : la Sonde et le store restent, comme un vrai
    // changement d'écran dans l'app.
    rerender(
      <StoreProvider>
        <Sonde />
      </StoreProvider>,
    );

    resoudreGeo({ coords: { latitude: 47.586, longitude: 1.336 } } as GeolocationPosition);
    // Laisse la chaîne locate → chargerEspecesDuCoin → set aller à son terme.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByTestId("coin-store").textContent).toBe("false");
    expect(erreurs).not.toHaveBeenCalled();
  });
});
