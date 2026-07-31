import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseAnalysePc } from "./analyse-pc";
import { choisirStation } from "./station";

// Charge utile réelle : analyse_pc autour de Blois, code_parametre 1301
// (température de l'eau), telle que l'API la servait le 31/07/2026.
//
// Le défaut visé est le plus grave de l'audit des sources : waterTemp
// interrogeait cette API avec `sort=desc&size=1` sur une boîte entière, et
// prenait ce que l'API voulait bien lui donner. La distance n'avait aucun mot
// à dire — l'API choisissait d'abord, l'app filtrait après.

const brut = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("./__fixtures__/hubeau-analyse-pc-blois.json", import.meta.url)),
    "utf8",
  ),
);

const BLOIS = { lat: 47.586, lon: 1.336 };

describe("parseAnalysePc", () => {
  it("rend une mesure par analyse, avec sa distance", () => {
    const c = parseAnalysePc(brut, BLOIS.lat, BLOIS.lon);

    expect(c.length).toBe(50);
    expect(c[0]!.dist).toBeGreaterThan(0);
  });

  it("la première réponse de l'API n'est pas la plus proche", () => {
    // C'est tout le problème. `size=1` rendait LA CISSE A AVERDON à 8,9 km,
    // alors que MEES à CHAUSSEE-SAINT-VICTOR est à 3,4 km.
    const c = parseAnalysePc(brut, BLOIS.lat, BLOIS.lon);
    const plusProche = [...c].sort((a, b) => a.dist - b.dist)[0]!;

    expect(c[0]!.station).toContain("CISSE A AVERDON");
    expect(plusProche.station).toContain("CHAUSSEE-SAINT-VICTOR");
    expect(plusProche.dist).toBeLessThan(c[0]!.dist);
  });

  it("laissée à choisirStation, la station retenue devient la plus proche", () => {
    const c = parseAnalysePc(brut, BLOIS.lat, BLOIS.lon);
    // Une date de la même campagne, pour que la fraîcheur ne départage pas.
    const choisie = choisirStation(c, "temperature", new Date("2026-03-05").getTime());

    expect(choisie?.station).toContain("CHAUSSEE-SAINT-VICTOR");
  });

  it("n'invente pas de cours d'eau : analyse_pc n'en publie aucun", () => {
    // Les 67 champs de cette API ont été listés le 31/07/2026 : ni
    // libelle_cours_eau, ni code_cours_eau. Le nom de station l'embarque
    // parfois en texte libre, mais l'en extraire serait deviner.
    const c = parseAnalysePc(brut, BLOIS.lat, BLOIS.lon);

    expect(c.every((x) => x.cours === "")).toBe(true);
    expect(c.every((x) => x.coursCode === undefined)).toBe(true);
  });

  it("écarte une analyse sans résultat plutôt que de la compter pour zéro", () => {
    const c = parseAnalysePc(
      { data: [{ resultat: null, date_prelevement: "2026-03-02", latitude: 47.6, longitude: 1.3 }] },
      BLOIS.lat,
      BLOIS.lon,
    );

    expect(c).toEqual([]);
  });

  it("garde une analyse sans coordonnées, mais sans lui prêter une distance", () => {
    // Sans position, on ne peut pas dire qu'elle est proche — ni le contraire.
    // NaN la fait écarter par choisirStation, ce qui est la bonne réponse.
    const c = parseAnalysePc(
      { data: [{ resultat: 12, date_prelevement: "2026-03-02", libelle_station: "X" }] },
      BLOIS.lat,
      BLOIS.lon,
    );

    expect(c[0]!.dist).toBeNaN();
    expect(choisirStation(c, "temperature", Date.now())).toBeNull();
  });

  it("relaie le compteur d'enveloppe, pour que l'appelant sache ce qu'il n'a pas vu", () => {
    // 4494 analyses correspondent à la requête, 50 sont revenues. Le nombre
    // n'est pas affiché tel quel, mais le taire empêcherait de jamais le dire.
    expect(brut.count).toBe(4494);
    expect(parseAnalysePc(brut, BLOIS.lat, BLOIS.lon).length).toBe(50);
  });
});
