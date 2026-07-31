// @vitest-environment jsdom
//
// Le store porte une trentaine d'actions et n'était surveillé que sur le
// département actif et la navigation. Ce fichier ne cherche pas la couverture :
// il prend les actions par lesquelles on peut PERDRE des données — celles qui
// écrivent en base, celles qui décident qu'une séance est close, celles qui
// suspendent l'enregistrement — et laisse le reste tranquille.
//
// Comme store-carnet.test.tsx : `idb-keyval` sur une Map, tout le reste réel.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useEffect } from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { StoreProvider } from "./store";
import type { Store } from "./store";
import { useStore } from "./store-hooks";
import { STORES } from "./lib/stores";
import { onPersistError } from "./lib/storage";
import type { Catch, CrayfishSession, PersonalRecipe, Spot } from "./types";

const { base, illisibles } = vi.hoisted(() => ({
  base: new Map<string, unknown>(),
  // Clés que la base refuse de rendre : le cas Safari « UnknownError » quand la
  // base se referme sous l'app, ou une base réellement abîmée.
  illisibles: new Set<string>(),
}));
vi.mock("idb-keyval", () => ({
  get: vi.fn(async (k: string) => {
    if (illisibles.has(k)) throw new DOMException("Internal error", "UnknownError");
    return base.get(k);
  }),
  set: vi.fn(async (k: string, v: unknown) => void base.set(k, v)),
  del: vi.fn(async (k: string) => void base.delete(k)),
  keys: vi.fn(async () => [...base.keys()]),
  clear: vi.fn(async () => base.clear()),
}));

let st: Store;
function Sonde() {
  const s = useStore();
  useEffect(() => {
    st = s;
  });
  return (
    <>
      <span data-testid="hydrate">{String(s.state.hydrated)}</span>
      <span data-testid="loadOk">{String(s.state.loadOk)}</span>
    </>
  );
}

async function lancer() {
  const vue = render(
    <StoreProvider>
      <Sonde />
    </StoreProvider>,
  );
  await waitFor(() => expect(screen.getByTestId("hydrate")).toHaveTextContent("true"));
  return vue;
}

const PRISE = (slot: string): Catch => ({
  slot,
  sp: "Sandre",
  spid: "sandre",
  iso: "2026-07-31",
  size: "52 cm",
  n: 52,
  date: "31 juil. 2026",
  place: "Loire",
  kept: true,
});

const SPOT = (id: string): Spot => ({
  id,
  name: "Sous le pont",
  lat: 47.58,
  lon: 1.33,
  species: ["sandre"],
  technique: "Leurre souple",
  best: "Aube",
  note: "",
  created: "2026-07-01",
});

const SEANCE = (id: string, debut: number, fin: number | null = null): CrayfishSession => ({
  id,
  iso: "2026-07-31",
  date: "31 juil. 2026",
  debut,
  fin,
  lieu: "Le Cosson",
  intervalMin: 20,
  balances: [],
  tally: [],
});

