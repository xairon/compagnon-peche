// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StoreProvider } from "../store";
import { Credits } from "./Credits";
import { MEDIA_BY_KIND } from "../components/media-helpers";

// The screen promises, in so many words, "Merci à leurs auteurs" — and CC BY /
// CC BY-SA make attribution a condition of redistribution, not a courtesy.
// Recipe and technique photos ship in the app and were displayed on three
// screens without ever appearing here.
//
// This test iterates the media registry rather than a hand-written list, so it
// fails the day a new kind of image is embedded and left uncredited.

/** Every media entry the app can display, flattened to {kind, id, author}. */
function allMedia() {
  const out: { kind: string; id: string; author: string; license: string }[] = [];
  for (const [kind, table] of Object.entries(MEDIA_BY_KIND)) {
    for (const [id, v] of Object.entries(table)) {
      for (const m of Array.isArray(v) ? v : [v]) {
        out.push({ kind, id, author: m.author, license: m.license });
      }
    }
  }
  return out;
}

describe("Crédits photos", () => {
  it("crédite l'auteur de chaque image embarquée", () => {
    render(
      <StoreProvider>
        <Credits />
      </StoreProvider>,
    );
    const page = document.body.textContent ?? "";

    for (const m of allMedia()) {
      expect(page, `${m.kind}/${m.id} — « ${m.author} » n'est crédité nulle part`).toContain(
        m.author,
      );
    }
  });

  it("renvoie vers le texte de la licence, comme les licences CC l'exigent", () => {
    render(
      <StoreProvider>
        <Credits />
      </StoreProvider>,
    );

    // "CC BY-SA 4.0" as bare text does not tell the reader what they may do.
    const liens = screen.getAllByRole("link").map((a) => a.getAttribute("href") ?? "");
    expect(liens.some((h) => h.includes("creativecommons.org"))).toBe(true);
  });
});

describe("registre des médias", () => {
  it("ne référence aucune espèce qui n'existe pas", async () => {
    const { SPECIES } = await import("../data/species");
    const { NAME_TO_ID } = await import("../components/media-helpers");
    const known = new Set([...SPECIES.map((s) => s.id), ...Object.values(NAME_TO_ID)]);

    for (const id of Object.keys(MEDIA_BY_KIND.species)) {
      // An orphan key renders its raw slug where a species name belongs.
      expect(known.has(id), `SPECIES_MEDIA["${id}"] ne correspond à aucune espèce`).toBe(true);
    }
  });
});
