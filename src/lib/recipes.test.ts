import { describe, it, expect } from "vitest";
import {
  searchRecipes,
  searchTechniques,
  searchableSpecies,
  searchableTechniques,
  recentCatchRecipes,
  especesSousRegime,
  especesANePasRelacher,
  recettesPresentables,
} from "./recipes";
import { RECIPES } from "../data/recipes";
import { CRAYFISH_RECIPES } from "../data/ecrevisses-recipes";
import { TECHNIQUES } from "../data/techniques";
import type { PersonalRecipe, Catch, CrayfishSession, Recipe } from "../types";

const GUIDE = [...RECIPES, ...CRAYFISH_RECIPES];

function perso(over: Partial<PersonalRecipe> = {}): PersonalRecipe {
  return {
    id: "p1",
    title: "Ma recette de gardon",
    species: ["gardon"],
    ing: ["gardons", "farine"],
    steps: ["fariner", "frire"],
    created: "2026-07-01",
    ...over,
  };
}

describe("searchRecipes — texte", () => {
  it("trouve une recette accentuée avec une requête sans accent", () => {
    const hits = searchRecipes("peche", {}, GUIDE, []);
    // "pêche" apparaît dans plusieurs intro/titres du corpus — la normalisation
    // doit faire correspondre "peche" (sans accent) à "pêche" (avec accent).
    expect(hits.length).toBeGreaterThan(0);
  });

  it("requête vide renvoie tout le corpus (guide + perso)", () => {
    const p = perso();
    const hits = searchRecipes("", {}, GUIDE, [p]);
    expect(hits.length).toBe(GUIDE.length + 1);
  });

  it("cherche aussi dans les recettes personnelles (titre et ingrédients)", () => {
    const p = perso({ title: "Truite fumée maison", ing: ["truite", "sel", "hêtre"] });
    expect(searchRecipes("hêtre", {}, [], [p])).toHaveLength(1);
    expect(searchRecipes("HETRE", {}, [], [p])).toHaveLength(1); // sans accent, majuscules
  });

  it("une requête sans correspondance renvoie un tableau vide", () => {
    expect(searchRecipes("zzz-introuvable-zzz", {}, GUIDE, [perso()])).toEqual([]);
  });

  it("trouve une recette du guide par le nom de l'espèce liée, même absent du titre", () => {
    // "fario" n'apparaît dans aucun titre/intro/ingrédient de "Truite à la meunière" ou
    // "Truite au bleu" — seul le nom de l'espèce liée ("Truite fario") le porte. C'est
    // exactement ce que prefill le chip "D'après vos prises" dans CarnetRecettes quand
    // on clique une suggestion truite-fario : la recherche doit trouver ces recettes.
    const hits = searchRecipes("fario", {}, GUIDE, []);
    const ids = hits.filter((h) => h.kind === "guide").map((h) => h.recipe.id);
    expect(ids).toContain("truite-meuniere");
    expect(ids).toContain("truite-au-bleu");
  });
});

describe("searchRecipes — filtre espèce", () => {
  it("ne garde que les recettes (guide et perso) visant l'espèce choisie", () => {
    const p = perso({ species: ["gardon"] });
    const hits = searchRecipes("", { especeId: "brochet" }, GUIDE, [p]);
    expect(hits.every((h) => h.recipe.species.includes("brochet"))).toBe(true);
    expect(hits.some((h) => h.kind === "perso")).toBe(false); // la perso vise gardon, pas brochet
  });
});

