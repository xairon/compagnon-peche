import { describe, it, expect } from "vitest";
import { fishingCardStatus, daysUntilCardExpiry, CARD_WARNING_DAYS } from "./carte-peche";

describe("fishingCardStatus", () => {
  it("no year on file → absente", () => {
    expect(fishingCardStatus(undefined, new Date(2026, 6, 25))).toBe("absente");
  });

  it("current year, well before the warning window → valide", () => {
    expect(fishingCardStatus(2026, new Date(2026, 6, 25))).toBe("valide");
  });

  it("within the warning window before 31 décembre → expire-bientot", () => {
    expect(fishingCardStatus(2026, new Date(2026, 11, 5))).toBe("expire-bientot"); // 26 jours restants
  });

  it("on the last valid day (31 décembre) → still expire-bientot, not périmée", () => {
    expect(fishingCardStatus(2026, new Date(2026, 11, 31, 23, 0))).toBe("expire-bientot");
  });

  it("the day after (1er janvier suivant) → périmée", () => {
    expect(fishingCardStatus(2026, new Date(2027, 0, 1))).toBe("perimee");
  });

  it("several years stale → périmée", () => {
    expect(fishingCardStatus(2023, new Date(2026, 6, 25))).toBe("perimee");
  });

  it(`boundary: exactly ${0} days short of the window edge → expire-bientot`, () => {
    // 31 décembre 2026 moins CARD_WARNING_DAYS jours.
    const edge = new Date(2026, 11, 31);
    edge.setDate(edge.getDate() - CARD_WARNING_DAYS);
    expect(fishingCardStatus(2026, edge)).toBe("expire-bientot");
  });

  it("boundary: one day earlier than the window edge → valide", () => {
    const edge = new Date(2026, 11, 31);
    edge.setDate(edge.getDate() - CARD_WARNING_DAYS - 1);
    expect(fishingCardStatus(2026, edge)).toBe("valide");
  });

  it("a card bought early for next year, well ahead of its own expiry → valide", () => {
    expect(fishingCardStatus(2027, new Date(2026, 11, 1))).toBe("valide");
  });
});

describe("daysUntilCardExpiry", () => {
  it("counts calendar days down to 31 décembre", () => {
    expect(daysUntilCardExpiry(2026, new Date(2026, 11, 25))).toBe(6);
  });

  it("is 0 on the last valid day, whatever the time of day", () => {
    expect(daysUntilCardExpiry(2026, new Date(2026, 11, 31, 22, 30))).toBe(0);
  });

  it("goes negative once expiry has passed", () => {
    expect(daysUntilCardExpiry(2026, new Date(2027, 0, 3))).toBe(-3);
  });
});
