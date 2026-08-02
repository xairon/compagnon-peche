import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { stationsInBbox } from "./hubeau";

/**
 * Le référentiel piscicole publie des points sans identité — et la Carte les
 * dessinait quand même.
 *
 * Mesuré le 01/08/2026 sur bbox=1.1,47.4,1.6,47.7 (Blois), champs demandés
 * code_station, libelle_station, libelle_cours_eau, latitude, longitude :
 *
 *   22 enregistrements rendus
 *    6 avec `code_station: null` ET `libelle_station: null` — rien qu'un couple
 *      de coordonnées, dont l'un exactement en double (1,1552 / 47,4776)
 *   16 stations complètes, de CISSEREAU À ONZAIN à LOIRE à MUIDES-SUR-LOIRE
 *
 *   `libelle_cours_eau` n'est JAMAIS rendu, même demandé : les seules clés
 *   présentes sont code_station, libelle_station, longitude, latitude.
 *
 * CE QUE LE FILTRE D'AVANT LAISSAIT PASSER. Il ne regardait que la latitude et
 * la longitude, finies toutes les six. `String(null)` rend ensuite la chaîne
 * "null", qui est vraie — le code fantôme traversait donc aussi tout test de
 * simple présence. Six marqueurs apparaissaient autour de Blois, et les toucher
 * appelait speciesAtStation("null") : l'API répond count 0, l'app écrivait
 * « Aucune espèce recensée sur cette station. » d'une station qui n'existe pas.
 * Se taire sur un point sans identité vaut mieux que le nier sur son contenu.
 */

const fixture = (n: string) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`./__fixtures__/${n}`, import.meta.url)), "utf8"),
  );

const BLOIS = fixture("hubeau-piscicole-stations-blois.json");

/** Répond à l'unique requête de stationsInBbox par la charge réelle. */
function stub(corps: unknown = BLOIS) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(corps), { status: 200 })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("stationsInBbox", () => {
  it("écarte les six enregistrements que le réseau rend sans code", async () => {
    stub();

    const st = await stationsInBbox(1.1, 47.4, 1.6, 47.7);

    expect(BLOIS.data).toHaveLength(22);
    expect(st).toHaveLength(16);
  });

  it("ne rend aucune station dont le code soit « null » ou « undefined »", async () => {
    // Le défaut ne venait pas d'un champ absent mais de sa conversion : c'est la
    // CHAÎNE qu'il faut regarder, pas sa véracité.
    stub();

    const st = await stationsInBbox(1.1, 47.4, 1.6, 47.7);

    expect(st.filter((s) => s.code === "null" || s.code === "undefined")).toEqual([]);
    for (const s of st) expect(s.code).toMatch(/^\d{8}$/);
  });

  it("garde intactes les stations que le réseau nomme", async () => {
    // L'écart doit rester celui-là et pas un de plus : filtrer trop retirerait
    // de la Carte des stations réelles, sans plus de bruit que les fantômes.
    stub();

    const st = await stationsInBbox(1.1, 47.4, 1.6, 47.7);

    // Pas de `cours` : ce réseau ne publie pas `libelle_cours_eau`, même
    // demandé dans `fields` (contrats-api.test.ts le vérifie sur la charge
    // enregistrée). Le champ ne valait jamais que "", il n'existe plus.
    expect(st[0]).toEqual({
      code: "04448004",
      nom: "CISSEREAU À ONZAIN",
      lat: 47.501419924532534,
      lon: 1.1727083471909339,
    });
    expect(st.map((s) => s.code)).toContain("04051850");
  });

  it("écarte aussi un enregistrement dont la position manque", async () => {
    // Cas non observé sur cette boîte — les 22 ont des coordonnées finies —
    // mais un marqueur sans position n'est pas plaçable, et la règle d'avant
    // était la seule qui existait : la garder.
    stub({
      data: [
        { code_station: "04052025", libelle_station: "MEES", latitude: null, longitude: 1.36 },
      ],
    });

    expect(await stationsInBbox(1.1, 47.4, 1.6, 47.7)).toEqual([]);
  });
});