beforeEach(() => {
  base.clear();
  illisibles.clear();
  localStorage.clear();
  window.location.hash = "";
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("une lecture ratée ne doit jamais effacer ce qu'elle n'a pas su lire", () => {
  // La garantie la plus lourde de conséquence du store. Sans elle, une base
  // momentanément illisible (Safari referme la base sous l'app, pression de
  // stockage au démarrage) fait démarrer l'app sur un carnet vide — et la
  // première écriture écrase pour de bon des données encore présentes.

  it("laisse le carnet en place quand la base a refusé de le rendre", async () => {
    base.set(STORES.catches, [PRISE("p1"), PRISE("p2")]);
    illisibles.add(STORES.catches);

    await lancer();
    // L'app tourne, l'utilisateur saisit : cette saisie ne doit surtout pas
    // partir en base par-dessus les deux prises encore là.
    act(() => st.addCatchFull(PRISE("p3")));
    expect(st.state.catches).toHaveLength(1); // la saisie vit en mémoire

    // Laisser passer les effets d'écriture : ce qu'on veut voir, c'est qu'aucun
    // ne s'est déclenché — pas qu'on a regardé trop tôt.
    await new Promise((r) => setTimeout(r, 50));
    expect(base.get(STORES.catches)).toHaveLength(2);
  });

  it("le dit à l'application au lieu de faire comme si de rien n'était", async () => {
    illisibles.add(STORES.spots);

    await lancer();

    expect(screen.getByTestId("loadOk")).toHaveTextContent("false");
  });

  it("prévient l'utilisateur par le bandeau — c'est sa seule chance d'exporter", async () => {
    illisibles.add(STORES.catches);
    let message: string | null = null;
    const stop = onPersistError((m) => {
      message = m;
    });

    await lancer();

    await waitFor(() => expect(message).not.toBeNull());
    expect(String(message)).toMatch(/suspendu/i);
    stop();
  });

  it("gèle TOUS les magasins, pas seulement celui qui a échoué", async () => {
    // Les six effets d'écriture partagent le même verrou : une base qui refuse
    // le carnet n'est pas une base à qui l'on peut confier les spots.
    base.set(STORES.spots, [SPOT("s1")]);
    illisibles.add(STORES.catches);

    await lancer();
    act(() => st.addSpot(SPOT("s2")));
    // Le spot vit bien en mémoire — l'app continue de fonctionner…
    expect(st.state.spots).toHaveLength(2);

    // …mais rien n'est écrit par-dessus le spot déjà en base.
    await new Promise((r) => setTimeout(r, 50));
    expect(base.get(STORES.spots)).toHaveLength(1);
  });

  it("écrit normalement quand tout s'est bien lu — le gel n'est pas l'état par défaut", async () => {
    base.set(STORES.spots, [SPOT("s1")]);

    await lancer();
    act(() => st.addSpot(SPOT("s2")));

    await waitFor(() => expect(base.get(STORES.spots)).toHaveLength(2));
    expect(screen.getByTestId("loadOk")).toHaveTextContent("true");
  });
});

describe("les spots personnels", () => {
  it("survivent à un relancement", async () => {
    const premier = await lancer();
    act(() => st.addSpot(SPOT("s1")));
    await waitFor(() => expect(base.get(STORES.spots)).toHaveLength(1));
    premier.unmount();

    await lancer();

    expect(st.state.spots[0].name).toBe("Sous le pont");
    expect(st.state.spots[0].lat).toBe(47.58);
  });

  it("gardent leurs coordonnées quand on ne corrige que la note", async () => {
    // Un spot sans coordonnées n'est plus un spot : la carte ne peut plus y voler.
    await lancer();
    act(() => st.addSpot(SPOT("s1")));

    act(() => st.updateSpot("s1", { note: "Accès par le chemin blanc" }));

    expect(st.state.spots[0].lat).toBe(47.58);
    expect(st.state.spots[0].lon).toBe(1.33);
    expect(st.state.spots[0].note).toBe("Accès par le chemin blanc");
  });

  it("ne disparaissent pas à plusieurs quand on en supprime un", async () => {
    await lancer();
    act(() => st.addSpot(SPOT("s1")));
    act(() => st.addSpot(SPOT("s2")));

    act(() => st.removeSpot("s1"));

    expect(st.state.spots.map((s) => s.id)).toEqual(["s2"]);
  });
});

describe("les recettes personnelles", () => {
  const RECETTE = (id: string, photo?: string): PersonalRecipe => ({
    id,
    title: "Sandre au beurre blanc",
    species: ["sandre"],
    photo,
    ing: ["sandre"],
    steps: ["cuire"],
    created: "2026-07-31",
  });

  it("libèrent leur photo à la suppression, comme les prises", async () => {
    await lancer();
    base.set("photo:r1", new Blob(["jpeg"]));
    act(() => st.addRecipe(RECETTE("r1", "photo:r1")));

    act(() => st.removeRecipe("r1"));

    await waitFor(() => expect(base.has("photo:r1")).toBe(false));
  });

  it("ne touchent à aucune photo quand la recette supprimée n'en avait pas", async () => {
    await lancer();
    base.set("photo:r1", new Blob(["jpeg"]));
    act(() => st.addRecipe(RECETTE("r1", "photo:r1")));
    act(() => st.addRecipe(RECETTE("r2")));

    act(() => st.removeRecipe("r2"));

    expect(base.has("photo:r1")).toBe(true);
  });
});

describe("les séances d'écrevisses — une seule en cours à la fois", () => {
  // L'invariant tient structurellement (lib/ecrevisses), mais c'est le store qui
  // en est la porte : deux séances ouvertes rendraient la seconde inatteignable,
  // donc impossible à clore et à déclarer au bilan.

  it("refuse d'en ouvrir une seconde tant que la première tourne", async () => {
    await lancer();
    act(() => st.addCrayfishSession(SEANCE("a", 1_000)));

    act(() => st.addCrayfishSession(SEANCE("b", 2_000)));

    expect(st.state.crayfish.map((s) => s.id)).toEqual(["a"]);
  });

  it("en accepte une nouvelle une fois la précédente close", async () => {
    await lancer();
    act(() => st.addCrayfishSession(SEANCE("a", 1_000)));
    act(() => st.saveCrayfishSession({ ...SEANCE("a", 1_000), fin: 5_000 }));

    act(() => st.addCrayfishSession(SEANCE("b", 6_000)));

    expect(st.state.crayfish.map((s) => s.id).sort()).toEqual(["a", "b"]);
  });

  it("ne ressuscite pas une séance supprimée entre-temps par une mise à jour de fond", async () => {
    // La boucle d'alerte des balances tourne en tâche de fond et rappelle
    // `updateCrayfishSession`. Si un identifiant inconnu valait insertion, une
    // séance que l'utilisateur vient d'effacer réapparaîtrait toute seule.
    await lancer();
    act(() => st.addCrayfishSession(SEANCE("a", 1_000)));
    act(() => st.removeCrayfishSession("a"));

    act(() => st.updateCrayfishSession("a", (s) => ({ ...s, lieu: "ailleurs" })));

    expect(st.state.crayfish).toHaveLength(0);
  });

  it("applique la correction à la séance en base, pas à l'instantané de l'appelant", async () => {
    await lancer();
    act(() => st.addCrayfishSession(SEANCE("a", 1_000)));
    act(() => st.updateCrayfishSession("a", (s) => ({ ...s, lieu: "Le Beuvron" })));

    act(() => st.updateCrayfishSession("a", (s) => ({ ...s, intervalMin: 30 })));

    expect(st.state.crayfish[0].lieu).toBe("Le Beuvron"); // la 1re correction a tenu
    expect(st.state.crayfish[0].intervalMin).toBe(30);
  });

  it("clôt la plus ancienne quand deux séances ouvertes se rencontrent au chargement", async () => {
    // Deux onglets, deux appareils, une base restaurée : le seul endroit où deux
    // séances ouvertes peuvent se croiser est la fusion de l'hydratation.
    base.set(STORES.crayfish, [SEANCE("vieille", 1_000), SEANCE("recente", 9_000)]);

    await lancer();

    const ouvertes = st.state.crayfish.filter((s) => s.fin === null);
    expect(ouvertes.map((s) => s.id)).toEqual(["recente"]);
    // Rien n'est supprimé : la vieille est close sur sa dernière activité connue.
    expect(st.state.crayfish).toHaveLength(2);
    expect(st.state.crayfish.find((s) => s.id === "vieille")!.fin).toBe(1_000);
  });

  it("garde la séance close jusqu'au prochain lancement", async () => {
    const premier = await lancer();
    act(() => st.addCrayfishSession(SEANCE("a", 1_000)));
    act(() => st.saveCrayfishSession({ ...SEANCE("a", 1_000), fin: 5_000, tally: [{ spId: "signal", count: 12 }] }));
    await waitFor(() => expect(base.get(STORES.crayfish)).toHaveLength(1));
    premier.unmount();

    await lancer();

    expect(st.state.crayfish[0].tally).toEqual([{ spId: "signal", count: 12 }]);
  });
});

describe("le profil de l'appareil", () => {
  it("ne perd pas les champs qu'une modification ne mentionne pas", async () => {
    // Le profil porte l'AAPPMA et l'année de carte, retapées à la main : une
    // fusion ratée les effacerait à la première correction du prénom.
    await lancer();
    act(() => st.setProfile({ name: "Nicolas", aappma: "AAPPMA de Blois", carteAnnee: 2026 }));

    act(() => st.setProfile({ name: "Nico" }));

    expect(st.state.profile.aappma).toBe("AAPPMA de Blois");
    expect(st.state.profile.carteAnnee).toBe(2026);
    expect(st.state.profile.name).toBe("Nico");
  });

  it("survit à un relancement", async () => {
    const premier = await lancer();
    act(() => st.setProfile({ aappma: "AAPPMA de Blois", carteAnnee: 2026 }));
    await waitFor(() => expect(base.get(STORES.profile)).toBeDefined());
    premier.unmount();

    await lancer();

    expect(st.state.profile.aappma).toBe("AAPPMA de Blois");
  });
});

describe("le matériel", () => {
  it("survit à un relancement", async () => {
    const premier = await lancer();
    act(() => st.setGear([{ id: "g1", cat: "canne", name: "Canne 2,10 m", detail: "10-30 g" }]));
    await waitFor(() => expect(base.get(STORES.gear)).toHaveLength(1));
    premier.unmount();

    await lancer();

    expect(st.state.gear[0].name).toBe("Canne 2,10 m");
  });
});
