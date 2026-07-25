// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { setConditions, getFreshConditions, clearConditions, MAX_AGE_MS } from "./conditionsCache";

const T0 = 1_700_000_000_000; // instant de référence arbitraire

describe("getFreshConditions — rien en cache", () => {
  beforeEach(() => clearConditions());

  it("rend null si rien n'a jamais été enregistré", () => {
    expect(getFreshConditions(T0)).toBeNull();
  });
});

describe("setConditions / getFreshConditions — mémoire", () => {
  beforeEach(() => clearConditions());

  it("rend la dernière valeur enregistrée quand elle est fraîche", () => {
    setConditions({ pressure: 1013, pressureTrend: "falling" }, T0);
    expect(getFreshConditions(T0)).toEqual({ pressure: 1013, pressureTrend: "falling" });
  });

  it("une nouvelle valeur remplace entièrement l'ancienne (pas de fusion)", () => {
    setConditions({ pressure: 1013, pressureTrend: "falling", waterTemp: 14 }, T0);
    setConditions({ moonPhase: 0.5 }, T0 + 1000);
    expect(getFreshConditions(T0 + 1000)).toEqual({ moonPhase: 0.5 });
  });

  it("pile à la limite de fraîcheur (3h) → encore rendue", () => {
    setConditions({ waterTemp: 12 }, T0);
    expect(getFreshConditions(T0 + MAX_AGE_MS)).toEqual({ waterTemp: 12 });
  });

  it("au-delà de 3h → null, jamais un relevé périmé", () => {
    setConditions({ waterTemp: 12 }, T0);
    expect(getFreshConditions(T0 + MAX_AGE_MS + 1)).toBeNull();
  });

  it("horloge locale décalée dans le passé (now < atMs) → null, pas de fausse confiance", () => {
    setConditions({ waterTemp: 12 }, T0);
    expect(getFreshConditions(T0 - 1000)).toBeNull();
  });
});

describe("persistance — survit à un rechargement (nouvelle instance du module)", () => {
  beforeEach(() => {
    clearConditions();
    localStorage.clear();
  });

  it("une valeur enregistrée est relue par une instance fraîche du module", async () => {
    setConditions({ pressure: 1005, flowTrend: "rising" }, T0);
    vi.resetModules();
    const fresh = await import("./conditionsCache");
    expect(fresh.getFreshConditions(T0)).toEqual({ pressure: 1005, flowTrend: "rising" });
  });

  it("une valeur périmée en localStorage n'est pas relue comme fraîche par une instance fraîche", async () => {
    setConditions({ pressure: 1005 }, T0);
    vi.resetModules();
    const fresh = await import("./conditionsCache");
    expect(fresh.getFreshConditions(T0 + MAX_AGE_MS + 1)).toBeNull();
  });
});
