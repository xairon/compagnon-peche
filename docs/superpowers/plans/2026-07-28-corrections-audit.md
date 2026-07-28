# Corrections de l'audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger les 18 constats de l'audit du 28 juillet 2026 sur les tutos nœuds, le guide matériel, les liens inter-fiches, les images et la réglementation.

**Architecture:** Corrections ciblées, aucune refonte. Le seul changement de comportement structurant est la fermeture du sandre, qui devient une conséquence du socle **national** (interdiction des leurres/vifs pendant la fermeture du brochet en 2ᵉ catégorie) et non une règle départementale — donc aucune architecture « saison par département » n'est introduite.

**Tech Stack:** React + TypeScript, Vitest, SVG dessiné à la main.

## Global Constraints

- Après chaque tâche : `npx tsc -b`, `npx eslint src`, `npx vitest run` verts avant de commit.
- **Aucune valeur légale n'est inventée.** Toute maille/quota/période modifiée doit correspondre soit au poster officiel FDPPMA 36 (2026), soit au code de l'environnement. Si une source manque, l'app dit « à vérifier » plutôt que d'affirmer.
- Le sens sûr prime : en cas de doute irréductible, l'app affiche l'option la plus protectrice (relâcher / vérifier), jamais un feu vert.
- Les images sourcées gardent auteur/licence/URL réels ; les dessins maison gardent `author: "Compagnon de pêche"`, `license: "Schéma original"`, `sourceUrl: ""`.

### Faits de référence établis pendant l'audit (ne pas re-chercher)

- **Fermeture brochet 2ᵉ cat. = fermeture de fait du sandre.** Code de l'environnement : « Pendant la période d'interdiction spécifique de la pêche du brochet, la pêche au vif, au poisson mort ou artificiel et aux leurres susceptibles de capturer ce poisson de manière non accidentelle est interdite dans les eaux classées en 2ᵉ catégorie piscicole. » Le poster FDPPMA 36 restitue cette règle en donnant au sandre exactement la même fenêtre qu'au brochet (fermé 26/01 → 24/04/2026).
- **Orientation du plomb balle (montage texan)** : pointe vers la canne, base plate contre la tête du leurre. Établi par le diagramme Commons que l'app embarque déjà (`public/assets/knots/texan.webp`). Le dessin `texan-1.svg` est donc CORRECT ; c'est le texte de l'étape 1 qui est faux.
- **Poster FDPPMA 36 (2026), quota salmonidés** : « 6 salmonidés maximum par jour et par pêcheur, dont 2 truites fario ».
- **Poster FDPPMA 36, quota carnassiers** : « 3 carnassiers maximum par jour et par pêcheur, dont 2 brochets » — une seule règle, aucune sous-limite « 1ʳᵉ cat. : 2 brochets/jour » n'y figure.
- **Poster FDPPMA 36, interdictions** : saumon et truite de mer interdits toute l'année ; alose interdite toute l'année ; anguille argentée interdite ; anguille jaune ouverte 1ᵉʳ avril–31 août en 1ʳᵉ cat., interdite en 2ᵉ cat.
- **Teigne ≠ ver de farine** : la teigne est la larve de la fausse teigne de la cire (*Galleria mellonella*) ; le ver de farine est la larve du ténébrion meunier (*Tenebrio molitor*). Deux appâts distincts, vendus séparément.

---

## Task 1: Saison du sandre + libellé de fermeture

