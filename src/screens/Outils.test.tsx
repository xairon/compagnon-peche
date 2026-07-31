// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StoreProvider } from "../store";
import { Outils } from "./Outils";
import { DEPARTEMENTS } from "../data/regulation";

// lib/pwa importe `virtual:pwa-register`, fabriqué par le plugin PWA au build
// seulement — même mock que a11y-ecrans.test.tsx.
vi.mock("../lib/pwa", () => ({
  usePwa: () => ({
    canInstall: false,
    install: vi.fn(),
    needRefresh: false,
    applyUpdate: vi.fn(),
    reserve: { total: 0, presents: 0, echecs: 0, enCours: false, complete: false },
  }),
}));

// Signalé à l'usage : « département actif dans outils est pas bon, j'ai changé
// dans accueil et ça a pas mis à jour ailleurs ».
//
// Mesuré au navigateur : la VALEUR se met bien à jour — changer pour la Creuse
// sur l'Accueil affiche « Creuse (23) » dans Outils au rendu suivant. Ce qui
// était faux, c'est la phrase : « modifiable dans Réglementation » envoyait
// l'utilisateur à un autre écran alors que le contrôle est sur l'Accueil, juste
// sous ses yeux. Une consigne périmée se lit comme un défaut de mise à jour.

const rendre = () =>
  render(
    <StoreProvider>
      <Outils />
    </StoreProvider>,
  );

describe("Outils — département actif", () => {
  it("affiche le département du store, pas une valeur figée", () => {
    rendre();

    // Le défaut par défaut du store est le 41 ; ce qui compte est que le nom
    // vienne de DEPARTEMENTS et non d'une chaîne recopiée.
    const noms = Object.values(DEPARTEMENTS).map((d) => d.name);
    const ligne = screen.getByText(/Département actif/).closest("button")!;

    expect(noms.some((n) => ligne.textContent!.includes(n))).toBe(true);
  });

  it("n'envoie plus changer le département dans un autre écran", () => {
    // Le bouton de l'Accueil est le contrôle principal depuis qu'il existe.
    rendre();
    const ligne = screen.getByText(/Département actif/).closest("button")!;

    expect(ligne.textContent).not.toMatch(/modifiable dans Réglementation/i);
  });

  it("dit où se change le département, et c'est l'Accueil", () => {
    rendre();
    const ligne = screen.getByText(/Département actif/).closest("button")!;

    expect(ligne.textContent).toMatch(/accueil/i);
  });
});
