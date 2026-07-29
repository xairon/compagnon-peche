import { describe, it, expect } from "vitest";
import {
  searchRecipes,
  searchTechniques,
  searchableSpecies,
  recentCatchRecipes,
} from "./recipes";
import { RECIPES } from "../data/recipes";
import { CRAYFISH_RECIPES } from "../data/ecrevisses-recipes";
import { TECHNIQUES } from "../data/techniques";
import type { PersonalRecipe, Catch, CrayfishSession } from "../types";

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