describe("searchRecipes — filtre difficulté/temps et bivouac", () => {
  it("exclut les recettes personnelles dès qu'un filtre temps est actif — elles n'ont pas ce champ", () => {
    const p = perso();
    const hits = searchRecipes("", { maxMinutes: 45 }, GUIDE, [p]);
    expect(hits.every((h) => h.kind === "guide")).toBe(true);
  });

  it("exclut les recettes personnelles dès que bivouacOnly est actif", () => {
    const p = perso();
    const hits = searchRecipes("", { bivouacOnly: true }, GUIDE, [p]);
    expect(hits.every((h) => h.kind === "guide")).toBe(true);
    expect(hits.every((h) => (h.recipe as (typeof GUIDE)[number]).bivouac === true)).toBe(true);
  });

  it("le calcul du temps traite cook===0 comme « pas de cuisson chiffrée », jamais additionné", () => {
    // La recette de conserves d'alose porte cook: 0 délibérément (voir Fiche.tsx et le
    // chantier comestibilité) — elle ne doit jamais apparaître dans un bucket de temps
    // sur la seule valeur de prep traitée comme si cook valait 0 minutes de cuisson.
    const conserves = GUIDE.find((r) => r.id === "conserves-alose-bordelaise")!;
    expect(conserves.cook).toBe(0);
    const hits20 = searchRecipes("", { maxMinutes: 20 }, GUIDE, []);
    const hits45 = searchRecipes("", { maxMinutes: 45 }, GUIDE, []);
    // Avec cook:0, si le calcul faisait prep+cook=prep=40, elle rentrerait dans le seau
    // 45 min alors que sa préparation N'EST PAS terminée à ce stade (stérilisation non
    // chiffrée à part). Elle doit être absente des deux seaux — ni "vite fait", ni
    // faussement classée par un temps qui ne représente pas la recette entière.
    expect(hits20.some((h) => h.recipe.id === "conserves-alose-bordelaise")).toBe(false);
    expect(hits45.some((h) => h.recipe.id === "conserves-alose-bordelaise")).toBe(false);
  });

  it("filtres cumulés : espèce ET temps agissent comme un ET logique", () => {
    const hits = searchRecipes("", { especeId: "brochet", maxMinutes: 45 }, GUIDE, []);
    for (const h of hits) {
      expect(h.kind).toBe("guide"); // perso=[] passé ci-dessus, donc rien d'autre n'est possible
      if (h.kind !== "guide") continue; // narrowing pour TS
      expect(h.recipe.species.includes("brochet")).toBe(true);
      expect(h.recipe.cook).toBeGreaterThan(0); // exclut cook:0 par construction ci-dessus
      expect(h.recipe.prep + h.recipe.cook).toBeLessThanOrEqual(45);
    }
  });
});

describe("searchRecipes — noms vernaculaires (lib/recherche.ts)", () => {
  // Le module cuisine se cherche avec les mots du bord de l'eau, pas ceux du
  // TAXREF. « barbotte » et « miroir » n'apparaissent NULLE PART dans le texte
  // des recettes concernées (vérifié) : seul l'alias d'espèce peut les relier.
  it("« barbotte » trouve la friture de poisson-chat", () => {
    const ids = searchRecipes("barbotte", {}, GUIDE, []).map((h) => h.recipe.id);
    expect(ids).toContain("poisson-chat-frit-depouille");
  });

  it("« miroir » trouve les recettes de carpe commune (variété d'écailles, pas une espèce)", () => {
    const ids = searchRecipes("miroir", {}, GUIDE, []).map((h) => h.recipe.id);
    expect(ids).toContain("carpe-a-la-chambord");
  });

  it("« calicoba » trouve la friture de perche-soleil — l'invasive qu'on doit tuer", () => {
    const ids = searchRecipes("calicoba", {}, GUIDE, []).map((h) => h.recipe.id);
    expect(ids).toContain("friture-perche-soleil");
  });
});

describe("searchRecipes — pertinence", () => {
  it("un titre qui porte le mot passe devant une recette qui ne l'a qu'en ingrédient", () => {
    // « beurre » est dans le TITRE de « Sandre & brochet au beurre blanc » (13ᵉ du
    // corpus) et dans les INGRÉDIENTS de recettes qui la précèdent dans le
    // fichier. Sans classement, l'ordre du fichier gagne et la recette qui parle
    // vraiment de beurre blanc arrive après celles qui en mettent une noisette.
    const hits = searchRecipes("beurre", {}, GUIDE, []);
    const ids = hits.map((h) => h.recipe.id);
    expect(ids.length).toBeGreaterThan(1);
    expect(ids[0]).toBe("sandre-brochet-au-beurre-blanc");
  });

  it("le classement ne perd aucun résultat", () => {
    const avant = searchRecipes("truite", {}, GUIDE, []).map((h) => h.recipe.id).sort();
    expect(avant.length).toBeGreaterThan(0);
    expect(new Set(avant).size).toBe(avant.length);
  });
});

describe("searchRecipes — filtre difficulté", () => {
  it("ne garde que les recettes du niveau demandé", () => {
    const hits = searchRecipes("", { difficulty: 1 }, GUIDE, []);
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) {
      expect(h.kind).toBe("guide");
      if (h.kind !== "guide") continue;
      expect(h.recipe.difficulty).toBe(1);
    }
  });

  it("exclut les recettes personnelles — elles ne portent aucune difficulté", () => {
    const hits = searchRecipes("", { difficulty: 1 }, GUIDE, [perso()]);
    expect(hits.every((h) => h.kind === "guide")).toBe(true);
  });
});

