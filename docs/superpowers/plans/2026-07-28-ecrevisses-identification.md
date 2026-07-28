# Écrevisses — identification et base légale — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner au module Écrevisses de quoi reconnaître une écrevisse (traits, confusions, photos), ajouter l'espèce manquante, et corriger la base légale que l'app énonce de travers.

**Architecture:** `Crayfish` gagne `statut`, `presence?` et un bloc `ident` calqué sur `Species.ident`. Les photos passent par le pipeline existant (`kind: "crayfish"`, comme `gear` avant elles). Un écran « Reconnaître » est atteignable depuis l'écran Écrevisses **et** depuis le bilan — le moment qui compte est l'écrevisse dans la main.

**Tech Stack:** React + TypeScript, Vitest.

## Global Constraints

- Après chaque tâche : `npx tsc -b`, `npx eslint src`, `npx vitest run` verts avant de commit.
- **Aucune valeur légale inventée.** Tout énoncé réglementaire trace vers R436-10, R432-5, l'arrêté du 21 juillet 1983, ou les arrêtés préfectoraux 2026 de l'Indre / de la Creuse. Ce qui n'a pas pu être vérifié (Loir-et-Cher) porte « à vérifier ».
- **Plus jamais « espèce protégée » comme base de l'interdiction de capture.** L'arrêté de 1983 ne protège que l'habitat, et pas les pattes grêles. La fermeture vient de R436-10 + arrêté préfectoral ouvrant zéro jour.
- Le sens sûr prime : dans le doute, relâcher / vérifier, jamais un feu vert.
- Photos sourcées : auteur, licence et URL réels, jamais les valeurs des dessins maison.

### Faits de référence établis (ne pas re-chercher)

- **R436-10** : « La pêche des écrevisses à pattes rouges (*Astacus astacus*), des torrents (*Astacus torrentium*), à pattes blanches (*Austropotamobius pallipes*) et à pattes grêles (*Astacus leptodactylus*) est autorisée pendant une période de dix jours consécutifs commençant le quatrième samedi de juillet. » C'est un **plafond**, l'ouverture effective demande l'arrêté préfectoral annuel.
- **Arrêtés 2026 Indre (n° 36-2025-12-03-00002) et Creuse (n° 23-2025-12-29-00001)** : ces quatre espèces sont « interdites toute l'année », 1ʳᵉ et 2ᵉ catégorie — zéro jour ouvert sur les dix possibles.
- **Arrêté du 21 juillet 1983, art. 1** : protège l'**habitat** (« interdit d'altérer et de dégrader sciemment les milieux particuliers à l'espèce ») de trois espèces seulement — pattes blanches, pattes rouges, des torrents. **Ne vise pas les pattes grêles** et n'interdit pas la capture par lui-même.
- **R432-5** : les trois envahissantes (signal, américaine, Louisiane) ; remise à l'eau vivante et transport à l'état vivant interdits, confirmé dans les tableaux des arrêtés 2026.
- **Loir-et-Cher (41)** : arrêté 2026 non récupéré ; fermeture déduite de la cohérence nationale, à marquer « à vérifier ».
- **Écrevisse des torrents** : confinée à l'Alsace, la Moselle et la Haute-Savoie. Ne figure sur les documents locaux que par recopie de la liste nationale de R436-10 → mention légale, **pas** de fiche d'identification.
- **Pattes rouges** : aucun relevé GBIF postérieur à 1990 sur 23/36/41, absente de la liste régionale de la DREAL Centre-Val de Loire ; aire d'origine au quart nord-est. Conservée quand même (elle reste nommée dans les arrêtés) avec une mention de présence incertaine.
- **Tri universel** : épine interne sur le carpopodite (segment juste avant la grosse pince) → Cambaridae (américaine, Louisiane). Pas d'épine → Astacidae (pattes blanches, rouges, grêles, et signal).
- Source d'identification : *Guide d'identification des écrevisses en France métropolitaine*, Fédérations Lorraine Pêche / FDAAPPMA 54, 2011.

---

## Task 1: Modèle de données, contenu des six espèces, tests

**Files:**
- Modify: `src/data/ecrevisses.ts`
- Modify: `src/data/ecrevisses.test.ts`

**Interfaces:**
- Produces: `Crayfish.statut: string`, `Crayfish.presence?: string`, `Crayfish.ident?: { summary; traits: string[]; conf: { n: string; how: string }[] }` ; `ECREVISSES` passe à 6 entrées ; nouvelle constante exportée `TRI_CARPOPODITE: string`.

- [ ] **Step 1: Mettre à jour le test qui fige la liste**

`src/data/ecrevisses.test.ts` contient `it("couvre les cinq espèces attendues", …)` qui fige les 5 ids. C'est le test qui fait son travail — il doit être **mis à jour délibérément**, jamais assoupli. Remplacer ce test par :

