# Liens matériel ↔ espèces + fil ↔ leurre Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Relier les 19 fiches du guide matériel aux fiches espèces (dans les deux sens)
et les leurres à leur fil recommandé (avec retour « utilisé avec » sur la fiche fil).

**Architecture:** Chaque lien n'a qu'une seule source de vérité (le `species[]`/`filIds`
stocké sur la fiche gear) ; l'autre sens se calcule au rendu en filtrant `GEAR_CARDS`,
jamais stocké en double. Deux mécanismes de navigation : `nav("fiche", { spId })`
(existant, déjà utilisé ailleurs) pour gear→espèce, et un nouveau `state.gearFocusId`
(même famille que `focusSpot` déjà dans `AppState`) pour espèce→gear et fil→leurre.

**Tech Stack:** React + TypeScript, Vitest.

## Global Constraints

- Après chaque tâche : `npx tsc -b`, `npx eslint src`, `npx vitest run` doivent être verts
  avant de commit.
- Aucune fiche gear ne perd son `summary`/`usage` actuel — seul `species` change de forme
  (texte libre → tableau d'ids), et `filIds`/`hamecon` s'ajoutent.
- Une fiche `fil` (`GEAR_CARDS.fil`) ne porte jamais elle-même de champ `filIds` — sa liste
  « Utilisé avec » se déduit toujours en scannant les leurres, jamais stockée.
- La section « Matériel recommandé » d'une fiche espèce n'apparaît que pour les 25 espèces
  de `CURATED_IDS` (`src/data/species.ts`), et seulement si au moins une fiche gear la cite
  — jamais de section vide.
- Chaque id référencé dans `species[]` ou `filIds` doit exister réellement (dans `SPECIES`
  ou `GEAR_CARDS.fil` respectivement) — testé, pas juste supposé.

---

## Task 1: Modèle de données — `GuideCard`, `gearFocusId`, tests

**Files:**
- Modify: `src/data/gear-cards.ts:1-11` (interface `GuideCard`)
- Modify: `src/store.tsx` (interface `AppState`, `initialState`)
- Modify: `src/data/gear-guide.test.ts`

**Interfaces:**
- Produces: `GuideCard.species?: string[]` (était `string`), `GuideCard.filIds?: string[]`,
  `GuideCard.hamecon?: string` ; `AppState.gearFocusId: string | null`. Les tâches
  suivantes consomment ces trois champs et ce champ d'état tels quels.

- [ ] **Step 1: Écrire le test qui échoue**

Lire d'abord `src/data/gear-guide.test.ts` en entier (fichier existant, 2 tests). Y ajouter
à la fin, à l'intérieur du `describe` existant :

```ts
  it("chaque id de species[] existe réellement dans SPECIES", () => {
    const ids = new Set(SPECIES.map((s) => s.id));
    const fautes: string[] = [];
    for (const cards of Object.values(GEAR_CARDS)) {
      for (const c of cards) {
        for (const spId of c.species ?? []) {
          if (!ids.has(spId)) fautes.push(`${c.id} → ${spId}`);
        }
      }
    }
    expect(fautes).toEqual([]);
  });

  it("chaque id de filIds existe réellement dans GEAR_CARDS.fil", () => {
    const filIds = new Set(GEAR_CARDS.fil.map((f) => f.id));
    const fautes: string[] = [];
    for (const cards of Object.values(GEAR_CARDS)) {
      for (const c of cards) {
        for (const fId of c.filIds ?? []) {
          if (!filIds.has(fId)) fautes.push(`${c.id} → ${fId}`);
        }
      }
    }
    expect(fautes).toEqual([]);
  });

  it("aucune fiche fil ne porte elle-même filIds (jamais de duplication à l'envers)", () => {
    const fautes = GEAR_CARDS.fil.filter((f) => f.filIds && f.filIds.length > 0).map((f) => f.id);
    expect(fautes).toEqual([]);
  });
```

Ajouter l'import nécessaire en haut du fichier (à côté de l'import existant de
`GEAR_CARDS`) :

