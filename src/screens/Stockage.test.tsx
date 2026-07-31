// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Le lot F a rendu `exportData` capable de survivre à une base illisible : il
 * écrit ce qu'il a pu lire, marque le fichier « INCOMPLET » et rend
 * `{ complet, lecturesEchouees }`. L'écran, lui, jetait cette réponse et
 * affichait « ✓ Sauvegarde téléchargée » dans tous les cas.
 *
 * C'est le pire moment pour mentir : quand une lecture échoue, l'app suspend
 * les écritures et dit justement « exportez une sauvegarde ». L'utilisateur
 * repart alors avec un fichier amputé en croyant son carnet à l'abri.
 *
 * idb-keyval est simulé par une Map, comme dans lib/storage-backup.test.ts :
 * l'export réel est traversé de bout en bout, seule la base est feinte.
 */
const { store, illisibles } = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  illisibles: new Set<string>(),
}));
vi.mock("idb-keyval", () => ({
  get: vi.fn(async (k: string) => {
    if (illisibles.has(k)) throw new DOMException("Internal error", "UnknownError");
    return store.get(k);
  }),
  set: vi.fn(async (k: string, v: unknown) => void store.set(k, v)),
  del: vi.fn(async (k: string) => void store.delete(k)),
  keys: vi.fn(async () => [...store.keys()]),
  clear: vi.fn(async () => store.clear()),
}));

import { StoreProvider } from "../store";
import { Stockage } from "./Stockage";
import { STORES } from "../lib/stores";

beforeEach(() => {
  store.clear();
  illisibles.clear();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:stub");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  // exportData clique une vraie ancre ; jsdom journalise « Not implemented:
  // navigation » à chaque appel. Rien ici ne dépend du clic lui-même.
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

/** Rend l'écran et clique « Exporter mes données ». */
async function exporter() {
  render(
    <StoreProvider>
      <Stockage />
    </StoreProvider>,
  );
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /Exporter mes données/ }));
}

/** Le compte rendu de l'export, annoncé aux lecteurs d'écran. Les assertions
 *  passent par lui plutôt que par la page : « matériel » et « complète »
 *  figurent déjà dans les notes fixes de l'écran, et une recherche globale
 *  passerait au vert sans que rien n'ait été dit à l'utilisateur. */
function compteRendu() {
  return screen.findByRole("status");
}

describe("Stockage — export amputé", () => {
  it("nomme, en français, les données que l'appareil n'a pas rendues", async () => {
    illisibles.add(STORES.gear);

    await exporter();

    // « gear » est un nom de magasin, pas un mot que l'utilisateur reconnaît.
    expect(await compteRendu()).toHaveTextContent(/matériel/i);
  });

  it("dit que ce fichier ne remplace pas une sauvegarde entière", async () => {
    illisibles.add(STORES.spots);

    await exporter();

    const msg = await compteRendu();
    expect(msg).toHaveTextContent(/spots/i);
    expect(msg).toHaveTextContent(/ne remplace pas une sauvegarde entière/i);
  });

  it("n'annonce jamais une sauvegarde téléchargée sur un export amputé", async () => {
    illisibles.add(STORES.catches);

    await exporter();

    expect(await compteRendu()).toHaveTextContent(/incomplète/i);
    expect(screen.queryByText(/✓ Sauvegarde téléchargée/)).not.toBeInTheDocument();
  });

  // Garde-fou dans l'autre sens : la mise en garde ne doit pas se déclencher
  // sur un export normal, sans quoi elle deviendrait du bruit qu'on n'écoute
  // plus le jour où elle dit vrai.
  it("annonce le succès, et rien d'autre, quand l'export a tout emporté", async () => {
    await exporter();

    expect(await screen.findByText(/✓ Sauvegarde téléchargée/)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
