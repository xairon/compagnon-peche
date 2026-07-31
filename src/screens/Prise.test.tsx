// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { StoreProvider } from "../store";
import { useStore } from "../store-hooks";
import { Prise } from "./Prise";
import { useEffect } from "react";
import type { DeptId } from "../data/regulation";

/**
 * End-to-end guard on the decision that can cost the angler a fine: the maille
 * shown by "Ma prise" must be the one the préfectoral arrêté sets, not the
 * national floor it is allowed to exceed.
 *
 * The pure resolution is covered in lib/prise.test.ts; this test exists because
 * that logic once WAS correct in the data layer and still never reached this
 * screen — nothing wired the department through. It fails if that wire is cut.
 */
function AtMailleStep({ spId, dept }: { spId: string; dept: DeptId }) {
  const { set } = useStore();
  useEffect(() => {
    // `deptChosen` mirrors what setting a department means in real use: the
    // angler picked it. Without it the screen also shows DeptDefautWarning,
    // which names the same department and would make the assertions below
    // ambiguous — the warning has its own test.
    set({ dept, deptChosen: true, prise: { sp: spId, step: "maille" } });
  }, [set, spId, dept]);
  return <Prise />;
}

function renderAtMaille(spId: string, dept: DeptId) {
  return render(
    <StoreProvider>
      <AtMailleStep spId={spId} dept={dept} />
    </StoreProvider>,
  );
}

describe("Prise — la maille affichée est celle de l'arrêté départemental", () => {
  it("brochet en Loir-et-Cher : 60 cm, jamais les 50 cm nationaux", async () => {
    renderAtMaille("brochet", "41");
    expect(await screen.findByText(/Mesure-t-elle au moins 60 cm/)).toBeInTheDocument();
    expect(screen.queryByText(/Mesure-t-elle au moins 50 cm/)).not.toBeInTheDocument();
  });

  it("sandre en Loir-et-Cher : 50 cm, jamais les 40 cm nationaux", async () => {
    renderAtMaille("sandre", "41");
    expect(await screen.findByText(/Mesure-t-elle au moins 50 cm/)).toBeInTheDocument();
    expect(screen.queryByText(/Mesure-t-elle au moins 40 cm/)).not.toBeInTheDocument();
  });

  it("le brochet est à 60 cm dans les trois départements couverts", async () => {
    for (const d of ["23", "36", "41"] as DeptId[]) {
      const { unmount } = renderAtMaille("brochet", d);
      expect(await screen.findByText(/Mesure-t-elle au moins 60 cm/)).toBeInTheDocument();
      unmount();
    }
  });

  it("nomme le département, pour que le pêcheur puisse vérifier l'arrêté", async () => {
    renderAtMaille("brochet", "41");
    expect(await screen.findByText(/Loir-et-Cher/)).toBeInTheDocument();
  });

  it("le bouton de validation reste offert (on ne bloque pas le parcours)", async () => {
    renderAtMaille("brochet", "41");
    const btn = await screen.findByText(/Oui, elle fait la maille/);
    expect(btn).toBeInTheDocument();
  });

  it("une espèce sans spécificité départementale garde sa maille nationale", async () => {
    renderAtMaille("ombre", "41");
    const heading = await screen.findByText(/Mesure-t-elle au moins/);
    expect(within(heading).getByText(/30 cm/)).toBeDefined();
  });
});

/**
 * La revue finale a montré que le premier correctif ne couvrait que le titre de
 * la carte : le champ de saisie et l'écran Règle lisaient toujours la maille
 * nationale. Ces tests verrouillent les surfaces oubliées.
 */
describe("Prise — toutes les surfaces annoncent la même maille", () => {
  it("le champ « taille mesurée » propose le seuil départemental, pas le national", async () => {
    renderAtMaille("brochet", "41");
    await screen.findByText(/Mesure-t-elle au moins 60 cm/);
    expect(screen.getByPlaceholderText("≥ 60 cm")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("≥ 50 cm")).not.toBeInTheDocument();
  });

  it("ne prétend pas « au-dessus du socle national » quand la valeur est la même", async () => {
    renderAtMaille("black-bass", "41");
    await screen.findByText(/Mesure-t-elle au moins 30 cm/);
    expect(screen.queryByText(/au-dessus du socle national/)).not.toBeInTheDocument();
  });
});
