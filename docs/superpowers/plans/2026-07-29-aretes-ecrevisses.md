# Tutoriels de gestion des arêtes et recettes d'écrevisses — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter les deux techniques de gestion des arêtes manquantes (lever un filet, entailler en croisillons), combler les trous réels des espèces de poisson à une seule recette, et créer les trois premières recettes d'écrevisses.

**Architecture:** Deux nouvelles entrées dans `TECHNIQUES` (aucun nouveau fichier). Un nouveau fichier `src/data/ecrevisses-recipes.ts` exportant `CRAYFISH_RECIPES: Recipe[]` — même type que les recettes de poisson, tableau séparé parce que `Recipe.species[]` référence deux catalogues d'ids disjoints (`SPECIES` pour les poissons, `ECREVISSES` pour les écrevisses) et qu'un test existant interdit qu'une recette de poisson cite un id hors de `SPECIES`. `lib/recipes.ts` gagne une fonction unique `resolveSpeciesRef` qui sait résoudre un id dans l'un ou l'autre catalogue, utilisée par `Recette.tsx` pour que l'écran de détail fonctionne à l'identique pour les deux domaines sans dupliquer de rendu.

**Tech Stack:** React + TypeScript, Vitest.

## Global Constraints

- Après chaque tâche : `npx tsc -b`, `npx eslint src`, `npx vitest run` verts avant de commit.
- **Rien n'est inventé.** Toute technique et toute recette doit correspondre à une pratique réelle ; si une recherche ne confirme rien, le dire et ne pas ajouter le contenu plutôt que de combler un vide par une supposition plausible.
- **Origine géographique** : la technique d'entaille en croisillons est vérifiée comme répandue en Europe centrale et orientale — ne jamais lui attribuer une origine plus précise (« polonaise ») qu'une source ne confirme.
- Ne jamais affaiblir un test qui échoue : soit c'est une régression réelle à corriger, soit le test épingle une valeur qui a changé et se met à jour délibérément (le test `"compte actuellement 18 recettes"` de `src/data/recipes.test.ts` **doit** être mis à jour si des recettes de poisson sont ajoutées — jamais supprimé).
- Format des données : suivre exactement la forme des entrées existantes dans `TECHNIQUES`/`RECIPES` (mêmes champs, même registre de langue, mêmes conventions de sourçage).

### Décision prise pendant la planification (ne pas re-discuter)

La spec envisageait de référencer `entaille-croisillons` depuis `friture-poissons-blancs` et `terrine-cyprinides` via leur champ `techniques[]`. En relisant ces deux recettes, aucune des deux n'utilise réellement l'entaille en croisillons dans ses étapes (l'une frit sans entailler, l'autre hache) : y attacher la technique affirmerait qu'elle est utilisée alors qu'elle ne l'est pas — exactement la classe d'erreur que ce projet corrige depuis le début de ce chantier. La technique reste donc reliée aux espèces uniquement via `speciesNote` (comme `garum`, qui n'est cité par aucune recette et reste atteignable directement depuis l'écran Techniques). Task 2 applique cette décision.

### Faits vérifiés (ne pas re-chercher)

- **Entaille en croisillons** : entailles parallèles espacées de moins de 4 mm, jusqu'à l'arête centrale sans la sectionner, sur poisson entier écaillé et vidé (pas sur un filet levé) ; friture immédiate à très forte température (≥ 180 °C), qui dissout les petites arêtes sectionnées. Documentée pour carassin, petit brochet (< 1 kg), petit barbeau, brème, gardon. Répandue en Europe centrale et orientale ; aucune source consultée ne permet une attribution nationale plus précise.
- Le barbeau a des œufs toxiques quel que soit le mode de cuisson (rappel déjà établi dans `edibility.ts` et dans `terrine-cyprinides`) — toute mention du barbeau dans une nouvelle technique doit le rappeler.
- Écrevisses pêchables : `louisiane`, `americaine`, `signal` (ids dans `src/data/ecrevisses.ts`). Les trois autres (`pattes-blanches`, `pattes-grelles`, `pattes-rouges`) sont fermées toute l'année — aucune recette ne doit les citer.

---

## Task 1: Technique — Lever un filet

