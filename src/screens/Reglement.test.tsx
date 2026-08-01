// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoreProvider } from "../store";
import { Reglement } from "./Reglement";

// Deux contrôles pour un seul réglage : le bouton de l'Accueil (DeptBouton) et
// une rangée de boutons propre à cet écran. C'est la vraie source de la
// confusion signalée à l'usage — l'utilisateur change le département quelque
// part, retrouve ailleurs une commande d'apparence différente, et ne sait plus
// laquelle fait foi.
//
// Un seul COMPOSANT désormais, réutilisé. Le contrôle reste ici — on veut
// pouvoir changer de département en lisant les règles — mais il se présente et
// se comporte exactement comme sur l'Accueil.

const rendre = () =>
  render(
    <StoreProvider>
      <Reglement />
    </StoreProvider>,
  );

describe("Réglementation — sélecteur de département", () => {
  it("emploie le même contrôle que l'Accueil", () => {
    const { container } = rendre();

    expect(container.querySelector(".deptb")).not.toBeNull();
  });

  it("n'a plus sa propre rangée de boutons", () => {
    // Le doublon : trois boutons portant un nom de département, en plus du
    // contrôle. Les compter est le seul moyen de garantir qu'il a disparu.
    rendre();

    const nus = screen
      .getAllByRole("button")
      .filter((b) => /^(Creuse|Indre|Loir-et-Cher) \(\d+\)$/.test(b.textContent ?? ""));

    expect(nus).toEqual([]);
  });

  it("change bien le département, et l'écran suit", async () => {
    const user = userEvent.setup();
    const { container } = rendre();

    await user.click(container.querySelector<HTMLElement>(".deptb-main")!);
    await user.click(screen.getByRole("option", { name: /Creuse/ }));

    // Le bloc réglementaire au-dessous cite l'arrêté du département actif :
    // s'il ne suivait pas, le contrôle mentirait sur ce qu'il gouverne.
    // Ciblé sur CE bloc — « Creuse » apparaît aussi dans le contrôle lui-même
    // et dans les notes, et un getByText large ne prouverait rien.
    const bloc = screen.getByText(/Arrêté préfectoral annuel/).closest(".reg-block")!;

    expect(bloc.textContent).toMatch(/Creuse/);
  });

  it("garde la réglementation du département sous le contrôle qui la choisit", () => {
    // L'ordre compte : la commande AVANT le bloc qu'elle gouverne. Placée
    // après, elle se lisait comme une décoration.
    const { container } = rendre();
    const bouton = container.querySelector(".deptb")!;
    const bloc = screen.getByText(/Arrêté préfectoral annuel/);

    expect(bouton.compareDocumentPosition(bloc) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
