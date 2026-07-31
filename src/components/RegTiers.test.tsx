// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegTiers } from "./RegTiers";
import type { RegDeptCdp } from "../lib/coindepeche";

// L'app couvre trois départements sur cent et un. Pour les autres elle ne
// disait rien du tout. coindepeche.fr en couvre 96 — c'est un gain de
// couverture, pas un gain de précision, et l'écran doit le dire dans ces mots.

const CARNASSIER = {
  espece: "Carnassier",
  ouverture: "25 avril 2026",
  fermeture: "31 janvier 2027",
  tailleMin: "50 cm",
  quotaJour: "3",
  note: "Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min.",
};

const FICHES: RegDeptCdp[] = [
  {
    code: "18",
    nom: "Cher",
    url: "https://www.coindepeche.fr/reglementation/18-cher",
    especes: [
      {
        espece: "Truite",
        ouverture: "14 mars 2026",
        fermeture: "20 septembre 2026",
        tailleMin: "23 cm",
        quotaJour: "6",
        note: null,
      },
      CARNASSIER,
    ],
  },
  {
    code: "37",
    nom: "Indre-et-Loire",
    url: "https://www.coindepeche.fr/reglementation/37-indre-et-loire",
    especes: [
      {
        espece: "Écrevisse",
        ouverture: "11 juillet 2026",
        fermeture: "20 septembre 2026",
        tailleMin: null,
        quotaJour: null,
        note: "Écrevisse à pattes blanches protégée.",
      },
    ],
  },
];

const props = { fiches: FICHES, consulteLe: "31/07/2026" };

describe("RegTiers", () => {
  it("cite la source et la date de consultation, sans les blanchir en arrêté", () => {
    render(<RegTiers {...props} codeInitial="18" />);

    expect(screen.getByText(/coindepeche\.fr/)).toBeInTheDocument();
    expect(screen.getByText(/31\/07\/2026/)).toBeInTheDocument();
  });

  it("dit explicitement que ce n'est pas l'arrêté préfectoral", () => {
    render(<RegTiers {...props} codeInitial="18" />);

    expect(screen.getByText(/n(?:'|’)est pas l(?:'|’)arrêté préfectoral/i)).toBeInTheDocument();
  });

  it("ouvre sur le département détecté hors zone", () => {
    render(<RegTiers {...props} codeInitial="37" />);

    expect(screen.getByRole("combobox")).toHaveValue("37");
  });

  it("laisse consulter n'importe lequel des départements collectés", async () => {
    const user = userEvent.setup();
    render(<RegTiers {...props} codeInitial="18" />);

    await user.selectOptions(screen.getByRole("combobox"), "37");

    expect(screen.getByText("Écrevisse")).toBeInTheDocument();
  });

  it("affiche les valeurs telles que la fiche les donne", () => {
    render(<RegTiers {...props} codeInitial="18" />);

    expect(screen.getByText("14 mars 2026")).toBeInTheDocument();
    expect(screen.getByText("23 cm")).toBeInTheDocument();
  });

  it("refuse d'afficher « 50 cm » comme maille du bloc carnassier", () => {
    render(<RegTiers {...props} codeInitial="18" />);

    // La note du bloc dit brochet 60, sandre 50, black-bass 30 : le chiffre de
    // tête n'est la maille d'aucune de ces espèces, et garder un brochet de
    // 52 cm dessus est une infraction.
    expect(screen.queryByText("50 cm")).not.toBeInTheDocument();
    expect(screen.getByText(/Brochet : 60 cm min/)).toBeInTheDocument();
  });

  it("écrit « non précisé » quand la fiche ne dit rien, jamais « aucun »", () => {
    render(<RegTiers {...props} codeInitial="37" />);

    expect(screen.getAllByText(/non précisé/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/aucun quota/i)).not.toBeInTheDocument();
  });

  it("mène à la fiche d'origine, pour que le lecteur puisse vérifier", () => {
    render(<RegTiers {...props} codeInitial="18" />);

    expect(screen.getByRole("link", { name: /coindepeche/i })).toHaveAttribute(
      "href",
      "https://www.coindepeche.fr/reglementation/18-cher",
    );
  });

  it("ne prétend rien pour un département qu'elle n'a pas collecté", () => {
    render(<RegTiers {...props} codeInitial="2A" />);

    expect(screen.getByText(/pas de fiche/i)).toBeInTheDocument();
  });
});