**Files:**
- Modify: `src/data/techniques.ts`

**Interfaces:**
- Produces: une nouvelle entrée `TECHNIQUES` d'id `"lever-filet"`, catégorie `"preparation"`.

- [ ] **Step 1: Ajouter la technique**

Dans `src/data/techniques.ts`, ajouter au tableau `TECHNIQUES` (avant l'entrée `desaretage-brochet`, puisque cette dernière suppose déjà le filet levé et peut ainsi la suivre logiquement dans l'écran) :

```ts
  {
    id: "lever-filet",
    name: "Lever un filet",
    category: "preparation",
    summary:
      "Le geste de base pour tout poisson rond (brochet, sandre, perche, silure, carpe…) : séparer deux filets de l'arête centrale au couteau à fileter. Toutes les autres techniques de préparation le supposent déjà acquis.",
    steps: [
      { title: "Poisson vidé, écaillé, séché", detail: "Posez le poisson à plat sur une planche stable, tête vers votre main non dominante." },
      { title: "Incision derrière la tête", detail: "Incisez juste derrière les ouïes, en biais, jusqu'à sentir l'arête centrale, sans la trancher." },
      { title: "Longer l'arête", detail: "Couchez la lame à plat contre l'arête centrale et tranchez vers la queue en gardant le fil au contact de l'os, en une seule passe si possible." },
      { title: "Détacher et retourner", detail: "Séparez le filet au ras de la queue, retournez le poisson et répétez la même incision de l'autre côté." },
      { title: "Parer", detail: "Retirez la cage thoracique (arêtes de ventre) au couteau ; passez les doigts le long du filet pour repérer d'éventuelles arêtes de ligne latérale restantes." },
    ],
    tools: ["Couteau à fileter souple", "Planche"],
    source: "Technique de base du couteau à fileter, savoir-faire culinaire classique.",
  },
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Expected: vert — les tests génériques de `src/data/recipes.test.ts` (liens `speciesNote`) passent trivialement puisque cette technique n'en a pas.

- [ ] **Step 3: Commit**

```bash
git add src/data/techniques.ts
git commit -m "Technique : lever un filet"
```

---

## Task 2: Technique — Entailler en croisillons

**Files:**
- Modify: `src/data/techniques.ts`

**Interfaces:**
- Produces: une nouvelle entrée `TECHNIQUES` d'id `"entaille-croisillons"`.

- [ ] **Step 1: Ajouter la technique**

Toujours dans `src/data/techniques.ts`, ajouter après `sterilisation-arete` et avant `garum` (elle appartient, comme les deux qui l'entourent, aux techniques de gestion des arêtes plutôt qu'à l'abattage) :

```ts
  {
    id: "entaille-croisillons",
    name: "Entailler en croisillons",
    category: "preparation",
    summary:
      "Sur un petit poisson très arêté, entailler la chair en fines lignes parallèles jusqu'à l'arête centrale sectionne les petites arêtes intramusculaires, que la friture à très forte température dissout ensuite. S'applique au poisson entier, pas à un filet levé.",
    steps: [
      { title: "Poisson entier, écaillé et vidé", detail: "Cette technique se pratique sur le poisson entier, écaillé, vidé et bien séché — pas sur un filet." },
      { title: "Entailles parallèles", detail: "Au couteau bien affûté, entaillez la chair en lignes parallèles espacées de moins de 4 mm, sur les deux flancs, jusqu'à l'arête centrale sans la sectionner." },
      { title: "Croisillon sur les sujets très arêtés", detail: "Répétez en diagonale pour obtenir un quadrillage si le poisson est particulièrement arêté ; plus l'entaille est fine, plus les petites arêtes seront sectionnées." },
      { title: "Friture immédiate à très forte température", detail: "Plongez sans attendre dans une huile à 180 °C ou plus : la chaleur intense dissout les fines arêtes sectionnées, qui deviennent imperceptibles à la dégustation." },
    ],
    tools: ["Couteau bien affûté", "Bain de friture"],
    source: "Pratique documentée en Europe centrale et orientale pour les poissons d'eau douce très arêtés — aucune source consultée ne permet d'en confirmer une origine nationale plus précise.",
    speciesNote: [
      ["carassin", "Poisson idéal pour cette technique — petit, très arêté, se prête bien au quadrillage."],
      ["brochet", "Réservée aux petits sujets (moins d'1 kg) ; sur un gros brochet, préférez le désarêtage ou le mixage en quenelles."],
      ["barbeau", "Fonctionne sur les petits sujets. Ses œufs restent toxiques quel que soit le mode de cuisson — videz soigneusement avant toute préparation."],
      ["breme", "Chair fine et arêtée : bon candidat pour l'entaille en croisillons."],
      ["gardon", "Petit poisson blanc classique de cette préparation."],
    ],
  },
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Expected: vert — le test générique `"chaque Technique.speciesNote id résout dans SPECIES"` couvre automatiquement les cinq ids ajoutés (carassin, brochet, barbeau, breme, gardon existent tous déjà dans `SPECIES`).

