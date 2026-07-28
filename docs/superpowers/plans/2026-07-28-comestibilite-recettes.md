# Comestibilité, recettes et techniques — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger cinq erreurs sanitaires, supprimer la double écriture de l'avis ANSES, rendre visibles des données déjà correctes, et combler les trous d'images et de tests du domaine cuisine.

**Architecture:** Corrections ciblées. Le seul changement structurant est la déduplication ANSES : les textes deviennent des constantes exportées par `edibility.ts` et importées par `species.ts`, avec un test qui interdit la redivergence.

**Tech Stack:** React + TypeScript, Vitest.

## Global Constraints

- Après chaque tâche : `npx tsc -b`, `npx eslint src`, `npx vitest run` verts avant de commit.
- **Aucune valeur sanitaire ou légale inventée.** Toute affirmation cite sa source ; ce qui n'est pas vérifié dit « à vérifier ».
- Le sens sûr prime : dans le doute, l'app met en garde plutôt qu'elle ne rassure.
- Ne jamais affaiblir un test qui échoue : soit c'est une régression réelle, soit le test épingle une vérité qui a changé et il se met à jour délibérément.

### Faits établis (ne pas re-chercher)

- **ANSES / anguille** : l'anguille appartient bien au groupe « 2 fois par mois maximum » avec barbeau, brème, carpe et silure. Ce qui la distingue : l'ANSES recommande une consommation **exceptionnelle quel que soit le bassin versant**, là où les autres peuvent être assouplies en eau propre. Donc **ajouter** ce qualificatif, ne pas remplacer le chiffre.
- **Parasites** : le risque français documenté en eau douce est le **bothriocéphale** (*Diphyllobothrium latum*), établi dans la perche, le brochet et la lote du lac Léman (prévalence mesurée de 4–10 % sur filets de perche en 2003-2005, ~0,9 % sur un relevé plus récent). *Anisakis* est marin ; *Gnathostoma* est propre à l'Asie du Sud-Est et à l'Amérique latine. Le protocole de congélation déjà présent (−20 °C/24 h ou −35 °C/15 h) est exact et se conserve.
- **Ichtyohémotoxisme** : le sang cru d'anguille (comme celui de la lamproie et du congre) est toxique ; la toxine est détruite par la chaleur (~56 °C). Les fiches lamproie de l'app le disent déjà et citent l'anguille en exemple.
- **Garum** : produit par **autolyse enzymatique** sous forte salinité, pas par lacto-fermentation (qui désigne la fermentation par bactéries lactiques).

---

## Task 1: Les cinq corrections sanitaires

**Files:** `src/data/edibility.ts`, `src/data/techniques.ts`, `src/data/recipes.ts`

- [ ] **Step 1: Anguille — sang toxique + qualificatif ANSES**

Dans `src/data/edibility.ts`, remplacer la constante `ANSES_ANGUILLE` (l. 41-42) :

```ts
const ANSES_ANGUILLE =
  "Espèce TRÈS fortement bioaccumulatrice — la plus concernée par les PCB/dioxines. L'ANSES en recommande une consommation exceptionnelle QUEL QUE SOIT LE BASSIN VERSANT (là où les autres espèces peuvent être assouplies en eau propre) : 2 fois/mois maximum en population générale, 1 fois tous les 2 mois pour les publics sensibles.";
```

Puis, dans l'entrée `anguille`, remplacer le champ `prep` (qui ne parlait que de réglementation) par :

```ts
    prep: "Sang cru toxique (ichtyohémotoxisme, comme la lamproie et le congre) : la toxine est détruite par la cuisson, mais évitez tout contact du sang avec une plaie ou les yeux pendant l'habillage, et ne goûtez jamais la chair crue. En danger critique par ailleurs : pêche strictement encadrée (règlement européen anguille) — ne prélever que là où c'est légal.",
```

- [ ] **Step 2: Parasites — le bon agent**

Dans `src/data/techniques.ts`, remplacer la valeur de `SAFETY.parasites` :

```ts
  parasites:
    "Le parasite documenté en eau douce française est le bothriocéphale (Diphyllobothrium latum), présent notamment dans la perche, le brochet et la lote des lacs subalpins (Léman). Consommés crus, marinés ou peu cuits, ces poissons exposent à la bothriocéphalose. La cuisson à cœur et la congélation (voir ci-dessous) neutralisent le parasite.",
```