**Files:**
- Modify: `src/data/species.ts` (entrée `sandre`)
- Modify: `src/lib/season.ts`
- Test: `src/lib/season.test.ts` (créer si absent — vérifier d'abord)

**Interfaces:**
- Produces: `sandre.season === "brochet"` ; le libellé de fermeture de la règle `"brochet"` devient générique.

- [ ] **Step 1: Écrire le test qui échoue**

Vérifier d'abord si `src/lib/season.test.ts` existe (`ls src/lib/*.test.ts`). S'il existe, ajouter dedans ; sinon créer le fichier avec l'en-tête d'import approprié.

```ts
import { describe, it, expect } from "vitest";
import { SPECIES } from "../data/species";
import { season } from "./season";

describe("fermeture des carnassiers en 2ᵉ catégorie", () => {
  const sandre = SPECIES.find((s) => s.id === "sandre")!;
  const brochet = SPECIES.find((s) => s.id === "brochet")!;

  // Le code de l'environnement interdit vif/leurres susceptibles de prendre le
  // brochet pendant sa fermeture en 2ᵉ cat. — ce sont exactement les méthodes du
  // sandre, que la FDPPMA 36 ferme d'ailleurs sur la même fenêtre. Afficher
  // « ouverte toute l'année » était un faux feu vert.
  it("le sandre est fermé pendant la fermeture du brochet", () => {
    const mars = new Date(2026, 2, 15); // 15 mars 2026, en pleine fermeture
    expect(season(sandre, mars).open).toBe(false);
    expect(season(brochet, mars).open).toBe(false);
  });

  it("le sandre est ouvert hors de cette fenêtre", () => {
    const juillet = new Date(2026, 6, 15);
    expect(season(sandre, juillet).open).toBe(true);
  });

  it("le libellé de fermeture ne parle pas que du brochet", () => {
    const mars = new Date(2026, 2, 15);
    // Un libellé « Brochet fermé » sur une fiche sandre est incompréhensible.
    expect(season(sandre, mars).label).not.toContain("Brochet fermé");
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/lib/season.test.ts`
Expected: FAIL — le sandre porte `season: "toujours"`, donc `open` vaut `true` en mars.

- [ ] **Step 3: Passer le sandre sur la règle de fermeture**

Dans `src/data/species.ts`, entrée `sandre` (~ligne 26), remplacer `season: "toujours",` par :

```ts
    // Fermé avec le brochet : pendant la fermeture spécifique du brochet en 2ᵉ
    // catégorie, le code de l'environnement interdit vif, poisson mort ou
    // artificiel et leurres susceptibles de le capturer — soit exactement les
    // méthodes du sandre. La FDPPMA 36 publie d'ailleurs pour le sandre la même
    // fenêtre que pour le brochet. « toujours » affichait un faux feu vert.
    season: "brochet",
```

- [ ] **Step 4: Rendre le libellé générique**

Dans `src/lib/season.ts`, dans la branche `sp.season === "brochet"`, remplacer le libellé de fermeture :

```ts
  if (sp.season === "brochet") {
    const c1 = last(y, 0, 0); // last Sunday of January
    c1.setHours(23, 59, 59, 999); // open through the whole closing day
    const o2 = last(y, 3, 6); // last Saturday of April
    return now <= c1 || now >= o2
      ? { open: true, label: "Pêche ouverte" }
      : { open: false, label: "Fermée (période brochet)" };
  }
```

Et compléter le commentaire de la fonction `season` (au-dessus de `export function season`) en ajoutant à la fin du bloc JSDoc existant :

```
 * La règle "brochet" couvre aussi le sandre : pendant la fermeture du brochet en
 * 2ᵉ catégorie, les méthodes qui prennent le sandre (vif, poisson mort ou
 * artificiel, leurres) sont interdites par le code de l'environnement.
```

- [ ] **Step 5: Lancer, vérifier le succès**

Run: `npx vitest run src/lib/season.test.ts && npx vitest run && npx tsc -b && npx eslint src`
Expected: tout vert. Attention : d'autres tests existants peuvent supposer que le sandre est ouvert toute l'année — s'ils échouent, c'est qu'ils figeaient le bug ; les corriger en conséquence et le signaler dans le rapport.

- [ ] **Step 6: Commit**

```bash
git add src/data/species.ts src/lib/season.ts src/lib/season.test.ts
git commit -m "Sandre : fermé avec le brochet, comme le code de l'environnement l'impose"
```

---

## Task 2: Réglementation Indre — quotas, notes, fiches migrateurs

**Files:**
- Modify: `src/data/regulation.ts`

**Interfaces:**
- Consumes: rien de la Task 1.
- Produces: `DEPT_REG["36"]` corrigé ; `localRegRows` couvre anguille/saumon/aloses.

- [ ] **Step 1: Corriger les quotas 36**

Dans `src/data/regulation.ts`, `DEPT_REG["36"]` :

Remplacer `salmonideQuota` :
```ts
    salmonideQuota: "6 salmonidés/jour dont 2 truites fario maximum",
```

Remplacer `carnassierQuota` (l'app affirmait une sous-limite « 1ʳᵉ cat. : 2 brochets/jour » que le poster de la fédération ne montre pas — on s'en tient au sourcé) :
```ts
    carnassierQuota: "3 carnassiers/jour dont 2 brochets maximum",
```

- [ ] **Step 2: Compléter les notes 36**

Remplacer le tableau `notes` de `DEPT_REG["36"]` par :

```ts
    notes: [
      "Brochet no-kill : tout brochet capturé du 14/03 au 24/04 doit être remis à l'eau.",
      "Sandre fermé du 26/01 au 24/04 en 2ᵉ catégorie (même fenêtre que le brochet).",
      "Black-bass : la fédération indique « no-kill » ; son document ne dit pas explicitement si cela vise les seules retenues d'Eguzon, Roche-au-Moine et Roche-Bat-l'Aigue ou toute la 2ᵉ catégorie. Dans le doute, relâchez.",
      "Truite arc-en-ciel : pêche autorisée toute l'année en 2ᵉ catégorie. L'app affiche la période de 1ʳᵉ catégorie, plus restrictive, car elle ne sait pas sur quelle catégorie d'eau vous êtes.",
      "Anguille jaune : ouverte du 1ᵉʳ avril au 31 août en 1ʳᵉ catégorie, interdite en 2ᵉ. Anguille argentée interdite partout.",
      "Saumon, truite de mer et alose interdits toute l'année.",
    ],
```

- [ ] **Step 3: Étendre `localRegRows` aux migrateurs interdits**

Le problème : une fiche anguille/saumon/alose en dept 36 affiche « Pas de spécificité départementale connue » alors que le poster liste des interdictions nettes. Ajouter, avant le `return rows;` final de `localRegRows` :

```ts
  // Les migrateurs interdits n'entraient dans aucun groupe ci-dessus, donc leur
  // fiche affichait « pas de spécificité départementale » — faux : l'arrêté les
  // interdit explicitement. Une interdiction est la spécificité la plus utile à
  // remonter.
  if (spId === "anguille") {
    rows.push(["Anguille jaune", "1ʳᵉ cat. : 1ᵉʳ avril → 31 août. 2ᵉ cat. : pêche interdite."]);
    rows.push(["Anguille argentée", "Pêche interdite."]);
  }
  if (spId === "saumon-atlantique") {
    rows.push(["Saumon & truite de mer", "Pêche interdite toute l'année."]);
  }
  if (spId === "grande-alose" || spId === "alose-feinte-atlantique" || spId === "alose-feinte-mediterraneenne") {
    rows.push(["Alose", "Pêche interdite toute l'année."]);
  }
```

Note : ces valeurs viennent du poster FDPPMA 36. Elles s'affichent pour les trois départements que l'app couvre, ce qui est acceptable ici parce qu'il s'agit d'espèces sous moratoire ou interdiction nationale — l'interdiction n'est pas propre à l'Indre. Le libellé ne prétend d'ailleurs pas « dans votre département ».

- [ ] **Step 4: Vérifier**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Expected: vert.

- [ ] **Step 5: Commit**

```bash
git add src/data/regulation.ts
git commit -m "Réglementation Indre : quotas sourcés, notes complétées, migrateurs interdits visibles"
```

---

## Task 3: Corrections de contenu — matériel et nœuds

**Files:**
- Modify: `src/data/gear-cards.ts`
- Modify: `src/data/knots.ts`

- [ ] **Step 1: Corriger les fils recommandés (contradiction interne)**

Dans `src/data/gear-cards.ts` :

`leurre-souple` — la fiche `bas-de-ligne-acier` dit l'acier « indispensable » devant un leurre à brochet ; cette fiche cible le brochet sans le proposer. Remplacer sa ligne `filIds` par :
```ts
      filIds: ["tresse", "fluorocarbone", "bas-de-ligne-acier"],
```

`poisson-nageur` — même contradiction. Remplacer :
```ts
      filIds: ["fluorocarbone", "bas-de-ligne-acier"],
```

`cuiller-ondulante` — cible aussi la truite fario, devant laquelle l'acier est contre-productif (lourd, visible). Remplacer :
```ts
      filIds: ["tresse", "fluorocarbone", "bas-de-ligne-acier"],
```

Et compléter son `usage` pour dire quel fil selon la cible — remplacer la valeur de `usage` par :
```ts
      usage: "Se pêche aussi bien en lancer-ramener qu'en verticale (jig) où elle plane à la descente. Bonne portée de lancer grâce à son poids. Bas de ligne acier devant le brochet (dents), fluorocarbone devant la truite, qui se méfie du câble.",
```

- [ ] **Step 2: Séparer teigne et ver de farine**

Toujours dans `gear-cards.ts`, remplacer entièrement l'entrée `teigne` par :

```ts
    {
      id: "teigne",
      name: "Teigne (larve de la fausse teigne de la cire)",
      summary: "Larve blanc crème et molle, élevée sur la cire des ruches, très odorante. À ne pas confondre avec le ver de farine, une autre larve vendue séparément.",
      usage: "Piquée par la tête, une ou deux par hameçon. Se conserve plusieurs semaines au frais. L'appât de référence de la pêche au toc en dérive ; le ver de farine, plus ferme et moins odorant, s'utilise de la même façon mais tient mieux à l'hameçon.",
      species: ["truite-fario", "perche"],
      hamecon: "N° 14 à 10.",
    },
```

- [ ] **Step 3: Renommer le jig**

L'entrée s'appelle « Leurre de traîne / jig » mais son `usage` ne décrit que la pêche verticale, jamais la traîne. Remplacer sa ligne `name` par :

```ts
      name: "Jig (pêche verticale)",
```

- [ ] **Step 4: Corriger la grammaire du spinnerbait**

Remplacer sa ligne `summary` par :
```ts
      summary: "Un bras métallique porte une ou deux palettes au-dessus d'une tête plombée à jupe ou à brin souple — la palette protège l'hameçon des accrochages.",
```

- [ ] **Step 5: Corriger l'orientation du plomb dans le montage texan**

Dans `src/data/knots.ts`, entrée `texan`, l'étape 1 dit « pointe vers le leurre » — c'est l'inverse de la réalité (le diagramme Commons `public/assets/knots/texan.webp` que l'app embarque montre le plomb pointe vers la canne, base plate contre la tête du leurre ; le dessin `texan-1.svg` est correct, seul ce texte était faux). Remplacer la première chaîne du tableau `steps` de `texan` par :