```ts
  it("couvre les six espèces attendues", () => {
    expect(ECREVISSES.map((e) => e.id).sort()).toEqual(
      ["americaine", "louisiane", "pattes-blanches", "pattes-grelles", "pattes-rouges", "signal"].sort(),
    );
  });
```

Et remplacer `it("les deux espèces protégées ne sont pas pêchables", …)` par :

```ts
  it("les trois espèces fermées ne sont pas pêchables", () => {
    for (const id of ["pattes-blanches", "pattes-grelles", "pattes-rouges"]) {
      expect(crayfishById(id)?.pechable).toBe(false);
    }
  });
```

Ajouter, dans le même `describe` :

```ts
  it("aucune espèce fermée ne fonde l'interdiction de capture sur « espèce protégée »", () => {
    // L'arrêté du 21 juillet 1983 ne protège que l'HABITAT, et pas les pattes
    // grêles. L'interdiction de capture vient de R436-10 + l'arrêté préfectoral
    // qui n'ouvre aucun des dix jours possibles. Dire « espèce protégée » comme
    // motif de fermeture, c'est citer le mauvais texte.
    for (const e of ECREVISSES.filter((x) => !x.pechable)) {
      expect(e.statut, `${e.id}.statut`).toMatch(/R436-10|arrêté préfectoral/i);
    }
  });

  it("chaque espèce porte une identification exploitable", () => {
    for (const e of ECREVISSES) {
      expect(e.ident, `${e.id}.ident`).toBeDefined();
      expect(e.ident!.traits.length, `${e.id}.traits`).toBeGreaterThanOrEqual(2);
      expect(e.ident!.summary.trim(), `${e.id}.summary`).not.toBe("");
    }
  });

  it("les confusions citées nomment une écrevisse réellement présente dans la liste", () => {
    const noms = new Set(ECREVISSES.map((e) => e.name.toLowerCase()));
    const inconnues: string[] = [];
    for (const e of ECREVISSES) {
      for (const c of e.ident?.conf ?? []) {
        if (!noms.has(c.n.toLowerCase())) inconnues.push(`${e.id} → ${c.n}`);
      }
    }
    expect(inconnues).toEqual([]);
  });

  it("les trois confusions décisives sont couvertes", () => {
    const conf = (id: string) => (crayfishById(id)?.ident?.conf ?? []).map((c) => c.n.toLowerCase());
    expect(conf("pattes-blanches")).toContain("écrevisse signal");
    expect(conf("pattes-rouges")).toContain("écrevisse de louisiane");
    expect(conf("pattes-grelles")).toContain("écrevisse à pattes rouges");
  });
```

Enfin, le test `it("la maille de 9 cm n'est jamais présentée comme une autorisation", …)` vérifie `MAILLE_NOTE` contre `/protégée/i` — ce mot disparaît de la note en Task 4. Remplacer son assertion par :

```ts
  it("la maille de 9 cm n'est jamais présentée comme une autorisation", () => {
    expect(MAILLE_NOTE).toMatch(/9 cm/);
    expect(MAILLE_NOTE).toMatch(/ne se pêche pas|fermée/i);
  });
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/data/ecrevisses.test.ts`
Expected: FAIL — 6 ids attendus mais 5 présents, `statut` et `ident` inexistants sur le type.

- [ ] **Step 3: Étendre le type**

Dans `src/data/ecrevisses.ts`, remplacer l'interface `Crayfish` par :

```ts
export interface Crayfish {
  id: string;
  name: string;
  latin: string;
  /** true = pêchable (envahissante) ; false = fermée toute l'année ici.
   *  Reste la réponse pratique au bord de l'eau (« puis-je la garder ? ») ;
   *  le mécanisme légal, lui, vit dans `statut`. */
  pechable: boolean;
  /** The one sentence that matters when the balance comes out of the water. */
  note: string;
  /** La base légale réelle. Surtout PAS « espèce protégée » pour justifier une
   *  interdiction de capture : l'arrêté du 21 juillet 1983 ne protège que
   *  l'habitat, ne vise pas les pattes grêles, et l'interdiction de pêcher vient
   *  de R436-10 (fenêtre de 10 jours max) que l'arrêté préfectoral n'ouvre pas. */
  statut: string;
  /** Renseigné seulement quand la présence locale est douteuse — l'app le dit
   *  plutôt que de présenter l'espèce comme banalement rencontrable. */
  presence?: string;
  /** Calqué sur Species.ident : même vocabulaire dans toute l'app. */
  ident?: {
    summary: string;
    traits: string[];
    conf: { n: string; how: string }[];
  };
}
```

- [ ] **Step 4: Écrire les six espèces**

