import { describe, it, expect } from "vitest";
import { GEAR_CARDS } from "./gear-cards";

describe("guide matériel — fiches enrichies", () => {
  it("chaque fiche a un id stable, un résumé et un usage non vides", () => {
    const fautes: string[] = [];
    for (const cards of Object.values(GEAR_CARDS)) {
      for (const c of cards) {
        if (!c.id.trim() || !c.summary.trim() || !c.usage.trim()) fautes.push(c.id || "(sans id)");
      }
    }
    expect(fautes).toEqual([]);
  });

  it("pas de doublon d'id à travers toutes les catégories", () => {
    const ids = Object.values(GEAR_CARDS).flat().map((c) => c.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dup).toEqual([]);
  });
});