```ts
      "Enfiler un plomb balle sur le fil, pointe vers la canne : la base plate vient se caler contre la tête du leurre.",
```

- [ ] **Step 6: Lever l'ambiguïté du nœud de chirurgien**

Toujours dans `knots.ts`, entrée `boucle` : « Faire deux nœuds simples successifs » se lit comme deux nœuds l'un après l'autre, ce qui ne donne pas un nœud de chirurgien. Remplacer la deuxième chaîne de ses `steps` par :

```ts
      "Faire un nœud simple avec le fil doublé, puis repasser la boucle une seconde fois dans le même nœud avant de serrer (c'est ce double passage qui fait le nœud de chirurgien).",
```

- [ ] **Step 7: Distinguer le raccord de l'Albright**

Entrée `raccord` : sa technique fait doublon avec l'Albright sans dire lequel choisir. Remplacer sa valeur `when` par :

```ts
    when: "Pour relier le corps de ligne (tresse) au bas de ligne (fluoro) sans agrafe — passe dans les anneaux. Diamètres proches : ce raccord suffit. Diamètres très différents (tresse épaisse vers fluoro fin) : préférez l'Albright, dont les tours supplémentaires empêchent le fil fin de glisser.",
```

- [ ] **Step 8: Vérifier**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Expected: vert. `knots.test.ts` continue de passer (≥2 étapes, illustrations ≤ étapes — aucun compte ne change).

