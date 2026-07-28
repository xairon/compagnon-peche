import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { GEAR_CARDS } from "./gear-cards";
import { SPECIES } from "./species";
import { GEAR_MEDIA } from "./media";

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

  it("chaque id de species[] existe réellement dans SPECIES", () => {
    const ids = new Set(SPECIES.map((s) => s.id));
    const fautes: string[] = [];
    for (const cards of Object.values(GEAR_CARDS)) {
      for (const c of cards) {
        for (const spId of c.species ?? []) {
          if (!ids.has(spId)) fautes.push(`${c.id} → ${spId}`);
        }
      }
    }
    expect(fautes).toEqual([]);
  });

  it("chaque id de filIds existe réellement dans GEAR_CARDS.fil", () => {
    const filIds = new Set(GEAR_CARDS.fil.map((f) => f.id));
    const fautes: string[] = [];
    for (const cards of Object.values(GEAR_CARDS)) {
      for (const c of cards) {
        for (const fId of c.filIds ?? []) {
          if (!filIds.has(fId)) fautes.push(`${c.id} → ${fId}`);
        }
      }
    }
    expect(fautes).toEqual([]);
  });

  it("aucune fiche fil ne porte elle-même filIds (jamais de duplication à l'envers)", () => {
    const fautes = GEAR_CARDS.fil.filter((f) => f.filIds && f.filIds.length > 0).map((f) => f.id);
    expect(fautes).toEqual([]);
  });
});

describe("médias matériel — fichiers réellement présents", () => {
  it("chaque photo référencée existe sous public/", () => {
    const manquants = Object.entries(GEAR_MEDIA)
      .filter(([, m]) => !existsSync(join(process.cwd(), "public", m.file)))
      .map(([id, m]) => `${id} → ${m.file}`);
    expect(manquants).toEqual([]);
  });

  it("chaque photo pointe vers une fiche existante", () => {
    const ids = new Set(Object.values(GEAR_CARDS).flat().map((c) => c.id));
    const orphelines = Object.keys(GEAR_MEDIA).filter((id) => !ids.has(id));
    expect(orphelines).toEqual([]);
  });
});
