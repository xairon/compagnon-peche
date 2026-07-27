# Nœuds, montages & guide matériel — tutoriels pas-à-pas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Porter les fiches nœuds/montages de 7 à 15, chacune avec une vraie séquence
illustrée étape par étape (au lieu d'un schéma unique), et enrichir le guide matériel
(leurres/appâts/fils) en fiches détaillées avec photo sourcée.

**Architecture:** Deux overlays additifs (`ALL_KNOT_STEP_MEDIA`, `GEAR_MEDIA`) suivant le
même principe que `FICHES`/`EDIBILITY` déjà en place pour les espèces — jamais de
duplication d'une donnée qui vit ailleurs, jamais de placeholder cassé quand une
illustration manque. Le pipeline d'images existant (`fetch-images.mjs` +
`images.manifest.json`) est étendu pour produire des tableaux d'images (une par étape) au
lieu d'une image unique par fiche, même mécanique que celle déjà utilisée pour les photos
multiples d'espèces (`SPECIES_MEDIA`).

**Tech Stack:** React + TypeScript, Vite, Vitest, sharp (traitement d'image), SVG dessiné
à la main pour les schémas maison.

## Global Constraints

- Palette des schémas dessinés à la main : encre `#1a201c` (fil/ligne principale), vert
  forêt `#1d6e42` (élément en cours de formation à cette étape), ambre `#9a6a12` (élément
  qui bouge/vient d'être ajouté), gris muet `#8a8676` / `#c9c3b4` (labels, guides), fond
  blanc `#ffffff` — ce sont les couleurs déjà utilisées dans `public/assets/knots/dropshot.svg`
  et `raccord.svg` existants, à réutiliser telles quelles, jamais de nouvelle couleur.
- SVG dessiné maison : `viewBox="0 0 160 190"`, `font-family="-apple-system, system-ui,
  Segoe UI, sans-serif"`, traits `stroke-width` entre 1.5 et 2.6, `stroke-linecap="round"`
  sur les traits de nœud, jamais de dégradé ni d'ombre portée. Légende en bas de vignette :
  `<text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">`.
- Fichier dessiné maison : `author: "Compagnon de pêche"`, `license: "Schéma original"`,
  `sourceUrl: ""` — jamais ces valeurs pour un fichier sourcé Wikimedia Commons, qui porte
  toujours son auteur/licence/URL réels.
- Chemins : schémas maison sous `public/assets/knots/<id>-<n>.svg` (n = numéro d'étape,
  1-indexé) ; photos sourcées sous `public/assets/knots-steps/<id>-<n>.webp` (généré par le
  script, ne jamais créer ce dossier à la main).
- Après chaque tâche : `npx tsc -b`, `npx eslint src`, `npx vitest run` doivent tous être
  verts avant de commit.
- Aucune fiche existante ne perd son contenu texte actuel (`Knot.steps`, `use`, `when`
  restent identiques mot pour mot pour les 7 fiches déjà en place) — seules des
  illustrations s'ajoutent.

---

## Recherche de sourcing déjà faite (à ne pas refaire)

Vérifié sur Wikimedia Commons pendant le cadrage — ces fichiers sont confirmés
disponibles, sous licence libre, et montrent réellement une séquence de pose :

| Fiche | Fichier Commons | Auteur | Licence |
|---|---|---|---|
| Nœud de sang (nouveau) | `File:BloodKnot_HowTo.jpg` | Chris 73 | CC BY-SA 3.0 |
| Albright (nouveau) | `File:Albright_knot_diagram_retouched.png` | LadyofHats (original) · retouché par Dfred | Domaine public |
| Nœud de chaise (nouveau) | `File:Bowline_in_four_steps.png` | Luis Dantas | CC BY-SA 3.0 |
| Palomar (upgrade) | `File:PalomarKnotSequence.jpg` | Vaughan Pratt | CC BY-SA 3.0 |
| Boucle/chirurgien (upgrade) | `File:Surgeon's_Loop_knot.svg` | LadyofHats | Domaine public |
| Clinch amélioré | — aucune séquence trouvée sur Commons | — | reste sur sa photo actuelle (pas d'upgrade) |

Ces six fichiers sont chacun une **image unique combinant toutes les étapes** (un
« poster »), pas des fichiers séparés par étape — c'est ce que Commons propose réellement,
et le choix pris pendant le cadrage est de les utiliser tels quels plutôt que de les
découper à l'aveugle en fausses étapes séparées. Chaque fiche sourcée a donc un tableau
`steps` d'un seul élément dans le manifeste.

---

## Task 1: Scaffolding — overlay d'illustrations par étape + rendu

**Files:**
- Create: `src/data/knot-step-media.ts`
- Modify: `src/data/knot-diagrams.ts`
- Modify: `src/screens/Noeuds.tsx:51-88` (fonction `KnotDetail`)
- Modify: `src/styles.css` (ajout après la règle `.knot-diagram img` ligne 1242)
- Test: `src/data/knots.test.ts` (nouveau fichier)

**Interfaces:**
- Consumes: `MediaEntry` (`src/data/media.ts`, déjà existant), `Knot` (`src/types.ts`,
  déjà existant), `KNOTS` (`src/data/knots.ts`, déjà existant).
- Produces: `LOCAL_KNOT_STEPS: Record<string, MediaEntry[]>` (depuis
  `knot-step-media.ts`), `ALL_KNOT_STEP_MEDIA: Record<string, MediaEntry[]>` (depuis
  `knot-diagrams.ts`, fusion avec le futur `KNOT_STEP_MEDIA` sourcé) — noms que les tâches
  suivantes réutilisent tels quels.

- [ ] **Step 1: Écrire le test qui échoue (import d'un module qui n'existe pas encore)**

Créer `src/data/knots.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { KNOTS } from "./knots";
import { ALL_KNOT_STEP_MEDIA } from "./knot-diagrams";

describe("nœuds & montages — cohérence des données", () => {
  it("chaque fiche a au moins 2 étapes", () => {
    const fautes = KNOTS.filter((k) => k.steps.length < 2).map((k) => k.id);
    expect(fautes).toEqual([]);
  });

  it("jamais plus d'illustrations que d'étapes de texte", () => {
    const fautes: string[] = [];
    for (const k of KNOTS) {
      const media = ALL_KNOT_STEP_MEDIA[k.id];
      if (media && media.length > k.steps.length) fautes.push(k.id);
    }
    expect(fautes).toEqual([]);
  });

  it("toute illustration sourcée (pas 'Schéma original') porte une URL source", () => {
    const fautes: string[] = [];
    for (const [id, entries] of Object.entries(ALL_KNOT_STEP_MEDIA)) {
      entries.forEach((e, i) => {
        if (e.license !== "Schéma original" && !e.sourceUrl) fautes.push(`${id}[${i}]`);
      });
    }
    expect(fautes).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/data/knots.test.ts`
Expected: FAIL — `Cannot find module './knot-diagrams'` exporting `ALL_KNOT_STEP_MEDIA` (le
symbole n'existe pas encore, seul `ALL_KNOT_MEDIA` existe aujourd'hui).

- [ ] **Step 3: Créer l'overlay des schémas maison (vide pour l'instant)**

Créer `src/data/knot-step-media.ts` :

```ts
import type { MediaEntry } from "./media";

/**
 * Séquences dessinées à la main, une entrée par étape (même ordre que
 * Knot.steps), pour les montages/nœuds que Wikimedia Commons ne couvre pas.
 * Un id absent d'ici simplement n'a pas encore de schéma maison — jamais de
 * tableau vide ou d'entrée factice en attendant.
 */
export const LOCAL_KNOT_STEPS: Record<string, MediaEntry[]> = {};
```

- [ ] **Step 4: Étendre `knot-diagrams.ts` avec la fusion**

Lire d'abord `src/data/knot-diagrams.ts` en entier (5 lignes aujourd'hui — juste
`LOCAL_KNOT_MEDIA`), puis y ajouter à la fin :

```ts
import { LOCAL_KNOT_STEPS } from "./knot-step-media";
import { KNOT_STEP_MEDIA } from "./media";

/** Toutes les séquences par étape, sourcées Commons + dessinées maison,
 *  fusionnées par id. `KNOT_STEP_MEDIA` (généré, Task 2) n'existe pas encore
 *  à ce stade du plan — le fournir vide temporairement le rend possible. */
export const ALL_KNOT_STEP_MEDIA: Record<string, MediaEntry[]> = {
  ...KNOT_STEP_MEDIA,
  ...LOCAL_KNOT_STEPS,
};
```

Comme `KNOT_STEP_MEDIA` n'existe pas encore dans `media.ts` (généré par le script à la
Task 2), ajouter temporairement à la fin de `src/data/media.ts` (juste après l'export de
`KNOT_MEDIA` existant) :

```ts
export const KNOT_STEP_MEDIA: Record<string, MediaEntry[]> = {};
```

(La Task 2 régénère `media.ts` entièrement depuis le script et remplacera cette ligne par
le contenu réel — le fichier porte déjà l'en-tête « GENERATED … do not edit by hand », donc
cette édition manuelle est temporaire et volontairement minimale.)

- [ ] **Step 5: Lancer le test, vérifier qu'il passe**

