import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  grouperRivieres,
  surLaRiviere,
  chargerRivieres,
  PORTEE_RIVIERES_KM,
  type StationRiviere,
} from "./rivieres";
import { DIST_MAX_MEME_COURS } from "./station";
import { REFERENTIEL_SANDRE } from "./cours-du-point";

/**
 * De quoi peupler « choisissez votre rivière », et comment on sait que deux
 * codes venus de deux réseaux désignent bien LA MÊME.
 *
 * Mesuré le 01/08/2026 autour de Blois (47,586 / 1,336), boîte de 30 km,
 * champs réduits au strict nécessaire :
 *
 *   qualite_rivieres/station_pc          114 stations   19 162 o
 *   hydrometrie/referentiel/stations      17 stations    3 383 o
 *   ─────────────────────────────────────────────────── 2 requêtes, 22,5 ko
 *
 *   → 51 cours d'eau distincts, dont 6 à moins de 10 km et 11 à moins de 15 :
 *     la Loire 0,1 km · le Cosson 2,0 · les Mées 3,4 · la Cisse 8,1 ·
 *     le Beuvron 8,7 · la Cisse Landaise 10,4 · le Conon 10,6 …
 *
 * LES DEUX RÉSEAUX NE CODENT PAS DANS LE MÊME RÉFÉRENTIEL — c'est l'avertissement
 * de station.cleCours, et il tient : station_pc publie
 * `uri .../CoursEau_Carthage2017/…`, l'hydrométrie `uri .../CEA/…`. cleCours
 * préfixe donc, et `CEA:----0000` ≠ `CoursEau_Carthage2017:----0000`.
 *
 * CE QUI EST MESURÉ, et qui autorise le rapprochement : sur les codes présents
 * dans LES DEUX réseaux, les libellés sont identiques, sans une exception.
 *   · Blois, boîte de 40 km   19 codes communs, 19 libellés identiques
 *   · Blois, boîte de 20 km    4 codes communs,  4 libellés identiques
 *   · Châteauroux, 20 km       7 codes communs,  7 libellés identiques
 *   ──────────────────────────────────────────────────────────────────
 *                             30 codes communs, 30 identiques, 0 désaccord
 *
 * D'où la règle : même code ⇒ même rivière, SAUF si deux libellés non vides se
 * contredisent. Un libellé absent ne contredit rien (« un champ vide n'est pas
 * un non ») ; deux libellés différents, si — et le code est alors éclaté par
 * référentiel plutôt que fusionné au jugé.
 */

const fixture = (n: string) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`./__fixtures__/${n}`, import.meta.url)), "utf8"),
  );

const LAT = 47.586;
const LON = 1.336;
const CARTHAGE = REFERENTIEL_SANDRE; // "CoursEau_Carthage2017"

afterEach(() => vi.unstubAllGlobals());

describe("grouperRivieres", () => {
  const e = (cle: string, nom: string, dist: number): StationRiviere => ({ cle, nom, dist });

  it("réunit les deux référentiels d'une même rivière sous une seule entrée", () => {
    const r = grouperRivieres([
      e(`${CARTHAGE}:----0000`, "la Loire", 15.7),
      e("CEA:----0000", "la Loire", 0.1),
    ]);

    expect(r).toHaveLength(1);
    expect(r[0].nom).toBe("la Loire");
    // Les deux clés, sinon l'hydrométrie ou la thermie resterait sans
    // rattachement selon le référentiel retenu.
    expect(r[0].cles.sort()).toEqual([`${CARTHAGE}:----0000`, "CEA:----0000"].sort());
    // La distance retenue est celle de la station la plus proche.
    expect(r[0].dist).toBeCloseTo(0.1, 3);
  });

  it("ne se laisse pas arrêter par une casse ou une espace de plus", () => {
    const r = grouperRivieres([
      e(`${CARTHAGE}:K4814100`, "la Masse", 4),
      e("CEA:K4814100", "La  Masse ", 6),
    ]);

    expect(r).toHaveLength(1);
    expect(r[0].cles).toHaveLength(2);
  });

  it("fusionne quand un seul des deux réseaux publie un libellé", () => {
    // Cas réel : station_pc publie `K4814100` avec `nom_cours_eau: null`,
    // l'hydrométrie publie « La Masse » pour le même code. Un libellé absent
    // n'est pas un désaccord — sinon le pêcheur qui choisit « La Masse »
    // n'aurait plus de température, faute de rattachement côté physico-chimie.
    const r = grouperRivieres([
      e(`${CARTHAGE}:K4814100`, "", 4),
      e("CEA:K4814100", "La Masse", 6),
    ]);

    expect(r).toHaveLength(1);
    expect(r[0].nom).toBe("La Masse");
    expect(r[0].cles).toHaveLength(2);
  });

  it("ÉCLATE le code quand deux libellés non vides se contredisent", () => {
    // Aucun cas mesuré (0 sur 30), mais un rapprochement au jugé referait
    // exactement le défaut que tout cet écran corrige : afficher une mesure du
    // Cher sous le nom de la Loire.
    const r = grouperRivieres([
      e(`${CARTHAGE}:X1`, "la Loire", 3),
      e("CEA:X1", "le Cher", 9),
    ]);

    expect(r).toHaveLength(2);
    expect(r.map((x) => x.nom).sort()).toEqual(["la Loire", "le Cher"]);
    for (const x of r) expect(x.cles).toHaveLength(1);
  });

  it("écarte un cours d'eau qu'aucune source ne nomme", () => {
    // Il en existe : la boîte de 30 km à Blois en contient un à 9,7 km. Sans
    // libellé, il ne peut pas être proposé — l'écrire « Cours d'eau » serait
    // lui inventer un nom.
    const r = grouperRivieres([e(`${CARTHAGE}:K9999999`, "", 9.7)]);

    expect(r).toEqual([]);
  });

  it("classe les rivières par la station la plus proche", () => {
    const r = grouperRivieres([
      e(`${CARTHAGE}:A`, "le Beuvron", 8.7),
      e(`${CARTHAGE}:B`, "la Loire", 0.1),
      e(`${CARTHAGE}:C`, "le Cosson", 2),
    ]);

    expect(r.map((x) => x.nom)).toEqual(["la Loire", "le Cosson", "le Beuvron"]);
  });

  it("ignore une entrée dont la distance n'est pas un nombre", () => {
    const r = grouperRivieres([e(`${CARTHAGE}:A`, "la Loire", NaN)]);

    expect(r).toEqual([]);
  });
});

