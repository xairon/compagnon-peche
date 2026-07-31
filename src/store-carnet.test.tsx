// @vitest-environment jsdom
//
// Le parcours central de l'app : le pêcheur saisit une prise, elle atterrit dans
// le carnet, et elle y est encore au prochain lancement. `addCatch` — le geste
// unique de l'écran « Ma prise », celui qu'on fait avec des gants au bord de
// l'eau — n'était appelé par AUCUN test.
//
// Ce fichier ne remplace pas la base par des `vi.fn()` : `idb-keyval` est monté
// sur une Map en mémoire, et TOUT le reste est le vrai code — `store.tsx`,
// `lib/db.ts`, `lib/photos.ts`. Un aller-retour démontage/remontage rejoue donc
// un vrai rechargement de l'app, ce qu'un `expect(saveCatches).toHaveBeenCalled()`
// ne dirait pas : il vérifierait qu'on a appelé notre propre mock.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useEffect } from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { StoreProvider } from "./store";
import type { Store } from "./store";
import { useStore } from "./store-hooks";
import { SPECIES } from "./data/species";
import { STORES } from "./lib/stores";
import { setConditions, clearConditions } from "./lib/conditionsCache";
import type { Catch } from "./types";

// `portail` retient les lectures tant qu'il est fermé : c'est le seul moyen de
// rejouer honnêtement la course « le pêcheur saisit pendant qu'IndexedDB
// charge ». Sans lui, l'hydratation gagne toujours et le test ne prouve rien.
const { base, portail } = vi.hoisted(() => ({
  base: new Map<string, unknown>(),
  portail: { attente: null as Promise<void> | null, ouvrir: () => {} },
}));
vi.mock("idb-keyval", () => ({
  get: vi.fn(async (k: string) => {
    if (portail.attente) await portail.attente;
    return base.get(k);
  }),
  set: vi.fn(async (k: string, v: unknown) => void base.set(k, v)),
  del: vi.fn(async (k: string) => void base.delete(k)),
  keys: vi.fn(async () => [...base.keys()]),
  clear: vi.fn(async () => base.clear()),
}));

function fermerLaBase() {
  portail.attente = new Promise<void>((r) => {
    portail.ouvrir = r;
  });
}
function rouvrirLaBase() {
  const ouvrir = portail.ouvrir;
  portail.attente = null;
  ouvrir();
}

let st: Store;
function Sonde() {
  const s = useStore();
  useEffect(() => {
    st = s;
  });
  return (
    <>
      <span data-testid="ecran">{s.state.screen}</span>
      <span data-testid="onglet">{s.state.tab}</span>
      <span data-testid="hydrate">{String(s.state.hydrated)}</span>
      <span data-testid="justAdded">{String(s.state.justAdded)}</span>
      {/* Le carnet, tel qu'un écran le lirait — une ligne par prise. */}
      <ul data-testid="carnet">
        {s.state.catches.map((c) => (
          <li key={c.slot} data-testid={"prise-" + c.slot}>
            {c.sp} · {c.size} · {c.date} · {c.place} · {c.kept ? "gardée" : "relâchée"}
          </li>
        ))}
      </ul>
    </>
  );
}

/** Monte l'app et attend l'hydratation — avant elle, les écritures sont gelées. */
async function lancer() {
  const vue = render(
    <StoreProvider>
      <Sonde />
    </StoreProvider>,
  );
  await waitFor(() => expect(screen.getByTestId("hydrate")).toHaveTextContent("true"));
  return vue;
}

/** Le contenu réellement écrit dans IndexedDB, tel qu'un relancement le relira. */
const carnetPersiste = () => (base.get(STORES.catches) as Catch[] | undefined) ?? [];

const SANDRE = SPECIES.find((s) => s.id === "sandre")!;
const PERCHE = SPECIES.find((s) => s.id === "perche")!;

