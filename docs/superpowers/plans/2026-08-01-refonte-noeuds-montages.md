# Refonte de la section nœuds & montages — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à chacune des 15 fiches nœuds & montages une image par geste (ou un schéma d'assemblage légendé), un texte redécoupé geste par geste, et une porte d'entrée qui se cherche par besoin plutôt que par nom.

**Architecture:** Le texte reste dans `src/data/knots.ts`, écrit à la main ; les images vivent à part dans `src/data/knot-steps.gen.ts`, régénéré par un script de découpe. Les sept montages que Wikimedia Commons ne couvre pas reçoivent un schéma d'assemblage qui est un **composant React SVG inline** (et non un fichier sous `public/`), seule forme qui hérite des jetons de couleur du thème. L'écran unique `Noeuds.tsx` se scinde en liste et fiche.

**Répartition, vérifiée planche par planche :** 5 fiches en découpe Commons (sang, chaise, albright, boucle, texan) · 7 en schéma d'assemblage (drop shot, carolina, pater-noster, wacky, anglaise, feeder, cheveu) · 3 en photographie maison (clinch, raccord, palomar).

**Tech Stack:** React 18 + TypeScript, Vite, Vitest + Testing Library, `sharp` (scripts Node), CSS à jetons dans `src/styles.css`.

## Global Constraints