Remplacer entièrement le tableau `ECREVISSES` par :

```ts
export const ECREVISSES: Crayfish[] = [
  {
    id: "louisiane",
    name: "Écrevisse de Louisiane",
    latin: "Procambarus clarkii",
    pechable: true,
    note: "Pêchable — remise à l'eau vivante et transport vivant interdits (R432-5).",
    statut:
      "Pêchable, sans taille minimale. Espèce susceptible de provoquer des déséquilibres biologiques (R432-5) : la remettre vivante à l'eau ou la transporter vivante est interdit.",
    ident: {
      summary:
        "La plus envahissante des écrevisses de France : grande, rouge sombre, les pinces couvertes de tubercules rouges saillants.",
      traits: [
        "Tubercules rouges sur toute la pince, pas seulement dessous",
        "Épine interne sur le carpopodite (famille des Cambaridae)",
        "Rostre à bords convergents, sans crête médiane",
        "Céphalothorax rugueux",
        "Peut dépasser 15 cm",
      ],
      conf: [
        {
          n: "Écrevisse à pattes rouges",
          how: "Vérifiez l'épine interne du carpopodite, le segment juste avant la grosse pince : la Louisiane en a une, la pattes rouges jamais. C'est le test le plus sûr — binaire, indépendant de la lumière, et il marche même sur les juvéniles. Ne vous fiez pas à la couleur : la Louisiane va du bordeaux à l'olive.",
        },
      ],
    },
  },
  {
    id: "americaine",
    name: "Écrevisse américaine",
    latin: "Faxonius limosus",
    pechable: true,
    note: "Pêchable — remise à l'eau vivante et transport vivant interdits (R432-5).",
    statut:
      "Pêchable, sans taille minimale. Espèce susceptible de provoquer des déséquilibres biologiques (R432-5) : la remettre vivante à l'eau ou la transporter vivante est interdit.",
    ident: {
      summary:
        "Petite écrevisse envahissante, la plus anciennement installée en France, reconnaissable aux bandes rougeâtres en travers de l'abdomen.",
      traits: [
        "Bandes rougeâtres en travers des anneaux de l'abdomen",
        "Épine interne sur le carpopodite (famille des Cambaridae)",
        "Rostre en gouttière, à bords parallèles",
        "Épines avant et après le sillon cervical",
        "Taille modeste, dépasse rarement 10 cm",
      ],
      conf: [
        {
          n: "Écrevisse de Louisiane",
          how: "Toutes deux ont l'épine du carpopodite, donc toutes deux sont pêchables — l'erreur est sans conséquence légale. L'américaine reste plus petite et porte des bandes nettes en travers de l'abdomen, là où la Louisiane est uniformément rouge sombre à tubercules.",
        },
      ],
    },
  },
  {
    id: "signal",
    name: "Écrevisse signal",
    latin: "Pacifastacus leniusculus",
    pechable: true,
    note: "Pêchable — remise à l'eau vivante et transport vivant interdits (R432-5).",
    statut:
      "Pêchable, sans taille minimale. Espèce susceptible de provoquer des déséquilibres biologiques (R432-5) : la remettre vivante à l'eau ou la transporter vivante est interdit.",
    ident: {
      summary:
        "Grosse écrevisse envahissante nord-américaine, lisse et trapue. Une tache claire à l'articulation de chaque pince lui donne son nom — et c'est elle qui la distingue de l'espèce fermée qu'on lui confond le plus.",
      traits: [
        "Tache blanche à bleutée à l'articulation de la pince — le « signal »",
        "Deux crêtes derrière l'œil",
        "Céphalothorax lisse",
        "Pinces lisses, rouges en dessous",
        "Rostre à bords parallèles",
      ],
      conf: [
        {
          n: "Écrevisse à pattes blanches",
          how: "C'est la confusion qui coûte cher : la pattes blanches est fermée toute l'année. Cherchez la tache claire à l'articulation de la pince — le signal en a une, la pattes blanches aucune. Le dessous des pinces (rouge chez le signal, blanc chez la pattes blanches) confirme, mais se juge mal sur un animal couvert de vase. Dans le doute, relâchez.",
        },
      ],
    },
  },
  {
    id: "pattes-blanches",
    name: "Écrevisse à pattes blanches",
    latin: "Austropotamobius pallipes",
    pechable: false,
    note: "Remise à l'eau immédiate, sans la sortir de l'eau si possible.",
    statut:
      "Pêche fermée toute l'année dans l'Indre et la Creuse (arrêtés préfectoraux 2026). R436-10 prévoit une fenêtre de dix jours au maximum, que ces arrêtés n'ouvrent pas. L'arrêté du 21 juillet 1983 protège en outre son habitat. Loir-et-Cher : à vérifier sur l'arrêté en vigueur.",
    ident: {
      summary:
        "La seule écrevisse autochtone encore régulièrement observée dans la région. Corps brun-olive, pinces rugueuses dont le dessous est blanc sale — d'où son nom.",
      traits: [
        "Une seule crête derrière l'œil (les autres en ont deux)",
        "Dessous des pinces blanc à beige",
        "Rostre triangulaire, à bords lisses",
        "Pinces rugueuses, granuleuses",
        "Taille courante 8–9 cm",
      ],
      conf: [
        {
          n: "Écrevisse signal",
          how: "Le signal porte une tache blanc-turquoise nette à l'articulation de la pince ; la pattes blanches n'en a aucune. Vérifiez cela en premier : c'est une marque franche, là où la couleur du dessous des pinces se juge mal sur un animal boueux. Le signal a aussi deux crêtes derrière l'œil au lieu d'une.",
        },
      ],
    },
  },
  {
    id: "pattes-grelles",
    name: "Écrevisse à pattes grêles",
    latin: "Astacus leptodactylus",
    pechable: false,
    note: "Remise à l'eau immédiate.",
    statut:
      "Pêche fermée toute l'année dans l'Indre et la Creuse (arrêtés préfectoraux 2026), au même titre que les autres écrevisses visées par R436-10. Introduite au XIXᵉ siècle mais considérée aujourd'hui comme autochtone ; l'arrêté de 1983 sur l'habitat ne la vise pas. Loir-et-Cher : à vérifier.",
    ident: {
      summary:
        "Écrevisse au corps clair et aux pinces remarquablement longues et étroites, qui lui valent son nom. La DREAL Centre-Val de Loire la compte parmi les cinq espèces de la région.",
      traits: [
        "Pinces longues, étroites, effilées — le trait qui la nomme",
        "Deux crêtes derrière l'œil",
        "Crête médiane du rostre dentelée",
        "Face ventrale beige, petite tache rouge à l'articulation de la pince",
        "Épines sur les flancs et sur les pinces",
      ],
      conf: [
        {
          n: "Écrevisse à pattes rouges",
          how: "Même famille, même nombre de crêtes derrière l'œil, même rostre dentelé : aucun repère anatomique franc ne les sépare. Ce sont les pinces qui tranchent — nettement plus longues et fines ici — et le dessous, beige contre rouge vif. C'est un jugement, pas un test ; les deux sont fermées de toute façon, donc l'erreur entre elles est sans conséquence.",
        },
      ],
    },
  },
  {
    id: "pattes-rouges",
    name: "Écrevisse à pattes rouges",
    latin: "Astacus astacus",
    pechable: false,
    note: "Remise à l'eau immédiate.",
    statut:
      "Pêche fermée toute l'année dans l'Indre et la Creuse (arrêtés préfectoraux 2026) ; R436-10 prévoit une fenêtre de dix jours au maximum que ces arrêtés n'ouvrent pas. Habitat protégé par l'arrêté du 21 juillet 1983. Loir-et-Cher : à vérifier.",
    presence:
      "Présence actuelle incertaine dans les départements couverts : aucun relevé postérieur à 1990, et la DREAL Centre-Val de Loire ne la compte pas parmi les espèces de la région (son aire d'origine est le quart nord-est). Elle reste nommée dans les arrêtés, donc conservée ici par précaution.",
    ident: {
      summary:
        "Grande écrevisse brun-olive aux pinces massives et rugueuses, dont le dessous est franchement rouge.",
      traits: [
        "Deux crêtes derrière l'œil",
        "Dessous des pinces rouge vif",
        "Crête médiane du rostre dentelée",
        "Pinces massives et rugueuses",
        "Épines derrière le sillon cervical",
      ],
      conf: [
        {
          n: "Écrevisse de Louisiane",
          how: "Vérifiez l'épine interne du carpopodite, le segment juste avant la grosse pince : la Louisiane en a une, la pattes rouges jamais. Test binaire, indépendant de la couleur — qui trompe, la Louisiane allant du bordeaux à l'olive — et valable sur les juvéniles.",
        },
        {
          n: "Écrevisse à pattes grêles",
          how: "Très proches. Les pinces de la pattes grêles sont nettement plus longues et effilées, et son dessous est beige là où celui de la pattes rouges est rouge vif. Les deux sont fermées, donc se tromper entre elles ne porte pas à conséquence.",
        },
      ],
    },
  },
];
```