describe("searchRecipes — filtre technique", () => {
  it("ne garde que les recettes qui déclarent la technique", () => {
    const hits = searchRecipes("", { techniqueId: "degorgeage" }, GUIDE, []);
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) {
      expect(h.kind).toBe("guide");
      if (h.kind !== "guide") continue;
      expect(h.recipe.techniques ?? []).toContain("degorgeage");
    }
  });

  it("exclut les recettes personnelles — elles ne déclarent aucune technique", () => {
    const hits = searchRecipes("", { techniqueId: "degorgeage" }, GUIDE, [perso()]);
    expect(hits.every((h) => h.kind === "guide")).toBe(true);
  });
});

describe("searchRecipes — filtre « à ne pas relâcher »", () => {
  it("ne garde que les recettes d'espèces dont la remise à l'eau vivante est interdite", () => {
    const hits = searchRecipes("", { nePasRelacherOnly: true }, GUIDE, []);
    const ids = hits.map((h) => h.recipe.id);
    // Le cas d'usage qui a motivé l'ajout de ces recettes : l'app INTERDIT de
    // remettre ces poissons vivants à l'eau, elle doit dire quoi en faire.
    expect(ids).toContain("friture-perche-soleil");
    expect(ids).toContain("poisson-chat-frit-depouille");
    // Les écrevisses pêchables sont dans le même régime (R432-5).
    expect(ids).toContain("ecrevisses-a-la-nage");
    // La truite fario n'est pas invasive : elle ne doit pas passer.
    expect(ids).not.toContain("truite-meuniere");
  });
});

describe("especesANePasRelacher", () => {
  it("liste les espèces invasives qui ont réellement une recette, avec leur nom affichable", () => {
    const out = especesANePasRelacher(GUIDE);
    const ids = out.map((e) => e.id);
    expect(ids).toContain("perche-soleil");
    expect(ids).toContain("poisson-chat");
    expect(ids).toContain("silure");
    expect(ids).toContain("louisiane");
    expect(out.find((e) => e.id === "perche-soleil")?.name).toBe("Perche soleil");
    expect(out.every((e) => e.count > 0)).toBe(true);
  });

  it("ne liste aucune espèce dépourvue de recette", () => {
    const out = especesANePasRelacher([]);
    expect(out).toEqual([]);
  });
});

describe("garde des espèces interdites — la règle de peche-interdite.ts", () => {
  const esturgeon: Recipe = {
    id: "recette-interdite-de-test",
    species: ["esturgeon-europeen"], // protected: true dans species-base.ts
    title: "Esturgeon au court-bouillon",
    origin: "Test",
    difficulty: 1,
    prep: 10,
    cook: 10,
    ing: ["esturgeon"],
    steps: ["ne jamais faire ça"],
  };

  it("une recette visant une espèce protégée ne sort JAMAIS de la recherche", () => {
    const hits = searchRecipes("esturgeon", {}, [...GUIDE, esturgeon], []);
    expect(hits.map((h) => h.recipe.id)).not.toContain("recette-interdite-de-test");
  });

  it("recettesPresentables retire la recette d'une espèce protégée", () => {
    expect(recettesPresentables([esturgeon])).toEqual([]);
  });

  it("une espèce protégée n'est jamais proposée comme entrée de recherche", () => {
    expect(searchableSpecies([...GUIDE, esturgeon])).not.toContain("esturgeon-europeen");
  });

  // Le régime spécial n'est PAS la protection : aloses, anguille et lamproies
  // restent légalement pêchables selon le bassin, et la fiche espèce montre déjà
  // leurs recettes — avec un avertissement. Les cacher ici fabriquerait une
  // seconde vérité ; les montrer sans l'avertissement serait le contournement.
  it("une recette d'espèce sous régime spécial reste trouvable", () => {
    const ids = searchRecipes("matelote", {}, GUIDE, []).map((h) => h.recipe.id);
    expect(ids).toContain("matelote-d-anguille-au-vin-rouge");
  });

  it("la suggestion « d'après vos prises » ne peut pas proposer une espèce protégée", () => {
    const catches: Catch[] = [
      {
        slot: "c1",
        sp: "Esturgeon",
        spid: "esturgeon-europeen",
        iso: "2026-07-20",
        size: "80 cm",
        n: 80,
        date: "2026-07-20",
        place: "Test",
        kept: false,
      },
    ];
    expect(recentCatchRecipes(catches, [], [...GUIDE, esturgeon])).toEqual([]);
  });

  it("especesSousRegime nomme les espèces de la recette qui sont sous régime spécial", () => {
    const matelote = GUIDE.find((r) => r.id === "matelote-d-anguille-au-vin-rouge")!;
    expect(especesSousRegime(matelote)).toContain("Anguille européenne");
    const truite = GUIDE.find((r) => r.id === "truite-meuniere")!;
    expect(especesSousRegime(truite)).toEqual([]);
  });
});

