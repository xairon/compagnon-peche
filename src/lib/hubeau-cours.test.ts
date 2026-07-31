import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { waterTemp, nearestTemp, nearestQuality, coursDesStationsPc } from "./hubeau";
import { REFERENTIEL_SANDRE } from "./cours-du-point";
import { DIST_MAX, DIST_MAX_MEME_COURS } from "./station";

/**
 * Le critère du cours d'eau, réveillé — depuis Blois, sur des charges réelles.
 *
 * Tout est mesuré le 31/07/2026 autour de 47,586 / 1,336 :
 *
 *   thermie (temperature/station)  UNE station dans la boîte :
 *     04051850 LOIRE à MUIDES-SUR-LOIRE, 17,2 km, code_cours_eau "----0000",
 *     dernier relevé 17/08/2024 — écartée aujourd'hui parce que 17,2 > 15 km.
 *
 *   physico (analyse_pc, paramètre 1301)  14 stations, dont :
 *     04052025 MEES à CHAUSSEE-SAINT-VICTOR   3,4 km   un ruisseau
 *     04053000 LOIRE à CHAUMONT-SUR-LOIRE    15,7 km   "----0000"
 *     04051850 LOIRE à MUIDES-SUR-LOIRE      17,2 km   "----0000"
 *
 *   analyse_pc ne publie AUCUN rattachement (ses 67 champs n'en portent pas,
 *   voir contrats-api.test.ts). C'est station_pc qui le publie —
 *   code_cours_eau / nom_cours_eau / uri_cours_eau, référentiel
 *   CoursEau_Carthage2017 — et c'est de là que vient la jointure.
 */

const fixture = (n: string) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`./__fixtures__/${n}`, import.meta.url)), "utf8"),
  );

const LAT = 47.586;
const LON = 1.336;
const LOIRE = `${REFERENTIEL_SANDRE}:----0000`;

/** Répond à chaque URL Hub'Eau par la charge réelle correspondante. */
function stubHubeau(overrides: Record<string, unknown> = {}) {
  const appels: string[] = [];
  const f = vi.fn(async (input: RequestInfo | URL) => {
    const u = String(input);
    appels.push(u);
    let nom: string | null = null;
    // Deux appels distincts à analyse_pc : la température (1301) pour
    // waterTemp, l'oxygène / pH (1311, 1312, 1302) pour nearestQuality.
    if (u.includes("/analyse_pc"))
      nom = u.includes("code_parametre=1301")
        ? "hubeau-analyse-pc-blois.json"
        : "hubeau-analyse-pc-qualite-mees.json";
    else if (u.includes("/station_pc")) nom = "hubeau-station-pc-blois.json";
    else if (u.includes("/temperature/station")) nom = "hubeau-temperature-station-blois.json";
    else if (u.includes("/temperature/chronique")) nom = "hubeau-temperature-chronique.json";
    if (!nom) throw new Error("URL non prévue : " + u);
    const corps = nom in overrides ? overrides[nom] : fixture(nom);
    return new Response(JSON.stringify(corps), { status: 200 });
  });
  vi.stubGlobal("fetch", f);
  return appels;
}

