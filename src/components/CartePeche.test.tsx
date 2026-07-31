// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CartePeche } from "./CartePeche";

// « Faudra aussi gérer de manière parfaite l'achat et la gestion de carte de
// pêche dans l'app. » L'app ne peut pas encaisser — cartedepeche.fr est le
// canal officiel FNPF. Ce qu'elle peut faire : savoir quelle carte le pêcheur
// a, jusqu'à quand elle vaut vraiment, et où la renouveler.

const LE_31_JUILLET = new Date(2026, 6, 31, 10, 0);

describe("CartePeche", () => {
  it("invite à en prendre une quand rien n'est renseigné", () => {
    render(<CartePeche carte={undefined} now={LE_31_JUILLET} />);

    expect(screen.getByText(/obligatoire dès 12 ans/i)).toBeInTheDocument();
  });

  it("renvoie vers le canal officiel, sans jamais encaisser", () => {
    render(<CartePeche carte={undefined} now={LE_31_JUILLET} />);

    const lien = screen.getByRole("link", { name: /cartedepeche\.fr/i });
    expect(lien).toHaveAttribute("href", "https://www.cartedepeche.fr/");
    expect(lien).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("ne promet pas le 31 décembre à une carte journalière", () => {
    render(
      <CartePeche carte={{ type: "journaliere", debut: "2026-07-31" }} now={LE_31_JUILLET} />,
    );

    expect(screen.getByText(/aujourd'hui/i)).toBeInTheDocument();
    expect(screen.queryByText(/31 décembre/i)).not.toBeInTheDocument();
  });

  it("donne la vraie fin de validité d'une hebdomadaire", () => {
    render(
      <CartePeche carte={{ type: "hebdomadaire", debut: "2026-07-27" }} now={LE_31_JUILLET} />,
    );

    expect(screen.getByText(/2 août 2026/)).toBeInTheDocument();
  });

  it("dit qu'une carte de l'an prochain ne vaut pas encore, et depuis quand elle vaudra", () => {
    render(
      <CartePeche carte={{ type: "annuelle", annee: 2027 }} now={new Date(2026, 11, 1)} />,
    );

    expect(screen.getByText(/pas encore/i)).toBeInTheDocument();
    expect(screen.getByText(/1 janvier 2027/)).toBeInTheDocument();
  });

  it("alerte sur une carte périmée en disant ce qu'on risque", () => {
    render(<CartePeche carte={{ type: "annuelle", annee: 2024 }} now={LE_31_JUILLET} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/450/);
  });

  it("affiche la réciprocité déclarée", () => {
    render(
      <CartePeche
        carte={{ type: "annuelle", annee: 2026, reciprocite: "EHGO" }}
        now={LE_31_JUILLET}
      />,
    );

    expect(screen.getByText(/Entente Halieutique du Grand Ouest/)).toBeInTheDocument();
  });

  it("avoue ne pas connaître la réciprocité plutôt que de la deviner", () => {
    render(
      <CartePeche
        carte={{ type: "annuelle", annee: 2026, reciprocite: "inconnue" }}
        now={LE_31_JUILLET}
      />,
    );

    expect(screen.getByText(/ne la devine pas/i)).toBeInTheDocument();
  });

  it("ne dit rien de la réciprocité quand le pêcheur ne l'a pas renseignée", () => {
    render(<CartePeche carte={{ type: "annuelle", annee: 2026 }} now={LE_31_JUILLET} />);

    expect(screen.queryByText(/réciprocité/i)).not.toBeInTheDocument();
  });

  it("nomme le type de carte, parce que c'est lui qui décide de la durée", () => {
    render(<CartePeche carte={{ type: "interfederale", annee: 2026 }} now={LE_31_JUILLET} />);

    expect(screen.getByText(/interfédérale/i)).toBeInTheDocument();
  });
});