Run: `npx vitest run src/data/knots.test.ts`
Expected: PASS — 3/3 tests verts (les tableaux sont vides, donc les invariants sont
trivialement satisfaits, ce qui est correct : rien à signaler tant qu'aucune illustration
n'existe).

- [ ] **Step 6: Brancher le rendu dans `KnotDetail`**

Remplacer entièrement la fonction `KnotDetail` dans `src/screens/Noeuds.tsx` (lignes
51-88) :

```tsx
import { useStore } from "../store-hooks";
import { KNOTS } from "../data/knots";
import { Icon } from "../components/Icon";
import { ICONS } from "../components/icons-data";
import { Media } from "../components/Media";
import { ALL_KNOT_MEDIA } from "../components/media-helpers";
import { ALL_KNOT_STEP_MEDIA } from "../data/knot-diagrams";

// ... Noeuds() inchangé (lignes 8-49) ...

export function KnotDetail() {
  const { state, back } = useStore();
  const knot = KNOTS.find((k) => k.id === state.knotId);
  if (!knot) return null;
  const stepMedia = ALL_KNOT_STEP_MEDIA[knot.id];
  // Repli : une fiche sans séquence par étape garde son ancien schéma unique,
  // s'il existe (les 7 fiches d'origine avant upgrade).
  const hasLegacyDiagram = !stepMedia && !!ALL_KNOT_MEDIA[knot.id];

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div>
          <div className="topbar-title">{knot.name}</div>
          <div className="h-sub">{knot.use}</div>
        </div>
      </div>
      <div style={{ padding: "10px 18px 24px" }}>
        {hasLegacyDiagram && (
          <div className="knot-diagram">
            <Media kind="knot" id={knot.id} placeholder={knot.name} />
          </div>
        )}
        {knot.steps.map((s, i) => {
          const media = stepMedia?.[i];
          return (
            <div key={i} className="knot-step">
              <div className="num">{i + 1}</div>
              <div style={{ flex: 1 }}>
                {media && (
                  <img
                    className="knot-step-img"
                    src={import.meta.env.BASE_URL + media.file}
                    alt={`${knot.name} — étape ${i + 1}`}
                    loading="lazy"
                  />
                )}
                <div className="cap">{s}</div>
              </div>
            </div>
          );
        })}
        <div className="info">
          <b>Quand l'utiliser :</b> {knot.when}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Ajouter le style de la vignette d'étape**

Dans `src/styles.css`, juste après la règle `.knot-diagram img` (ligne 1242), ajouter :

```css
.knot-step-img {
  display: block;
  width: 100%;
  max-width: 220px;
  border-radius: 10px;
  border: 1px solid var(--line-strong);
  background: #fff;
  margin-bottom: 8px;
}
```

- [ ] **Step 8: Vérifier build + tests + lint**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Expected: tout vert, 0 régression (les 7 fiches existantes se comportent exactement comme
avant — `hasLegacyDiagram` est vrai pour elles tant qu'aucune étape sourcée/dessinée n'a
été ajoutée).

- [ ] **Step 9: Commit**

```bash
git add src/data/knot-step-media.ts src/data/knot-diagrams.ts src/data/media.ts src/data/knots.test.ts src/screens/Noeuds.tsx src/styles.css
git commit -m "Nœuds : scaffolding pour les séquences d'illustration par étape"
```

---

## Task 2: Pipeline d'images — support des séquences par étape

**Files:**
- Modify: `scripts/images.manifest.json`
- Modify: `scripts/fetch-images.mjs`

**Interfaces:**
- Consumes: rien de nouveau (réutilise `sharp`, `sourceBuffer`, `thumbUrl`, `download`
  déjà définis dans `fetch-images.mjs`).
- Produces: `KNOT_STEP_MEDIA: Record<string, MediaEntry[]>` écrit dans `src/data/media.ts`
  (remplace la ligne temporaire ajoutée manuellement à la Task 1, Step 4) ; fichiers
  `public/assets/knots-steps/<id>-<n>.webp`.

- [ ] **Step 1: Ajouter la clé `knotSteps` au manifeste**

Dans `scripts/images.manifest.json`, ajouter une nouvelle clé top-level `knotSteps` (au
même niveau que `species`/`knots`/`recipes`/`techniques`) :

```json
"knotSteps": [
  {
    "id": "sang",
    "steps": [
      {
        "filename": "File:BloodKnot_HowTo.jpg",
        "author": "Chris 73",
        "license": "CC BY-SA 3.0",
        "file_page_url": "https://commons.wikimedia.org/wiki/File:BloodKnot_HowTo.jpg"
      }
    ]
  },
  {
    "id": "albright",
    "steps": [
      {
        "filename": "File:Albright_knot_diagram_retouched.png",
        "author": "LadyofHats (original) · retouché par Dfred",
        "license": "Domaine public",
        "file_page_url": "https://commons.wikimedia.org/wiki/File:Albright_knot_diagram_retouched.png"
      }
    ]
  },
  {
    "id": "chaise",
    "steps": [
      {
        "filename": "File:Bowline_in_four_steps.png",
        "author": "Luis Dantas",
        "license": "CC BY-SA 3.0",
        "file_page_url": "https://commons.wikimedia.org/wiki/File:Bowline_in_four_steps.png"
      }
    ]
  },
  {
    "id": "palomar",
    "steps": [
      {
        "filename": "File:PalomarKnotSequence.jpg",
        "author": "Vaughan Pratt",
        "license": "CC BY-SA 3.0",
        "file_page_url": "https://commons.wikimedia.org/wiki/File:PalomarKnotSequence.jpg"
      }
    ]
  },
  {
    "id": "boucle",
    "steps": [
      {
        "filename": "File:Surgeon's_Loop_knot.svg",
        "author": "LadyofHats",
        "license": "Domaine public",
        "file_page_url": "https://commons.wikimedia.org/wiki/File:Surgeon's_Loop_knot.svg"
      }
    ]
  }
]
```

- [ ] **Step 2: Ajouter le traitement dans `fetch-images.mjs`**

Dans `scripts/fetch-images.mjs`, ajouter une nouvelle fonction juste après
`processSpecies` (après la ligne `return media;` qui la termine, avant la ligne
`const speciesMedia = await processSpecies(...)`) :

```js
// Séquences d'illustration par étape (nœuds/montages) : même mécanique que
// processSpecies (plusieurs images par id), mais la sortie garde l'ORDRE du
// tableau (chaque élément = une étape), jamais un id -> une seule image.
async function processKnotSteps(items) {
  const outDir = join(root, "public/assets/knots-steps");
  await mkdir(outDir, { recursive: true });
  const media = {};
  for (const it of items) {
    const entries = [];
    for (let i = 0; i < it.steps.length; i++) {
      const p = it.steps[i];
      const file = `assets/knots-steps/${it.id}-${i + 1}.webp`;
      const outPath = join(root, "public", file);
      if (!existsSync(outPath) || p.replace) {
        try {
          const buf = await sourceBuffer(p, 960);
          await sharp(buf, { density: 200 })
            .rotate()
            .resize({ width: 900, height: 648, fit: "inside", withoutEnlargement: true })
            .flatten({ background: "#ffffff" })
            .webp({ quality: 84 })
            .toFile(outPath);
          console.log(`✓ knotSteps/${it.id}-${i + 1}  (${p.license})`);
          await sleep(3000);
        } catch (e) {
          console.error(`✗ knotSteps/${it.id}#${i + 1}: ${e.message}`);
          continue;
        }
      } else {
        console.log(`• knotSteps/${it.id}-${i + 1}  (déjà présent)`);
      }
      entries.push({ file, author: p.author, license: p.license, sourceUrl: p.file_page_url });
    }
    if (entries.length) media[it.id] = entries;
  }
  return media;
}
```

Note : `.resize({ fit: "inside" })` + `.flatten({ background: "#ffffff" })` plutôt que le
`fit: "cover"` utilisé pour les photos d'espèces — un diagramme de nœud ne doit jamais être
rogné (perdre un bord du schéma le rend faux), contrairement à une photo de poisson où un
recadrage centré reste correct.

Puis, juste avant la ligne `const speciesMedia = await processSpecies(manifest.species ||
[]);`, ajouter :

```js
const knotStepMedia = await processKnotSteps(manifest.knotSteps || []);
```

Enfin, dans le template `body` qui écrit `src/data/media.ts` (chercher
`export const KNOT_MEDIA`), ajouter juste après cette ligne :

```js
export const KNOT_STEP_MEDIA: Record<string, MediaEntry[]> = ${JSON.stringify(knotStepMedia, null, 2)};
```

Et mettre à jour la ligne de log finale pour inclure le nouveau compteur :

```js
console.log(
  `\nWrote src/data/media.ts — ${Object.keys(speciesMedia).length} species, ${Object.keys(knotMedia).length} knots, ${Object.keys(knotStepMedia).length} knot-step-sequences, ${Object.keys(recipeMedia).length} recipes, ${Object.keys(techMedia).length} techniques.`,
);
```

- [ ] **Step 3: Lancer le script**

Run: `node scripts/fetch-images.mjs`
Expected: télécharge les 5 fichiers listés au Step 1 (clinch n'est pas dans `knotSteps`,
volontairement — pas de séquence trouvée), écrit
`public/assets/knots-steps/{sang,albright,chaise,palomar,boucle}-1.webp`, régénère
`src/data/media.ts` avec un vrai `KNOT_STEP_MEDIA` (remplace la ligne vide ajoutée
manuellement à la Task 1).

- [ ] **Step 4: Vérifier les fichiers produits**

Run: `ls public/assets/knots-steps/`
Expected: 5 fichiers `.webp` (`sang-1.webp`, `albright-1.webp`, `chaise-1.webp`,
`palomar-1.webp`, `boucle-1.webp`).

Run: `grep -A6 '"sang"' src/data/media.ts`
Expected: une entrée `KNOT_STEP_MEDIA["sang"]` avec `file: "assets/knots-steps/sang-1.webp"`,
`author: "Chris 73"`, `license: "CC BY-SA 3.0"`.

- [ ] **Step 5: Vérifier build + tests + lint**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Expected: tout vert. `knots.test.ts` passe toujours (aucune fiche `Knot` ne référence
encore `sang`/`albright`/`chaise` dans `KNOTS`, donc `ALL_KNOT_STEP_MEDIA` contient des
entrées orphelines à ce stade — ce n'est PAS testé comme une faute par le test actuel, qui
ne vérifie que le sens image→étape, jamais étape→image ; les Tasks 3-5 ajoutent les fiches
`Knot` correspondantes).

- [ ] **Step 6: Commit**

```bash
git add scripts/images.manifest.json scripts/fetch-images.mjs src/data/media.ts public/assets/knots-steps/
git commit -m "Pipeline : support des séquences d'images par étape (nœuds/montages)"
```

---

## Task 3: Nouvelle fiche — Nœud de sang

**Files:**
- Modify: `src/data/knots.ts`

**Interfaces:**
- Consumes: `KNOT_STEP_MEDIA["sang"]` (produit à la Task 2).
- Produces: `KNOTS` gagne une entrée `id: "sang"`.

- [ ] **Step 1: Ajouter la fiche**

Dans `src/data/knots.ts`, ajouter à la fin du tableau `KNOTS` (avant le `];` final), après
l'entrée `boucle` :

```ts
  {
    id: "sang",
    cat: "noeud",
    name: "Nœud de sang",
    use: "Relier deux fils de diamètre proche",
    when: "Le nœud de référence pour raccorder deux nylons ou deux fluorocarbones de diamètre similaire (bas de ligne, réparation de casse).",
    steps: [
      "Superposer les deux brins sur 15 cm, en sens opposés.",
      "Enrouler chaque brin 5 à 6 fois autour de l'autre, en partant du centre vers l'extérieur.",
      "Repasser les deux bouts au centre, en sens inverse l'un de l'autre, puis humecter et serrer progressivement les deux côtés.",
    ],
  },
