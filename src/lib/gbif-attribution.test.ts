import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseOccurrences, nomLicenceCC } from "./gbif-attribution";

// GBIF impose une attribution PAR ENREGISTREMENT : chaque occurrence porte sa
// propre licence, celle du jeu de données qui la publie. Le commentaire de
// gbif.ts affirmait « attribution shown on the map » — le code ne lisait même
// pas le champ `license`.
//
// Mesuré le 31/07/2026 autour de Blois : sur 300 occurrences de nos taxons,
// 6 jeux de données distincts, toutes en CC BY 4.0 ; mais une requête sans
// filtre de taxon dans la même zone ramène du CC BY-NC 4.0. La licence varie
// donc réellement d'un enregistrement à l'autre, et NC n'est pas BY.

const brut = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("./__fixtures__/gbif-occurrences-blois.json", import.meta.url)),
    "utf8",
  ),
);

describe("parseOccurrences", () => {
  it("transporte la licence de chaque enregistrement", () => {
    const r = parseOccurrences(brut);

    expect(r.occurrences.every((o) => o.licence !== "")).toBe(true);
  });

  it("garde le jeu de données, sans lequel l'attribution ne désigne personne", () => {
    const r = parseOccurrences(brut);

    expect(r.occurrences[0]!.dataset).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("distingue les licences réellement rencontrées", () => {
    const r = parseOccurrences(brut);
    const lics = new Set(r.occurrences.map((o) => o.licence));

    expect(lics.has("http://creativecommons.org/licenses/by/4.0/legalcode")).toBe(true);
    expect(lics.has("http://creativecommons.org/licenses/by-nc/4.0/legalcode")).toBe(true);
  });

  it("lit endOfRecords, et dit combien il y en a en tout", () => {
    // 300 rendues sur 6042 dans la zone mesurée. La carte annonçait
    // « 300+ obs. GBIF (échantillon) » sans jamais dire 6042.
    const r = parseOccurrences(brut);

    expect(r.complet).toBe(false);
    expect(r.total).toBe(6042);
  });

  it("ne prend pas un enregistrement sans coordonnées pour un point de la carte", () => {
    const r = parseOccurrences({ results: [{ key: 1, license: "x" }] });

    expect(r.occurrences).toEqual([]);
  });

  it("sans endOfRecords, ne conclut pas que la réponse est complète", () => {
    // Absent n'est pas « oui ». Une réponse dont on ignore si elle est entière
    // ne doit pas être présentée comme entière.
    const r = parseOccurrences({ results: [] });

    expect(r.complet).toBeNull();
  });
});

describe("nomLicenceCC", () => {
  it("nomme les licences rencontrées, telles que GBIF les écrit", () => {
    expect(nomLicenceCC("http://creativecommons.org/licenses/by/4.0/legalcode")).toBe("CC BY 4.0");
    expect(nomLicenceCC("http://creativecommons.org/licenses/by-nc/4.0/legalcode")).toBe(
      "CC BY-NC 4.0",
    );
  });

  it("reconnaît CC0, que GBIF sert aussi", () => {
    expect(nomLicenceCC("http://creativecommons.org/publicdomain/zero/1.0/legalcode")).toBe(
      "CC0 1.0",
    );
  });

  it("accepte le https comme le http — GBIF sert les deux", () => {
    expect(nomLicenceCC("https://creativecommons.org/licenses/by-sa/4.0/")).toBe("CC BY-SA 4.0");
  });

  it("rend null plutôt que de deviner, comme licenceUrl", () => {
    // Nommer de travers la licence d'un tiers est pire que ne pas la nommer :
    // ça énonce des conditions d'usage qu'il n'a pas données.
    expect(nomLicenceCC("http://exemple.org/une-licence-maison")).toBeNull();
    expect(nomLicenceCC("")).toBeNull();
  });
});