- [ ] **Step 5: Ajouter le tri universel**

Toujours dans `src/data/ecrevisses.ts`, ajouter après `PECHABLES` :

```ts
/** Le premier tri à faire, parce qu'il tranche six espèces d'un coup et qu'il ne
 *  dépend ni de la couleur ni de la lumière. Affiché en tête de l'écran
 *  d'identification. */
export const TRI_CARPOPODITE =
  "Regardez le carpopodite — le segment juste avant la grosse pince. S'il porte une épine interne, c'est une envahissante nord-américaine (américaine ou Louisiane), pêchable. Sinon, c'est une écrevisse de la famille des Astacidae : signal (pêchable), ou l'une des trois espèces fermées toute l'année.";

/** Mise en garde à afficher avec les critères : ils valent pour des adultes, et
 *  la couleur varie au sein d'une même population. */
export const IDENT_CAVEAT =
  "Ces critères sont moins fiables sur les juvéniles, et la couleur varie d'un individu à l'autre. Quand la décision est légale, ne tranchez jamais sur la seule couleur : dans le doute, relâchez.";
```

- [ ] **Step 6: Lancer, vérifier le succès**

Run: `npx vitest run src/data/ecrevisses.test.ts && npx tsc -b && npx eslint src && npx vitest run`
Expected: tout vert. Si un autre test casse (le bilan, `lib/ecrevisses`), c'est une vraie régression à corriger, pas un test à assouplir — le signaler dans le rapport.