```ts
import { SPECIES } from "./species";
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run src/data/gear-guide.test.ts`
Expected: FAIL — à ce stade `GuideCard.species` est encore `string` (Step 3 n'a pas encore
tourné) et chaque fiche gear porte encore du texte libre (ex. `"Sandre, perche, brochet,
black-bass"`). Une chaîne est elle-même itérable en JS/TS (caractère par caractère), donc
`for (const spId of c.species ?? [])` ne plante pas mais boucle sur chaque caractère : le
test collecte des dizaines de "fautes" du type `leurre-souple → S`, `leurre-souple → a`…
et `expect(fautes).toEqual([])` échoue — pour la bonne raison (les données ne sont pas
encore au format attendu), pas une erreur de compilation.

- [ ] **Step 3: Modifier `GuideCard`**

Dans `src/data/gear-cards.ts`, remplacer les lignes 1-11 :

```ts
/** Une fiche enrichie du guide matériel — leurres, appâts ou fils. Les
 *  hameçons (tailles) restent en tableau `GuideEntry[]` dans gear.ts : ce
 *  sont des plages de taille, pas des types distincts, la table est déjà la
 *  bonne représentation.
 *
 *  `species`, `filIds` et `hamecon` sont la SEULE source de vérité de leurs
 *  liens respectifs : une fiche espèce ne stocke jamais "je suis citée par
 *  X" (elle le déduit en filtrant GEAR_CARDS), et une fiche fil ne stocke
 *  jamais "ces leurres m'utilisent" (elle le déduit en scannant filIds). */
export interface GuideCard {
  id: string;
  name: string;
  summary: string; // ce que c'est
  usage: string; // comment/quand l'utiliser (animation, montage, saison)
  species?: string[]; // ids réels de SPECIES, tapables — jamais du texte libre
  filIds?: string[]; // leurres uniquement : ids vers GEAR_CARDS.fil
  hamecon?: string; // texte libre renvoyant à la table des tailles (ex. "N° 1 à 2/0") — pas un lien, la table n'a pas de fiches individuelles
}
```

- [ ] **Step 4: Ajouter `gearFocusId` à `AppState`**

Dans `src/store.tsx`, chercher la ligne `focusSpot: string | null;` dans l'interface
`AppState` et ajouter juste après :

```ts
  gearFocusId: string | null; // gear card id to scroll to & open when GuideMateriel mounts (from a fiche espèce or une autre carte gear)
```

Chercher `focusSpot: null,` dans `initialState` et ajouter juste après :

```ts
  gearFocusId: null,
```