```

- [ ] **Step 2: Vérifier**

Run: `npx vitest run src/data/knots.test.ts && npx tsc -b`
Expected: PASS. Vérifier aussi visuellement dans l'app (voir Task ready-for-review plus
bas) que la fiche « Nœud de sang » apparaît dans la liste des Nœuds et affiche l'image
`assets/knots-steps/sang-1.webp` au-dessus de la première étape.

- [ ] **Step 3: Commit**

```bash
git add src/data/knots.ts
git commit -m "Nœuds : ajouter le nœud de sang"
```

---

## Task 4: Nouvelle fiche — Albright

**Files:**
- Modify: `src/data/knots.ts`

**Interfaces:**
- Consumes: `KNOT_STEP_MEDIA["albright"]` (Task 2).
- Produces: `KNOTS` gagne une entrée `id: "albright"`.

- [ ] **Step 1: Ajouter la fiche**

Après l'entrée `sang` ajoutée à la Task 3 :

```ts
  {
    id: "albright",
    cat: "noeud",
    name: "Albright",
    use: "Relier deux fils de diamètre très différent",
    when: "Backing/tresse épaisse vers bas de ligne fin, ou corps de ligne vers un fil beaucoup plus fin — là où le nœud de sang glisse.",
    steps: [
      "Former une boucle avec le fil le plus épais, la tenir entre deux doigts.",
      "Passer le fil fin dans la boucle et l'enrouler 10 à 12 fois autour des deux brins de la boucle, en revenant vers l'ouverture.",
      "Repasser le bout du fil fin dans la boucle par le même côté qu'à l'entrée, humecter et serrer progressivement en tenant les deux fils épais.",
    ],
  },
```

- [ ] **Step 2: Vérifier**

Run: `npx vitest run src/data/knots.test.ts && npx tsc -b`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/data/knots.ts
git commit -m "Nœuds : ajouter l'Albright"
```

---

## Task 5: Nouvelle fiche — Nœud de chaise

**Files:**
- Modify: `src/data/knots.ts`

**Interfaces:**
- Consumes: `KNOT_STEP_MEDIA["chaise"]` (Task 2).
- Produces: `KNOTS` gagne une entrée `id: "chaise"`.

- [ ] **Step 1: Ajouter la fiche**

Après l'entrée `albright` ajoutée à la Task 4 :

```ts
  {
    id: "chaise",
    cat: "noeud",
    name: "Nœud de chaise",
    use: "Boucle fixe et solide en bout de ligne",
    when: "Amarrer une embarcation, fixer une ligne à un point fixe (piquet, anneau) — une boucle qui ne glisse jamais et se défait pourtant facilement après tension.",
    steps: [
      "Former une petite boucle sur le brin dormant, environ 30 cm avant le bout.",
      "Faire passer le bout du fil dans cette boucle, par en dessous.",
      "Passer le bout derrière le brin dormant puis le repasser dans la petite boucle, dans le sens inverse ; humecter et serrer en tenant le brin dormant.",
    ],
  },
```

- [ ] **Step 2: Vérifier**

Run: `npx vitest run src/data/knots.test.ts && npx tsc -b`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/data/knots.ts
git commit -m "Nœuds : ajouter le nœud de chaise"
```

---

## Task 6: Upgrade — Palomar

**Files:**
- Modify: `src/data/knots.ts` (aucun changement de texte, juste vérification)

**Interfaces:**
- Consumes: `KNOT_STEP_MEDIA["palomar"]` (Task 2) — l'id `palomar` existe déjà dans
  `KNOTS`, aucune nouvelle entrée à créer.

- [ ] **Step 1: Vérifier que l'upgrade s'applique automatiquement**

Aucune modification de code n'est nécessaire : `ALL_KNOT_STEP_MEDIA["palomar"]` existe
désormais (Task 2), donc `KnotDetail` (Task 1) bascule automatiquement `hasLegacyDiagram`
à `false` pour cette fiche et affiche la nouvelle séquence à la place de l'ancienne photo.

Run: `npx vitest run src/data/knots.test.ts`
Expected: PASS — le test « jamais plus d'illustrations que d'étapes » passe (1 image ≤ 3
étapes de texte existantes).

- [ ] **Step 2: Vérifier dans l'app (voir Task 20, vérification navigateur groupée)**

Pas de commit séparé nécessaire ici — aucun fichier n'a changé depuis la Task 2.

---

## Task 7: Upgrade — Boucle (chirurgien)

**Files:** aucun changement de code — même situation que la Task 6.

**Interfaces:**
- Consumes: `KNOT_STEP_MEDIA["boucle"]` (Task 2).

- [ ] **Step 1: Vérifier**

Run: `npx vitest run src/data/knots.test.ts`
Expected: PASS. Même mécanisme automatique que la Task 6 : `ALL_KNOT_STEP_MEDIA["boucle"]`
existe désormais, la fiche bascule sur la nouvelle séquence sans toucher au code.

---

## Task 8: Upgrade dessiné maison — Raccord ligne/bas de ligne

**Files:**
- Create: `public/assets/knots/raccord-1.svg`, `raccord-2.svg`, `raccord-3.svg`
- Modify: `src/data/knot-step-media.ts`

**Interfaces:**
- Consumes: rien (dessin original, pas de source externe).
- Produces: `LOCAL_KNOT_STEPS["raccord"]`, 3 éléments — même ordre que les 3 étapes de
  texte déjà présentes dans `KNOTS` pour `id: "raccord"` (« Former une boucle… », « Enrouler
  la tresse… », « Repasser la tresse… »).

- [ ] **Step 1: Créer les 3 SVG**

`public/assets/knots/raccord-1.svg` (étape 1 — former la boucle) :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <path d="M20,60 h60" stroke="#4a5d52" stroke-width="2.4" fill="none"/>
  <path d="M80,60 q30,0 30,26 q0,26 -30,26" stroke="#4a5d52" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">1. Former la boucle</text>
</svg>
```

`public/assets/knots/raccord-2.svg` (étape 2 — enrouler la tresse) :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <path d="M20,86 h44" stroke="#4a5d52" stroke-width="2.4" fill="none"/>
  <path d="M64,86 q30,0 30,-22 q0,-22 -30,-22" stroke="#4a5d52" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.5"/>
  <g stroke="#1a201c" stroke-width="2" fill="none" stroke-linecap="round">
    <path d="M64,74 q8,-4 16,0 q8,4 16,0 q8,-4 16,0"/>
    <path d="M64,86 q8,4 16,0 q8,-4 16,0 q8,4 16,0"/>
    <path d="M64,98 q8,-4 16,0 q8,4 16,0 q8,-4 16,0"/>
  </g>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">2. Enrouler 8-10 tours</text>
</svg>
```

`public/assets/knots/raccord-3.svg` (étape 3 — serré) :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="20" y1="86" x2="60" y2="86" stroke="#4a5d52" stroke-width="3"/>
  <line x1="100" y1="86" x2="140" y2="86" stroke="#1a201c" stroke-width="2"/>
  <g stroke="#1d6e42" stroke-width="2.2" fill="none" stroke-linecap="round">
    <path d="M60,86 q6,-11 14,0 q6,11 14,0 q6,-11 14,0"/>
    <path d="M74,86 q6,11 14,0 q6,-11 14,0 q6,11 14,0"/>
  </g>
  <circle cx="88" cy="86" r="2.6" fill="#1d6e42"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">3. Serrer, raser</text>
</svg>
```

- [ ] **Step 2: Ajouter l'entrée dans `knot-step-media.ts`**

Dans `src/data/knot-step-media.ts`, remplir `LOCAL_KNOT_STEPS` :

```ts
export const LOCAL_KNOT_STEPS: Record<string, MediaEntry[]> = {
  raccord: [
    { file: "assets/knots/raccord-1.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/raccord-2.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/raccord-3.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
  ],
};
```

- [ ] **Step 3: Vérifier**

Run: `npx vitest run src/data/knots.test.ts && npx tsc -b`
Expected: PASS (3 images = 3 étapes, jamais plus).

- [ ] **Step 4: Commit**

```bash
git add public/assets/knots/raccord-1.svg public/assets/knots/raccord-2.svg public/assets/knots/raccord-3.svg src/data/knot-step-media.ts
git commit -m "Nœuds : séquence illustrée pour le raccord ligne/bas de ligne"
```

---

## Task 9: Upgrade dessiné maison — Drop shot

**Files:**
- Create: `public/assets/knots/dropshot-1.svg`, `dropshot-2.svg`, `dropshot-3.svg`
- Modify: `src/data/knot-step-media.ts`

