import { describe, it, expect } from "vitest";
import { choisirStation, cleCours, DIST_MAX, DIST_MAX_MEME_COURS } from "./station";

// Troisième critère, après la distance et la fraîcheur : le même cours d'eau.
//
// Cas mesuré depuis Blois : CHER à Saint-Aignan (35,2 km, autre rivière) contre
// LOIRE à Muides (17,2 km, la bonne). Les deux sortent de la portée de 15 km et
// la tuile dit « pas de mesure » — correct, mais Muides est sur la Loire, et
// l'eau circule le long d'un cours bien mieux qu'elle ne traverse un bassin.
//
// Le rattachement se fait sur le CODE du cours d'eau, pas sur le libellé :
// comparer « LA CISSE A AVERDON » à « la Loire » par chaînes ne marcherait pas.
//
// Mais tous les réseaux Hub'Eau ne codent pas dans le même référentiel, mesuré
// le 31/07/2026 sur la boîte de Blois :
//   temperature/station        code ----0000  uri .../CoursEau_Carthage2017/…
//   qualite_rivieres/station_pc code ----0000  uri .../CoursEau_Carthage2017/…
//   hydrometrie/referentiel     code K4464001  uri .../CEA/…
// Deux codes égaux venant de référentiels différents ne désignent pas le même
// cours d'eau. cleCours() préfixe donc le code par son référentiel, pour qu'un
// rapprochement entre namespaces soit impossible plutôt que discret.

const AUJ = new Date("2026-07-31T10:00:00Z").getTime();
const HIER = "2026-07-30T10:00:00Z";

describe("choisirStation — critère du même cours d'eau", () => {
  it("sans cours d'eau de référence, rien ne change", () => {
    const loin = { dist: 17.2, date: HIER, coursCode: "----0000" };
    const proche = { dist: 3.4, date: HIER, coursCode: "K123" };

    expect(choisirStation([loin, proche], "temperature", AUJ)).toBe(proche);
  });

  it("accepte le bon cours d'eau au-delà de la portée ordinaire", () => {
    // 17,2 km : hors des 15 km de DIST_MAX.temperature, dans les
    // DIST_MAX_MEME_COURS.temperature accordés au même cours.
    const muides = { dist: 17.2, date: HIER, coursCode: "----0000" };

    expect(choisirStation([muides], "temperature", AUJ, "----0000")).toBe(muides);
    expect(choisirStation([muides], "temperature", AUJ)).toBeNull();
  });

  it("préfère le bon cours d'eau à une station plus proche sur un autre", () => {
    const cher = { dist: 4, date: HIER, coursCode: "K999" };
    const loire = { dist: 12, date: HIER, coursCode: "----0000" };

    expect(choisirStation([cher, loire], "temperature", AUJ, "----0000")).toBe(loire);
  });

  it("entre deux stations du bon cours d'eau, la plus proche gagne", () => {
    const proche = { dist: 6, date: HIER, coursCode: "----0000" };
    const loin = { dist: 14, date: HIER, coursCode: "----0000" };

    expect(choisirStation([loin, proche], "temperature", AUJ, "----0000")).toBe(proche);
  });

  it("un cours d'eau inconnu n'est pas un autre cours d'eau", () => {
    // Le réseau ne publie pas toujours le rattachement. Écarter ces stations
    // comme « pas la bonne rivière » ferait dire à la source qu'elle a répondu
    // « non » là où elle n'a rien dit.
    const sansCode = { dist: 5, date: HIER };
    const autre = { dist: 6, date: HIER, coursCode: "K999" };

    expect(choisirStation([sansCode, autre], "temperature", AUJ, "----0000")).toBe(sansCode);
  });

  it("se rabat sur la règle ordinaire quand le bon cours d'eau n'a aucune station", () => {
    const autre = { dist: 6, date: HIER, coursCode: "K999" };

    expect(choisirStation([autre], "temperature", AUJ, "----0000")).toBe(autre);
  });

  it("ne va pas chercher le bon cours d'eau à l'autre bout du bassin", () => {
    const tresLoin = { dist: DIST_MAX_MEME_COURS.temperature + 1, date: HIER, coursCode: "----0000" };

    expect(choisirStation([tresLoin], "temperature", AUJ, "----0000")).toBeNull();
  });

  it("la fraîcheur filtre encore à l'intérieur du bon cours d'eau", () => {
    const perimee = { dist: 4, date: "2020-01-01T10:00:00Z", coursCode: "----0000" };
    const fraiche = { dist: 12, date: HIER, coursCode: "----0000" };

    expect(choisirStation([perimee, fraiche], "temperature", AUJ, "----0000")).toBe(fraiche);
  });

  it("chaque grandeur garde une portée « même cours » au moins égale à l'ordinaire", () => {
    for (const g of Object.keys(DIST_MAX) as (keyof typeof DIST_MAX)[]) {
      expect(DIST_MAX_MEME_COURS[g]).toBeGreaterThanOrEqual(DIST_MAX[g]);
    }
  });
});

describe("cleCours", () => {
  it("préfixe le code par son référentiel, tel que l'URI le nomme", () => {
    expect(cleCours("----0000", "https://id.eaufrance.fr/CoursEau_Carthage2017/----0000")).toBe(
      "CoursEau_Carthage2017:----0000",
    );
  });

  it("distingue deux référentiels — un code égal n'y désigne pas le même cours", () => {
    const carthage = cleCours("K4464001", "https://id.eaufrance.fr/CoursEau_Carthage2017/K4464001");
    const cea = cleCours("K4464001", "http://id.eaufrance.fr/CEA/K4464001");

    expect(carthage).not.toBe(cea);
  });

  it("sans code, il n'y a pas de clé — et surtout pas une clé vide qui s'égalerait", () => {
    expect(cleCours(null, "http://id.eaufrance.fr/CEA/K4464001")).toBeUndefined();
    expect(cleCours("", null)).toBeUndefined();
  });

  it("sans URI, garde le code sous un référentiel nommé inconnu", () => {
    // Deux codes égaux de référentiel inconnu se rapprocheront : c'est assumé,
    // ils viennent alors du même appel donc du même réseau.
    expect(cleCours("K4464001", null)).toBe("?:K4464001");
  });
});