- [ ] **Step 5: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run src/data/gear-guide.test.ts`
Expected: les 3 nouveaux tests passent avec des tableaux vides pour l'instant, PUISQUE les
19 fiches gear ont encore `species` en `string` (texte), pas en tableau — TypeScript va
refuser de compiler à ce stade tant que la Task 2 n'a pas converti les données. C'est
attendu : cette étape valide seulement que le TYPE et les NOUVEAUX TESTS sont corrects, la
Task 2 apporte les données conformes.

Run: `npx tsc -b`
Expected: FAIL — `src/data/gear-cards.ts` a maintenant un type `species?: string[]` mais
ses 19 entrées portent encore des valeurs `string`. C'est le signal attendu pour enchaîner
directement sur la Task 2 (elle fait passer ce fichier au vert).

- [ ] **Step 6: Commit**

```bash
git add src/data/gear-cards.ts src/store.tsx src/data/gear-guide.test.ts
git commit -m "Liens matériel : modèle de données (GuideCard, gearFocusId, tests)"
```

Note : ce commit laisse `tsc -b` rouge intentionnellement (Step 5 l'explique) — la Task 2,
qui suit immédiatement, corrige les données. Si tu exécutes ce plan avec une revue entre
chaque tâche, signale-le au relecteur : c'est le comportement attendu du découpage
TDD-first choisi ici (le type avant les données), pas un oubli.

---

## Task 2: Contenu — convertir `species` en ids réels sur les 19 fiches gear

**Files:**
- Modify: `src/data/gear-cards.ts` (les 19 entrées de `GEAR_CARDS`)

**Interfaces:**
- Consumes: `GuideCard` (Task 1).
- Produces: `GEAR_CARDS` avec `species: string[]` conforme au nouveau type, sur les 15
  fiches qui en ont un (7 leurres + 8 appâts ; les 4 fils n'ont jamais eu de `species`).

- [ ] **Step 1: Remplacer le tableau `leurre`**

Dans `src/data/gear-cards.ts`, remplacer entièrement le tableau `leurre: [...]` (7 entrées) :

```ts
  leurre: [
    {
      id: "leurre-souple",
      name: "Leurre souple (shad, finesse, virgule)",
      summary: "Corps en plastique souple monté sur une tête plombée, imite un petit poisson ou un ver par sa nage.",
      usage: "Lancer-ramener régulier ou saccadé, laisser couler entre deux tirées pour les touches à la descente. Adapter le grammage de la tête plombée à la profondeur et au courant.",
      species: ["sandre", "perche", "brochet", "black-bass"],
      filIds: ["tresse", "fluorocarbone"],
      hamecon: "Crochet intégré à la tête plombée, généralement N° 1 à 2/0.",
    },
    {
      id: "poisson-nageur",
      name: "Poisson-nageur (crank, jerk, minnow)",
      summary: "Leurre dur à bavette qui plonge et nage tout seul à la récupération, sans action du poignet nécessaire.",
      usage: "Récupération linéaire pour les cranks (la bavette fait le travail), ramener saccadé avec pauses pour les jerks. La taille de la bavette fixe la profondeur de nage.",
      species: ["brochet", "perche", "truite-fario", "truite-arc-en-ciel"],
      filIds: ["fluorocarbone"],
      hamecon: "Triples d'origine, généralement N° 6 à 2 selon la taille du leurre.",
    },
    {
      id: "cuiller-tournante",
      name: "Cuiller tournante",
      summary: "Une palette métallique tourne autour d'un axe, vibrations et flash très visibles de loin.",
      usage: "Lancer-ramener simple, vitesse constante pour que la palette tourne régulièrement. Efficace en eau claire ou légèrement teintée.",
      species: ["truite-fario", "truite-arc-en-ciel", "perche", "chevesne"],
      filIds: ["fluorocarbone"],
      hamecon: "Triple d'origine, N° 8 à 4.",
    },
    {
      id: "cuiller-ondulante",
      name: "Cuiller ondulante",
      summary: "Une palette métallique galbée ondule en tombant ou en nageant, sans axe ni rotation.",
      usage: "Se pêche aussi bien en lancer-ramener qu'en verticale (jig) où elle plane à la descente. Bonne portée de lancer grâce à son poids.",
      species: ["brochet", "truite-fario"],
      filIds: ["tresse", "bas-de-ligne-acier"],
      hamecon: "Triple ou simple d'origine, N° 6 à 1.",
    },
    {
      id: "spinnerbait",
      name: "Spinnerbait / chatterbait",
      summary: "Un bras métallique porte une ou deux palettes au-dessus d'une tête plombée à jupe ou brin souple — la palette protège l'hameçon des accrochages.",
      usage: "Ramener à travers les branchages et herbiers sans craindre l'accroc grâce au bras anti-herbe. Varier la vitesse pour faire vibrer ou tourner la palette.",
      species: ["brochet", "black-bass"],
      filIds: ["tresse", "bas-de-ligne-acier"],
      hamecon: "Simple intégré à la tête plombée, N° 1 à 2/0.",
    },
    {
      id: "popper-stickbait",
      name: "Popper / stickbait (surface)",
      summary: "Leurre qui reste en surface, gloups et éclaboussures pour le popper, nage en zigzag pour le stickbait — attaques visibles et spectaculaires.",
      usage: "Petites tirées sèches suivies de pauses pour le popper (le bruit attire) ; ramener en walking-the-dog (poignet qui balance) pour le stickbait. Idéal tôt le matin ou au crépuscule, eau calme.",
      species: ["black-bass", "chevesne", "perche"],
      filIds: ["tresse", "fluorocarbone"],
      hamecon: "Triples d'origine, N° 8 à 4.",
    },
    {
      id: "jig",
      name: "Leurre de traîne / jig",
      summary: "Tête plombée nue ou habillée, pêchée à la verticale ou en traîne lente sur le fond.",
      usage: "Descendre jusqu'au fond, animer par petites secousses du poignet en gardant le contact avec le fond, laisser retomber entre chaque animation.",
      species: ["sandre", "perche", "silure"],
      filIds: ["tresse"],
      hamecon: "Simple intégré, N° 1 à 3/0 selon le grammage.",
    },
  ],
