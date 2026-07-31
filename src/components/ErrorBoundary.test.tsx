// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

// The last screen a user ever sees when things go wrong, and it had no test.
// It also gave them nothing to do with what it showed: a minified message in a
// <details>, unselectable on a phone, and no way to send it anywhere.

function Explose(): never {
  throw new Error("boum interne");
}

beforeEach(() => {
  // React logs the caught error; expected here, and it drowns the output.
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("ErrorBoundary", () => {
  it("laisse passer ce qui ne casse pas", () => {
    render(
      <ErrorBoundary>
        <p>contenu</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("contenu")).toBeInTheDocument();
  });

  it("montre un écran de secours au lieu d'une page blanche", () => {
    render(
      <ErrorBoundary>
        <Explose />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("button", { name: /recharger/i })).toBeInTheDocument();
  });

  it("rassure sur les données, qui sont justement locales", () => {
    render(
      <ErrorBoundary>
        <Explose />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/carnet/i)).toBeInTheDocument();
  });

  /** The report body, read back the way the browser hands it to GitHub. */
  function corpsDuLien(): string {
    const href = screen.getByRole("link", { name: /signaler/i }).getAttribute("href") ?? "";
    return new URL(href).searchParams.get("body") ?? "";
  }

  it("offre de signaler, avec la version déjà dedans", () => {
    render(
      <ErrorBoundary>
        <Explose />
      </ErrorBoundary>,
    );

    expect(corpsDuLien()).toMatch(/version/i);
  });

  it("emporte le message d'erreur dans le signalement", () => {
    render(
      <ErrorBoundary>
        <Explose />
      </ErrorBoundary>,
    );

    expect(corpsDuLien()).toContain("boum interne");
  });
});