- [ ] **Step 9: Commit**

```bash
git add src/data/gear-cards.ts src/data/knots.ts
git commit -m "Matériel et nœuds : contradictions de fil, teigne, texan, chirurgien, raccord"
```

---

## Task 4: Liens manquants — 7 espèces vedettes sans matériel

**Files:**
- Modify: `src/data/gear-cards.ts`

**Contexte:** 7 espèces de `CURATED_IDS` n'apparaissent dans le `species[]` d'aucune fiche matériel, alors que leur propre fiche cite l'appât et que la fiche appât correspondante existe. Elles n'ont donc aucune section « Matériel recommandé ». Vérifié par script pendant l'audit.

- [ ] **Step 1: Compléter les `species[]`**

Dans `src/data/gear-cards.ts`, ajouter les ids manquants aux fiches appâts concernées. Remplacer les lignes `species` correspondantes :

`ver-de-terre` :
```ts
      species: ["truite-fario", "truite-arc-en-ciel", "perche", "breme", "tanche", "anguille", "chevesne", "barbeau", "carassin", "goujon", "gremille", "poisson-chat"],
```

`asticot` :
```ts
      species: ["gardon", "ablette", "breme", "barbeau", "goujon", "hotu", "rotengle", "carassin", "perche-soleil"],
```

