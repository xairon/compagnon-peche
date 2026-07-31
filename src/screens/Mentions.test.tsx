// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MentionsLegales } from "./Mentions";
import { champsACompleter, IDENTITE, A_COMPLETER } from "../data/mentions-legales";
import type { Identite } from "../data/mentions-legales";

// Une app publiée doit dire QUI la publie et QUI l'héberge. Le reste des
// clauses existe déjà ailleurs (Reglement.tsx et Fiche.tsx portent le
// « la réglementation applicable est celle de l'arrêté préfectoral ») : ce qui
// manquait, c'est le volet identité + sanitaire.
//
// L'éditeur n'est pas connu de l'agent qui écrit ce code. Plutôt que d'inventer
// un nom, un statut et une adresse — ce qui rendrait les mentions FAUSSES, donc
// pires que creuses —, les champs inconnus portent un marqueur explicite, et
// deux garde-fous les rendent impossibles à oublier :
//   1. l'écran affiche lui-même ce qui manque, en clair, à l'utilisateur ;
//   2. le test « barrière de publication » plus bas échoue tant qu'ils sont là.

const REMPLIE: Identite = {
  editeur: "Jean Pêcheur",
  statut: "particulier",
  contact: "https://example.org/contact",
  hebergeur: "GitHub, Inc. — GitHub Pages",
  hebergeurAdresse: "88 Colin P. Kelly Jr. St., San Francisco, CA 94107, États-Unis",
  siteUrl: "https://exemple.github.io/appli/",
};

describe("champsACompleter", () => {
  it("ne signale rien quand tout est renseigné", () => {
    expect(champsACompleter(REMPLIE)).toEqual([]);
  });

  it("nomme chaque champ resté au marqueur", () => {
    const manque = champsACompleter({ ...REMPLIE, editeur: A_COMPLETER, hebergeur: A_COMPLETER });

    expect(manque).toHaveLength(2);
    expect(manque.join(" ")).toMatch(/diteur/);
    expect(manque.join(" ")).toMatch(/bergeur/);
  });

  it("traite un champ vide comme un champ non renseigné", () => {
    // Effacer le marqueur n'est pas le remplir : sinon il suffirait de vider la
    // constante pour faire taire la barrière.
    expect(champsACompleter({ ...REMPLIE, statut: "   " })).toHaveLength(1);
  });
});

describe("MentionsLegales", () => {
  it("nomme l'éditeur et son statut", () => {
    render(<MentionsLegales identite={REMPLIE} />);

    expect(screen.getByText(/Jean Pêcheur/)).toBeInTheDocument();
    expect(screen.getByText(/Statut :/)).toHaveTextContent("particulier");
  });

  it("nomme l'hébergeur et donne son adresse", () => {
    render(<MentionsLegales identite={REMPLIE} />);

    expect(screen.getByText(/GitHub, Inc\./)).toBeInTheDocument();
    expect(screen.getByText(/Colin P\. Kelly/)).toBeInTheDocument();
  });

  it("publie un moyen de contact cliquable", () => {
    render(<MentionsLegales identite={REMPLIE} />);

    expect(screen.getByRole("link", { name: /contact/i })).toHaveAttribute(
      "href",
      "https://example.org/contact",
    );
  });

  it("dit que rien ne quitte l'appareil, dans les mêmes termes que l'écran Sources", () => {
    // Deux formulations différentes pour une même promesse, ce sont deux
    // promesses : l'utilisateur ne peut plus savoir laquelle fait foi.
    render(<MentionsLegales identite={REMPLIE} />);

    expect(screen.getByText(/carnet.*photos.*profil/i)).toHaveTextContent(
      /jamais transmis/i,
    );
  });

  it("dit aussi ce qui SORT de l'appareil, pour ne pas promettre plus que vrai", () => {
    // La carte et la météo envoient bien la position à des API publiques.
    render(<MentionsLegales identite={REMPLIE} />);

    expect(screen.getByText(/position|zone affichée/i)).toBeInTheDocument();
  });

  it("porte la clause « ni conseil juridique ni avis médical »", () => {
    render(<MentionsLegales identite={REMPLIE} />);

    const texte = document.body.textContent ?? "";
    expect(texte).toMatch(/conseil juridique/i);
    expect(texte).toMatch(/avis médical/i);
  });

  it("avertit l'utilisateur quand les mentions sont incomplètes, et dit lesquelles", () => {
    render(<MentionsLegales identite={{ ...REMPLIE, editeur: A_COMPLETER }} />);

    const alerte = screen.getByRole("alert");
    expect(alerte).toHaveTextContent(/incompl/i);
    expect(alerte).toHaveTextContent(/diteur/);
  });

  it("n'avertit de rien quand les mentions sont complètes", () => {
    render(<MentionsLegales identite={REMPLIE} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("barrière de publication", () => {
  it("interdit de publier la version 1.0 avec des mentions légales creuses", () => {
    // package.json est déjà en 1.0.0 : ce test est ROUGE, volontairement, et il
    // le restera tant que le propriétaire n'aura pas rempli IDENTITE dans
    // src/screens/Mentions.tsx. C'est le seul mécanisme qui empêche l'app d'être
    // publiée en disant « Éditeur : à compléter ». Le déploiement passe par
    // .github/workflows/deploy.yml, qui lance `npm test` AVANT de publier sur
    // Pages : la barrière est donc effective, pas décorative.
    //
    // Une pré-version (0.x) aurait le droit de vivre avec le marqueur ; 1.0 non.
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
      version: string;
    };
    const majeure = Number(pkg.version.split(".")[0]);
    if (majeure < 1) return;

    expect(champsACompleter(IDENTITE)).toEqual([]);
  });
});
