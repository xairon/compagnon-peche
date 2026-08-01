// @vitest-environment jsdom
import { StrictMode } from "react";
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

  it("dit que la liste n'a pas pu être établie, sans diagnostiquer une cause qu'on n'a pas constatée", async () => {
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
      expect(screen.getByText(/n'a pas pu être établie — réseau indisponible ou source illisible/)).toBeTruthy(),
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
    expect(screen.queryByText(/n'a pas pu être établie/)).toBeNull();
    // La grille n'a pas été vidée pour autant.
    expect(screen.getByLabelText("Fiche Ablette")).toBeTruthy();
  });

  it("une géolocalisation résolue après le démontage s'arrête au premier garde-fou, sans toucher le store", async () => {
    // Le pêcheur appuie, quitte l'écran avant la réponse, et LA GÉOLOCALISATION
    // (pas le relevé entier — `resoudreGeo` ne résout que `locate()`, jamais
    // `chargerEspecesDuCoin`) arrive quand même. Sans garde, la suite du
    // `then` toucherait le store GLOBAL — qui, lui, survit à l'écran — pour un
    // écran déjà quitté ; le premier `if (!mounted.current) return;` doit
    // suffire à l'arrêter là, avant même l'appel réseau.
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
  });

  it("sous StrictMode, un relevé complète et ne reste pas bloqué sur « Relevé en cours… »", async () => {
    // StrictMode monte, démonte puis remonte le MÊME composant sans recréer
    // ses refs (voir main.tsx) : si `mounted` ne se réarmait pas au montage,
    // il resterait bloqué à `false` depuis ce premier démontage, et la
    // bascule ne clôturait plus jamais son état « charge ».
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: 47.586, longitude: 1.336 } } as GeolocationPosition),
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
          : new Response(JSON.stringify({ data: [{ nom_latin_taxon: "Esox lucius" }] }), {
              status: 200,
            }),
      ),
    );

    render(
      <StrictMode>
        <StoreProvider>
          <Especes />
        </StoreProvider>
      </StrictMode>,
    );

    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));

    await waitFor(() => expect(screen.getByText(/COSSON à CHAILLES/)).toBeTruthy());
    expect(screen.queryByText("Relevé en cours…")).toBeNull();
  });

  it("dit que le relevé ne contient aucune de ces espèces, plutôt que blâmer une recherche jamais faite", () => {
    // Le relevé de COIN (brochet, sandre, perche — tous carnassiers) ne
    // contient aucun salmonidé : combiner le filtre coin avec le groupe
    // « Salmonidés » vide la grille sans qu'aucune recherche texte soit en
    // cause — le message ne doit pas citer « {state.q} » (vide ici) comme
    // s'il expliquait quoi que ce soit.
    localStorage.setItem(CLE_COIN, JSON.stringify(COIN));
    poser();
    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));
    fireEvent.click(screen.getByRole("button", { name: "Salmonidés" }));

    expect(screen.getByText(/Le relevé de ce coin ne contient aucune de ces espèces/)).toBeTruthy();
    expect(screen.queryByText(/Aucune espèce ne correspond à/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /les voir quand même/i }));

    expect(screen.getByLabelText("Fiche Truite fario")).toBeTruthy();
  });

  it("garde le message de recherche sans résultat quand ce n'est pas le coin qui vide la grille", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify(COIN));
    poser();

    fireEvent.change(screen.getByLabelText("Rechercher une espèce"), {
      target: { value: "zzzzz" },
    });

    expect(screen.getByText(/Aucune espèce ne correspond à « zzzzz »/)).toBeTruthy();
  });

  it("avertit sans désactiver le filtre quand le relevé a été fait loin d'ici", async () => {
    // COIN a été relevé à Blois (47,586 / 1,336). Le pêcheur bascule le
    // filtre depuis Tours, à ~53 km — au-delà de PORTEE_COIN_KM (15 km).
    localStorage.setItem(CLE_COIN, JSON.stringify(COIN));
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: 47.394, longitude: 0.689 } } as GeolocationPosition),
      },
    });
    poser();

    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));

    await waitFor(() =>
      expect(screen.getByText(new RegExp(`plus de ${PORTEE_COIN_KM} km`))).toBeTruthy(),
    );
    // L'avertissement ne désactive rien : le filtre continue de masquer.
    expect(screen.queryByLabelText("Fiche Ablette")).toBeNull();
    expect(screen.getByLabelText("Fiche Brochet")).toBeTruthy();
  });

  it("ne dit rien quand la position est indisponible — le silence, pas une erreur", async () => {
    // jsdom ne fournit pas `navigator.geolocation` par défaut : `locate()`
    // rejette avec "unsupported", exactement le cas « on ne sait pas ».
    localStorage.setItem(CLE_COIN, JSON.stringify(COIN));
    poser();

    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.queryByText(/km d'ici/)).toBeNull();
    // Un basculement qui marche hors-ligne ne doit pas se transformer en
    // écran d'erreur pour autant : le filtre a quand même pris effet.
    expect(screen.queryByLabelText("Fiche Ablette")).toBeNull();
    expect(screen.getByLabelText("Fiche Brochet")).toBeTruthy();
  });

  it("la puce ne reste pas allumée quand le relevé stocké a disparu, même si le filtre était actif", () => {
    // Un autre onglet vide le stockage : `state.coin` (dans le store) survit
    // à un aller-retour d'écran, mais `readCoin()` — relu à chaque montage —
    // ne retrouve plus rien. La puce ne doit pas prétendre filtrer.
    localStorage.setItem(CLE_COIN, JSON.stringify(COIN));

    const { rerender } = render(
      <StoreProvider>
        <Especes />
      </StoreProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /dans mon coin/i }));
    expect(screen.getByRole("button", { name: /dans mon coin/i }).getAttribute("aria-pressed")).toBe(
      "true",
    );

    localStorage.removeItem(CLE_COIN);

    // Démonte puis remonte Especes seul, comme un aller-retour vers une
    // fiche : le store garde `state.coin`, le composant relit `null`.
    rerender(
      <StoreProvider>
        <span />
      </StoreProvider>,
    );
    rerender(
      <StoreProvider>
        <Especes />
      </StoreProvider>,
    );

    const puce = screen.getByRole("button", { name: /dans mon coin/i });
    expect(puce.getAttribute("aria-pressed")).toBe("false");
    expect(puce.className).not.toMatch(/chip-on/);
  });
});
