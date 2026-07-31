// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useEffect } from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { StoreProvider } from "./store";
import type { Store } from "./store";
import { useStore } from "./store-hooks";
import { ErrorBoundary } from "./components/ErrorBoundary";

vi.mock("./lib/db", () => ({
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

let st: Store;
function Probe() {
  const s = useStore();
  useEffect(() => {
    st = s;
  });
  return (
    <>
      <span data-testid="ecran">{s.state.screen}</span>
      <span data-testid="onglet">{s.state.tab}</span>
      <span data-testid="spId">{String(s.state.spId)}</span>
      <span data-testid="recipeId">{String(s.state.recipeId)}</span>
      <span data-testid="bilan">{String(s.state.bilanSession)}</span>
    </>
  );
}

/** Le vrai App enveloppe l'écran d'une frontière keyée par l'écran : elle se
 *  remonte à CHAQUE navigation. Les tests montent la même chose, pour que ce
 *  remontage soit sous surveillance ici et pas seulement en production. */
const mount = () =>
  render(
    <StoreProvider>
      <Bord />
    </StoreProvider>,
  );

function Bord() {
  const { state } = useStore();
  return (
    <ErrorBoundary key={state.screen}>
      <Probe />
    </ErrorBoundary>
  );
}

const ecran = () => screen.getByTestId("ecran").textContent;
const onglet = () => screen.getByTestId("onglet").textContent;

let push: ReturnType<typeof vi.spyOn>;
let replace: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
  push = vi.spyOn(window.history, "pushState");
  replace = vi.spyOn(window.history, "replaceState");
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("l'app dans l'historique du navigateur", () => {
  it("ne met aucune entrée à l'ouverture — l'onboarding ne doit pas s'y retrouver", () => {
    // L'onboarding est un retour anticipé d'App : il ne change jamais `screen`,
    // donc il ne peut créer d'entrée que si le montage en crée une. Le premier
    // point REMPLACE l'entrée courante au lieu de s'ajouter — sans quoi le tout
    // premier geste retour ne ferait que revenir à l'écran d'accueil qu'on
    // regarde déjà, au lieu de quitter l'app.
    mount();

    expect(push).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalled();
  });

  it("crée exactement une entrée par navigation, malgré le remontage de la frontière d'erreur", () => {
    mount();
    push.mockClear();

    act(() => st.nav("especes"));

    expect(push).toHaveBeenCalledTimes(1);
  });

  it("écrit l'écran et son contexte dans l'URL", () => {
    mount();

    act(() => st.nav("fiche", { spId: "sandre" }));

    expect(window.location.hash).toBe("#/espece/sandre");
  });

  it("n'écrit qu'une URL relative — l'app est servie depuis un sous-chemin", () => {
    mount();

    act(() => st.nav("carnet"));

    const url = push.mock.calls.at(-1)?.[2];
    expect(String(url).startsWith("#/")).toBe(true);
  });
});

describe("le geste retour", () => {
  it("ramène à l'écran précédent au lieu de fermer l'app", async () => {
    mount();
    act(() => st.nav("especes"));
    act(() => st.nav("fiche", { spId: "sandre" }));
    expect(ecran()).toBe("fiche");

    act(() => {
      window.history.back();
    });

    await waitFor(() => expect(ecran()).toBe("especes"));
  });

  it("restitue le contexte de l'entrée quittée, pas seulement son écran", async () => {
    // Le défaut réel que ça corrige : `nav()` remettait `bilanSession` à null,
    // donc ouvrir l'aide à l'identification depuis un bilan d'écrevisses puis
    // revenir faisait DISPARAÎTRE le bilan qu'on était en train de corriger.
    mount();
    act(() => st.nav("ecrevisses", { bilanSession: "s1" }));
    act(() => st.nav("ecrevisses-ident"));
    expect(screen.getByTestId("bilan").textContent).toBe("null");

    act(() => {
      window.history.back();
    });

    await waitFor(() => expect(screen.getByTestId("bilan").textContent).toBe("s1"));
  });

  it("ne repousse pas l'entrée qu'il vient de dépiler", async () => {
    mount();
    act(() => st.nav("especes"));
    push.mockClear();

    act(() => {
      window.history.back();
    });

    await waitFor(() => expect(ecran()).toBe("accueil"));
    expect(push).not.toHaveBeenCalled();
  });
});

describe("le bouton « ‹ »", () => {
  it("fait la même chose que le geste système quand il y a une entrée derrière", async () => {
    mount();
    act(() => st.nav("outils"));
    act(() => st.nav("noeuds"));

    act(() => st.back());

    await waitFor(() => expect(ecran()).toBe("outils"));
  });

  it("ne piège pas à la racine : rien n'est empilé pour retenir l'utilisateur", () => {
    mount();
    push.mockClear();

    act(() => st.back());

    expect(ecran()).toBe("accueil");
    expect(push).not.toHaveBeenCalled();
  });

  it("retombe sur l'écran parent quand l'app a été ouverte DIRECTEMENT sur un écran profond", () => {
    // Aucune entrée derrière : `history.back()` sortirait de l'app alors que
    // l'utilisateur a tapé une flèche « retour » dans l'app. On replie sur le
    // parent, et sans empiler — pour que le geste système, lui, sorte bien.
    window.location.hash = "#/espece/sandre";
    mount();
    expect(ecran()).toBe("fiche");
    push.mockClear();

    act(() => st.back());

    expect(ecran()).toBe("especes");
    expect(push).not.toHaveBeenCalled();
  });
});

describe("liens profonds", () => {
  it("ouvre la fiche d'une espèce et allume le bon onglet", () => {
    window.location.hash = "#/espece/brochet";

    mount();

    expect(ecran()).toBe("fiche");
    expect(screen.getByTestId("spId").textContent).toBe("brochet");
    expect(onglet()).toBe("especes");
  });

  it("ouvre une recette", () => {
    window.location.hash = "#/recette/friture-perche-soleil";

    mount();

    expect(ecran()).toBe("recette");
    expect(screen.getByTestId("recipeId").textContent).toBe("friture-perche-soleil");
  });

  it("ouvre un nœud", () => {
    window.location.hash = "#/noeud/palomar";

    mount();

    expect(ecran()).toBe("knot");
  });

  it("retombe sur l'accueil quand l'URL ne désigne rien, au lieu d'un écran vide", () => {
    window.location.hash = "#/une-vieille-adresse";

    mount();

    expect(ecran()).toBe("accueil");
  });
});

describe("ouvrir et refermer un bilan d'écrevisses", () => {
  it("revient à la séance quand le bilan a été ouvert depuis elle", async () => {
    mount();
    act(() => st.nav("ecrevisses"));

    act(() => st.nav("ecrevisses", { bilanSession: "s1" }));
    act(() => st.back());

    await waitFor(() => expect(screen.getByTestId("bilan").textContent).toBe("null"));
    expect(ecran()).toBe("ecrevisses");
  });

  it("revient au carnet quand le bilan a été ouvert depuis lui", async () => {
    // Le « ‹ » d'un bilan clos doit ramener LÀ OÙ ON L'A DEMANDÉ. Avant, c'était
    // obtenu en effaçant `bilanSession` à la main PUIS en dépilant — deux gestes
    // pour un, qui se contrariaient dès que l'historique devenait la référence.
    mount();
    act(() => st.goTab("carnet"));

    act(() => st.nav("ecrevisses", { bilanSession: "s1" }));
    act(() => st.back());

    await waitFor(() => expect(ecran()).toBe("carnet"));
    expect(screen.getByTestId("bilan").textContent).toBe("null");
  });
});

describe("correction sans entrée d'historique", () => {
  it("ne crée pas d'entrée quand un écran oublie le repère qu'il vient de consommer", () => {
    // La carte remet `focusSpot` à null une fois qu'elle a volé jusqu'au spot,
    // et le guide matériel fait de même avec `gearFocusId`. C'est une CORRECTION
    // de l'endroit courant, pas un déplacement : empiler une entrée obligerait à
    // deux gestes retour pour quitter la carte ouverte depuis le carnet.
    mount();
    act(() => st.goTab("carte", { focusSpot: "s_44b" }));
    push.mockClear();

    act(() => st.replace({ focusSpot: null }));

    expect(push).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#/carte");
  });

  it("laisse le geste retour ramener d'où l'on venait, et non au repère consommé", async () => {
    mount();
    act(() => st.goTab("carnet"));
    act(() => st.goTab("carte", { focusSpot: "s_44b" }));
    act(() => st.replace({ focusSpot: null }));

    act(() => {
      window.history.back();
    });

    await waitFor(() => expect(ecran()).toBe("carnet"));
  });

  it("suit l'étape de cuisine dans l'URL sans empiler une entrée par étape", () => {
    // Sortir d'une recette de vingt étapes ne doit pas demander vingt gestes
    // retour : la cuisine est UN endroit, l'étape en est une correction.
    mount();
    act(() => st.nav("cuisine", { recipeId: "r1" }));
    push.mockClear();

    act(() => st.replace({ cookStep: 1 }));
    act(() => st.replace({ cookStep: 2 }));

    expect(push).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#/cuisine/r1/2");
  });
});

describe("conventions de contexte appliquées par le store", () => {
  it("efface l'identifiant que l'écran d'arrivée ne réclame pas", () => {
    // Avant : `nav()` n'effaçait QUE `bilanSession`. Ouvrir une recette depuis
    // une fiche laissait `spId` derrière, et l'écran suivant héritait d'un
    // contexte qui ne le concernait pas.
    mount();
    act(() => st.nav("fiche", { spId: "sandre" }));

    act(() => st.nav("recette", { recipeId: "r1" }));

    expect(screen.getByTestId("spId").textContent).toBe("null");
    expect(screen.getByTestId("recipeId").textContent).toBe("r1");
  });

  it("garde l'onglet d'origine sur une navigation ordinaire", () => {
    mount();
    act(() => st.goTab("especes"));

    act(() => st.nav("recette", { recipeId: "r1" }));

    expect(onglet()).toBe("especes");
  });

  it("nettoie le contexte en changeant d'onglet", () => {
    mount();
    act(() => st.nav("fiche", { spId: "sandre" }));

    act(() => st.goTab("carnet"));

    expect(onglet()).toBe("carnet");
    expect(screen.getByTestId("spId").textContent).toBe("null");
  });

  it("ouvre une fiche espèce par openSp avec les mêmes conventions", () => {
    mount();
    act(() => st.nav("recette", { recipeId: "r1" }));

    act(() => st.openSp("perche"));

    expect(ecran()).toBe("fiche");
    expect(screen.getByTestId("spId").textContent).toBe("perche");
    expect(screen.getByTestId("recipeId").textContent).toBe("null");
    expect(window.location.hash).toBe("#/espece/perche");
  });
});
