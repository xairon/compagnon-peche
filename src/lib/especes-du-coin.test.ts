import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  apparier,
  chargerEspecesDuCoin,
  PORTEE_COIN_KM,
  STATIONS_RETENUES,
} from "./especes-du-coin";

/**
 * Apparier un taxon relevé à une fiche, mesuré le 01/08/2026 sur les trois
 * stations ASPE les plus proches de Blois : 39 taxons distincts, dont 2
 * seulement échouent à cause d'un SYNONYME. Dans un filtre qui masque, rater un
 * synonyme masque une espèce réellement présente — d'où la table, et d'où le
 * test de garde qui échouera quand une divergence nouvelle apparaîtra.
 */

describe("apparier", () => {
  it("retrouve le chevaine sous le nom que l'ASPE lui donne", () => {
    // ASPE écrit `Leuciscus cephalus` ; le dépôt écrit `Squalius cephalus`.
    expect(apparier(["Leuciscus cephalus"]).ids).toEqual(["chevesne"]);
  });

  it("retrouve la grémille malgré la terminaison du genre", () => {
    // ASPE écrit `cernua`, le dépôt `cernuus`.
    expect(apparier(["Gymnocephalus cernua"]).ids).toEqual(["gremille"]);
  });

  it("ne confond pas le chevaine et le mulet", () => {
    // LE piège de l'épithète : apparier sur `cephalus` seul rendrait le
    // chevaine pour un mulet. Les deux sont dans le catalogue.
    expect(apparier(["Mugil cephalus"]).ids).toEqual(["mulet-cabot"]);
  });

  it("range les écrevisses à part : elles ont une fiche, mais ailleurs", () => {
    // Les compter comme « sans fiche » serait faux — l'écran Écrevisses en a
    // une. Elles ne filtrent pas la grille pour autant : SPECIES ne les
    // contient pas.
    const r = apparier(["Procambarus clarkii", "Faxonius limosus"]);
    expect(r.ecrevisses).toEqual(["americaine", "louisiane"]);
    expect(r.ids).toEqual([]);
    expect(r.inconnus).toEqual([]);
  });

  it("ne devine pas un lot identifié au genre, à la famille, ni un hybride", () => {
    const r = apparier(["Cyprinidae sp.", "Lampetra spp", "Hybride brème-gardon"]);
    expect(r.ids).toEqual([]);
    expect(r.inconnus).toEqual(["Cyprinidae sp.", "Hybride brème-gardon", "Lampetra spp"]);
  });

  it("dédoublonne et trie, pour que deux relevés rendent le même ordre", () => {
    const r = apparier(["Sander lucioperca", "Esox lucius", "Sander lucioperca"]);
    expect(r.ids).toEqual(["brochet", "sandre"]);
  });

  it("ignore une chaîne vide sans la compter comme inconnue", () => {
    expect(apparier(["", "   "])).toEqual({ ids: [], ecrevisses: [], inconnus: [] });
  });
});

const fixture = (n: string) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`./__fixtures__/${n}`, import.meta.url)), "utf8"),
  );

const LAT = 47.586;
const LON = 1.336;

/** Les trois stations valides les plus proches de Blois, dans l'ordre. */
const PROCHES = ["04052025", "04052800", "04052600"];

afterEach(() => vi.unstubAllGlobals());

/** Répond par les charges réelles figées ; `absentes` fait échouer ces stations. */
function stub(absentes: string[] = []) {
  const appels: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const u = String(input);
      appels.push(u);
      if (u.includes("/stations?"))
        return new Response(JSON.stringify(fixture("hubeau-piscicole-stations-blois.json")), {
          status: 200,
        });
      const m = /code_station=(\d+)/.exec(u);
      if (!m) throw new Error("URL non prévue : " + u);
      if (absentes.includes(m[1])) throw new Error("réseau coupé");
      return new Response(JSON.stringify(fixture(`hubeau-piscicole-obs-${m[1]}.json`)), {
        status: 200,
      });
    }),
  );
  return appels;
}

