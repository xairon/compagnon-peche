# Thème sombre — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Doter l'app d'un thème sombre qui suit le système, avec bascule manuelle Auto/Clair/Sombre, en tokenisant d'abord les 582 couleurs écrites en dur de `src/styles.css` et les 154 des styles inline.

**Architecture:** Trois temps strictement séparés. (1) On range les couleurs en jetons `:root` sans rien changer visuellement, ce qui est **prouvé** par une empreinte des couleurs effectives du CSS compilé, comparée avant/après. (2) On ajoute un unique bloc `:root[data-theme="dark"]` qui ne redéfinit que ces jetons. (3) Le thème est piloté par l'attribut `data-theme` sur `<html>`, posé par un script inline avant le premier paint, alimenté par `prefs.ts`. `prefers-color-scheme` n'apparaît nulle part dans la feuille de style : c'est le code qui résout `"auto"` via `matchMedia`.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest, MapLibre GL, PWA (vite-plugin-pwa / Workbox), CSS vanilla (aucun préprocesseur, aucun framework de style).

## Global Constraints

- **Le thème clair ne change pas.** Aucune retouche esthétique n'est glissée dans ce chantier. La seule exception **visuelle** autorisée est la fusion de quasi-doublons décrite en Tâche 3, et uniquement dans les limites qui y sont fixées. L'empreinte de référence n'est régénérée que par les tâches qui le prévoient explicitement (3, 6, 9) ; toute autre tâche qui la fait bouger a un bug.
- **La duplication de la résolution du thème entre `src/lib/theme.ts` et le script inline d'`index.html` est délibérée**, arbitrée avant exécution. Le script doit être synchrone et précéder le bundle pour supprimer le flash blanc au lancement : il ne peut donc rien importer. `src/lib/theme-dom.test.ts` est ce qui rend cette duplication tenable. Ne pas la « corriger ».
- **Langue.** Commentaires et messages de commit en français, comme tout le dépôt. Les identifiants de code restent en anglais quand le fichier autour est en anglais (`styles.css` mélange les deux : suivre le voisinage immédiat).
- **Seuils de contraste.** 4,5:1 pour le texte, 3:1 pour le non-texte (WCAG 1.4.11). Identiques dans les deux thèmes.
- **Nommage des jetons par rôle, jamais par teinte.** `--line-strong`, pas `--beige-fonce`.
- **Aucune dépendance nouvelle.** Pas de `postcss-*`, pas de bibliothèque de thème, pas de `color-mix()` (support Safari iOS insuffisant sur le parc visé par une PWA de terrain).
- **`localStorage` ne doit jamais faire planter l'app** — la navigation privée fait lever l'accès lui-même. Tout accès est enveloppé dans `try/catch`, comme le fait déjà `src/lib/prefs.ts`.
- **Commandes.** `npm test` (vitest run), `npm run build`, `npm run lint`. Une tâche n'est finie que si les trois passent.

---

### Task 1: L'empreinte des couleurs — le harnais qui prouve « aucun changement visuel »

Sans cet outil, les tâches 2 à 7 sont des remplacements massifs non vérifiables sur une feuille de 6 567 lignes. Il est donc construit en premier, et il est le seul livrable de cette tâche.

Le principe : produire la liste triée de toutes les couleurs **effectives** du CSS (les `var()` résolus depuis `:root`), sous forme de multiensemble `sélecteur|propriété|couleur`. Tokeniser change l'écriture mais pas la couleur effective — l'empreinte doit donc rester identique à l'octet près. C'est un multiensemble trié et non une liste ordonnée, pour tolérer les déplacements de déclarations sans rien perdre de la détection d'un changement de valeur.

**Files:**
- Create: `scripts/empreinte-couleurs.mjs`
- Create: `src/lib/empreinte-couleurs.test.ts`
- Create: `src/lib/__fixtures__/empreinte-couleurs.txt` (généré par le script)

**Interfaces:**
- Consumes: rien.
- Produces: `node scripts/empreinte-couleurs.mjs` écrit l'empreinte sur stdout ; `node scripts/empreinte-couleurs.mjs --ecrire` régénère le fixture. Le test `empreinte-couleurs.test.ts` échoue si l'empreinte calculée diffère du fixture. Toutes les tâches suivantes s'appuient sur ce couple.

- [ ] **Step 1: Écrire le script d'empreinte**

Créer `scripts/empreinte-couleurs.mjs` :

```js
// Empreinte des couleurs EFFECTIVES de src/styles.css.
//
// À quoi ça sert : le chantier « thème sombre » remplace ~582 couleurs écrites
// en dur par des jetons. Ce remplacement ne doit RIEN changer visuellement, et
// personne ne peut le vérifier à l'œil sur 6 567 lignes. Le script résout les
// var() depuis :root et sort la liste triée des couleurs réellement appliquées.
// Tokeniser change l'écriture, pas la couleur : l'empreinte doit rester
// identique. Si elle bouge, c'est un bug, ou une décision à assumer par écrit.
//
// C'est un multiensemble TRIÉ, pas une liste ordonnée : déplacer une règle ne
// doit pas faire échouer le test, seule une valeur qui change doit le faire.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CSS = fileURLToPath(new URL("../src/styles.css", import.meta.url));
const FIXTURE = fileURLToPath(
  new URL("../src/lib/__fixtures__/empreinte-couleurs.txt", import.meta.url),
);

/** Retire les commentaires CSS (ils contiennent des hex d'explication). */
export function sansCommentaires(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Les variables de :root, commentaires déjà retirés. */
export function variablesRacine(css) {
  const vars = {};
  const bloc = /:root\s*\{([\s\S]*?)\}/.exec(css);
  if (!bloc) return vars;
  for (const decl of bloc[1].split(";")) {
    const m = /^\s*(--[\w-]+)\s*:\s*([\s\S]+)$/.exec(decl);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

/** Résout var(--x) et var(--x, repli), en chaîne. */
export function resoudreVars(valeur, vars, profondeur = 0) {
  if (profondeur > 10) return valeur;
  return valeur.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g, (tout, nom, repli) => {
    const v = vars[nom];
    if (v === undefined) return repli !== undefined ? repli.trim() : tout;
    return resoudreVars(v, vars, profondeur + 1);
  });
}

/** #abc -> #aabbcc ; majuscules -> minuscules. Sinon deux écritures de la
 *  même couleur compteraient comme deux couleurs différentes. */
export function normaliser(v) {
  return v.replace(/#[0-9a-fA-F]{3,8}\b/g, (h) => {
    let c = h.slice(1).toLowerCase();
    if (c.length === 3 || c.length === 4) c = c.split("").map((x) => x + x).join("");
    return "#" + c;
  });
}

const COULEUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/;

/** Liste triée « sélecteur|propriété|valeur » des déclarations colorées. */
export function empreinte(cssBrut) {
  const css = sansCommentaires(cssBrut);
  const vars = variablesRacine(css);
  const lignes = [];
  // Découpage volontairement simple : on ne construit pas un AST, on veut une
  // empreinte STABLE, pas un parseur CSS correct. Les @media et @supports sont
  // conservés comme préfixe de contexte pour que deux règles homonymes dans
  // deux media queries ne se confondent pas.
  let contexte = [];
  let tampon = "";
  for (const ch of css) {
    if (ch === "{") {
      const tete = tampon.trim().replace(/\s+/g, " ");
      contexte.push(tete);
      tampon = "";
    } else if (ch === "}") {
      const corps = tampon;
      const chemin = contexte.join(" >> ");
      for (const decl of corps.split(";")) {
        const m = /^\s*([\w-]+)\s*:\s*([\s\S]+)$/.exec(decl);
        if (!m) continue;
        const valeur = normaliser(resoudreVars(m[2].trim(), vars));
        if (COULEUR.test(valeur)) lignes.push(`${chemin}|${m[1]}|${valeur}`);
      }
      contexte.pop();
      tampon = "";
    } else {
      tampon += ch;
    }
  }
  return lignes.sort().join("\n") + "\n";
}

// Partie CLI. Elle est gardée parce que ce fichier est AUSSI importé par
// src/lib/empreinte-couleurs.test.ts : sans cette garde, importer le module
// lirait la feuille et écrirait sur stdout à chaque exécution des tests.
// `process.argv[1]` est le fichier lancé ; sous vitest, ce n'est pas celui-ci.
if (process.argv[1] && process.argv[1].endsWith("empreinte-couleurs.mjs")) {
  const sortie = empreinte(readFileSync(CSS, "utf8"));
  if (process.argv.includes("--ecrire")) {
    writeFileSync(FIXTURE, sortie);
    console.error(`empreinte écrite : ${sortie.split("\n").length - 1} déclarations`);
  } else {
    process.stdout.write(sortie);
  }
}
```

- [ ] **Step 2: Écrire le test qui compare l'empreinte au fixture**

