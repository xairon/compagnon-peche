// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoreProvider } from "../store";
import { Noeuds } from "./Noeuds";
import { KNOT_STEPS } from "../data/knot-steps.gen";

// La liste ne lit aucun état du store : un montage nu suffit.
const monte = () =>
  render(
    <StoreProvider>
      <Noeuds />
    </StoreProvider>,
  );

const nomsAffiches = () =>
  screen.getAllByTestId("tuile-noeud").map((n) => n.querySelector(".noeud-tuile-nom")?.textContent);

describe("liste des nœuds & montages", () => {
  it("montre les 15 fiches sans filtre actif", () => {
    monte();
    expect(screen.getAllByTestId("tuile-noeud")).toHaveLength(15);
  });

  it("ne garde que les fiches du besoin choisi", async () => {
    const user = userEvent.setup();
    monte();
    await user.click(screen.getByRole("button", { name: "Relier deux fils" }));
    expect(nomsAffiches()).toEqual([
      "Raccord ligne / bas de ligne",
      "Nœud de sang",
      "Albright",
    ]);
  });

  it("un second clic sur le même besoin le désactive", async () => {
    const user = userEvent.setup();
    monte();
    const bouton = screen.getByRole("button", { name: "Relier deux fils" });
    await user.click(bouton);
    await user.click(bouton);
    expect(screen.getAllByTestId("tuile-noeud")).toHaveLength(15);
  });

  it("le filtre actif est annoncé aux lecteurs d'écran", async () => {
    const user = userEvent.setup();
    monte();
    const bouton = screen.getByRole("button", { name: "Pêcher au fond" });
    expect(bouton).toHaveAttribute("aria-pressed", "false");
    await user.click(bouton);
    expect(bouton).toHaveAttribute("aria-pressed", "true");
  });

  it("la vignette montre le nœud fini, pas la planche entière", () => {
    monte();
    const tuile = screen
      .getAllByTestId("tuile-noeud")
      .find((n) => n.textContent?.includes("Albright"))!;
    const derniere = KNOT_STEPS.albright[KNOT_STEPS.albright.length - 1];
    expect(tuile.querySelector("img")).toHaveAttribute(
      "src",
      expect.stringContaining(derniere.file),
    );
  });

  it("masque un en-tête de groupe que le filtre a vidé", async () => {
    const user = userEvent.setup();
    monte();
    // Les trois nœuds de raccord sont tous dans « Nœuds » : le groupe
    // « Montages » n'a plus rien à montrer et son en-tête doit disparaître.
    await user.click(screen.getByRole("button", { name: "Relier deux fils" }));
    expect(screen.queryByText("Montages")).toBeNull();
    expect(screen.getByText("Nœuds")).toBeInTheDocument();
  });
});
