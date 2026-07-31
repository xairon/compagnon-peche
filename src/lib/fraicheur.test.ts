import { describe, it, expect } from "vitest";
import { AGE_MAX, fraicheur, type Grandeur } from "./fraicheur";
import { ago } from "./geo";

// The audit of the data sources found the same omission in five of them: a
// measurement is displayed as the current state without its age being allowed
// to disqualify it. Verified on the live APIs from Blois on 2026-07-31:
//   · débit de la Loire     → dernier relevé 2026-07-21   (10 jours)
//   · température de l'eau  → 2024-08-17, 22,6 °C         (plus de 11 mois)
//   · qualité physico-chim. → 2006-12-05, « très bonne »  (près de 20 ans)
//   · pêche scientifique    → 2004-06-21                  (22 ans)
// None of these is detectable by the reader: 22 °C in July is plausible, and
// "très bonne" carries no date at all.

const MAINTENANT = new Date("2026-07-31T12:00:00Z").getTime();
const ilYA = (jours: number) => new Date(MAINTENANT - jours * 86_400_000).toISOString();

describe("fraicheur", () => {
  it("accepte une mesure récente", () => {
    expect(fraicheur(ilYA(0), "hydro", MAINTENANT).perime).toBe(false);
  });

  it("écarte un débit de dix jours, qui se présente comme du temps réel", () => {
    // Hydrometry is the only genuinely instantaneous source in the app; a
    // ten-day-old value under a live-looking tile is the worst case.
    expect(fraicheur(ilYA(10), "hydro", MAINTENANT).perime).toBe(true);
  });

  it("laisse vivre une température de trois semaines, pas d'un an", () => {
    // Water temperature moves seasonally: weeks are usable, months are not.
    expect(fraicheur(ilYA(21), "temperature", MAINTENANT).perime).toBe(false);
    expect(fraicheur(ilYA(340), "temperature", MAINTENANT).perime).toBe(true);
  });

  it("écarte une analyse de 2006 présentée comme la qualité de l'eau", () => {
    expect(fraicheur("2006-12-05", "qualite", MAINTENANT).perime).toBe(true);
  });

  it("tolère l'espacement réel des campagnes ONDE", () => {
    // Monthly in summer, dormant in winter: a two-month gap is normal.
    expect(fraicheur(ilYA(45), "onde", MAINTENANT).perime).toBe(false);
    expect(fraicheur(ilYA(300), "onde", MAINTENANT).perime).toBe(true);
  });

  it("traite une date absente comme une absence, jamais comme une mesure fraîche", () => {
    expect(fraicheur(undefined, "hydro", MAINTENANT).perime).toBe(true);
    expect(fraicheur("", "hydro", MAINTENANT).perime).toBe(true);
    expect(fraicheur("n'importe quoi", "hydro", MAINTENANT).perime).toBe(true);
  });

  it("ne déclare pas périmée une mesure datée dans le futur", () => {
    // A device clock set wrong is the clock's problem, not the data's.
    expect(fraicheur(ilYA(-2), "hydro", MAINTENANT).perime).toBe(false);
  });

  it("porte un seuil pour chaque grandeur mesurée", () => {
    const grandeurs: Grandeur[] = ["hydro", "temperature", "qualite", "onde", "poisson"];
    for (const g of grandeurs) {
      expect(AGE_MAX[g], `seuil manquant pour ${g}`).toBeGreaterThan(0);
    }
  });

  it("donne un texte prêt à afficher plutôt qu'une valeur nue", () => {
    const f = fraicheur("2024-08-17", "temperature", MAINTENANT);

    expect(f.perime).toBe(true);
    expect(f.texte).toMatch(/2024/);
  });
});

describe("ago — au-delà de quelques semaines", () => {
  const now = new Date(MAINTENANT);

  it("compte en jours tant que ça reste lisible", () => {
    expect(ago(ilYA(10), now)).toBe("il y a 10 j");
  });

  it("passe aux mois plutôt que d'annoncer « il y a 120 j »", () => {
    expect(ago(ilYA(120), now)).toMatch(/mois/);
  });

  it("passe aux années plutôt que d'annoncer « il y a 714 j »", () => {
    // The real case: a 2024 reading rendered as "il y a 714 j", a number no
    // reader converts into "the summer before last".
    expect(ago(ilYA(714), now)).toMatch(/an/);
    expect(ago(ilYA(714), now)).not.toMatch(/714/);
  });
});
