// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { StoreProvider } from "../store";
import type { AppState } from "../store";
import { useStore } from "../store-hooks";
import { Regle } from "./Regle";
import { Fiche } from "./Fiche";
import { SPECIES } from "../data/species";

/**
 * La règle à l'écran est un instrument de MESURE : le pêcheur pose le poisson
 * contre la vitre et lit un trait pointillé nommé « Maille <espèce> — n cm ».
 * Elle appartient donc à la même famille que la carte de décision de « Ma
 * prise » (lib/prise.test.ts, Prise.test.tsx) : ce qu'elle affiche décide de ce
 * qui est gardé, et se paye en amende.
 *
 * Elle repliait sur `SPECIES[0]` quand aucune espèce n'était résolue. Ce n'est
 * pas un cas de bord : `nav("regle")` EFFACE `spId`, parce que la table des
 * routes ne déclare aucun contexte pour cet écran (lot E). Le lien « Règle » de
 * la fiche espèce, posé juste sous « Maille 60 cm », menait donc à une règle
 * qui traçait la maille d'une AUTRE espèce sous un nom qui n'était pas celui
 * qu'on venait de lire.
 */

function Monte({ patch, ecran }: { patch: Partial<AppState>; ecran: React.ReactElement }) {
  const { set } = useStore();
  useEffect(() => {
    set(patch);
  }, [set, patch]);
  return ecran;
}

/** Fiche et Règle sous le même store, pour pouvoir suivre le lien « Règle »
 *  comme le pêcheur le suit — c'est la navigation elle-même qui perdait
 *  l'espèce, donc la tester écran par écran ne prouverait rien. */
function FicheOuRegle() {
  const { state } = useStore();
  return state.screen === "regle" ? <Regle /> : <Fiche />;
}

describe("Règle — elle ne mesure jamais une espèce que le pêcheur n'a pas demandée", () => {
  it("depuis la fiche brochet, elle trace la maille du brochet", async () => {
    const user = userEvent.setup();
    render(
      <StoreProvider>
        <Monte
          patch={{ dept: "41", deptChosen: true, screen: "fiche", spId: "brochet" }}
          ecran={<FicheOuRegle />}
        />
      </StoreProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "Règle" }));

    const page = document.body.textContent ?? "";
    expect(page).toMatch(/Maille Brochet/);
    // Le repli exact qui était en place : la première espèce du catalogue.
    expect(page).not.toContain(`Maille ${SPECIES[0].name}`);
  });

  it("pendant le parcours « Ma prise », elle suit l'espèce du parcours", () => {
    // Le chemin le plus cher : le poisson est dans la main, le trait décide.
    // `prise.sp` n'est PAS du contexte de navigation (nav-conventions.ts), donc
    // il survit à `nav("regle")` — c'est ce qui faisait tenir ce chemin-là
    // pendant que celui de la fiche était cassé. Ce test le verrouille.
    render(
      <StoreProvider>
        <Monte
          patch={{
            dept: "41",
            deptChosen: true,
            screen: "regle",
            prise: { sp: "brochet", step: "maille" },
          }}
          ecran={<Regle />}
        />
      </StoreProvider>,
    );

    const page = document.body.textContent ?? "";
    expect(page).toMatch(/Maille Brochet/);
    expect(page).toMatch(/60 cm/);
  });

  it("sans aucune espèce, elle reste une règle et n'invente pas de maille", () => {
    render(
      <StoreProvider>
        <Monte patch={{ dept: "41", deptChosen: true, screen: "regle" }} ecran={<Regle />} />
      </StoreProvider>,
    );

    // L'écran doit rester utile — c'est une règle graduée, elle mesure des
    // centimètres avec ou sans espèce. Ce qui doit disparaître, c'est le trait
    // pointillé et son étiquette, pas l'outil.
    expect(screen.getByText(/Posez le poisson contre l'écran/)).toBeDefined();
    expect(document.body.textContent ?? "").not.toMatch(/Maille/);
  });
});
