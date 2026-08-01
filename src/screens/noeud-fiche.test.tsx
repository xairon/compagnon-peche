// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { useEffect, type ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { StoreProvider } from "../store";
import { useStore } from "../store-hooks";
import { NoeudFiche } from "./NoeudFiche";
import { KNOTS } from "../data/knots";
import { KNOT_STEPS } from "../data/knot-steps.gen";

/**
 * `StoreProvider` ne prend que `children` : il n'a pas de prop d'état initial.
 * L'état se pose après montage, comme dans a11y-ecrans.test.tsx.
 */
function Amorce({ knotId, children }: { knotId: string; children: ReactElement }) {
  const { set } = useStore();
  useEffect(() => {
    set({ knotId });
    // `knotId` est une constante par cas de test.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return children;
}

const monte = (knotId: string) =>
  render(
    <StoreProvider>
      <Amorce knotId={knotId}>
        <NoeudFiche />
      </Amorce>
    </StoreProvider>,
  );

describe("fiche nœud", () => {
  it("affiche chaque geste, numéroté, dans l'ordre du catalogue", () => {
    const albright = KNOTS.find((k) => k.id === "albright")!;
    monte("albright");
    for (const s of albright.steps) expect(screen.getByText(s)).toBeInTheDocument();
    expect(screen.getAllByTestId("etape")).toHaveLength(albright.steps.length);
  });

  it("montre l'erreur qui fait casser", () => {
    const albright = KNOTS.find((k) => k.id === "albright")!;
    monte("albright");
    expect(screen.getByText("L'erreur qui fait casser")).toBeInTheDocument();
    expect(screen.getByText(albright.erreur)).toBeInTheDocument();
  });

  it("montre les pastilles de difficulté, durée et fil", () => {
    monte("albright");
    expect(screen.getByText("Difficile")).toBeInTheDocument();
    expect(screen.getByText("2 min")).toBeInTheDocument();
    expect(screen.getByText("Nylon · Fluoro · Tresse")).toBeInTheDocument();
  });

  it("n'affiche pas de pastille de résistance quand la donnée manque", () => {
    // L'albright n'a pas de `resistance` : les chiffres publiés varient trop.
    monte("albright");
    expect(screen.queryByTestId("pastille-resistance")).toBeNull();
  });

  it("affiche la pastille de résistance quand la donnée existe", () => {
    monte("chaise");
    expect(screen.getByTestId("pastille-resistance")).toHaveTextContent(
      "c'est un nœud d'amarrage",
    );
  });

  it("rend les renvois cliquables vers les fiches citées", () => {
    monte("dropshot");
    expect(screen.getByRole("button", { name: /Palomar/ })).toBeInTheDocument();
  });

  it("dit ce qui manque quand l'id ne vise aucune fiche", () => {
    monte("inexistant");
    // Le titre ET le message parlent d'un nœud introuvable : viser le titre.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Nœud introuvable");
    expect(screen.queryAllByTestId("etape")).toHaveLength(0);
  });
});

describe("fiche nœud — séquence illustrée", () => {
  it("montre une image par geste quand la séquence existe", () => {
    monte("albright");
    expect(screen.getAllByTestId("image-etape")).toHaveLength(KNOT_STEPS.albright.length);
  });

  it("décrit chaque image par le geste qu'elle montre", () => {
    const albright = KNOTS.find((k) => k.id === "albright")!;
    monte("albright");
    const imgs = screen.getAllByTestId("image-etape");
    expect(imgs[0]).toHaveAttribute("alt", `Albright, étape 1 : ${albright.steps[0]}`);
  });

  it("n'affiche plus l'illustration unique quand la séquence la remplace", () => {
    monte("albright");
    expect(screen.queryByTestId("illustration-unique")).toBeNull();
  });

  it("retombe sur l'illustration unique quand aucune séquence n'existe", () => {
    // Le clinch attend ses photos : sa planche unique reste, faute de mieux.
    monte("clinch");
    expect(screen.getByTestId("illustration-unique")).toBeInTheDocument();
    expect(screen.queryAllByTestId("image-etape")).toHaveLength(0);
  });
});

describe("fiche montage — schéma d'assemblage", () => {
  it("montre le schéma du pater-noster à la place de l'illustration unique", () => {
    monte("paternoster");
    expect(screen.getByTestId("schema-montage")).toBeInTheDocument();
    expect(screen.queryByTestId("illustration-unique")).toBeNull();
  });

  it("le schéma dit à voix haute ce qu'il montre", () => {
    monte("paternoster");
    const svg = screen.getByTestId("schema-montage").querySelector("svg")!;
    expect(svg).toHaveAttribute("role", "img");
    expect(svg.querySelector("title")?.textContent).toMatch(/potence/i);
  });

  it("porte un repère numéroté par geste écrit", () => {
    const pater = KNOTS.find((k) => k.id === "paternoster")!;
    monte("paternoster");
    const reperes = screen.getByTestId("schema-montage").querySelectorAll("[data-repere]");
    expect(reperes).toHaveLength(pater.steps.length);
  });

  it("un montage sans schéma ni séquence garde son illustration unique", () => {
    monte("carolina");
    expect(screen.queryByTestId("schema-montage")).toBeNull();
    expect(screen.getByTestId("illustration-unique")).toBeInTheDocument();
  });
});