describe("chargerEspecesDuCoin", () => {
  it("écarte les six stations sans code et retient les trois plus proches VALIDES", async () => {
    // 6 des 22 enregistrements de la boîte n'ont ni code ni libellé — que des
    // coordonnées — et la PLUS PROCHE de Blois (2,04 km) en fait partie.
    // `stationsInBbox` en fait la chaîne "null", qui est truthy : sans ce tri,
    // une requête sur trois partirait pour rien.
    const appels = stub();

    const c = await chargerEspecesDuCoin(LAT, LON);

    expect(c!.stations.map((s) => s.code)).toEqual(PROCHES);
    expect(appels.filter((u) => u.includes("code_station=null"))).toEqual([]);
  });

  it("une requête de stations, puis une par station retenue — pas plus", async () => {
    const appels = stub();

    await chargerEspecesDuCoin(LAT, LON);

    expect(appels).toHaveLength(1 + STATIONS_RETENUES);
  });

  it("rend les 34 espèces, les 2 écrevisses et les 3 taxons sans fiche", async () => {
    stub();

    const c = await chargerEspecesDuCoin(LAT, LON);

    expect(c!.ids).toHaveLength(34);
    expect(c!.ids).toContain("sandre");
    expect(c!.ids).toContain("chevesne"); // le synonyme, de bout en bout
    expect(c!.ecrevisses).toEqual(["americaine", "louisiane"]);
    expect(c!.inconnus).toEqual(["Cyprinidae sp.", "Hybride brème-gardon", "Lampetra spp"]);
  });

  it("garde une station à peine échantillonnée plutôt qu'une plus riche mais plus loin", async () => {
    // 04052025 ne rend que 2 taxons. C'est la plus proche : la remplacer par
    // une station mieux fournie plus loin, ce serait choisir la donnée qui
    // arrange plutôt que celle du coin.
    stub();

    const c = await chargerEspecesDuCoin(LAT, LON);

    expect(c!.stations[0].code).toBe("04052025");
    expect(c!.stations[0].dist).toBeCloseTo(3.37, 1);
  });

  it("date le relevé, pour que l'écran dise de quand il parle", async () => {
    stub();

    const c = await chargerEspecesDuCoin(LAT, LON);

    expect(c!.releveIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(c!.lat).toBe(LAT);
    expect(c!.lon).toBe(LON);
  });

  it("ne lève pas quand une station tombe, et rend ce que les autres savent", async () => {
    stub(["04052600"]);

    const c = await chargerEspecesDuCoin(LAT, LON);

    expect(c!.stations.map((s) => s.code)).toEqual(["04052025", "04052800"]);
    expect(c!.ids.length).toBeGreaterThan(20);
  });

  it("rend null quand la requête de stations échoue — on ne sait rien", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("hors-ligne");
      }),
    );

    await expect(chargerEspecesDuCoin(LAT, LON)).resolves.toBeNull();
  });

  it("rend null quand TOUTES les stations retenues se taisent", async () => {
    // Nommer trois stations sans pouvoir citer une seule espèce se lirait
    // « aucun poisson ici » — une affirmation qu'on n'a pas constatée.
    stub(PROCHES);

    await expect(chargerEspecesDuCoin(LAT, LON)).resolves.toBeNull();
  });

  it("rend un relevé vide, et non null, quand la boîte n'a aucune station", async () => {
    // Distinct du cas hors-ligne : ici la source a répondu, et sa réponse est
    // « rien ici ». L'écran doit pouvoir le dire.
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ count: 0, data: [] }), { status: 200 }),
      ),
    );

    const c = await chargerEspecesDuCoin(LAT, LON);

    expect(c).not.toBeNull();
    expect(c!.stations).toEqual([]);
    expect(c!.ids).toEqual([]);
  });

  it("ne demande pas une boîte plus large que la portée annoncée", async () => {
    const appels = stub();

    await chargerEspecesDuCoin(LAT, LON);

    // La portée est un plafond de CRÉDIBILITÉ : au-delà, la station ne parle
    // plus du coin où l'on pêche. Le coût, lui, est fixé par STATIONS_RETENUES.
    expect(PORTEE_COIN_KM).toBe(15);
    const bbox = /bbox=([\d.-]+),([\d.-]+),([\d.-]+),([\d.-]+)/.exec(appels[0])!;
    expect(Number(bbox[3]) - Number(bbox[1])).toBeLessThan(0.6);
  });
});
