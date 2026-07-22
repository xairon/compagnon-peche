import type { Catch, Species } from "../types";

/** Accent-insensitive normalization for the species search. */
export function norm(t: string): string {
  return (t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function ratingFg(cls: Species["ratingCls"]): string {
  return cls === "good" ? "#1D6E42" : cls === "warn" ? "#9A6A12" : "#B33A2E";
}

/** Everyday object whose length matches the fish, for a quick on-screen check. */
export function repere(cm: number): string {
  if (cm <= 10) return "une carte bancaire (8,6 cm)";
  if (cm <= 25) return "la longueur d'une main adulte (~19 cm)";
  if (cm <= 32) return "une feuille A4 (29,7 cm)";
  if (cm <= 45) return "un avant-bras, poing fermé (~40 cm)";
  return "du bout des doigts au coude (~50 cm)";
}

// Predators counted against the R436-21 daily limit (3/day, dont 2 brochets).
// Includes both black-bass species (largemouth + smallmouth) and the brochet
// aquitain: R436-18/21 use the vernacular "brochet"/"black-bass" with no
// scientific name, so Esox aquitanicus is a "brochet" for size (0,50 m) and
// quota (verified against Légifrance). This is the SINGLE source of truth — do
// NOT use the taxonomic `group === "carnassiers"` (it wrongly adds perche,
// grémille, aspe, which R436-21 does not cover).
export const QUOTA_CARNASSIERS = [
  "sandre",
  "brochet",
  "brochet-aquitain",
  "black-bass",
  "black-bass-petite-bouche",
];

// Of those, the ones that are a "brochet" for the 2-brochets-max sub-limit.
export const QUOTA_BROCHETS = ["brochet", "brochet-aquitain"];

/** Local YYYY-MM-DD (the quota day rolls over at local midnight, not UTC). */
export function isoDay(d: Date = new Date()): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

/** Kept carnassiers logged today, for the R436-21 daily quota (3, dont 2 brochets). */
export function quotaToday(catches: Catch[], now: Date = new Date()): { c: number; b: number } {
  const t = isoDay(now);
  let c = 0;
  let b = 0;
  for (const x of catches) {
    if (x.iso === t && x.kept && QUOTA_CARNASSIERS.includes(x.spid)) {
      c++;
      if (QUOTA_BROCHETS.includes(x.spid)) b++;
    }
  }
  return { c, b };
}

export function frDate(d: Date = new Date()): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

/** Part of the day for a "HH:MM" time — used by the catch detail and insights. */
export const DAY_PARTS = ["Nuit", "Aube", "Matin", "Midi", "Après-midi", "Soir"] as const;
export type DayPart = (typeof DAY_PARTS)[number];
export function dayPart(hhmm: string | undefined): DayPart | null {
  if (!hhmm) return null;
  const h = parseInt(hhmm.split(":")[0]);
  if (isNaN(h)) return null;
  if (h < 5 || h >= 22) return "Nuit";
  if (h < 7) return "Aube";
  if (h < 11) return "Matin";
  if (h < 14) return "Midi";
  if (h < 18) return "Après-midi";
  return "Soir";
}

/** Collision-free local id (crypto.randomUUID, with a fallback). */
export function uid(prefix = ""): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  const r = c && c.randomUUID ? c.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  return prefix + r;
}