beforeEach(() => {
  base.clear();
  portail.attente = null;
  localStorage.clear();
  clearConditions();
  window.location.hash = "";
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("saisir une prise depuis « Ma prise »", () => {
  it("inscrit l'espèce, la taille et la date dans le carnet", async () => {
    await lancer();

    act(() => st.addCatch(SANDRE, true, "52"));

    const [prise] = st.state.catches;
    expect(prise.sp).toBe("Sandre");
    expect(prise.spid).toBe("sandre");
    expect(prise.size).toBe("52 cm");
    expect(prise.n).toBe(52);
    // `iso` est ce qui fait compter la prise dans le quota du jour : une date
    // au mauvais format n'est pas une coquille d'affichage, c'est un quota faux.
    expect(prise.iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(prise.date).not.toBe("");
  });

  it("écrit « — cm » plutôt que « NaN cm » quand la taille n'a pas été mesurée", async () => {
    // Le champ taille est facultatif : sur l'écran, il n'apparaît même pas si
    // l'espèce n'a pas de maille. Un « NaN cm » dans le carnet serait la trace
    // définitive d'une prise que l'app a mal enregistrée.
    await lancer();

    act(() => st.addCatch(PERCHE, false));

    expect(st.state.catches[0].size).toBe("— cm");
    expect(st.state.catches[0].n).toBe(0);
  });

  it("ne fabrique pas de taille à partir d'une saisie qui n'en est pas une", async () => {
    await lancer();

    act(() => st.addCatch(PERCHE, false, "je ne sais pas"));

    expect(st.state.catches[0].size).toBe("— cm");
    expect(Number.isNaN(st.state.catches[0].n)).toBe(false);
  });

  it("retient la décision garder / relâcher — c'est elle qui alimente le quota", async () => {
    await lancer();

    act(() => st.addCatch(SANDRE, true, "52"));
    act(() => st.addCatch(PERCHE, false, "20"));

    expect(st.state.catches.map((c) => c.kept)).toEqual([false, true]);
  });

  it("reprend le lieu que le parcours avait pré-rempli", async () => {
    // `startPrise(place)` est le chemin depuis un spot du carnet : le lieu est
    // déjà connu, et le pêcheur ne doit pas avoir à le retaper avec des gants.
    await lancer();

    act(() => st.startPrise("Étang du Moulin"));
    act(() => st.addCatch(SANDRE, true, "52"));

    expect(st.state.catches[0].place).toBe("Étang du Moulin");
  });

  it("écrit « — » plutôt que rien quand le lieu est inconnu", async () => {
    await lancer();

    act(() => st.addCatch(SANDRE, true, "52"));

    expect(st.state.catches[0].place).toBe("—");
  });

  it("dépose le pêcheur sur le carnet, à la prise qu'il vient d'ajouter", async () => {
    // La confirmation « ajoutée ✓ » se fait sur `justAdded` : sans elle, le
    // geste unique ne laisse aucune trace visible qu'il a marché.
    await lancer();

    act(() => st.addCatch(SANDRE, true, "52"));

    expect(screen.getByTestId("ecran")).toHaveTextContent("carnet");
    expect(screen.getByTestId("onglet")).toHaveTextContent("carnet");
    expect(screen.getByTestId("justAdded")).toHaveTextContent(st.state.catches[0].slot);
  });

  it("referme le parcours pour que le geste suivant reparte de zéro", async () => {
    await lancer();
    act(() => st.startPrise("Étang du Moulin"));
    act(() => st.set((s) => ({ prise: { ...s.prise, sp: "sandre", step: "choix" } })));

    act(() => st.addCatch(SANDRE, true, "52"));

    expect(st.state.prise).toEqual({ sp: null, step: null });
    expect(st.state.formOpen).toBe(false);
  });

  it("donne à chaque prise son propre identifiant, même en rafale", async () => {
    // Deux prises qui partageraient un `slot` seraient indistinguables : en
    // supprimer une supprimerait les deux, et l'export les dédoublonnerait.
    await lancer();

    act(() => st.addCatch(SANDRE, true, "52"));
    act(() => st.addCatch(SANDRE, true, "48"));
    act(() => st.addCatch(PERCHE, false, "20"));

    const slots = st.state.catches.map((c) => c.slot);
    expect(new Set(slots).size).toBe(3);
  });

  it("met la dernière prise en tête du carnet", async () => {
    await lancer();

    act(() => st.addCatch(SANDRE, true, "52"));
    act(() => st.addCatch(PERCHE, false, "20"));

    expect(st.state.catches[0].sp).toBe("Perche");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠  DÉFAUT CONNU, NON CORRIGÉ ICI  ⚠
//
// Les deux tests ci-dessous sont déclarés `it.fails` : ils décrivent ce que
// l'app devrait faire, et le code actuel ne le fait PAS. Ils sont verts tant que
// le défaut est là, et deviennent ROUGES le jour où quelqu'un le corrige — ce
// qui est le signal pour les repasser en `it` normal.
//
// Le défaut : `addCatch` — le geste unique de « Ma prise », de loin le chemin le
// plus emprunté — n'écrit ni `time` ni `conditions`. `CatchEditor` (le
// formulaire complet du carnet, bien plus lent à remplir) écrit les deux.
// Conséquences visibles pour l'utilisateur :
//   · Statistiques.tsx compte les prises par moment de la journée via
//     `dayPart(c.time)` : les prises du geste unique n'y apparaissent jamais,
//     alors que l'horloge était sous la main au moment de la saisie ;
//   · lib/analysePrises ne raisonne que sur les prises portant un instantané de
//     conditions. Un pêcheur qui n'utilise que le geste unique lira
//     indéfiniment « Aucune prise documentée avec ses conditions », sans jamais
//     comprendre ce qu'il faudrait faire pour que ça change.
//
// Non corrigé volontairement : `src/store.tsx` appartient à d'autres lots en
// cours, et une correction ici entrerait en conflit avec eux.
// ─────────────────────────────────────────────────────────────────────────────
describe("DÉFAUT CONNU — le geste unique n'enregistre ni l'heure ni les conditions", () => {
  it.fails("devrait horodater la prise, comme le fait le formulaire du carnet", async () => {
    await lancer();

    act(() => st.addCatch(SANDRE, true, "52"));

    expect(st.state.catches[0].time).toMatch(/^\d{2}:\d{2}$/);
  });

  it.fails("devrait joindre l'instantané de conditions quand il y en a un de frais", async () => {
    // Un instantané frais est en cache : l'Accueil vient de charger la météo et
    // l'hydrométrie, et le pêcheur enchaîne sur « Ma prise ».
    setConditions({ pressure: 1018, pressureTrend: "rising", waterTemp: 21.4 });
    await lancer();

    act(() => st.addCatch(SANDRE, true, "52"));

    expect(st.state.catches[0].conditions).toBeDefined();
  });
});

describe("la prise survit à la fermeture de l'app", () => {
  it("est encore là au lancement suivant", async () => {
    // Le vrai test du carnet hors-ligne : pas « saveCatches a été appelé »,
    // mais « je rouvre l'app et ma prise est là ».
    const premier = await lancer();
    act(() => st.addCatch(SANDRE, true, "52"));
    await waitFor(() => expect(carnetPersiste()).toHaveLength(1));
    premier.unmount();

    await lancer();

    expect(st.state.catches).toHaveLength(1);
    expect(st.state.catches[0].sp).toBe("Sandre");
    expect(st.state.catches[0].size).toBe("52 cm");
  });

  it("n'est pas perdue quand elle est saisie avant la fin du chargement", async () => {
    // Cas réel : l'app est ouverte, IndexedDB met une seconde à rendre le
    // carnet, et le pêcheur saisit pendant ce temps. L'hydratation FUSIONNE au
    // lieu de remplacer — sinon la prise du jour serait écrasée par le carnet
    // d'hier au moment où il arrive.
    base.set(STORES.catches, [
      { slot: "vieux", sp: "Brochet", spid: "brochet", iso: "2026-07-01", size: "70 cm", n: 70, date: "1 juil.", place: "Loire", kept: false },
    ]);
    fermerLaBase();

    render(
      <StoreProvider>
        <Sonde />
      </StoreProvider>,
    );
    await waitFor(() => expect(st).toBeDefined());
    act(() => st.addCatch(SANDRE, true, "52"));
    // La base n'a toujours rien rendu : la saisie est bien ANTÉRIEURE.
    expect(screen.getByTestId("hydrate")).toHaveTextContent("false");
    expect(st.state.catches).toHaveLength(1);

    await act(async () => {
      rouvrirLaBase();
    });

    await waitFor(() => expect(screen.getByTestId("hydrate")).toHaveTextContent("true"));
    expect(st.state.catches.map((c) => c.spid).sort()).toEqual(["brochet", "sandre"]);
  });
});

describe("la prise détaillée du carnet — photo et instantané de conditions", () => {
  // `addCatchFull` est l'autre porte d'entrée : le formulaire complet du carnet
  // (CatchEditor), qui, lui, attache une photo et l'instantané de conditions.
  const complete = (): Catch => ({
    slot: "u_1",
    sp: "Sandre",
    spid: "sandre",
    iso: "2026-07-31",
    time: "07:12",
    size: "52 cm",
    n: 52,
    weight: 1.8,
    date: "31 juil. 2026",
    place: "Loire, Blois",
    photo: "photo:u_1:1700000000000",
    note: "Aube, eau claire",
    kept: true,
    conditions: { pressure: 1018, pressureTrend: "rising", waterTemp: 21.4, moonPhase: 0.3 },
  });

  it("conserve la photo et les conditions jusque dans IndexedDB", async () => {
    // Ces champs sont ce qui distingue une ligne de carnet d'un souvenir : la
    // photo, et les conditions que lib/analysePrises relit pour ses tendances.
    await lancer();

    act(() => st.addCatchFull(complete()));

    await waitFor(() => expect(carnetPersiste()).toHaveLength(1));
    const persistee = carnetPersiste()[0];
    expect(persistee.photo).toBe("photo:u_1:1700000000000");
    expect(persistee.conditions).toEqual({
      pressure: 1018,
      pressureTrend: "rising",
      waterTemp: 21.4,
      moonPhase: 0.3,
    });
    expect(persistee.weight).toBe(1.8);
    expect(persistee.time).toBe("07:12");
  });

  it("efface le cliché avec la prise, pour ne pas laisser un orphelin en base", async () => {
    // Une photo est le plus gros objet que l'app écrive. En laisser une derrière
    // à chaque suppression, c'est du quota consommé que rien ne réclamera plus.
    await lancer();
    base.set("photo:u_1:1700000000000", new Blob(["jpeg"]));
    act(() => st.addCatchFull(complete()));

    act(() => st.removeCatch("u_1"));

    await waitFor(() => expect(base.has("photo:u_1:1700000000000")).toBe(false));
    expect(st.state.catches).toHaveLength(0);
  });

  it("ne retire du carnet que la prise visée", async () => {
    await lancer();
    act(() => st.addCatch(SANDRE, true, "52"));
    const garde = st.state.catches[0].slot;
    act(() => st.addCatch(PERCHE, false, "20"));
    const aSupprimer = st.state.catches[0].slot;

    act(() => st.removeCatch(aSupprimer));

    expect(st.state.catches.map((c) => c.slot)).toEqual([garde]);
  });

  it("retire aussi la confirmation quand c'est la prise qu'elle désignait", async () => {
    // Sinon le carnet garde un « ajoutée ✓ » pointant sur une ligne disparue.
    await lancer();
    act(() => st.addCatch(SANDRE, true, "52"));
    const slot = st.state.catches[0].slot;

    act(() => st.removeCatch(slot));

    expect(st.state.justAdded).toBeNull();
  });

  it("corrige une prise sans toucher aux autres", async () => {
    await lancer();
    act(() => st.addCatch(SANDRE, true, "52"));
    const premier = st.state.catches[0].slot;
    act(() => st.addCatch(PERCHE, false, "20"));

    act(() => st.updateCatch(premier, { size: "55 cm", n: 55 }));

    const corrigee = st.state.catches.find((c) => c.slot === premier)!;
    expect(corrigee.size).toBe("55 cm");
    expect(corrigee.sp).toBe("Sandre"); // le reste de la prise est intact
    expect(st.state.catches.find((c) => c.slot !== premier)!.size).toBe("20 cm");
  });

  it("propage la correction jusqu'au prochain lancement", async () => {
    const premier = await lancer();
    act(() => st.addCatch(SANDRE, true, "52"));
    const slot = st.state.catches[0].slot;
    act(() => st.updateCatch(slot, { size: "55 cm", n: 55 }));
    await waitFor(() => expect(carnetPersiste()[0]?.n).toBe(55));
    premier.unmount();

    await lancer();

    expect(st.state.catches[0].size).toBe("55 cm");
  });
});
