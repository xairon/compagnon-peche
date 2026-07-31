import { describe, it, expect } from "vitest";
import { choisirStation, DIST_MAX } from "./station";
import type { Grandeur } from "./fraicheur";

// Five functions in hubeau.ts shared one selection rule: `if (dist < best.dist)`
// — nothing else. No check that the station still publishes, no distance bound,
// and comments claiming thresholds ("~25 km", "~30 km") that did not exist.
// waterTemp went further and inverted the priority: it sorted by DATE first,
// so a station 35,2 km away in another basin beat one 3,4 km away to gain
// eight days.
//
// The rule this module encodes: distance decides, freshness filters. A reading
// from the right river last week beats a reading from the wrong river today.

const MAINTENANT = new Date("2026-07-31T12:00:00Z").getTime();
const ilYA = (jours: number) => new Date(MAINTENANT - jours * 86_400_000).toISOString();

const st = (nom: string, dist: number, date?: string) => ({ nom, dist, date });

describe("choisirStation", () => {
  it("prend la plus proche quand toutes sont à jour", () => {
    const choix = choisirStation(
      [st("loin", 12, ilYA(1)), st("proche", 2, ilYA(1))],
      "temperature",
      MAINTENANT,
    );

    expect(choix?.nom).toBe("proche");
  });

  it("ne traverse pas un bassin pour gagner quelques jours", () => {
    // The measured case: CHER à SAINT-AIGNAN (35,2 km, autre bassin) was
    // preferred to MEES à CHAUSSEE-SAINT-VICTOR (3,4 km) for being 8 days newer.
    const choix = choisirStation(
      [st("Cher à Saint-Aignan", 35.2, ilYA(2)), st("Mées", 3.4, ilYA(10))],
      "temperature",
      MAINTENANT,
    );

    expect(choix?.nom).toBe("Mées");
  });

  it("écarte une station muette au profit d'une station un peu plus loin", () => {
    // 42 of the 66 "en service" stations of the Indre publish no observation at
    // all; being nearest means nothing if nothing comes out of it.
    const choix = choisirStation(
      [st("muette", 1, ilYA(400)), st("qui émet", 8, ilYA(2))],
      "temperature",
      MAINTENANT,
    );

    expect(choix?.nom).toBe("qui émet");
  });

  it("écarte une station hors de portée, même si c'est la seule fraîche", () => {
    const choix = choisirStation([st("très loin", 90, ilYA(0))], "temperature", MAINTENANT);

    expect(choix).toBeNull();
  });

  it("rend quand même la plus proche quand aucune n'est fraîche", () => {
    // Abstaining entirely would hide the only information there is; the
    // freshness guard downstream shows it dated instead of as current.
    const choix = choisirStation(
      [st("A", 9, ilYA(500)), st("B", 3, ilYA(600))],
      "temperature",
      MAINTENANT,
    );

    expect(choix?.nom).toBe("B");
  });

  it("ignore une station sans coordonnée exploitable", () => {
    const choix = choisirStation(
      [{ nom: "fantôme", dist: NaN, date: ilYA(1) }, st("réelle", 5, ilYA(1))],
      "temperature",
      MAINTENANT,
    );

    expect(choix?.nom).toBe("réelle");
  });

  it("ne rend rien sur une liste vide", () => {
    expect(choisirStation([], "hydro", MAINTENANT)).toBeNull();
  });

  it("porte une portée pour chaque grandeur", () => {
    const grandeurs: Grandeur[] = ["hydro", "temperature", "qualite", "onde", "poisson"];
    for (const g of grandeurs) {
      expect(DIST_MAX[g], `portée manquante pour ${g}`).toBeGreaterThan(0);
    }
  });

  it("est plus tolérante sur la portée là où le réseau est rare", () => {
    // Hydrometry is dense and its value is local; fish surveys are sparse and
    // their answer holds over a reach.
    expect(DIST_MAX.hydro).toBeLessThan(DIST_MAX.poisson);
  });
});
