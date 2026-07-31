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
import { KnotDetail } from "./Noeuds";
import { PriseDetail } from "./PriseDetail";

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
    nom: "KnotDetail",
    lien: "#/noeud/noeud-de-cravate",
    patch: { screen: "knot", knotId: "noeud-de-cravate" },
    ecran: <KnotDetail />,
    quoi: /nœud|noeud/i,
  },
  {
    nom: "PriseDetail",
    lien: "#/capture/1970-01-01T00:00:00.000Z",
    patch: { screen: "prise-detail", catchSlot: "1970-01-01T00:00:00.000Z" },
    ecran: <PriseDetail />,
    quoi: /prise/i,
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
