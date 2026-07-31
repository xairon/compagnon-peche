import { describe, it, expect } from "vitest";
import { ondeEtat, ondeTropLoin, ONDE_MAX_DIST_KM, ONDE_CODES } from "./onde";

// ONDE = Observatoire National Des Étiages. Two distinct defects, both found by
// querying the live API rather than by reading the code:
//
// 1. The code table was invented. Nationally, over two campaigns, the API
//    returns: 3 «Assec» (656), 1f «Ecoulement visible faible» (614),
//    1a «acceptable» (444), 2 «non visible» (198), 1 «visible» (24). The app
//    tested "1b" — which does not exist — and never handled "1f", the second
//    most common value, which fell through to a default («—» on the dashboard).
//
// 2. The network deliberately monitors SMALL watercourses at risk of drying:
//    that is its stated purpose. Around Blois the nearest station is 13,2 km
//    away on la Cisse, and the Loire has none at all. 40 % of the department's
//    stations were legitimately in assec on the July campaign. Presenting that
//    as "your flow" turns an exact measurement into a false verdict — which is
//    what the user reported as «assec très souvent».

describe("ondeEtat", () => {
  it("couvre les cinq codes que l'API renvoie réellement", () => {
    for (const code of ONDE_CODES) {
      expect(ondeEtat(code).tone, `code ${code} sans interprétation`).not.toBe("inconnu");
    }
  });

  it("traite l'écoulement faible, deuxième valeur la plus fréquente", () => {
    const e = ondeEtat("1f");

    expect(e.court).toMatch(/faible/i);
    expect(e.tone).toBe("warn");
  });

  it("distingue acceptable de faible, que l'ancienne table confondait", () => {
    expect(ondeEtat("1a").tone).toBe("good");
    expect(ondeEtat("1f").tone).toBe("warn");
  });

  it("marque l'assec comme le seul état vraiment mauvais", () => {
    expect(ondeEtat("3").tone).toBe("bad");
    expect(ondeEtat("3").court).toMatch(/sec/i);
  });

  it("préfère le libellé de l'API quand elle en donne un", () => {
    // Hub'Eau is authoritative on its own vocabulary; our table is a fallback
    // for when `fields=` omits it, not a second opinion.
    expect(ondeEtat("1f", "Ecoulement visible faible").mot).toBe("Ecoulement visible faible");
  });

  it("avoue son ignorance sur un code inconnu, au lieu de deviner", () => {
    const e = ondeEtat("9z");

    expect(e.tone).toBe("inconnu");
    expect(e.court).toBe("—");
  });

  it("ne prétend jamais décrire le cours d'eau du pêcheur", () => {
    // Wording check, deliberately: every label must be readable as "the
    // monitored brook is dry", never as "the water in front of you is dry".
    for (const code of ONDE_CODES) {
      expect(ondeEtat(code).mot.toLowerCase()).not.toMatch(/votre|ici|sur place/);
    }
  });
});

describe("ondeTropLoin", () => {
  it("suit la convention déjà établie pour les stations lointaines", () => {
    // Same threshold and same reasoning as qualiteEau.MAX_DIST_KM: beyond it
    // the app abstains rather than implying a relevance the data lacks.
    expect(ONDE_MAX_DIST_KM).toBe(15);
    expect(ondeTropLoin(3)).toBe(false);
    expect(ondeTropLoin(15)).toBe(false);
    expect(ondeTropLoin(15.1)).toBe(true);
  });

  it("s'abstient quand la distance est inconnue", () => {
    expect(ondeTropLoin(undefined)).toBe(true);
    expect(ondeTropLoin(NaN)).toBe(true);
  });
});