```

- [ ] **Step 2: Remplacer le tableau `appat`**

Remplacer entièrement le tableau `appat: [...]` (8 entrées) :

```ts
  appat: [
    {
      id: "ver-de-terre",
      name: "Ver de terre / lombric",
      summary: "L'appât naturel le plus polyvalent, disponible partout, efficace sur presque toutes les espèces.",
      usage: "Piqué une ou deux fois pour rester vivant et remuant, ou en paquet pour les grosses bouches. Bon toute l'année, particulièrement après la pluie.",
      species: ["truite-fario", "truite-arc-en-ciel", "perche", "breme", "tanche", "anguille", "chevesne"],
      hamecon: "N° 10 à 4 selon la taille du ver et du poisson visé.",
    },
    {
      id: "asticot",
      name: "Asticot & pinkie",
      summary: "Larve de mouche, petite et très remuante, l'appât de référence de la pêche au coup.",
      usage: "Piqué par le bout le plus épais pour rester vivant, en paquet de 2-3 pour les grosses touches ou seul pour la finesse. S'amorce facilement en accompagnement.",
      species: ["gardon", "ablette", "breme"],
      hamecon: "N° 20 à 14, fins de fer.",
    },
    {
      id: "teigne",
      name: "Teigne / ver de farine",
      summary: "Larve de mite de la cire, résistante, dégage une odeur qui attire les poissons de rivière.",
      usage: "Piquée par la tête, se conserve facilement au frais plusieurs semaines. Très utilisée à la pêche au toc en dérive.",
      species: ["truite-fario", "perche"],
      hamecon: "N° 14 à 10.",
    },
    {
      id: "mais-doux",
      name: "Maïs doux",
      summary: "Grain sucré en boîte, sélectif — filtre les petits poissons et cible les plus gros.",
      usage: "2 à 3 grains piqués sur l'hameçon, réserve du jus utilisable en amorçage. Économique et facile à transporter.",
      species: ["carpe", "tanche", "gardon", "breme"],
      hamecon: "N° 8 à 4.",
    },
    {
      id: "pain-pate",
      name: "Pain / pâte",
      summary: "Mie de pain ou pâte pétrie à la farine, moulée directement autour de l'hameçon.",
      usage: "Façonnée en boulette juste avant de pêcher, se ramollit vite dans l'eau donc à renouveler souvent. Aussi utile en amorçage de surface pour le chevesne.",
      species: ["chevesne", "carpe", "gardon"],
      hamecon: "N° 8 à 4.",
    },
    {
      id: "bouillette",
      name: "Bouillette",
      summary: "Boule d'appât cuite à base de farines et arômes, calibrée en diamètre, conçue pour durer immergée.",
      usage: "Montée sur cheveu (voir montage cheveu), jamais piquée directement sur l'hameçon. Le parfum et la taille se choisissent selon la pression de pêche du plan d'eau.",
      species: ["carpe"],
      hamecon: "N° 4 à 2, monté sur cheveu (jamais piqué directement).",
    },
    {
      id: "vif",
      name: "Vif (petit poisson vivant)",
      summary: "Petit poisson vivant présenté entier, l'appât naturel le plus efficace pour les carnassiers.",
      usage: "Piqué à la lèvre supérieure pour nager librement, ou monté en pater-noster pour rester à un niveau donné. Vérifiez les espèces autorisées comme vif dans votre département.",
      species: ["brochet", "sandre", "perche"],
      hamecon: "N° 1 à 2/0, simple ou triple selon montage.",
    },
    {
      id: "ver-marin",
      name: "Vers marins (dur, arénicole)",
      summary: "Ver marin vendu en bourriche, odeur forte, prisé en zone d'influence marine.",
      usage: "Enfilé sur l'hameçon en laissant la pointe libre, à renouveler régulièrement car il s'assèche vite hors de l'eau.",
      species: ["flet", "mulet-cabot"],
      hamecon: "N° 4 à 1.",
    },
  ],