beforeEach(() => {
  // Toutes les mesures de la boîte datent de l'hiver 2025-2026 : à cette date
  // elles sont périmées pour la température (AGE_MAX = 30 j). C'est voulu — on
  // vérifie ici la règle « la distance décide », pas la fraîcheur.
  vi.setSystemTime(new Date("2026-07-31T12:00:00Z"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("coursDesStationsPc", () => {
  it("rend le cours d'eau publié par station_pc, dans le bon référentiel", async () => {
    stubHubeau();

    const m = await coursDesStationsPc(1.13, 47.44, 1.54, 47.72);

    expect(m.get("LOIRE à MUIDES-SUR-LOIRE")).toEqual({ cle: LOIRE, nom: "la Loire" });
    expect(m.get("MEES à CHAUSSEE-SAINT-VICTOR (LA)")).toEqual({
      cle: `${REFERENTIEL_SANDRE}:K4475000`,
      nom: "les Mées",
    });
  });

  it("ne dit rien d'une station dont le rattachement n'est pas publié", async () => {
    // 04444031 LA TRONNE A MER : code_cours_eau et nom_cours_eau à null dans la
    // réponse réelle. Absent ≠ autre cours d'eau.
    stubHubeau();

    const m = await coursDesStationsPc(1.13, 47.44, 1.54, 47.72);

    expect(m.has("LA TRONNE A MER")).toBe(false);
  });

  it("garde un libellé porté par plusieurs stations du MÊME cours d'eau", async () => {
    // Mesuré : trois stations distinctes s'appellent « LA CISSE A AVERDON »
    // (04448024, 04448026, 04448031), toutes sur K4--0150. Le libellé ne dit
    // pas laquelle, mais il dit la rivière — et c'est la seule question posée.
    stubHubeau();

    const m = await coursDesStationsPc(1.13, 47.44, 1.54, 47.72);

    expect(m.get("LA CISSE A AVERDON")?.cle).toBe(`${REFERENTIEL_SANDRE}:K4--0150`);
  });

  it("abandonne un libellé que deux stations placent sur deux cours d'eau", async () => {
    // Cas non observé autour de Blois, mais rien n'interdit deux stations
    // homonymes sur deux rivières. Le libellé cesse alors de répondre, et
    // l'absence de réponse vaut mieux qu'un rattachement tiré au sort.
    const st = fixture("hubeau-station-pc-blois.json");
    st.data = [
      { code_station: "A", libelle_station: "PONT NEUF", code_cours_eau: "K1", uri_cours_eau: "https://id.eaufrance.fr/CoursEau_Carthage2017/K1" },
      { code_station: "B", libelle_station: "PONT NEUF", code_cours_eau: "K2", uri_cours_eau: "https://id.eaufrance.fr/CoursEau_Carthage2017/K2" },
    ];
    stubHubeau({ "hubeau-station-pc-blois.json": st });

    const m = await coursDesStationsPc(1.13, 47.44, 1.54, 47.72);

    expect(m.has("PONT NEUF")).toBe(false);
  });
});

describe("waterTemp — le critère du cours d'eau", () => {
  it("sans cours d'eau de référence, retient le ruisseau le plus proche", async () => {
    // L'état d'avant, et il n'est pas absurde : les Mées à 3,4 km. Mais c'est
    // un ruisseau, et le pêcheur est sur la Loire.
    stubHubeau();

    const t = await waterTemp(LAT, LON);

    expect(t?.station).toBe("MEES à CHAUSSEE-SAINT-VICTOR (LA)");
  });

  it("avec la Loire pour référence, retient une station DE LA LOIRE", async () => {
    stubHubeau();

    const t = await waterTemp(LAT, LON, undefined, LOIRE);

    expect(t?.coursCode).toBe(LOIRE);
    expect(t?.station).toMatch(/^LOIRE à /);
    // Au-delà de la portée ordinaire de 15 km : c'est tout l'objet du critère.
    expect(t!.dist).toBeGreaterThan(DIST_MAX.temperature);
    expect(t!.dist).toBeLessThanOrEqual(DIST_MAX_MEME_COURS.temperature);
  });

  it("entre deux stations de la Loire, la plus proche gagne", async () => {
    // CHAUMONT-SUR-LOIRE 15,7 km contre MUIDES-SUR-LOIRE 17,2 km, toutes deux
    // sur "----0000", toutes deux prélevées le 22/01/2026. La distance décide.
    stubHubeau();

    const t = await waterTemp(LAT, LON, undefined, LOIRE);

    expect(t?.station).toBe("LOIRE à CHAUMONT-SUR-LOIRE");
    expect(t!.dist).toBeCloseTo(15.66, 1);
  });

  it("nomme le cours d'eau que analyse_pc ne publie pas", async () => {
    stubHubeau();

    const t = await waterTemp(LAT, LON, undefined, LOIRE);

    expect(t?.cours).toBe("la Loire");
  });

  it("n'interroge station_pc que lorsqu'on lui donne un cours d'eau", async () => {
    // L'Accueil appelle waterTemp à chaque session sans référence : il ne doit
    // pas payer une requête de plus pour une jointure dont il ne se sert pas.
    const sansRef = stubHubeau();
    await waterTemp(LAT, LON);
    expect(sansRef.filter((u) => u.includes("/station_pc"))).toHaveLength(0);

    vi.unstubAllGlobals();
    const avecRef = stubHubeau();
    await waterTemp(LAT, LON, undefined, LOIRE);
    expect(avecRef.filter((u) => u.includes("/station_pc"))).toHaveLength(1);
  });

  it("si station_pc ne répond pas, les analyses perdent leur rattachement — le réseau thermie garde le sien", async () => {
    // Chaque branche répond de son propre rattachement. La thermie publie le
    // sien nativement (code_cours_eau sur temperature/station) ; les analyses,
    // non, et sans la jointure elles retombent dans le lot ordinaire. Le
    // résultat n'est donc pas « comme si de rien n'était » : c'est MUIDES, la
    // seule station de la Loire qui sache encore dire sur quoi elle est.
    stubHubeau({ "hubeau-station-pc-blois.json": { data: [] } });

    const t = await waterTemp(LAT, LON, undefined, LOIRE);

    expect(t?.station).toBe("LOIRE à MUIDES-SUR-LOIRE");
    expect(t?.source).toBe("thermie");
  });

  it("ne jette pas quand station_pc échoue franchement", async () => {
    const f = vi.fn(async (input: RequestInfo | URL) => {
      const u = String(input);
      if (u.includes("/station_pc")) throw new Error("réseau");
      if (u.includes("/analyse_pc")) return new Response(JSON.stringify(fixture("hubeau-analyse-pc-blois.json")), { status: 200 });
      if (u.includes("/temperature/station")) return new Response(JSON.stringify(fixture("hubeau-temperature-station-blois.json")), { status: 200 });
      return new Response(JSON.stringify(fixture("hubeau-temperature-chronique.json")), { status: 200 });
    });
    vi.stubGlobal("fetch", f);

    await expect(waterTemp(LAT, LON, undefined, LOIRE)).resolves.not.toBeNull();
  });
});

describe("nearestTemp — le réseau thermie", () => {
  it("écarte MUIDES sans référence : 17,2 km pour 15 accordés", async () => {
    // Elle était rendue quand même : nearestTemp prenait la plus proche de la
    // boîte sans jamais borner la distance, et la boîte déborde en diagonale.
    stubHubeau();

    expect(await nearestTemp(LAT, LON)).toBeNull();
  });

  it("retient LOIRE à MUIDES-SUR-LOIRE quand le point est sur la Loire", async () => {
    // LE cas de fin de lot. 04051850, 17,2 km, "----0000".
    stubHubeau();

    const t = await nearestTemp(LAT, LON, undefined, LOIRE);

    expect(t?.station).toBe("LOIRE à MUIDES-SUR-LOIRE");
    expect(t?.coursCode).toBe(LOIRE);
    expect(t!.dist).toBeCloseTo(17.25, 1);
    // Rendue avec sa date, jamais comme l'état courant : 17/08/2024.
    expect(t?.date).toMatch(/^2024-08-17/);
  });
});

describe("nearestQuality — le rattachement qui n'était pas demandé", () => {
  it("publie le cours d'eau de la station physico-chimique", async () => {
    // Le code lisait d.libelle_cours_eau et d.code_cours_eau sans les avoir
    // demandés dans `fields`, et station_pc nomme le libellé nom_cours_eau, pas
    // libelle_cours_eau. Les deux erreurs se compensaient en un silence.
    // À Blois la station la plus proche est LOIRE à BLOIS, 1,6 km.
    stubHubeau();

    const q = await nearestQuality(LAT, LON);

    expect(q?.station).toBe("LOIRE à BLOIS");
    expect(q?.coursCode).toBe(LOIRE);
    expect(q?.cours).toBe("la Loire");
  });

  it("préfère une station de la Loire quand le point est sur la Loire", async () => {
    // À Blois même, la plus proche est DÉJÀ sur la Loire : le critère ne change
    // rien, et c'est bien ainsi. Pour le voir agir il faut retirer LOIRE à
    // BLOIS — le reste des stations reste la charge réelle. La plus proche
    // devient alors les MEES à CHAUSSEE-SAINT-VICTOR, 3,4 km, un ruisseau.
    const st = fixture("hubeau-station-pc-blois.json");
    st.data = st.data.filter(
      (d: { code_station: string }) => d.code_station !== "04052000",
    );
    stubHubeau({ "hubeau-station-pc-blois.json": st });

    expect((await nearestQuality(LAT, LON))?.coursCode).toBe(`${REFERENTIEL_SANDRE}:K4475000`);
    expect((await nearestQuality(LAT, LON, undefined, LOIRE))?.coursCode).toBe(LOIRE);
  });
});
