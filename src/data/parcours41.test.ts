import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PARCOURS41_SNAPSHOT } from "./parcours41-snapshot";

const SOURCE = readFileSync(join(__dirname, "parcours41.ts"), "utf8");

async function neuf() {
  vi.resetModules();
  return await import("./parcours41");
}

describe("chargerParcours41", () => {
  beforeEach(() => vi.resetModules());

  it("rend le snapshot Pilote41 en entier", async () => {
    const { chargerParcours41 } = await neuf();
    const fc = await chargerParcours41();
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features.length).toBe(PARCOURS41_SNAPSHOT.features.length);
    const genres = new Set(fc.features.map((f) => f.properties?.kind));
    expect([...genres].sort()).toEqual(["parcours", "reserve"]);
  });

  it("ne charge le module qu'une fois, même appelée en boucle", async () => {
    const { chargerParcours41 } = await neuf();
    const chargeur = vi.fn(async () => ({ PARCOURS41_SNAPSHOT }));
    const [a, b, c] = await Promise.all([
      chargerParcours41(chargeur),
      chargerParcours41(chargeur),
      chargerParcours41(chargeur),
    ]);
    expect(chargeur).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("après un échec, la fois suivante retente au lieu de resservir l'échec", async () => {
    // Le calque se rallume d'un doigt. Si un chargement raté restait collé,
    // il faudrait relancer l'app pour revoir les parcours — au bord de l'eau,
    // c'est-à-dire au pire moment.
    const { chargerParcours41 } = await neuf();
    const rate = vi.fn(async () => {
      throw new Error("réseau coupé");
    });
    await expect(chargerParcours41(rate)).rejects.toThrow("réseau coupé");
    const ok = vi.fn(async () => ({ PARCOURS41_SNAPSHOT }));
    await expect(chargerParcours41(ok)).resolves.toBe(PARCOURS41_SNAPSHOT);
    expect(ok).toHaveBeenCalledTimes(1);
  });
});

describe("le découpage tient", () => {
  it("le snapshot n'est jamais importé statiquement", () => {
    // C'est TOUT l'intérêt du module : un `import … from "./parcours41-snapshot"`
    // en tête de fichier remettrait les 268 ko dans le chunk de l'appelant et
    // rendrait la fonction décorative.
    expect(SOURCE).not.toMatch(/^\s*import[^(\n]*parcours41-snapshot/m);
    expect(SOURCE).toMatch(/import\(\s*["'].\/parcours41-snapshot["']\s*\)/);
  });
});