- **Langue :** tout le texte visible, les commentaires de code et les messages de commit sont en français. Les messages de commit suivent le style du dépôt : une ligne de sujet qui énonce le fait, puis un corps qui explique le pourquoi.
- **Licences :** seules les licences libres sont acceptées (CC0 / Domaine public / CC BY / CC BY-SA). Toute image issue de Commons porte `author`, `license` et un `sourceUrl` commençant par `https://commons.wikimedia.org/`.
- **Attribution après découpe :** chaque vignette découpée hérite de l'auteur, de la licence et de l'URL source de sa planche mère.
- **Couleurs :** aucune couleur en dur dans le TSX ni dans les SVG inline — uniquement des jetons `var(--…)` déjà définis dans `src/styles.css`. Le chantier du 31 juillet 2026 les a tous extraits.
- **Cibles tactiles :** tout élément cliquable fait au moins 44 px de haut (WCAG 2.5.5). Les classes `.chip` et `.tile` existantes le garantissent déjà.
- **Hors-ligne :** aucune ressource distante à l'exécution. Toute image est un fichier local sous `public/assets/`.
- **Dégradation :** une fiche sans séquence d'images affiche l'illustration unique existante — **jamais un cadre vide**. Exception : le palomar, dont l'illustration actuelle est celle qu'on écarte (un porte-clés en paracorde), s'affiche sans cadre en attendant ses photos.
- **La planche fait loi :** pour les 5 fiches en découpe Commons, le nombre de cases de la planche fixe le nombre d'étapes écrites, jamais l'inverse.
- **Patron de montage des tests d'écran :** `StoreProvider` n'accepte **que** `children` — il n'a pas de prop `initial`. L'état se pose après montage via un composant `Amorce` qui appelle `set(patch)` dans un `useEffect`, exactement comme `src/screens/a11y-ecrans.test.tsx:84`.
- **Commandes :** `npm test` (vitest run), `npm run lint` (eslint), `npm run build` (tsc + vite).
- **Branche :** `refonte-noeuds-montages`, déjà créée, spec commitée en `2275fb2`.

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/types.ts` | `Knot` étendu, `BesoinId` |
| `src/data/besoins.ts` | **créé** — les 5 besoins et leurs libellés |
| `src/data/knots.ts` | les 15 fiches : texte et métadonnées, jamais de chemin de fichier |
| `src/data/knot-steps.gen.ts` | **créé, généré** — `Record<string, MediaEntry[]>`, images par étape |
| `src/data/knots.test.ts` | table `ARBITRAGE` étendue + invariants |
| `src/components/SchemaMontage.tsx` | **créé** — les 7 schémas d'assemblage, SVG inline |
| `src/screens/Noeuds.tsx` | la liste seule : filtres par besoin + vignettes |
| `src/screens/NoeudFiche.tsx` | **créé** — la fiche : séquence ou schéma, pastilles, erreur, renvois |
| `src/screens/noeuds.css` | styles des deux écrans |
| `scripts/crop-knot-steps.mjs` | **créé** — découpe des planches Commons |
| `scripts/knot-steps.manifest.json` | **créé** — description déclarative des découpes |
| `scripts/import-knot-photos.mjs` | **créé** — import des photos maison |
| `docs/protocole-photos-noeuds.md` | **créé** — protocole de prise de vue |

---

## Task 1 : Le catalogue enrichi

Le socle : tout le reste en dépend, et il se teste sans une seule image.

**Files:**
- Modify: `src/types.ts:128-135`
- Create: `src/data/besoins.ts`
- Modify: `src/data/knots.ts` (réécriture complète)
- Modify: `src/data/knots.test.ts`

**Interfaces:**
- Consomme : rien.
- Produit : `BesoinId`, `BESOINS`, l'interface `Knot` étendue, `KNOTS`. Les tâches 3 à 9 lisent ces symboles.

- [ ] **Step 1 : Écrire les tests qui échouent**

Ajouter en tête de `src/data/knots.test.ts`, après les imports existants (ajouter `import { BESOINS } from "./besoins";`) :

```ts
describe("nœuds & montages — le catalogue enrichi", () => {
  // La borne basse est celle de la boucle de chirurgien : sa planche de Commons
  // ne montre que trois gestes, et lui en inventer un quatrième pour faire
  // nombre laisserait une étape sans image.
  it("chaque fiche compte 3 à 6 gestes", () => {
    const fautes = KNOTS.filter((k) => k.steps.length < 3 || k.steps.length > 6)
      .map((k) => `${k.id} — ${k.steps.length} étapes`);
    expect(fautes).toEqual([]);
  });

  it("chaque fiche porte au moins un besoin, et tous sont connus", () => {
    const connus = new Set(BESOINS.map((b) => b.id));
    const fautes: string[] = [];
    for (const k of KNOTS) {
      if (!k.besoins.length) fautes.push(`${k.id} — aucun besoin`);
      for (const b of k.besoins) if (!connus.has(b)) fautes.push(`${k.id} — besoin inconnu : ${b}`);
    }
    expect(fautes).toEqual([]);
  });

  it("chaque besoin mène à au moins une fiche", () => {
    const orphelins = BESOINS.filter((b) => !KNOTS.some((k) => k.besoins.includes(b.id)));
    expect(orphelins.map((b) => b.id)).toEqual([]);
  });

  it("chaque fiche dit l'erreur qui fait casser", () => {
    const fautes = KNOTS.filter((k) => !k.erreur?.trim()).map((k) => k.id);
    expect(fautes).toEqual([]);
  });

  it("chaque renvoi vise une fiche qui existe, et jamais elle-même", () => {
    const ids = new Set(KNOTS.map((k) => k.id));
    const fautes: string[] = [];
    for (const k of KNOTS)
      for (const v of k.voirAussi ?? []) {
        if (!ids.has(v)) fautes.push(`${k.id} → ${v} (inconnu)`);
        if (v === k.id) fautes.push(`${k.id} → lui-même`);
      }
    expect(fautes).toEqual([]);
  });

  it("chaque fiche indique au moins un fil et une durée", () => {
    const fautes = KNOTS.filter((k) => !k.fils.length || !k.duree?.trim()).map((k) => k.id);
    expect(fautes).toEqual([]);
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test -- src/data/knots.test.ts`
Expected: FAIL — erreurs TypeScript sur `k.besoins`, `k.erreur`, `k.fils`, `k.voirAussi` (propriétés absentes de `Knot`) et module `./besoins` introuvable.

- [ ] **Step 3 : Étendre le type `Knot`**

Dans `src/types.ts`, remplacer l'interface `Knot` (lignes 128-135) par :

```ts
/** Le besoin auquel une fiche répond — l'entrée par le geste plutôt que par le nom. */
export type BesoinId = "attacher" | "relier" | "boucle-fixe" | "au-fond" | "entre-deux-eaux";

export interface Knot {
  id: string;
  cat: "noeud" | "montage";
  name: string;
  use: string;
  when: string;
  /**
   * 3 à 6 gestes, un par image de la séquence. L'ordre fait foi.
   * Pour les fiches illustrées depuis Commons, c'est le nombre de cases de la
   * planche qui fixe ce découpage — jamais l'inverse.
   */
  steps: string[];
  besoins: BesoinId[];
  difficulte: "facile" | "moyen" | "difficile";
  /** Ordre de grandeur lisible : "30 s", "1 min 30". */
  duree: string;
  fils: ("nylon" | "fluoro" | "tresse")[];
  /**
   * Part de la résistance de ligne conservée. Optionnel à dessein : les chiffres
   * publiés varient beaucoup selon le protocole de test, donc le champ n'est
   * rempli que là où une source sérieuse le donne — vide ailleurs, jamais meublé.
   */
  resistance?: string;
  /** L'erreur concrète qui fait casser ou rate le montage. Obligatoire. */
  erreur: string;
  /** Ids d'autres fiches, pour les renvois cliquables. */
  voirAussi?: string[];
}
```

- [ ] **Step 4 : Créer les besoins**

Créer `src/data/besoins.ts` :

```ts
import type { BesoinId } from "../types";

/**
 * Au bord de l'eau on ne cherche pas « l'albright », on cherche « comment relier
 * ma tresse à mon fluoro ». Ces cinq entrées couvrent les 15 fiches sans reste ;
 * l'ordre est celui de la rangée de filtres, du geste le plus courant au plus rare.
 */
export const BESOINS: { id: BesoinId; label: string }[] = [
  { id: "attacher", label: "Attacher un hameçon" },
  { id: "relier", label: "Relier deux fils" },
  { id: "boucle-fixe", label: "Faire une boucle" },
  { id: "au-fond", label: "Pêcher au fond" },
  { id: "entre-deux-eaux", label: "Entre deux eaux" },
];
```

- [ ] **Step 5 : Réécrire le catalogue**

Remplacer intégralement `src/data/knots.ts`. Les `steps` sont redécoupés en gestes atomiques : un geste = une image. Les `when` existants sont conservés mot pour mot.

```ts
import type { Knot } from "../types";

/**
 * Les 15 fiches. Un `step` est UN geste, parce qu'il portera UNE image : le
 * découpage du texte et celui de la planche doivent coïncider, et c'est le test
 * « autant d'images que d'étapes » qui les empêche de dériver l'un de l'autre.
 *
 * Aucun chemin de fichier ici : les images vivent dans `knot-steps.gen.ts`, qui
 * se régénère sans jamais toucher à cette prose.
 */
export const KNOTS: Knot[] = [
  {
    id: "clinch",
    cat: "noeud",
    name: "Clinch amélioré",
    use: "Attacher un hameçon ou un leurre",
    when: "Le nœud de base pour attacher hameçons, agrafes et leurres sur nylon ou fluorocarbone jusqu'à 40/100.",
    besoins: ["attacher"],
    difficulte: "facile",
    duree: "45 s",
    fils: ["nylon", "fluoro"],
    resistance: "80 à 90 % de la résistance de ligne",
    erreur:
      "Serrer à sec. Le nylon chauffe en glissant sur lui-même et casse à la moitié de sa résistance — humecte toujours avant de serrer.",
    voirAussi: ["palomar"],
    steps: [
      "Passer une quinzaine de centimètres de fil dans l'œillet de l'hameçon.",
      "Enrouler le bout 5 à 7 fois autour du brin principal, sans serrer, en gardant ouverte la première boucle contre l'œillet.",
      "Repasser le bout dans cette première boucle, contre l'œillet.",
      "Repasser le bout dans la grande boucle qui vient de se former.",
      "Humecter, serrer en tirant sur le brin principal, puis raser l'excédent au ras du nœud.",
    ],
  },
  {
    id: "palomar",
    cat: "noeud",
    name: "Palomar",
    use: "Hameçon / agrafe — très solide, tresse comprise",
    when: "Excellente résistance, idéal sur tresse (drop shot, texan). Nécessite de passer le leurre dans la boucle.",
    besoins: ["attacher"],
    difficulte: "facile",
    duree: "30 s",
    fils: ["nylon", "fluoro", "tresse"],
    resistance: "~95 % — l'un des plus solides, tresse comprise",
    erreur:
      "Oublier de passer l'hameçon entier dans la boucle avant de serrer. Le nœud se ferme alors sur lui-même et tout est à recommencer.",
    voirAussi: ["clinch", "dropshot"],
    steps: [
      "Doubler le fil sur une vingtaine de centimètres.",
      "Passer la boucle ainsi formée dans l'œillet de l'hameçon.",
      "Faire un nœud simple avec la boucle et le fil doublé, sans serrer.",
      "Passer l'hameçon entier à travers la boucle, puis ramener la boucle au-dessus de l'œillet.",
      "Humecter, serrer les deux brins ensemble, raser l'excédent.",
    ],
  },
  {
    id: "raccord",
    cat: "noeud",
    name: "Raccord ligne / bas de ligne",
    use: "Relier tresse et fluorocarbone",
    when: "Pour relier le corps de ligne (tresse) au bas de ligne (fluoro) sans agrafe — passe dans les anneaux. Diamètres proches : ce raccord suffit. Diamètres très différents (tresse épaisse vers fluoro fin) : préférez l'Albright, dont les tours supplémentaires empêchent le fil fin de glisser.",
    besoins: ["relier"],
    difficulte: "moyen",
    duree: "1 min",
    fils: ["fluoro", "tresse"],
    erreur:
      "L'employer sur des diamètres trop différents. Une tresse épaisse sur un fluoro fin glisse et le raccord file sous la traction — c'est le domaine de l'Albright.",
    voirAussi: ["albright", "sang"],
    steps: [
      "Former une boucle avec le fluorocarbone, sur une quinzaine de centimètres.",
      "Poser la tresse le long de la boucle, son bout dirigé vers l'ouverture.",
      "Enrouler la tresse 8 à 10 fois autour des deux brins de la boucle.",
      "Repasser le bout de tresse dans la boucle, du côté par lequel elle est entrée.",
      "Humecter généreusement, serrer les deux côtés en même temps, raser les deux excédents.",
    ],
  },
  {
    id: "boucle",
    cat: "noeud",
    name: "Boucle simple (chirurgien)",
    use: "Créer une boucle en bout de ligne",
    when: "Boucle rapide pour montages boucle-dans-boucle (pêche au coup, bas de ligne prêts).",
    besoins: ["boucle-fixe"],
    difficulte: "facile",
    duree: "20 s",
    fils: ["nylon", "fluoro"],
    erreur:
      "Ne faire qu'un seul passage. C'est le second passage de la boucle dans le nœud qui en fait un nœud de chirurgien ; avec un seul, c'est un nœud simple qui se déforme sous tension.",
    voirAussi: ["paternoster", "chaise"],
    // Trois gestes : c'est ce que montre la planche de Commons, qui fait loi.
    steps: [
      "Doubler le fil sur une quinzaine de centimètres, de façon à former une boucle.",
      "Faire un nœud simple avec le fil doublé, puis repasser la boucle une seconde fois dans ce même nœud, sans serrer.",
      "Humecter et serrer en tirant sur la boucle et sur les deux brins ; la boucle doit rester bien ronde.",
    ],
  },
  {
    id: "sang",
    cat: "noeud",
    name: "Nœud de sang",
    use: "Relier deux fils de diamètre proche",
    when: "Le nœud de référence pour raccorder deux nylons ou deux fluorocarbones de diamètre similaire (bas de ligne, réparation de casse).",
    besoins: ["relier"],
    difficulte: "moyen",
    duree: "1 min 30",
    fils: ["nylon", "fluoro"],
    resistance: "~85 % entre deux fils de diamètre proche",
    erreur:
      "Enrouler un côté plus que l'autre. Le nombre de tours doit être le même des deux côtés, sinon le nœud se referme de travers et le brin le moins enroulé lâche le premier.",
    voirAussi: ["albright", "raccord"],
    steps: [
      "Superposer les deux brins sur une quinzaine de centimètres, dirigés en sens opposés.",
      "Enrouler le premier brin 5 à 6 fois autour de l'autre en partant du centre, puis ramener son bout dans l'ouverture laissée au milieu.",
      "Enrouler le second brin autant de fois dans l'autre sens, et repasser son bout au centre en sens inverse du premier.",
      "Humecter, serrer les deux côtés progressivement et en même temps, raser les deux excédents.",
    ],
  },
  {
    id: "albright",
    cat: "noeud",
    name: "Albright",
    use: "Relier deux fils de diamètre très différent",
    when: "Backing/tresse épaisse vers bas de ligne fin, ou corps de ligne vers un fil beaucoup plus fin — là où le nœud de sang glisse.",
    besoins: ["relier"],
    difficulte: "difficile",
    duree: "2 min",
    fils: ["nylon", "fluoro", "tresse"],
    erreur:
      "Trop peu de tours. Sous 10 tours, le fil fin glisse le long du fil épais et le raccord file — c'est précisément ce que l'Albright est censé empêcher.",
    voirAussi: ["sang", "raccord"],
    // Quatre gestes : c'est ce que montre la planche de Commons, qui fait loi.
    steps: [
      "Former une boucle avec le fil le plus épais, la pincer entre deux doigts, et y passer le fil fin en laissant dépasser une vingtaine de centimètres.",
      "Enrouler le fil fin 10 à 12 fois autour des deux brins de la boucle, en serrant les tours les uns contre les autres sans les laisser se chevaucher.",
      "Repasser le bout du fil fin dans la boucle, par le côté où il est entré.",
      "Humecter, serrer en tenant fermement les deux brins épais, puis raser les deux excédents.",
    ],
  },
  {
    id: "chaise",
    cat: "noeud",
    name: "Nœud de chaise",
    use: "Boucle fixe et solide en bout de ligne",
    when: "Amarrer une embarcation, fixer une ligne à un point fixe (piquet, anneau) — une boucle qui ne glisse jamais et se défait pourtant facilement après tension.",
    besoins: ["boucle-fixe"],
    difficulte: "moyen",
    duree: "30 s",
    fils: ["nylon"],
    resistance: "~60 % — c'est un nœud d'amarrage, pas un nœud de ligne",
    erreur:
      "L'employer en bout de ligne pour pêcher. Il perd près de la moitié de la résistance du fil : à réserver au bateau et aux points fixes.",
    voirAussi: ["boucle"],
    steps: [
      "Former une petite boucle sur le brin dormant, à une trentaine de centimètres du bout.",
      "Faire passer le bout du fil dans cette boucle, par en dessous.",
      "Passer le bout derrière le brin dormant, puis le repasser dans la petite boucle en sens inverse.",
      "Humecter et serrer en tenant le brin dormant ; la grande boucle ne doit plus coulisser.",
    ],
  },
  {
    id: "dropshot",
    cat: "montage",
    name: "Drop shot",
    use: "Sandre et perche en verticale ou au posé",
    when: "Présenter un leurre souple au-dessus du fond, plomb en bas : idéal cassures et postes profonds.",
    besoins: ["entre-deux-eaux"],
    difficulte: "moyen",
    duree: "2 min",
    fils: ["fluoro", "tresse"],
    erreur:
      "Nouer l'hameçon sans repasser le brin dans l'œillet par le haut. Sans ça l'hameçon bascule vers le bas et le leurre nage à l'envers.",
    voirAussi: ["palomar", "wacky"],
    steps: [
      "Nouer l'hameçon au palomar, en laissant 30 à 80 cm de fil libre sous le nœud.",
      "Repasser ce brin libre dans l'œillet, de haut en bas, pour que la hampe pointe vers le haut.",
      "Fixer le plomb drop shot à l'extrémité du brin libre, par sa pince.",
      "Escher le leurre souple par la tête, piqué sur un centimètre seulement.",
      "Ajuster la longueur sous le nœud selon la hauteur à laquelle tiennent les poissons.",
    ],
  },
  {
    id: "texan",
    cat: "montage",
    name: "Montage texan",
    use: "Pêcher dans les obstacles sans accrocher",
    when: "Leurre souple anti-herbe pour brochet et bass dans le bois noyé et les herbiers.",
    besoins: ["au-fond"],
    difficulte: "moyen",
    duree: "1 min 30",
    fils: ["fluoro", "tresse"],
    erreur:
      "Rentrer la pointe trop profondément dans le corps du leurre. Elle ne ressort plus au ferrage et le poisson se décroche.",
    voirAussi: ["carolina", "palomar"],
    steps: [
      "Enfiler un plomb balle sur le fil, sa pointe dirigée vers la canne.",
      "Nouer l'hameçon texan au clinch ou au palomar ; la base plate du plomb vient se caler contre la tête du leurre.",
      "Piquer l'hameçon par la tête du leurre souple, le faire ressortir sous un centimètre, puis faire pivoter la hampe.",
      "Repiquer la pointe dans le corps du leurre, juste sous la peau, pour la rendre anti-accroc.",
    ],
  },
  {
    id: "paternoster",
    cat: "montage",
    name: "Pater-noster",
    use: "Pêche au vif ou au posé",
    when: "Montage classique pour le vif (sandre, brochet) : le plomb au fond, l'esche à distance sur une potence.",
    besoins: ["au-fond"],
    difficulte: "moyen",
    duree: "3 min",
    fils: ["nylon", "tresse"],
    erreur:
      "Faire la potence trop courte. Sous 20 cm, le bas de ligne s'emmêle dans le corps de ligne à chaque lancer.",
    voirAussi: ["boucle", "feeder"],
    steps: [
      "Former une boucle de chirurgien sur le corps de ligne, à 40–60 cm du bas : c'est la potence.",
      "Fixer le plomb à l'extrémité du corps de ligne, sous la potence.",
      "Préparer un bas de ligne de 30 à 50 cm terminé par une boucle et l'hameçon.",
      "Raccorder le bas de ligne à la potence boucle-dans-boucle, puis escher.",
    ],
  },
  {
    id: "carolina",
    cat: "montage",
    name: "Montage carolina",
    use: "Black-bass et perche sur le fond, prospection large",
    when: "Plomb qui reste au contact du fond pendant que le leurre, plus loin sur le bas de ligne, garde une nage libre — idéal fonds durs et pentes.",
    besoins: ["au-fond"],
    difficulte: "moyen",
    duree: "3 min",
    fils: ["fluoro", "tresse"],
    erreur:
      "Oublier la perle entre le plomb et l'émerillon. Le plomb frappe alors le nœud à chaque lancer et finit par le fatiguer jusqu'à la casse.",
    voirAussi: ["texan"],
    steps: [
      "Enfiler un plomb olive coulissant sur le corps de ligne.",
      "Enfiler une perle anti-choc derrière le plomb.",
      "Nouer un émerillon en bout du corps de ligne : il bloque le plomb et la perle.",
      "Nouer 40 à 70 cm de fluorocarbone à l'autre œillet de l'émerillon.",
      "Terminer par un hameçon texan et monter le leurre souple en anti-accroc.",
    ],
  },
  {
    id: "wacky",
    cat: "montage",
    name: "Montage wacky",
    use: "Black-bass à faible profondeur, coulée lente",
    when: "Le ver souple plie en son milieu et frétille de partout à la chute — très efficace en tirs précis dans les postes, herbiers et bordures.",
    besoins: ["entre-deux-eaux"],
    difficulte: "facile",
    duree: "45 s",
    fils: ["fluoro", "tresse"],
    erreur:
      "Piquer le ver ailleurs qu'en son milieu exact. Décentré, il ne plie plus en deux à la descente et perd tout son frétillement.",
    voirAussi: ["dropshot"],
    steps: [
      "Prendre un ver souple droit (stick bait), sans tête plombée.",
      "Repérer le milieu exact du ver.",
      "Piquer l'hameçon perpendiculairement au corps, de part en part, à cet endroit.",
      "Laisser les deux extrémités entièrement libres et lancer sans plomb ; le ver plie et frétille à la coulée.",
    ],
  },
  {
    id: "anglaise",
    cat: "montage",
    name: "Montage anglaise",
    use: "Pêche au coup classique, gardon, brème, tanche",
    when: "Flotteur waggler fixé par le bas seulement : lancer précis et discret, plombée dégressive pour une descente naturelle de l'esche.",
    besoins: ["entre-deux-eaux"],
    difficulte: "difficile",
    duree: "5 min",
    fils: ["nylon"],
    erreur:
      "Fixer le waggler par les deux bouts. Bloqué en haut aussi, il ne se met plus dans l'axe au lancer et la ligne vrille.",
    voirAussi: ["feeder"],
    steps: [
      "Enfiler deux stop-flotteurs sur le corps de ligne, puis l'œillet du waggler entre les deux.",
      "Bloquer le waggler par le bas uniquement, en resserrant les stop-flotteurs contre son œillet.",
      "Placer le gros plomb (la masselotte) juste sous le flotteur, pour l'équilibrer.",
      "Répartir les plombs suivants en dégressif vers l'hameçon, du plus gros au plus fin.",
      "Terminer par un ou deux plombs fins à une vingtaine de centimètres de l'hameçon.",
    ],
  },
  {
    id: "feeder",
    cat: "montage",
    name: "Montage feeder",
    use: "Brème, carpe, gardon en rivière ou plan d'eau",
    when: "Le panier (ou la cage) amorce en continu autour de l'hameçon posé au fond — efficace sur poste précis, surtout en eau courante.",
    besoins: ["au-fond"],
    difficulte: "moyen",
    duree: "3 min",
    fils: ["nylon", "tresse"],
    erreur:
      "Un bas de ligne trop long en eau courante. Au-delà de 50 cm, l'amorce est emportée bien avant que l'hameçon soit à côté.",
    voirAussi: ["paternoster", "anglaise"],
    steps: [
      "Enfiler le panier feeder coulissant sur le corps de ligne.",
      "Enfiler une butée en caoutchouc derrière le panier, pour amortir les chocs.",
      "Nouer un émerillon à agrafe en bout du corps de ligne.",
      "Monter un bas de ligne de 20 à 50 cm terminé par l'hameçon, agrafé à l'émerillon.",
      "Garnir le panier d'amorce et poser le montage sur le poste, canne en attente.",
    ],
  },
  {
    id: "cheveu",
    cat: "montage",
    name: "Montage cheveu",
    use: "Carpe, présentation de bouillette",
    when: "L'appât pend librement sous l'hameçon plutôt que d'être piqué dessus : la carpe l'aspire avec l'hameçon, qui se plante seul à l'éjection — la base de la pêche moderne de la carpe.",
    besoins: ["au-fond"],
    difficulte: "difficile",
    duree: "4 min",
    fils: ["tresse"],
    erreur:
      "Un cheveu trop long. La bouillette s'éloigne de la pointe et la carpe l'aspire sans emporter l'hameçon.",
    voirAussi: ["paternoster"],
    steps: [
      "Former une petite boucle à l'extrémité du bas de ligne : c'est le cheveu.",
      "Passer le brin libre dans l'œillet de l'hameçon, du côté de la pointe.",
      "Enrouler le brin 7 à 10 fois autour de la hampe, en descendant vers la pointe.",
      "Repasser le brin dans l'œillet, du même côté, puis serrer : c'est le nœud sans nœud.",
      "Enfiler la bouillette sur le cheveu à l'aiguille et la bloquer avec un stop-appât, juste sous la pointe.",
    ],
  },
];
```

- [ ] **Step 6 : Lancer les tests pour vérifier qu'ils passent**

Run: `npm test -- src/data/knots.test.ts`
Expected: PASS. Le test préexistant « chaque fiche a au moins 2 étapes » passe aussi (4 ≥ 2).

- [ ] **Step 7 : Vérifier que rien d'autre n'est cassé**

Run: `npm test && npm run lint && npm run build`
Expected: tout passe. `Noeuds.tsx` compile sans changement : il ne lit que `name`, `use`, `when`, `steps`, `cat`.

- [ ] **Step 8 : Commit**

```bash
git add src/types.ts src/data/besoins.ts src/data/knots.ts src/data/knots.test.ts
git commit -m "Nœuds : un geste par étape, et ce qu'il faut pour choisir"
```

Corps du message :
```
Les trois étapes par fiche étaient écrites avant qu'il y ait des images.
Elles passent à 4-6 gestes atomiques, parce qu'un geste portera une image
et que les deux découpages doivent coïncider.

S'y ajoutent ce qui manquait pour choisir entre deux nœuds qui font le même
travail : le fil, la durée, la difficulté, la résistance quand une source
sérieuse la donne, et surtout l'erreur qui fait casser.
```

---

## Task 2 : La fiche, avec ses pastilles et son erreur

L'écran se scinde. La fiche fonctionne d'emblée sur les illustrations actuelles.

**Files:**
- Create: `src/screens/NoeudFiche.tsx`
- Modify: `src/screens/Noeuds.tsx` (retirer `KnotDetail`)
- Modify: `src/App.tsx:18,152`
- Modify: `src/screens/a11y-ecrans.test.tsx:22` (import)
- Modify: `src/screens/noeuds.css`
- Create: `src/screens/noeud-fiche.test.tsx`

**Interfaces:**
- Consomme : `KNOTS`, `Knot`, `BESOINS` (Task 1) ; `ALL_KNOT_MEDIA` (`src/components/media-helpers.ts`) ; `useStore()` qui expose `{ state, nav, back }` avec `state.knotId: string | null` et `nav("knot", { knotId })`.
- Produit : `export function NoeudFiche()`. Remplace `KnotDetail`, qui disparaît.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `src/screens/noeud-fiche.test.tsx` :

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import { StoreProvider } from "../store";
import { useStore } from "../store-hooks";
import { NoeudFiche } from "./NoeudFiche";
import { KNOTS } from "../data/knots";

/**
 * `StoreProvider` ne prend que `children` : il n'a pas de prop d'état initial.
 * L'état se pose après montage, comme dans a11y-ecrans.test.tsx.
 */
function Amorce({ knotId, children }: { knotId: string; children: React.ReactElement }) {
  const { set } = useStore();
  useEffect(() => {
    set({ knotId });
    // `knotId` est une constante par cas de test.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return children;
}

const monte = (knotId: string) =>
  render(
    <StoreProvider>
      <Amorce knotId={knotId}>
        <NoeudFiche />
      </Amorce>
    </StoreProvider>,
  );

describe("fiche nœud", () => {
  it("affiche chaque geste, numéroté, dans l'ordre du catalogue", () => {
    const albright = KNOTS.find((k) => k.id === "albright")!;
    monte("albright");
    for (const s of albright.steps) expect(screen.getByText(s)).toBeInTheDocument();
    expect(screen.getAllByTestId("etape")).toHaveLength(albright.steps.length);
  });

  it("montre l'erreur qui fait casser", () => {
    const albright = KNOTS.find((k) => k.id === "albright")!;
    monte("albright");
    expect(screen.getByText("L'erreur qui fait casser")).toBeInTheDocument();
    expect(screen.getByText(albright.erreur)).toBeInTheDocument();
  });

  it("montre les pastilles de difficulté, durée et fil", () => {
    monte("albright");
    expect(screen.getByText("Difficile")).toBeInTheDocument();
    expect(screen.getByText("2 min")).toBeInTheDocument();
    expect(screen.getByText("Nylon · Fluoro · Tresse")).toBeInTheDocument();
  });

  it("n'affiche pas de pastille de résistance quand la donnée manque", () => {
    monte("albright"); // albright n'a pas de `resistance`
    expect(screen.queryByTestId("pastille-resistance")).toBeNull();
  });

  it("rend les renvois cliquables vers les fiches citées", () => {
    monte("dropshot");
    expect(screen.getByRole("button", { name: /Palomar/ })).toBeInTheDocument();
  });

  it("dit ce qui manque quand l'id ne vise aucune fiche", () => {
    monte("inexistant");
    expect(screen.getByText(/introuvable/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npm test -- src/screens/noeud-fiche.test.tsx`
Expected: FAIL — `Cannot find module './NoeudFiche'`.

- [ ] **Step 3 : Créer la fiche**

Créer `src/screens/NoeudFiche.tsx` :

```tsx
import { useStore } from "../store-hooks";
import { KNOTS } from "../data/knots";
import type { Knot } from "../types";
import { ALL_KNOT_MEDIA } from "../components/media-helpers";
import { DetailIntrouvable, LIEN_AUTRE_VERSION } from "../components/DetailIntrouvable";
import "./noeuds.css";

const DIFFICULTE: Record<Knot["difficulte"], string> = {
  facile: "Facile",
  moyen: "Moyen",
  difficile: "Difficile",
};

const FIL: Record<Knot["fils"][number], string> = {
  nylon: "Nylon",
  fluoro: "Fluoro",
  tresse: "Tresse",
};

export function NoeudFiche() {
  const { state, back, nav } = useStore();
  const knot = KNOTS.find((k) => k.id === state.knotId);
  if (!knot)
    return (
      <DetailIntrouvable
        titre="Nœud introuvable"
        message={"Ce nœud est introuvable." + LIEN_AUTRE_VERSION}
      />
    );

  // Une illustration, ou rien. Une fiche que ni Commons ni un schéma maison ne
  // couvre n'affiche aucun cadre : un cadre vide se lirait comme une image
  // cassée, et son texte se suffit.
  const media = ALL_KNOT_MEDIA[knot.id];
  const liees = (knot.voirAussi ?? [])
    .map((id) => KNOTS.find((k) => k.id === id))
    .filter((k): k is Knot => !!k);

  return (
    <main className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div>
          <h1 className="topbar-title">{knot.name}</h1>
          <div className="h-sub">{knot.use}</div>
        </div>
      </div>

      <div className="noeud-corps">
        <div className="noeud-pastilles">
          <span className={"pastille pastille-" + knot.difficulte}>
            {DIFFICULTE[knot.difficulte]}
          </span>
          <span className="pastille">{knot.duree}</span>
          <span className="pastille">{knot.fils.map((f) => FIL[f]).join(" · ")}</span>
          {knot.resistance && (
            <span className="pastille" data-testid="pastille-resistance">
              {knot.resistance}
            </span>
          )}
        </div>

        {media && (
          <div className="knot-illus">
            <img
              src={import.meta.env.BASE_URL + media.file}
              alt={`${knot.name} — ${knot.use}`}
              decoding="async"
            />
          </div>
        )}

        {knot.steps.map((s, i) => (
          <div key={i} className="knot-step" data-testid="etape">
            <div className="num">{i + 1}</div>
            <div className="cap">{s}</div>
          </div>
        ))}

        <div className="noeud-erreur">
          <div className="noeud-erreur-titre">L'erreur qui fait casser</div>
          <p>{knot.erreur}</p>
        </div>

        <div className="info">
          <b>Quand l'utiliser :</b> {knot.when}
        </div>

        {liees.length > 0 && (
          <>
            <div className="label noeud-label">Voir aussi</div>
            {liees.map((k) => (
              <button
                key={k.id}
                type="button"
                className="tile"
                onClick={() => nav("knot", { knotId: k.id })}
              >
                <div className="grow-1">
                  <div className="noeud-tuile-nom">{k.name}</div>
                  <div className="noeud-tuile-usage">{k.use}</div>
                </div>
                <span className="noeud-chevron">›</span>
              </button>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 4 : Retirer `KnotDetail` de `Noeuds.tsx`**

Dans `src/screens/Noeuds.tsx`, supprimer la fonction `KnotDetail` (lignes 52-102) et les imports devenus inutiles : `ALL_KNOT_MEDIA`, `DetailIntrouvable`, `LIEN_AUTRE_VERSION`. Conserver `useStore`, `KNOTS`, `Icon`, `ICONS` et l'import CSS.

- [ ] **Step 5 : Brancher la nouvelle fiche**

Dans `src/App.tsx`, ligne 18, remplacer :

```tsx
import { Noeuds, KnotDetail } from "./screens/Noeuds";
```

par :

```tsx
import { Noeuds } from "./screens/Noeuds";
import { NoeudFiche } from "./screens/NoeudFiche";
```

Ligne 152, remplacer `{s === "knot" && <KnotDetail />}` par `{s === "knot" && <NoeudFiche />}`.

Dans `src/screens/a11y-ecrans.test.tsx` ligne 22, remplacer l'import par :

```tsx
import { Noeuds } from "./Noeuds";
import { NoeudFiche } from "./NoeudFiche";
```

puis, dans la liste des écrans balayés du fichier, remplacer l'entrée `KnotDetail` par `NoeudFiche` (même forme d'appel).

- [ ] **Step 6 : Ajouter les styles**

Ajouter à la fin de `src/screens/noeuds.css` :

```css
/* Corps de la fiche : même gouttière que les autres écrans de détail. */
.noeud-corps {
  padding: 10px 18px 24px;
}

.noeud-pastilles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

/* Pastille informative, pas un bouton : pas de cible tactile de 44 px ici. */
.pastille {
  font-size: 12px;
  font-weight: 550;
  padding: 5px 10px;
  border-radius: 100px;
  background: var(--sand);
  color: var(--muted-2);
  border: 1px solid var(--line-strong);
}
.pastille-facile {
  color: var(--green);
  border-color: var(--green);
  background: var(--green-tint);
}
.pastille-difficile {
  color: var(--brass-ink);
}

/*
 * L'erreur qui fait casser. Elle se distingue du bloc « quand l'utiliser »
 * sans crier : c'est un avertissement utile, pas une alerte de sécurité, et
 * l'app réserve le rouge aux interdictions réglementaires.
 */
.noeud-erreur {
  border-left: 3px solid var(--brass-ink);
  background: var(--sand);
  border-radius: 0 14px 14px 0;
  padding: 12px 16px;
  margin: 18px 0;
}
.noeud-erreur-titre {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--brass-ink);
  font-weight: 600;
  margin-bottom: 5px;
}
.noeud-erreur p {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--muted-2);
}

.noeud-label {
  display: block;
  margin: 22px 0 8px;
}
.grow-1 {
  flex: 1;
}
.noeud-tuile-nom {
  font-size: 14.5px;
  font-weight: 600;
}
.noeud-tuile-usage {
  font-size: 12px;
  color: var(--muted);
  margin-top: 1px;
}
.noeud-chevron {
  color: var(--chev-ink);
}
```

- [ ] **Step 7 : Lancer les tests pour vérifier qu'ils passent**

Run: `npm test -- src/screens/noeud-fiche.test.tsx`
Expected: PASS — les 6 tests.

- [ ] **Step 8 : Vérifier l'ensemble**

Run: `npm test && npm run lint && npm run build`
Expected: tout passe, y compris `a11y-ecrans.test.tsx` et `detail-introuvable.test.tsx`.

- [ ] **Step 9 : Commit**

```bash
git add src/screens/NoeudFiche.tsx src/screens/Noeuds.tsx src/screens/noeud-fiche.test.tsx src/screens/noeuds.css src/App.tsx src/screens/a11y-ecrans.test.tsx
git commit -m "Nœuds : la fiche quitte l'écran de liste et dit enfin ce qui casse"
```

Corps :
```
Noeuds.tsx portait la liste et le détail. La liste va gagner des filtres et
la fiche une séquence : le fichier déborderait, il se scinde maintenant,
avant que les deux grossissent.

La fiche gagne au passage ce que le catalogue sait déjà dire — difficulté,
durée, fil, résistance — et l'erreur qui fait casser, en encart, parce que
c'est ce qu'un tutoriel écrit oublie toujours.
```

---

## Task 3 : La liste qui se cherche par besoin

**Files:**
- Modify: `src/screens/Noeuds.tsx`
- Modify: `src/screens/noeuds.css`
- Create: `src/screens/noeuds-liste.test.tsx`

**Interfaces:**
- Consomme : `KNOTS`, `BESOINS` (Task 1) ; `ALL_KNOT_MEDIA`.
- Produit : `export function Noeuds()`, inchangé côté signature.

Le filtre est un `useState` local, pas un champ du store : il n'a pas à survivre à la navigation ni à la persistance, contrairement au filtre des espèces qui, lui, est dans le store parce qu'on y revient en boucle depuis une fiche.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `src/screens/noeuds-liste.test.tsx` :

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoreProvider } from "../store";
import { Noeuds } from "./Noeuds";

// La liste ne lit aucun état du store : un montage nu suffit.
const monte = () =>
  render(
    <StoreProvider>
      <Noeuds />
    </StoreProvider>,
  );

describe("liste des nœuds & montages", () => {
  it("montre les 15 fiches sans filtre actif", () => {
    monte();
    expect(screen.getAllByTestId("tuile-noeud")).toHaveLength(15);
  });

  it("ne garde que les fiches du besoin choisi", async () => {
    const user = userEvent.setup();
    monte();
    await user.click(screen.getByRole("button", { name: "Relier deux fils" }));
    const noms = screen.getAllByTestId("tuile-noeud").map((n) => n.textContent);
    expect(noms).toHaveLength(3);
    expect(noms.join(" ")).toMatch(/Raccord.*sang.*Albright|Albright/i);
  });

  it("un second clic sur le même besoin le désactive", async () => {
    const user = userEvent.setup();
    monte();
    const bouton = screen.getByRole("button", { name: "Relier deux fils" });
    await user.click(bouton);
    await user.click(bouton);
    expect(screen.getAllByTestId("tuile-noeud")).toHaveLength(15);
  });

  it("le filtre actif est annoncé aux lecteurs d'écran", async () => {
    const user = userEvent.setup();
    monte();
    const bouton = screen.getByRole("button", { name: "Pêcher au fond" });
    expect(bouton).toHaveAttribute("aria-pressed", "false");
    await user.click(bouton);
    expect(bouton).toHaveAttribute("aria-pressed", "true");
  });

  it("masque un en-tête de groupe que le filtre a vidé", async () => {
    const user = userEvent.setup();
    monte();
    await user.click(screen.getByRole("button", { name: "Relier deux fils" }));
    expect(screen.queryByText("Montages")).toBeNull();
    expect(screen.getByText("Nœuds")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npm test -- src/screens/noeuds-liste.test.tsx`
Expected: FAIL — `Unable to find an element by: [data-testid="tuile-noeud"]`.

- [ ] **Step 3 : Réécrire la liste**

Remplacer intégralement `src/screens/Noeuds.tsx` :

```tsx
import { useState } from "react";
import { useStore } from "../store-hooks";
import { KNOTS } from "../data/knots";
import { BESOINS } from "../data/besoins";
import type { BesoinId } from "../types";
import { ALL_KNOT_MEDIA } from "../components/media-helpers";
import { Icon } from "../components/Icon";
import { ICONS } from "../components/icons-data";
import "./noeuds.css";

export function Noeuds() {
  const { nav } = useStore();
  // Filtre local : il n'a pas à survivre à la navigation. Le filtre des espèces
  // est dans le store parce qu'on y revient en boucle depuis une fiche ; ici on
  // ouvre un nœud et on repart.
  const [besoin, setBesoin] = useState<BesoinId | null>(null);

  const visibles = besoin ? KNOTS.filter((k) => k.besoins.includes(besoin)) : KNOTS;
  const groups = [
    { label: "Nœuds", items: visibles.filter((k) => k.cat === "noeud") },
    { label: "Montages", items: visibles.filter((k) => k.cat === "montage") },
  ].filter((g) => g.items.length > 0);

  return (
    <main className="screen">
      <div className="topbar">
        <h1 className="topbar-title">Nœuds &amp; montages</h1>
      </div>

      <div className="chips noeud-filtres">
        {BESOINS.map((b) => (
          <button
            key={b.id}
            type="button"
            className={"chip" + (besoin === b.id ? " chip-on" : "")}
            aria-pressed={besoin === b.id}
            onClick={() => setBesoin(besoin === b.id ? null : b.id)}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="noeud-corps">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="label noeud-label">{g.label}</div>
            {g.items.map((k) => {
              const media = ALL_KNOT_MEDIA[k.id];
              return (
                <button
                  key={k.id}
                  type="button"
                  className="tile"
                  data-testid="tuile-noeud"
                  onClick={() => nav("knot", { knotId: k.id })}
                >
                  {media ? (
                    <img
                      className="noeud-vignette"
                      src={import.meta.env.BASE_URL + media.file}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="noeud-vignette noeud-vignette-vide">
                      <Icon d={ICONS.knot} size={21} stroke="var(--icon-muted)" />
                    </span>
                  )}
                  <div className="grow-1">
                    <div className="noeud-tuile-nom">{k.name}</div>
                    <div className="noeud-tuile-usage">{k.use}</div>
                  </div>
                  <span className="noeud-chevron">›</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </main>
  );
}
```

> `alt=""` sur la vignette est délibéré : le nom du nœud est juste à côté dans le même bouton, et une alternative textuelle le répéterait à chaque tuile pour un lecteur d'écran. La tuile sans image garde l'icône générique — le cas ne subsiste que tant que les photos de la tâche 8 n'existent pas.

- [ ] **Step 4 : Ajouter les styles**

Ajouter à `src/screens/noeuds.css` :

```css
.noeud-filtres {
  padding: 4px 18px 2px;
}

/*
 * `contain` et non `cover` : une vignette est un diagramme, pas une photo.
 * Recadrer un schéma en carré coupe une légende ou un brin, ce qui en fait
 * une image fausse plutôt qu'une image serrée.
 */
.noeud-vignette {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: 10px;
  object-fit: contain;
  background: var(--paper);
  border: 1px solid var(--line-strong);
}
.noeud-vignette-vide {
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 5 : Lancer les tests pour vérifier qu'ils passent**

Run: `npm test -- src/screens/noeuds-liste.test.tsx`
Expected: PASS — les 5 tests.

- [ ] **Step 6 : Vérifier l'ensemble**

Run: `npm test && npm run lint && npm run build`
Expected: tout passe.

- [ ] **Step 7 : Commit**

```bash
git add src/screens/Noeuds.tsx src/screens/noeuds-liste.test.tsx src/screens/noeuds.css
git commit -m "Nœuds : la liste se cherche par geste, pas par nom savant"
```

Corps :
```
Quinze tuiles portaient la même icône générique : rien ne distinguait le
palomar du feeder avant de l'ouvrir. Chacune porte maintenant sa propre
vignette, en `contain` pour ne pas couper une légende.

Et une rangée de filtres par besoin coiffe les deux groupes, parce qu'au
bord de l'eau on ne cherche pas « l'albright », on cherche « comment relier
ma tresse à mon fluoro ».
```

---

## Task 4 : Le script de découpe et les 7 séquences de Commons

**Files:**
- Create: `scripts/knot-steps.manifest.json`
- Create: `scripts/crop-knot-steps.mjs`
- Create: `src/data/knot-steps.gen.ts` (généré)
- Create: `public/assets/knots-steps/` (généré)
- Modify: `package.json` (script `knot-steps`)
- Create: `src/data/knot-steps.test.ts`

**Interfaces:**
- Consomme : `KNOTS` (Task 1), `MediaEntry` (`src/data/media.ts`).
- Produit : `export const KNOT_STEPS: Record<string, MediaEntry[]>` dans `src/data/knot-steps.gen.ts`. La tâche 5 le consomme.

- [ ] **Step 1 : Écrire le manifeste**

Créer `scripts/knot-steps.manifest.json`. Chaque entrée décrit soit une planche à découper (`grid`), soit une suite de fichiers déjà séparés (`files`). `box` recadre la planche **avant** la grille, en fractions de ses dimensions : deux des planches portent un bandeau de titre en pied et un cadre de couleur, qui fausseraient la découpe.

Les cinq entrées ci-dessous ont été établies en **regardant** chaque planche, pas en déduisant des cases de ses dimensions — c'est ce qui a révélé que le nœud de sang est en 2×2 et non 2×3, et la boucle en 3 cases et non 4.

```json
{
  "planches": [
    {
      "id": "sang",
      "filename": "BloodKnot HowTo.jpg",
      "author": "Chris 73",
      "license": "CC BY-SA 3.0",
      "sourceUrl": "https://commons.wikimedia.org/wiki/File:BloodKnot_HowTo.jpg",
      "grid": { "cols": 2, "rows": 2 }
    },
    {
      "id": "chaise",
      "filename": "Bowline in four steps.png",
      "author": "Luis Dantas",
      "license": "CC BY-SA 3.0",
      "sourceUrl": "https://commons.wikimedia.org/wiki/File:Bowline_in_four_steps.png",
      "grid": { "cols": 2, "rows": 2 }
    },
    {
      "id": "albright",
      "filename": "Albright knot diagram retouched.png",
      "author": "LadyofHats (original) · retouché par Dfred",
      "license": "Domaine public",
      "sourceUrl": "https://commons.wikimedia.org/wiki/File:Albright_knot_diagram_retouched.png",
      "commentaire": "Cadre orange + bandeau « Albright Knot » en pied : recadrer avant de découper.",
      "box": { "left": 0.077, "top": 0.029, "width": 0.85, "height": 0.87 },
      "grid": { "cols": 1, "rows": 4 }
    },
    {
      "id": "boucle",
      "filename": "Surgeon's Loop knot.svg",
      "author": "LadyofHats",
      "license": "Domaine public",
      "sourceUrl": "https://commons.wikimedia.org/wiki/File:Surgeon's_Loop_knot.svg",
      "commentaire": "Cadre vert + bandeau « Surgeon's Loop Knot » en pied. Trois cases, pas quatre.",
      "box": { "left": 0.07, "top": 0.031, "width": 0.857, "height": 0.869 },
      "grid": { "cols": 1, "rows": 3 }
    },
    {
      "id": "texan",
      "author": "Zachary635",
      "license": "CC BY 4.0",
      "sourceUrl": "https://commons.wikimedia.org/wiki/File:Texas_Rig_Diagram.svg",
      "files": [
        "Texas Rig Diagram 1.svg",
        "Texas Rig Diagram 2.svg",
        "Texas Rig Diagram 3.svg",
        "Texas Rig Diagram 4.svg"
      ]
    }
  ]
}
```

> **Trois planches ont été écartées, et le manifeste ne doit pas les réintroduire.**
> · `PalomarKnotSequence.jpg` — cinq cases irrégulières (3 en haut, 2 décalées en bas) qu'aucune grille ne découpe, et surtout **un porte-clés en paracorde** : le commit `864cb95` avait déjà retiré cette illustration pour ce motif. Le palomar passe en série photographiée (tâche 8).
> · `Knotless knot.svg` — un seul dessin du nœud fini, pas une séquence. Le montage cheveu passe en schéma d'assemblage (tâche 7).
> · `Uni knot.jpg` et la photo du clinch — images uniques. Ces deux nœuds passent en série photographiée.

> **Les `box` restent à confirmer à l'œil.** Les fractions ci-dessus sont mesurées sur les vignettes 960 px et suffisent à écarter le bandeau, mais un décalage de quelques pixels se voit. Si une vignette générée coupe un dessin ou laisse une bande de couleur, ajuster `box`, supprimer les `<id>-*.webp` concernés et relancer : le script est idempotent par fichier.

- [ ] **Step 2 : Écrire le script**

Créer `scripts/crop-knot-steps.mjs` :

```js
// Découpe les planches libres de Wikimedia Commons en une image par geste, et
// génère src/data/knot-steps.gen.ts. Run: node scripts/crop-knot-steps.mjs
//
// L'auteur, la licence et l'URL source de la planche mère sont recopiés sur
// CHAQUE vignette : l'attribution doit survivre à la découpe, c'est une
// obligation des licences CC BY et CC BY-SA, et l'écran Crédits en dépend.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(join(root, "scripts/knot-steps.manifest.json"), "utf8"));

const UA = "CompagnonPeche/1.0 (offline fishing companion; personal project)";

// Même calcul d'URL que scripts/fetch-images.mjs : le nom de fichier donne le
// chemin CDN par son MD5, donc aucun appel d'API et aucun risque de quota.
function thumbUrl(filename, width) {
  const name = filename.replace(/^File:/, "").replace(/ /g, "_");
  const md5 = createHash("md5").update(name).digest("hex");
  const dir = `${md5[0]}/${md5.slice(0, 2)}`;
  const enc = encodeURI(name).replace(/[?#]/g, (c) => "%" + c.charCodeAt(0).toString(16));
  const suffix = name.toLowerCase().endsWith(".svg") ? ".png" : "";
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${dir}/${enc}/${width}px-${enc}${suffix}`;
}

async function download(filename) {
  const res = await fetch(thumbUrl(filename, 1280), { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${filename}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Une vignette : fond blanc aplati, jamais agrandie, bornée à 900 px de large. */
async function ecrire(pipeline, outPath) {
  await pipeline
    .resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .webp({ quality: 88 })
    .toFile(outPath);
}

const outDir = join(root, "public/assets/knots-steps");
await mkdir(outDir, { recursive: true });
const steps = {};

for (const p of manifest.planches) {
  const attribution = { author: p.author, license: p.license, sourceUrl: p.sourceUrl };
  const entries = [];

  if (p.files) {
    // Déjà une image par geste : rien à découper, seulement à convertir.
    for (let i = 0; i < p.files.length; i++) {
      const file = `assets/knots-steps/${p.id}-${i + 1}.webp`;
      const outPath = join(root, "public", file);
      if (!existsSync(outPath)) {
        await ecrire(sharp(await download(p.files[i]), { density: 200 }), outPath);
        console.log(`✓ ${p.id}-${i + 1}  (${p.license})`);
        await sleep(3000);
      } else console.log(`• ${p.id}-${i + 1}  (déjà présent)`);
      entries.push({ file, ...attribution });
    }
  } else {
    const buf = await download(p.filename);
    const meta = await sharp(buf, { density: 200 }).metadata();
    // `box` recadre AVANT la grille. Deux planches portent un bandeau de titre
    // en pied et un cadre de couleur : sans ce recadrage, la dernière ligne de
    // la grille emporterait le titre et chaque vignette une bande colorée.
    const b = p.box ?? { left: 0, top: 0, width: 1, height: 1 };
    const zone = {
      left: Math.round(b.left * meta.width),
      top: Math.round(b.top * meta.height),
      width: Math.round(b.width * meta.width),
      height: Math.round(b.height * meta.height),
    };
    const { cols, rows } = p.grid;
    const cw = Math.floor(zone.width / cols);
    const ch = Math.floor(zone.height / rows);
    const drop = new Set(p.drop ?? []);
    let n = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const index = r * cols + c;
        if (drop.has(index)) continue;
        n++;
        const file = `assets/knots-steps/${p.id}-${n}.webp`;
        const outPath = join(root, "public", file);
        if (!existsSync(outPath)) {
          await ecrire(
            sharp(buf, { density: 200 }).extract({
              left: zone.left + c * cw,
              top: zone.top + r * ch,
              width: cw,
              height: ch,
            }),
            outPath,
          );
          console.log(`✓ ${p.id}-${n}  (${p.license})`);
        } else console.log(`• ${p.id}-${n}  (déjà présent)`);
        entries.push({ file, ...attribution });
      }
    }
    await sleep(3000);
  }
  steps[p.id] = entries;
}

const body = `// GENERATED by scripts/crop-knot-steps.mjs — do not edit by hand.
// Une image par geste, dans l'ordre des \`steps\` de src/data/knots.ts.
// Chaque vignette porte l'auteur, la licence et la page source de sa planche mère.
import type { MediaEntry } from "./media";

export const KNOT_STEPS: Record<string, MediaEntry[]> = ${JSON.stringify(steps, null, 2)};
`;
await writeFile(join(root, "src/data/knot-steps.gen.ts"), body, "utf8");
console.log(`\nÉcrit src/data/knot-steps.gen.ts — ${Object.keys(steps).length} séquences.`);
```

- [ ] **Step 3 : Déclarer le script**

Dans `package.json`, ajouter à `scripts`, après `"thumbs"` :

```json
"knot-steps": "node scripts/crop-knot-steps.mjs"
```

- [ ] **Step 4 : Lancer la découpe**

Run: `npm run knot-steps`
Expected: 5 séquences écrites (`sang` 4, `chaise` 4, `albright` 4, `boucle` 3, `texan` 4 — 19 vignettes), `src/data/knot-steps.gen.ts` créé.

- [ ] **Step 5 : Vérifier les vignettes à l'œil**

Ouvrir `public/assets/knots-steps/` et regarder chaque fichier. Critère : **une vignette montre un geste entier, jamais un dessin coupé en deux**. Corriger `grid` / `drop` dans le manifeste, supprimer les `.webp` fautifs, relancer `npm run knot-steps`.

- [ ] **Step 6 : Écrire les tests**

Créer `src/data/knot-steps.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { KNOT_STEPS } from "./knot-steps.gen";
import { KNOTS } from "./knots";

const pub = (f: string) => join(process.cwd(), "public", f);

describe("séquences par étape", () => {
  it("chaque séquence vise une fiche du catalogue", () => {
    const ids = new Set(KNOTS.map((k) => k.id));
    expect(Object.keys(KNOT_STEPS).filter((id) => !ids.has(id))).toEqual([]);
  });

  /**
   * L'invariant central. Le texte et les images sont écrits et générés
   * séparément, par deux mains et à deux moments : rien d'autre que ce test
   * n'empêche un geste ajouté au texte de rester sans image, ou une planche
   * redécoupée plus finement de laisser une vignette orpheline.
   */
  it("autant d'images que de gestes écrits", () => {
    const fautes: string[] = [];
    for (const [id, imgs] of Object.entries(KNOT_STEPS)) {
      const k = KNOTS.find((x) => x.id === id);
      if (k && k.steps.length !== imgs.length)
        fautes.push(`${id} — ${k.steps.length} gestes, ${imgs.length} images`);
    }
    expect(fautes).toEqual([]);
  });

  it("chaque vignette existe sous public/", () => {
    const manquants = Object.entries(KNOT_STEPS).flatMap(([id, imgs]) =>
      imgs.filter((m) => !existsSync(pub(m.file))).map((m) => `${id} → ${m.file}`),
    );
    expect(manquants).toEqual([]);
  });

  it("chaque vignette porte auteur, licence et page source Commons", () => {
    const fautes: string[] = [];
    for (const [id, imgs] of Object.entries(KNOT_STEPS))
      for (const m of imgs) {
        if (!m.author?.trim() || !m.license?.trim()) fautes.push(`${id} → ${m.file} : auteur ou licence`);
        if (!/^https:\/\/commons\.wikimedia\.org\//.test(m.sourceUrl ?? ""))
          fautes.push(`${id} → ${m.file} : pas de page Commons`);
      }
    expect(fautes).toEqual([]);
  });
});
```

- [ ] **Step 7 : Lancer les tests**

Run: `npm test -- src/data/knot-steps.test.ts`
Expected: PASS. Si « autant d'images que de gestes » échoue, c'est le manifeste ou les `steps` qu'il faut aligner — jamais le test qu'il faut assouplir.

- [ ] **Step 8 : Commit**

```bash
git add scripts/crop-knot-steps.mjs scripts/knot-steps.manifest.json src/data/knot-steps.gen.ts src/data/knot-steps.test.ts public/assets/knots-steps package.json
git commit -m "Nœuds : quatre planches de Commons deviennent une image par geste"
```

Corps :
```
Une planche montre les quatre gestes de l'albright dans une seule image :
aucune étape écrite ne peut lui être mise en regard. Le script la découpe,
et recopie auteur, licence et page source sur chaque vignette —
l'attribution doit survivre à la découpe.

Deux planches portent un bandeau de titre en pied, d'où le recadrage
préalable du manifeste. Le texan, lui, ne se découpe pas : ses quatre
étapes existaient déjà en quatre fichiers sur Commons.

Trois planches pressenties ont été écartées après examen : le palomar
montre un porte-clés en paracorde — ce que le commit 864cb95 lui
reprochait déjà — et le nœud sans nœud du montage cheveu n'est pas une
séquence mais un dessin unique du nœud fini.
```

---

## Task 5 : La fiche affiche la séquence

**Files:**
- Modify: `src/screens/NoeudFiche.tsx`
- Modify: `src/screens/noeuds.css`
- Modify: `src/screens/noeud-fiche.test.tsx`

**Interfaces:**
- Consomme : `KNOT_STEPS` (Task 4).
- Produit : rien de nouveau.

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à `src/screens/noeud-fiche.test.tsx` (et `import { KNOT_STEPS } from "../data/knot-steps.gen";`) :

```tsx
describe("fiche nœud — séquence illustrée", () => {
  it("montre une image par geste quand la séquence existe", () => {
    monte("albright");
    const imgs = screen.getAllByTestId("image-etape");
    expect(imgs).toHaveLength(KNOT_STEPS.albright.length);
  });

  it("décrit chaque image par le geste qu'elle montre", () => {
    const albright = KNOTS.find((k) => k.id === "albright")!;
    monte("albright");
    const imgs = screen.getAllByTestId("image-etape");
    expect(imgs[0]).toHaveAttribute("alt", `Albright, étape 1 : ${albright.steps[0]}`);
  });

  it("n'affiche plus l'illustration unique quand la séquence la remplace", () => {
    monte("albright");
    expect(screen.queryByTestId("illustration-unique")).toBeNull();
  });

  it("retombe sur l'illustration unique quand aucune séquence n'existe", () => {
    monte("clinch"); // pas encore de séquence : photos à venir
    expect(screen.getByTestId("illustration-unique")).toBeInTheDocument();
    expect(screen.queryAllByTestId("image-etape")).toHaveLength(0);
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npm test -- src/screens/noeud-fiche.test.tsx`
Expected: FAIL — `Unable to find an element by: [data-testid="image-etape"]`.

- [ ] **Step 3 : Rendre la séquence**

Dans `src/screens/NoeudFiche.tsx`, ajouter l'import `import { KNOT_STEPS } from "../data/knot-steps.gen";`, puis remplacer le bloc `{media && (…)}` et la boucle `knot.steps.map(…)` par :

```tsx
        {/*
          Une séquence remplace l'illustration unique, elle ne s'y ajoute pas :
          la planche entière et ses propres vignettes montreraient deux fois la
          même leçon, et la planche est justement ce qu'on cherchait à quitter.
        */}
        {sequence.length === 0 && media && (
          <div className="knot-illus" data-testid="illustration-unique">
            <img
              src={import.meta.env.BASE_URL + media.file}
              alt={`${knot.name} — ${knot.use}`}
              decoding="async"
            />
          </div>
        )}

        {knot.steps.map((s, i) => (
          <div key={i} className="knot-geste" data-testid="etape">
            {sequence[i] && (
              <img
                className="knot-geste-img"
                data-testid="image-etape"
                src={import.meta.env.BASE_URL + sequence[i].file}
                alt={`${knot.name}, étape ${i + 1} : ${s}`}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
              />
            )}
            <div className="knot-step">
              <div className="num">{i + 1}</div>
              <div className="cap">{s}</div>
            </div>
          </div>
        ))}
```

et déclarer, juste après `const media = …` :

```tsx
  const sequence = KNOT_STEPS[knot.id] ?? [];
```

- [ ] **Step 4 : Ajouter les styles**

Ajouter à `src/screens/noeuds.css` :

```css
/*
 * Un geste = son image, puis son texte. L'image d'abord parce qu'on la
 * reconnaît avant de lire, et que le doigt s'arrête dessus en défilant.
 */
.knot-geste {
  margin-bottom: 20px;
}
.knot-geste-img {
  display: block;
  width: 100%;
  /* Bornée en hauteur : une vignette verticale occuperait tout l'écran et
     ferait croire que la fiche s'arrête là. */
  max-height: 46vh;
  object-fit: contain;
  border-radius: 14px;
  background: var(--card);
  border: 1px solid var(--line-strong);
  margin-bottom: 8px;
}
```

- [ ] **Step 5 : La vignette de la liste prend le nœud fini**

La tâche 3 a posé la vignette sur `ALL_KNOT_MEDIA`, faute de mieux : la planche entière, réduite à 46 px. Maintenant qu'une séquence existe, la bonne vignette est sa **dernière** image — le nœud terminé, qui est ce qu'on reconnaît d'un coup d'œil.

Dans `src/screens/Noeuds.tsx`, ajouter `import { KNOT_STEPS } from "../data/knot-steps.gen";` et remplacer `const media = ALL_KNOT_MEDIA[k.id];` par :

```tsx
              // La dernière image de la séquence montre le nœud fini : c'est
              // elle qu'on reconnaît. À défaut, la planche entière ; à défaut
              // encore, l'icône générique.
              const sequence = KNOT_STEPS[k.id] ?? [];
              const media = sequence[sequence.length - 1] ?? ALL_KNOT_MEDIA[k.id];
```

Ajouter le test correspondant à `src/screens/noeuds-liste.test.tsx` :

```tsx
  it("la vignette montre le nœud fini, pas la planche entière", () => {
    monte();
    const tuile = screen.getAllByTestId("tuile-noeud").find((n) => n.textContent?.includes("Albright"))!;
    const derniere = KNOT_STEPS.albright[KNOT_STEPS.albright.length - 1];
    expect(tuile.querySelector("img")).toHaveAttribute("src", expect.stringContaining(derniere.file));
  });
```

avec `import { KNOT_STEPS } from "../data/knot-steps.gen";` en tête du fichier de test.

- [ ] **Step 6 : Lancer les tests**

Run: `npm test -- src/screens/noeud-fiche.test.tsx src/screens/noeuds-liste.test.tsx`
Expected: PASS — les 10 tests de la fiche et les 6 de la liste.

- [ ] **Step 7 : Vérifier l'ensemble**

Run: `npm test && npm run lint && npm run build`
Expected: tout passe.

- [ ] **Step 8 : Commit**

```bash
git add src/screens/NoeudFiche.tsx src/screens/Noeuds.tsx src/screens/noeud-fiche.test.tsx src/screens/noeuds-liste.test.tsx src/screens/noeuds.css
git commit -m "Nœuds : chaque geste écrit montre le geste qu'il décrit"
```

Corps :
```
La fiche montrait la planche entière, puis les gestes en texte. Elle montre
maintenant l'image de chaque geste au-dessus de son texte, et la planche
disparaît — la garder afficherait deux fois la même leçon.

La vignette de la liste prend au passage la dernière image de la séquence :
le nœud fini, qui est ce qu'on reconnaît à 46 px.
```

---

## Task 6 : Le langage de schéma, éprouvé sur le seul pater-noster

**Cette tâche se termine par une validation humaine.** Elle ne doit pas être enchaînée avec la tâche 7 sans elle.

**Files:**
- Create: `src/components/SchemaMontage.tsx`
- Modify: `src/screens/NoeudFiche.tsx`
- Modify: `src/screens/noeuds.css`
- Modify: `src/screens/noeud-fiche.test.tsx`

**Interfaces:**
- Consomme : rien.
- Produit : `export const SCHEMAS: Record<string, () => JSX.Element>`. La tâche 7 y ajoute cinq entrées.

> **Pourquoi du SVG inline et non un fichier sous `public/`.** Un SVG chargé par `<img src>` est un document isolé : il n'hérite d'aucune variable CSS de la page, donc il ne suivrait pas le thème sombre. Inline dans le JSX, `stroke="var(--body)"` se résout dans le contexte du document et le schéma change de couleurs avec le reste. C'est la raison technique ; elle explique aussi pourquoi ces schémas ne sont pas des `MediaEntry` et n'apparaissent pas dans `KNOT_STEPS`.

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à `src/screens/noeud-fiche.test.tsx` :

```tsx
describe("fiche montage — schéma d'assemblage", () => {
  it("montre le schéma du pater-noster à la place de l'illustration unique", () => {
    monte("paternoster");
    expect(screen.getByTestId("schema-montage")).toBeInTheDocument();
    expect(screen.queryByTestId("illustration-unique")).toBeNull();
  });

  it("le schéma porte un titre accessible qui dit ce qu'il montre", () => {
    monte("paternoster");
    expect(screen.getByTitle(/Pater-noster/i)).toBeInTheDocument();
  });

  it("un montage sans schéma ni séquence garde son illustration unique", () => {
    monte("carolina");
    expect(screen.queryByTestId("schema-montage")).toBeNull();
    expect(screen.getByTestId("illustration-unique")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npm test -- src/screens/noeud-fiche.test.tsx`
Expected: FAIL — `Unable to find an element by: [data-testid="schema-montage"]`.

- [ ] **Step 3 : Créer le vocabulaire et le premier schéma**

Créer `src/components/SchemaMontage.tsx` :

```tsx
/**
 * Les schémas d'assemblage des montages que Wikimedia Commons ne couvre pas.
 *
 * Un montage n'est pas une suite de gestes : c'est un ordre de composants le
 * long de la ligne. Il n'y a pas de « geste 2 » à photographier, il y a un plan
 * légendé — d'où cette forme, et non une séquence dégradée.
 *
 * SVG inline et non fichier : un `<img src="…svg">` est un document isolé qui
 * n'hérite d'aucune variable CSS, donc qui ne suivrait pas le thème sombre.
 *
 * Le langage est commun aux six et ne se négocie pas fiche par fiche : même
 * boîte 200 × 320, surface en haut, fond hachuré en bas, corps de ligne épais,
 * bas de ligne fin, et les mêmes primitives de composants. C'est cette
 * constance qui fait de six dessins un ensemble.
 */

const BOITE = "0 0 200 320";

/** Ligne d'eau et fond : le repère vertical commun à tous les schémas. */
function Eau() {
  return (
    <>
      <path
        d="M0 18 q 12 -6 25 0 t 25 0 t 25 0 t 25 0 t 25 0 t 25 0 t 25 0 t 25 0"
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth="1.5"
      />
      <text x="4" y="13" className="schema-legende">Surface</text>
      <rect x="0" y="296" width="200" height="24" fill="var(--sand)" />
      <path
        d="M0 296 h200 M4 320 l10 -14 M24 320 l10 -14 M44 320 l10 -14 M64 320 l10 -14 M84 320 l10 -14 M104 320 l10 -14 M124 320 l10 -14 M144 320 l10 -14 M164 320 l10 -14 M184 320 l10 -14"
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth="1.2"
      />
      <text x="4" y="292" className="schema-legende">Fond</text>
    </>
  );
}

/** Pastille numérotée : le renvoi vers l'étape écrite du même numéro. */
function Repere({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <>
      <circle cx={x} cy={y} r="8.5" fill="var(--green)" />
      <text x={x} y={y + 3.5} textAnchor="middle" className="schema-repere">{n}</text>
    </>
  );
}

function Plomb({ x, y }: { x: number; y: number }) {
  return <ellipse cx={x} cy={y} rx="7" ry="10" fill="var(--body)" />;
}

function Hamecon({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x} ${y} v10 a7 7 0 1 0 -12 -3`}
      fill="none"
      stroke="var(--body)"
      strokeWidth="2"
      strokeLinecap="round"
    />
  );
}

function PaterNoster() {
  return (
    <svg viewBox={BOITE} className="schema-svg" role="img" aria-labelledby="schema-paternoster">
      <title id="schema-paternoster">
        Pater-noster : corps de ligne vertical, potence à mi-hauteur portant le bas de ligne
        esché, plomb posé au fond.
      </title>
      <Eau />
      {/* Corps de ligne, de la surface au plomb. */}
      <line x1="100" y1="18" x2="100" y2="286" stroke="var(--body)" strokeWidth="2.4" />
      {/* La potence : boucle de chirurgien sur le corps de ligne. */}
      <circle cx="100" cy="150" r="5" fill="none" stroke="var(--body)" strokeWidth="2.4" />
      <Repere x={122} y={150} n={1} />
      {/* Bas de ligne, plus fin, à l'écart du corps de ligne. */}
      <line x1="104" y1="152" x2="158" y2="176" stroke="var(--muted)" strokeWidth="1.4" />
      <Hamecon x={158} y={176} />
      <Repere x={140} y={200} n={3} />
      <Plomb x={100} y={286} />
      <Repere x={74} y={286} n={2} />
      <text x="106" y="60" className="schema-legende">Corps de ligne</text>
      <text x="118" y="140" className="schema-legende">Potence</text>
      <text x="118" y="196" className="schema-legende">Bas de ligne</text>
    </svg>
  );
}

export const SCHEMAS: Record<string, () => JSX.Element> = {
  paternoster: PaterNoster,
};
```

- [ ] **Step 4 : Ajouter les styles du langage**

Ajouter à `src/screens/noeuds.css` :

```css
.schema-cadre {
  border-radius: 14px;
  background: var(--card);
  border: 1px solid var(--line-strong);
  padding: 10px;
  margin-bottom: 18px;
}
.schema-svg {
  display: block;
  width: 100%;
  max-height: 52vh;
}
.schema-legende {
  font-size: 8px;
  fill: var(--muted);
  font-weight: 550;
}
.schema-repere {
  font-size: 9px;
  fill: var(--paper);
  font-weight: 700;
}
```

- [ ] **Step 5 : Brancher le schéma dans la fiche**

Dans `src/screens/NoeudFiche.tsx`, ajouter `import { SCHEMAS } from "../components/SchemaMontage";`, puis, après `const sequence = …` :

```tsx
  const Schema = SCHEMAS[knot.id];
```

et remplacer la condition de l'illustration unique par :

```tsx
        {Schema && (
          <div className="schema-cadre" data-testid="schema-montage">
            <Schema />
          </div>
        )}

        {sequence.length === 0 && !Schema && media && (
```

- [ ] **Step 6 : Lancer les tests**

Run: `npm test -- src/screens/noeud-fiche.test.tsx`
Expected: PASS — les 13 tests.

- [ ] **Step 7 : Regarder le résultat**

Run: `npm run dev`, ouvrir Outils → Nœuds & montages → Pater-noster, en clair **et** en sombre.

- [ ] **Step 8 : Commit**

```bash
git add src/components/SchemaMontage.tsx src/screens/NoeudFiche.tsx src/screens/noeuds.css src/screens/noeud-fiche.test.tsx
git commit -m "Montages : le langage de schéma, éprouvé sur le seul pater-noster"
```

Corps :
```
Un montage n'est pas une suite de gestes mais un ordre de composants : il
lui faut un plan légendé, pas une séquence dégradée. Le langage est commun
aux sept montages à venir — même boîte, même ligne d'eau, mêmes primitives.

SVG inline et non fichier : un <img src="…svg"> n'hérite d'aucune variable
CSS et ne suivrait pas le thème sombre.

Un seul schéma pour l'instant. Trente schémas maison ont déjà été supprimés
en 19f859b pour n'avoir pas appris ce qu'ils dessinaient : celui-ci se
regarde avant que les cinq autres soient entrepris.
```

- [ ] **Step 9 : ARRÊT — validation humaine**

Montrer le schéma du pater-noster, en clair et en sombre, et demander explicitement :

> « Voilà le langage de schéma sur le pater-noster, dans les deux thèmes. Je pars sur les cinq autres avec ce vocabulaire, ou on le retravaille d'abord ? »

**Ne pas enchaîner sur la tâche 7 sans réponse.** C'est le garde-fou du spec : si le langage ne convainc pas, un schéma est perdu, pas six.

---

## Task 7 : Les six schémas restants

**À n'entreprendre qu'après validation de la tâche 6.**

**Files:**
- Modify: `src/components/SchemaMontage.tsx`
- Modify: `src/screens/noeud-fiche.test.tsx`

**Interfaces:**
- Consomme : `SCHEMAS`, `Eau`, `Repere`, `Plomb`, `Hamecon` (Task 6).
- Produit : `SCHEMAS` complété — `dropshot`, `carolina`, `wacky`, `anglaise`, `feeder`, `cheveu`.

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à `src/screens/noeud-fiche.test.tsx` :

```tsx
describe("schémas d'assemblage — les sept montages sans séquence", () => {
  const SANS_SEQUENCE = ["dropshot", "carolina", "paternoster", "wacky", "anglaise", "feeder", "cheveu"];

  it("chacun a son schéma", () => {
    const manquants = SANS_SEQUENCE.filter((id) => !SCHEMAS[id]);
    expect(manquants).toEqual([]);
  });

  it("aucun schéma ne double une séquence existante", () => {
    const doublons = Object.keys(SCHEMAS).filter((id) => (KNOT_STEPS[id] ?? []).length > 0);
    expect(doublons).toEqual([]);
  });

  it("chaque schéma porte un titre accessible", () => {
    for (const id of SANS_SEQUENCE) {
      const { unmount } = monte(id);
      expect(screen.getByTestId("schema-montage").querySelector("title")?.textContent?.trim())
        .toBeTruthy();
      unmount();
    }
  });
});
```

Ajouter `import { SCHEMAS } from "../components/SchemaMontage";` en tête du fichier.

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npm test -- src/screens/noeud-fiche.test.tsx`
Expected: FAIL — `expected [ 'dropshot', 'carolina', 'wacky', 'anglaise', 'feeder', 'cheveu' ] to deeply equal []`.

- [ ] **Step 3 : Ajouter les primitives manquantes**

Dans `src/components/SchemaMontage.tsx`, après `Hamecon`, ajouter les composants que les six schémas restants partagent. Chacun reste une primitive du même vocabulaire — même épaisseur de trait, mêmes jetons.

```tsx
function Perle({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r="5" fill="none" stroke="var(--body)" strokeWidth="2" />;
}

function Emerillon({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="var(--body)" strokeWidth="1.8" fill="none">
      <circle cx={x} cy={y - 4} r="3.2" />
      <circle cx={x} cy={y + 4} r="3.2" />
      <line x1={x} y1={y - 1} x2={x} y2={y + 1} />
    </g>
  );
}

function Waggler({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx="4" ry="16" fill="var(--card)" stroke="var(--body)" strokeWidth="1.8" />
      <path d={`M${x - 4} ${y - 6} a4 10 0 0 1 8 0 z`} fill="var(--green)" />
    </g>
  );
}

function Panier({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="var(--body)" strokeWidth="1.8" fill="none">
      <rect x={x - 9} y={y - 12} width="18" height="24" rx="3" />
      <line x1={x - 9} y1={y - 4} x2={x + 9} y2={y - 4} />
      <line x1={x - 9} y1={y + 4} x2={x + 9} y2={y + 4} />
    </g>
  );
}

function LeurreSouple({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x} ${y} q 14 -4 22 2 q -8 6 -22 4 z`}
      fill="var(--green-tint)"
      stroke="var(--green)"
      strokeWidth="1.6"
    />
  );
}
```

- [ ] **Step 4 : Dessiner les six schémas**

Chaque schéma suit exactement la structure de `PaterNoster` : `<svg viewBox={BOITE} className="schema-svg" role="img" aria-labelledby="schema-<id>">`, un `<title id="schema-<id>">` qui décrit l'assemblage en une phrase, `<Eau />`, puis les composants dans l'ordre de la ligne, et un `<Repere>` par étape écrite.

**Contrainte de correspondance :** le numéro de chaque `<Repere>` renvoie à l'étape de même rang dans `KNOTS[].steps`. Un montage à 5 étapes porte les repères 1 à 5, dans l'ordre où la ligne les rencontre.

Le drop shot en entier, comme second exemple travaillé après le pater-noster — les cinq autres se calquent dessus :

```tsx
function DropShot() {
  return (
    <svg viewBox={BOITE} className="schema-svg" role="img" aria-labelledby="schema-dropshot">
      <title id="schema-dropshot">
        Drop shot : hameçon noué à mi-hauteur, pointe vers le haut, leurre souple piqué par la
        tête, et plomb à l'extrémité du brin libre qui repose sur le fond.
      </title>
      <Eau />
      {/* Corps de ligne, puis brin libre sous le nœud : un seul fil continu. */}
      <line x1="100" y1="18" x2="100" y2="286" stroke="var(--body)" strokeWidth="2.4" />
      {/* Le nœud, à mi-hauteur. Le brin repasse dans l'œillet par le haut : c'est
          ce qui tient la hampe à l'horizontale et le leurre à l'endroit. */}
      <circle cx="100" cy="140" r="4.5" fill="none" stroke="var(--body)" strokeWidth="2.4" />
      <Repere x={78} y={140} n={1} />
      <Repere x={78} y={160} n={2} />
      {/* Hampe horizontale, pointe vers le haut. */}
      <g transform="translate(104 148) rotate(-90)">
        <Hamecon x={0} y={0} />
      </g>
      <LeurreSouple x={112} y={144} />
      <Repere x={150} y={128} n={4} />
      <Plomb x={100} y={286} />
      <Repere x={74} y={286} n={3} />
      {/* La cote qui fait tout le montage : la hauteur sous le nœud. */}
      <line x1="60" y1="148" x2="60" y2="278" stroke="var(--muted)" strokeWidth="1" strokeDasharray="3 3" />
      <text x="16" y="216" className="schema-legende">30–80 cm</text>
      <Repere x={44} y={240} n={5} />
      <text x="106" y="60" className="schema-legende">Corps de ligne</text>
    </svg>
  );
}
```

Les cinq autres, décrits par leur contenu — même boîte, mêmes primitives, mêmes épaisseurs :

- `carolina` — `Plomb` olive coulissant sur le corps de ligne, `Perle`, `Emerillon`, puis un bas de ligne plus fin et plus long vers un `Hamecon` texan et son `LeurreSouple`. Ligne plutôt oblique, du haut-gauche vers le fond-droite, pour montrer que le plomb traîne au contact. 5 repères.
- `wacky` — pas de plomb, pas de fond : le ver plié en V autour d'un `Hamecon` piqué en son milieu exact, entre deux eaux, avec des flèches de chute de part et d'autre. 4 repères.
- `anglaise` — `Waggler` fixé **par le bas seulement** (deux stop-flotteurs de part et d'autre de son œillet), puis quatre plombs décroissants échelonnés vers le bas et un `Hamecon` en fin de ligne. 5 repères.
- `feeder` — `Panier` coulissant en haut, butée, `Emerillon` à agrafe, bas de ligne court vers un `Hamecon`, l'ensemble posé sur le fond avec un nuage d'amorce autour du panier. 5 repères.
- `cheveu` — le seul schéma en gros plan, sans colonne d'eau : hameçon de profil, les 7 à 10 tours du nœud sans nœud sur la hampe, le brin ressorti par l'œillet, et la bouillette pendue au cheveu **sous la pointe**, bloquée par un stop-appât. Comme il n'a pas de ligne d'eau, il n'appelle pas `<Eau />` : c'est la seule dérogation au gabarit, et elle se justifie parce que le montage cheveu se juge à hauteur d'hameçon, pas à hauteur de colonne d'eau. 5 repères.

Enregistrer les sept dans `SCHEMAS` :

```tsx
export const SCHEMAS: Record<string, () => JSX.Element> = {
  dropshot: DropShot,
  carolina: Carolina,
  paternoster: PaterNoster,
  wacky: Wacky,
  anglaise: Anglaise,
  feeder: Feeder,
  cheveu: Cheveu,
};
```

- [ ] **Step 5 : Lancer les tests**

Run: `npm test -- src/screens/noeud-fiche.test.tsx`
Expected: PASS.

- [ ] **Step 6 : Regarder les sept ensemble**

Run: `npm run dev`, ouvrir les sept fiches à la suite, en clair et en sombre. Critère : **posées côte à côte, elles doivent se lire comme sept dessins de la même main.** Une épaisseur de trait ou une taille de légende qui varie d'un schéma à l'autre est un défaut à corriger avant le commit.

- [ ] **Step 7 : Vérifier l'ensemble**

Run: `npm test && npm run lint && npm run build`
Expected: tout passe.

- [ ] **Step 8 : Commit**

```bash
git add src/components/SchemaMontage.tsx src/screens/noeud-fiche.test.tsx
git commit -m "Montages : les six schémas restants, du même trait"
```

---

## Task 8 : Les trois séries photographiques

**Cette tâche dépend d'une session de prise de vue hors code.** Les tâches 1 à 7 sont livrables sans elle : `clinch` et `raccord` gardent leur illustration unique en attendant, et `palomar` s'affiche sans cadre — son illustration actuelle est justement celle qu'on écarte.

**Files:**
- Create: `docs/protocole-photos-noeuds.md`
- Create: `scripts/import-knot-photos.mjs`
- Modify: `package.json`
- Modify: `src/data/knot-steps.gen.ts` (régénéré)

**Interfaces:**
- Consomme : `KNOTS` (Task 1), le format de `KNOT_STEPS` (Task 4).
- Produit : `KNOT_STEPS.clinch`, `KNOT_STEPS.raccord` et `KNOT_STEPS.palomar`.

- [ ] **Step 1 : Écrire le protocole**

Créer `docs/protocole-photos-noeuds.md` :

```markdown
# Protocole de prise de vue — séries de nœuds

Trois séries, 5 clichés chacune : **clinch amélioré**, **palomar**, et **raccord
ligne / bas de ligne**. Un cliché par étape écrite dans `src/data/knots.ts`, dans
l'ordre.

Le palomar en fait partie parce que la seule planche libre qui existe sur
Wikimedia Commons le noue sur un **anneau porte-clés en paracorde** — pas sur un
hameçon. Ce cliché avait déjà été retiré une fois (commit `864cb95`).

## Matériel

- Un fil clair et un fil foncé, en gros diamètre (40 à 60/100) : à 30/100 le fil
  disparaît sur la photo. Le nœud est le même, il est simplement lisible.
- Pour le raccord : deux couleurs différentes, obligatoirement — c'est ce qui
  rend visible lequel des deux brins s'enroule autour de l'autre.
- Un hameçon de taille moyenne, œillet bien visible. Pour le palomar, un hameçon
  large ouverture : l'étape 4 consiste à faire passer l'hameçon **entier** dans
  la boucle, et c'est cela qu'il faut voir.
- Un fond uni mat, sans motif : une planche à découper blanche, une feuille de
  papier kraft. Pas de bois veiné, pas de nappe à carreaux.

## Lumière et cadrage

- Lumière du jour indirecte, près d'une fenêtre, **sans flash** : le flash fait
  briller le nylon et efface les tours.
- Le nœud occupe les deux tiers du cadre, centré, à l'horizontale.
- **Même cadrage, même distance, même orientation pour les cinq clichés d'une
  série.** C'est la seule chose qui fasse d'une suite de photos une séquence.
- Format carré si le téléphone le propose ; sinon le script recadre au centre.

## Ce que chaque cliché doit montrer

Se référer aux `steps` de la fiche dans `src/data/knots.ts` : le cliché *n* montre
l'état du nœud **à la fin** du geste *n*, pas pendant. Le dernier montre le nœud
serré et l'excédent rasé.

Tenir le fil tendu entre deux doigts pour que les tours ne se chevauchent pas :
si deux tours se touchent sur la photo, on ne peut plus les compter.

## Dépôt

Nommer `clinch-1.jpg` … `clinch-5.jpg`, `palomar-1.jpg` … `palomar-5.jpg`,
`raccord-1.jpg` … `raccord-5.jpg`, les déposer dans `photos-brutes/` à la racine
(dossier ignoré par git), puis :

    npm run knot-photos
```

- [ ] **Step 2 : Écrire le script d'import**

Créer `scripts/import-knot-photos.mjs` :

```js
// Importe les séries photographiques maison depuis photos-brutes/ et met à jour
// src/data/knot-steps.gen.ts. Run: node scripts/import-knot-photos.mjs
//
// Les photos maison ne passent PAS par crop-knot-steps.mjs : elles n'ont ni
// planche mère ni page Commons, et leur attribution est celle du projet.
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brut = join(root, "photos-brutes");
const outDir = join(root, "public/assets/knots-steps");

const ATTRIBUTION = {
  author: "Compagnon de pêche",
  license: "Photographie originale",
  sourceUrl: "",
};

if (!existsSync(brut)) {
  console.error("photos-brutes/ n'existe pas — voir docs/protocole-photos-noeuds.md");
  process.exit(1);
}
await mkdir(outDir, { recursive: true });

const fichiers = (await readdir(brut)).filter((f) => /^(clinch|palomar|raccord)-\d+\.(jpe?g|png|webp)$/i.test(f));
if (!fichiers.length) {
  console.error("Aucune photo nommée <clinch|raccord>-<n>.jpg dans photos-brutes/");
  process.exit(1);
}

const series = {};
for (const f of fichiers.sort()) {
  const [, id, n] = f.match(/^(clinch|palomar|raccord)-(\d+)\./i);
  const file = `assets/knots-steps/${id}-${n}.webp`;
  await sharp(join(brut, f))
    .rotate() // respecte l'orientation EXIF du téléphone
    .resize({ width: 900, height: 900, fit: "cover", position: "centre" })
    .webp({ quality: 86 })
    .toFile(join(root, "public", file));
  (series[id] ??= [])[Number(n) - 1] = { file, ...ATTRIBUTION };
  console.log(`✓ ${id}-${n}`);
}

// Fusion dans le fichier généré : la découpe Commons et les photos maison
// écrivent le même fichier, chacune ses propres clés.
const genPath = join(root, "src/data/knot-steps.gen.ts");
const actuel = await readFile(genPath, "utf8");
const json = actuel.slice(actuel.indexOf("{"), actuel.lastIndexOf("}") + 1);
const fusion = { ...JSON.parse(json), ...series };
await writeFile(genPath, actuel.replace(json, JSON.stringify(fusion, null, 2)), "utf8");
console.log(`\nFusionné dans knot-steps.gen.ts — ${Object.keys(series).join(", ")}.`);
```

- [ ] **Step 3 : Déclarer le script et ignorer le dossier brut**

Dans `package.json`, ajouter à `scripts` : `"knot-photos": "node scripts/import-knot-photos.mjs"`.
Dans `.gitignore`, ajouter une ligne `photos-brutes/`.

- [ ] **Step 4 : Adapter le test d'attribution**

Dans `src/data/knot-steps.test.ts`, le test « chaque vignette porte auteur, licence et page source Commons » doit accepter les photos maison, qui n'ont pas de page Commons. Remplacer sa condition d'URL par :

```ts
        // Les photos maison n'ont pas de page Commons : leur `sourceUrl` est
        // vide, et c'est la licence qui les distingue.
        const maison = m.license === "Photographie originale";
        if (!maison && !/^https:\/\/commons\.wikimedia\.org\//.test(m.sourceUrl ?? ""))
          fautes.push(`${id} → ${m.file} : pas de page Commons`);
```

- [ ] **Step 5 : Importer les photos**

Run: `npm run knot-photos`
Expected: 15 vignettes écrites, `knot-steps.gen.ts` mis à jour avec `clinch`, `palomar` et `raccord`.

- [ ] **Step 6 : Lancer les tests**

Run: `npm test -- src/data/knot-steps.test.ts src/screens/noeud-fiche.test.tsx`
Expected: PASS. Le test « autant d'images que de gestes » vérifie que chaque série compte bien 5 clichés.

- [ ] **Step 7 : Commit**

```bash
git add docs/protocole-photos-noeuds.md scripts/import-knot-photos.mjs package.json .gitignore src/data/knot-steps.gen.ts src/data/knot-steps.test.ts public/assets/knots-steps
git commit -m "Nœuds : trois séries photographiées, un cliché par geste"
```

Corps :
```
Commons ne montre le clinch et le raccord que finis, sur une seule image, et
ne noue le palomar que sur un porte-clés en paracorde — ce que le commit
864cb95 lui reprochait déjà. Trois nœuds, cinq clichés chacun, pris ici.
```

---

## Task 9 : L'arbitrage remis à jour et le ménage

La dernière tâche referme la boucle : la table de décision doit dire l'état réel, et rien ne doit rester livré sans être affiché.

**Files:**
- Modify: `src/data/knots.test.ts`
- Delete: `src/data/knot-diagrams.ts`
- Modify: `src/components/media-helpers.ts`
- Delete: `public/assets/knots/paternoster.svg`, `public/assets/knots/raccord.svg`
- Modify: `src/data/media.ts` (retrait des entrées remplacées)

- [ ] **Step 1 : Réécrire la table d'arbitrage**

Dans `src/data/knots.test.ts`, remplacer `ARBITRAGE` et le test qui la vérifie :

```ts
/**
 * L'arbitrage, fiche par fiche. « Changer une ligne, c'est décider ; le test est
 * là pour que ça se décide. » — la règle n'a pas bougé, ses valeurs si :
 *
 *  · `commons-decoupe` — une planche libre de Commons, découpée en une image par
 *                        geste, l'attribution de la planche mère recopiée sur
 *                        chaque vignette ;
 *  · `schema-maison`   — un schéma d'assemblage dessiné ici, en SVG inline, pour
 *                        un montage que Commons ne couvre pas. Un montage est un
 *                        ordre de composants, pas une suite de gestes : c'est la
 *                        forme juste, pas un pis-aller ;
 *  · `photo-maison`    — une série photographiée pour le projet.
 */
const ARBITRAGE: Record<string, "commons-decoupe" | "schema-maison" | "photo-maison"> = {
  // Nœuds
  clinch: "photo-maison",
  // La seule planche libre du palomar le noue sur un porte-clés en paracorde ;
  // le commit 864cb95 l'avait déjà retirée pour ce motif.
  palomar: "photo-maison",
  raccord: "photo-maison",
  boucle: "commons-decoupe",
  sang: "commons-decoupe",
  albright: "commons-decoupe",
  chaise: "commons-decoupe",
  // Montages
  dropshot: "schema-maison",
  texan: "commons-decoupe",
  paternoster: "schema-maison",
  carolina: "schema-maison",
  wacky: "schema-maison",
  anglaise: "schema-maison",
  feeder: "schema-maison",
  // « Knotless knot.svg » n'est pas une séquence : c'est un dessin unique du
  // nœud fini — un plan, donc, comme les autres montages.
  cheveu: "schema-maison",
};

describe("illustrations des nœuds — chaque fiche montre quelque chose", () => {
  it("le tableau d'arbitrage couvre exactement le catalogue", () => {
    expect(Object.keys(ARBITRAGE).sort()).toEqual(KNOTS.map((k) => k.id).sort());
  });

  it("chaque fiche montre ce que l'arbitrage a décidé", () => {
    const reel: Record<string, string> = {};
    for (const k of KNOTS) {
      const seq = KNOT_STEPS[k.id] ?? [];
      reel[k.id] = SCHEMAS[k.id]
        ? "schema-maison"
        : seq[0]?.license === "Photographie originale"
          ? "photo-maison"
          : "commons-decoupe";
    }
    expect(reel).toEqual(ARBITRAGE);
  });

  it("plus aucune fiche ne reste sans illustration", () => {
    const nues = KNOTS.filter((k) => !SCHEMAS[k.id] && !(KNOT_STEPS[k.id] ?? []).length);
    expect(nues.map((k) => k.id)).toEqual([]);
  });
});
```

Ajouter en tête du fichier : `import { KNOT_STEPS } from "./knot-steps.gen";` et `import { SCHEMAS } from "../components/SchemaMontage";`. Supprimer les imports `ALL_KNOT_MEDIA` et `LOCAL_KNOT_MEDIA`, ainsi que les anciens tests qui les utilisaient (`chaque illustration Commons porte auteur…`, `chaque fichier référencé existe…`, `aucun fichier livré n'est invisible…`) : `knot-steps.test.ts` les couvre désormais sur la bonne source.

- [ ] **Step 2 : Lancer le test pour voir ce qui reste à nettoyer**

Run: `npm test -- src/data/knots.test.ts`
Expected: PASS si les tâches 4 à 8 sont faites. Un échec de « plus aucune fiche ne reste sans illustration » nomme la fiche restée nue.

- [ ] **Step 3 : Supprimer les schémas devenus morts**

`knot-diagrams.ts` ne servait qu'à `paternoster` et `raccord`, qui ont maintenant un schéma inline et une série photo.

```bash
git rm src/data/knot-diagrams.ts public/assets/knots/paternoster.svg public/assets/knots/raccord.svg
git rm public/assets/knots/palomar.webp public/assets/knots/cheveu.webp
```

Retirer aussi les clés `palomar` et `cheveu` de `KNOT_MEDIA` dans `src/data/media.ts`, et leurs entrées de `scripts/images.manifest.json` — sans quoi `npm run enrich` les retéléchargerait. **Le palomar en particulier ne doit pas pouvoir revenir une troisième fois.**

Dans `src/components/media-helpers.ts`, retirer l'import de `LOCAL_KNOT_MEDIA` et remplacer :

```ts
/** Fetched knot diagrams plus hand-drawn originals for rigs Commons lacks. */
export const ALL_KNOT_MEDIA = { ...KNOT_MEDIA, ...LOCAL_KNOT_MEDIA };
```

par :

```ts
/**
 * Les planches Commons entières. La fiche ne les montre plus — elle affiche la
 * séquence découpée (`KNOT_STEPS`) ou un schéma d'assemblage — mais la vignette
 * de la liste s'en sert encore, et l'écran Crédits les attribue.
 */
export const ALL_KNOT_MEDIA = KNOT_MEDIA;
```

- [ ] **Step 4 : Vérifier l'ensemble**

Run: `npm test && npm run lint && npm run build`
Expected: tout passe. Si un test échoue sur `LOCAL_KNOT_MEDIA` ailleurs, corriger l'appelant — la source a disparu, pas seulement changé.

- [ ] **Step 5 : Vérifier l'app en vrai**

Run: `npm run dev`. Parcourir les 15 fiches, en clair et en sombre. Critère de sortie : **aucune fiche sans illustration, aucun cadre vide, aucune image coupée.**

- [ ] **Step 6 : Commit**

```bash
git add -A
git commit -m "Nœuds : l'arbitrage dit l'état réel, et les schémas morts s'en vont"
```

Corps :
```
Les trois valeurs de la table dataient du temps où une fiche montrait une
planche entière ou rien. Elles disent maintenant ce qui est réellement à
l'écran — séquence découpée, schéma d'assemblage, série photographiée — et
un test de plus refuse qu'une fiche reste nue.

knot-diagrams.ts ne portait plus que paternoster.svg et raccord.svg, tous
deux remplacés : il part avec eux.
```

---

## Revue du plan

**Couverture du spec.** Chaque section du spec a sa tâche : le relevé de couverture Commons → tâche 4 (manifeste) ; « un nœud et un montage ne sont pas le même objet » → tâches 5 et 6 ; les trois producteurs d'images → tâches 4, 6-7, 8 ; le SVG assumé et son garde-fou → tâche 6 step 9 ; le texte séparé des images → tâches 1 et 4 ; la fiche verticale → tâches 2 et 5 ; la liste par besoin → tâche 3 ; la scission de l'écran → tâche 2 ; la table d'arbitrage → tâche 9 ; la dégradation propre → tâche 5 step 1 (test) et tâche 2. Les exclusions du spec (pas de pas-à-pas plein écran, pas de recherche texte, pas d'animation) ne produisent aucune tâche, ce qui est correct.

**Correspondance étapes / images, vérifiée fiche par fiche.** C'est l'invariant que le plan risque le plus de casser, parce que les deux nombres sont fixés dans deux tâches différentes :

| Fiche | Étapes | Source | Images |
|---|---|---|---|
| boucle | 3 | Commons, grille 1×3 | 3 |
| sang · albright · chaise · texan | 4 | Commons | 4 |
| clinch · palomar · raccord | 5 | photo maison | 5 clichés |
| paternoster · wacky | 4 | schéma | 4 repères |
| dropshot · carolina · anglaise · feeder · cheveu | 5 | schéma | 5 repères |

**Points d'attention connus, à traiter dans la tâche qui les rencontre :**

- Les `box` du manifeste (tâche 4, step 1) sont mesurées sur les vignettes 960 px, pas au pixel près sur l'original. La vérification à l'œil du step 5 reste obligatoire : une bande de couleur résiduelle en bord de vignette signale une `box` trop large.
- Le `drop` du script n'est utilisé par aucune entrée du manifeste actuel — les quatre planches à découper sont des grilles pleines. Le paramètre est conservé parce qu'un ajustement de découpe peut en avoir besoin, mais son absence d'emploi est normale et ne signale pas un oubli.
- La tâche 6 introduit `SCHEMAS`, que la tâche 9 importe depuis un test : c'est un composant importé par du code de test, ce qui est déjà le cas ailleurs dans le dépôt (`a11y-ecrans.test.tsx`).
- La tâche 8 est la seule à dépendre d'un travail hors code. Si les photos n'arrivent pas, les tâches 1 à 7 restent livrables et 12 fiches sur 15 sont illustrées ; `clinch` et `raccord` gardent leur illustration unique, et `palomar` s'affiche sans cadre. Dans ce cas, la tâche 9 ne peut pas passer telle quelle : son test « plus aucune fiche ne reste sans illustration » échouerait sur le palomar. Le nettoyage des schémas morts (step 3) reste faisable seul ; la table `ARBITRAGE` et son test attendent les photos.

**Ce qui a changé après examen des planches, par rapport au premier relevé.** Le relevé initial, fait sur les dimensions et les titres des fichiers, annonçait 7 découpes Commons, 6 schémas et 2 séries photo. Regarder les six planches a corrigé quatre points : le nœud de sang est en 2×2 et non 2×3 ; la boucle de chirurgien tient en 3 cases et non 4 ; le montage cheveu n'est pas une séquence mais un dessin unique ; et le palomar est noué sur un porte-clés en paracorde. La répartition réelle est donc **5 découpes, 7 schémas, 3 séries photo**. Le principe du spec ne bouge pas — c'est son arithmétique qui était fausse.
