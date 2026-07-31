// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RegPerimeeWarning } from "./RegPerimeeWarning";
import { REG_YEAR } from "../data/version";
import { DEPARTEMENTS } from "../data/regulation";

// A persistent banner, not a toast: this is not an event that happened once,
// it is a standing condition of the data on screen. It has to be legible on the
// screens where the angler acts on a figure — not tucked into a settings page.

describe("RegPerimeeWarning", () => {
  it("ne dit rien tant que la saison embarquée est celle en cours", () => {
    const { container } = render(<RegPerimeeWarning dept="41" now={new Date(REG_YEAR, 5, 1)} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("annonce le millésime servi une fois l'année tournée", () => {
    render(<RegPerimeeWarning dept="41" now={new Date(REG_YEAR + 1, 0, 1)} />);

    expect(screen.getByText(new RegExp(String(REG_YEAR)))).toBeInTheDocument();
  });

  it("nomme l'année manquante, pas seulement celle qu'on a", () => {
    render(<RegPerimeeWarning dept="41" now={new Date(REG_YEAR + 1, 3, 12)} />);

    // "we have 2026" is only actionable if the reader knows 2027 is missing.
    expect(screen.getByText(new RegExp(String(REG_YEAR + 1)))).toBeInTheDocument();
  });

  it("renvoie vers la fédération du département actif", () => {
    render(<RegPerimeeWarning dept="36" now={new Date(REG_YEAR + 1, 0, 1)} />);

    const lien = screen.getByRole("link");
    expect(lien).toHaveAttribute("href", DEPARTEMENTS["36"].url);
  });
});
