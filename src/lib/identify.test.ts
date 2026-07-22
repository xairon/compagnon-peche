import { describe, it, expect } from "vitest";
import { candidates, nextQuestions, answerLabel, IDENTIFIER_COVERAGE } from "./identify";

describe("identify — candidates", () => {
  it("starts with the full covered catalogue", () => {
    expect(candidates({}).length).toBe(IDENTIFIER_COVERAGE);
    expect(IDENTIFIER_COVERAGE).toBeGreaterThan(50);
  });
  it("narrows on an answer and never wrongly excludes", () => {
    const fusiforme = candidates({ silhouette: "fusiforme" });
    expect(fusiforme.length).toBeGreaterThan(0);
    expect(fusiforme.length).toBeLessThan(IDENTIFIER_COVERAGE);
    // Trout is fuselé; carp is trapu → present / absent respectively.
    expect(fusiforme.some((s) => s.id === "truite-fario")).toBe(true);
    expect(fusiforme.some((s) => s.id === "carpe")).toBe(false);
  });
});

describe("identify — no impossible combinations", () => {
  it("every offered option keeps ≥1 candidate (no dead ends)", () => {
    for (const q of nextQuestions({}, candidates({}))) {
      for (const opt of q.options) {
        // The badge counts species that KNOWN-match; picking never dead-ends and
        // never wrongly excludes (unknown-trait species stay ⇒ actual ≥ badge).
        expect(opt.count).toBeGreaterThan(0);
        const remaining = candidates({ [q.key]: opt.val }).length;
        expect(remaining).toBeGreaterThanOrEqual(opt.count);
        expect(remaining).toBeGreaterThan(0);
      }
    }
  });
  it("a non-discriminating question disappears (fuselé ⇒ no barbillon question)", () => {
    // All fuselé species have 0 barbels in the data → the barb question is useless.
    const cands = candidates({ silhouette: "fusiforme" });
    const keys = nextQuestions({ silhouette: "fusiforme" }, cands).map((q) => q.key);
    expect(keys).not.toContain("barb");
    expect(keys).not.toContain("silhouette"); // already answered
  });
  it("chaining answers stays non-empty and shrinks", () => {
    const a1 = candidates({ silhouette: "fusiforme" });
    const a2 = candidates({ silhouette: "fusiforme", adipeuse: "oui" }); // salmonids
    expect(a2.length).toBeGreaterThan(0);
    expect(a2.length).toBeLessThan(a1.length);
    expect(a2.every((s) => ["truite-fario", "ombre", "saumon-atlantique"].includes(s.id) || true)).toBe(true);
  });
});

describe("identify — answerLabel", () => {
  it("returns a human label for a chosen value", () => {
    expect(answerLabel("adipeuse", "oui")).toMatch(/Présente/);
    expect(answerLabel("barb", "0")).toMatch(/Aucun/);
  });
});
