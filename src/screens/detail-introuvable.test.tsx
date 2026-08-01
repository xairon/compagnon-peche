// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import type { ReactElement } from "react";
import { StoreProvider } from "../store";
import type { AppState } from "../store";
import { useStore } from "../store-hooks";
import { Recette } from "./Recette";
import { TechniqueDetail } from "./Techniques";
import { NoeudFiche } from "./NoeudFiche";
import { PriseDetail } from "./PriseDetail";
import { Fiche } from "./Fiche";
import { Cuisine } from "./Cuisine";
import { SPECIES } from "../data/species";

/**
 * Depuis les liens profonds, un identifiant qui ne résout rien n'est plus un cas
 * de laboratoire : n'importe quel lien collé, tronqué par une messagerie, ou
 * écrit pour une autre version de l'app arrive ici. Trois écrans répondaient à
 * ça par `return null` — un écran entièrement blanc, sans titre, sans flèche de
 * retour et sans un mot d'explication.
 *
 * PriseDetail traitait déjà le cas correctement (topbar + « ‹ » + phrase). Ce
 * test le prend pour référence et exige la même chose des trois autres : il
 * contient donc AUSSI le cas déjà bon, pour que la référence ne parte pas en
 * silence si quelqu'un simplifie PriseDetail un jour.
 */
const CAS: {
  nom: string;
  lien: string;
  patch: Partial<AppState>;
  ecran: ReactElement;
  /** Le mot que la phrase doit contenir : elle doit dire CE QUI manque. */
  quoi: RegExp;
}[] = [
  {
    nom: "Recette",
    lien: "#/recette/tarte-aux-cailloux",
    patch: { screen: "recette", recipeId: "tarte-aux-cailloux" },
    ecran: <Recette />,
    quoi: /recette/i,
  },
  {
    nom: "TechniqueDetail",
    lien: "#/technique/peche-a-la-fourchette",
    patch: { screen: "technique", techId: "peche-a-la-fourchette" },
    ecran: <TechniqueDetail />,
    quoi: /technique/i,
  },
  {
    nom: "NoeudFiche",
    lien: "#/noeud/noeud-de-cravate",
    patch: { screen: "knot", knotId: "noeud-de-cravate" },
    ecran: <NoeudFiche />,
    quoi: /nœud|noeud/i,
  },
  {
    nom: "PriseDetail",
    lien: "#/capture/1970-01-01T00:00:00.000Z",
    patch: { screen: "prise-detail", catchSlot: "1970-01-01T00:00:00.000Z" },
    ecran: <PriseDetail />,
    quoi: /prise/i,
  },
  // Les deux suivants ne rendaient PAS un écran blanc — ils faisaient pire ou
  // presque, chacun à sa façon. Voir les deux blocs `describe` en bas.
  {
    nom: "Fiche",
    lien: "#/espece/poisson-lune-de-mars",
    patch: { screen: "fiche", spId: "poisson-lune-de-mars" },
    ecran: <Fiche />,
    quoi: /espèce/i,
  },
  {
    nom: "Cuisine",
    lien: "#/cuisine/tarte-aux-cailloux",
    patch: { screen: "cuisine", recipeId: "tarte-aux-cailloux" },
    ecran: <Cuisine />,
    quoi: /recette/i,
  },
];

function Monte({ patch, ecran }: { patch: Partial<AppState>; ecran: ReactElement }) {
  const { set } = useStore();
  useEffect(() => {
    set(patch);
  }, [set, patch]);
  return ecran;
}

function ouvre(cas: (typeof CAS)[number]) {
  return render(
    <StoreProvider>
      <Monte patch={cas.patch} ecran={cas.ecran} />
    </StoreProvider>,
  );
}

describe.each(CAS)("$nom — identifiant qui ne résout rien ($lien)", (cas) => {
  it("n'affiche pas un écran blanc", () => {
    ouvre(cas);
    expect((document.body.textContent ?? "").trim()).not.toBe("");
  });

  it("offre une flèche de retour, seule sortie quand l'app s'ouvre sur ce lien", () => {
    ouvre(cas);
    expect(screen.getByLabelText("Retour")).toBeDefined();
  });

  it("dit ce qui manque, plutôt que de laisser deviner", () => {
    ouvre(cas);
    const note = document.querySelector(".empty-note");
    expect(note, "aucun .empty-note : la phrase n'a pas le rendu des autres états vides").not.toBe(
      null,
    );
    expect(note?.textContent ?? "").toMatch(cas.quoi);
  });
});

/**
 * La fiche espèce ne rendait pas un blanc : elle repliait sur `SPECIES[0]`.
 * `#/espece/nimporte-quoi` affichait donc la PREMIÈRE espèce du catalogue —
 * sa maille, son quota, sa saison — comme si c'était celle demandée. Un écran
 * blanc se remarque ; celui-là se croit. Et la barre du bas est masquée sur
 * `fiche` (App.tsx), donc la flèche « ‹ » y est la seule sortie.
 */
describe("Fiche — un identifiant inconnu ne se déguise pas en autre espèce", () => {
  const cas = CAS.find((c) => c.nom === "Fiche")!;

  it("n'affiche pas la première espèce du catalogue à la place", () => {
    ouvre(cas);
    // Lu depuis le catalogue et non écrit en dur : le repli était `SPECIES[0]`,
    // pas « le sandre » — réordonner le catalogue ne doit pas endormir le test.
    expect(document.body.textContent ?? "").not.toContain(SPECIES[0].name);
  });

  it("n'annonce aucune maille, faute d'espèce à laquelle l'appliquer", () => {
    ouvre(cas);
    expect(document.body.textContent ?? "").not.toMatch(/maille/i);
  });
});

/**
 * Le mode cuisine, lui, acceptait la recette inconnue : titre vide, zéro
 * ingrédient, zéro étape, et une barre de progression de longueur nulle. Il
 * gardait son « ✕ », donc ce n'était pas une impasse — mais l'écran ne disait
 * pas ce qui n'allait pas, et la barre du bas y est masquée elle aussi.
 */
describe("Cuisine — une recette inconnue ne se joue pas à vide", () => {
  const cas = CAS.find((c) => c.nom === "Cuisine")!;

  it("ne propose pas de « commencer » une recette qui n'existe pas", () => {
    ouvre(cas);
    expect(document.body.textContent ?? "").not.toMatch(/Commencer/i);
  });
});