**Interfaces:**
- Produces: `LOCAL_KNOT_STEPS["dropshot"]`, 3 éléments, correspondant aux 3 étapes de texte
  existantes (« Nouer l'hameçon au palomar… », « Repasser le brin… », « Fixer le plomb… »).

- [ ] **Step 1: Créer les 3 SVG**

`public/assets/knots/dropshot-1.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="150" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <path d="M80,90 h20 a8,8 0 0 1 8,8 v8 a11,11 0 0 1 -20,3" fill="none" stroke="#1d6e42" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M40,140 l40,-38" stroke="#9a6a12" stroke-width="1.6" fill="none" stroke-dasharray="3 3"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">1. Palomar, 30-80 cm sous le nœud</text>
</svg>
```

`public/assets/knots/dropshot-2.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="150" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <path d="M80,90 h20 a8,8 0 0 1 8,8 v8 a11,11 0 0 1 -20,3" fill="none" stroke="#9a6a12" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M100,84 l6,-8 -3,9" fill="none" stroke="#9a6a12" stroke-width="1.4"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">2. Repasser : hameçon pointe en haut</text>
</svg>
```

`public/assets/knots/dropshot-3.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="130" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <path d="M80,60 h20 a8,8 0 0 1 8,8 v8 a11,11 0 0 1 -20,3" fill="none" stroke="#1d6e42" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M108,74 q22,-5 32,3 q-19,8 -32,2 z" fill="#e7efe9" stroke="#1d6e42" stroke-width="1.4"/>
  <path d="M80,130 q-9,8 0,20 q9,-12 0,-20 z" fill="#3a3e36"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">3. Plomb en bout, leurre par la tête</text>
</svg>
```

- [ ] **Step 2: Ajouter l'entrée**

Dans `src/data/knot-step-media.ts`, ajouter à `LOCAL_KNOT_STEPS` (après `raccord`) :

```ts
  dropshot: [
    { file: "assets/knots/dropshot-1.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/dropshot-2.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/dropshot-3.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
  ],
```

- [ ] **Step 3: Vérifier**

Run: `npx vitest run src/data/knots.test.ts && npx tsc -b`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add public/assets/knots/dropshot-1.svg public/assets/knots/dropshot-2.svg public/assets/knots/dropshot-3.svg src/data/knot-step-media.ts
git commit -m "Nœuds : séquence illustrée pour le drop shot"
```

---

## Task 10: Upgrade dessiné maison — Montage texan

**Files:**
- Create: `public/assets/knots/texan-1.svg`, `texan-2.svg`, `texan-3.svg`
- Modify: `src/data/knot-step-media.ts`

**Interfaces:**
- Produces: `LOCAL_KNOT_STEPS["texan"]`, 3 éléments, correspondant aux 3 étapes existantes
  (« Enfiler un plomb balle… », « Nouer un hameçon texan… », « Piquer le leurre… »).

- [ ] **Step 1: Créer les 3 SVG**

`public/assets/knots/texan-1.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="150" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <path d="M80,50 l-9,20 h18 z" fill="#9a6a12" stroke="#9a6a12" stroke-width="1"/>
  <path d="M80,70 l6,-9 -3,10" fill="none" stroke="#9a6a12" stroke-width="1.3"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">1. Plomb balle, pointe vers le leurre</text>
</svg>
```

`public/assets/knots/texan-2.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="120" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <path d="M80,50 l-9,20 h18 z" fill="#8a8676" stroke="#8a8676" stroke-width="1"/>
  <path d="M80,90 h18 a9,9 0 0 1 9,9 v8 a12,12 0 0 1 -22,4" fill="none" stroke="#1d6e42" stroke-width="2.2" stroke-linecap="round"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">2. Nouer l'hameçon texan (clinch/palomar)</text>
</svg>
```

`public/assets/knots/texan-3.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="100" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <path d="M80,50 l-9,20 h18 z" fill="#8a8676" stroke="#8a8676" stroke-width="1"/>
  <path d="M80,72 h18 a9,9 0 0 1 9,9 v6 a12,12 0 0 1 -22,4" fill="none" stroke="#4a5d52" stroke-width="2" stroke-linecap="round"/>
  <path d="M62,100 q30,-10 56,6 q-26,14 -56,-2 z" fill="#e7efe9" stroke="#1d6e42" stroke-width="1.6"/>
  <path d="M107,108 q3,-8 8,-9" fill="none" stroke="#9a6a12" stroke-width="1.8" stroke-linecap="round"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">3. Pointe rentrée dans le corps (anti-accroc)</text>
</svg>
```

- [ ] **Step 2: Ajouter l'entrée**

```ts
  texan: [
    { file: "assets/knots/texan-1.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/texan-2.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/texan-3.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
  ],
```

- [ ] **Step 3: Vérifier**

Run: `npx vitest run src/data/knots.test.ts && npx tsc -b`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add public/assets/knots/texan-1.svg public/assets/knots/texan-2.svg public/assets/knots/texan-3.svg src/data/knot-step-media.ts
git commit -m "Nœuds : séquence illustrée pour le montage texan"
```

---

## Task 11: Upgrade dessiné maison — Pater-noster

**Files:**
- Create: `public/assets/knots/paternoster-1.svg`, `paternoster-2.svg`, `paternoster-3.svg`
- Modify: `src/data/knot-step-media.ts`

**Interfaces:**
- Produces: `LOCAL_KNOT_STEPS["paternoster"]`, 3 éléments, correspondant aux 3 étapes
  existantes (« Former une potence… », « Fixer le plomb… », « Monter le bas de ligne… »).

- [ ] **Step 1: Créer les 3 SVG**

`public/assets/knots/paternoster-1.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="150" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <path d="M80,90 q26,0 26,20 q0,20 -26,20" fill="none" stroke="#1d6e42" stroke-width="2.2" stroke-linecap="round"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">1. Potence à 40-60 cm du bas</text>
</svg>
```

`public/assets/knots/paternoster-2.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="140" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <path d="M80,80 q22,0 22,17 q0,17 -22,17" fill="none" stroke="#8a8676" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M80,140 q-9,9 0,20 q9,-11 0,-20 z" fill="#9a6a12"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">2. Plomb à l'extrémité du corps</text>
</svg>
```

`public/assets/knots/paternoster-3.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="120" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <path d="M80,60 q22,0 22,17 q0,17 -22,17" fill="none" stroke="#8a8676" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M102,77 q20,4 14,22" fill="none" stroke="#1d6e42" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M110,96 l6,4 -8,3" fill="none" stroke="#1d6e42" stroke-width="1.6"/>
  <path d="M80,120 q-9,9 0,20 q9,-11 0,-20 z" fill="#3a3e36"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">3. Bas de ligne esché, boucle-dans-boucle</text>
</svg>
```

- [ ] **Step 2: Ajouter l'entrée**

```ts
  paternoster: [
    { file: "assets/knots/paternoster-1.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/paternoster-2.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/paternoster-3.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
  ],
```

- [ ] **Step 3: Vérifier**

Run: `npx vitest run src/data/knots.test.ts && npx tsc -b`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add public/assets/knots/paternoster-1.svg public/assets/knots/paternoster-2.svg public/assets/knots/paternoster-3.svg src/data/knot-step-media.ts
git commit -m "Nœuds : séquence illustrée pour le pater-noster"
```

---

## Task 12: Nouveau montage — Carolina

**Files:**
- Modify: `src/data/knots.ts`
- Create: `public/assets/knots/carolina-1.svg`, `carolina-2.svg`, `carolina-3.svg`
- Modify: `src/data/knot-step-media.ts`

**Interfaces:**
- Produces: `KNOTS` gagne `id: "carolina"` ; `LOCAL_KNOT_STEPS["carolina"]`, 3 éléments.

- [ ] **Step 1: Ajouter la fiche dans `knots.ts`**

Après l'entrée `paternoster` (dernière du tableau actuel) :

```ts
  {
    id: "carolina",
    cat: "montage",
    name: "Montage carolina",
    use: "Black-bass et perche sur le fond, prospection large",
    when: "Plomb qui reste au contact du fond pendant que le leurre, plus loin sur le bas de ligne, garde une nage libre — idéal fonds durs et pentes.",
    steps: [
      "Enfiler un plomb olive coulissant sur le corps de ligne, puis une perle anti-choc.",
      "Nouer un émerillon en bout de ligne pour bloquer le plomb et la perle.",
      "Ajouter 40 à 70 cm de fluorocarbone et un hameçon texan avec un leurre souple.",
    ],
  },
```

- [ ] **Step 2: Créer les 3 SVG**

`public/assets/knots/carolina-1.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="150" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <ellipse cx="80" cy="60" rx="10" ry="16" fill="#3a3e36"/>
  <circle cx="80" cy="86" r="5" fill="none" stroke="#9a6a12" stroke-width="1.8"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">1. Plomb olive coulissant + perle</text>
</svg>
```

`public/assets/knots/carolina-2.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="130" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <ellipse cx="80" cy="50" rx="10" ry="16" fill="#8a8676"/>
  <circle cx="80" cy="76" r="5" fill="none" stroke="#8a8676" stroke-width="1.6"/>
  <path d="M74,122 a6,6 0 1 1 12,0 a6,6 0 1 1 -12,0" fill="none" stroke="#1d6e42" stroke-width="2.2"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">2. Émerillon en bout, bloque le train</text>
</svg>
```

`public/assets/knots/carolina-3.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="100" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <ellipse cx="80" cy="45" rx="10" ry="15" fill="#8a8676"/>
  <circle cx="80" cy="68" r="5" fill="none" stroke="#8a8676" stroke-width="1.4"/>
  <line x1="80" y1="73" x2="80" y2="120" stroke="#4a5d52" stroke-width="1.8" stroke-dasharray="4 3"/>
  <path d="M62,120 q30,-10 56,6 q-26,14 -56,-2 z" fill="#e7efe9" stroke="#1d6e42" stroke-width="1.6"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">3. 40-70 cm fluoro + leurre souple</text>
</svg>
```

- [ ] **Step 3: Ajouter l'entrée dans `knot-step-media.ts`**

```ts
  carolina: [
    { file: "assets/knots/carolina-1.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/carolina-2.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/carolina-3.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
  ],
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run src/data/knots.test.ts && npx tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/knots.ts public/assets/knots/carolina-1.svg public/assets/knots/carolina-2.svg public/assets/knots/carolina-3.svg src/data/knot-step-media.ts
git commit -m "Montages : ajouter le carolina"
```

---

## Task 13: Nouveau montage — Wacky

**Files:**
- Modify: `src/data/knots.ts`
- Create: `public/assets/knots/wacky-1.svg`, `wacky-2.svg`, `wacky-3.svg`
- Modify: `src/data/knot-step-media.ts`

**Interfaces:**
- Produces: `KNOTS` gagne `id: "wacky"` ; `LOCAL_KNOT_STEPS["wacky"]`, 3 éléments.

- [ ] **Step 1: Ajouter la fiche dans `knots.ts`**

Après l'entrée `carolina` :

```ts
  {
    id: "wacky",
    cat: "montage",
    name: "Montage wacky",
    use: "Black-bass à faible profondeur, coulée lente",
    when: "Le ver souple plie en son milieu et frétille de partout à la chute — très efficace en tirs précis dans les postes, herbiers et bordures.",
    steps: [
      "Prendre un ver souple droit (stick bait), sans tête plombée.",
      "Piquer l'hameçon (weedless ou simple) perpendiculairement, en plein milieu du ver.",
      "Laisser les deux extrémités libres pour un frétillement maximal à la coulée.",
    ],
  },
```

- [ ] **Step 2: Créer les 3 SVG**

`public/assets/knots/wacky-1.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="70" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <rect x="66" y="70" width="28" height="70" rx="14" fill="#e7efe9" stroke="#1d6e42" stroke-width="1.6"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">1. Ver souple droit, sans plomb</text>
</svg>
```

`public/assets/knots/wacky-2.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="70" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <rect x="66" y="70" width="28" height="70" rx="14" fill="#e7efe9" stroke="#8a8676" stroke-width="1.4"/>
  <path d="M55,105 h50" stroke="#9a6a12" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M100,102 l6,3 -6,3" fill="none" stroke="#9a6a12" stroke-width="1.4"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">2. Hameçon piqué au milieu, en travers</text>
</svg>
```

`public/assets/knots/wacky-3.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="60" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <path d="M55,95 h50" stroke="#4a5d52" stroke-width="2" stroke-linecap="round"/>
  <path d="M60,60 q-16,20 -2,42" fill="none" stroke="#1d6e42" stroke-width="3" stroke-linecap="round"/>
  <path d="M100,60 q16,20 2,42" fill="none" stroke="#1d6e42" stroke-width="3" stroke-linecap="round"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">3. Les deux bouts libres, frétillent</text>
</svg>
```

- [ ] **Step 3: Ajouter l'entrée dans `knot-step-media.ts`**

```ts
  wacky: [
    { file: "assets/knots/wacky-1.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/wacky-2.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/wacky-3.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
  ],
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run src/data/knots.test.ts && npx tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/knots.ts public/assets/knots/wacky-1.svg public/assets/knots/wacky-2.svg public/assets/knots/wacky-3.svg src/data/knot-step-media.ts
git commit -m "Montages : ajouter le wacky"
```

---

## Task 14: Nouveau montage — Anglaise

**Files:**
- Modify: `src/data/knots.ts`
- Create: `public/assets/knots/anglaise-1.svg`, `anglaise-2.svg`, `anglaise-3.svg`
- Modify: `src/data/knot-step-media.ts`

**Interfaces:**
- Produces: `KNOTS` gagne `id: "anglaise"` ; `LOCAL_KNOT_STEPS["anglaise"]`, 3 éléments.

- [ ] **Step 1: Ajouter la fiche dans `knots.ts`**

Après l'entrée `wacky` :

```ts
  {
    id: "anglaise",
    cat: "montage",
    name: "Montage anglaise",
    use: "Pêche au coup classique, gardon, brème, tanche",
    when: "Flotteur waggler fixé par le bas seulement : lancer précis et discret, plombée dégressive pour une descente naturelle de l'esche.",
    steps: [
      "Fixer le flotteur anglaise (waggler) par le bas uniquement, sur le corps de ligne.",
      "Répartir les plombs de plantée en dégressif vers l'hameçon, un gros plomb près du flotteur.",
      "Terminer par un ou deux plombs fins juste au-dessus de l'hameçon, pour l'équilibrage final.",
    ],
  },
```

- [ ] **Step 2: Créer les 3 SVG**

`public/assets/knots/anglaise-1.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="24" y1="30" x2="140" y2="30" stroke="#9db4c4" stroke-width="1.4" stroke-dasharray="4 4"/>
  <text x="24" y="24" font-size="10" fill="#8a96a0">Surface</text>
  <line x1="80" y1="30" x2="80" y2="150" stroke="#1a201c" stroke-width="2"/>
  <ellipse cx="80" cy="55" rx="6" ry="26" fill="#e7efe9" stroke="#1d6e42" stroke-width="1.8"/>
  <circle cx="80" cy="81" r="3.4" fill="#1d6e42"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">1. Waggler fixé par le bas seul</text>
</svg>
```

`public/assets/knots/anglaise-2.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="20" x2="80" y2="150" stroke="#1a201c" stroke-width="2"/>
  <ellipse cx="80" cy="42" rx="5" ry="20" fill="#e7efe9" stroke="#8a8676" stroke-width="1.4"/>
  <circle cx="80" cy="80" r="7" fill="#3a3e36"/>
  <circle cx="80" cy="110" r="4" fill="#4a5d52"/>
  <circle cx="80" cy="130" r="3" fill="#4a5d52"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">2. Gros plomb près du flotteur, puis dégressif</text>
</svg>
```

`public/assets/knots/anglaise-3.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="20" x2="80" y2="150" stroke="#1a201c" stroke-width="2"/>
  <ellipse cx="80" cy="38" rx="5" ry="18" fill="#e7efe9" stroke="#8a8676" stroke-width="1.4"/>
  <circle cx="80" cy="70" r="6" fill="#8a8676"/>
  <circle cx="80" cy="96" r="3.6" fill="#8a8676"/>
  <circle cx="80" cy="118" r="2.6" fill="#9a6a12"/>
  <circle cx="80" cy="130" r="2.2" fill="#9a6a12"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">3. Plombs fins juste au-dessus de l'hameçon</text>
</svg>
```

- [ ] **Step 3: Ajouter l'entrée dans `knot-step-media.ts`**

```ts
  anglaise: [
    { file: "assets/knots/anglaise-1.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/anglaise-2.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/anglaise-3.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
  ],
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run src/data/knots.test.ts && npx tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/knots.ts public/assets/knots/anglaise-1.svg public/assets/knots/anglaise-2.svg public/assets/knots/anglaise-3.svg src/data/knot-step-media.ts
git commit -m "Montages : ajouter l'anglaise"
```

---

## Task 15: Nouveau montage — Feeder

**Files:**
- Modify: `src/data/knots.ts`
- Create: `public/assets/knots/feeder-1.svg`, `feeder-2.svg`, `feeder-3.svg`
- Modify: `src/data/knot-step-media.ts`

**Interfaces:**
- Produces: `KNOTS` gagne `id: "feeder"` ; `LOCAL_KNOT_STEPS["feeder"]`, 3 éléments.

- [ ] **Step 1: Ajouter la fiche dans `knots.ts`**

Après l'entrée `anglaise` :

```ts
  {
    id: "feeder",
    cat: "montage",
    name: "Montage feeder",
    use: "Brème, carpe, gardon en rivière ou plan d'eau",
    when: "Le panier (ou la cage) amorce en continu autour de l'hameçon posé au fond — efficace sur poste précis, surtout en eau courante.",
    steps: [
      "Fixer un panier feeder coulissant (ou une cage) en tête de ligne, avec une butée en caoutchouc.",
      "Nouer un émerillon à agrafe pour limiter le vrillage et faciliter les changements de bas de ligne.",
      "Monter un bas de ligne de 20 à 50 cm avec l'hameçon, amorcé dans le panier au posé.",
    ],
  },
```

- [ ] **Step 2: Créer les 3 SVG**

`public/assets/knots/feeder-1.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="150" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <rect x="66" y="45" width="28" height="34" rx="4" fill="none" stroke="#1d6e42" stroke-width="2"/>
  <g stroke="#1d6e42" stroke-width="1.4"><line x1="70" y1="52" x2="90" y2="52"/><line x1="70" y1="60" x2="90" y2="60"/><line x1="70" y1="68" x2="90" y2="68"/></g>
  <rect x="74" y="82" width="12" height="6" fill="#4a5d52"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">1. Panier coulissant + butée caoutchouc</text>
</svg>
```

`public/assets/knots/feeder-2.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="120" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <rect x="66" y="38" width="28" height="30" rx="4" fill="none" stroke="#8a8676" stroke-width="1.6"/>
  <rect x="74" y="70" width="12" height="6" fill="#8a8676"/>
  <path d="M74,110 a6,6 0 1 1 12,0 a6,6 0 1 1 -12,0" fill="none" stroke="#1d6e42" stroke-width="2.2"/>
  <path d="M80,116 l-4,8 h8 z" fill="#1d6e42"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">2. Émerillon à agrafe en bout</text>
</svg>
```

`public/assets/knots/feeder-3.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="90" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <rect x="66" y="30" width="28" height="26" rx="4" fill="none" stroke="#8a8676" stroke-width="1.4"/>
  <path d="M74,84 a6,6 0 1 1 12,0 a6,6 0 1 1 -12,0" fill="none" stroke="#8a8676" stroke-width="1.6"/>
  <line x1="80" y1="90" x2="80" y2="140" stroke="#9a6a12" stroke-width="2" stroke-dasharray="4 3"/>
  <path d="M80,140 h16 a7,7 0 0 1 7,7 v6 a10,10 0 0 1 -18,3" fill="none" stroke="#1d6e42" stroke-width="2" stroke-linecap="round"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">3. Bas de ligne 20-50 cm, hameçon amorcé</text>
</svg>
```

- [ ] **Step 3: Ajouter l'entrée dans `knot-step-media.ts`**

```ts
  feeder: [
    { file: "assets/knots/feeder-1.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/feeder-2.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/feeder-3.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
  ],
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run src/data/knots.test.ts && npx tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/knots.ts public/assets/knots/feeder-1.svg public/assets/knots/feeder-2.svg public/assets/knots/feeder-3.svg src/data/knot-step-media.ts
git commit -m "Montages : ajouter le feeder"
```

---

## Task 16: Nouveau montage — Cheveu

**Files:**
- Modify: `src/data/knots.ts`
- Create: `public/assets/knots/cheveu-1.svg`, `cheveu-2.svg`, `cheveu-3.svg`
- Modify: `src/data/knot-step-media.ts`

**Interfaces:**
- Produces: `KNOTS` gagne `id: "cheveu"` ; `LOCAL_KNOT_STEPS["cheveu"]`, 3 éléments. C'est
  la 15ᵉ et dernière fiche du chantier.

- [ ] **Step 1: Ajouter la fiche dans `knots.ts`**

Après l'entrée `feeder` (dernière du tableau) :

```ts
  {
    id: "cheveu",
    cat: "montage",
    name: "Montage cheveu",
    use: "Carpe, présentation de bouillette",
    when: "L'appât pend librement sous l'hameçon plutôt que d'être piqué dessus : la carpe l'aspire avec l'hameçon, qui se plante seul à l'éjection — la base de la pêche moderne de la carpe.",
    steps: [
      "Nouer l'hameçon avec un nœud sans nœud (knotless knot), en laissant un cheveu de fil libre sous la hampe.",
      "Fixer la bouillette sur le cheveu à l'aide d'une aiguille à amorce, puis bloquer avec un stop-appât.",
      "Ajuster la longueur du cheveu pour que la bouillette pende juste sous la pointe de l'hameçon.",
    ],
  },
```

- [ ] **Step 2: Créer les 3 SVG**

`public/assets/knots/cheveu-1.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="80" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <path d="M80,80 h18 a9,9 0 0 1 9,9 v8 a12,12 0 0 1 -22,4" fill="none" stroke="#1d6e42" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="80" y1="80" x2="80" y2="120" stroke="#9a6a12" stroke-width="1.8"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">1. Nœud sans nœud, cheveu libre sous la hampe</text>
</svg>
```

`public/assets/knots/cheveu-2.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="60" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <path d="M80,60 h18 a9,9 0 0 1 9,9 v8 a12,12 0 0 1 -22,4" fill="none" stroke="#8a8676" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="80" y1="60" x2="80" y2="110" stroke="#9a6a12" stroke-width="1.8"/>
  <circle cx="80" cy="122" r="11" fill="#c9a25a"/>
  <line x1="80" y1="132" x2="80" y2="140" stroke="#9a6a12" stroke-width="1.6"/>
  <rect x="76" y="140" width="8" height="5" fill="#4a5d52"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">2. Bouillette à l'aiguille + stop-appât</text>
</svg>
```

`public/assets/knots/cheveu-3.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190" font-family="-apple-system, system-ui, Segoe UI, sans-serif">
  <rect width="160" height="190" fill="#ffffff"/>
  <line x1="80" y1="10" x2="80" y2="60" stroke="#1a201c" stroke-width="2"/>
  <circle cx="80" cy="20" r="5" fill="none" stroke="#1a201c" stroke-width="1.4"/>
  <path d="M80,60 h18 a9,9 0 0 1 9,9 v8 a12,12 0 0 1 -22,4" fill="none" stroke="#1d6e42" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="80" y1="60" x2="80" y2="92" stroke="#1d6e42" stroke-width="1.8"/>
  <circle cx="80" cy="104" r="11" fill="#c9a25a" stroke="#1d6e42" stroke-width="1.2"/>
  <line x1="107" y1="81" x2="94" y2="98" stroke="#9a6a12" stroke-width="1.4" stroke-dasharray="2 3"/>
  <text x="80" y="184" text-anchor="middle" font-size="11" fill="#3a3e36">3. Bouillette juste sous la pointe</text>
</svg>
```

- [ ] **Step 3: Ajouter l'entrée dans `knot-step-media.ts`**

```ts
  cheveu: [
    { file: "assets/knots/cheveu-1.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/cheveu-2.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
    { file: "assets/knots/cheveu-3.svg", author: "Compagnon de pêche", license: "Schéma original", sourceUrl: "" },
  ],
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run src/data/knots.test.ts && npx tsc -b`
Expected: PASS. `KNOTS` compte désormais 15 entrées (7 originales + `sang`, `albright`,
`chaise`, `carolina`, `wacky`, `anglaise`, `feeder`, `cheveu`).

- [ ] **Step 5: Commit**

```bash
git add src/data/knots.ts public/assets/knots/cheveu-1.svg public/assets/knots/cheveu-2.svg public/assets/knots/cheveu-3.svg src/data/knot-step-media.ts
git commit -m "Montages : ajouter le cheveu — 15ᵉ et dernière fiche du chantier nœuds"
```

---

## Task 17: Vérification navigateur — nœuds & montages

**Files:** aucun.

- [ ] **Step 1: Démarrer le serveur de dev et ouvrir la liste**

Démarrer le serveur de dev (`preview_start` avec la config `dev` du projet), naviguer
Accueil → Outils → Nœuds & montages.
Expected : 15 lignes réparties en deux groupes « Nœuds » (7 : clinch, palomar, raccord,
boucle, sang, albright, chaise) et « Montages » (8 : dropshot, texan, pater-noster,
carolina, wacky, anglaise, feeder, cheveu).

- [ ] **Step 2: Vérifier une fiche sourcée**

Ouvrir « Nœud de sang ». Expected : la première (et seule) étape affiche l'image
`assets/knots-steps/sang-1.webp` au-dessus de son texte, les 2 étapes suivantes n'ont pas
d'image (normal — une seule image source combinée pour ce nœud, comme documenté), pas de
`<img>` cassée.

- [ ] **Step 3: Vérifier une fiche dessinée maison**

Ouvrir « Montage cheveu ». Expected : les 3 étapes ont chacune leur propre image
`assets/knots/cheveu-{1,2,3}.svg`, lisible, cohérente avec le texte de l'étape.

- [ ] **Step 4: Vérifier le repli**

Ouvrir « Clinch amélioré ». Expected : aucune image par étape (aucune n'a été trouvée sur
Commons ni dessinée), la fiche affiche encore l'ancien schéma unique en haut (comportement
`hasLegacyDiagram`), pas de régression par rapport à avant ce chantier.

- [ ] **Step 5: Vérifier la console**

Run: `read_console_messages` (onlyErrors: true) sur l'onglet ouvert.
Expected: aucune erreur (pas de 404 image, pas d'exception React).

- [ ] **Step 6: Arrêter le serveur de dev**

Pas de commit (tâche de vérification uniquement).

---

## Task 18: Guide matériel — scaffolding (types, overlay, écran)

**Files:**
- Modify: `src/data/gear.ts`
- Create: `src/data/gear-cards.ts`
- Modify: `src/components/media-helpers.ts`
- Modify: `src/components/Media.tsx`
- Modify: `src/screens/Materiel.tsx:304-340` (fonction `GuideMateriel`)
- Modify: `src/styles.css`
- Test: `src/data/gear-guide.test.ts` (nouveau)

**Interfaces:**
- Produces: `GuideCard` (type), `GEAR_CARDS: Record<"leurre" | "appat" | "fil",
  GuideCard[]>` (vide au départ, rempli aux Tasks 19-21), `GEAR_MEDIA: Record<string,
  MediaEntry>` (généré à la Task 19), `kind: "gear"` sur `<Media>`.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/data/gear-guide.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { GEAR_CARDS } from "./gear-cards";

describe("guide matériel — fiches enrichies", () => {
  it("chaque fiche a un id stable, un résumé et un usage non vides", () => {
    const fautes: string[] = [];
    for (const cards of Object.values(GEAR_CARDS)) {
      for (const c of cards) {
        if (!c.id.trim() || !c.summary.trim() || !c.usage.trim()) fautes.push(c.id || "(sans id)");
      }
    }
    expect(fautes).toEqual([]);
  });

  it("pas de doublon d'id à travers toutes les catégories", () => {
    const ids = Object.values(GEAR_CARDS).flat().map((c) => c.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dup).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/data/gear-guide.test.ts`
Expected: FAIL — `Cannot find module './gear-cards'`.

- [ ] **Step 3: Créer le type et la donnée (vide)**

Créer `src/data/gear-cards.ts` :

```ts
/** Une fiche enrichie du guide matériel — leurres, appâts ou fils. Les
 *  hameçons (tailles) restent en tableau `GuideEntry[]` dans gear.ts : ce
 *  sont des plages de taille, pas des types distincts, la table est déjà la
 *  bonne représentation. */
export interface GuideCard {
  id: string;
  name: string;
  summary: string; // ce que c'est
  usage: string; // comment/quand l'utiliser (animation, montage, saison)
  species?: string; // espèces ciblées, si pertinent
}

export const GEAR_CARDS: Record<"leurre" | "appat" | "fil", GuideCard[]> = {
  leurre: [],
  appat: [],
  fil: [],
};
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npx vitest run src/data/gear-guide.test.ts`
Expected: PASS (tableaux vides, invariants trivialement satisfaits).

- [ ] **Step 5: Ajouter `kind: "gear"` au composant `Media`**

Lire d'abord `src/components/media-helpers.ts` en entier, puis modifier l'import et
`MEDIA_BY_KIND` :

```ts
import { SPECIES_MEDIA, KNOT_MEDIA, RECIPE_MEDIA, TECHNIQUE_MEDIA, GEAR_MEDIA } from "../data/media";
```

(`GEAR_MEDIA` n'existe pas encore dans `media.ts` — ajouter temporairement à la fin de
`src/data/media.ts`, comme fait pour `KNOT_STEP_MEDIA` à la Task 1 :)

```ts
export const GEAR_MEDIA: Record<string, MediaEntry> = {};
```

Puis dans `media-helpers.ts`, étendre `MEDIA_BY_KIND` :

```ts
const MEDIA_BY_KIND = {
  species: SPECIES_MEDIA,
  knot: ALL_KNOT_MEDIA,
  recipe: RECIPE_MEDIA,
  technique: TECHNIQUE_MEDIA,
  gear: GEAR_MEDIA,
};
```

Dans `src/components/Media.tsx`, modifier la ligne 44 (`kind: "species" | "knot" |
"recipe" | "technique";`) :

```ts
  kind: "species" | "knot" | "recipe" | "technique" | "gear";
```

Et la ligne 70 (`const file = kind === "species" ? thumbOf(entry.file) : entry.file;`) reste
inchangée — les fiches matériel n'ont pas de variante vignette séparée, elles utilisent la
photo pleine taille directement (volume de fiches trop faible pour justifier un pipeline de
vignette dédié, contrairement aux ~130 espèces).

- [ ] **Step 6: Réécrire `GuideMateriel`**

Remplacer entièrement la fonction `GuideMateriel` dans `src/screens/Materiel.tsx` (lignes
304-340) :

```tsx
export function GuideMateriel() {
  const { back } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const sections: { key: "leurre" | "appat" | "fil"; title: string }[] = [
    { key: "leurre", title: "Leurres" },
    { key: "appat", title: "Appâts naturels" },
    { key: "fil", title: "Fils & lignes" },
  ];

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div className="topbar-title">Guide — appâts, hameçons & leurres</div>
      </div>
      <div style={{ padding: "6px 18px 26px" }}>
        {sections.map(({ key, title }) => (
          <div key={key} style={{ marginTop: 14 }}>
            <div className="serif" style={{ fontSize: 18, fontWeight: 700 }}>
              {title}
            </div>
            <div className="gear-card-grid">
              {GEAR_CARDS[key].map((c) => {
                const expanded = open === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={"gear-card" + (expanded ? " expanded" : "")}
                    onClick={() => setOpen(expanded ? null : c.id)}
                  >
                    <Media kind="gear" id={c.id} placeholder={c.name} />
                    <div className="gc-name">{c.name}</div>
                    <div className="gc-summary">{c.summary}</div>
                    {expanded && (
                      <div className="gc-usage">
                        <div>
                          <b>Usage :</b> {c.usage}
                        </div>
                        {c.species && (
                          <div style={{ marginTop: 4 }}>
                            <b>Espèces :</b> {c.species}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 14 }}>
          <div className="serif" style={{ fontSize: 18, fontWeight: 700 }}>
            Hameçons — tailles
          </div>
          {GEAR_GUIDE[0].intro && (
            <div style={{ fontSize: 13, color: "#5a5e52", margin: "4px 0 8px", lineHeight: 1.5 }}>
              {GEAR_GUIDE[0].intro}
            </div>
          )}
          {GEAR_GUIDE[0].entries.map((e) => (
            <div key={e.name} className="guide-row">
              <div className="g-name">{e.name}</div>
              <div className="g-detail">{e.detail}</div>
            </div>
          ))}
        </div>

        <div className="info" style={{ marginTop: 18 }}>
          Repères généraux pour débuter. Adaptez au poisson visé, à la saison et à la réglementation
          locale (certains appâts ou le vif peuvent être restreints).
        </div>
      </div>
    </div>
  );
}
```

Mettre à jour l'import en haut de `Materiel.tsx` (ligne 5) :

```tsx
import { GEAR_CATEGORIES, CAT_LABEL, GEAR_GUIDE, type GearCategory } from "../data/gear";
import { GEAR_CARDS } from "../data/gear-cards";
import { Media } from "../components/Media";
import { useState } from "react";
```

(`useState` est déjà importé en ligne 1 avec `useEffect` — fusionner plutôt que dupliquer
l'import : `import { useEffect, useState } from "react";` reste tel quel.)

- [ ] **Step 7: Réduire `GEAR_GUIDE` aux hameçons seulement**

Dans `src/data/gear.ts`, retirer les sections « Appâts naturels », « Leurres » et « Fils &
lignes » de `GEAR_GUIDE` (leur contenu migre vers `GEAR_CARDS` aux Tasks 19-21) — ne garder
que la section « Hameçons — tailles » (dernière section actuelle, lignes 69-81) :

```ts
export const GEAR_GUIDE: GuideSection[] = [
  {
    title: "Hameçons — tailles",
    intro:
      "Numérotation inversée : plus le numéro est grand, plus l'hameçon est petit. Au-delà de 1, on passe aux tailles « /0 » qui grossissent.",
    entries: [
      { name: "N° 20 à 14 (très petits)", detail: "Ablette, gardon, petits blancs, esches fines." },
      { name: "N° 12 à 8 (petits/moyens)", detail: "Gardon, brème, tanche, truite au ver." },
      { name: "N° 6 à 2 (moyens)", detail: "Carpe, barbeau, gros vers, bouillettes." },
      { name: "N° 1 à 2/0 (gros)", detail: "Carnassiers au vif/leurre souple, black-bass." },
      { name: "3/0 à 8/0 (très gros)", detail: "Brochet, silure ; montages puissants." },
      { name: "Simple / triple", detail: "Triple sur poissons-nageurs ; simple pour le no-kill (moins de dégâts)." },
      { name: "Sans ardillon (barbless)", detail: "Décrochage facile, obligatoire sur certains parcours no-kill." },
    ],
  },
];
```

- [ ] **Step 8: Ajouter le style des cartes**

Dans `src/styles.css`, ajouter à la fin du fichier :

```css
.gear-card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 8px;
}
.gear-card {
  text-align: left;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  padding: 10px;
  background: #fff;
  grid-column: span 1;
}
.gear-card.expanded {
  grid-column: span 2;
}
.gc-name {
  font-size: 14px;
  font-weight: 650;
  margin-top: 6px;
}
.gc-summary {
  font-size: 12.5px;
  color: var(--muted);
  margin-top: 2px;
  line-height: 1.4;
}
.gc-usage {
  font-size: 13px;
  color: var(--body);
  line-height: 1.5;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--line-strong);
}
```

- [ ] **Step 9: Vérifier**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Expected: tout vert. L'écran « Guide » affiche 3 sections vides (aucune carte pour
l'instant, `GEAR_CARDS` est vide) + la section Hameçons inchangée — pas d'erreur, juste
vide (rempli aux Tasks 19-21).

- [ ] **Step 10: Commit**

```bash
git add src/data/gear.ts src/data/gear-cards.ts src/data/media.ts src/components/media-helpers.ts src/components/Media.tsx src/screens/Materiel.tsx src/styles.css src/data/gear-guide.test.ts
git commit -m "Guide matériel : scaffolding des fiches enrichies (types, écran, tests)"
```

---

## Task 19: Guide matériel — pipeline photos + contenu Leurres

**Files:**
- Modify: `scripts/images.manifest.json`
- Modify: `scripts/fetch-images.mjs`
- Modify: `src/data/gear-cards.ts`

**Interfaces:**
- Consumes: `processGroup` (déjà défini dans `fetch-images.mjs`, utilisé aujourd'hui pour
  `knot`/`recipe`/`technique` — réutilisé tel quel avec `kind: "gear"`, `subdir: "gear"`).
- Produces: `GEAR_MEDIA: Record<string, MediaEntry>` réel (remplace la ligne vide ajoutée à
  la Task 18) ; `GEAR_CARDS.leurre` rempli avec 7 fiches.

Sourcing vérifié pendant le cadrage : `Twister_2008_G01.jpg` (leurre souple générique),
`Spinnerbait.png`. Les 5 autres suivent la même procédure de recherche (chercher sur
`https://commons.wikimedia.org/wiki/Special:Search?search=<terme générique en anglais>&fulltext=1&ns6=1`,
ne retenir qu'un résultat montrant clairement un objet générique — jamais un produit de
marque identifiable en gros plan sur son emballage — et vérifier la licence sur la page du
fichier avant de l'ajouter au manifeste).

- [ ] **Step 1: Vérifier la licence des 2 fichiers déjà repérés**

Consulter `https://commons.wikimedia.org/wiki/File:Twister_2008_G01.jpg` et
`https://commons.wikimedia.org/wiki/File:Spinnerbait.png`, noter licence + auteur exacts.

- [ ] **Step 2: Chercher les 5 photos restantes**

Pour chacun des 5 types restants (poisson-nageur/crankbait, cuiller tournante/spinner,
cuiller ondulante/spoon, popper/stickbait, jig/leurre de traîne), chercher sur Commons avec
la procédure ci-dessus. Si aucun résultat générique et librement licencié n'est trouvé pour
un type, laisser ce type sans photo (`GEAR_MEDIA` n'a simplement pas d'entrée pour son id —
le composant `Media` affiche déjà le repli « placeholder rayé », comme pour toute espèce
sans photo) plutôt que de forcer une image inadaptée.

- [ ] **Step 3: Ajouter la clé `gear` au manifeste**

Dans `scripts/images.manifest.json`, ajouter une clé top-level `gear` avec les entrées
vérifiées (exemple pour les 2 déjà confirmées — compléter avec le résultat du Step 2) :

```json
"gear": [
  {
    "id": "leurre-souple",
    "filename": "File:Twister 2008 G01.jpg",
    "author": "à relever sur la page du fichier",
    "license": "à relever sur la page du fichier",
    "file_page_url": "https://commons.wikimedia.org/wiki/File:Twister_2008_G01.jpg"
  },
  {
    "id": "spinnerbait",
    "filename": "File:Spinnerbait.png",
    "author": "à relever sur la page du fichier",
    "license": "à relever sur la page du fichier",
    "file_page_url": "https://commons.wikimedia.org/wiki/File:Spinnerbait.png"
  }
]
```

- [ ] **Step 4: Étendre `fetch-images.mjs`**

Après la ligne `const techMedia = await processGroup(manifest.techniques || [], "technique", "techniques");`,
ajouter :

```js
const gearMedia = await processGroup(manifest.gear || [], "gear", "gear");
```

Dans le template `body`, après l'export de `TECHNIQUE_MEDIA`, ajouter :

```js
export const GEAR_MEDIA: Record<string, MediaEntry> = ${JSON.stringify(gearMedia, null, 2)};
```

Et étendre la ligne de log finale avec `, ${Object.keys(gearMedia).length} gear`.

- [ ] **Step 5: Lancer le script**

Run: `node scripts/fetch-images.mjs`
Expected: télécharge les photos listées dans `manifest.gear`, écrit
`public/assets/gear/<id>.webp`, régénère `media.ts` avec un `GEAR_MEDIA` réel.

- [ ] **Step 6: Remplir `GEAR_CARDS.leurre`**

Dans `src/data/gear-cards.ts`, remplacer `leurre: []` par :

```ts
  leurre: [
    {
      id: "leurre-souple",
      name: "Leurre souple (shad, finesse, virgule)",
      summary: "Corps en plastique souple monté sur une tête plombée, imite un petit poisson ou un ver par sa nage.",
      usage: "Lancer-ramener régulier ou saccadé, laisser couler entre deux tirées pour les touches à la descente. Adapter le grammage de la tête plombée à la profondeur et au courant.",
      species: "Sandre, perche, brochet, black-bass",
    },
    {
      id: "poisson-nageur",
      name: "Poisson-nageur (crank, jerk, minnow)",
      summary: "Leurre dur à bavette qui plonge et nage tout seul à la récupération, sans action du poignet nécessaire.",
      usage: "Récupération linéaire pour les cranks (la bavette fait le travail), ramener saccadé avec pauses pour les jerks. La taille de la bavette fixe la profondeur de nage.",
      species: "Brochet, perche, truite",
    },
    {
      id: "cuiller-tournante",
      name: "Cuiller tournante",
      summary: "Une palette métallique tourne autour d'un axe, vibrations et flash très visibles de loin.",
      usage: "Lancer-ramener simple, vitesse constante pour que la palette tourne régulièrement. Efficace en eau claire ou légèrement teintée.",
      species: "Truite, perche, chevesne",
    },
    {
      id: "cuiller-ondulante",
      name: "Cuiller ondulante",
      summary: "Une palette métallique galbée ondule en tombant ou en nageant, sans axe ni rotation.",
      usage: "Se pêche aussi bien en lancer-ramener qu'en verticale (jig) où elle plane à la descente. Bonne portée de lancer grâce à son poids.",
      species: "Brochet, truite de lac",
    },
    {
      id: "spinnerbait",
      name: "Spinnerbait / chatterbait",
      summary: "Un bras métallique porte une ou deux palettes au-dessus d'une tête plombée à jupe ou brin souple — la palette protège l'hameçon des accrochages.",
      usage: "Ramener à travers les branchages et herbiers sans craindre l'accroc grâce au bras anti-herbe. Varier la vitesse pour faire vibrer ou tourner la palette.",
      species: "Brochet, black-bass",
    },
    {
      id: "popper-stickbait",
      name: "Popper / stickbait (surface)",
      summary: "Leurre qui reste en surface, gloups et éclaboussures pour le popper, nage en zigzag pour le stickbait — attaques visibles et spectaculaires.",
      usage: "Petites tirées sèches suivies de pauses pour le popper (le bruit attire) ; ramener en walking-the-dog (poignet qui balance) pour le stickbait. Idéal tôt le matin ou au crépuscule, eau calme.",
      species: "Black-bass, chevesne, perche",
    },
    {
      id: "jig",
      name: "Leurre de traîne / jig",
      summary: "Tête plombée nue ou habillée, pêchée à la verticale ou en traîne lente sur le fond.",
      usage: "Descendre jusqu'au fond, animer par petites secousses du poignet en gardant le contact avec le fond, laisser retomber entre chaque animation.",
      species: "Sandre, perche, silure",
    },
  ],
```

- [ ] **Step 7: Vérifier**

Run: `npx vitest run src/data/gear-guide.test.ts && npx tsc -b`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add scripts/images.manifest.json scripts/fetch-images.mjs src/data/media.ts src/data/gear-cards.ts public/assets/gear/
git commit -m "Guide matériel : pipeline photos + 7 fiches leurres"
```

---

## Task 20: Guide matériel — contenu Appâts naturels

**Files:**
- Modify: `scripts/images.manifest.json` (compléter `gear` avec les appâts trouvés)
- Modify: `src/data/gear-cards.ts`

**Interfaces:**
- Produces: `GEAR_CARDS.appat` rempli avec 8 fiches ; `GEAR_MEDIA` gagne les entrées photo
  trouvées pour les appâts (même procédure de recherche que la Task 19 Step 2 — termes
  génériques anglais : earthworm, maggot bait, sweetcorn bait, boilie carp bait, etc.).

- [ ] **Step 1: Chercher les photos**

Même procédure que Task 19 Step 2, pour : ver de terre, asticot, teigne, maïs doux, pain/pâte,
bouillette, vif, ver marin. Ajouter au manifeste `gear` (Step 3 de la Task 19) toute entrée
vérifiée ; laisser sans photo les types sans résultat libre convenable.

- [ ] **Step 2: Régénérer les images**

Run: `node scripts/fetch-images.mjs`

- [ ] **Step 3: Remplir `GEAR_CARDS.appat`**

Dans `src/data/gear-cards.ts`, remplacer `appat: []` par :

```ts
  appat: [
    {
      id: "ver-de-terre",
      name: "Ver de terre / lombric",
      summary: "L'appât naturel le plus polyvalent, disponible partout, efficace sur presque toutes les espèces.",
      usage: "Piqué une ou deux fois pour rester vivant et remuant, ou en paquet pour les grosses bouches. Bon toute l'année, particulièrement après la pluie.",
      species: "Truite, perche, brème, tanche, anguille, chevesne",
    },
    {
      id: "asticot",
      name: "Asticot & pinkie",
      summary: "Larve de mouche, petite et très remuante, l'appât de référence de la pêche au coup.",
      usage: "Piqué par le bout le plus épais pour rester vivant, en paquet de 2-3 pour les grosses touches ou seul pour la finesse. S'amorce facilement en accompagnement.",
      species: "Poissons blancs (gardon, ablette, brème)",
    },
    {
      id: "teigne",
      name: "Teigne / ver de farine",
      summary: "Larve de mite de la cire, résistante, dégage une odeur qui attire les poissons de rivière.",
      usage: "Piquée par la tête, se conserve facilement au frais plusieurs semaines. Très utilisée à la pêche au toc en dérive.",
      species: "Truite au toc, perche, poissons de rivière",
    },
    {
      id: "mais-doux",
      name: "Maïs doux",
      summary: "Grain sucré en boîte, sélectif — filtre les petits poissons et cible les plus gros.",
      usage: "2 à 3 grains piqués sur l'hameçon, réserve du jus utilisable en amorçage. Économique et facile à transporter.",
      species: "Carpe, tanche, gardon, brème",
    },
    {
      id: "pain-pate",
      name: "Pain / pâte",
      summary: "Mie de pain ou pâte pétrie à la farine, moulée directement autour de l'hameçon.",
      usage: "Façonnée en boulette juste avant de pêcher, se ramollit vite dans l'eau donc à renouveler souvent. Aussi utile en amorçage de surface pour le chevesne.",
      species: "Chevesne, carpe, gardon",
    },
    {
      id: "bouillette",
      name: "Bouillette",
      summary: "Boule d'appât cuite à base de farines et arômes, calibrée en diamètre, conçue pour durer immergée.",
      usage: "Montée sur cheveu (voir montage cheveu), jamais piquée directement sur l'hameçon. Le parfum et la taille se choisissent selon la pression de pêche du plan d'eau.",
      species: "Carpe (pêche à la ligne plombée)",
    },
    {
      id: "vif",
      name: "Vif (petit poisson vivant)",
      summary: "Petit poisson vivant présenté entier, l'appât naturel le plus efficace pour les carnassiers.",
      usage: "Piqué à la lèvre supérieure pour nager librement, ou monté en pater-noster pour rester à un niveau donné. Vérifiez les espèces autorisées comme vif dans votre département.",
      species: "Brochet, sandre, perche",
    },
    {
      id: "ver-marin",
      name: "Vers marins (dur, arénicole)",
      summary: "Ver marin vendu en bourriche, odeur forte, prisé en zone d'influence marine.",
      usage: "Enfilé sur l'hameçon en laissant la pointe libre, à renouveler régulièrement car il s'assèche vite hors de l'eau.",
      species: "Espèces d'estuaire (flet, mulet) en zone amphihaline",
    },
  ],
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run src/data/gear-guide.test.ts && npx tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/images.manifest.json src/data/media.ts src/data/gear-cards.ts public/assets/gear/
git commit -m "Guide matériel : 8 fiches appâts naturels"
```

---

## Task 21: Guide matériel — contenu Fils & lignes

**Files:**
- Modify: `scripts/images.manifest.json` (compléter `gear`)
- Modify: `src/data/gear-cards.ts`

**Interfaces:**
- Produces: `GEAR_CARDS.fil` rempli avec 4 fiches (dernière catégorie du chantier).

- [ ] **Step 1: Chercher les photos**

Même procédure, pour : nylon (monofilament fishing line spool), fluorocarbone (fluorocarbon
fishing line), tresse (déjà partiellement vu pendant le cadrage — vérifier la licence de
`File:Reel_with_DSMB_P9027417.JPG` par Peter Southwood avant de l'utiliser, ou en chercher
un plus directement pêche si le contexte plongée gêne la lisibilité), bas de ligne acier
(steel fishing leader wire).

- [ ] **Step 2: Régénérer les images**

Run: `node scripts/fetch-images.mjs`

- [ ] **Step 3: Remplir `GEAR_CARDS.fil`**

Dans `src/data/gear-cards.ts`, remplacer `fil: []` par :

```ts
  fil: [
    {
      id: "nylon",
      name: "Nylon (monofilament)",
      summary: "Fil élastique et économique, le plus polyvalent pour débuter — flotte légèrement, absorbe les à-coups.",
      usage: "Corps de ligne au coup ou aux leurres pour un budget serré. Se détend avec le temps et le soleil : à renouveler régulièrement (une fois par saison en usage régulier).",
    },
    {
      id: "fluorocarbone",
      name: "Fluorocarbone",
      summary: "Quasi invisible sous l'eau (indice de réfraction proche de celui de l'eau), résistant à l'abrasion, coule.",
      usage: "En bas de ligne devant une tresse ou un nylon pour la discrétion, ou en corps de ligne complet en pêche fine et méfiante.",
    },
    {
      id: "tresse",
      name: "Tresse",
      summary: "Fibres tressées, très fine à résistance égale, sans élasticité — transmet chaque touche et chaque mouvement du leurre.",
      usage: "Corps de ligne aux leurres pour la sensibilité et la puissance de ferrage, presque toujours complétée par un bas de ligne fluorocarbone pour la discrétion.",
    },
    {
      id: "bas-de-ligne-acier",
      name: "Bas de ligne acier / titane",
      summary: "Câble métallique gainé ou torsadé, seul matériau que les dents ou l'abrasion ne peuvent pas trancher.",
      usage: "Indispensable devant un vif ou un leurre pour le brochet (dents) et le silure (abrasion) — un fluorocarbone, même épais, peut être sectionné net.",
    },
  ],
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run src/data/gear-guide.test.ts && npx tsc -b`
Expected: PASS. `GEAR_CARDS` compte désormais 19 fiches au total (7 + 8 + 4).

- [ ] **Step 5: Commit**

```bash
git add scripts/images.manifest.json src/data/media.ts src/data/gear-cards.ts public/assets/gear/
git commit -m "Guide matériel : 4 fiches fils & lignes — 19ᵉ et dernière fiche du chantier"
```

---

## Task 22: Vérification finale — build, tests, navigateur

**Files:** aucun.

- [ ] **Step 1: Suite complète**

Run: `npx tsc -b && npx eslint src && npx vitest run && npm run build`
Expected: tout vert, 0 warning, build de prod réussi.

- [ ] **Step 2: Vérifier le guide matériel dans le navigateur**

Démarrer le serveur de dev, naviguer Outils → Mon matériel → Guide. Expected : 3 sections
en grille de cartes (Leurres, Appâts naturels, Fils & lignes), tap sur une carte → elle
s'étend en pleine largeur et affiche usage + espèces, tap à nouveau → se referme. Section
Hameçons inchangée en bas, format tableau.

- [ ] **Step 3: Vérifier qu'aucune carte sans photo ne casse l'affichage**

Pour toute fiche dont `GEAR_MEDIA` n'a pas d'entrée (types non trouvés sur Commons aux
Tasks 19-21), vérifier que le placeholder rayé s'affiche normalement (comportement déjà
existant du composant `Media`, aucun code neuf à vérifier ici — juste confirmer l'absence
de régression).

- [ ] **Step 4: Vérifier la console**

Run: `read_console_messages` (onlyErrors: true).
Expected: aucune erreur.

- [ ] **Step 5: Arrêter le serveur de dev, pas de commit** (vérification uniquement — si un
problème est trouvé, revenir à la tâche concernée, corriger, puis relancer ce Step 1).

---

## Self-review

**Couverture du spec** — chaque section de
`docs/superpowers/specs/2026-07-27-noeuds-montages-materiel-design.md` a une tâche :
modèle de données (Tasks 1, 18), pipeline d'images (Tasks 2, 19), les 15 fiches
nœuds/montages (Tasks 3-16), guide matériel enrichi (Tasks 18-21), tests (Tasks 1, 18),
écrans (Tasks 1, 18). Le hors-périmètre du spec (cannes/moulinets/flotteurs/plombs, liens
d'achat, guides régionaux) n'a délibérément aucune tâche.

**Balayage placeholders** — aucun « TBD »/« à compléter plus tard » ; les deux endroits où
une recherche Commons reste à faire au moment de l'exécution (Tasks 19-21, appâts/fils/
leurres restants) portent une procédure de recherche complète et un critère de décision
explicite (générique vs marque, licence vérifiée avant usage), pas une instruction vague —
et 2 sourcing sont déjà vérifiés pour amorcer le pattern.

**Cohérence des types** — `GuideCard` (Task 18) est utilisé identique dans les Tasks 19-21 ;
`MediaEntry` (existant) réutilisé sans modification pour `KNOT_STEP_MEDIA`/`GEAR_MEDIA` ;
`ALL_KNOT_STEP_MEDIA`/`LOCAL_KNOT_STEPS` nommés une fois (Task 1) et réutilisés à
l'identique dans toutes les tâches suivantes.