- [ ] **Step 3: Commit**

```bash
git add src/data/techniques.ts
git commit -m "Technique : entailler en croisillons (poisson très arêté)"
```

---

## Task 3: Modèle de données — recettes d'écrevisses

**Files:**
- Create: `src/data/ecrevisses-recipes.ts`
- Create: `src/data/ecrevisses-recipes.test.ts`

**Interfaces:**
- Consumes: `Recipe` (type, `src/types.ts`), `ECREVISSES`/`crayfishById`/`PECHABLES` (`src/data/ecrevisses.ts`).
- Produces: `CRAYFISH_RECIPES: Recipe[]`, consommé par Task 5.

- [ ] **Step 1: Écrire le fichier de test d'abord**

Créer `src/data/ecrevisses-recipes.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { CRAYFISH_RECIPES } from "./ecrevisses-recipes";
import { ECREVISSES, crayfishById } from "./ecrevisses";
import { RECIPE_MEDIA } from "./media";

describe("recettes d'écrevisses", () => {
  it("existe au moins une recette", () => {
    expect(CRAYFISH_RECIPES.length).toBeGreaterThan(0);
  });

  it("les identifiants sont uniques", () => {
    const ids = CRAYFISH_RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("chaque Recipe.species[] id résout dans ECREVISSES", () => {
    const ids = new Set(ECREVISSES.map((e) => e.id));
    const fautes: string[] = [];
    for (const r of CRAYFISH_RECIPES) {
      for (const spId of r.species) {
        if (!ids.has(spId)) fautes.push(`${r.id} → ${spId}`);
      }
    }
    expect(fautes).toEqual([]);
  });

  // On ne cuisine pas une espèce qu'on ne peut pas prélever : symétrique au
  // test côté poissons qui interdit une recette sur une espèce EDIBILITY "non".
  it("aucune recette ne vise une écrevisse fermée (pechable: false)", () => {
    const fautes: string[] = [];
    for (const r of CRAYFISH_RECIPES) {
      for (const spId of r.species) {
        if (crayfishById(spId)?.pechable === false) fautes.push(`${r.id} → ${spId}`);
      }
    }
    expect(fautes).toEqual([]);
  });

  it("chaque recette a un safety décrivant une cuisson à cœur, sans avis sanitaire inventé", () => {
    for (const r of CRAYFISH_RECIPES) {
      expect(r.safety, `${r.id}.safety`).toBeTruthy();
      // Aucune donnée ANSES/PCB n'existe pour les écrevisses dans ce projet —
      // en inventer une contredirait la règle "rien n'est inventé".
      expect(r.safety, `${r.id}.safety ne doit pas inventer un avis ANSES`).not.toMatch(/ANSES/i);
    }
  });

  it("chaque fichier de RECIPE_MEDIA cité par une recette d'écrevisse existe sous public/", () => {
    const ids = new Set(CRAYFISH_RECIPES.map((r) => r.id));
    const manquants = Object.entries(RECIPE_MEDIA)
      .filter(([id]) => ids.has(id))
      .filter(([, m]) => !existsSync(join(process.cwd(), "public", m.file)))
      .map(([id, m]) => `${id} → ${m.file}`);
    expect(manquants).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/data/ecrevisses-recipes.test.ts`
Expected: FAIL — le module `./ecrevisses-recipes` n'existe pas encore.

