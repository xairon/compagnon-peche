// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoreProvider } from "../store";
import type { PriseStep, Store } from "../store";
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
    set({ dept, deptChosen: true, priseSp: spId, priseStep: "maille" });
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

/**
 * Le défaut le plus grave du parcours : l'écran demandait la taille, la
 * stockait pour le carnet, et laissait « Oui, elle fait la maille » en gros
 * bouton principal — même avec 45 cm saisis sous une maille de 60. La logique
 * pure est couverte dans lib/prise.test.ts ; ce test existe parce que le champ
 * de saisie et le verdict vivent dans deux endroits différents de cet écran, et
 * que rien ne les reliait.
 */
describe("Prise — la taille saisie change le verdict à l'écran", () => {
  it("45 cm sous une maille de 60 : le bouton « elle fait la maille » disparaît", async () => {
    const user = userEvent.setup();
    renderAtMaille("brochet", "41");
    await screen.findByText(/Mesure-t-elle au moins 60 cm/);

    await user.type(screen.getByPlaceholderText("≥ 60 cm"), "45");

    expect(screen.queryByText(/Oui, elle fait la maille/)).not.toBeInTheDocument();
    expect(screen.getByText(/Je relâche/)).toBeInTheDocument();
  });

  it("45 cm sous une maille de 60 : la bannière rouge s'affiche", async () => {
    const user = userEvent.setup();
    renderAtMaille("brochet", "41");
    await screen.findByText(/Mesure-t-elle au moins 60 cm/);

    await user.type(screen.getByPlaceholderText("≥ 60 cm"), "45");

    expect(screen.getByText(/SOUS LA MAILLE/)).toBeInTheDocument();
  });

  it("62 cm au-dessus de 60 : la maille est confirmée et le parcours continue", async () => {
    const user = userEvent.setup();
    renderAtMaille("brochet", "41");
    await screen.findByText(/Mesure-t-elle au moins 60 cm/);

    await user.type(screen.getByPlaceholderText("≥ 60 cm"), "62");

    expect(screen.getByText(/MAILLE ATTEINTE/)).toBeInTheDocument();
    expect(screen.getByText(/Continuer — vérifier le quota/)).toBeInTheDocument();
  });

  it("effacer la taille ramène la question, sans verdict inventé", async () => {
    const user = userEvent.setup();
    renderAtMaille("brochet", "41");
    const champ = await screen.findByPlaceholderText("≥ 60 cm");

    await user.type(champ, "45");
    expect(screen.getByText(/SOUS LA MAILLE/)).toBeInTheDocument();

    await user.clear(champ);

    // Troisième état : rien de mesuré, donc rien d'affirmé.
    expect(screen.getByText(/Mesure-t-elle au moins 60 cm/)).toBeInTheDocument();
    expect(screen.queryByText(/SOUS LA MAILLE/)).not.toBeInTheDocument();
    expect(screen.getByText(/Oui, elle fait la maille/)).toBeInTheDocument();
  });

  it("le champ reste facultatif : sans saisie, le parcours est inchangé", async () => {
    renderAtMaille("brochet", "41");
    expect(await screen.findByText(/Oui, elle fait la maille/)).toBeInTheDocument();
    expect(screen.queryByText(/SOUS LA MAILLE/)).not.toBeInTheDocument();
    expect(screen.queryByText(/MAILLE ATTEINTE/)).not.toBeInTheDocument();
  });
});

/**
 * Le garde-fou anti-tap accidentel avec des gants : « Je garde » est un
 * HoldButton à maintien, pas un bouton simple. Il a été ajouté exprès et ce lot
 * n'a aucune raison de le défaire — mais il touche aux actions du parcours,
 * donc il doit le prouver.
 */
describe("Prise — « Je garde » reste un bouton à maintien", () => {
  function AtChoix() {
    const { set } = useStore();
    useEffect(() => {
      set({ dept: "41", deptChosen: true, priseSp: "brochet", priseStep: "choix" });
    }, [set]);
    return <Prise />;
  }

  it("l'action de mise à mort demande un maintien, jamais un simple tap", async () => {
    render(
      <StoreProvider>
        <AtChoix />
      </StoreProvider>,
    );
    expect(await screen.findByText(/Je garde — mise à mort propre · maintenez/)).toBeInTheDocument();
  });
});

