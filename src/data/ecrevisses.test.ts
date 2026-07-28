import { describe, it, expect } from "vitest";
import { ECREVISSES, PECHABLES, crayfishById, REG_BALANCES, MAILLE_NOTE } from "./ecrevisses";

describe("données écrevisses", () => {
  it("couvre les six espèces attendues", () => {
    expect(ECREVISSES.map((e) => e.id).sort()).toEqual(
      ["americaine", "louisiane", "pattes-blanches", "pattes-grelles", "pattes-rouges", "signal"].sort(),
    );
  });

  it("les identifiants sont uniques", () => {
    expect(new Set(ECREVISSES.map((e) => e.id)).size).toBe(ECREVISSES.length);
  });

  it("exactement trois espèces pêchables", () => {
    expect(PECHABLES.map((e) => e.id).sort()).toEqual(["americaine", "louisiane", "signal"]);
  });

  it("les trois espèces fermées ne sont pas pêchables", () => {
    for (const id of ["pattes-blanches", "pattes-grelles", "pattes-rouges"]) {
      expect(crayfishById(id)?.pechable).toBe(false);
    }
  });

  it("aucune espèce fermée ne fonde l'interdiction de capture sur « espèce protégée »", () => {
    // L'arrêté du 21 juillet 1983 ne protège que l'HABITAT, et pas les pattes
    // grêles. L'interdiction de capture vient de R436-10 + l'arrêté préfectoral
    // qui n'ouvre aucun des dix jours possibles. Dire « espèce protégée » comme
    // motif de fermeture, c'est citer le mauvais texte.
    for (const e of ECREVISSES.filter((x) => !x.pechable)) {
      expect(e.statut, `${e.id}.statut`).toMatch(/R436-10|arrêté préfectoral/i);
    }
  });

  it("chaque espèce porte une identification exploitable", () => {
    for (const e of ECREVISSES) {
      expect(e.ident, `${e.id}.ident`).toBeDefined();
      expect(e.ident!.traits.length, `${e.id}.traits`).toBeGreaterThanOrEqual(2);
      expect(e.ident!.summary.trim(), `${e.id}.summary`).not.toBe("");
    }
  });

  it("les confusions citées nomment une écrevisse réellement présente dans la liste", () => {
    const noms = new Set(ECREVISSES.map((e) => e.name.toLowerCase()));
    const inconnues: string[] = [];
    for (const e of ECREVISSES) {
      for (const c of e.ident?.conf ?? []) {
        if (!noms.has(c.n.toLowerCase())) inconnues.push(`${e.id} → ${c.n}`);
      }
    }
    expect(inconnues).toEqual([]);
  });

  it("les trois confusions décisives sont couvertes", () => {
    const conf = (id: string) => (crayfishById(id)?.ident?.conf ?? []).map((c) => c.n.toLowerCase());
    expect(conf("pattes-blanches")).toContain("écrevisse signal");
    expect(conf("pattes-rouges")).toContain("écrevisse de louisiane");
    expect(conf("pattes-grelles")).toContain("écrevisse à pattes rouges");
  });

  it("chaque espèce pêchable rappelle l'interdiction de remise à l'eau vivante", () => {
    for (const e of PECHABLES) expect(e.note).toMatch(/vivante?/i);
  });

  it("chaque espèce protégée impose la remise à l'eau", () => {
    for (const e of ECREVISSES.filter((x) => !x.pechable)) {
      expect(e.note).toMatch(/remise à l'eau/i);
    }
  });

  it("crayfishById rend undefined pour un id inconnu", () => {
    expect(crayfishById("truite")).toBeUndefined();
  });

  it("le rappel réglementaire cite le plafond de balances et le diamètre", () => {
    const txt = REG_BALANCES.join(" ");
    expect(txt).toMatch(/6 balances/);
    expect(txt).toMatch(/30 cm/);
  });

  it("la maille de 9 cm n'est jamais présentée comme une autorisation", () => {
    expect(MAILLE_NOTE).toMatch(/9 cm/);
    expect(MAILLE_NOTE).toMatch(/ne se pêche pas|fermée/i);
  });
});