- [ ] **Step 7: Commit**

```bash
git add src/data/ecrevisses.ts src/data/ecrevisses.test.ts
git commit -m "Écrevisses : identification, pattes grêles, et la vraie base légale"
```

---

## Task 2: Photos — pipeline et six images

**Files:**
- Modify: `scripts/images.manifest.json`
- Modify: `scripts/fetch-images.mjs`
- Modify: `src/data/media.ts` (régénéré par le script)
- Modify: `src/components/media-helpers.ts`
- Modify: `src/components/Media.tsx`

**Interfaces:**
- Consumes: les six ids de `ECREVISSES` (Task 1).
- Produces: `CRAYFISH_MEDIA: Record<string, MediaEntry>` ; `kind: "crayfish"` accepté par `<Media>`.

- [ ] **Step 1: Ajouter la clé `crayfish` au manifeste**

Dans `scripts/images.manifest.json`, ajouter une clé top-level `crayfish` (les six fichiers ont été vérifiés visuellement pendant la recherche — ne pas les re-chercher) :

```json
"crayfish": [
  {
    "id": "pattes-blanches",
    "filename": "File:Austropotamobius pallipes.jpg",
    "author": "David Gerke",
    "license": "CC BY-SA 3.0",
    "file_page_url": "https://commons.wikimedia.org/wiki/File:Austropotamobius_pallipes.jpg"
  },
  {
    "id": "pattes-grelles",
    "filename": "File:Astacus leptodactylus 02.jpg",
    "author": "Bjoertvedt",
    "license": "CC BY-SA 3.0",
    "file_page_url": "https://commons.wikimedia.org/wiki/File:Astacus_leptodactylus_02.jpg"
  },
  {
    "id": "pattes-rouges",
    "filename": "File:European crayfish (Astacus astacus).jpg",
    "author": "Anna N Chapman",
    "license": "CC0",
    "file_page_url": "https://commons.wikimedia.org/wiki/File:European_crayfish_(Astacus_astacus).jpg"
  },
  {
    "id": "signal",
    "filename": "File:Signal crayfish female Pacifastacus leniusculus.JPG",
    "author": "Astacoides",
    "license": "CC BY-SA 3.0",
    "file_page_url": "https://commons.wikimedia.org/wiki/File:Signal_crayfish_female_Pacifastacus_leniusculus.JPG"
  },
  {
    "id": "americaine",
    "filename": "File:Kamberkrebs Faxonius limosus syn Orconectes limosus.jpg",
    "author": "Holger Krisp",
    "license": "CC BY 4.0",
    "file_page_url": "https://commons.wikimedia.org/wiki/File:Kamberkrebs_Faxonius_limosus_syn_Orconectes_limosus.jpg"
  },
  {
    "id": "louisiane",
    "filename": "File:Procambarus clarkii.jpg",
    "author": "MikeMurphy",
    "license": "Domaine public",
    "file_page_url": "https://commons.wikimedia.org/wiki/File:Procambarus_clarkii.jpg"
  }
]
```

- [ ] **Step 2: Étendre le script**

Dans `scripts/fetch-images.mjs`, après la ligne qui produit `gearMedia`, ajouter :

```js
const crayfishMedia = await processGroup(manifest.crayfish || [], "crayfish", "crayfish");
```

Dans le template qui écrit `src/data/media.ts`, après l'export de `GEAR_MEDIA`, ajouter :

```js
export const CRAYFISH_MEDIA: Record<string, MediaEntry> = ${JSON.stringify(crayfishMedia, null, 2)};
```

Et compléter la ligne de log finale avec `, ${Object.keys(crayfishMedia).length} crayfish`.

- [ ] **Step 3: Brancher le composant**

