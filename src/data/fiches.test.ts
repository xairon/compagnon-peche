import { describe, it, expect } from "vitest";
import { FICHES, withFiche } from "./fiches";
import { BASE_SPECIES } from "./species-base";
import { SPECIES } from "./species";

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

  it("withFiche laisse intacte une espèce sans overlay", () => {
    const sans = BASE_SPECIES.find((s) => !FICHES[s.id])!;
    expect(withFiche(sans)).toEqual(sans);
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