describe("surLaRiviere", () => {
  const cles = [`${CARTHAGE}:----0000`, "CEA:----0000"];

  it("garde la station rattachée à l'une des clés de la rivière", () => {
    const gardees = surLaRiviere(
      [{ coursCode: `${CARTHAGE}:----0000`, nom: "LOIRE à MUIDES" }],
      cles,
    );

    expect(gardees).toHaveLength(1);
  });

  it("garde aussi celle rattachée dans L'AUTRE référentiel", () => {
    expect(surLaRiviere([{ coursCode: "CEA:----0000" }], cles)).toHaveLength(1);
  });

  it("écarte une station d'une autre rivière", () => {
    // LE cas fondateur de l'audit : une mesure du Cher présentée comme la
    // température de la Loire.
    expect(surLaRiviere([{ coursCode: `${CARTHAGE}:K4--0150` }], cles)).toEqual([]);
  });

  it("écarte une station sans rattachement publié", () => {
    // Ailleurs dans l'app, « absent » vaut « on ne sait pas » et la station
    // reste dans le lot ordinaire. Ici le pêcheur a NOMMÉ sa rivière :
    // afficher sous ce nom une station dont on ignore le cours d'eau, c'est
    // affirmer ce qu'on ne sait pas.
    expect(surLaRiviere([{ coursCode: undefined }, {}], cles)).toEqual([]);
  });

  it("sans clé, ne garde rien plutôt que tout", () => {
    // Un filtre vide qui laisse tout passer est le pire des deux : l'écran
    // continuerait d'annoncer une rivière choisie.
    expect(surLaRiviere([{ coursCode: `${CARTHAGE}:----0000` }], [])).toEqual([]);
  });
});

describe("chargerRivieres", () => {
  /** Répond aux deux URL par les charges réelles mesurées à Blois. */
  function stub() {
    const appels: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const u = String(input);
        appels.push(u);
        const nom = u.includes("/station_pc")
          ? "hubeau-station-pc-rivieres-blois.json"
          : u.includes("/hydrometrie/referentiel/stations")
            ? "hubeau-hydro-rivieres-blois.json"
            : null;
        if (!nom) throw new Error("URL non prévue : " + u);
        return new Response(JSON.stringify(fixture(nom)), { status: 200 });
      }),
    );
    return appels;
  }

  it("deux requêtes, pas plus", async () => {
    const appels = stub();

    await chargerRivieres(LAT, LON);

    expect(appels).toHaveLength(2);
  });

  it("rend la Loire en tête, avec ses DEUX clés de référentiel", async () => {
    stub();

    const r = await chargerRivieres(LAT, LON);

    expect(r[0].nom).toBe("la Loire");
    expect(r[0].dist).toBeLessThan(1);
    expect(r[0].cles.sort()).toEqual([`${CARTHAGE}:----0000`, "CEA:----0000"].sort());
  });

  it("rend les cours d'eau voisins mesurés, dans l'ordre des distances", async () => {
    stub();

    const r = await chargerRivieres(LAT, LON);

    expect(r.slice(0, 5).map((x) => x.nom)).toEqual([
      "la Loire",
      "le Cosson",
      "les Mées",
      "la Cisse",
      "le Beuvron",
    ]);
  });

  it("demande une boîte assez large pour la portée « même cours d'eau »", async () => {
    stub();

    await chargerRivieres(LAT, LON);

    // Sans ça, une station de LA BONNE rivière acceptée par choisirStation
    // ne serait jamais téléchargée — c'est le défaut que porteePour() a
    // corrigé dans hubeau.ts, et il se reproduirait ici.
    expect(PORTEE_RIVIERES_KM).toBeGreaterThanOrEqual(DIST_MAX_MEME_COURS.temperature);
    expect(PORTEE_RIVIERES_KM).toBeGreaterThanOrEqual(DIST_MAX_MEME_COURS.qualite);
  });

  it("ne lève pas quand une des deux sources tombe, et rend ce que l'autre sait", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const u = String(input);
        if (u.includes("/station_pc"))
          return new Response(JSON.stringify(fixture("hubeau-station-pc-rivieres-blois.json")), {
            status: 200,
          });
        throw new Error("réseau coupé");
      }),
    );

    const r = await chargerRivieres(LAT, LON);

    expect(r.length).toBeGreaterThan(10);
    expect(r[0].nom).toBe("la Loire");
    // Seule la clé Carthage a pu être vue : ne pas inventer l'autre.
    expect(r[0].cles).toEqual([`${CARTHAGE}:----0000`]);
  });

  it("rend une liste vide, et non une erreur, quand les deux sources tombent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("hors-ligne");
      }),
    );

    await expect(chargerRivieres(LAT, LON)).resolves.toEqual([]);
  });
});
