// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
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
/**
 * Le chemin court garde son compteur muet jusqu'au bout.
 *
 * `isShortcutStep` couvrait `kill` et `release` pour une raison écrite dans
 * l'écran : sur une espèce protégée, le parcours calculé n'est pas celui qu'on
 * traverse — `choix` n'apparaît jamais. La saisie ajoutée à la fin du parcours
 * est tombée hors de cette garde, et le compteur revenait sur le dernier écran
 * annoncer un total que le pêcheur n'a pas vu.
 */
describe("Consigner — le compteur se taît sur un chemin court", () => {
  it("protégée : rien sur la saisie, comme sur les gestes de remise à l'eau", async () => {
    // Apron du Rhône : le statut protégé mène DIRECTEMENT à « release ».
    // Parcours traversé : statut → release → consigner-rel, soit 3 écrans,
    // quand `etapesPour` en calcule 4 (il compte `choix`, jamais montré).
    monter(auxChamps({ priseSp: "apron-du-rhone", priseStep: "consigner-rel" }));
    await screen.findByRole("switch");
    expect(screen.queryByText(/étape/)).toBeNull();
  });

  it("invasive : idem sur la saisie d'une prise gardée", async () => {
    monter(auxChamps({ priseSp: "silure", priseStep: "consigner" }));
    await screen.findByRole("switch");
    expect(screen.queryByText(/étape/)).toBeNull();
  });

  it("mais une perche, elle, garde son compteur juste", async () => {
    monter(auxChamps());
    expect(await screen.findByText(/étape 4 \/ 4/)).toBeInTheDocument();
  });
});

/**
 * L'aperçu de la photo est une URL de blob. Elle se révoque au remplacement et
 * au retrait — mais l'écran part aussi par l'enregistrement, par « Terminer »
 * et par « Annuler », et il partait alors en laissant l'URL derrière lui.
 */
describe("Consigner — l'aperçu ne survit pas à l'écran", () => {
  const vraiC = URL.createObjectURL;
  const vraiR = URL.revokeObjectURL;
  let crees: string[] = [];
  let revoques: string[] = [];

  beforeEach(() => {
    crees = [];
    revoques = [];
    URL.createObjectURL = ((b: Blob) => {
      void b;
      const u = "blob:essai-" + crees.length;
      crees.push(u);
      return u;
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = ((u: string) => {
      revoques.push(u);
    }) as typeof URL.revokeObjectURL;
  });

  afterEach(() => {
    URL.createObjectURL = vraiC;
    URL.revokeObjectURL = vraiR;
  });

  it("l'URL de l'aperçu est révoquée au démontage", async () => {
    const user = userEvent.setup();
    const vue = monter(auxChamps());
    await screen.findByRole("switch");

    const fichier = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fichier, new File(["abc"], "p.jpg", { type: "image/jpeg" }));
    expect(crees).toHaveLength(1);

    vue.unmount();
    expect(revoques).toContain(crees[0]);
  });
});

/**
 * Ce que le pêcheur doit apprendre, et n'apprenait pas.
 *
 * L'écran posait bien un message d'échec, puis appelait `goTab` dans la même
 * continuation : React démontait l'écran avant de peindre, et le message
 * n'existait que le temps d'un rendu que personne n'a vu. La photo disparaissait
 * en silence. Le message doit voyager jusqu'à l'écran d'arrivée.
 */
describe("Consigner — une photo perdue se dit", () => {
  afterEach(() => vi.restoreAllMocks());

  it("l'échec d'écriture laisse la prise, sans photo, et l'annonce au carnet", async () => {
    const photos = await import("../lib/photos");
    vi.spyOn(photos, "downscaleImage").mockResolvedValue(new Blob(["x"]));
    vi.spyOn(photos, "savePhoto").mockRejectedValue(new Error("quota"));

    const user = userEvent.setup();
    monter(auxChamps());
    await screen.findByRole("switch");

    const fichier = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fichier, new File(["abc"], "p.jpg", { type: "image/jpeg" }));
    await user.click(screen.getByRole("button", { name: /Enregistrer dans le carnet/ }));

    await waitFor(() => expect(magasin.state.catches).toHaveLength(1));
    // La prise vaut mieux qu'une photo : elle est écrite, sans référence morte.
    expect(magasin.state.catches[0].photo).toBeUndefined();
    // Et le fait voyage, pour que l'écran d'arrivée puisse le dire.
    expect(magasin.state.photoRatee).toBe(true);
  });

  it("une photo écrite sans encombre n'annonce rien", async () => {
    const photos = await import("../lib/photos");
    vi.spyOn(photos, "downscaleImage").mockResolvedValue(new Blob(["x"]));
    vi.spyOn(photos, "savePhoto").mockResolvedValue(undefined);

    const user = userEvent.setup();
    monter(auxChamps());
    await screen.findByRole("switch");

    const fichier = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fichier, new File(["abc"], "p.jpg", { type: "image/jpeg" }));
    await user.click(screen.getByRole("button", { name: /Enregistrer dans le carnet/ }));

    await waitFor(() => expect(magasin.state.catches).toHaveLength(1));
    expect(magasin.state.catches[0].photo).toMatch(/^photo:/);
    expect(magasin.state.photoRatee).toBe(false);
  });
});

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