/**
 * Le lot E a rendu le geste retour d'Android et le « ‹ » de l'app identiques
 * partout — sauf ici. L'étape du parcours n'était pas un champ de contexte de
 * navigation, donc le geste système sautait par-dessus les cinq questions d'un
 * coup, alors que la flèche de l'écran en reculait d'une.
 */
describe("Prise — le geste retour recule d'une étape", () => {
  let flow: Store;
  function Parcours() {
    const s = useStore();
    useEffect(() => {
      flow = s;
    });
    return <Prise />;
  }
  const monter = () =>
    render(
      <StoreProvider>
        <Parcours />
      </StoreProvider>,
    );
  const entrer = (sp: string, step: PriseStep) => {
    act(() => flow.startPrise());
    act(() => flow.set({ dept: "41", deptChosen: true, priseSp: sp, priseStep: step }));
  };

  // Réassigner le hash fait NAVIGUER jsdom : un `popstate` est mis en file et
  // n'arrive qu'au premier `await` du test — c'est-à-dire après les entrées
  // empilées par le parcours. Le provider le prendrait pour un vrai retour et
  // remettrait sa profondeur à zéro. On vide la file avant de monter.
  beforeEach(async () => {
    window.location.hash = "";
    await new Promise((r) => setTimeout(r, 0));
  });

  it("le geste système revient à l'étape précédente, pas à l'écran précédent", async () => {
    monter();
    entrer("brochet", "statut");
    act(() => flow.set({ priseStep: "maille" }));
    expect(await screen.findByText(/étape 2 \/ 6/)).toBeInTheDocument();

    act(() => {
      window.history.back();
    });

    await waitFor(() => expect(screen.getByText(/étape 1 \/ 6/)).toBeInTheDocument());
  });

  it("après un raccourci, il revient au statut et non à « garder ou relâcher »", async () => {
    // Le silure est invasif : le parcours saute de « statut » à la mise à mort,
    // sans jamais offrir le choix. Reconstituer ce chemin à la main s'était déjà
    // trompé une fois — le régime « special », ajouté plus tard, avait été
    // oublié dans la liste des raccourcis, et le « ‹ » d'un saumon relâché
    // proposait « Je garde ». L'historique ne peut pas se tromper : il rend
    // l'entrée réellement quittée, pas celle qu'on déduit.
    monter();
    entrer("silure", "statut");
    act(() => flow.set({ priseStep: "kill" }));
    expect(screen.queryByText(/étape/)).not.toBeInTheDocument();

    act(() => {
      window.history.back();
    });

    // « / 4 » et non « / 5 » : le silure n'a ni maille ni quota que l'app puisse
    // opposer, donc son parcours ne compte que statut, choix, l'issue et la
    // saisie. Le compteur suit désormais le parcours réel (lib/prise-etapes).
    await waitFor(() => expect(screen.getByText(/étape 1 \/ 4/)).toBeInTheDocument());
  });

  it("un lien qui nomme une espèce inconnue ramène au choix d'espèce, jamais à une carte vide", async () => {
    // Une étape sans poisson connu ne peut rien afficher : `priseView` rend
    // `null`, et l'écran n'aurait plus ni carte ni liste — un cul-de-sac.
    window.location.hash = "#/prise/nawak/maille";

    monter();

    expect(await screen.findByPlaceholderText(/Quelle est ta prise/)).toBeInTheDocument();
  });

  it("le « ‹ » de l'écran fait exactement la même chose", async () => {
    const user = userEvent.setup();
    monter();
    entrer("brochet", "statut");
    act(() => flow.set({ priseStep: "maille" }));
    await screen.findByText(/étape 2 \/ 6/);

    await user.click(screen.getByLabelText("Étape précédente"));

    await waitFor(() => expect(screen.getByText(/étape 1 \/ 6/)).toBeInTheDocument());
  });
});
