// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeptDefautWarning } from "./DeptDefautWarning";

// Companion to OutOfZoneWarning, for the case that came *before* GPS: the user
// was never asked at all. The app still applies Loir-et-Cher — where the
// salmonid quota reads "6 truites/jour" against the Indre's "6 salmonidés dont
// 2 fario max" — so silence is the one thing it must not do.

describe("DeptDefautWarning", () => {
  it("avertit tant que le pêcheur n'a pas confirmé son département", () => {
    render(<DeptDefautWarning deptChosen={false} activeDept="41" />);

    expect(screen.getByText(/Loir-et-Cher/)).toBeInTheDocument();
  });

  it("nomme le département appliqué, pour qu'on puisse le contredire", () => {
    render(<DeptDefautWarning deptChosen={false} activeDept="41" />);

    // A warning that doesn't say which rules are being applied gives the
    // reader nothing to check against.
    expect(screen.getByText(/Réglementation/i)).toBeInTheDocument();
  });

  it("disparaît dès que le choix est fait", () => {
    const { container } = render(<DeptDefautWarning deptChosen activeDept="36" />);

    expect(container).toBeEmptyDOMElement();
  });
});
