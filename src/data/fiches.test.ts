import { describe, it, expect } from "vitest";
import { FICHES, withFiche } from "./fiches";
import { BASE_SPECIES } from "./species-base";
import { SPECIES } from "./species";
import type { Species } from "../types";

/**
 * Une fiche n'ajoute QUE du descriptif. Elle ne doit jamais porter une maille,
 * un quota, une période ou un statut : ces valeurs viennent du générateur et
 * des modules de réglementation, et une seconde source pour une donnée légale
 * est exactement la fracture que cette app a mis longtemps à refermer.
 */
const INTERDITS = ["maille", "mailleSub", "quota", "quotaSub", "season", "protected", "invasive", "reg"];

describe("fiches — overlay descriptif", () => {
  it("aucune fiche ne porte de donnée réglementaire", () => {
    const fautes: string[] = [];
    for (const [id, f] of Object.entries(FICHES)) {
      for (const k of Object.keys(f)) {
        if (INTERDITS.includes(k)) fautes.push(`${id}.${k}`);
      }
    }
    expect(fautes).toEqual([]);
  });

  it("chaque fiche vise une espèce existante", () => {
    const ids = new Set(BASE_SPECIES.map((s) => s.id));
    const orphelines = Object.keys(FICHES).filter((id) => !ids.has(id));
    expect(orphelines).toEqual([]);
  });

  it("chaque fiche cite sa source", () => {
    const sans = Object.entries(FICHES)
      .filter(([, f]) => !f.ficheSrc || f.ficheSrc.trim() === "")
      .map(([id]) => id);
    expect(sans).toEqual([]);
  });

  it("une espèce enrichie ne reste pas étiquetée « base »", () => {
    for (const id of Object.keys(FICHES)) {
      const sp = SPECIES.find((s) => s.id === id)!;
      expect(sp.depth, `${id} ne doit plus être « base »`).toBeUndefined();
    }
  });

  it("l'overlay n'écrase jamais la réglementation de l'espèce", () => {
    for (const id of Object.keys(FICHES)) {
      const brut = BASE_SPECIES.find((s) => s.id === id)!;
      const sp = SPECIES.find((s) => s.id === id)!;
      expect(sp.maille).toBe(brut.maille);
      expect(sp.quota).toBe(brut.quota);
      expect(sp.season).toBe(brut.season);
      expect(sp.protected).toBe(brut.protected);
      expect(sp.invasive).toBe(brut.invasive);
    }
  });

  // Espèce synthétique, et non « la première du catalogue qui n'a pas de fiche » :
  // depuis que les 58 espèces « base » sont toutes couvertes, un tel candidat
  // n'existe plus — et le test tombait, alors que c'était une bonne nouvelle.
  it("withFiche laisse intacte une espèce sans overlay", () => {
    const inconnue: Species = {
      id: "espece-sans-fiche",
      name: "Espèce sans fiche",
      latin: "Testus absentis",
      group: "autres",
      maille: "—",
      mailleSub: "pas de maille nationale",
      quota: "—",
      quotaSub: "—",
      season: "toujours",
      depth: "base",
    };
    expect(withFiche(inconnue)).toEqual(inconnue);
  });

  // Le corollaire : plus aucune espèce « base » ne doit rester sans section
  // descriptive. C'est ce test qui dira qu'une régénération en a réintroduit une.
  it("chaque espèce « base » a reçu sa fiche", () => {
    const orphelines = BASE_SPECIES.filter((s) => !FICHES[s.id]).map((s) => s.id);
    expect(orphelines).toEqual([]);
  });

  /**
   * Sept des espèces curatées les plus emblématiques du catalogue — perche,
   * truite fario, carpe, gardon, barbeau, poisson-chat, black-bass — n'avaient
   * historiquement ni `fish`, ni `cook`, ni `bio` : seulement l'identification
   * et la santé. Un pêcheur ouvrant la fiche de la perche n'y trouvait ni où
   * la pêcher, ni comment la cuisiner, ni sa biologie. Ce test fige que ces
   * sept espèces — ordinaires, comestibles, sans raison de rester incomplètes
   * — ont bien les trois sections désormais.
   */
  it("les 7 espèces curatées historiquement incomplètes ont fish, cook et bio", () => {
    const ORDINAIRES = ["perche", "truite-fario", "carpe", "gardon", "barbeau", "poisson-chat", "black-bass"];
    for (const id of ORDINAIRES) {
      const sp = SPECIES.find((s) => s.id === id);
      expect(sp, `${id} doit exister`).toBeDefined();
      expect(sp?.fish, `${id}.fish`).toBeDefined();
      expect(sp?.cook, `${id}.cook`).toBeDefined();
      expect(sp?.bio, `${id}.bio`).toBeDefined();
    }
  });

  it("les confusions citées renvoient à des espèces réelles", () => {
    const noms = new Set(SPECIES.map((s) => s.name.toLowerCase()));
    const inconnues: string[] = [];
    for (const [id, f] of Object.entries(FICHES)) {
      for (const c of f.ident?.conf ?? []) {
        if (!noms.has(c.n.toLowerCase())) inconnues.push(`${id} → ${c.n}`);
      }
    }
    expect(inconnues).toEqual([]);
  });
});