Dans `src/components/media-helpers.ts`, ajouter `CRAYFISH_MEDIA` à l'import depuis `../data/media` puis à `MEDIA_BY_KIND` :

```ts
  crayfish: CRAYFISH_MEDIA,
```

Dans `src/components/Media.tsx`, étendre l'union :

```ts
  kind: "species" | "knot" | "recipe" | "technique" | "gear" | "crayfish";
```

- [ ] **Step 4: Lancer le script**

Run: `node scripts/fetch-images.mjs`
Expected: six fichiers écrits sous `public/assets/crayfish/`, `media.ts` régénéré avec un `CRAYFISH_MEDIA` réel.

- [ ] **Step 5: REGARDER les six images produites**

Ouvrir chacun des six `.webp` sous `public/assets/crayfish/` avec l'outil Read (qui affiche les images) et confirmer, pour chacune : l'animal est net, entier, reconnaissable, sans filigrane. **Vérifier en particulier que la photo du signal montre bien la tache claire à l'articulation de la pince** — c'est le critère décisif de la confusion la plus grave, et c'est ce qui justifie cette photo. Ce projet a deux fois embarqué une mauvaise image en se fiant à la description Commons : regarder les pixels n'est pas optionnel.

Si une image est inutilisable après recadrage, retirer son entrée du manifeste plutôt que de l'embarquer — une fiche sans photo est un repli propre et accepté.

- [ ] **Step 6: Vérifier**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Expected: vert.

- [ ] **Step 7: Commit**

```bash
git add scripts/images.manifest.json scripts/fetch-images.mjs src/data/media.ts src/components/media-helpers.ts src/components/Media.tsx public/assets/crayfish/
git commit -m "Écrevisses : six photos sourcées et vérifiées à l'œil"
```

---

## Task 3: Écran « Reconnaître » et ses deux accès

**Files:**
- Create: `src/screens/EcrevissesIdent.tsx`
- Modify: `src/store.tsx` (union `Screen`)
- Modify: `src/App.tsx` (lazy-import + branche de rendu)
- Modify: `src/screens/Ecrevisses.tsx` (accès)
- Modify: `src/components/BilanEcrevisses.tsx` (accès)
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `ECREVISSES`, `TRI_CARPOPODITE`, `IDENT_CAVEAT` (Task 1) ; `<Media kind="crayfish">` (Task 2).
- Produces: `Screen` accepte `"ecrevisses-ident"` ; composant exporté `EcrevissesIdent`.

- [ ] **Step 1: Ajouter la route**

Dans `src/store.tsx`, ajouter `| "ecrevisses-ident"` à l'union `Screen` (à la suite de `"ecrevisses"`).

- [ ] **Step 2: Créer l'écran**

Créer `src/screens/EcrevissesIdent.tsx` :

```tsx
import { useStore } from "../store-hooks";
import { ECREVISSES, TRI_CARPOPODITE, IDENT_CAVEAT } from "../data/ecrevisses";
import { Media } from "../components/Media";

export function EcrevissesIdent() {
  const { back } = useStore();

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div className="topbar-title">Reconnaître les écrevisses</div>
      </div>
      <div style={{ padding: "6px 18px 26px" }}>
        <div className="ecr-tri">
          <div className="ecr-tri-t">Le premier tri</div>
          <div className="ecr-tri-x">{TRI_CARPOPODITE}</div>
        </div>

        {ECREVISSES.map((e) => (
          <div key={e.id} className={"ecr-id" + (e.pechable ? "" : " protegee")}>
            <div className="ecr-id-ph">
              <Media kind="crayfish" id={e.id} placeholder={e.name} />
            </div>
            <div className="ecr-id-n">{e.name}</div>
            <div className="ecr-id-l">{e.latin}</div>
            <div className={"ecr-id-st" + (e.pechable ? "" : " ferme")}>{e.statut}</div>
            {e.presence && <div className="ecr-id-pr">{e.presence}</div>}
            {e.ident && (
              <>
                <div className="ecr-id-sum">{e.ident.summary}</div>
                <ul className="ecr-id-tr">
                  {e.ident.traits.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                {e.ident.conf.map((c) => (
                  <div key={c.n} className="ecr-id-cf">
                    <b>Ne pas confondre avec {c.n}</b>
                    <div>{c.how}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        ))}

        <div className="info" style={{ marginTop: 18 }}>
          {IDENT_CAVEAT}
        </div>
        <div className="ecr-reg-note" style={{ marginTop: 12 }}>
          L'écrevisse des torrents (<i>Austropotamobius torrentium</i>) est citée par les arrêtés
          préfectoraux, qui reprennent la liste nationale de R436-10 : elle vit en Alsace, en Moselle
          et en Haute-Savoie, pas ici. Elle n'a donc pas de fiche d'identification dans cette app.
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Router l'écran**

Dans `src/App.tsx`, ajouter le lazy-import auprès des autres :

```tsx
const EcrevissesIdent = lazy(() =>
  import("./screens/EcrevissesIdent").then((m) => ({ default: m.EcrevissesIdent })),
);
```

Et la branche de rendu, à côté de celle de `"ecrevisses"` :

```tsx
        {s === "ecrevisses-ident" && <EcrevissesIdent />}
