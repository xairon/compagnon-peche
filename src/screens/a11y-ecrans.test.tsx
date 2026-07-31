// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect, type ReactElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { StoreProvider } from "../store";
import type { AppState } from "../store";
import { useStore } from "../store-hooks";

import { Accueil } from "./Accueil";
import { Carnet } from "./Carnet";
import { Credits } from "./Credits";
import { Cuisine } from "./Cuisine";
import { Ecrevisses } from "./Ecrevisses";
import { EcrevissesIdent } from "./EcrevissesIdent";
import { Especes } from "./Especes";
import { Fiche } from "./Fiche";
import { Guides } from "./Guides";
import { Identify } from "./Identify";
import { Materiel, GuideMateriel } from "./Materiel";
import { Mentions } from "./Mentions";
import { Noeuds, KnotDetail } from "./Noeuds";
import { Outils } from "./Outils";
import { OutilsTerrain } from "./OutilsTerrain";
import { PriseDetail } from "./PriseDetail";
import { Regle } from "./Regle";
import { Reglement } from "./Reglement";
import { Sources } from "./Sources";
import { Statistiques } from "./Statistiques";
import { TechniqueDetail } from "./Techniques";

/**
 * Balayage de structure : un lecteur d'écran doit trouver, sur CHAQUE écran,
 * un repère principal (`<main>`) et un titre de niveau 1 qui dise où l'on est.
 * Avant ce lot : `document.querySelectorAll('h1')` rendait 0 sur toute l'app,
 * et il n'y avait ni `<main>` ni `<nav>` — le titre de l'écran n'existait que
 * visuellement (classes `.h1`, `.topbar-title`, `.hero`).
 *
 * CE QUE CE BALAYAGE NE COUVRE PAS :
 *  - Carte, Prise, Stockage, Recette, RecipeView : écrans détenus par d'autres
 *    lots de la même vague, pas modifiables ici (voir le rapport du lot).
 *  - les états secondaires d'un écran (Carnet en mode « nouvelle prise »,
 *    Ecrevisses pendant une séance, PriseDetail en édition) : seul l'état par
 *    défaut est monté ici.
 *  - la mise en page réelle : jsdom ne calcule aucune géométrie, donc rien de ce
 *    fichier ne dit qu'un titre est visible ni qu'une cible fait 44 px.
 */

// lib/pwa importe `virtual:pwa-register`, un module que seul le plugin PWA
// fabrique au build : hors build, il n'existe pas.
vi.mock("../lib/pwa", () => ({
  usePwa: () => ({
    canInstall: false,
    install: vi.fn(),
    needRefresh: false,
    applyUpdate: vi.fn(),
    reserve: { total: 0, presents: 0, echecs: 0, enCours: false, complete: false },
  }),
}));

// Matériel lit ses ensembles directement dans idb-keyval ; jsdom n'a pas
// d'IndexedDB.
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

function Amorce({ patch, children }: { patch: Partial<AppState>; children: ReactElement }) {
  const { set } = useStore();
  useEffect(() => {
    set(patch);
    // `patch` est un littéral stable par cas de test.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return children;
}

function monter(el: ReactElement, patch: Partial<AppState> = {}) {
  return render(
    <StoreProvider>
      <Amorce patch={patch}>{el}</Amorce>
    </StoreProvider>,
  );
}

/** Les écrans du lot, avec l'état minimal qu'ils exigent pour rendre autre chose que `null`. */
const ECRANS: [string, ReactElement, Partial<AppState>][] = [
  ["Accueil", <Accueil />, {}],
  ["Carnet", <Carnet />, {}],
  ["Crédits", <Credits />, {}],
  ["Cuisine", <Cuisine />, { recipeId: "quenelles-de-brochet" }],
  ["Écrevisses", <Ecrevisses />, {}],
  ["Écrevisses — identification", <EcrevissesIdent />, {}],
  ["Espèces", <Especes />, {}],
  ["Fiche espèce", <Fiche />, { spId: "brochet" }],
  ["Guides", <Guides />, {}],
  ["Identifier", <Identify />, {}],
  ["Matériel", <Materiel />, {}],
  ["Guide matériel", <GuideMateriel />, {}],
  ["Mentions légales", <Mentions />, {}],
  ["Nœuds", <Noeuds />, {}],
  ["Nœud (détail)", <KnotDetail />, { knotId: "palomar" }],
  ["Outils", <Outils />, {}],
  ["Outils de terrain", <OutilsTerrain />, {}],
  ["Prise (détail)", <PriseDetail />, {}],
  ["Règle", <Regle />, {}],
  ["Réglementation", <Reglement />, {}],
  ["Sources", <Sources />, {}],
  ["Statistiques", <Statistiques />, {}],
  ["Technique", <TechniqueDetail />, { techId: "ikejime" }],
];

beforeEach(() => {
  localStorage.clear();
});

describe("Structure des écrans — repères et titre", () => {
  it.each(ECRANS)(
    "%s : un repère <main> et un unique titre de niveau 1, non vide",
    async (_nom, el, patch) => {
      monter(el, patch);

      // Un repère principal : sans lui, « aller au contenu » n'existe pas.
      await waitFor(() => expect(screen.getByRole("main")).toBeInTheDocument());

      // Un titre de niveau 1 : c'est le seul endroit où un lecteur d'écran
      // apprend sur quel écran il vient d'arriver.
      const h1 = await screen.findByRole("heading", { level: 1 });
      expect(h1.textContent?.trim().length ?? 0).toBeGreaterThan(0);

      // Un seul : deux h1 ne hiérarchisent plus rien.
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    },
  );
});
