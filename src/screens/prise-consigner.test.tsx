// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { StoreProvider } from "../store";
import type { AppState, Store } from "../store";
import { useStore } from "../store-hooks";
import { Prise } from "./Prise";

/**
 * L'étape qui manquait au parcours.
 *
 * `addCatch` écrivait l'entrée puis déposait le pêcheur sur la LISTE du carnet.
 * Rien ne proposait la photo, rien ne demandait son avis sur le lieu : il fallait
 * rouvrir la fiche après coup. Le poisson, lui, était déjà reparti.
 *
 * Ce que ce fichier verrouille, c'est surtout ce qui NE doit pas être capturé
 * sans geste : la position. Un coin de pêche se garde.
 */

let magasin: Store;

function Monte({ patch }: { patch: Partial<AppState> }) {
  const s = useStore();
  const { set } = s;
  // Capturé APRÈS le rendu, jamais pendant : écrire une variable de module au
  // fil du rendu est un effet de bord que React se réserve le droit de rejouer.
  // Même forme que dans Prise.test.tsx.
  useEffect(() => {
    magasin = s;
  });
  useEffect(() => {
    set(patch);
  }, [set, patch]);
  return <Prise />;
}

const monter = (patch: Partial<AppState>) =>
  render(
    <StoreProvider>
      <Monte patch={patch} />
    </StoreProvider>,
  );

const auxChamps = (over: Partial<AppState> = {}) => ({
  dept: "41" as const,
  deptChosen: true,
  priseSp: "perche",
  priseStep: "consigner" as const,
  ...over,
});

// Réassigner le hash fait NAVIGUER jsdom : le `popstate` est mis en file et
// n'arrive qu'au premier `await` du test. Sans ce tick, il tombe APRÈS que
// l'étape a été posée et la remet à zéro — l'écran rend alors le choix
// d'espèce, et tout le fichier échoue pour une raison qui n'est pas la sienne.
// Même précaution que dans Prise.test.tsx.
beforeEach(async () => {
  localStorage.clear();
  window.location.hash = "";
  await new Promise((r) => setTimeout(r, 0));
});