```

- [ ] **Step 4: Premier accès — écran Écrevisses**

Dans `src/screens/Ecrevisses.tsx`, ajouter `nav` à la déstructuration de `useStore()` si absent, puis insérer, juste AVANT le `<div className="ecr-reg">` :

```tsx
        <button className="btn-light ecr-more" onClick={() => nav("ecrevisses-ident")}>
          Reconnaître les écrevisses
        </button>
```

- [ ] **Step 5: Second accès — bilan de séance**

Dans `src/components/BilanEcrevisses.tsx`, ajouter `nav` à la déstructuration de `useStore()`, puis insérer juste APRÈS le bloc `{!showAll && (…)}` :

```tsx
        <button className="btn-light ecr-more" onClick={() => nav("ecrevisses-ident")}>
          Laquelle ai-je relevée ?
        </button>
```

- [ ] **Step 6: Styles**

Ajouter à la fin de `src/styles.css` :

```css
.ecr-tri {
  border: 1.5px solid var(--green-dark);
  background: #eef4f0;
  border-radius: 16px;
  padding: 13px 14px;
  margin-bottom: 16px;
}
.ecr-tri-t {
  font-size: 13px;
  font-weight: 700;
  color: var(--green-dark);
  margin-bottom: 4px;
}
.ecr-tri-x {
  font-size: 13px;
  line-height: 1.5;
  color: var(--body);
}
.ecr-id {
  border: 1.5px solid var(--line-strong);
  border-radius: 16px;
  background: #fff;
  padding: 12px;
  margin-bottom: 14px;
}
.ecr-id.protegee {
  border-color: var(--red);
  background: #fdf3f1;
}
.ecr-id-ph {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 10px;
  background: #e7ece6;
  margin-bottom: 10px;
}
.ecr-id-n {
  font-size: 15px;
  font-weight: 650;
}
.ecr-id-l {
  font-size: 11.5px;
  font-style: italic;
  color: var(--muted);
  margin-top: 1px;
}
.ecr-id-st {
  font-size: 12px;
  line-height: 1.45;
  margin-top: 7px;
  color: var(--body);
}
.ecr-id-st.ferme {
  color: #8c2f24;
  font-weight: 600;
}
.ecr-id-pr {
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--muted);
  margin-top: 5px;
  font-style: italic;
}
.ecr-id-sum {
  font-size: 13px;
  line-height: 1.5;
  margin-top: 9px;
}
.ecr-id-tr {
  margin: 8px 0 0;
  padding-left: 18px;
  font-size: 12.5px;
  line-height: 1.55;
}
.ecr-id-cf {
  margin-top: 10px;
  padding-top: 9px;
  border-top: 1px solid var(--line-strong);
  font-size: 12.5px;
  line-height: 1.5;
}
```

- [ ] **Step 7: Vérifier**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Expected: vert.

- [ ] **Step 8: Commit**

```bash
git add src/screens/EcrevissesIdent.tsx src/store.tsx src/App.tsx src/screens/Ecrevisses.tsx src/components/BilanEcrevisses.tsx src/styles.css
git commit -m "Écrevisses : écran Reconnaître, atteignable depuis la séance et le bilan"
```

---

## Task 4: Bloc réglementaire — base légale, saisonnalité, torrents

**Files:**
- Modify: `src/data/ecrevisses.ts` (`REG_BALANCES`, `MAILLE_NOTE`, `REG_SOURCE`)

- [ ] **Step 1: Corriger la note de maille**

La note actuelle dit que l'écrevisse à pattes rouges « est protégée » — mauvais mécanisme. Remplacer `MAILLE_NOTE` par :

```ts
export const MAILLE_NOTE =
  "Une maille de 9 cm figure au R436-18 pour l'écrevisse à pattes rouges, mais elle ne se pêche pas ici : les arrêtés préfectoraux 2026 de l'Indre et de la Creuse n'ouvrent aucun des dix jours que R436-10 rend possibles (Loir-et-Cher : à vérifier). Les trois espèces pêchables n'ont pas de taille minimale.";
