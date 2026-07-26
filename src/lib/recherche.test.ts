import { describe, it, expect } from "vitest";
import { matchSpecies, speciesAliases, speciesAliasLabels, ALIASES_IDS } from "./recherche";
import { SPECIES } from "../data/species";

const trouve = (q: string) => SPECIES.filter((sp) => matchSpecies(sp, q)).map((sp) => sp.id);

describe("matchSpecies", () => {
  it("trouve par nom", () => {
    expect(trouve("brochet")).toContain("brochet");
  });

  it("trouve par latin", () => {
    expect(trouve("esox")).toContain("brochet");
  });

  it("ignore les accents et la casse", () => {
    expect(trouve("BRÔCHET")).toContain("brochet");
  });

  // Le point de départ : miroir, cuir et royale ne sont pas des espèces mais des
  // variétés d'écailles de Cyprinus carpio. Taxonomiquement l'app a raison de ne
  // pas les lister ; pour un pêcheur, taper « carpe miroir » et ne rien trouver
  // est un trou.
  it("trouve la carpe commune par ses variétés d'écailles", () => {
    for (const q of ["carpe miroir", "miroir", "carpe cuir", "cuir", "carpe royale", "koi", "koï"]) {
      expect(trouve(q), `« ${q} » doit mener à la carpe`).toContain("carpe");
    }
  });

  it("trouve par nom populaire régional", () => {
    expect(trouve("sandre")).toContain("sandre");
    expect(trouve("gardèche")).toContain("gardon");
  });

  // Deuxième moitié du trou : les alias ne couvraient que les 25 fiches
  // curatées. Or c'est souvent une espèce « base » qu'on cherche sous un autre
  // nom — « féra » pour le corégone, « touladi » pour le cristivomer.
  it("trouve une espèce « base » par son nom de lac ou de région", () => {
    const attendus: [string, string][] = [
      ["féra", "coregone-lavaret"],
      ["lavaret", "coregone-lavaret"],
      ["touladi", "cristivomer"],
      ["saumon du Danube", "huchon"],
      ["muge", "mulet-cabot"],
      ["carpe amour", "amour-blanc"],
      ["faux goujon", "pseudorasbora"],
      ["poisson-moustique", "gambusie"],
      ["lotte de rivière", "lote-de-riviere"],
      ["dormille", "loche-franche"],
    ];
    for (const [q, id] of attendus) {
      expect(trouve(q), `« ${q} » doit mener à ${id}`).toContain(id);
    }
  });

  /**
   * Le piège du lot : « loche de rivière » est le nom OFFICIEL d'une espèce
   * protégée. En faire un synonyme de la loche franche (pêchable, consommée)
   * enverrait le pêcheur sur la mauvaise fiche là où l'erreur coûte le plus
   * cher. L'alias a été écarté ; ce test empêche de le réintroduire.
   */
  it("« loche de rivière » ne mène qu'à la loche de rivière, espèce protégée", () => {
    expect(trouve("loche de riviere")).toEqual(["loche-de-riviere"]);
  });

  it("« loche » seul ne rapatrie pas la lote, qui n'est pas une loche", () => {
    expect(trouve("loche")).not.toContain("lote-de-riviere");
  });

  it("une requête vide ne filtre rien", () => {
    expect(matchSpecies(SPECIES[0], "")).toBe(true);
  });

  it("une requête sans correspondance ne rend rien", () => {
    expect(trouve("zzzz")).toEqual([]);
  });
});

describe("speciesAliases", () => {
  it("expose les variétés d'une espèce pour affichage sur sa fiche", () => {
    const a = speciesAliases("carpe");
    expect(a).toContain("miroir");
    expect(a.length).toBeGreaterThan(2);
  });

  it("rend un tableau vide pour une espèce sans variété connue", () => {
    expect(speciesAliases("sandre")).toEqual([]);
  });
});

describe("speciesAliasLabels", () => {
  // La liste de recherche porte des formes courtes exprès (« miroir » seul doit
  // matcher). Les afficher toutes donnait « carpe miroir, miroir, carpe cuir,
  // cuir… » : un bégaiement sur la fiche.
  it("retire les formes courtes déjà contenues dans une forme longue", () => {
    expect(speciesAliasLabels("carpe")).toEqual([
      "carpe miroir",
      "carpe cuir",
      "carpe royale",
      "carpe koï",
    ]);
  });

  it("garde les noms qui se tiennent seuls", () => {
    expect(speciesAliasLabels("coregone-lavaret")).toEqual(["féra", "lavaret"]);
  });

  /**
   * Même piège que « loche de rivière », attrapé plus tard : « bondelle » et
   * « gravenche » ne sont pas des synonymes du lavaret mais les noms d'autres
   * corégones (C. oxyrinchus, C. hiemalis). Les afficher sous « — même espèce »
   * était faux. Ce test empêche de les remettre.
   */
  it("n'attribue pas au lavaret le nom d'un autre corégone", () => {
    for (const nom of ["bondelle", "gravenche"]) {
      expect(speciesAliases("coregone-lavaret"), `« ${nom} » nomme un autre taxon`).not.toContain(
        nom,
      );
    }
  });

  it("ne tronque jamais : la fiche montre tout ce qu'elle sait", () => {
    for (const id of Object.keys(ALIASES_IDS)) {
      expect(speciesAliasLabels(id).length).toBeGreaterThan(0);
      expect(speciesAliasLabels(id).length).toBeLessThanOrEqual(speciesAliases(id).length);
    }
  });

  // Un nom affiché mais introuvable serait le pire des deux mondes : la fiche
  // apprend un synonyme au pêcheur, qui le tape et ne trouve rien.
  it("chaque nom affiché reste cherchable", () => {
    for (const id of Object.keys(ALIASES_IDS)) {
      for (const label of speciesAliasLabels(id)) {
        expect(SPECIES.filter((sp) => matchSpecies(sp, label)).map((s) => s.id)).toContain(id);
      }
    }
  });
});

/**
 * Un alias pointant vers un identifiant inexistant est muet : la recherche ne
 * renverrait rien, sans erreur. Ce test l'attrape (c'est arrivé : « carpe » est
 * l'id, pas « carpe-commune »).
 */
describe("intégrité des alias", () => {
  it("chaque espèce référencée existe", () => {
    const ids = new Set(SPECIES.map((s) => s.id));
    const orphelins = Object.keys(ALIASES_IDS).filter((id) => !ids.has(id));
    expect(orphelins).toEqual([]);
  });

  it("chaque alias mène bien à son espèce", () => {
    const muets: string[] = [];
    for (const id of Object.keys(ALIASES_IDS)) {
      for (const alias of speciesAliases(id)) {
        const hits = SPECIES.filter((sp) => matchSpecies(sp, alias)).map((s) => s.id);
        if (!hits.includes(id)) muets.push(`${alias} → ${id}`);
      }
    }
    expect(muets).toEqual([]);
  });
});
