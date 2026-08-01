import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { stationsHydro, PORTEE_HYDRO_RIVIERE_KM } from "./hydro-riviere";
import { surLaRiviere } from "./rivieres";
import { choisirStation, DIST_MAX, DIST_MAX_MEME_COURS } from "./station";

/**
 * Le débit de LA rivière choisie, et pas de celle d'à côté.
 *
 * `hubeau.nearestHydroStation()` rend la station en service la plus proche et
 * ne dit pas sur quel cours d'eau elle est : elle ne demande ni
 * `code_cours_eau` ni `uri_cours_eau`. Impossible, avec elle, de tenir la
 * promesse « vous avez choisi la Loire ».
 *
 * Mesuré le 01/08/2026 autour de Blois (47,586 / 1,336), boîte de 40 km :
 * 30 stations en service, 8 136 o. Les plus proches, avec leur rattachement :
 *
 *    0,1 km  K447001001  La Loire à Blois                   ----0000  la Loire
 *    5,1 km  K479301001  Le Cosson à Chailles               K47-0300  le Cosson
 *    8,7 km  K467000101  Le Beuvron à Cellettes             K4--0220  le Beuvron
 *    8,7 km  K484000102  La Cisse à Coulanges               K4--0150  la Cisse
 *   15,6 km  K480001002  La Loire à Onzain - Amont          ----0000  la Loire
 *
 * Le référentiel est `CEA` ici (`uri .../CEA/----0000`), pas
 * `CoursEau_Carthage2017` — voir rivieres.ts.
 */

const fixture = (n: string) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`./__fixtures__/${n}`, import.meta.url)), "utf8"),
  );

const LAT = 47.586;
const LON = 1.336;
const LOIRE = "CEA:----0000";
const COSSON = "CEA:K47-0300";

afterEach(() => vi.unstubAllGlobals());

function stub() {
  const appels: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      appels.push(String(input));
      return new Response(JSON.stringify(fixture("hubeau-hydro-stations-blois40.json")), {
        status: 200,
      });
    }),
  );
  return appels;
}

describe("stationsHydro", () => {
  it("rend chaque station avec son cours d'eau et sa distance", async () => {
    stub();

    const cands = await stationsHydro(LAT, LON);

    expect(cands).toHaveLength(30);
    const blois = cands.find((c) => c.code === "K447001001")!;
    expect(blois.coursCode).toBe(LOIRE);
    expect(blois.cours).toBe("la Loire");
    expect(blois.dist).toBeLessThan(0.5);
  });

  it("demande une boîte à la portée « même cours d'eau », pas à la portée ordinaire", async () => {
    const appels = stub();

    await stationsHydro(LAT, LON);

    // La Loire à Onzain est à 15,6 km : dans la portée élargie (40 km), hors
    // de la portée ordinaire pour un autre cours d'eau (20 km). Demander la
    // petite boîte, c'est refuser une station de la BONNE rivière sans jamais
    // l'avoir regardée — le défaut que porteePour() a corrigé dans hubeau.ts.
    expect(PORTEE_HYDRO_RIVIERE_KM).toBe(DIST_MAX_MEME_COURS.hydro);
    expect(PORTEE_HYDRO_RIVIERE_KM).toBeGreaterThan(DIST_MAX.hydro);
    expect(appels[0]).toContain("en_service=true");
    expect(appels[0]).toContain("code_cours_eau");
    expect(appels[0]).toContain("uri_cours_eau");
  });

  it("ignore une station sans coordonnées lisibles", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: [
                { code_station: "X", latitude_station: null, longitude_station: null },
                {
                  code_station: "K447001001",
                  libelle_station: "La Loire à Blois",
                  latitude_station: 47.584957,
                  longitude_station: 1.335148,
                  code_cours_eau: "----0000",
                  uri_cours_eau: "http://id.eaufrance.fr/CEA/----0000",
                },
              ],
            }),
            { status: 200 },
          ),
      ),
    );

    expect(await stationsHydro(LAT, LON)).toHaveLength(1);
  });

  it("rend une liste vide, et non une erreur, quand la source tombe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("hors-ligne");
      }),
    );

    await expect(stationsHydro(LAT, LON)).resolves.toEqual([]);
  });
});

describe("le débit, une fois la rivière choisie", () => {
  it("retient une station de la Loire, même à 15,6 km, plutôt que le Cosson à 5,1", async () => {
    stub();
    const cands = await stationsHydro(LAT, LON);

    const st = choisirStation(surLaRiviere(cands, [LOIRE]), "hydro");

    expect(st!.cours).toBe("la Loire");
  });

  it("n'invente rien quand la rivière choisie n'a aucune station à portée", async () => {
    stub();
    const cands = await stationsHydro(LAT, LON);

    // Le Lien est à 28,1 km : il a bien une station. Une rivière sans aucune
    // station, elle, ne doit surtout pas retomber sur la Loire à 0,1 km.
    const st = choisirStation(surLaRiviere(cands, ["CEA:INEXISTANT"]), "hydro");

    expect(st).toBeNull();
  });

  it("le pêcheur qui choisit le Cosson n'obtient pas la Loire", async () => {
    stub();
    const cands = await stationsHydro(LAT, LON);

    const st = choisirStation(surLaRiviere(cands, [COSSON]), "hydro");

    expect(st!.cours).toBe("le Cosson");
    expect(st!.dist).toBeGreaterThan(5); // la Loire est à 0,1 km
  });

  it("sans rivière choisie, le comportement d'avant est inchangé : la plus proche", async () => {
    stub();
    const cands = await stationsHydro(LAT, LON);

    const st = choisirStation(cands, "hydro");

    expect(st!.code).toBe("K447001001");
  });
});