- [ ] **Step 3: Créer le fichier vide typé**

Créer `src/data/ecrevisses-recipes.ts` :

```ts
import type { Recipe } from "../types";

// Recettes d'écrevisses. Même type que les recettes de poisson (src/data/recipes.ts),
// tableau séparé parce que `species[]` référence ici ECREVISSES, pas SPECIES — un
// test dédié (ecrevisses-recipes.test.ts) garde cette séparation.
export const CRAYFISH_RECIPES: Recipe[] = [];
```

- [ ] **Step 4: Lancer, confirmer l'échec attendu (tableau vide)**

Run: `npx vitest run src/data/ecrevisses-recipes.test.ts`
Expected: FAIL sur `"existe au moins une recette"` uniquement (le module existe maintenant, les autres assertions passent trivialement sur un tableau vide).

- [ ] **Step 5: Commit le scaffolding**

```bash
git add src/data/ecrevisses-recipes.ts src/data/ecrevisses-recipes.test.ts
git commit -m "Écrevisses : scaffolding des recettes (TDD, tableau vide)"
```

---

## Task 4: Contenu — trois recettes d'écrevisses

**Files:**
- Modify: `src/data/ecrevisses-recipes.ts`

**Interfaces:**
- Consumes: le scaffolding de Task 3.
- Produces: `CRAYFISH_RECIPES` peuplé de trois entrées.

Cette tâche demande de la recherche et de la rédaction, pas de la transcription — comme la terrine de cyprinidés du chantier précédent. Les trois plats sont fixés par la spec (bisque, à la nage, gratin), leur contenu exact ne l'est pas.

- [ ] **Step 1: Rechercher les trois préparations**