Créer `src/lib/empreinte-couleurs.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { empreinte, normaliser, resoudreVars } from "../../scripts/empreinte-couleurs.mjs";

const CSS = readFileSync(fileURLToPath(new URL("../styles.css", import.meta.url)), "utf8");
const FIXTURE = fileURLToPath(new URL("./__fixtures__/empreinte-couleurs.txt", import.meta.url));

describe("normaliser", () => {
  it("développe les hex courts et passe en minuscules", () => {
    expect(normaliser("color: #FFF")).toBe("color: #ffffff");
    expect(normaliser("color: #1D6E42")).toBe("color: #1d6e42");
  });
});

describe("resoudreVars", () => {
  it("résout en chaîne et préfère le jeton au repli", () => {
    const vars = { "--a": "var(--b)", "--b": "#123456" };
    expect(resoudreVars("color: var(--a)", vars)).toBe("color: #123456");
    expect(resoudreVars("color: var(--b, #000000)", vars)).toBe("color: #123456");
  });
});

describe("empreinte de src/styles.css", () => {
  // LE garde-fou du chantier de tokenisation. Remplacer une couleur en dur par
  // le jeton qui porte la même valeur ne change pas l'empreinte. Si ce test
  // échoue pendant une tâche de tokenisation, c'est que le remplacement a
  // changé une couleur — à corriger, pas à régénérer.
  //
  // Pour régénérer VOLONTAIREMENT (thème sombre ajouté, fusion assumée) :
  //   node scripts/empreinte-couleurs.mjs --ecrire
  it("est identique au fixture", () => {
    expect(empreinte(CSS)).toBe(readFileSync(FIXTURE, "utf8"));
  });
});
```

- [ ] **Step 3: Lancer le test — il doit échouer, le fixture n'existe pas**

Run: `npx vitest run src/lib/empreinte-couleurs.test.ts`
Expected: FAIL — `ENOENT` sur `__fixtures__/empreinte-couleurs.txt`. Les deux premiers `describe` passent.

- [ ] **Step 4: Générer le fixture de référence**

Run: `node scripts/empreinte-couleurs.mjs --ecrire`
Expected: sur stderr, `empreinte écrite : N déclarations` avec N de l'ordre de 700–900.

Vérifier que le fichier a du sens avant de le figer :

Run: `head -5 src/lib/__fixtures__/empreinte-couleurs.txt && grep -c "var(" src/lib/__fixtures__/empreinte-couleurs.txt`
Expected: des lignes de la forme `.pf-seg button|color|#6b675c`, et **0** occurrence de `var(` — si un `var(` subsiste, la résolution est incomplète et le harnais ne prouve rien. Corriger avant d'aller plus loin.

- [ ] **Step 5: Lancer le test — il doit passer**

Run: `npx vitest run src/lib/empreinte-couleurs.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add scripts/empreinte-couleurs.mjs src/lib/empreinte-couleurs.test.ts src/lib/__fixtures__/empreinte-couleurs.txt
git commit -m "Empreinte des couleurs : de quoi prouver qu'une tokenisation ne change rien"
```

---

### Task 2: Neutraliser les copies littérales des jetons existants

La moitié du travail, et la plus sûre : les valeurs les plus fréquentes de la feuille sont des recopies de jetons déjà déclarés dans `:root`. Aucun jeton n'est créé ici, aucune valeur n'est modifiée.

**Files:**
- Modify: `src/styles.css` (remplacements ciblés)

**Interfaces:**
- Consumes: `scripts/empreinte-couleurs.mjs` (Tâche 1).
- Produces: une feuille où les 11 jetons existants sont employés partout où leur valeur exacte était recopiée.

- [ ] **Step 1: Vérifier que l'empreinte est au vert avant de toucher quoi que ce soit**

Run: `npx vitest run src/lib/empreinte-couleurs.test.ts`
Expected: PASS. Si ce test échoue déjà, s'arrêter : la suite ne prouverait rien.

- [ ] **Step 2: Appliquer les remplacements**

Correspondances exactes, relevées dans `:root` de `src/styles.css` :

| Valeur en dur | Occurrences | Jeton |
|---|---|---|
| `#fbfaf7` | 21 | `var(--paper)` |
| `#6b675c` | 69 | `var(--muted)` |
| `#1d6e42` | 33 | `var(--green)` |
| `#16281e` | 22 | `var(--green-dark)` |
| `#3a3e36` | 16 | `var(--body)` |
| `#ece8dd` | 15 | `var(--line)` |
| `#22271f` | 15 | `var(--ink-2)` |
| `#0f1f16` | 11 | `var(--fir)` |
| `#e6e2d8` | 10 | `var(--line-strong)` |
| `#e9f2ec` | 9 | `var(--green-tint)` |
| `#f4f1e8` | 5 | `var(--sand)` |
| `#f7f1e2` | 4 | `var(--amber-bg)` |
| `#b33a2e` | 18 | `var(--red)` |
| `#726e62` | 4 | `var(--faint)` |
| `#1a201c` | 2 | `var(--ink)` |
| `#e7e4d9` | 1 | `var(--backdrop)` |
| `#b08a3e` | 1 | `var(--brass)` |
| `#7b6c45` | 1 | `var(--brass-ink)` |
| `#926511` | 1 | `var(--amber)` |

**Deux pièges, à traiter avant de lancer un `sed`.**

*Piège 1 — le bloc `:root` lui-même.* Y remplacer `--paper: #fbfaf7` par `--paper: var(--paper)` crée une référence circulaire. Les remplacements ne s'appliquent **qu'après** la fin du bloc `:root`.

*Piège 2 — les commentaires.* La feuille contient de longs commentaires en français qui citent des hex (`« sur --amber-bg il mesurait 4,19:1 »`). Les toucher détruirait la traçabilité des décisions de contraste. Les commentaires ne sont **pas** modifiés.

Procéder avec ce script, qui gère les deux :

```bash
node -e '
const fs=require("fs");
const p="src/styles.css";
let css=fs.readFileSync(p,"utf8");
const M={"#fbfaf7":"--paper","#6b675c":"--muted","#1d6e42":"--green","#16281e":"--green-dark",
"#3a3e36":"--body","#ece8dd":"--line","#22271f":"--ink-2","#0f1f16":"--fir",
"#e6e2d8":"--line-strong","#e9f2ec":"--green-tint","#f4f1e8":"--sand","#f7f1e2":"--amber-bg",
"#b33a2e":"--red","#726e62":"--faint","#1a201c":"--ink","#e7e4d9":"--backdrop",
"#b08a3e":"--brass","#7b6c45":"--brass-ink","#926511":"--amber"};
// Frontière : fin du bloc :root. Rien avant nest touché.
const fin=css.indexOf("}",css.indexOf(":root"))+1;
const tete=css.slice(0,fin);
let corps=css.slice(fin);
// Découpe en segments commentaire / code ; on ne remplace que dans le code.
corps=corps.split(/(\/\*[\s\S]*?\*\/)/).map(seg=>
  seg.startsWith("/*")?seg:seg.replace(/#[0-9a-fA-F]{3,8}\b/g,h=>{
    const k=h.toLowerCase(); return M[k]?"var("+M[k]+")":h;})
).join("");
fs.writeFileSync(p,tete+corps);
console.error("fait");
'
```

- [ ] **Step 3: Vérifier qu'aucune couleur n'a bougé**

Run: `npx vitest run src/lib/empreinte-couleurs.test.ts`
Expected: PASS. **C'est la preuve entière de la tâche.** En cas d'échec, `git diff src/lib/__fixtures__` n'existe pas (le fixture n'est pas régénéré) : lire le message d'erreur, il montre les lignes divergentes. Ne **jamais** régénérer le fixture pour faire taire cette tâche.

- [ ] **Step 4: Mesurer le gain**

Run: `grep -o "#[0-9a-fA-F]\{3,8\}" src/styles.css | wc -l`
Expected: nettement moins que 582 — de l'ordre de 300, commentaires inclus.

- [ ] **Step 5: Faire tourner la suite complète**

