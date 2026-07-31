// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { readPrefs, writePrefs, DEFAULT_PREFS } from "./prefs";

// The department drives which arrêté préfectoral the app applies. It was hard
// -coded to "41" and never written anywhere, so every cold start silently put
// an Indre angler back on Loir-et-Cher rules — where the salmonid quota reads
// "6 truites/jour" instead of "6 salmonidés dont 2 fario max", i.e. MORE
// permissive than their actual law.
//
// localStorage rather than IndexedDB on purpose: dept and bigUI decide the
// first render, and an async read would flash the wrong department.

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("readPrefs", () => {
  it("retombe sur le Loir-et-Cher quand rien n'a jamais été enregistré", () => {
    expect(readPrefs()).toEqual(DEFAULT_PREFS);
  });

  it("relit ce qui a été écrit", () => {
    writePrefs({ dept: "36", deptChosen: true, bigUI: true });

    expect(readPrefs()).toEqual({ dept: "36", deptChosen: true, bigUI: true });
  });

  it("ne retient pas « choisi » pour un département rejeté", () => {
    localStorage.setItem("carnet:prefs", JSON.stringify({ dept: "75", deptChosen: true }));

    // Otherwise the app would silently apply Loir-et-Cher while claiming the
    // user had confirmed it, and the warning would never show.
    expect(readPrefs()).toMatchObject({ dept: "41", deptChosen: false });
  });

  it("refuse un département hors des trois couverts", () => {
    localStorage.setItem("carnet:prefs", JSON.stringify({ dept: "75", bigUI: false }));

    // Trusting it would show a réglementation that does not exist in the app.
    expect(readPrefs().dept).toBe("41");
  });

  it("survit à un contenu corrompu sans lever", () => {
    localStorage.setItem("carnet:prefs", "{pas du json");

    expect(readPrefs()).toEqual(DEFAULT_PREFS);
  });

  it("reprend le mode gants de l'ancienne clé isolée", () => {
    // Users already have `bigUI: "1"` from the previous scheme. Losing it on
    // deploy would silently shrink every control of anyone using gloves.
    localStorage.setItem("bigUI", "1");

    expect(readPrefs().bigUI).toBe(true);
  });

  it("ne lève pas quand localStorage est indisponible (navigation privée)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => readPrefs()).not.toThrow();
    expect(readPrefs()).toEqual(DEFAULT_PREFS);
  });
});

describe("writePrefs", () => {
  it("ne lève pas quand l'écriture est refusée", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => writePrefs({ dept: "23", deptChosen: true, bigUI: false })).not.toThrow();
  });
});