Pour chacune des trois — **bisque d'écrevisses**, **écrevisses à la nage**, **gratin d'écrevisses (sauce Nantua)** — vérifier par une recherche que la préparation est une tradition française réellement documentée (elles le sont toutes les trois de façon large et connue, mais la source précise à citer dans `source`/`author` doit être vérifiée, pas inventée — suivre la même discipline que les citations déjà en place dans `recipes.ts`, par exemple « Menon · La Cuisinière bourgeoise, 1746 » pour la matelote d'anguille). Le gratin sauce Nantua en particulier doit citer d'où vient le nom (la ville de Nantua, Ain) si la recherche le confirme.

- [ ] **Step 2: Écrire les trois recettes**

Ajouter les trois entrées à `CRAYFISH_RECIPES` (`src/data/ecrevisses-recipes.ts`), en suivant exactement la forme des entrées de `src/data/recipes.ts` (lire `terrine-silure` et `matelote-d-anguille-au-vin-rouge` comme modèles de registre et de structure) :

- `species` : `["louisiane", "americaine", "signal"]` pour chacune, sauf si la recherche établit qu'une préparation privilégie réellement une espèce (par exemple la taille de la Louisiane pour un service à la nage) — dans ce cas le dire dans `intro`, pas en excluant les deux autres du tableau `species` sans raison.
- `id`, `title`, `origin`, `difficulty`, `prep`, `cook`, `rest?`, `tools`, `ing`, `steps` : cohérents et vérifiables (une vraie température ou un vrai repère de cuisson — les carapaces qui rougissent, la chair qui devient opaque — pas « jusqu'à cuisson »).
- `safety` : doit couvrir la cuisson à cœur (repère concret : carapace rouge vif, chair opaque et ferme) et **ne doit inventer aucun avis de type ANSES** — aucune donnée de contamination n'existe pour les écrevisses dans ce projet, et le test de Task 3 interdit explicitement la mention « ANSES » dans ce champ.
- `intro` : dire honnêtement pourquoi la préparation existe (extraction du goût des carapaces pour la bisque, service simple et rapide pour la nage, richesse de la sauce Nantua pour le gratin) — même registre que les autres recettes du fichier.

- [ ] **Step 3: Vérifier**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Expected: `src/data/ecrevisses-recipes.test.ts` entièrement vert, y compris `"existe au moins une recette"`.

- [ ] **Step 4: Commit**

```bash
git add src/data/ecrevisses-recipes.ts
git commit -m "Écrevisses : bisque, à la nage, gratin — les trois espèces pêchables"
```

---

## Task 5: Écrans — relier les recettes d'écrevisses à l'app

**Files:**
- Modify: `src/lib/recipes.ts`
- Modify: `src/screens/Recette.tsx`
- Modify: `src/screens/Ecrevisses.tsx`

**Interfaces:**
- Consumes: `CRAYFISH_RECIPES` (Task 4).
- Produces: `resolveSpeciesRef(id: string): { kind: "fish" | "crayfish" | "unknown"; id: string; name: string }`, exporté par `lib/recipes.ts`.

- [ ] **Step 1: Généraliser la résolution d'espèce**

Dans `src/lib/recipes.ts`, ajouter l'import et la fonction, et étendre `findRecipe` pour chercher dans les deux catalogues :

```ts
import { SPECIES } from "../data/species";
import { RECIPES } from "../data/recipes";
import { CRAYFISH_RECIPES } from "../data/ecrevisses-recipes";
import { crayfishById } from "../data/ecrevisses";
import type { Recipe } from "../types";

/** Recipes that apply to a species (direct match on the recipe's species list). */
export function recipesForSpecies(id: string): Recipe[] {
  return RECIPES.filter((r) => r.species.includes(id));
}

/** French display name for a species id (falls back to the id). */
export function speciesName(id: string): string {
  return SPECIES.find((s) => s.id === id)?.name || id;
}

const SP_NAME = new Map(SPECIES.map((s) => [s.id, s.name]));

/** Comma-joined French display names for several species ids (personal recipes can link more than one). */
export function spNames(ids: string[]): string {
  return ids.map((id) => SP_NAME.get(id) || id).filter(Boolean).join(", ");
}

/** Whether an id belongs to the fish catalogue, the crayfish catalogue, or neither —
 *  the single place that knows both catalogues, so Recette.tsx never has to. */
export function resolveSpeciesRef(
  id: string,
): { kind: "fish" | "crayfish" | "unknown"; id: string; name: string } {
  const sp = SPECIES.find((s) => s.id === id);
  if (sp) return { kind: "fish", id, name: sp.name };
  const cr = crayfishById(id);
  if (cr) return { kind: "crayfish", id, name: cr.name };
  return { kind: "unknown", id, name: id };
}

/** Look up a recipe (and a representative species name) by id, across both the
 *  fish and crayfish recipe catalogues. */
export function findRecipe(id: string | null): { recipe: Recipe; speciesName: string } | null {
  if (!id) return null;
  const recipe = RECIPES.find((r) => r.id === id) ?? CRAYFISH_RECIPES.find((r) => r.id === id);
  if (!recipe) return null;
  return { recipe, speciesName: resolveSpeciesRef(recipe.species[0]).name };
}
```

- [ ] **Step 2: Rendre l'écran de détail agnostique du catalogue**

Dans `src/screens/Recette.tsx`, remplacer l'import :

```ts
import { findRecipe, speciesName } from "../lib/recipes";
```

par :

```ts
import { findRecipe, resolveSpeciesRef } from "../lib/recipes";
```

Remplacer le bloc de la photo de couverture (repli sur la photo d'espèce) :

```tsx
        {hasMedia("recipe", rec.id) ? (
          <Media kind="recipe" id={rec.id} placeholder={rec.title} />
        ) : (
          <Media kind="species" id={rec.species[0]} placeholder={rec.title} />
        )}
```

par :

```tsx
        {hasMedia("recipe", rec.id) ? (
          <Media kind="recipe" id={rec.id} placeholder={rec.title} />
        ) : (
          <Media
            kind={resolveSpeciesRef(rec.species[0]).kind === "crayfish" ? "crayfish" : "species"}
            id={rec.species[0]}
            placeholder={rec.title}
          />
        )}
```

Remplacer le bloc des puces d'espèce :

```tsx
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {rec.species.map((spId) => (
            <span
              key={spId}
              role="button"
              tabIndex={0}
              className="chip chip-sm"
              onClick={() => nav("fiche", { spId })}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                e.stopPropagation();
                nav("fiche", { spId });
              }}
            >
              {speciesName(spId)}
            </span>
          ))}
        </div>
```

par :

```tsx
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {rec.species.map((spId) => {
            const ref = resolveSpeciesRef(spId);
            const go = () => nav(ref.kind === "crayfish" ? "ecrevisses-ident" : "fiche", ref.kind === "crayfish" ? undefined : { spId });
            return (
              <span
                key={spId}
                role="button"
                tabIndex={0}
                className="chip chip-sm"
                onClick={go}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  e.stopPropagation();
                  go();
                }}
              >
                {ref.name}
              </span>
            );
          })}
        </div>
```

Vérifié : `nav: (screen: Screen, extra?: Partial<AppState>) => void` (`src/store.tsx:171`) — le second argument est optionnel, le code ci-dessus compile tel quel.

- [ ] **Step 3: Section « Recettes » sur l'écran Écrevisses**

Dans `src/screens/Ecrevisses.tsx`, ajouter l'import :

```ts
import { CRAYFISH_RECIPES } from "../data/ecrevisses-recipes";
```

Insérer, juste après le bouton « Reconnaître les écrevisses » et avant `<div className="ecr-reg">` (repérer le bloc exact avec les numéros de ligne donnés ici — ils peuvent avoir légèrement bougé) :

```tsx
        {CRAYFISH_RECIPES.length > 0 && (
          <>
            <div className="label" style={{ margin: "16px 0 8px" }}>
              Recettes
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
              {CRAYFISH_RECIPES.map((r) => (
                <span
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  className="chip chip-sm"
                  onClick={() => nav("recette", { recipeId: r.id })}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    e.stopPropagation();
                    nav("recette", { recipeId: r.id });
                  }}
                >
                  {r.title}
                </span>
              ))}
            </div>
          </>
        )}

```

(`nav` est déjà déstructuré dans ce composant — vérifié en amont de cette tâche.)

- [ ] **Step 4: Vérifier**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Expected: vert.

- [ ] **Step 5: Vérification navigateur**

Démarrer le serveur de dev. Depuis Outils → Écrevisses, confirmer la section « Recettes » est visible avec 3 puces. Ouvrir « Bisque d'écrevisses » (ou le titre choisi en Task 4) : la puce d'espèce affiche le nom de l'écrevisse et, si elle est tapée, retourne sur l'écran d'identification des écrevisses (pas une fiche poisson, pas d'erreur console). Confirmer que la photo de couverture, si aucune photo de recette n'a été sourcée, retombe sur la vraie photo de l'écrevisse (`CRAYFISH_MEDIA`) et non sur un placeholder générique.

- [ ] **Step 6: Commit**

```bash
git add src/lib/recipes.ts src/screens/Recette.tsx src/screens/Ecrevisses.tsx
git commit -m "Écrevisses : recettes reliées à l'écran, écran de détail partagé avec les poissons"
```

---

## Task 6: Audit — recettes manquantes des espèces à une seule recette

**Files:**
- Modify: `src/data/recipes.ts`
- Modify: `src/data/recipes.test.ts`

**Interfaces:**
- Consumes: `RECIPES`, `EDIBILITY` (pour toute nouvelle recette visant une espèce à avis ANSES).

Cette tâche est un audit borné, pas une liste de recettes à transcrire — la spec l'a délibérément laissé ouvert pour ne pas présumer du résultat.

- [ ] **Step 1: Identifier les candidats**

Espèces actuellement couvertes par une seule recette nommée individuellement (pas partagée avec un groupe) : **sandre** (seulement via `sandre-brochet-au-beurre-blanc`, partagée avec le brochet), **tanche** (`tanche-farcie-au-four`), **perche** (`perches-a-la-meuniere`). Les espèces des groupes `friture-poissons-blancs` et `terrine-cyprinides` (gardon, ablette, goujon, rotengle, gremille, carassin, breme, chevesne, hotu, barbeau) sont considérées comme correctement couvertes par leur recette partagée, sauf découverte contraire à l'étape suivante.

- [ ] **Step 2: Rechercher, pour chacun des trois candidats, une deuxième tradition réelle et distincte**

Pour sandre, tanche et perche : rechercher si une **deuxième préparation française traditionnelle, documentée et clairement distincte** de celle déjà présente existe (pas une variante cosmétique de la même technique). Piste à vérifier pour la perche : une préparation en beignets, distincte de la meunière déjà présente. Piste à vérifier pour le sandre : une préparation à l'oseille, distincte du beurre blanc déjà présent. Pour la tanche : vérifier si une deuxième tradition clairement distincte de la farce au four existe.

**Ne pas se fier à une intuition non vérifiée** — chercher réellement, et pour chaque candidat, noter dans le rapport final ce qui a été trouvé et la décision (ajouter / ne pas ajouter, avec la raison).

- [ ] **Step 3: Ajouter les recettes confirmées, dans le même format que l'existant**

Pour chaque candidat où une deuxième tradition réelle et sourçable est confirmée, ajouter une entrée à `RECIPES` (`src/data/recipes.ts`) suivant exactement la forme des entrées existantes — lire `perches-a-la-meuniere` et `sandre-brochet-au-beurre-blanc` comme modèles de registre. Si l'espèce porte un avis ANSES dans `EDIBILITY` (aucun des trois candidats n'en porte actuellement — vérifier plutôt que présumer), la nouvelle recette doit porter un `safety` le mentionnant, sous peine de faire échouer le test existant `"toute recette dont une espèce porte un avis ANSES..."`.

Pour tout candidat où rien n'est confirmé, ne rien ajouter — l'absence documentée vaut mieux qu'un contenu inventé.

- [ ] **Step 4: Mettre à jour le test de comptage**

Si une ou plusieurs recettes ont été ajoutées, `src/data/recipes.test.ts` contient un test `"compte actuellement 18 recettes"` qui échouera. Le mettre à jour délibérément au nouveau total — ne jamais le supprimer ou le rendre approximatif (`toBeGreaterThan`) : c'est le même principe que le test à cinq espèces d'écrevisses mis à jour à six lors du chantier précédent.

- [ ] **Step 5: Vérifier**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Expected: vert, y compris si aucune recette n'a été ajoutée (le test de comptage reste alors à 18 et les autres assertions passent trivialement).

- [ ] **Step 6: Commit**

Si au moins une recette a été ajoutée :

```bash
git add src/data/recipes.ts src/data/recipes.test.ts
git commit -m "Recettes : deuxièmes traditions confirmées pour <liste des espèces concernées>"
```

Si aucune recette n'a été ajoutée, ne rien commit pour cette tâche et le dire clairement dans le rapport — ce n'est pas un échec de la tâche, c'est son résultat.

---

## Task 7: Vérification finale

**Files:** aucun.

- [ ] **Step 1:** `npx tsc -b && npx eslint src && npx vitest run && npm run build` — tout vert.
- [ ] **Step 2:** Au navigateur, Outils → Techniques : confirmer que « Lever un filet » et « Entailler en croisillons » apparaissent dans la catégorie Préparation, avec leurs étapes.
- [ ] **Step 3:** Depuis « Entailler en croisillons », confirmer que les puces d'espèces (carassin, brochet, barbeau, brème, gardon) renvoient chacune vers la bonne fiche.
- [ ] **Step 4:** Outils → Écrevisses → section Recettes : les trois recettes sont atteignables, chacune affiche une photo (recette ou repli sur la photo d'écrevisse — jamais un placeholder générique alors qu'une photo existe), et le `safety` de chacune est visible sans mention ANSES inventée.
- [ ] **Step 5:** Si des recettes de poisson ont été ajoutées en Task 6, ouvrir chacune et confirmer qu'elle s'affiche normalement depuis la fiche de son espèce.
- [ ] **Step 6:** Console sans erreur. Arrêter le serveur. Pas de commit.

---

## Hors périmètre

- Recettes pour les écrevisses fermées (pattes blanches, grêles, rouges).
- Photos dédiées pour les deux nouvelles techniques ou les trois recettes d'écrevisses si aucune source Commons convenable n'existe — repli sur la photo d'espèce/écrevisse, comme partout ailleurs dans le module.
- Toute recette de poisson au-delà des trois candidats identifiés en Task 6 (sandre, tanche, perche) — les espèces des groupes friture/terrine restent à une recette partagée sauf découverte contraire signalée dans le rapport de Task 6.
