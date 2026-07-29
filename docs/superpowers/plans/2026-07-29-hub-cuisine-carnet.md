# Hub Cuisine dans Carnet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un 4ᵉ segment « Recettes » dans Carnet avec recherche unifiée (recettes du guide, recettes personnelles, techniques), filtres, et une section « D'après vos prises » pilotée par l'historique réel du carnet — qui absorbe et retire les écrans séparés « Mes recettes » et « Techniques & gestes ».

**Architecture:** La logique de recherche/filtre/suggestion vit en fonctions pures et testées dans `src/lib/recipes.ts` (aucune donnée nouvelle, aucun nouveau catalogue — seulement des fonctions qui lisent `RECIPES`, `CRAYFISH_RECIPES`, `TECHNIQUES`, et ce que l'appelant leur passe). Un nouveau composant `src/components/CarnetRecettes.tsx` consomme ces fonctions et les composants déjà extraits `RecipeView`/`RecipeEditor`. Les écrans « Mes recettes » et la liste « Techniques » sont retirés une fois le nouveau composant vérifié — jamais avant, pour ne jamais laisser l'app sans point d'accès au contenu.

**Tech Stack:** React + TypeScript, Vitest.

## Global Constraints

- Après chaque tâche : `npx tsc -b`, `npx eslint src`, `npx vitest run` verts avant de commit.
- Réutiliser l'existant plutôt que dupliquer : `norm()` (`src/lib/helpers.ts`) pour la normalisation texte, `resolveSpeciesRef()` (`src/lib/recipes.ts`, déjà construite) pour résoudre un id entre poisson et écrevisse, les classes CSS `.search`/`.chips`/`.chip` (déjà utilisées dans `Especes.tsx`) pour la barre de recherche et les puces de filtre — **aucune nouvelle règle CSS n'est nécessaire pour ce chantier**, uniquement des classes déjà en place.
- Ne jamais retirer un écran tant que son remplaçant n'est pas vérifié en navigateur — Task 4 (retrait) est délibérément la dernière tâche de contenu, après Task 3 (le nouveau composant) et sa propre vérification.

### Décision prise pendant la planification (ne pas re-discuter)

La spec dit que les filtres Difficulté/Temps/Bivouac s'appliquent « au bloc Recettes »
(guide + personnelles mélangées). En relisant `PersonalRecipe` (`src/types.ts:224-233`),
ce type n'a **aucun** champ `difficulty`, `prep`, `cook` ni `bivouac` — seulement
`id, title, species[], photo?, ing[], steps[], note?, created`. Une recette personnelle ne
peut donc pas satisfaire un filtre sur une donnée qu'elle ne porte pas : lui attribuer une
valeur par défaut serait inventer une information qui n'existe pas.

Règle retenue : le filtre **Espèce** s'applique aux deux (les deux types ont `species[]`).
Les filtres **Difficulté/Temps** et **Bivouac**, quand actifs, **excluent les recettes
personnelles** du résultat plutôt que de leur inventer une valeur — elles réapparaissent dès
que ces filtres sont désactivés. La recherche texte s'applique aux deux dans tous les cas.

### Faits vérifiés (ne pas re-chercher)

- `norm()` existe déjà (`src/lib/helpers.ts:4-9`) : minuscules + retrait des diacritiques
  (NFD). C'est exactement la normalisation que la spec demande — à importer, pas à réécrire.
- `resolveSpeciesRef()` existe déjà (`src/lib/recipes.ts`, ajoutée lors du chantier
  précédent) : `{ kind: "fish" | "crayfish" | "unknown"; id: string; name: string }`.
- Le calcul du temps total d'une recette doit traiter `cook === 0` comme « pas de cuisson
  chiffrée » (la recette de conserves d'alose) — jamais `prep + 0` additionné et présenté
  comme un total. Même règle que celle déjà posée dans `Fiche.tsx`.
- `CrayfishSession.tally: { spId: string; count: number }[]`, triée par `debut` (timestamp
  numérique) dans `Carnet.tsx` existant.
- `Catch.iso` (`"yyyy-mm-dd"`) + `Catch.time?` (`"HH:MM"`) — pas de timestamp numérique
  direct sur `Catch`, mais combinable en `Date` pour un tri unifié avec les sessions
  d'écrevisses.
- `.chips`/`.chip` (`src/styles.css:257-270`) : ligne à défilement horizontal, puces à 44px
  (règle WCAG 2.5.5 déjà en place). `.search` (`src/styles.css:174-198`) : barre de
  recherche avec bouton d'effacement.

---

## Task 1: Fonctions de recherche, filtre et suggestions — TDD

**Files:**
- Modify: `src/lib/recipes.ts`
- Create: `src/lib/recipes.test.ts`

**Interfaces:**
- Consumes: `RECIPES` (`src/data/recipes.ts`), `CRAYFISH_RECIPES` (`src/data/ecrevisses-recipes.ts`), `TECHNIQUES` (`src/data/techniques.ts`), `norm` (`src/lib/helpers.ts`), `resolveSpeciesRef` (déjà dans ce fichier), `Recipe`/`PersonalRecipe`/`Technique`/`Catch`/`CrayfishSession` (`src/types.ts`).
- Produces (exports ajoutés à `src/lib/recipes.ts`) :
  - `type RecipeFilters = { especeId?: string; maxMinutes?: 20 | 45; bivouacOnly?: boolean }`
  - `type RecipeHit = { kind: "guide"; recipe: Recipe } | { kind: "perso"; recipe: PersonalRecipe }`
  - `function searchRecipes(query: string, filters: RecipeFilters, guide: Recipe[], perso: PersonalRecipe[]): RecipeHit[]`
  - `function searchTechniques(query: string, techniques: Technique[]): Technique[]`
  - `function searchableSpecies(guide: Recipe[]): string[]` — ids uniques, dans l'ordre d'apparition
  - `function recentCatchRecipes(catches: Catch[], sessions: CrayfishSession[], guide: Recipe[]): { speciesId: string; speciesName: string; recipes: Recipe[] }[]` (au plus 3)

- [ ] **Step 1: Écrire les tests d'abord**

Créer `src/lib/recipes.test.ts` :

```ts
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
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/lib/recipes.test.ts`
Expected: FAIL — `searchRecipes`, `searchTechniques`, `searchableSpecies`, `recentCatchRecipes` n'existent pas encore.

- [ ] **Step 3: Implémenter**

Dans `src/lib/recipes.ts`, ajouter les imports nécessaires en tête de fichier (en plus de l'existant) :

```ts
import { norm } from "./helpers";
import { TECHNIQUES } from "../data/techniques";
import type { Recipe, PersonalRecipe, Technique, Catch, CrayfishSession } from "../types";
```

(Retirer l'import `Recipe`-seul existant s'il fait doublon — ne garder qu'une ligne d'import de types.)

Puis ajouter, à la fin du fichier :

```ts
export type RecipeFilters = {
  especeId?: string;
  maxMinutes?: 20 | 45;
  bivouacOnly?: boolean;
};

export type RecipeHit =
  | { kind: "guide"; recipe: Recipe }
  | { kind: "perso"; recipe: PersonalRecipe };

/** Texte cherchable d'une recette du guide : titre, ingrédients, et les noms des
 *  techniques liées (pour qu'une recherche sur "ikejime" trouve les recettes qui
 *  l'utilisent même si le mot n'apparaît nulle part dans leur texte). */
function guideHaystack(r: Recipe): string {
  const techNames = (r.techniques ?? [])
    .map((id) => TECHNIQUES.find((t) => t.id === id)?.name)
    .filter(Boolean)
    .join(" ");
  return norm([r.title, ...r.ing, techNames].join(" "));
}

function persoHaystack(r: PersonalRecipe): string {
  return norm([r.title, ...r.ing].join(" "));
}

/** Durée totale d'une recette, en traitant cook===0 comme "non chiffrée" — jamais
 *  additionnée à prep comme si c'était un vrai total (voir la recette de conserves
 *  d'alose : cook:0 est délibéré, la stérilisation n'a pas de durée sûre à afficher). */
function totalMinutes(r: Recipe): number | null {
  return r.cook > 0 ? r.prep + r.cook : null;
}

export function searchRecipes(
  query: string,
  filters: RecipeFilters,
  guide: Recipe[],
  perso: PersonalRecipe[],
): RecipeHit[] {
  const q = norm(query.trim());
  const hasTimeOrBivouac = filters.maxMinutes !== undefined || filters.bivouacOnly === true;

  const guideHits: RecipeHit[] = guide
    .filter((r) => !q || guideHaystack(r).includes(q))
    .filter((r) => !filters.especeId || r.species.includes(filters.especeId))
    .filter((r) => {
      if (filters.maxMinutes === undefined) return true;
      const total = totalMinutes(r);
      return total !== null && total <= filters.maxMinutes;
    })
    .filter((r) => !filters.bivouacOnly || r.bivouac === true)
    .map((recipe) => ({ kind: "guide" as const, recipe }));

  // Une recette personnelle n'a ni difficulty/prep/cook ni bivouac : dès qu'un de ces
  // deux filtres est actif, elle ne peut pas être évaluée honnêtement — on l'exclut
  // plutôt que de lui prêter une valeur qu'elle ne porte pas.
  const persoHits: RecipeHit[] = hasTimeOrBivouac
    ? []
    : perso
        .filter((r) => !q || persoHaystack(r).includes(q))
        .filter((r) => !filters.especeId || r.species.includes(filters.especeId))
        .map((recipe) => ({ kind: "perso" as const, recipe }));

  return [...guideHits, ...persoHits];
}

export function searchTechniques(query: string, techniques: Technique[]): Technique[] {
  const q = norm(query.trim());
  if (!q) return techniques;
  return techniques.filter((t) => norm(`${t.name} ${t.summary}`).includes(q));
}

/** Espèces réellement reliées à au moins une recette du guide — jamais le catalogue
 *  complet, qui mènerait en grande partie à zéro résultat une fois choisi. */
export function searchableSpecies(guide: Recipe[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of guide) {
    for (const id of r.species) {
      if (!seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  return out;
}

/** Jusqu'à 3 suggestions dérivées des prises réelles (poissons) et des relevés
 *  d'écrevisses (sessions), les plus récentes d'abord, dédupliquées par espèce, et
 *  seulement pour une espèce qui a au moins une vraie recette. */
export function recentCatchRecipes(
  catches: Catch[],
  sessions: CrayfishSession[],
  guide: Recipe[],
): { speciesId: string; speciesName: string; recipes: Recipe[] }[] {
  type Entry = { spid: string; whenMs: number };

  const fromCatches: Entry[] = catches.map((c) => ({
    spid: c.spid,
    whenMs: new Date(`${c.iso}T${c.time || "00:00"}`).getTime(),
  }));

  const fromSessions: Entry[] = sessions.flatMap((s) =>
    s.tally
      .filter((t) => t.count > 0)
      .map((t) => ({ spid: t.spId, whenMs: s.fin ?? s.debut })),
  );

  const merged = [...fromCatches, ...fromSessions].sort((a, b) => b.whenMs - a.whenMs);

  const seen = new Set<string>();
  const out: { speciesId: string; speciesName: string; recipes: Recipe[] }[] = [];
  for (const { spid } of merged) {
    if (seen.has(spid)) continue;
    seen.add(spid);
    const recipes = guide.filter((r) => r.species.includes(spid));
    if (recipes.length === 0) continue;
    out.push({ speciesId: spid, speciesName: resolveSpeciesRef(spid).name, recipes });
    if (out.length >= 3) break;
  }
  return out;
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Expected: tout vert, y compris `src/lib/recipes.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recipes.ts src/lib/recipes.test.ts
git commit -m "Cuisine : fonctions de recherche, filtres et suggestions par prises (TDD)"
```

---

## Task 2: Store et segment — brancher « Recettes » dans Carnet

**Files:**
- Modify: `src/store.tsx`
- Modify: `src/screens/Carnet.tsx`

**Interfaces:**
- Produces: `CarnetSeg` inclut `"recettes"`.
- Consumes: rien de nouveau côté données — ce composant affiche un placeholder, le vrai contenu arrive Task 3.

- [ ] **Step 1: Étendre `CarnetSeg`**

Dans `src/store.tsx`, remplacer :

```ts
export type CarnetSeg = "prises" | "spots" | "ecrevisses";
```

par :

```ts
export type CarnetSeg = "prises" | "spots" | "ecrevisses" | "recettes";
```

- [ ] **Step 2: Sortir Statistiques de la rangée segmentée, ajouter le 4ᵉ segment**

Dans `src/screens/Carnet.tsx`, remplacer le bloc (repéré par son commentaire) :

```tsx
        {/* v2 segmented control: Prises · Spots · Statistiques */}
        <div className="pf-seg">
          <button className={seg === "prises" ? "on" : ""} onClick={() => setSeg("prises")}>
            Prises
          </button>
          <button className={seg === "spots" ? "on" : ""} onClick={() => setSeg("spots")}>
            Spots · {spots.length}
          </button>
          <button className={seg === "ecrevisses" ? "on" : ""} onClick={() => setSeg("ecrevisses")}>
            Écrevisses · {sessions.length}
          </button>
          <button onClick={() => nav("statistiques")}>Statistiques ›</button>
        </div>
```

par :

```tsx
        {/* v2 segmented control : 4 vues mutuellement exclusives. Statistiques navigue
            ailleurs (ce n'est pas une vue de ce carnet) — elle vit donc à côté, pas dedans,
            depuis que ce carnet est passé à 4 segments réels. */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0 16px" }}>
          <div className="pf-seg" style={{ margin: 0, flex: 1 }}>
            <button className={seg === "prises" ? "on" : ""} onClick={() => setSeg("prises")}>
              Prises
            </button>
            <button className={seg === "spots" ? "on" : ""} onClick={() => setSeg("spots")}>
              Spots · {spots.length}
            </button>
            <button className={seg === "ecrevisses" ? "on" : ""} onClick={() => setSeg("ecrevisses")}>
              Écrevisses · {sessions.length}
            </button>
            <button className={seg === "recettes" ? "on" : ""} onClick={() => setSeg("recettes")}>
              Recettes
            </button>
          </div>
          <button className="link-inline" style={{ flexShrink: 0 }} onClick={() => nav("statistiques")}>
            Stats ›
          </button>
        </div>
```

(`.link-inline` existe déjà — utilisée par `TechniqueDetail` pour un lien texte similaire.)

- [ ] **Step 3: Rendu du segment (placeholder pour l'instant)**

Ajouter l'import en tête de `Carnet.tsx` :

```ts
import { CarnetRecettes } from "../components/CarnetRecettes";
```

Insérer, juste après le bloc `{seg === "ecrevisses" && (...)}` et avant le `<div>` du footer « 100 % local » :

```tsx
        {seg === "recettes" && <CarnetRecettes />}
```

- [ ] **Step 4: Composant minimal pour que ça compile**

Créer `src/components/CarnetRecettes.tsx` avec un contenu minimal (Task 3 le remplace entièrement) :

```tsx
export function CarnetRecettes() {
  return <div style={{ marginTop: 14 }}>Recettes — à venir.</div>;
}
```

- [ ] **Step 5: Vérifier**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Expected: vert.

- [ ] **Step 6: Commit**

```bash
git add src/store.tsx src/screens/Carnet.tsx src/components/CarnetRecettes.tsx
git commit -m "Carnet : 4e segment Recettes (placeholder), Statistiques sort de la rangée"
```

---

## Task 3: Composant CarnetRecettes — recherche, filtres, suggestions, création

**Files:**
- Modify: `src/components/CarnetRecettes.tsx`

**Interfaces:**
- Consumes: `searchRecipes`, `searchTechniques`, `searchableSpecies`, `recentCatchRecipes`, `resolveSpeciesRef` (Task 1, `src/lib/recipes.ts`) ; `RecipeView`, `RecipeEditor` (`src/screens/RecipeView.tsx`, `src/screens/RecipeEditor.tsx`) ; `RECIPES`, `CRAYFISH_RECIPES`, `TECHNIQUES`, `SAFETY` ; `hasMedia`/`Media`.

- [ ] **Step 1: Écrire le composant complet**

Remplacer tout le contenu de `src/components/CarnetRecettes.tsx` par :

```tsx
import { useMemo, useState } from "react";
import { useStore } from "../store-hooks";
import { RECIPES } from "../data/recipes";
import { CRAYFISH_RECIPES } from "../data/ecrevisses-recipes";
import { TECHNIQUES, SAFETY } from "../data/techniques";
import { Icon } from "../components/Icon";
import { ICONS } from "../components/icons-data";
import { Media } from "../components/Media";
import { hasMedia } from "../components/media-helpers";
import { usePhotoUrl } from "../lib/photos";
import {
  searchRecipes,
  searchTechniques,
  searchableSpecies,
  recentCatchRecipes,
  resolveSpeciesRef,
  spNames,
  type RecipeFilters,
} from "../lib/recipes";
import { RecipeView } from "../screens/RecipeView";
import { RecipeEditor } from "../screens/RecipeEditor";
import type { PersonalRecipe, Recipe } from "../types";

const DIFF_LABEL = ["", "Facile", "Moyen", "Difficile"];
const GUIDE = [...RECIPES, ...CRAYFISH_RECIPES];

export function CarnetRecettes() {
  const { state, nav } = useStore();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<RecipeFilters>({});
  const [editing, setEditing] = useState<PersonalRecipe | "new" | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const especeIds = useMemo(() => searchableSpecies(GUIDE), []);
  const suggestions = useMemo(
    () => recentCatchRecipes(state.catches, state.crayfish, GUIDE),
    [state.catches, state.crayfish],
  );

  const recipeHits = searchRecipes(q, filters, GUIDE, state.recipes);
  const techHits = searchTechniques(q, TECHNIQUES);

  const mine = state.recipes;
  if (editing) {
    return (
      <RecipeEditor
        initial={editing === "new" ? undefined : editing}
        onDone={(id) => {
          setEditing(null);
          if (id) setViewId(id);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }
  const viewed = viewId ? mine.find((r) => r.id === viewId) : null;
  if (viewId && viewed) {
    return (
      <RecipeView
        recipe={viewed}
        onBack={() => setViewId(null)}
        onEdit={() => {
          setEditing(viewed);
          setViewId(null);
        }}
      />
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      {suggestions.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="label" style={{ marginBottom: 7 }}>
            D'après vos prises
          </div>
          <div className="chips">
            {suggestions.map((s) => (
              <button
                key={s.speciesId}
                className="chip"
                onClick={() =>
                  s.recipes.length === 1
                    ? nav("recette", { recipeId: s.recipes[0].id })
                    : setQ(s.speciesName)
                }
              >
                {s.speciesName} · {s.recipes.length} recette{s.recipes.length > 1 ? "s" : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="search">
        <Icon d={ICONS.search} size={19} stroke="var(--muted)" width={1.6} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher (titre, ingrédient, technique…)"
        />
        {q.length > 0 && (
          <button className="clear" onClick={() => setQ("")} aria-label="Effacer la recherche">
            ✕
          </button>
        )}
      </div>

      <div className="chips" style={{ marginTop: 10 }}>
        <button
          className="chip"
          style={chipStyle(!filters.especeId)}
          onClick={() => setFilters((f) => ({ ...f, especeId: undefined }))}
        >
          Toutes espèces
        </button>
        {especeIds.map((id) => (
          <button
            key={id}
            className="chip"
            style={chipStyle(filters.especeId === id)}
            onClick={() => setFilters((f) => ({ ...f, especeId: id }))}
          >
            {resolveSpeciesRef(id).name}
          </button>
        ))}
      </div>

      <div className="chips" style={{ marginTop: 8 }}>
        <button
          className="chip"
          style={chipStyle(!filters.maxMinutes)}
          onClick={() => setFilters((f) => ({ ...f, maxMinutes: undefined }))}
        >
          Toutes durées
        </button>
        <button
          className="chip"
          style={chipStyle(filters.maxMinutes === 20)}
          onClick={() => setFilters((f) => ({ ...f, maxMinutes: 20 }))}
        >
          ≤ 20 min
        </button>
        <button
          className="chip"
          style={chipStyle(filters.maxMinutes === 45)}
          onClick={() => setFilters((f) => ({ ...f, maxMinutes: 45 }))}
        >
          ≤ 45 min
        </button>
        <button
          className="chip"
          style={chipStyle(filters.bivouacOnly === true)}
          onClick={() => setFilters((f) => ({ ...f, bivouacOnly: !f.bivouacOnly }))}
        >
          🏕️ Bivouac
        </button>
      </div>

      <button className="mr-create" style={{ marginTop: 14 }} onClick={() => setEditing("new")}>
        <Icon d="M12 5v14M5 12h14" size={20} stroke="#FBFAF7" width={1.8} />
        Créer une recette
      </button>
      <div className="mr-note">100 % local — liez-la à une espèce, avec photo, ingrédients, étapes et note.</div>

      <div className="label" style={{ margin: "18px 0 8px" }}>
        Recettes · {recipeHits.length}
      </div>
      {recipeHits.length === 0 && (
        <div className="empty-note">Aucune recette ne correspond à cette recherche.</div>
      )}
      <div className="mr-guide">
        {recipeHits.map((hit) =>
          hit.kind === "guide" ? (
            <GuideRow
              key={hit.recipe.id}
              r={hit.recipe}
              onOpen={() => nav("recette", { recipeId: hit.recipe.id })}
            />
          ) : (
            <PersoRow key={hit.recipe.id} r={hit.recipe} onOpen={() => setViewId(hit.recipe.id)} />
          ),
        )}
      </div>

      <div className="label" style={{ margin: "20px 0 8px" }}>
        Techniques · {techHits.length}
      </div>
      {techHits.length === 0 && (
        <div className="empty-note">Aucune technique ne correspond à cette recherche.</div>
      )}
      <div>
        {techHits.map((t) => (
          <button key={t.id} type="button" className="tile" onClick={() => nav("technique", { techId: t.id })}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{t.steps.length} étape(s)</div>
            </div>
            <span style={{ color: "#C9C3B4" }}>›</span>
          </button>
        ))}
      </div>

      <div className="label" style={{ margin: "20px 0 8px" }}>
        Sécurité sanitaire
      </div>
      <div className="safety-card">
        <p>
          <b>Parasites.</b> {SAFETY.parasites}
        </p>
        <p>
          <b>Congélation assainissante.</b> {SAFETY.congelation}
        </p>
        <p>
          <b>Mucus.</b> {SAFETY.mucus}
        </p>
        <div className="source">Source : {SAFETY.source}</div>
      </div>
    </div>
  );
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    border: `1px solid ${active ? "#16281E" : "#E6E2D8"}`,
    background: active ? "#16281E" : "#FFFFFF",
    color: active ? "#FBFAF7" : "#3A3E36",
  };
}

function GuideRow({ r, onOpen }: { r: Recipe; onOpen: () => void }) {
  const ref0 = resolveSpeciesRef(r.species[0]);
  return (
    <button className="card-row" onClick={onOpen}>
      <div className="mr-guide-thumb">
        {hasMedia("recipe", r.id) ? (
          <Media kind="recipe" id={r.id} placeholder={r.title} />
        ) : (
          <Media kind={ref0.kind === "crayfish" ? "crayfish" : "species"} id={r.species[0]} placeholder={r.title} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t">{r.title}</div>
        <div className="s">
          {spNames(r.species.slice(0, 2))} · {r.origin} · {DIFF_LABEL[r.difficulty]}
        </div>
      </div>
      <span className="chev">›</span>
    </button>
  );
}

function PersoRow({ r, onOpen }: { r: PersonalRecipe; onOpen: () => void }) {
  const url = usePhotoUrl(r.photo);
  return (
    <button className="card-row" onClick={onOpen}>
      <div className="mr-guide-thumb">
        {url ? (
          <img src={url} alt={r.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : r.species[0] ? (
          <Media kind="species" id={r.species[0]} placeholder={r.title} />
        ) : (
          <div className="mr-noimg">🍽️</div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t">{r.title}</div>
        <div className="s">
          Ma recette{r.species.length > 0 ? ` · ${spNames(r.species.slice(0, 1))}` : ""}
        </div>
      </div>
      <span className="chev">›</span>
    </button>
  );
}
```

Notes d'implémentation, à vérifier en écrivant :
- `spNames` est déjà exporté par `src/lib/recipes.ts` — confirmer que l'export existe toujours sous ce nom avant d'importer (il l'était avant ce chantier, Task 1 ne le supprime pas).
- La suggestion « D'après vos prises » ouvre directement la recette si l'espèce n'en a qu'une, sinon préremplit la recherche avec le nom de l'espèce (comportement simple, décrit dans la spec comme laissé à l'implémentation — pas un filtre `especeId` automatique, pour rester compréhensible : l'utilisateur voit sa recherche se remplir plutôt qu'un filtre invisible s'activer).

- [ ] **Step 2: Vérifier**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Expected: vert.

- [ ] **Step 3: Vérification navigateur**

Démarrer le serveur de dev. Carnet → segment Recettes. Confirmer :
- la barre de recherche trouve « pêche » en tapant « peche » (sans accent) ;
- le filtre Espèce restreint à une seule espèce ; le filtre Bivouac ne montre que des
  recettes du guide (jamais une recette perso, si tu en as créé une pour le test) ;
- créer une recette perso via « + Créer une recette », confirmer qu'elle apparaît ensuite
  dans les résultats avec le libellé « Ma recette » ;
- une recherche sur le nom d'une technique (ex. « ikejime ») fait remonter la fiche
  correspondante dans le bloc Techniques, atteignable en un tap ;
- le bloc « Sécurité sanitaire » est présent en bas.

- [ ] **Step 4: Commit**

```bash
git add src/components/CarnetRecettes.tsx
git commit -m "Cuisine : composant CarnetRecettes — recherche, filtres, suggestions, création"
```

---

## Task 4: Retirer les écrans absorbés

**Files:**
- Modify: `src/screens/Outils.tsx`
- Modify: `src/App.tsx`
- Modify: `src/store.tsx`
- Modify: `src/screens/Techniques.tsx`
- Delete: `src/screens/MesRecettes.tsx`

**Interfaces:**
- Consumes: rien de nouveau — cette tâche retire du code mort maintenant que Task 3 est vérifiée.

- [ ] **Step 1: Retirer les deux tuiles de la boîte à outils**

Dans `src/screens/Outils.tsx`, retirer les deux lignes du tableau `rows` :

```ts
    { title: "Techniques & gestes", sub: "Ikejime, désarêtage, garum… + sécurité sanitaire", icon: ICONS.cuisine, to: "techniques" },
```
et
```ts
    { title: "Mes recettes", sub: "Vos recettes perso, liées à une espèce — 100 % local", icon: ICONS.cuisine, to: "mes-recettes" },
```

- [ ] **Step 2: Retirer les routes devenues mortes**

Dans `src/store.tsx`, retirer `"techniques"` et `"mes-recettes"` de l'union `Screen` (garder `"technique"` — singulier, la fiche détail, qui reste utilisée).

Dans `src/App.tsx` :
- Retirer l'import `import { MesRecettes } from "./screens/MesRecettes";`
- Retirer le rendu `{s === "mes-recettes" && <MesRecettes />}`
- Retirer le rendu `{s === "techniques" && <Techniques />}`
- Remplacer le lazy-import groupé :
  ```ts
  const Techniques = lazy(() =>
    import("./screens/Techniques").then((m) => ({ default: m.Techniques })),
  );
  const TechniqueDetail = lazy(() =>
    import("./screens/Techniques").then((m) => ({ default: m.TechniqueDetail })),
  );
  ```
  par (ne garder que `TechniqueDetail`) :
  ```ts
  const TechniqueDetail = lazy(() =>
    import("./screens/Techniques").then((m) => ({ default: m.TechniqueDetail })),
  );
  ```

- [ ] **Step 3: Retirer le composant liste devenu mort**

Dans `src/screens/Techniques.tsx`, retirer entièrement la fonction exportée `Techniques()`
(lignes 17-77 dans sa version actuelle — de `export function Techniques() {` jusqu'à
l'accolade fermante juste avant `export function TechniqueDetail() {`) ainsi que la
constante `CAT` qui ne sert qu'à elle. Garder `TechniqueDetail` intact — c'est la fiche
détail d'une technique, toujours utilisée (depuis une recette, et maintenant depuis la
recherche de Task 3).

Retirer aussi les imports devenus inutiles dans ce fichier si `Techniques()` était la seule
consommatrice (vérifier au cas par cas — `RECIPES` reste utilisé par `TechniqueDetail` pour
`usedByRecipes`, `SAFETY` ne l'est plus si son seul usage était dans `Techniques()`).

- [ ] **Step 4: Supprimer `MesRecettes.tsx`**

```bash
git rm src/screens/MesRecettes.tsx
```

- [ ] **Step 5: Vérifier**

Run: `npx tsc -b && npx eslint src && npx vitest run && npm run build`
Expected: tout vert — un import ou une route oubliée pointant vers un fichier supprimé
casserait `tsc -b`, c'est le filet de sécurité de cette étape.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Cuisine : retrait des écrans absorbés (Mes recettes, liste Techniques)"
```

---

## Task 5: Vérification finale

**Files:** aucun.

- [ ] **Step 1:** `npx tsc -b && npx eslint src && npx vitest run && npm run build` — tout vert.
- [ ] **Step 2:** Au navigateur, confirmer qu'aucune tuile de la boîte à outils ne pointe
  plus vers un écran disparu (« Mes recettes » et « Techniques & gestes » ne sont plus
  listées).
- [ ] **Step 3:** Carnet → Recettes : refaire le parcours complet — recherche, les 3
  filtres, ouverture d'une recette du guide, ouverture d'une recette perso, ouverture d'une
  technique, création d'une nouvelle recette perso de bout en bout.
- [ ] **Step 4:** Confirmer que le lien « Stats › » sorti de la rangée segmentée mène
  toujours à l'écran Statistiques.
- [ ] **Step 5:** Ouvrir une recette qui a une technique liée (ex. `terrine-silure`),
  confirmer que la puce technique mène à `TechniqueDetail`, et que cette fiche affiche
  toujours son propre bloc « Recettes qui l'emploient ».
- [ ] **Step 6:** Console sans erreur. Arrêter le serveur. Pas de commit.

---

## Hors périmètre

- Toute suggestion algorithmique au-delà des prises/relevés réels (saison, météo, popularité).
- Modifier le contenu des recettes ou des techniques elles-mêmes.
- Le sélecteur de département (chantier séparé, demandé par ailleurs).
