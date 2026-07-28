import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { KNOTS } from "./knots";
import { ALL_KNOT_STEP_MEDIA } from "./knot-diagrams";

describe("nœuds & montages — cohérence des données", () => {
  it("chaque fiche a au moins 2 étapes", () => {
    const fautes = KNOTS.filter((k) => k.steps.length < 2).map((k) => k.id);
    expect(fautes).toEqual([]);
  });

  it("jamais plus d'illustrations que d'étapes de texte", () => {
    const fautes: string[] = [];
    for (const k of KNOTS) {
      const media = ALL_KNOT_STEP_MEDIA[k.id];
      if (media && media.length > k.steps.length) fautes.push(k.id);
    }
    expect(fautes).toEqual([]);
  });

  it("toute illustration sourcée (pas 'Schéma original') porte une URL source", () => {
    const fautes: string[] = [];
    for (const [id, entries] of Object.entries(ALL_KNOT_STEP_MEDIA)) {
      entries.forEach((e, i) => {
        if (e.license !== "Schéma original" && !e.sourceUrl) fautes.push(`${id}[${i}]`);
      });
    }
    expect(fautes).toEqual([]);
  });
});

describe("médias nœuds — fichiers réellement présents", () => {
  it("chaque fichier référencé existe sous public/", () => {
    const manquants: string[] = [];
    for (const [id, entries] of Object.entries(ALL_KNOT_STEP_MEDIA)) {
      entries.forEach((e, i) => {
        if (!existsSync(join(process.cwd(), "public", e.file))) manquants.push(`${id}[${i}] → ${e.file}`);
      });
    }
    expect(manquants).toEqual([]);
  });
});
