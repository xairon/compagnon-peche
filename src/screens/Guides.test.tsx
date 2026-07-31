// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListeGuides } from "./Guides";
import type { GuideCdp } from "../lib/coindepeche-guides";

// « Prospecte/scrape aussi tous les guides utiles pour notre app, en citant bien
// sûr la source. » L'accord de l'administrateur porte sur la publication, pas
// sur la dispense d'attribution : chaque guide dit d'où il vient, qui le signe
// et de quand il date — et l'app n'embarque pas son texte.

const GUIDES: GuideCdp[] = [
  {
    slug: "peche-sandre-techniques",
    titre: "Pêche du sandre : techniques et stratégies",
    description: "Leurres souples, verticale, linéaire, drop shot.",
    categorie: "Technique",
    publieLe: "2026-02-10",
    modifieLe: "2026-02-18",
    auteur: "Coin de Pêche",
    auteurType: "Organization",
    url: "https://www.coindepeche.fr/guide/peche-sandre-techniques",
  },
  {
    slug: "meilleur-float-tube-2026",
    titre: "Meilleur float tube 2026",
    description: "Comparatif des modèles.",
    categorie: "Comparatif",
    publieLe: "2026-01-05",
    modifieLe: null,
    auteur: "Coin de Pêche",
    auteurType: "Organization",
    url: "https://www.coindepeche.fr/guide/meilleur-float-tube-2026",
  },
];

const props = { guides: GUIDES, consulteLe: "31/07/2026", annonces: 2 };

describe("ListeGuides", () => {
  it("liste les guides collectés", () => {
    render(<ListeGuides {...props} />);

    expect(screen.getByText("Pêche du sandre : techniques et stratégies")).toBeInTheDocument();
    expect(screen.getByText("Meilleur float tube 2026")).toBeInTheDocument();
  });

  it("attribue chaque guide à son auteur déclaré, sans inventer de personne", () => {
    render(<ListeGuides {...props} />);

    expect(screen.getAllByText(/Coin de Pêche/).length).toBeGreaterThan(0);
  });

  it("mène à l'article, jamais à une copie locale", () => {
    render(<ListeGuides {...props} />);

    expect(screen.getByRole("link", { name: /sandre/i })).toHaveAttribute(
      "href",
      "https://www.coindepeche.fr/guide/peche-sandre-techniques",
    );
  });

  it("prévient qu'un guide s'ouvre sur le site et demande une connexion", () => {
    render(<ListeGuides {...props} />);

    expect(screen.getByText(/hors ligne|connexion/i)).toBeInTheDocument();
  });

  it("laisse filtrer par la catégorie que le site affiche", async () => {
    const user = userEvent.setup();
    render(<ListeGuides {...props} />);

    await user.click(screen.getByRole("button", { name: /^Comparatif/ }));

    expect(screen.getByText("Meilleur float tube 2026")).toBeInTheDocument();
    expect(screen.queryByText("Pêche du sandre : techniques et stratégies")).not.toBeInTheDocument();
  });

  it("donne la date de la dernière mise à jour du guide quand il y en a une", () => {
    render(<ListeGuides {...props} />);

    expect(screen.getByText(/18\/02\/2026/)).toBeInTheDocument();
  });

  it("se rabat sur la date de publication quand rien n'a été modifié", () => {
    render(<ListeGuides {...props} />);

    // Le float tube n'a pas de dateModified : afficher la date du jour de
    // collecte à la place ferait passer un article de janvier pour récent.
    expect(screen.getByText(/05\/01\/2026/)).toBeInTheDocument();
  });

  it("avoue une collecte incomplète plutôt que de la passer sous silence", () => {
    render(<ListeGuides guides={GUIDES} consulteLe="31/07/2026" annonces={41} />);

    expect(screen.getByText(/2 .*41/)).toBeInTheDocument();
  });

  it("ne dit rien de tel quand la collecte est complète", () => {
    render(<ListeGuides {...props} />);

    expect(screen.queryByText(/sur 41/)).not.toBeInTheDocument();
  });
});