`mais-doux` :
```ts
      species: ["carpe", "tanche", "gardon", "breme", "carassin"],
```

`pain-pate` :
```ts
      species: ["chevesne", "carpe", "gardon", "rotengle", "hotu"],
```

`cuiller-tournante` (l'omble de fontaine se pêche aux petits leurres, comme le dit sa propre fiche) :
```ts
      species: ["truite-fario", "truite-arc-en-ciel", "perche", "chevesne", "omble-fontaine"],
```

- [ ] **Step 2: Vérifier que les 7 sont couvertes**

Run:
```bash
node --input-type=module -e "
import { readFileSync } from 'fs';
const gc = readFileSync('src/data/gear-cards.ts','utf8');
const cited = new Set([...gc.matchAll(/species: \[([^\]]*)\]/g)].flatMap(m => m[1].split(',').map(s => s.trim().replace(/\"/g,'')).filter(Boolean)));
for (const t of ['barbeau','carassin','goujon','hotu','perche-soleil','poisson-chat','rotengle','gremille','omble-fontaine'])
  console.log(cited.has(t) ? 'OK      ' : 'MISSING ', t);
"
```
Expected: les 9 affichent `OK`. (Ombre et vandoise restent volontairement non liées : la mouche n'est pas couverte par le guide, et la vandoise est protégée.)

- [ ] **Step 3: Vérifier la suite**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Expected: vert — le test « chaque id de species[] existe dans SPECIES » couvre les nouveaux ids.

- [ ] **Step 4: Commit**

```bash
git add src/data/gear-cards.ts
git commit -m "Liens matériel : 9 espèces vedettes qui n'avaient aucun matériel recommandé"
```

---

## Task 5: Images du Palomar

**Files:**
- Modify: `scripts/images.manifest.json`
- Modify: `src/data/media.ts` (régénéré par le script)
- Possibly create: `public/assets/knots/palomar-1.svg`, `palomar-2.svg`, `palomar-3.svg`
- Possibly modify: `src/data/knot-step-media.ts`

**Contexte:** `public/assets/knots/palomar.webp` et `public/assets/knots-steps/palomar-1.webp` montrent tous deux **un anneau porte-clés métallique et de la cordelette paracorde multicolore** — pas de la pêche. Le nœud est topologiquement un vrai Palomar (la source Commons ne mentait pas), mais pour un pêcheur ça se lit comme un tuto bricolage. C'est le nœud le plus référencé de l'app.

- [ ] **Step 1: Chercher un remplaçant sur Commons**

Chercher sur `https://commons.wikimedia.org/wiki/Special:Search?search=palomar+knot+fishing&fulltext=1&ns6=1` et variantes (`fishing knot hook`, `nœud de pêche hameçon`). Critères : montre un **hameçon et du fil de pêche**, licence libre vérifiée sur la page du fichier, et **inspection visuelle obligatoire du fichier réel** avant acceptation (un audit précédent de ce projet a laissé passer une photo de marque et une photo recadrée qui ne montrait plus son sujet — les descriptions Commons mentent).

- [ ] **Step 2a: SI un remplaçant convenable existe**

Mettre à jour les deux entrées du manifeste (`knots` pour `palomar`, `knotSteps` pour `palomar`) avec le nouveau fichier + auteur/licence/URL réels, lancer `node scripts/fetch-images.mjs`, puis **regarder le `.webp` produit** pour confirmer.

- [ ] **Step 2b: SINON — dessiner la séquence maison**

Si aucune photo libre ne montre un Palomar sur hameçon, retirer les deux entrées `palomar` du manifeste (`knots` ET `knotSteps`), supprimer `public/assets/knots/palomar.webp` et `public/assets/knots-steps/palomar-1.webp`, relancer `node scripts/fetch-images.mjs` pour régénérer `media.ts` sans elles, puis créer 3 SVG maison suivant exactement la charte des 27 autres (`viewBox="0 0 160 190"`, encre `#1a201c`, vert actif `#1d6e42`, ambre mouvement `#9a6a12`, gris `#8a8676`, fond blanc, légende `<text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">`), correspondant aux 3 étapes existantes de la fiche `palomar` dans `knots.ts` :
1. « Doubler le fil et passer la boucle dans l'œillet. »
2. « Faire un nœud simple avec la boucle, sans serrer. »
3. « Passer l'hameçon entier dans la boucle, humecter et serrer. »

Puis ajouter l'entrée dans `LOCAL_KNOT_STEPS` de `src/data/knot-step-media.ts` :
```ts
  palomar: [
    { file: "assets/knots/palomar-1.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/palomar-2.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/palomar-3.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
  ],
```

- [ ] **Step 3: Vérifier `chaise-1.webp`**

Regarder `public/assets/knots-steps/chaise-1.webp`. C'est la seule des 5 images sourcées sans titre, et son dernier panneau semble plus emmêlé qu'un nœud de chaise standard. Si elle ne montre manifestement pas un nœud de chaise, la traiter comme le Palomar (re-sourcer ou retirer). Si elle est correcte, le noter dans le rapport et ne rien changer.

- [ ] **Step 4: Vérifier**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Expected: vert. `knots.test.ts` vérifie que toute image sourcée porte une `sourceUrl` — les SVG maison portent `license: "Schéma original"` et en sont exemptés.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Nœuds : remplacer les photos Palomar, qui montraient un porte-clés en paracorde"
```

---

## Task 6: Tests de garde

**Files:**
- Modify: `src/data/knots.test.ts`
- Modify: `src/data/gear-guide.test.ts`

**Contexte:** l'audit d'intégrité n'a trouvé aucun lien mort ni fichier manquant, mais rien ne garde ces invariants — un nom de fichier mal tapé dégraderait silencieusement en placeholder sans faire échouer la CI.

- [ ] **Step 1: Ajouter la garde « le fichier existe vraiment »**

Dans `src/data/knots.test.ts`, ajouter :

```ts
import { existsSync } from "node:fs";
import { join } from "node:path";

describe("médias nœuds — fichiers réellement présents", () => {
  it("chaque fichier référencé existe sous public/", () => {
    const manquants: string[] = [];
    for (const [id, entries] of Object.entries(ALL_KNOT_STEP_MEDIA)) {
      entries.forEach((e, i) => {
        if (!existsSync(join(process.cwd(), "public", e.file))) manquants.push(`${id}[${i}] → ${e.file}`);
      });
    }
    expect(manquants).toEqual([]);
  });
});
```

- [ ] **Step 2: Ajouter le même garde côté matériel + les comptages**

Dans `src/data/gear-guide.test.ts`, ajouter :

```ts
import { existsSync } from "node:fs";
import { join } from "node:path";
import { GEAR_MEDIA } from "./media";

describe("médias matériel — fichiers réellement présents", () => {
  it("chaque photo référencée existe sous public/", () => {
    const manquants = Object.entries(GEAR_MEDIA)
      .filter(([, m]) => !existsSync(join(process.cwd(), "public", m.file)))
      .map(([id, m]) => `${id} → ${m.file}`);
    expect(manquants).toEqual([]);
  });

  it("chaque photo pointe vers une fiche existante", () => {
    const ids = new Set(Object.values(GEAR_CARDS).flat().map((c) => c.id));
    const orphelines = Object.keys(GEAR_MEDIA).filter((id) => !ids.has(id));
    expect(orphelines).toEqual([]);
  });
});
```

- [ ] **Step 3: Vérifier**

Run: `npx vitest run && npx tsc -b && npx eslint src`
Expected: tout vert. Si un test « fichier existe » échoue, c'est un vrai défaut à corriger, pas un test à assouplir.

- [ ] **Step 4: Commit**

```bash
git add src/data/knots.test.ts src/data/gear-guide.test.ts
git commit -m "Tests : garder l'existence des fichiers médias et l'absence d'orphelins"
```

---

## Task 7: Vérification finale

**Files:** aucun.

- [ ] **Step 1: Suite complète**

Run: `npx tsc -b && npx eslint src && npx vitest run && npm run build`
Expected: tout vert, 0 warning.

- [ ] **Step 2: Vérifier le sandre au navigateur**

Démarrer le serveur de dev, ouvrir la fiche Sandre. Expected : la pastille et la section saison reflètent la nouvelle règle. Comme la date du jour est en juillet (hors fenêtre de fermeture), la fiche doit afficher **ouverte** — la fermeture ne se voit qu'entre fin janvier et fin avril. Vérifier plutôt via le test de la Task 1, qui teste une date de mars.

- [ ] **Step 3: Vérifier le guide matériel**

Ouvrir Outils → Matériel → Guide. Déplier « Leurre souple » : le bas de ligne acier doit apparaître dans « Fil recommandé ». Déplier « Teigne » : le titre ne doit plus mentionner le ver de farine comme synonyme.

- [ ] **Step 4: Vérifier une nouvelle liaison espèce**

Ouvrir la fiche Barbeau fluviatile : une section « Matériel recommandé » doit désormais exister (elle n'existait pas avant).

- [ ] **Step 5: Vérifier la console**

`read_console_messages` (onlyErrors: true). Expected : aucune erreur.

- [ ] **Step 6: Arrêter le serveur.** Pas de commit.

---

## Hors périmètre (décidé pendant l'audit, ne pas traiter)

- **Maille de l'ombre en 36.** Le poster groupe « TRUITE/OMBRE — 23 cm » mais le national (R436-18) impose 30 cm pour l'ombre. `effectiveMaille` prend déjà le maximum des deux, donc câbler l'ombre sur `truiteMaille` ne changerait rien à l'affichage (30 reste). L'app est dans le sens sûr ; le poster simplifie.
- **4 fiches matériel sans photo** (`pain-pate`, `vif`, `fluorocarbone`, `bas-de-ligne-acier`). Le repli placeholder est propre et la spec du chantier précédent autorise explicitement une fiche sans photo.
- **Grenouilles, nombre de lignes, hameçons par ligne, carafe à vairons, vermée, nasses.** Le poster les couvre, l'app n'a aucun concept d'engins ni d'amphibiens. C'est un périmètre à part entière, à décider séparément.
- **Écrevisses : fenêtre 1ʳᵉ catégorie 14/03–20/09.** Le module écrevisses ne modélise aucune saisonnalité ; l'ajouter demande un design propre, pas une retouche.