- [ ] **Step 3: Conserves d'alose — le badge ne doit pas démentir le texte**

Dans `src/data/recipes.ts`, entrée `conserves-alose-bordelaise` : remplacer `cook: 90,` par `cook: 0,` et ajouter juste au-dessus le commentaire :

```ts
    // cook: 0 — volontaire. La stérilisation n'a PAS de durée ici (voir l'étape
    // correspondante : un barème approximatif expose au botulisme). Afficher 90 min
    // laissait croire que la stérilisation était couverte par ce chiffre.
    cook: 0,
```

Vérifier ensuite comment `Recette.tsx` affiche `cook` : si un `0` produit un badge « 0 min » trompeur, masquer le badge quand `cook === 0` plutôt que d'afficher zéro. Reporter ce qui a été fait.

- [ ] **Step 4: Carpe et silure — l'avertissement ANSES sur toutes leurs recettes**

Dans `src/data/recipes.ts`, ajouter un champ `safety` aux entrées `carpe-a-la-chambord` et `carpe-chambord-hay` (aucune n'en a) :

```ts
    safety: "La carpe est un poisson fortement bioaccumulateur (PCB/dioxines) : l'ANSES recommande de n'en consommer que 2 fois par mois au maximum, 1 fois tous les 2 mois pour les publics sensibles. Vérifiez aussi qu'aucun arrêté préfectoral n'interdit la consommation sur votre secteur.",
```

Et compléter le `safety` existant de `terrine-silure` et `escalopes-silure-curry` en y ajoutant (sans supprimer ce qui s'y trouve déjà) :

```
Le silure est fortement bioaccumulateur (PCB/dioxines) : ANSES 2 fois/mois maximum, 1 fois tous les 2 mois pour les publics sensibles.
```

- [ ] **Step 5: Silure confit — « cuisson à cœur » doit être vérifiable**

Toujours dans `recipes.ts`, entrée `silure-confit-jus-ecrevisse` : l'étape de confit dit « chair juste nacrée » sans température ni durée, alors que le `safety` affirme « cuisson à cœur ». Remplacer cette étape par une formulation qui donne un repère mesurable :

```ts
      "Confisez les pavés dans un corps gras aromatisé à 62–65 °C pendant 25 à 30 minutes, jusqu'à ce que la chair atteigne 62 °C à cœur (thermomètre sonde). En dessous de cette température, « cuisson à cœur » n'est plus assurée.",
```

Vérifier d'abord le texte exact de l'étape actuelle et ne remplacer que celle-là.

- [ ] **Step 6: Vérifier et commit**

Run: `npx tsc -b && npx eslint src && npx vitest run`

```bash
git add src/data/edibility.ts src/data/techniques.ts src/data/recipes.ts
git commit -m "Santé : sang de l'anguille, bothriocéphale, badge de stérilisation, ANSES sur carpe et silure"
```

---

## Task 2: Supprimer la double écriture de l'avis ANSES

**Files:** `src/data/edibility.ts`, `src/data/species.ts`, `src/data/edibility-health.test.ts`

**Contexte :** l'avis ANSES est écrit deux fois — `ANSES_TXT` dans `edibility.ts` (affiché en « Comestibilité ») et `ANSES_GEN`/`ANSES_SENS` dans `species.ts` (affiché en « Santé & polluants »). Les deux formulations ne sont pas identiques : celle de `species.ts` mentionne le méthylmercure et « en variant espèces et lieux de pêche », celle d'`edibility.ts` détaille davantage les publics sensibles. Il faut donc **réconcilier** en une version qui porte tout ce qui est vrai, pas choisir l'une au hasard.

- [ ] **Step 1: Écrire le test qui échoue**

Dans `src/data/edibility-health.test.ts`, ajouter :

```ts
import { ANSES_GEN, ANSES_SENS } from "./edibility";

describe("avis ANSES — une seule source", () => {
  // L'avis vivait en double : edibility.ts (onglet Comestibilité) et species.ts
  // (onglet Santé). Deux textes, deux fichiers, deux onglets de la MÊME fiche —
  // corriger l'un laissait l'autre faux.
  it("le texte affiché en Santé vient bien des constantes d'edibility", () => {
    const carpe = SPECIES.find((s) => s.id === "carpe")!;
    const paras = carpe.sante!.paras;
    expect(paras).toContain(ANSES_GEN);
    expect(paras).toContain(ANSES_SENS);
  });

  it("le texte affiché en Comestibilité contient les deux mêmes phrases", () => {
    const ed = EDIBILITY["carpe"];
    expect(ed.anses).toContain(ANSES_GEN);
    expect(ed.anses).toContain(ANSES_SENS);
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/data/edibility-health.test.ts`
Expected: FAIL — `ANSES_GEN`/`ANSES_SENS` ne sont pas exportés par `edibility.ts`.

- [ ] **Step 3: Faire d'`edibility.ts` la source unique**

Dans `src/data/edibility.ts`, remplacer la constante `ANSES_TXT` par ce bloc, qui réconcilie les deux formulations (le méthylmercure et le conseil de varier viennent de `species.ts`, le détail des publics sensibles d'`edibility.ts` — les deux sont justes, on garde tout) :

```ts
// Source unique de l'avis ANSES, affiché à DEUX endroits de la fiche espèce :
// la section Comestibilité (via EDIBILITY[id].anses) et la section Santé (via
// species.ts, qui importe ces constantes). Elles vivaient en double, avec des
// formulations divergentes — corriger l'une laissait l'autre fausse.
export const ANSES_GEN =
  "Espèce fortement bioaccumulatrice (PCB, dioxines, méthylmercure). Recommandation ANSES : 2 fois par mois maximum, en variant les espèces et les lieux de pêche.";
export const ANSES_SENS =
  "Publics sensibles (femmes en âge de procréer, enceintes ou allaitantes, enfants de moins de 3 ans, adolescentes) : 1 fois tous les 2 mois maximum.";
const ANSES_TXT = `${ANSES_GEN} ${ANSES_SENS}`;
```

- [ ] **Step 4: Faire importer `species.ts`**

Dans `src/data/species.ts`, supprimer les déclarations locales `ANSES_GEN` et `ANSES_SENS` et les importer :

```ts
import { ANSES_GEN, ANSES_SENS } from "./edibility";
```

Garder `POLLU_LOC` sur place : il n'est pas dupliqué et ne concerne pas l'avis nominatif.

**Attention à l'import circulaire** : `edibility.ts` n'importe pas `species.ts`, donc l'import dans ce sens est sûr. Vérifier néanmoins que `npx vitest run` et `npm run build` passent, et si un cycle apparaît, sortir les deux constantes dans un petit module tiers plutôt que de dupliquer à nouveau — et le dire dans le rapport.

- [ ] **Step 5: Vérifier et commit**

Run: `npx tsc -b && npx eslint src && npx vitest run && npm run build`

```bash
git add src/data/edibility.ts src/data/species.ts src/data/edibility-health.test.ts
git commit -m "ANSES : une seule source pour les deux onglets de la fiche"
```

---

## Task 3: Corrections de rigueur

**Files:** `src/data/edibility.ts`, `src/data/techniques.ts`

- [ ] **Step 1: Remettre la citation médicale sur la bonne espèce**

Dans `edibility.ts`, la constante `ICHTYOOTOX_BROCHET` (citation de Haro 2008, qui porte sur *Esox lucius*) n'est citée que dans le `source` de `brochet-aquitain`, espèce jamais étudiée — tandis que `brochet`, l'espèce de l'étude, n'a que `CULINARY` et une formulation plus faible (« réputés indigestes/purgatifs ») que sa fiche sœur (« œufs toxiques… ne consommez jamais les œufs »).

Lire les deux entrées, puis : ajouter `ICHTYOOTOX_BROCHET` au `source` de `brochet`, et aligner son `prep` sur la formulation forte de `brochet-aquitain`. Ne pas affaiblir `brochet-aquitain`, dont la formulation par analogie reste correcte (un test existant l'épingle — `src/data/edibility-health.test.ts` vérifie qu'elle est bien phrasée comme une analogie).

- [ ] **Step 2: Garum — terme exact et sécurité sourcée**

Dans `src/data/techniques.ts`, entrée `garum` : remplacer « lacto-fermentée » dans le `summary` par « fermentée par autolyse enzymatique ». Puis compléter son `safety` pour dire honnêtement que l'affirmation de salinité ne s'appuie sur aucune autorité sanitaire — sur le modèle de ce que fait déjà `sterilisation-arete`, qui renvoie à la DGCCRF/DGAL :

```
Cette proportion de sel est celle de la tradition, pas un barème validé par une autorité sanitaire : contrairement à la stérilisation en conserve, aucun texte officiel ne l'encadre. Si vous vous écartez de la recette, vous n'avez aucun repère de sécurité — ne réduisez pas la salinité.
```

- [ ] **Step 3: PCB estuaire — cohérence flet / mulets**

`flet` porte l'avertissement PCB des poissons de fond d'estuaire (`ARRETE_PCB`), les quatre entrées `mulet-*` non, alors qu'ils occupent la même niche. Ajouter aux quatre mulets un renvoi à l'arrêté préfectoral cohérent avec celui du flet — sans inventer d'avis ANSES nominatif, que l'ANSES n'a pas rendu pour ces espèces (un test existant, « `flet` ne doit jamais inventer de fréquence ANSES », dit exactement pourquoi).

- [ ] **Step 4: Barbeau — hedger ce qui n'est pas sourcé**

L'entrée `barbeau` affirme « écarter aussi la chair ventrale en période de fraie », alors que le commentaire de sa propre source (`SFMU_BARBEAU`) ne documente que la toxicité des **œufs**. Conserver la mise en garde (sens sûr) mais la marquer comme précaution non sourcée plutôt que comme fait établi.

- [ ] **Step 5: Vérifier et commit**

Run: `npx tsc -b && npx eslint src && npx vitest run`

```bash
git add src/data/edibility.ts src/data/techniques.ts
git commit -m "Rigueur : citation du brochet, garum, PCB des mulets, chair ventrale du barbeau"
```

---

## Task 4: Rendre visible ce qui existe — bivouac, liens retour, puces

**Files:** `src/screens/Recette.tsx`, `src/screens/Techniques.tsx`, `src/styles.css`

- [ ] **Step 1: Afficher `bivouac`**

`Recipe.bivouac` est renseigné sur 8 des 17 recettes et lu par aucun écran (vérifié). Il marque les préparations réalisables au bord de l'eau avec peu de matériel — la promesse même de l'app.

Dans `src/screens/Recette.tsx`, afficher un badge quand `rec.bivouac` est vrai, à côté des badges existants (difficulté, temps). Lire d'abord comment ces badges sont rendus et suivre exactement le même motif. Libellé : `🏕️ Au bord de l'eau`. Ajouter la classe CSS correspondante si nécessaire.

- [ ] **Step 2: Recette → espèce, en puce tapable**

Dans `Recette.tsx`, le nom d'espèce est rendu en texte brut. Le transformer en puce tapable menant à `nav("fiche", { spId })`, en suivant **exactement** le motif déjà en place pour les puces espèces du guide matériel (`src/screens/Materiel.tsx`) : `role="button"`, `tabIndex={0}`, gestionnaire `onKeyDown` sur Entrée et Espace, classe `chip chip-sm`. Lire ce code avant d'écrire.

- [ ] **Step 3: Technique → recettes qui l'emploient**

Dans `src/screens/Techniques.tsx`, `TechniqueDetail` n'indique pas quelles recettes utilisent la technique affichée. Ajouter une section « Recettes qui l'emploient », **dérivée au rendu** en filtrant `RECIPES` sur `techniques?.includes(id)` — jamais stockée en double (même règle que « Utilisé avec » côté fils). Puces tapables vers `nav("recette", { recipeId })` — vérifier le nom exact du champ d'état utilisé pour ouvrir une recette. Section absente si aucune recette n'emploie la technique (`garum` est dans ce cas).

- [ ] **Step 4: Corriger la cible tactile des puces techniques**

Dans `src/styles.css`, `.tech-chip` n'a pas de hauteur (padding 7px, police 12.5px ≈ 30 px de haut) alors que `.chip` de l'app est épinglé à 44 px avec un commentaire citant WCAG 2.5.5 pour les mains mouillées. Aligner `.tech-chip` sur 44 px.

- [ ] **Step 5: Vérifier et commit**

Run: `npx tsc -b && npx eslint src && npx vitest run`

```bash
git add src/screens/Recette.tsx src/screens/Techniques.tsx src/styles.css
git commit -m "Cuisine : badge bivouac, liens retour recette/technique, puces à 44 px"
```

---

## Task 5: Une recette pour les cyprinidés arêtés

**Files:** `src/data/recipes.ts`

**Contexte :** barbeau, brème, chevesne, hotu et carassin n'ont aucune recette. Les mettre dans `friture-poissons-blancs` serait faux : cette recette vise de **petits** poissons (sa propre source dit « goujons, ablettes, gardons ») quand le barbeau atteint 90 cm. La préparation que la tradition a inventée pour ces chairs fades et arêtées, c'est le broyage ou la terrine.

- [ ] **Step 1: Ajouter le carassin à la friture**

Le carassin, petit, s'y prête réellement. Ajouter `"carassin"` au tableau `species` de `friture-poissons-blancs`.

- [ ] **Step 2: Écrire la recette de terrine**

Ajouter une recette à `RECIPES`, en suivant exactement la forme des entrées existantes (lire `tanche-farcie-au-four` et `terrine-silure` comme modèles). Elle doit :
- porter `species: ["breme", "chevesne", "hotu", "barbeau"]` ;
- porter `techniques` renvoyant aux techniques existantes qui la servent — vérifier les ids réels dans `src/data/techniques.ts` (`desaretage-brochet`, `arete-oseille`) et n'en citer que si elles s'appliquent vraiment ;
- être sourcée comme la friture l'est (`origin` renvoyant à la tradition, `source` honnête) ;
- **dire franchement pourquoi cette préparation existe** : la chair de ces poissons est fade et bourrée d'arêtes, la terrine broie les arêtes intramusculaires et relève le goût. Ne pas vanter un poisson que les fiches décrivent comme médiocre ;
- porter un `safety` : le **barbeau** a des **œufs toxiques**, à écarter impérativement — c'est la mise en garde la plus importante de cette recette, l'entrée `barbeau` d'`edibility.ts` en donne la formulation ;
- avoir des durées et températures cohérentes et vérifiables (cuisson à cœur).

- [ ] **Step 3: Vérifier et commit**

Run: `npx tsc -b && npx eslint src && npx vitest run`

```bash
git add src/data/recipes.ts
git commit -m "Recettes : terrine de cyprinidés arêtés, carassin en friture"
```

---

## Task 6: Tests de liens et de médias

**Files:** `src/data/recipes.test.ts` (nouveau)

- [ ] **Step 1: Écrire les tests**

Aucun test ne couvre `recipes.ts` ni `techniques.ts`. Créer `src/data/recipes.test.ts` couvrant :
- chaque `Recipe.species[]` id résout dans `SPECIES` ;
- chaque `Recipe.techniques[]` id résout dans `TECHNIQUES` ;
- chaque `Technique.speciesNote` id résout dans `SPECIES` ;
- aucune recette ne vise une espèce dont `EDIBILITY[id].status === "non"` ;
- **toute recette dont une espèce porte un `anses` en comestibilité porte elle-même un `safety` mentionnant l'ANSES** — c'est l'invariant qui aurait attrapé le trou des recettes de carpe ;
- chaque fichier de `RECIPE_MEDIA` et `TECHNIQUE_MEDIA` existe sous `public/` (même garde que celles déjà posées pour les nœuds, le matériel et les écrevisses — lire `src/data/gear-guide.test.ts` pour le motif exact).

- [ ] **Step 2: Démontrer le RED sur l'invariant ANSES**

Retirer temporairement le `safety` d'une recette de carpe, confirmer que le test échoue, restaurer. Reporter la preuve — c'est le test qui justifie cette tâche.

- [ ] **Step 3: Vérifier et commit**

Run: `npx tsc -b && npx eslint src && npx vitest run`

```bash
git add src/data/recipes.test.ts
git commit -m "Tests : liens recettes/techniques et existence des médias"
```

---

## Task 7: Photos de recettes et de techniques

**Files:** `scripts/images.manifest.json`, `scripts/fetch-images.mjs` (si besoin), `src/data/media.ts`

**Contexte :** 1 photo pour 17 recettes, 0 pour 7 techniques (`public/assets/techniques/` est vide). Le pipeline et les clés `recipes`/`techniques` du manifeste existent déjà — il n'y a que du contenu à ajouter.

- [ ] **Step 1: Chercher des photos sur Wikimedia Commons**

Pour chaque recette et technique, chercher une photo libre représentant **le plat ou le geste**, pas l'espèce (l'app retombe déjà sur la photo d'espèce, donc une photo qui ne montre que le poisson n'apporte rien). Termes à essayer : le nom du plat en français, son équivalent générique, la technique.

Règle de sourçage de ce projet, acquise après deux incidents : **regarder l'image réelle**, jamais se fier à la description Commons. Vérifier la licence sur la page du fichier. Si rien de convenable n'existe pour une recette, la laisser sans photo — c'est un repli propre et accepté ici.

Attendre un taux de réussite modeste : les plats de poisson d'eau douce français sont peu photographiés sous licence libre. Trois ou quatre bonnes trouvailles valent mieux que dix approximations.

- [ ] **Step 2: Ajouter au manifeste et lancer le pipeline**

Ajouter les entrées vérifiées aux clés `recipes` et `techniques` de `scripts/images.manifest.json`, puis `node scripts/fetch-images.mjs`.

- [ ] **Step 3: REGARDER chaque image produite**

Ouvrir chaque `.webp` généré et confirmer qu'il montre bien ce qu'il prétend, sans recadrage destructeur. Retirer du manifeste toute image qui ne passe pas.

- [ ] **Step 4: Vérifier et commit**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Le test d'existence des fichiers posé en Task 6 doit passer.

```bash
git add scripts/images.manifest.json src/data/media.ts public/assets/recipes/ public/assets/techniques/
git commit -m "Cuisine : photos de plats et de gestes"
```

---

## Task 8: Découper MesRecettes

**Files:** `src/screens/MesRecettes.tsx` → + `src/screens/RecipeView.tsx`, `src/screens/RecipeEditor.tsx`, `src/components/RecipeBody.tsx`

**Contexte :** 495 lignes contenant l'écran liste, la carte, la vue détail et l'éditeur (photo, quota, recherche d'espèce). Le rendu des ingrédients et des étapes y est recopié de `Recette.tsx` — deux implémentations du même affichage, qui ont déjà divergé (le repli sur la photo d'espèce existe dans la carte, pas dans la vue détail).

- [ ] **Step 1: Extraire le rendu partagé**

Créer `src/components/RecipeBody.tsx` exportant les composants de liste d'ingrédients et d'étapes numérotées, et les faire consommer par `Recette.tsx` **et** par la vue détail des recettes perso. Le rendu doit rester identique à l'existant — c'est une extraction, pas une refonte visuelle.

- [ ] **Step 2: Découper l'écran**

Sortir `RecipeView` et `RecipeEditor` dans leurs propres fichiers, sur le modèle de `Techniques.tsx` qui sépare déjà liste et détail. Préserver intégralement le flux d'échec de sauvegarde photo (`photoError`/`confirmSaveWithoutPhoto`) : il évite une perte de données silencieuse en cas de quota IndexedDB plein.

- [ ] **Step 3: Corriger le repli manquant**

La vue détail d'une recette perso sans photo affiche un bloc vide, là où la carte de la même recette retombe sur la photo de l'espèce liée puis sur une icône. Aligner la vue détail sur cette chaîne de repli.

- [ ] **Step 4: Vérifier et commit**

Run: `npx tsc -b && npx eslint src && npx vitest run && npm run build`

```bash
git add src/screens/ src/components/RecipeBody.tsx
git commit -m "Mes recettes : découpage et rendu partagé avec les recettes du guide"
```

---

## Task 9: Vérification finale

- [ ] **Step 1:** `npx tsc -b && npx eslint src && npx vitest run && npm run build` — tout vert.
- [ ] **Step 2:** Au navigateur, fiche Carpe → section Santé et section Comestibilité : le même avis ANSES, cohérent, sans divergence.
- [ ] **Step 3:** Une recette marquée `bivouac` affiche son badge ; depuis cette recette, taper l'espèce ouvre sa fiche.
- [ ] **Step 4:** Depuis Outils → Techniques → Dégorgeage, la liste des recettes qui l'emploient est présente et navigable.
- [ ] **Step 5:** Fiche Anguille : l'avertissement sur le sang cru est visible.
- [ ] **Step 6:** Console sans erreur. Arrêter le serveur. Pas de commit.

---

## Hors périmètre

- Fusionner les sections Comestibilité et Santé — décidé contre : ce sont deux questions distinctes, et les fusionner noierait l'avis sanitaire dans le culinaire.
- Écrire une recette pour perche-soleil, poisson-chat, black-bass, ombre et vandoise : poissons de sport, invasifs ou fragiles, sans tradition culinaire française établie. L'absence est honnête.
- La catégorie `"cuisson"` vide dans `Techniques.tsx` (déjà masquée), `garum` non référencé par une recette (atteignable directement), `Ligula intestinalis` (inoffensif pour l'homme), le doublon `speciesName` entre `lib/recipes.ts` et `MesRecettes.tsx` (résorbé par la Task 8 si l'extraction le permet, sinon sans conséquence).
