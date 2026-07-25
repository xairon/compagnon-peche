import { describe, it, expect } from "vitest";
import { upcomingSeasonReminders, REMINDER_WINDOW_DAYS } from "./season-reminders";

describe("upcomingSeasonReminders — 1ʳᵉ catégorie (truite & salmonidés)", () => {
  it("ouverture within the default window (2026: 14 mars)", () => {
    const now = new Date(2026, 2, 7); // 7 days before
    const evts = upcomingSeasonReminders(now);
    const cat1 = evts.find((e) => e.rule === "cat1");
    expect(cat1).toBeTruthy();
    expect(cat1!.kind).toBe("ouverture");
    expect(cat1!.inDays).toBe(7);
    expect(cat1!.date.toDateString()).toBe(new Date(2026, 2, 14).toDateString());
  });

  it("fermeture within the default window (2026: 20 septembre)", () => {
    const now = new Date(2026, 8, 15); // 5 days before the last open day
    const evts = upcomingSeasonReminders(now);
    const cat1 = evts.find((e) => e.rule === "cat1");
    expect(cat1).toBeTruthy();
    expect(cat1!.kind).toBe("fermeture");
    expect(cat1!.inDays).toBe(5);
    expect(cat1!.date.toDateString()).toBe(new Date(2026, 8, 20).toDateString());
  });

  it("nothing reported when the transition falls outside the window", () => {
    const now = new Date(2026, 2, 6); // 8 days before the 14 mars opening — 1 day outside window
    const evts = upcomingSeasonReminders(now);
    expect(evts.find((e) => e.rule === "cat1")).toBeUndefined();
  });

  it("nothing reported deep in a stable open period", () => {
    const now = new Date(2026, 5, 1); // June — well inside the open period
    const evts = upcomingSeasonReminders(now);
    expect(evts.find((e) => e.rule === "cat1")).toBeUndefined();
  });
});

describe("upcomingSeasonReminders — brochet", () => {
  it("fermeture within the window (2026: dernier jour ouvert 25 janvier)", () => {
    const now = new Date(2026, 0, 20); // 5 days before
    const evts = upcomingSeasonReminders(now);
    const pike = evts.find((e) => e.rule === "brochet");
    expect(pike).toBeTruthy();
    expect(pike!.kind).toBe("fermeture");
    expect(pike!.inDays).toBe(5);
    expect(pike!.date.toDateString()).toBe(new Date(2026, 0, 25).toDateString());
  });

  it("ouverture within the window (2026: 25 avril)", () => {
    const now = new Date(2026, 3, 20); // 5 days before
    const evts = upcomingSeasonReminders(now);
    const pike = evts.find((e) => e.rule === "brochet");
    expect(pike).toBeTruthy();
    expect(pike!.kind).toBe("ouverture");
    expect(pike!.inDays).toBe(5);
    expect(pike!.date.toDateString()).toBe(new Date(2026, 3, 25).toDateString());
  });
});

describe("upcomingSeasonReminders — several rules, custom window", () => {
  it("returns every rule whose transition falls in the window, soonest first", () => {
    const now = new Date(2026, 0, 1); // 1 janvier 2026
    const evts = upcomingSeasonReminders(now, 100);
    // brochet fermeture (25 janvier, dans 24 j) puis cat1 ouverture (14 mars, dans 72 j).
    expect(evts.map((e) => e.rule)).toEqual(["brochet", "cat1"]);
    expect(evts[0].inDays).toBe(24);
    expect(evts[0].kind).toBe("fermeture");
    expect(evts[1].inDays).toBe(72);
    expect(evts[1].kind).toBe("ouverture");
  });

  it("REMINDER_WINDOW_DAYS is the default used when no window is passed", () => {
    expect(REMINDER_WINDOW_DAYS).toBeGreaterThan(0);
    const now = new Date(2026, 2, 7); // exactly REMINDER_WINDOW_DAYS before 14 mars, only if it's 7
    const withDefault = upcomingSeasonReminders(now);
    const withExplicit = upcomingSeasonReminders(now, REMINDER_WINDOW_DAYS);
    expect(withDefault).toEqual(withExplicit);
  });
});