Run: `npm test`
Expected: PASS, y compris `contraste-palette.test.ts` (les jetons n'ont pas changé de valeur, les 63 paires mesurent la même chose).

- [ ] **Step 6: Commit**

```bash
git add src/styles.css
git commit -m "Couleurs : 250 recopies de jetons redeviennent le jeton qu'elles copiaient"
```

---

### Task 3: Fusionner les quasi-doublons — la seule dérive visuelle assumée du chantier

Douze grappes de valeurs séparées par au plus 3/255 sur un canal : de la dérive de copier-coller, invisible à l'œil. Les fusionner évite de créer douze jetons pour douze nuances que personne ne distingue.

**La règle qui borne la tâche : on ne fusionne que dans un même rôle.** `#e7e4d9` (`--backdrop`, le fond derrière les cartes) et `#e6e2d8` (`--line-strong`, un trait) sont à 3/255 l'un de l'autre et portent deux rôles opposés — les fusionner casserait la distinction fond/trait dès qu'on redéfinira les jetons en sombre. C'est le piège central de cette tâche.

**Files:**
- Modify: `src/styles.css`
- Modify: `src/lib/__fixtures__/empreinte-couleurs.txt` (régénéré — la seule fois du chantier)

**Interfaces:**
- Consumes: la feuille issue de la Tâche 2.
- Produces: ~97 valeurs distinctes au lieu de ~120.

- [ ] **Step 1: Lister les grappes et leurs usages réels**

Run:
```bash
for h in efece1 f0ede3 f0ece2 f0ede4 efece2 eef1ee eef2ef eef2ec eef4f0 e6e3d7 eceadf eee7da f6f1e4 f6efe0 e6f0e9 eaf4ee faf9f5 f3f1ea e1ddd0 e3e0d3 e2c9c4 e3c9c5 8c2f24 8a3125 fbe9e6 fbeae7; do echo "--- #$h"; grep -n -i "#$h" src/styles.css | grep -v "^\s*/\*"; done
```
Expected: pour chaque valeur, la ou les déclarations qui l'emploient. **Lire cette sortie** : c'est elle qui dit si deux valeurs d'une grappe servent le même rôle.

- [ ] **Step 2: Appliquer les fusions dont le rôle est commun**

Fusions retenues, canonique = la valeur la plus employée de la grappe :

| Fusionnées | Vers | Rôle commun |
|---|---|---|
| `#efece1`, `#f0ede3`, `#f0ece2`, `#f0ede4` | `#efece2` | fond crème de section |
| `#eef1ee`, `#eef2ec`, `#eef4f0` | `#eef2ef` | fond vert très pâle |
| `#e6e3d7` | `#e6e2d8` | trait |
| `#eee7da` | `#eceadf` | fond sable clair |
| `#f6efe0` | `#f6f1e4` | fond crème d'encadré |
| `#e6f0e9`, `#eaf4ee` | `#e9f2ec` (`--green-tint`) | fond vert de cartouche |
| `#faf9f5` | `#fbfaf7` (`--paper`) | surface principale |
| `#f3f1ea` | `#f4f1e8` (`--sand`) | surface secondaire |
| `#e1ddd0` | `#e3e0d3` | trait sable |
| `#e2c9c4` | `#e3c9c5` | trait rouge pâle |
| `#8c2f24` | `#8a3125` | texte rouge foncé |
| `#fbe9e6` | `#fbeae7` | fond rouge très pâle |

**Non fusionnées, volontairement :**
- `#e7e4d9` (`--backdrop`) reste distinct de `#e6e2d8` (`--line-strong`) — fond contre trait.
- `#ece8dd` (`--line`) reste distinct de `#eceadf` — trait contre fond.

Appliquer avec le même script qu'en Tâche 2 (frontière `:root`, commentaires épargnés), en remplaçant la table `M` par les fusions ci-dessus (valeur → valeur, pas valeur → jeton).

- [ ] **Step 3: Constater que l'empreinte bouge, et vérifier qu'elle ne bouge que là**

Run: `node scripts/empreinte-couleurs.mjs > /tmp/apres.txt; diff src/lib/__fixtures__/empreinte-couleurs.txt /tmp/apres.txt | head -60`
Expected: uniquement des lignes où une des valeurs fusionnées devient sa canonique. **Aucune** autre couleur ne doit apparaître dans le diff. Si une couleur non listée bouge, le script a débordé — annuler (`git checkout src/styles.css`) et corriger.

- [ ] **Step 4: Régénérer le fixture et faire tourner la suite**

Run: `node scripts/empreinte-couleurs.mjs --ecrire && npm test`
Expected: PASS. C'est la seule tâche du chantier qui régénère le fixture, et c'est pourquoi elle est isolée dans son propre commit.

- [ ] **Step 5: Commit**

```bash
git add src/styles.css src/lib/__fixtures__/empreinte-couleurs.txt
git commit -m "Couleurs : douze grappes de dérive de copier-coller se rejoignent

Écart maximal de 3/255 sur un canal, invisible à l'œil. Deux grappes ne sont
PAS fusionnées : #e7e4d9/#e6e2d8 et #ece8dd/#eceadf séparent un fond d'un
trait, et cette distinction doit survivre au thème sombre."
```

---

### Task 4: Le jeton `--on-accent` — séparer « fond blanc » de « texte blanc »

`#ffffff` compte 110 occurrences, de loin la valeur la plus fréquente, et elle recouvre **deux rôles opposés** : la surface d'une carte, et le texte posé sur une surface sombre. En sombre, le premier doit devenir presque noir et le second rester presque blanc. Les confondre rendrait le thème sombre impossible.

La bonne nouvelle : le rôle est décidable mécaniquement par la propriété.

**Files:**
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: la feuille issue de la Tâche 3.
- Produces: les jetons `--card` (surfaces) et `--on-accent` (texte/tracé sur accent), tous deux `#ffffff` en clair.

- [ ] **Step 1: Vérifier la répartition par propriété**

Run: `grep -n "#fff\b\|#ffffff\b" src/styles.css | grep -v "^\s*[0-9]*:\s*/\*" | sed 's/.*:\s*\([a-z-]*\)\s*:.*/\1/' | sort | uniq -c | sort -rn`
Expected: une majorité de `background` / `background-color`, le reste en `color`, `fill`, `stroke`, `border-color`.

- [ ] **Step 2: Déclarer les deux jetons dans `:root`**

Ajouter dans le bloc `:root` de `src/styles.css`, à la suite des surfaces existantes :

```css
  /* Deux rôles que #fff confondait sur 110 déclarations : la SURFACE d'une
     carte, et le TEXTE posé sur un accent sombre (bouton vert, bandeau sapin).
     En thème sombre le premier devient presque noir et le second reste
     presque blanc — les garder confondus rendrait le sombre impossible. */
  --card: #ffffff;
  --on-accent: #ffffff;
```

- [ ] **Step 3: Répartir les 110 occurrences par propriété**

```bash
node -e '
const fs=require("fs");const p="src/styles.css";
let css=fs.readFileSync(p,"utf8");
const fin=css.indexOf("}",css.indexOf(":root"))+1;
const tete=css.slice(0,fin);
let corps=css.slice(fin);
const SURFACE=/^(background|background-color)$/;
corps=corps.split(/(\/\*[\s\S]*?\*\/)/).map(seg=>{
  if(seg.startsWith("/*"))return seg;
  return seg.replace(/([\w-]+)(\s*:\s*)([^;{}]*)/g,(tout,prop,sep,val)=>{
    if(!/#fff\b|#ffffff\b/i.test(val))return tout;
    const jeton=SURFACE.test(prop)?"var(--card)":"var(--on-accent)";
    return prop+sep+val.replace(/#ffffff\b|#fff\b/gi,jeton);
  });
}).join("");
fs.writeFileSync(p,tete+corps);
console.error("fait");
'
```

Puis relire à la main les cas où `#fff` apparaissait dans un `box-shadow`, un `gradient` ou un `border` : la règle par propriété ne les tranche pas correctement. Les repérer :

Run: `git diff src/styles.css | grep "^+" | grep -E "box-shadow|gradient|border" | grep "on-accent"`
Expected: quelques lignes. Pour chacune, décider à la main : un liseré clair sur fond sombre est `--on-accent` ; un trait blanc entre deux cartes claires est `--card`.

- [ ] **Step 4: Vérifier que rien n'a bougé**

Run: `npx vitest run src/lib/empreinte-couleurs.test.ts`
Expected: PASS — les deux jetons valent `#ffffff`, l'empreinte est inchangée.

- [ ] **Step 5: Suite complète**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/styles.css
git commit -m "Couleurs : #fff portait deux rôles, il en porte désormais deux jetons

--card pour la surface d'une carte, --on-accent pour le texte posé sur un
accent sombre. En thème sombre l'un s'inverse et l'autre non."
```

---

### Task 5: Les jetons de surface, de trait et de texte

Les valeurs restantes se rangent par famille de teinte croisée avec une bande de clarté. L'analyse est faite : familles ambre/neutre chaud (49 valeurs), vert (41), neutre (7), rouge (14), bleu (9) ; bandes surface (L≥85), trait (65≤L<85), décor (45≤L<65), texte (L<45).

**Files:**
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: la feuille issue de la Tâche 4.
- Produces: le jeu de jetons complet listé ci-dessous. Les tâches 8 à 10 redéfinissent exactement ces noms.

- [ ] **Step 1: Régénérer l'inventaire des valeurs restantes avec leurs usages**

```bash
node -e '
const fs=require("fs");
const css=fs.readFileSync("src/styles.css","utf8").replace(/\/\*[\s\S]*?\*\//g,"");
const fin=css.indexOf("}",css.indexOf(":root"))+1;
const corps=css.slice(fin);
const par={};
for(const m of corps.matchAll(/([\w-]+)\s*:\s*([^;{}]*#[0-9a-fA-F]{3,8}[^;{}]*)/g)){
  for(const h of m[2].match(/#[0-9a-fA-F]{3,8}/g)||[]){
    const k=h.toLowerCase();(par[k]=par[k]||new Set()).add(m[1]);}}
for(const k of Object.keys(par).sort())console.log(k,"->",[...par[k]].join(","));
' | tee /tmp/restantes.txt | wc -l
```
Expected: de l'ordre de 95 lignes, chacune donnant une valeur et les propriétés qui l'emploient. C'est la table de décision de l'étape suivante.

- [ ] **Step 2: Déclarer le jeu de jetons dans `:root`**

Compléter le bloc `:root`. Les jetons déjà présents ne sont pas redéclarés ; ceux ci-dessous sont ajoutés, avec pour valeur celle de la couleur qu'ils remplacent (relevée dans `/tmp/restantes.txt`) :

```css
  /* Surfaces, du fond de page à la carte posée dessus. */
  --surface-raised: #ffffff;  /* carte au-dessus d'une carte (modale, popover) */
  --sand-2: #eceadf;          /* bande sable, plus soutenue que --sand */
  --cream: #efece2;           /* fond de section crème */
  --cream-2: #f6f1e4;         /* encadré crème */

  /* Traits. --line et --line-strong existent ; celui-ci est le trait qui
     DÉLIMITE un contrôle (bordure de champ, de bouton fantôme). WCAG 1.4.11
     lui impose 3:1, alors qu'un simple séparateur décoratif n'a pas de seuil.
     Les confondre ferait passer les champs de saisie sous le seuil en sombre. */
  --line-control: #cfc9ba;
  --line-sand: #e3e0d3;

  /* Sémantique : chaque couleur a son fond de cartouche (-bg) et le texte
     posé dessus (-ink). --green, --amber, --red existent déjà comme accent. */
  --green-ink: #14532b;
  --amber-ink: #6d4d0d;
  --red-bg: #fbeae7;
  --red-ink: #7d2118;
  --info: #2b6c8f;
  --info-bg: #eef4f6;
  --info-ink: #14303b;
```

- [ ] **Step 3: Remplacer les valeurs par les jetons**

Pour chaque ligne de `/tmp/restantes.txt`, remplacer la valeur par le jeton de même valeur. Réutiliser le script de la Tâche 2 en changeant la table `M` (frontière `:root` et commentaires épargnés, mêmes pièges).

Les valeurs qui ne correspondent à aucun jeton — nuances employées une seule fois dans un dégradé ou une ombre — sont **laissées en dur** et traitées en Tâche 6. Ne pas forcer un jeton par valeur : trente jetons servant chacun une déclaration ne rangent rien.

- [ ] **Step 4: Vérifier que rien n'a bougé**

Run: `npx vitest run src/lib/empreinte-couleurs.test.ts`
Expected: PASS.

- [ ] **Step 5: Suite complète et lint**

Run: `npm test && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/styles.css
git commit -m "Couleurs : surfaces, traits et sémantique deviennent des jetons

--line-control est séparé de --line : la bordure qui délimite un champ relève
du 3:1 de WCAG 1.4.11, un séparateur décoratif n'a pas de seuil."
```

---

### Task 6: Voiles, ombres et dégradés

80 `rgba()` dans la feuille, et c'est le seul endroit où un remplacement mécanique donnerait un résultat faux : un voile noir à 4 % posé sur une surface claire doit devenir un voile **blanc** en sombre, ce qu'aucune substitution de valeur ne devine.

**Files:**
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: la feuille issue de la Tâche 5.
- Produces: `--shadow`, `--shadow-strong`, `--veil`, `--scrim`, `--paper-fade`.

- [ ] **Step 1: Recenser les `rgba()` par famille**

Run: `grep -o "rgba([^)]*)" src/styles.css | sort | uniq -c | sort -rn`
Expected: la famille `rgba(20, 30, 25, …)` (ombres portées, 8+3+3+2+2+2+2+1 occurrences), `rgba(251, 250, 247, …)` (voile sur `--paper`, pour les dégradés de fondu en bas de liste), `rgba(15, 31, 22, …)` et `rgba(22, 40, 30, …)` (voiles sur surfaces sapin), `rgba(0, 0, 0, …)` (scrim de modale), `rgba(255, 255, 255, …)` (liserés clairs), `rgba(29, 110, 66, …)` (halo vert).

- [ ] **Step 2: Déclarer les jetons de voile**

```css
  /* Voiles et ombres. Ce sont les seules couleurs que le thème sombre ne peut
     pas se contenter de redéfinir « en plus foncé » : une ombre noire à 4 %
     posée sur une surface claire doit devenir un liseré CLAIR sur une surface
     sombre, sinon elle disparaît purement et simplement. D'où des jetons qui
     portent la couleur ET son alpha, et non un jeton de teinte réutilisé. */
  --shadow: rgba(20, 30, 25, 0.04);
  --shadow-strong: rgba(20, 30, 25, 0.15);
  --veil: rgba(15, 31, 22, 0.6);      /* voile sur surface sapin */
  --scrim: rgba(0, 0, 0, 0.4);        /* fond de modale */
  --paper-fade: rgba(251, 250, 247, 0.92); /* fondu de bas de liste sur --paper */
```

- [ ] **Step 3: Remplacer les occurrences dont l'alpha correspond**

Remplacer à la main — il y a moins de dix valeurs distinctes par famille, et chaque famille a plusieurs alphas. Pour les alphas qui ne correspondent à aucun jeton, laisser la valeur en dur **si et seulement si** elle est décorative (halo de focus, éclat de bouton) ; les noter en commentaire pour la Tâche 10.

Le dégradé `rgba(251, 250, 247, 0)` (extrémité transparente d'un fondu) devient `transparent` : une couleur à alpha 0 n'a pas de teinte, et l'écrire en dur ferait croire à une dépendance au thème.

- [ ] **Step 4: Vérifier**

Run: `npx vitest run src/lib/empreinte-couleurs.test.ts`
Expected: PASS. Attention : `rgba(251, 250, 247, 0)` → `transparent` **change** l'empreinte (la ligne disparaît, `transparent` ne matche pas la regex couleur). C'est le seul écart attendu. Le vérifier au diff, puis régénérer :

Run: `node scripts/empreinte-couleurs.mjs > /tmp/apres.txt; diff src/lib/__fixtures__/empreinte-couleurs.txt /tmp/apres.txt`
Expected: uniquement les lignes du dégradé concerné. Si c'est bien le cas : `node scripts/empreinte-couleurs.mjs --ecrire`.

- [ ] **Step 5: Suite complète**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/styles.css src/lib/__fixtures__/empreinte-couleurs.txt
git commit -m "Couleurs : voiles et ombres deviennent des jetons à part entière

Une ombre noire à 4 % sur fond clair doit devenir un liseré clair sur fond
sombre, pas une ombre plus foncée. Ces jetons portent la teinte ET l'alpha."
```

---

### Task 7: Tokeniser les styles inline des composants

154 sites, 44 valeurs distinctes, dans une vingtaine de fichiers. Même principe, mais l'empreinte CSS ne les voit pas : la vérification passe par la suite de tests existante et par une relecture du diff.

**Files:**
- Modify: `src/App.tsx`, `src/components/BottomNav.tsx`, `src/components/CarnetRecettes.tsx`, `src/components/CatchEditor.tsx`, `src/components/RecipeBody.tsx`, `src/screens/Accueil.tsx`, `src/screens/Carte.tsx`, `src/screens/Credits.tsx`, `src/screens/Cuisine.tsx`, `src/screens/Especes.tsx`, `src/screens/Fiche.tsx`, `src/screens/Materiel.tsx`, `src/screens/Noeuds.tsx`, `src/screens/Outils.tsx`, `src/screens/OutilsTerrain.tsx`, `src/screens/Prise.tsx`, `src/screens/Recette.tsx`, `src/screens/RecipeEditor.tsx`, `src/screens/RecipeView.tsx`, `src/screens/Regle.tsx`

**Interfaces:**
- Consumes: les jetons déclarés en Tâches 4 à 6.
- Produces: des styles inline exprimés en `var(--jeton)`.

- [ ] **Step 1: Inventorier les valeurs et leurs propriétés**

```bash
node -e '
const fs=require("fs");const path=require("path");
const par={};
function marche(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){
 const p=path.join(d,e.name);
 if(e.isDirectory())marche(p);
 else if(/\.tsx$/.test(e.name)&&!/\.test\./.test(e.name)){
  const s=fs.readFileSync(p,"utf8");
  for(const m of s.matchAll(/(\w+)\s*:\s*"(#[0-9a-fA-F]{3,8})"/g)){
   const k=m[2].toLowerCase();(par[k]=par[k]||[]).push(m[1]+" @ "+p);}}}}
marche("src");
for(const k of Object.keys(par).sort())console.log(k,"("+par[k].length+")",[...new Set(par[k].map(x=>x.split(" @ ")[0]))].join(","));
'
```
Expected: ~44 lignes. Les valeurs y sont, en majorité, celles déjà tokenisées côté CSS.

- [ ] **Step 2: Remplacer, en distinguant `#fff` par propriété comme en Tâche 4**

Même règle : `backgroundColor`/`background` → `var(--card)` ; `color`/`fill`/`stroke` → `var(--on-accent)`.

Attention à trois endroits particuliers relevés dans le code :
- `src/App.tsx:199` — `style={{ background: state.bigUI ? "#1D6E42" : "#FFFFFF" }}` : le vert devient `var(--green)`, le blanc `var(--card)`.
- `src/App.tsx:202` — `stroke={state.bigUI ? "#FBFAF7" : "#4A5D52"}` : ce sont des **props** d'un composant `Icon`, pas des styles inline. Une prop `stroke` traverse jusqu'à un attribut SVG, où `var(--paper)` fonctionne. Vérifier visuellement après coup.
- `src/screens/Regle.tsx` — **laisser tel quel**, la règle garde son fond clair dans les deux thèmes (Tâche 12). Ajouter le commentaire qui le dit, sinon la prochaine passe « corrigera » l'oubli apparent.

- [ ] **Step 3: Lancer la suite**

Run: `npm test`
Expected: PASS. `contraste-inline.test.ts` passe toujours : sa liste noire de trois valeurs ne concerne pas les valeurs tokenisées ici. Si l'une des trois valeurs interdites apparaissait, le test le dirait.

- [ ] **Step 4: Relire le diff**

Run: `git diff --stat && git diff | grep "^+" | grep -c "var(--"`
Expected: une vingtaine de fichiers touchés, ~154 insertions de `var(--`.

- [ ] **Step 5: Build**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "Couleurs : les 154 styles inline passent aux jetons

Regle.tsx est explicitement épargnée : c'est un instrument de mesure, son fond
reste clair dans les deux thèmes."
```

---

### Task 8: `prefs.theme` et la résolution « auto » — la logique, testée à part

La logique pure d'abord, sans DOM : elle sera consommée à la fois par React et par le script inline anti-flash, et c'est ce qui garantit qu'il n'y a pas deux implémentations.

**Files:**
- Modify: `src/lib/prefs.ts`
- Modify: `src/lib/prefs.test.ts`
- Create: `src/lib/theme.ts`
- Create: `src/lib/theme.test.ts`

**Interfaces:**
- Consumes: `Prefs`, `readPrefs`, `writePrefs`, `DEFAULT_PREFS` de `src/lib/prefs.ts`.
- Produces:
  - `type Theme = "auto" | "light" | "dark"` et `type ThemeEffectif = "light" | "dark"` (`src/lib/theme.ts`)
  - `resoudreTheme(pref: Theme, systemeSombre: boolean): ThemeEffectif`
  - `appliquerTheme(effectif: ThemeEffectif, doc?: Document): void` — pose `data-theme` et met à jour `theme-color`
  - `THEME_COLORS: Record<ThemeEffectif, string>`
  - `Prefs` gagne le champ `theme: Theme` ; `DEFAULT_PREFS.theme === "auto"`

- [ ] **Step 1: Écrire les tests de `resoudreTheme` et du champ `theme`**

Créer `src/lib/theme.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { resoudreTheme, appliquerTheme, THEME_COLORS } from "./theme";

describe("resoudreTheme", () => {
  it("suit le système en auto", () => {
    expect(resoudreTheme("auto", true)).toBe("dark");
    expect(resoudreTheme("auto", false)).toBe("light");
  });

  it("ignore le système quand le choix est explicite", () => {
    // Le cas qui compte : téléphone en sombre, utilisateur qui a choisi Clair
    // parce qu'il pêche en plein soleil. Le choix doit gagner.
    expect(resoudreTheme("light", true)).toBe("light");
    expect(resoudreTheme("dark", false)).toBe("dark");
  });
});

describe("appliquerTheme", () => {
  it("pose data-theme et réécrit theme-color", () => {
    const doc = document.implementation.createHTMLDocument();
    const meta = doc.createElement("meta");
    meta.setAttribute("name", "theme-color");
    doc.head.appendChild(meta);

    appliquerTheme("dark", doc);
    expect(doc.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(meta.getAttribute("content")).toBe(THEME_COLORS.dark);

    appliquerTheme("light", doc);
    expect(doc.documentElement.getAttribute("data-theme")).toBe("light");
    expect(meta.getAttribute("content")).toBe(THEME_COLORS.light);
  });

  it("ne lève pas si aucune balise theme-color n'existe", () => {
    const doc = document.implementation.createHTMLDocument();
    expect(() => appliquerTheme("dark", doc)).not.toThrow();
    expect(doc.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
```

Ajouter à `src/lib/prefs.test.ts` :

```ts
describe("theme", () => {
  it("vaut auto par défaut", () => {
    expect(DEFAULT_PREFS.theme).toBe("auto");
  });

  it("retombe sur auto si la valeur stockée est inconnue", () => {
    // Une préférence corrompue ne doit pas laisser l'app sans thème.
    localStorage.setItem("carnet:prefs", JSON.stringify({ dept: "41", theme: "sépia" }));
    expect(readPrefs().theme).toBe("auto");
  });

  it("relit un thème valide", () => {
    localStorage.setItem("carnet:prefs", JSON.stringify({ dept: "41", theme: "dark" }));
    expect(readPrefs().theme).toBe("dark");
  });
});
```

- [ ] **Step 2: Lancer — doit échouer**

Run: `npx vitest run src/lib/theme.test.ts src/lib/prefs.test.ts`
Expected: FAIL — `Cannot find module './theme'`, et `DEFAULT_PREFS.theme` vaut `undefined`.

- [ ] **Step 3: Écrire `src/lib/theme.ts`**

```ts
/**
 * Le thème, et rien d'autre.
 *
 * Ce module est la SEULE source de vérité sur « quel thème est actif ». Il est
 * consommé deux fois : par React (au montage et à chaque changement de
 * préférence) et par le script inline d'index.html, qui doit poser l'attribut
 * avant le premier paint. Deux consommateurs, une implémentation — d'où un
 * module sans dépendance à React et sans effet de bord à l'import.
 *
 * `prefers-color-scheme` n'apparaît PAS dans src/styles.css : la feuille ne
 * connaît que `:root[data-theme="dark"]`. C'est ici que « auto » devient une
 * valeur concrète. L'alternative — un bloc @media plus un bloc [data-theme] —
 * obligerait à écrire la liste des jetons deux fois, puisqu'on ne peut pas
 * grouper un sélecteur sous @media avec un sélecteur hors @media.
 */

export type Theme = "auto" | "light" | "dark";
export type ThemeEffectif = "light" | "dark";

export const THEMES: Theme[] = ["auto", "light", "dark"];

export function estTheme(v: unknown): v is Theme {
  return typeof v === "string" && (THEMES as string[]).includes(v);
}

/** Couleur de la barre d'état du téléphone, par thème effectif.
 *  Elle doit suivre ce que l'app affiche EN HAUT, pas une surface quelconque :
 *  en clair c'est le bandeau sapin (la valeur historique, inchangée), en sombre
 *  c'est --backdrop. Une barre système qui jure avec le haut de l'écran se voit
 *  immédiatement sur une PWA plein écran. */
export const THEME_COLORS: Record<ThemeEffectif, string> = {
  light: "#16281E",
  dark: "#0D120F",
};

export const REQUETE_SOMBRE = "(prefers-color-scheme: dark)";

export function resoudreTheme(pref: Theme, systemeSombre: boolean): ThemeEffectif {
  if (pref === "auto") return systemeSombre ? "dark" : "light";
  return pref;
}

/** Le système est-il en sombre ? Faux si matchMedia est absent (jsdom, vieux
 *  navigateur) — le thème clair est le repli sûr, c'est celui d'origine. */
export function systemeSombre(win: Window = window): boolean {
  try {
    return win.matchMedia?.(REQUETE_SOMBRE).matches ?? false;
  } catch {
    return false;
  }
}

/** Pose l'attribut et met la barre d'état d'accord avec lui. */
export function appliquerTheme(effectif: ThemeEffectif, doc: Document = document): void {
  doc.documentElement.setAttribute("data-theme", effectif);
  // Les deux balises `media` d'index.html couvrent le mode auto avant tout
  // script ; dès qu'un thème est résolu, c'est cette balise-ci qui tranche.
  const meta = doc.querySelector('meta[name="theme-color"]:not([media])')
    ?? doc.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", THEME_COLORS[effectif]);
}
```

- [ ] **Step 4: Ajouter le champ à `src/lib/prefs.ts`**

Dans l'interface `Prefs`, après `bigUI` :

```ts
  /** Thème demandé. « auto » suit le réglage du téléphone ; voir lib/theme.ts. */
  theme: Theme;
```

Ajouter l'import `import { estTheme, type Theme } from "./theme";`, étendre `DEFAULT_PREFS` avec `theme: "auto"`, et dans `readPrefs`, à côté des autres champs :

```ts
      // Une préférence de thème corrompue ne doit pas laisser l'app sans
      // thème du tout — « auto » est toujours une réponse valable.
      theme: estTheme(p.theme) ? p.theme : DEFAULT_PREFS.theme,
```

Ne pas oublier la branche « pas de prefs stockées », qui construit son objet à la main : elle hérite de `DEFAULT_PREFS` par le spread, donc rien à y faire — le vérifier.

Enfin, `writePrefs` reçoit son objet complet depuis `store.tsx` ; l'appel y sera étendu en Tâche 11.

- [ ] **Step 5: Lancer — doit passer**

Run: `npx vitest run src/lib/theme.test.ts src/lib/prefs.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/theme.ts src/lib/theme.test.ts src/lib/prefs.ts src/lib/prefs.test.ts
git commit -m "Thème : la préférence rejoint prefs.ts, la résolution vit dans theme.ts

prefs.ts existe pour les réglages connus avant le premier paint — c'est
exactement le cas du thème."
```

---

### Task 9: La palette sombre

Les valeurs. Elles ont été mesurées avant d'être écrites : chaque texte passe AA sur chacune des cinq surfaces (pire cas 4,80:1), chaque couleur sémantique passe AA sur son propre fond de cartouche (pire cas 6,67:1), et `--line-control` tient 3,21:1 au minimum.

**Files:**
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: tous les jetons déclarés en Tâches 4 à 6.
- Produces: le bloc `:root[data-theme="dark"]`.

- [ ] **Step 1: Ajouter le bloc, immédiatement après `:root`**

```css
/* ============================================================================
   Thème sombre.

   Ce bloc ne redéfinit QUE des jetons. Aucune règle de la feuille n'est
   dupliquée ici, et c'est la seule discipline qui empêche les deux thèmes de
   diverger à la première retouche : une règle ajoutée demain hérite du thème
   sombre sans que personne n'y pense.

   Les valeurs ne sont pas choisies à l'œil. Chaque couleur de texte a été
   mesurée contre les cinq surfaces (--paper, --card, --backdrop, --sand,
   --surface-raised) : le pire cas est --faint sur --surface-raised à 4,80:1,
   au-dessus des 4,5:1 d'AA. Chaque couleur sémantique a été mesurée sur son
   propre fond de cartouche : pire cas --green sur --green-bg à 6,67:1.
   contraste-palette.test.ts rejoue tout ça à chaque exécution.
   ========================================================================= */
:root[data-theme="dark"] {
  /* Surfaces, de la plus enfoncée à la plus soulevée. */
  --backdrop: #0d120f;
  --paper: #141a16;
  --card: #1a211c;
  --sand: #1d241f;
  --sand-2: #202823;
  --cream: #1e241d;
  --cream-2: #232a21;
  --surface-raised: #212a24;
  --fir: #0a120d;
  --green-dark: #0a120d;

  /* Texte. --on-accent reste clair : c'est le texte posé sur un accent, et un
     accent reste une surface colorée soutenue dans les deux thèmes. */
  --ink: #eef2ee;
  --ink-2: #e2e8e3;
  --body: #ccd4ce;
  --muted: #9aa79e;
  --faint: #8a968d;
  --on-accent: #f2f7f3;

  /* Traits. --line-control tient 3:1 sur les trois surfaces où on pose un
     champ de saisie (3,84 / 3,57 / 3,21) — WCAG 1.4.11. --line et
     --line-strong sont décoratifs, ils n'ont pas de seuil. */
  --line: #2b332d;
  --line-strong: #3a443c;
  --line-sand: #333b34;
  --line-control: #69796e;

  /* Sémantique. En clair, l'accent est foncé sur fond pâle ; en sombre c'est
     l'inverse — l'accent devient clair sur fond profond. */
  --green: #4cc07d;
  --green-tint: #16291e;
  --green-ink: #8fe0ab;
  --amber: #d9a441;
  --amber-bg: #2a2113;
  --amber-ink: #e8bd6a;
  --red: #f08a7d;
  --red-bg: #2b1714;
  --red-ink: #f3a79c;
  --info: #6fb6dd;
  --info-bg: #12242c;
  --info-ink: #94cbe8;

  /* Décor. */
  --brass: #c9a761;
  --brass-ink: #d8bc85;

  /* Voiles. L'ombre portée disparaît sur fond sombre : elle est remplacée par
     un liseré CLAIR, qui joue le même rôle de séparation. C'est le seul jeton
     dont la nature change d'un thème à l'autre, et c'est voulu. */
  --shadow: rgba(255, 255, 255, 0.05);
  --shadow-strong: rgba(255, 255, 255, 0.12);
  --veil: rgba(0, 0, 0, 0.65);
  --scrim: rgba(0, 0, 0, 0.6);
  --paper-fade: rgba(20, 26, 22, 0.92);
}
```

- [ ] **Step 2: Régénérer l'empreinte — elle grandit, c'est normal**

Run: `node scripts/empreinte-couleurs.mjs > /tmp/apres.txt; diff src/lib/__fixtures__/empreinte-couleurs.txt /tmp/apres.txt | grep "^>" | grep -vc "data-theme"`
Expected: **0** — toutes les lignes ajoutées appartiennent au bloc `data-theme`. Aucune ligne retirée (`^<`) ne doit apparaître : le thème clair est intact.

Run: `node scripts/empreinte-couleurs.mjs --ecrire`

- [ ] **Step 3: Vérifier à l'œil, en forçant l'attribut**

Run: `npm run dev`
Puis, dans la console du navigateur : `document.documentElement.setAttribute("data-theme","dark")`.
Expected: l'app passe en sombre. Parcourir Accueil, Espèces, une Fiche, Carnet, Outils. Noter ce qui reste clair — ce sont les endroits que la tokenisation a manqués, à corriger ici même en tokenisant la règle fautive.

- [ ] **Step 4: Suite complète**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/styles.css src/lib/__fixtures__/empreinte-couleurs.txt
git commit -m "Thème sombre : la palette, mesurée avant d'être écrite

Pire cas texte 4,80:1, pire cas sémantique sur son fond 6,67:1,
--line-control à 3,21:1 minimum pour la bordure des champs (1.4.11)."
```

---

### Task 10: Les garde-fous de contraste jouent les deux thèmes

Sans cette tâche, le thème sombre se dégrade en silence à la première retouche de palette.

**Files:**
- Modify: `src/lib/contraste-palette.ts`
- Modify: `src/lib/contraste-palette.test.ts`
- Modify: `src/lib/contraste-inline.test.ts`

**Interfaces:**
- Consumes: `variablesRacine`, `resoudreCouleur`, `valeurDeclaree`, `evaluerPaire`, `PAIRES` de `contraste-palette.ts`.
- Produces: `variablesTheme(css: string, theme: "light" | "dark"): Record<string, string>`. La table `PAIRES` n'est **pas** dupliquée.

- [ ] **Step 1: Écrire le test des trois nouvelles garanties**

Ajouter à `src/lib/contraste-palette.test.ts` :

```ts
import { variablesTheme } from "./contraste-palette";

describe("thème sombre", () => {
  it("chaque jeton du thème clair a son équivalent sombre", () => {
    // Le garde-fou qui attrape l'oubli de demain : quelqu'un ajoute une
    // couleur dans :root six mois après ce chantier, sans penser au sombre.
    // Sans ce test, l'app affiche une couleur claire au milieu du sombre et
    // personne ne le voit avant un utilisateur.
    const clair = Object.keys(variablesTheme(CSS, "light"));
    const sombre = new Set(Object.keys(variablesTheme(CSS, "dark")));
    const manquants = clair.filter((j) => !sombre.has(j));
    expect(manquants).toEqual([]);
  });

  it("les 63 paires passent leur seuil dans les deux thèmes", () => {
    for (const theme of ["light", "dark"] as const) {
      const vars = variablesTheme(CSS, theme);
      for (const paire of PAIRES) {
        const { ratio, seuil } = evaluerPaire(paire, CSS, vars);
        expect(
          ratio,
          `[${theme}] ${paire.nom} (${paire.ou}) : ${ratio.toFixed(2)}:1 < ${seuil}:1`,
        ).toBeGreaterThanOrEqual(seuil);
      }
    }
  });
});
```

- [ ] **Step 2: Lancer — doit échouer**

Run: `npx vitest run src/lib/contraste-palette.test.ts`
Expected: FAIL — `variablesTheme` n'est pas exportée.

- [ ] **Step 3: Implémenter `variablesTheme`**

Dans `src/lib/contraste-palette.ts`, à côté de `variablesRacine` :

```ts
/**
 * Les jetons tels qu'ils valent DANS un thème donné.
 *
 * En clair, ce sont ceux de `:root`. En sombre, ceux de `:root` écrasés par
 * ceux de `:root[data-theme="dark"]` — exactement ce que fait la cascade au
 * navigateur. Cette fonction est ce qui permet à la table des 63 paires de
 * n'être écrite QU'UNE FOIS : les fonds y sont exprimés en jetons, donc ils
 * suivent le thème d'eux-mêmes.
 */
export function variablesTheme(
  css: string,
  theme: "light" | "dark",
): Record<string, string> {
  const base = variablesRacine(css);
  if (theme === "light") return base;
  const bloc = /:root\[data-theme="dark"\]\s*\{([\s\S]*?)\}/.exec(css);
  if (!bloc) return base;
  const corps = bloc[1].replace(/\/\*[\s\S]*?\*\//g, "");
  const sombre = { ...base };
  for (const decl of corps.split(";")) {
    const m = /^\s*(--[\w-]+)\s*:\s*([\s\S]+)$/.exec(decl);
    if (m) sombre[m[1]] = m[2].trim();
  }
  return sombre;
}
```

`evaluerPaire` prend aujourd'hui `(paire, css)` et appelle `variablesRacine` en interne. Lui ajouter un troisième paramètre optionnel `vars` qui, s'il est fourni, remplace cet appel :

```ts
export function evaluerPaire(
  paire: Paire,
  css: string,
  vars: Record<string, string> = variablesRacine(css),
): { ratio: number; seuil: number } {
```

…et remplacer, dans le corps, l'appel interne à `variablesRacine(css)` par l'usage de `vars`. Le paramètre est optionnel, donc les appels existants du fichier de test ne changent pas.

- [ ] **Step 4: Lancer — corriger la palette, pas le test**

Run: `npx vitest run src/lib/contraste-palette.test.ts`
Expected: PASS. Si une paire échoue en sombre, le message donne le nom, l'emplacement et le ratio : **ajuster la clarté du jeton fautif dans le bloc sombre de la Tâche 9**, puis relancer. Ne pas abaisser le seuil, et ne pas retirer la paire de la table.

- [ ] **Step 5: Muter le test inline en interdiction de tout littéral**

`contraste-inline.test.ts` est aujourd'hui une liste noire de trois valeurs. Après la Tâche 7, les sites qu'il surveillait sont tokenisés : la liste noire ne voit plus rien. La remplacer par une interdiction plus large, qui subsume l'ancienne.

Remplacer le bloc `INTERDITES` et le test qui l'utilise par :

```ts
/**
 * Ce test a changé de nature avec le thème sombre, et c'est un gain.
 *
 * Avant : une liste noire de trois couleurs mesurées trop faibles sur --paper.
 * Elle ne voyait que ce qu'on y avait écrit, et elle ne dit plus rien depuis
 * que les styles inline sont passés aux jetons.
 *
 * Maintenant : AUCUN littéral de couleur en style inline. C'est plus strict et
 * plus simple à tenir — une couleur en dur ne peut pas changer avec le thème,
 * donc elle est un bug de thème sombre, indépendamment de son contraste. La
 * mesure du contraste, elle, se fait sur les jetons dans contraste-palette.
 */
const LITTERAL = /(?:background(?:Color)?|color|fill|stroke|borderColor|outlineColor)\s*:\s*"(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))"/g;
```

Le test balaie `RACINES` comme aujourd'hui, applique `LITTERAL`, et échoue en listant fichier + valeur + jeton suggéré. Conserver le mécanisme de fichiers tolérés déjà présent dans le fichier, et y inscrire `src/screens/Regle.tsx` avec sa raison :

```ts
const TOLERES: Record<string, string> = {
  "src/screens/Regle.tsx":
    "Instrument de mesure : fond clair dans les deux thèmes, pour que la " +
    "silhouette du poisson posé dessus reste lisible. Voir la spec du thème sombre.",
};
```

- [ ] **Step 6: Lancer la suite complète**

Run: `npm test`
Expected: PASS. Si le nouveau test remonte des littéraux oubliés en Tâche 7, les tokeniser maintenant.

- [ ] **Step 7: Commit**

```bash
git add src/lib/contraste-palette.ts src/lib/contraste-palette.test.ts src/lib/contraste-inline.test.ts
git commit -m "Contraste : les 63 paires se rejouent dans les deux thèmes

La table n'est pas dupliquée — les fonds y sont des jetons, ils suivent le
thème. Deux tests neufs : tout jeton clair doit avoir son équivalent sombre,
et plus aucun littéral de couleur en style inline."
```

---

### Task 11: Câbler le thème — script anti-flash, store, `theme-color`

**Files:**
- Modify: `index.html`
- Modify: `src/store.tsx`
- Modify: `src/main.tsx`
- Create: `src/lib/theme-dom.test.ts`

**Interfaces:**
- Consumes: `resoudreTheme`, `appliquerTheme`, `systemeSombre`, `REQUETE_SOMBRE`, `THEME_COLORS`, `type Theme` (Tâche 8) ; `Prefs.theme` ; le bloc sombre (Tâche 9).
- Produces: `state.theme: Theme` et l'action `set({ theme })` dans le store ; `data-theme` toujours présent sur `<html>`.

- [ ] **Step 1: Ajouter le script anti-flash et les deux `theme-color` dans `index.html`**

Remplacer la ligne `<meta name="theme-color" content="#16281E" />` par :

```html
    <!-- Deux balises `media` : elles donnent la bonne barre d'état en mode auto
         AVANT que le moindre script ne tourne. Dès que le thème est résolu, le
         script ci-dessous (puis React) écrit la troisième, sans `media`, qui
         l'emporte. Les valeurs sont celles de THEME_COLORS dans lib/theme.ts —
         src/lib/theme-dom.test.ts fait échouer la suite si elles divergent. -->
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#16281E" />
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0D120F" />
    <meta name="theme-color" content="#16281E" />

    <!-- Anti-flash. Sans ce script, un utilisateur en thème sombre voit un
         flash blanc pleine page à chaque lancement, le temps que le bundle
         React se charge — sur une PWA lancée depuis l'écran d'accueil, c'est
         le défaut le plus visible de toute la fonctionnalité.

         C'est la forme minimale de lib/theme.ts, pas une seconde
         implémentation : même clé, même résolution, mêmes couleurs. Il ne peut
         pas importer le module (il doit être synchrone et précéder le bundle).
         Tout est enveloppé : un localStorage inaccessible en navigation privée
         fait lever l'ACCÈS lui-même, et l'app ne doit pas mourir pour ça. -->
    <script>
      (function () {
        var t = "auto";
        try {
          var p = JSON.parse(localStorage.getItem("carnet:prefs") || "{}");
          if (p.theme === "light" || p.theme === "dark" || p.theme === "auto") t = p.theme;
        } catch (e) {}
        var eff =
          t === "auto"
            ? (window.matchMedia &&
               window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light")
            : t;
        document.documentElement.setAttribute("data-theme", eff);
        var m = document.querySelector('meta[name="theme-color"]:not([media])');
        if (m) m.setAttribute("content", eff === "dark" ? "#0D120F" : "#16281E");
      })();
    </script>
```

- [ ] **Step 2: Écrire le test qui empêche le script inline de diverger du module**

Créer `src/lib/theme-dom.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { THEME_COLORS } from "./theme";

const HTML = readFileSync(
  fileURLToPath(new URL("../../index.html", import.meta.url)),
  "utf8",
);

/**
 * Le script anti-flash d'index.html duplique nécessairement la logique de
 * theme.ts : il doit être synchrone et précéder le bundle, donc il ne peut
 * rien importer. Ce test est ce qui rend cette duplication tenable — il fait
 * échouer la suite dès que les deux divergent.
 */
describe("script anti-flash d'index.html", () => {
  it("utilise la même clé de stockage que prefs.ts", () => {
    expect(HTML).toContain('localStorage.getItem("carnet:prefs")');
  });

  it("emploie les couleurs de barre d'état de theme.ts", () => {
    expect(HTML).toContain(THEME_COLORS.dark);
    expect(HTML).toContain(THEME_COLORS.light);
  });

  it("s'exécute avant le bundle, sinon il ne sert à rien", () => {
    expect(HTML.indexOf("data-theme")).toBeLessThan(HTML.indexOf("/src/main.tsx"));
  });

  it("déclare les deux balises theme-color à media, plus celle sans media", () => {
    expect(HTML).toContain('media="(prefers-color-scheme: dark)"');
    expect(HTML).toContain('media="(prefers-color-scheme: light)"');
    expect(/<meta name="theme-color" content=/.test(HTML)).toBe(true);
  });
});
```

- [ ] **Step 3: Lancer — doit passer si l'étape 1 est faite**

Run: `npx vitest run src/lib/theme-dom.test.ts`
Expected: PASS, 4 tests. Un échec indique une divergence entre `index.html` et `theme.ts` : corriger le HTML.

- [ ] **Step 4: Porter le thème dans le store**

Dans `src/store.tsx`, ajouter l'import :

```ts
import { appliquerTheme, resoudreTheme, REQUETE_SOMBRE, type Theme } from "./lib/theme";
```

Puis : ajouter `theme: Theme;` à l'interface d'état (à côté de `bigUI`, ligne ~105), l'initialiser depuis `prefs.theme` (à côté de `bigUI: prefs.bigUI`, ligne ~159), et l'inclure dans la persistance (ligne ~320) :

```ts
    writePrefs({
      dept: state.dept,
      deptChosen: state.deptChosen,
      bigUI: state.bigUI,
      theme: state.theme,
    });
  }, [state.dept, state.deptChosen, state.bigUI, state.theme]);
```

Ajouter, dans le même fichier, l'effet qui applique le thème et suit le système :

```ts
  // Le script inline d'index.html a déjà posé data-theme avant le premier
  // paint ; cet effet reprend la main pour les changements ultérieurs. En mode
  // auto, il écoute le réglage du téléphone — un utilisateur qui bascule son
  // système app ouverte doit voir l'app suivre. L'écouteur est retiré dès que
  // la préférence devient explicite : plus rien à suivre.
  useEffect(() => {
    const mq = window.matchMedia?.(REQUETE_SOMBRE);
    const appliquer = () =>
      appliquerTheme(resoudreTheme(state.theme, mq?.matches ?? false));
    appliquer();
    if (state.theme !== "auto" || !mq) return;
    mq.addEventListener("change", appliquer);
    return () => mq.removeEventListener("change", appliquer);
  }, [state.theme]);
```

- [ ] **Step 5: Vérifier dans le navigateur**

Run: `npm run dev`
Dans la console : `localStorage.setItem("carnet:prefs", JSON.stringify({dept:"41",theme:"dark"}))` puis rechargement.
Expected: l'app s'ouvre en sombre **sans flash blanc**. Recharger plusieurs fois pour en être sûr. Régler ensuite `theme:"auto"` et basculer le thème du système d'exploitation : l'app doit suivre sans rechargement.

- [ ] **Step 6: Suite complète**

Run: `npm test && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add index.html src/store.tsx src/main.tsx src/lib/theme-dom.test.ts
git commit -m "Thème : câblage, et un script inline qui tue le flash blanc

Le script d'index.html duplique la logique de theme.ts parce qu'il doit
précéder le bundle ; theme-dom.test.ts fait échouer la suite si les deux
divergent."
```

---

### Task 12: Le contrôle Auto · Clair · Sombre dans Outils

**Files:**
- Modify: `src/screens/Outils.tsx`
- Modify: `src/styles.css`
- Create: `src/screens/Outils.test.tsx`

**Interfaces:**
- Consumes: `state.theme` et `set` du store (Tâche 11) ; la classe `.pf-seg` existante.
- Produces: rien que d'autres tâches consomment.

- [ ] **Step 1: Écrire le test**

Créer `src/screens/Outils.test.tsx` :

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StoreProvider } from "../store";
import { Outils } from "./Outils";

function poser() {
  return render(
    <StoreProvider>
      <Outils />
    </StoreProvider>,
  );
}

describe("réglage d'apparence", () => {
  it("propose les trois choix, Auto actif par défaut", () => {
    poser();
    expect(screen.getByRole("button", { name: "Auto" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Clair" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Sombre" })).toHaveAttribute("aria-pressed", "false");
  });

  it("un choix explicite pose data-theme et survit au stockage", () => {
    poser();
    fireEvent.click(screen.getByRole("button", { name: "Sombre" }));
    expect(screen.getByRole("button", { name: "Sombre" })).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(JSON.parse(localStorage.getItem("carnet:prefs")!).theme).toBe("dark");
  });
});
```

- [ ] **Step 2: Lancer — doit échouer**

Run: `npx vitest run src/screens/Outils.test.tsx`
Expected: FAIL — aucun bouton nommé « Auto ».

- [ ] **Step 3: Ajouter le contrôle**

Dans `src/screens/Outils.tsx`, en tête du contenu de l'écran, avant la liste des tuiles. Réutiliser `.pf-seg` (le contrôle segmenté du Carnet) plutôt que d'en dessiner un second :

```tsx
      {/* Un thème est un réglage, pas une destination : il vit ici, au-dessus
          des tuiles, et non dans un écran de plus. Le contrôle segmenté est
          celui du Carnet (.pf-seg), pour ne pas inventer un second motif. */}
      <div className="reglage-bloc">
        <div className="reglage-l">Apparence</div>
        <div className="pf-seg">
          {([
            ["auto", "Auto"],
            ["light", "Clair"],
            ["dark", "Sombre"],
          ] as const).map(([valeur, libelle]) => (
            <button
              key={valeur}
              type="button"
              className={state.theme === valeur ? "on" : ""}
              aria-pressed={state.theme === valeur}
              onClick={() => set(() => ({ theme: valeur }))}
            >
              {libelle}
            </button>
          ))}
        </div>
      </div>
```

Récupérer `set` depuis `useStore()` (la ligne existante est `const { state, nav } = useStore();` — devient `const { state, nav, set } = useStore();`).

Ajouter dans `src/styles.css`, près du bloc `.pf-seg` :

```css
.reglage-bloc {
  margin: 4px 0 16px;
}
.reglage-l {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 6px;
}
```

- [ ] **Step 4: Lancer — doit passer**

Run: `npx vitest run src/screens/Outils.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Vérifier à l'œil**

Run: `npm run dev`
Aller dans Outils, cliquer les trois choix. Expected: bascule immédiate, choix conservé après rechargement, « Auto » qui suit le système.

- [ ] **Step 6: Suite complète**

Run: `npm test && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/screens/Outils.tsx src/screens/Outils.test.tsx src/styles.css
git commit -m "Apparence : Auto · Clair · Sombre en tête d'Outils"
```

---

### Task 13: La carte bascule sur Dark Matter

**Files:**
- Modify: `src/lib/basemaps.ts`
- Modify: `src/lib/basemaps.test.ts` (créer si absent)
- Modify: `src/components/CartePeche.tsx`

**Interfaces:**
- Consumes: `type ThemeEffectif` (Tâche 8) ; `Basemap`, `rasterStyle` de `basemaps.ts`.
- Produces: `styleUrl(b: Basemap, theme: ThemeEffectif): string | undefined`.

- [ ] **Step 1: Écrire le test**

Ajouter à `src/lib/basemaps.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { BASEMAPS, styleUrl } from "./basemaps";

describe("styleUrl", () => {
  const carto = BASEMAPS.find((b) => b.style)!;

  it("sert Voyager en clair et Dark Matter en sombre", () => {
    expect(styleUrl(carto, "light")).toContain("voyager-gl-style");
    expect(styleUrl(carto, "dark")).toContain("dark-matter-gl-style");
  });

  it("laisse les fonds raster IGN inchangés dans les deux thèmes", () => {
    // Une orthophoto n'a pas de thème. Lui en inventer un n'a pas de sens, et
    // il n'existe pas de version sombre du plan IGN.
    for (const b of BASEMAPS.filter((x) => x.tiles)) {
      expect(styleUrl(b, "dark")).toBeUndefined();
      expect(styleUrl(b, "light")).toBeUndefined();
    }
  });
});
```

- [ ] **Step 2: Lancer — doit échouer**

Run: `npx vitest run src/lib/basemaps.test.ts`
Expected: FAIL — `styleUrl` n'est pas exportée.

- [ ] **Step 3: Implémenter**

Dans `src/lib/basemaps.ts`, ajouter l'import `import type { ThemeEffectif } from "./theme";`, ajouter `styleDark?: string` au type `Basemap`, renseigner l'entrée Carto :

```ts
    style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
    // Même hôte que Voyager : la règle CSP de lib/csp.ts et la règle de cache
    // CacheFirst de vite.config.ts (« carto-basemap ») le couvrent déjà, sans
    // rien à ajouter. Comme le clair, il se cache au premier affichage EN
    // LIGNE — le fond vectoriel n'a jamais été préchargé.
    styleDark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
```

et la fonction :

```ts
/** Le style à charger pour ce fond dans ce thème. `undefined` pour les fonds
 *  raster (IGN) : ils n'ont pas de style JSON, et pas de version sombre. */
export function styleUrl(b: Basemap, theme: ThemeEffectif): string | undefined {
  if (!b.style) return undefined;
  return theme === "dark" && b.styleDark ? b.styleDark : b.style;
}
```

- [ ] **Step 4: Lancer — doit passer**

Run: `npx vitest run src/lib/basemaps.test.ts`
Expected: PASS.

- [ ] **Step 5: Brancher dans la carte**

Dans `src/components/CartePeche.tsx`, remplacer l'usage direct de `b.style` par `styleUrl(b, theme)`, `theme` venant du store via `resoudreTheme`. Ajouter l'effet qui recharge le style quand le thème change carte ouverte :

```tsx
  // Changer de thème carte ouverte doit changer le fond. setStyle conserve la
  // position et le zoom ; les couches ajoutées par l'app (parcours, réserves)
  // sont réinstallées par l'effet qui les pose déjà, au « styledata » suivant.
  useEffect(() => {
    const url = styleUrl(fond, themeEffectif);
    if (map.current && url) map.current.setStyle(url);
  }, [themeEffectif, fond]);
```

**Point de vigilance :** `setStyle` détruit les sources et couches ajoutées à la main. Vérifier que les couches de parcours et de réserves se réinstallent après bascule — si elles disparaissent, c'est que l'effet qui les pose n'écoute pas `styledata`. Le corriger ici plutôt que de renoncer au fond sombre.

- [ ] **Step 6: Vérifier à l'œil**

Run: `npm run dev`
Ouvrir la Carte, basculer le thème depuis Outils, revenir. Expected: fond sombre en thème sombre, couches de parcours toujours présentes, satellite et plan IGN inchangés.

- [ ] **Step 7: Suite complète**

Run: `npm test && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/basemaps.ts src/lib/basemaps.test.ts src/components/CartePeche.tsx
git commit -m "Carte : fond Dark Matter en thème sombre

Les rasters IGN restent clairs — une orthophoto n'a pas de thème, et il
n'existe pas de plan IGN sombre."
```

---

### Task 14: Documentation

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: rien.

- [ ] **Step 1: Documenter le thème dans le README**

Ajouter une section après « Écrans » :

```markdown
## Thème clair / sombre

L'app suit le thème du téléphone par défaut. Le réglage **Outils → Apparence**
(Auto · Clair · Sombre) permet de forcer l'un ou l'autre ; le choix est conservé
d'une session à l'autre.

Deux choses restent volontairement claires dans les deux thèmes : la **règle à
l'écran** (c'est un instrument de mesure — la silhouette du poisson posé dessus
doit rester lisible) et les **fonds satellite et plan IGN** de la carte (ce sont
des rasters photographiques, il n'en existe pas de version sombre). Le fond de
carte vectoriel, lui, bascule.

Pour les contributeurs : toutes les couleurs de l'app sont des jetons CSS
déclarés dans `:root` de `src/styles.css`, et le thème sombre les redéfinit dans
`:root[data-theme="dark"]` — **aucune règle n'est dupliquée**. Une couleur écrite
en dur ne peut pas suivre le thème, et trois tests l'interdisent :
`empreinte-couleurs.test.ts`, `contraste-palette.test.ts` (les 63 paires sont
mesurées dans les deux thèmes, et tout jeton clair doit avoir son équivalent
sombre) et `contraste-inline.test.ts`.
```

- [ ] **Step 2: Vérifier que le README reste juste**

Run: `npx vitest run src/data/readme.test.ts`
Expected: PASS — ce test vérifie déjà des affirmations du README.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "README : le thème, et les deux endroits qui restent clairs exprès"
```

---

### Task 15: Vérification de bout en bout

Rien de neuf ici : c'est le passage qui empêche de déclarer terminé un chantier qui ne l'est pas.

**Files:** aucun (sauf correctifs).

- [ ] **Step 1: Suite complète, lint, build**

Run: `npm test && npm run lint && npm run build`
Expected: PASS partout. Relever le nombre de tests.

- [ ] **Step 2: Vérifier qu'il ne reste pas de couleur en dur**

Run: `node -e '
const fs=require("fs");
const css=fs.readFileSync("src/styles.css","utf8").replace(/\/\*[\s\S]*?\*\//g,"");
const fin=css.indexOf("}",css.lastIndexOf("data-theme"))+1;
const reste=css.slice(fin).match(/#[0-9a-fA-F]{3,8}|rgba?\(/g)||[];
console.log("hors blocs de thème :",reste.length,reste.slice(0,20).join(" "));
'`
Expected: un petit nombre, chacun justifiable (dégradés décoratifs). Toute couleur porteuse de sens qui subsiste est un oubli à corriger.

- [ ] **Step 3: Parcours visuel des deux thèmes**

Parcourir dans les **deux** thèmes : Accueil, Espèces, une Fiche espèce, Carte (les trois fonds), Ma prise, Carnet (les 4 segments), Écrevisses, Matériel, Nœuds, une Recette + mode cuisine, Règle, Réglementation, Outils, Sources.

Expected: aucune zone restée claire au milieu du sombre, aucun texte illisible, aucune bordure de champ invisible. La Règle reste claire — c'est voulu.

- [ ] **Step 4: Vérifier l'absence de flash en PWA installée**

Run: `npm run build && npm run preview`
Installer l'app depuis le navigateur, la lancer depuis l'écran d'accueil en thème sombre, plusieurs fois.
Expected: aucun flash blanc au lancement. C'est le seul défaut que les tests ne peuvent pas attraper.

- [ ] **Step 5: Vérifier le hors-ligne de la carte**

Ouvrir la carte en ligne dans les deux thèmes, puis couper le réseau et rouvrir.
Expected: les deux fonds vectoriels sont servis depuis le cache `carto-basemap`. Un fond jamais affiché en ligne ne sera pas disponible — c'est le comportement d'avant le chantier, appliqué à deux styles, et c'est écrit dans la spec.

- [ ] **Step 6: Commit final s'il y a eu des correctifs**

```bash
git add -A
git commit -m "Thème sombre : correctifs de la passe de vérification"
```