describe("searchableTechniques", () => {
  it("ne liste que les techniques réellement utilisées par au moins une recette", () => {
    const utilisees = searchableTechniques(GUIDE).map((t) => t.id);
    expect(utilisees).toContain("degorgeage");
    // Une technique du catalogue qu'aucune recette ne déclare n'a pas à figurer
    // dans un filtre qui mènerait à zéro résultat.
    const declarees = new Set(GUIDE.flatMap((r) => r.techniques ?? []));
    expect(utilisees.every((id) => declarees.has(id))).toBe(true);
  });
});

describe("searchTechniques", () => {
  it("trouve une technique par un mot de son résumé, sans accent", () => {
    const hits = searchTechniques("arete", TECHNIQUES);
    expect(hits.some((t) => t.id === "desaretage-brochet" || t.id === "arete-oseille")).toBe(true);
  });

  it("requête vide renvoie toutes les techniques", () => {
    expect(searchTechniques("", TECHNIQUES)).toHaveLength(TECHNIQUES.length);
  });
});

describe("searchableSpecies", () => {
  it("ne liste que des espèces qui apparaissent réellement dans au moins une recette", () => {
    const ids = searchableSpecies(GUIDE);
    expect(ids).toContain("brochet");
    // "vandoise" a une fiche espèce mais aucune recette dans ce corpus — absente ici.
    expect(ids).not.toContain("vandoise");
  });

  it("ne contient aucun doublon", () => {
    const ids = searchableSpecies(GUIDE);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("recentCatchRecipes", () => {
  const catchOf = (spid: string, iso: string, over: Partial<Catch> = {}): Catch => ({
    slot: `c-${spid}-${iso}`,
    sp: spid,
    spid,
    iso,
    size: "40 cm",
    n: 40,
    date: iso,
    place: "Test",
    kept: true,
    ...over,
  });

  it("sans historique, renvoie un tableau vide", () => {
    expect(recentCatchRecipes([], [], GUIDE)).toEqual([]);
  });

  it("ignore une espèce sans recette réelle", () => {
    // "vandoise" n'a aucune recette dans le corpus (voir searchableSpecies ci-dessus).
    const catches = [catchOf("vandoise", "2026-07-20")];
    expect(recentCatchRecipes(catches, [], GUIDE)).toEqual([]);
  });

  it("déduplique par espèce, garde l'occurrence la plus récente, plafonne à 3", () => {
    const catches = [
      catchOf("brochet", "2026-07-01"),
      catchOf("brochet", "2026-07-20"), // plus récente — celle-ci doit compter
      catchOf("sandre", "2026-07-15"),
      catchOf("carpe", "2026-07-10"),
      catchOf("anguille", "2026-07-05"),
    ];
    const out = recentCatchRecipes(catches, [], GUIDE);
    expect(out.length).toBeLessThanOrEqual(3);
    const especes = out.map((o) => o.speciesId);
    expect(new Set(especes).size).toBe(especes.length); // pas de doublon d'espèce
  });

  it("inclut les écrevisses via les sessions, pas seulement les poissons via les prises", () => {
    const sessions: CrayfishSession[] = [
      {
        id: "s1",
        iso: "2026-07-25",
        date: "25 juil. 2026",
        debut: new Date("2026-07-25").getTime(),
        fin: new Date("2026-07-25").getTime() + 3600_000,
        lieu: "Étang",
        intervalMin: 15,
        balances: [],
        tally: [{ spId: "louisiane", count: 2 }],
      },
    ];
    const out = recentCatchRecipes([], sessions, GUIDE);
    expect(out.some((o) => o.speciesId === "louisiane")).toBe(true);
  });
});
