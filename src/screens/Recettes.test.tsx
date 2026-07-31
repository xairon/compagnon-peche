// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect, type ReactElement } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoreProvider } from "../store";
import type { AppState } from "../store";
import { useStore } from "../store-hooks";
import { Recettes } from "./Recettes";
import { RECIPES } from "../data/recipes";
import { CRAYFISH_RECIPES } from "../data/ecrevisses-recipes";
import type { PersonalRecipe } from "../types";

/**
 * L'écran Cuisine & recettes — le module qui existe pour lui-même.
 *
 * Ce que jsdom NE dit PAS et qui a été vérifié au navigateur : la hauteur des
 * cibles tactiles, l'absence de chevauchement, et le rendu en 375 px de large.
 */

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

const GUIDE = [...RECIPES, ...CRAYFISH_RECIPES];

function Amorce({ patch, children }: { patch: Partial<AppState>; children: ReactElement }) {
  const { set } = useStore();
  useEffect(() => {
    set(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return children;
}

function monter(patch: Partial<AppState> = {}) {
  return render(
    <StoreProvider>
      <Amorce patch={patch}>
        <Recettes />
      </Amorce>
    </StoreProvider>,
  );
}

const maRecette: PersonalRecipe = {
  id: "p-test",
  title: "Sandre du dimanche de mon oncle",
  species: ["sandre"],
  ing: ["un sandre", "du beurre"],
  steps: ["cuire"],
  created: "2026-07-01",
};

/** La liste de résultats, quel que soit son habillage. */
const liste = () => screen.getByRole("list", { name: /recettes/i });

beforeEach(() => {
  localStorage.clear();
});

describe("Cuisine & recettes — structure", () => {
  it("porte un repère <main> et un unique titre de niveau 1", () => {
    monter();
    expect(screen.getByRole("main")).toBeInTheDocument();
    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0].textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });

  // `a11y-ecrans.test.tsx` ne monte que l'état par défaut de chaque écran et le
  // dit. Or les deux sous-états de celui-ci sont des composants venus d'ailleurs
  // (RecipeEditor, RecipeView) qui ne portent ni <main> ni <h1> : sans wrapper,
  // ouvrir l'éditeur faisait disparaître les deux repères de l'écran.
  it("garde un repère et un titre en création de recette", async () => {
    const user = userEvent.setup();
    monter();
    await user.click(screen.getByRole("button", { name: /Créer ma recette/i }));
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("garde un repère et un titre en consultation d'une recette personnelle", async () => {
    const user = userEvent.setup();
    monter({ recipes: [maRecette] });
    await user.click(screen.getByRole("button", { name: new RegExp(maRecette.title, "i") }));
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("affiche tout le corpus embarqué sans qu'on ait à chercher", () => {
    monter();
    expect(within(liste()).getByText("Truite à la meunière")).toBeInTheDocument();
    expect(within(liste()).getByText("Bisque d'écrevisses")).toBeInTheDocument();
  });
});

describe("Cuisine & recettes — le sanitaire ne disparaît d'aucune vue", () => {
  it("chaque recette listée qui porte une consigne `safety` l'affiche dans sa ligne", () => {
    monter();
    const avecConsigne = GUIDE.filter((r) => r.safety);
    expect(avecConsigne.length).toBeGreaterThan(0);
    for (const r of avecConsigne) {
      const ligne = within(liste()).getByText(r.title).closest("li")!;
      expect(ligne.textContent).toContain(r.safety!);
    }
  });

  it("une recherche ne fait pas remonter une recette en masquant sa consigne", async () => {
    const user = userEvent.setup();
    monter();
    await user.type(screen.getByRole("searchbox"), "anguille fumée");
    const fumee = GUIDE.find((r) => r.id === "anguille-fumee")!;
    const ligne = within(liste()).getByText(fumee.title).closest("li")!;
    expect(ligne.textContent).toContain(fumee.safety!);
  });
});

describe("Cuisine & recettes — espèces sous régime spécial", () => {
  it("une recette d'anguille ou d'alose porte l'avertissement de régime, comme sur la fiche", () => {
    monter();
    const ligne = within(liste())
      .getByText("Matelote d'anguille au vin rouge")
      .closest("li")!;
    expect(ligne.textContent).toMatch(/arrêté/i);
    expect(ligne.textContent).toMatch(/Anguille européenne/);
  });

  it("une recette d'espèce ordinaire ne porte aucun avertissement de régime", () => {
    monter();
    const ligne = within(liste()).getByText("Truite à la meunière").closest("li")!;
    expect(ligne.textContent).not.toMatch(/arrêté/i);
  });
});

describe("Cuisine & recettes — les invasives qu'on doit tuer", () => {
  it("un filtre dédié amène en un geste aux recettes des espèces qu'on ne peut pas relâcher", async () => {
    const user = userEvent.setup();
    monter();
    await user.click(screen.getByRole("button", { name: /ne pas relâcher/i }));
    expect(within(liste()).getByText("Friture de perches-soleil")).toBeInTheDocument();
    expect(within(liste()).queryByText("Truite à la meunière")).not.toBeInTheDocument();
  });
});

describe("Cuisine & recettes — entrées utiles au bord de l'eau", () => {
  it("le filtre bivouac ne garde que ce qui se fait au bord de l'eau", async () => {
    const user = userEvent.setup();
    monter();
    await user.click(screen.getByRole("button", { name: /bivouac/i }));
    const titresBivouac = GUIDE.filter((r) => r.bivouac).map((r) => r.title);
    const titresSedentaires = GUIDE.filter((r) => !r.bivouac).map((r) => r.title);
    for (const t of titresBivouac) expect(within(liste()).getByText(t)).toBeInTheDocument();
    for (const t of titresSedentaires) expect(within(liste()).queryByText(t)).toBeNull();
  });

  it("le filtre difficulté « Facile » ne garde que les recettes de niveau 1", async () => {
    const user = userEvent.setup();
    monter();
    await user.click(screen.getByRole("button", { name: /^facile$/i }));
    for (const r of GUIDE) {
      const attendu = r.difficulty === 1;
      const trouve = within(liste()).queryByText(r.title) !== null;
      expect(trouve).toBe(attendu);
    }
  });

  it("la recherche accepte les noms du bord de l'eau, pas seulement ceux du catalogue", async () => {
    const user = userEvent.setup();
    monter();
    await user.type(screen.getByRole("searchbox"), "barbotte");
    expect(within(liste()).getByText("Poisson-chat frit (dépouillé)")).toBeInTheDocument();
  });
});

describe("Cuisine & recettes — les recettes personnelles ne sont pas dans un silo", () => {
  it("une recette personnelle apparaît dans la MÊME liste que les recettes du guide", () => {
    monter({ recipes: [maRecette] });
    const l = liste();
    expect(within(l).getByText(maRecette.title)).toBeInTheDocument();
    expect(within(l).getByText("Truite à la meunière")).toBeInTheDocument();
  });

  it("une recherche trouve indifféremment une recette perso et une recette du guide", async () => {
    const user = userEvent.setup();
    monter({ recipes: [maRecette] });
    await user.type(screen.getByRole("searchbox"), "sandre");
    expect(within(liste()).getByText(maRecette.title)).toBeInTheDocument();
    expect(within(liste()).getByText("Filets de sandre à l'oseille")).toBeInTheDocument();
  });
});

describe("Cuisine & recettes — attribution", () => {
  it("une recette du guide affiche son origine et sa source, jamais une signature inventée", () => {
    monter();
    const quenelles = GUIDE.find((r) => r.id === "quenelles-de-brochet")!;
    const ligne = within(liste()).getByText(quenelles.title).closest("li")!;
    expect(ligne.textContent).toContain(quenelles.origin);
    if (quenelles.author) expect(ligne.textContent).toContain(quenelles.author);
  });
});