```

- [ ] **Step 2: Ajouter la saisonnalité et la mention des torrents**

Remplacer `REG_BALANCES` par :

```ts
export const REG_BALANCES = [
  "6 balances au maximum par pêcheur (repère national) — jusqu'à 10 dans certains départements.",
  "Diamètre maximal d'une balance : 30 cm.",
  "Espèces pêchables : 1ʳᵉ catégorie du 14/03 au 20/09, 2ᵉ catégorie toute l'année (Indre 2026). L'app ne sait pas sur quelle catégorie d'eau vous êtes — vérifiez.",
  "Écrevisses à pattes blanches, rouges, grêles et des torrents : pêche fermée toute l'année (Indre et Creuse 2026).",
  "Périodes et cours d'eau autorisés : vérifiez l'arrêté préfectoral en vigueur.",
];
```

- [ ] **Step 3: Compléter la source**

```ts
export const REG_SOURCE =
  "Code de l'environnement, art. R436-10 · R436-18 · R436-23 à R436-29 · R432-5 · arrêté du 21 juillet 1983 · arrêtés préfectoraux 2026 (36, 23)";
```

- [ ] **Step 4: Vérifier**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Expected: vert — le test de `MAILLE_NOTE` a été ajusté en Task 1 pour ne plus exiger le mot « protégée ».

- [ ] **Step 5: Commit**

```bash
git add src/data/ecrevisses.ts
git commit -m "Écrevisses : bloc réglementaire — saisonnalité, torrents, base légale exacte"
```

---

## Task 5: Garde d'existence des photos

**Files:**
- Modify: `src/data/ecrevisses.test.ts`

- [ ] **Step 1: Ajouter le test**

Même garde que celles posées récemment pour les nœuds et le matériel : un nom de fichier mal tapé dégraderait silencieusement en placeholder sans faire échouer la CI. Ajouter à `src/data/ecrevisses.test.ts` :

```ts
import { existsSync } from "node:fs";
import { join } from "node:path";
import { CRAYFISH_MEDIA } from "./media";

describe("photos écrevisses", () => {
  it("chaque photo référencée existe sous public/", () => {
    const manquants = Object.entries(CRAYFISH_MEDIA)
      .filter(([, m]) => !existsSync(join(process.cwd(), "public", m.file)))
      .map(([id, m]) => `${id} → ${m.file}`);
    expect(manquants).toEqual([]);
  });

  it("chaque photo pointe vers une espèce existante", () => {
    const ids = new Set(ECREVISSES.map((e) => e.id));
    const orphelines = Object.keys(CRAYFISH_MEDIA).filter((id) => !ids.has(id));
    expect(orphelines).toEqual([]);
  });
});
```

- [ ] **Step 2: Démontrer le RED**

Pointer temporairement une entrée de `CRAYFISH_MEDIA` vers un fichier inexistant, lancer le test, confirmer l'échec, restaurer. Reporter la preuve.

- [ ] **Step 3: Vérifier et commit**

Run: `npx tsc -b && npx eslint src && npx vitest run`

```bash
git add src/data/ecrevisses.test.ts
git commit -m "Tests : garder l'existence des photos d'écrevisses"
```

---

## Task 6: Vérification finale

**Files:** aucun.

- [ ] **Step 1: Suite complète**

Run: `npx tsc -b && npx eslint src && npx vitest run && npm run build`
Expected: tout vert, 0 warning.

- [ ] **Step 2: Vérifier l'écran au navigateur**

Démarrer le serveur de dev. Accueil → Boîte à outils → Écrevisses → « Reconnaître les écrevisses ». Expected : le tri carpopodite en tête, puis six fiches ; les trois fermées sur fond rouge, les trois pêchables sur fond blanc ; chaque fiche avec sa photo, ses traits et ses confusions.

- [ ] **Step 3: Vérifier le second accès**

Démarrer une séance, ouvrir le bilan, confirmer que « Laquelle ai-je relevée ? » y figure et mène au même écran.

- [ ] **Step 4: Vérifier la photo du signal**

Sur la fiche « Écrevisse signal », confirmer que la photo affichée laisse voir la tache claire à l'articulation de la pince — c'est le critère que le texte demande de vérifier, il doit être visible sur l'image qui l'accompagne.

- [ ] **Step 5: Console**

`read_console_messages` (onlyErrors: true). Expected : aucune erreur.

- [ ] **Step 6: Arrêter le serveur.** Pas de commit.

---

## Hors périmètre

- **Écrevisse des torrents en fiche d'identification** — absente de la région, mentionnée en texte seulement.
- **Calicot, *F. juvenilis*, marbrée, *Cherax*** — aucune présence documentée près des départements couverts.
- **Ouverture/fermeture calculée pour les écrevisses pêchables** — dépend de la catégorie piscicole de l'eau, que l'app ne connaît pas. Les deux cas sont énoncés, rien n'est calculé.
- **Vérification de l'arrêté 2026 du Loir-et-Cher** — non récupérable ; l'app porte « à vérifier » pour ce département.
