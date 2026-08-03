// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { StoreProvider } from "../store";
import type { AppState } from "../store";
import { useStore } from "../store-hooks";
import { Carnet } from "./Carnet";
import type { Catch } from "../types";

/**
 * Le bandeau d'arrivée du carnet est le seul endroit où une photo perdue peut
 * encore se dire.
 *
 * L'écran de saisie posait le message puis appelait `goTab` dans la même
 * continuation : démonté avant le paint, le message n'a jamais été lu par
 * personne. Le carnet, lui, est là où le pêcheur atterrit et regarde.
 */

const PRISE: Catch = {
  slot: "p1",
  sp: "Perche",
  spid: "perche",
  iso: "2026-08-02",
  size: "32 cm",
  n: 32,
  date: "02/08/2026",
  place: "—",
  kept: true,
};

function Monte({ patch }: { patch: Partial<AppState> }) {
  const { set } = useStore();
  useEffect(() => {
    set(patch);
  }, [set, patch]);
  return <Carnet />;
}

const monter = (patch: Partial<AppState>) =>
  render(
    <StoreProvider>
      <Monte patch={patch} />
    </StoreProvider>,
  );

beforeEach(async () => {
  localStorage.clear();
  window.location.hash = "";
  await new Promise((r) => setTimeout(r, 0));
});

describe("Carnet — le bandeau d'une prise qui vient d'arriver", () => {
  it("annonce la prise, comme avant", async () => {
    monter({ catches: [PRISE], justAdded: "p1" });
    expect(await screen.findByText(/Prise gardée ajoutée/)).toBeInTheDocument();
  });

  it("dit que la photo n'a pas pu être enregistrée, quand c'est le cas", async () => {
    monter({ catches: [PRISE], justAdded: "p1", photoRatee: true });
    expect(await screen.findByText(/photo n'a pas pu être enregistrée/)).toBeInTheDocument();
  });

  it("et ne le dit pas quand la photo est passée", async () => {
    monter({ catches: [PRISE], justAdded: "p1", photoRatee: false });
    await screen.findByText(/Prise gardée ajoutée/);
    expect(screen.queryByText(/photo n'a pas pu/)).toBeNull();
  });
});