describe("Consigner — les champs que le parcours n'offrait pas", () => {
  it("la taille, la photo et le lieu sont là", async () => {
    monter(auxChamps());

    expect(await screen.findByLabelText(/Taille \(cm\)/)).toBeInTheDocument();
    expect(screen.getByText(/Ajouter une photo/)).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("l'écran dit de quel côté la prise sera notée", async () => {
    monter(auxChamps());
    expect(await screen.findByText(/comptera dans votre carnet du jour/)).toBeInTheDocument();
  });

  it("relâchée, il dit l'inverse — et le quota n'est pas invoqué contre elle", async () => {
    monter(auxChamps({ priseStep: "consigner-rel" }));
    expect(await screen.findByText(/ne compte pas dans le quota/)).toBeInTheDocument();
  });

  it("le compteur tient jusqu'au bout, des deux côtés", async () => {
    // L'issue se lit sur deux étapes : « relâcher » ET sa saisie. Ne regarder
    // que la première faisait sortir « consigner-rel » du parcours calculé —
    // `indexOf` rendait -1, et le compteur disparaissait du dernier écran.
    monter(auxChamps({ priseStep: "consigner-rel" }));
    expect(await screen.findByText(/étape 4 \/ 4/)).toBeInTheDocument();
  });

  it("garder aussi : quatre écrans sur une perche, six sur un brochet", async () => {
    monter(auxChamps());
    expect(await screen.findByText(/étape 4 \/ 4/)).toBeInTheDocument();
  });
});

/**
 * Le point qui décide de tout : la position ne part JAMAIS sans un geste. Une
 * case cochée d'avance vaudrait consentement qu'on n'a pas demandé.
 */
describe("Consigner — la position ne se prend pas sans geste", () => {
  it("sans spot, l'interrupteur est éteint et n'a rien relevé", async () => {
    monter(auxChamps());

    const inter = await screen.findByRole("switch");
    expect(inter).toHaveAttribute("aria-checked", "false");
    expect(inter).toHaveTextContent(/position GPS/i);
  });

  it("avec un spot, il est allumé — le lieu est déjà à l'écran, le noter ne révèle rien", async () => {
    monter(auxChamps({ prisePlace: "Étang de la Coudraie" }));

    const inter = await screen.findByRole("switch");
    expect(inter).toHaveAttribute("aria-checked", "true");
    expect(inter).toHaveTextContent(/Étang de la Coudraie/);
  });

  it("éteint, la prise s'enregistre sans lieu", async () => {
    const user = userEvent.setup();
    monter(auxChamps());
    await screen.findByRole("switch");

    await user.click(screen.getByRole("button", { name: /Enregistrer dans le carnet/ }));

    await waitFor(() => expect(magasin.state.catches).toHaveLength(1));
    const prise = magasin.state.catches[0];
    expect(prise.place).toBe("—");
    expect(prise.lat).toBeUndefined();
    expect(prise.lon).toBeUndefined();
  });

  it("allumé sur un spot, le lieu du spot est écrit — sans relever de position", async () => {
    const user = userEvent.setup();
    monter(auxChamps({ prisePlace: "Étang de la Coudraie" }));
    await screen.findByRole("switch");

    await user.click(screen.getByRole("button", { name: /Enregistrer dans le carnet/ }));

    await waitFor(() => expect(magasin.state.catches).toHaveLength(1));
    const prise = magasin.state.catches[0];
    expect(prise.place).toBe("Étang de la Coudraie");
    // Le spot suffit à situer la prise : pas de coordonnées prises en plus.
    expect(prise.lat).toBeUndefined();
  });
});

describe("Consigner — ce qui est écrit dans le carnet", () => {
  it("gardée d'un côté, relâchée de l'autre — c'est le mot de l'étape qui tranche", async () => {
    const user = userEvent.setup();
    monter(auxChamps());
    await screen.findByRole("switch");
    await user.click(screen.getByRole("button", { name: /Enregistrer dans le carnet/ }));
    await waitFor(() => expect(magasin.state.catches).toHaveLength(1));
    expect(magasin.state.catches[0].kept).toBe(true);
  });

  it("relâchée : kept vaut false, donc elle sort du quota du jour", async () => {
    const user = userEvent.setup();
    monter(auxChamps({ priseStep: "consigner-rel" }));
    await screen.findByRole("switch");
    await user.click(screen.getByRole("button", { name: /Enregistrer dans le carnet/ }));
    await waitFor(() => expect(magasin.state.catches).toHaveLength(1));
    expect(magasin.state.catches[0].kept).toBe(false);
  });

  it("la taille saisie ici arrive telle quelle dans le carnet", async () => {
    const user = userEvent.setup();
    monter(auxChamps());

    await user.type(await screen.findByLabelText(/Taille \(cm\)/), "32");
    await user.click(screen.getByRole("button", { name: /Enregistrer dans le carnet/ }));

    await waitFor(() => expect(magasin.state.catches).toHaveLength(1));
    expect(magasin.state.catches[0].size).toBe("32 cm");
    expect(magasin.state.catches[0].n).toBe(32);
  });

  it("sans taille, le carnet le dit au lieu d'inventer un zéro", async () => {
    const user = userEvent.setup();
    monter(auxChamps());
    await screen.findByRole("switch");
    await user.click(screen.getByRole("button", { name: /Enregistrer dans le carnet/ }));

    await waitFor(() => expect(magasin.state.catches).toHaveLength(1));
    expect(magasin.state.catches[0].size).toBe("— cm");
  });

  it("« Terminer sans enregistrer » n'écrit rien", async () => {
    const user = userEvent.setup();
    monter(auxChamps());
    await screen.findByRole("switch");

    await user.click(screen.getByRole("button", { name: /Terminer sans enregistrer/ }));

    expect(magasin.state.catches).toEqual([]);
  });
});

/**
 * Ce qui a été sauté est rappelé jusqu'ici : la saisie est le dernier écran, et
 * donc la dernière occasion de dire que l'app n'a pas tout vérifié.
 */
describe("Consigner — le rappel de ce que l'app ne sait pas", () => {
  it("sur une perche, l'écran redit qu'il n'a ni maille ni quota", async () => {
    monter(auxChamps());
    expect(await screen.findByText(/ni maille ni quota/)).toBeInTheDocument();
  });

  it("sur un brochet, il n'a rien à avouer", async () => {
    monter(auxChamps({ priseSp: "brochet" }));
    await screen.findByRole("switch");
    expect(screen.queryByText(/ne connaît ni maille/)).not.toBeInTheDocument();
  });
});