```

Le tableau `fil: [...]` (4 entrées) ne change pas — pas de `species`, `filIds` ni
`hamecon` sur les fils.

- [ ] **Step 3: Vérifier**

Run: `npx tsc -b && npx eslint src && npx vitest run src/data/gear-guide.test.ts`
Expected: tout passe. Les 3 tests de la Task 1 passent maintenant pour de vrai (tous les
ids de `species`/`filIds` existent réellement).

- [ ] **Step 4: Commit**

```bash
git add src/data/gear-cards.ts
git commit -m "Liens matériel : convertir species en ids réels, ajouter filIds et hamecon"
```

---

## Task 3: Écran `GuideMateriel` — puces tapables, retour fil↔leurre, deep-link

**Files:**
- Modify: `src/screens/Materiel.tsx:1-6` (imports), `:306-394` (`GuideMateriel`)
- Modify: `src/styles.css` (ajouts après le bloc `.gc-usage` existant)

**Interfaces:**
- Consumes: `GuideCard.species/filIds/hamecon` (Task 1-2), `AppState.gearFocusId` (Task 1),
  `useStore()` (existant : `state`, `set`, `nav`, `back`).
- Produces: rien de nouveau consommé par d'autres tâches — Task 4 branche sa propre
  navigation vers cet écran via `nav("guide-materiel", { gearFocusId })`, un appel qui
  n'a besoin d'aucune fonction exportée d'ici, juste du contrat `AppState.gearFocusId`
  déjà posé en Task 1.

- [ ] **Step 1: Lire le fichier actuel en entier**

Lire `src/screens/Materiel.tsx` en entier pour repartir de son état exact (notamment les
imports en tête de fichier et la fonction `GuideMateriel` telle qu'elle existe après le
chantier précédent).

- [ ] **Step 2: Mettre à jour les imports**

En tête de `src/screens/Materiel.tsx`, ajouter `useEffect` à l'import React existant (déjà
`import { useEffect, useState } from "react";` — vérifier qu'il est bien déjà là, sinon
l'ajouter) et ajouter l'import de `SPECIES` :

```ts
import { SPECIES } from "../data/species";
```

- [ ] **Step 3: Réécrire `GuideMateriel`**

Remplacer entièrement la fonction `GuideMateriel` (de `export function GuideMateriel() {`
jusqu'à son `}` fermant) par :

```tsx
export function GuideMateriel() {
  const { back, state, set, nav } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const sections: { key: "leurre" | "appat" | "fil"; title: string }[] = [
    { key: "leurre", title: "Leurres" },
    { key: "appat", title: "Appâts naturels" },
    { key: "fil", title: "Fils & lignes" },
  ];

  // Toutes les fiches à plat, pour chercher un id sans savoir dans quelle
  // catégorie il vit (nécessaire pour "utilisé avec" et le deep-link).
  const ALL_CARDS = [...GEAR_CARDS.leurre, ...GEAR_CARDS.appat, ...GEAR_CARDS.fil];
  const speciesName = (id: string) => SPECIES.find((s) => s.id === id)?.name ?? id;

  const focusCard = (id: string) => {
    setOpen(id);
    document.getElementById(`gear-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Deep-link depuis une fiche espèce (ou une autre carte gear) : consomme
  // gearFocusId une seule fois au montage, comme focusSpot le fait pour la
  // Carte (voir Carte.tsx). Pas de setState synchrone en tête d'effet : on
  // ne fait qu'ouvrir/scroller puis nettoyer l'état une fois consommé.
  useEffect(() => {
    if (state.gearFocusId) {
      focusCard(state.gearFocusId);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      set({ gearFocusId: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                // "Utilisé avec" n'existe que pour les fils : les leurres dont
                // filIds cite cet id, calculé ici plutôt que stocké (jamais de
                // duplication à l'envers — voir Global Constraints du plan).
                const usedBy = key === "fil" ? GEAR_CARDS.leurre.filter((l) => l.filIds?.includes(c.id)) : [];
                return (
                  <button
                    key={c.id}
                    id={`gear-${c.id}`}
                    type="button"
                    className={"gear-card" + (expanded ? " expanded" : "")}
                    onClick={() => setOpen(expanded ? null : c.id)}
                  >
                    <div className="gear-card-img">
                      <Media kind="gear" id={c.id} placeholder={c.name} />
                    </div>
                    <div className="gc-name">{c.name}</div>
                    <div className="gc-summary">{c.summary}</div>
                    {expanded && (
                      <div className="gc-usage">
                        <div>
                          <b>Usage :</b> {c.usage}
                        </div>
                        {c.hamecon && (
                          <div style={{ marginTop: 4 }}>
                            <b>Hameçon :</b> {c.hamecon}
                          </div>
                        )}
                        {c.species && c.species.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <b>Espèces :</b>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                              {c.species.map((spId) => (
                                <span
                                  key={spId}
                                  role="button"
                                  className="chip chip-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    nav("fiche", { spId });
                                  }}
                                >
                                  {speciesName(spId)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {c.filIds && c.filIds.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <b>Fil recommandé :</b>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                              {c.filIds.map((fId) => {
                                const f = GEAR_CARDS.fil.find((x) => x.id === fId);
                                return (
                                  <span
                                    key={fId}
                                    role="button"
                                    className="chip chip-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      focusCard(fId);
                                    }}
                                  >
                                    {f?.name ?? fId}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {usedBy.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <b>Utilisé avec :</b>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                              {usedBy.map((l) => (
                                <span
                                  key={l.id}
                                  role="button"
                                  className="chip chip-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    focusCard(l.id);
                                  }}
                                >
                                  {l.name}
                                </span>
                              ))}
                            </div>
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

Note : `ALL_CARDS` est calculé mais non utilisé dans ce JSX (l'« utilisé avec » filtre
directement `GEAR_CARDS.leurre`) — supprime cette variable si `eslint` la signale comme
inutilisée à la Step 4 (`no-unused-vars`) ; elle a été laissée dans la description ci-dessus
par cohérence de brouillon mais ne doit pas apparaître dans le code final si elle n'est
référencée nulle part. Vérifie et retire-la si besoin.

- [ ] **Step 4: Vérifier**

Run: `npx tsc -b && npx eslint src`
Expected: propre. Si `ALL_CARDS`/`speciesName` sont signalés inutilisés, corriger (retirer
`ALL_CARDS` s'il n'est vraiment pas lu ; `speciesName` doit rester, il est utilisé dans le
rendu des puces espèces).

Run: `npx vitest run`
Expected: tous les tests passent (aucun test n'exerce directement `GuideMateriel`, donc
cette étape vérifie surtout l'absence de régression ailleurs).

- [ ] **Step 5: Commit**

```bash
git add src/screens/Materiel.tsx
git commit -m "Guide matériel : puces espèces/fil tapables, retour utilisé avec, deep-link"
```

---

## Task 4: Fiche espèce — section « Matériel recommandé »

**Files:**
- Modify: `src/screens/Fiche.tsx` (imports en tête, insertion après le bloc `if (sp.fish)`
  à la ligne 204-222)

**Interfaces:**
- Consumes: `GEAR_CARDS` (Task 2), `CURATED_IDS` (déjà exporté par `src/data/species.ts`),
  `nav` (déjà disponible via `useStore()` dans ce fichier).

- [ ] **Step 1: Ajouter les imports**

En tête de `src/screens/Fiche.tsx`, ajouter :

```ts
import { GEAR_CARDS } from "../data/gear-cards";
import { CURATED_IDS } from "../data/species";
```

- [ ] **Step 2: Insérer la nouvelle section**

Juste après le bloc existant (lignes 204-222) :

```tsx
  if (sp.fish) {
    sections.push({
      id: "peche",
      title: "Où & comment le pêcher",
      sub: "Postes, leurres, techniques",
      render: () => (
        <>
          {sp.fish!.rows.map(([k, v], i) => (
            <div key={i} className="kv">
              <span className="k">{k}</span>
              <span className="v">
                <Glossed>{v}</Glossed>
              </span>
            </div>
          ))}
        </>
      ),
    });
  }
```

ajouter :

```tsx
  // Dérivé de GEAR_CARDS, jamais stocké côté espèce (voir Global Constraints
  // du plan "liens-materiel-especes") : seulement les 25 espèces vedettes, et
  // seulement si au moins une fiche gear cite cette espèce.
  const recommendedGear = CURATED_IDS.has(sp.id)
    ? [...GEAR_CARDS.leurre, ...GEAR_CARDS.appat].filter((c) => c.species?.includes(sp.id))
    : [];
  if (recommendedGear.length > 0) {
    sections.push({
      id: "materiel",
      title: "Matériel recommandé",
      sub: "Leurres et appâts pour cette espèce",
      render: () => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {recommendedGear.map((c) => (
            <span
              key={c.id}
              role="button"
              className="chip chip-sm"
              onClick={() => nav("guide-materiel", { gearFocusId: c.id })}
            >
              {c.name}
            </span>
          ))}
        </div>
      ),
    });
  }
```

Vérifier que `nav` est bien déjà déstructuré de `useStore()` en tête de la fonction qui
contient ce bloc (`FicheEspece` ou équivalent — regarder juste après `const { ... } =
useStore();` en début de fonction ; si `nav` n'y est pas, l'ajouter à la déstructuration
existante plutôt que d'appeler `useStore()` une seconde fois).

- [ ] **Step 3: Vérifier**

Run: `npx tsc -b && npx eslint src && npx vitest run`
Expected: tout vert.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Fiche.tsx
git commit -m "Fiche espèce : section Matériel recommandé pour les 25 espèces vedettes"
```

---

## Task 5: Vérification finale — build, tests, navigateur

**Files:** aucun.

- [ ] **Step 1: Suite complète**

Run: `npx tsc -b && npx eslint src && npx vitest run && npm run build`
Expected: tout vert, 0 warning.

- [ ] **Step 2: Vérifier gear → espèce dans le navigateur**

Démarrer le serveur de dev (`preview_start`, config `dev`), naviguer Accueil → Boîte à
outils → Matériel → Guide. Ouvrir la fiche « Leurre souple », taper la puce « Sandre ».
Expected : navigation vers la fiche Sandre.

- [ ] **Step 3: Vérifier espèce → gear**

Depuis la fiche Sandre, dérouler « Où & comment le pêcher », trouver la nouvelle section
« Matériel recommandé », taper une puce (ex. « Leurre souple »).
Expected : retour sur le Guide matériel, qui scrolle jusqu'à la fiche « Leurre souple » et
l'ouvre automatiquement (dépliée, `Usage`/`Espèces`/etc. visibles sans action
supplémentaire).

- [ ] **Step 4: Vérifier fil → leurre et retour**

Sur le Guide matériel, ouvrir « Leurre souple », taper la puce « Tresse » sous « Fil
recommandé ». Expected : la page scrolle jusqu'à la fiche Tresse, qui s'ouvre et affiche
« Utilisé avec » listant bien « Leurre souple » (et tout autre leurre référençant la
tresse). Taper ce nom ramène sur la fiche Leurre souple.

- [ ] **Step 5: Vérifier la console**

Run: `read_console_messages` (onlyErrors: true) sur l'onglet ouvert.
Expected: aucune erreur.

- [ ] **Step 6: Arrêter le serveur de dev**

Pas de commit (tâche de vérification uniquement). Si un problème est trouvé, revenir à la
tâche concernée, corriger, relancer ce Step 1.

---

## Self-review

**Couverture du spec** — modèle de données (Task 1), contenu des 19 fiches (Task 2), écran
Guide matériel avec les trois interactions (gear→espèce réutilise l'existant, fil↔leurre,
deep-link, Task 3), section espèce (Task 4), critères de réussite vérifiés en navigateur
(Task 5). Le hors-périmètre du spec (104 fiches base, guide cannes, fiches animations)
n'a aucune tâche, comme prévu.

**Balayage placeholders** — aucun « TBD » ; la seule zone d'incertitude explicite
(`ALL_CARDS` potentiellement inutilisé) est un point de vérification concret avec une
instruction claire (retirer si `eslint` le signale), pas un flou.

**Cohérence des types** — `GuideCard.species/filIds/hamecon` (Task 1) utilisés à
l'identique dans les Tasks 2-4 ; `AppState.gearFocusId` (Task 1) consommé à l'identique par
`GuideMateriel` (Task 3, lecture) et `Fiche.tsx` (Task 4, écriture via `nav`).
