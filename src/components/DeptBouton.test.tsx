// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeptBouton } from "./DeptBouton";
import { DEPT_REG } from "../data/regulation";

// Demande de l'utilisateur : « le choix du département devrait être un bouton
// très intuitif sur l'accueil par réglementation ». Deux exigences, pas une :
// visible sans chercher, et qui montre la RÉGLEMENTATION qu'on choisit — pas
// un code de département nu, qui ne dit rien de ce qui change.

const noop = () => {};

describe("DeptBouton", () => {
  it("annonce en clair la réglementation appliquée et son département", () => {
    render(
      <DeptBouton dept="36" deptChosen outOfZoneDept={null} onChoose={noop} onVoirTout={noop} />,
    );

    const b = screen.getByRole("button", { name: /Indre \(36\)/ });
    expect(b).toHaveAccessibleName(/Réglementation appliquée/);
  });

  it("appelle à l'action tant que le département n'a pas été confirmé", () => {
    render(
      <DeptBouton
        dept="41"
        deptChosen={false}
        outOfZoneDept={null}
        onChoose={noop}
        onVoirTout={noop}
      />,
    );

    expect(screen.getByText(/Choisir mon département/)).toBeInTheDocument();
  });

  it("garde une cible d'au moins 44 px — l'app se pilote avec des gants mouillés", () => {
    render(
      <DeptBouton dept="41" deptChosen outOfZoneDept={null} onChoose={noop} onVoirTout={noop} />,
    );

    expect(screen.getByRole("button", { name: /Loir-et-Cher/ })).toHaveStyle({ minHeight: "56px" });
  });

  it("reste replié tant qu'on n'y touche pas", async () => {
    render(
      <DeptBouton dept="41" deptChosen outOfZoneDept={null} onChoose={noop} onVoirTout={noop} />,
    );

    expect(screen.getByRole("button", { name: /Loir-et-Cher/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("button", { name: /Indre/ })).not.toBeInTheDocument();
  });

  it("ouvre un choix qui montre ce qui change d'un département à l'autre", async () => {
    const user = userEvent.setup();
    render(
      <DeptBouton dept="41" deptChosen outOfZoneDept={null} onChoose={noop} onVoirTout={noop} />,
    );

    await user.click(screen.getByRole("button", { name: /Loir-et-Cher/ }));

    // La valeur est citée entière : « sinon 23 cm » est le cas majoritaire dans
    // la Creuse, l'amputer inverserait le verdict sur la plupart des cours d'eau.
    expect(screen.getByText(DEPT_REG["23"].truiteMaille)).toBeInTheDocument();
    expect(screen.getByText(DEPT_REG["36"].salmonideQuota)).toBeInTheDocument();
  });

  it("marque le département actif parmi les options", async () => {
    const user = userEvent.setup();
    render(
      <DeptBouton dept="36" deptChosen outOfZoneDept={null} onChoose={noop} onVoirTout={noop} />,
    );

    await user.click(screen.getByRole("button", { name: /Indre/ }));

    const option = screen.getByRole("option", { name: /Indre/ });
    expect(option).toHaveAttribute("aria-selected", "true");
  });

  it("ne marque aucune option tant que le défaut n'a pas été confirmé", async () => {
    const user = userEvent.setup();
    render(
      <DeptBouton
        dept="41"
        deptChosen={false}
        outOfZoneDept={null}
        onChoose={noop}
        onVoirTout={noop}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Loir-et-Cher/ }));

    // Cocher le 41 ferait passer un défaut jamais confirmé pour une réponse.
    expect(screen.getAllByRole("option").every((o) => o.getAttribute("aria-selected") === "false"))
      .toBe(true);
  });

  it("remonte le choix et se referme", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(
      <DeptBouton dept="41" deptChosen outOfZoneDept={null} onChoose={onChoose} onVoirTout={noop} />,
    );

    await user.click(screen.getByRole("button", { name: /Loir-et-Cher/ }));
    await user.click(screen.getByRole("option", { name: /Creuse/ }));

    expect(onChoose).toHaveBeenCalledWith("23");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("dit que le GPS place le pêcheur hors zone, sans taire ce qui est appliqué", () => {
    render(
      <DeptBouton dept="41" deptChosen outOfZoneDept="37" onChoose={noop} onVoirTout={noop} />,
    );

    expect(screen.getByText(/37/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Loir-et-Cher/ })).toBeInTheDocument();
  });

  it("mène à la réglementation complète, que le bouton ne prétend pas résumer", async () => {
    const user = userEvent.setup();
    const onVoirTout = vi.fn();
    render(
      <DeptBouton
        dept="41"
        deptChosen
        outOfZoneDept={null}
        onChoose={noop}
        onVoirTout={onVoirTout}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Loir-et-Cher/ }));
    await user.click(screen.getByRole("button", { name: /réglementation complète/i }));

    expect(onVoirTout).toHaveBeenCalled();
  });
});
