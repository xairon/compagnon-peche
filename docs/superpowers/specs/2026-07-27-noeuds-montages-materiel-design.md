# Nœuds, montages & guide matériel — refonte en tutoriels pas-à-pas

_Conception validée le 27 juillet 2026._

## Intention

Autoportant : lisible sans aucun contexte externe.

La section « Nœuds & montages » de l'app est restée au stade de squelette depuis sa
création : **7 fiches seulement** (4 nœuds, 3 montages), chacune avec **une seule image**
au-dessus d'étapes en texte pur — pas de séquence visuelle qui suit réellement la main du
pêcheur. Le guide matériel (`GEAR_GUIDE`) est dans le même état : quatre listes de
23 entrées au total, chacune réduite à un nom et une phrase, sans photo.

Objectif : porter les nœuds/montages à **15 fiches**, chacune avec une **vraie séquence
illustrée étape par étape** (pas un schéma unique), et enrichir le guide matériel (leurres,
appâts, fils) en fiches détaillées avec photo quand une existe sous licence libre.

## Périmètre

**Dans le périmètre :**
- 15 fiches nœuds/montages, chacune avec illustration par étape.
- Guide matériel enrichi : leurres (7), appâts (8), fils (4) en fiches détaillées avec
  photo si sourçable ; hameçons (tailles) reste en tableau mais avec un texte plus complet.
- Extension du pipeline d'images existant (`fetch-images.mjs` + `images.manifest.json`)
  pour supporter plusieurs images par fiche (nœud ou matériel), pas une seule.
- Tests couvrant la cohérence étapes/illustrations.

**Hors périmètre (explicitement) :**
- Cannes, moulinets, flotteurs, plombs, accessoires : ces catégories n'ont aujourd'hui
  aucun contenu de guide (seulement des tags pour le matériel personnel de l'utilisateur)
  et ne sont pas demandées dans ce chantier.
- Tout lien d'achat ou comparatif produit — contraire au principe fondateur de l'app
  (zéro backend, zéro commerce, zéro tracking ; voir `2026-07-20-compagnon-peche-design.md`
  §2 et §9). Le guide matériel reste éducatif et générique, jamais une recommandation de
  marque ou un lien affilié.
- Extension géographique (guides départementaux hors 36/41) — hors sujet ici.

## Ce qui existe aujourd'hui (audit)

- `src/data/knots.ts` — 7 `Knot` (`id, cat, name, use, when, steps: string[]`), toujours
  3 étapes en texte, sans référence d'illustration par étape.
- `src/data/knot-diagrams.ts` + `src/data/media.ts` — chaque nœud a **une** entrée
  `MediaEntry` : 4 sont des photos Commons du nœud fini (clinch, palomar, boucle, texan),
  3 sont des schémas maison dessinés à plat (raccord, dropshot, paternoster). Aucune
  séquence, aucun test de cohérence.
- `src/data/gear.ts` — `GEAR_GUIDE` : 4 sections (`GuideSection { title, intro?, entries:
  GuideEntry[] }`), `GuideEntry = { name, detail }`, 23 entrées au total, zéro photo.
- `src/screens/Noeuds.tsx` — liste groupée nœuds/montages, détail = 1 image + étapes texte.
- `src/screens/Materiel.tsx` — onglet « Mon matériel » (CRUD utilisateur, IndexedDB) +
  onglet « Mes ensembles » (bundles) + bouton « Guide » qui affiche `GEAR_GUIDE` en lecture
  seule.
- Aucun `knots.test.ts` ni `gear.test.ts` : rien n'empêcherait aujourd'hui d'ajouter un
  nœud à zéro étape ou une image orpheline.

## Les 15 fiches nœuds/montages

**Sourcées Wikimedia Commons** (licence libre, créditées, upgrade des 3 premières qui
n'ont aujourd'hui qu'une photo du nœud fini) :

| Fiche | État actuel | Source vérifiée |
|---|---|---|
| Clinch amélioré | photo seule | upgrade — chercher une séquence Commons, sinon garder la photo actuelle en fallback |
| Palomar | photo seule | idem |
| Boucle (chirurgien) | photo seule | idem |
| **Nœud de sang** (nouveau) | — | `BloodKnot_HowTo.jpg`, CC BY-SA 3.0, auteur Chris 73 |
| **Albright** (nouveau) | — | `Albright_knot_diagram_retouched.png`, domaine public |
| **Nœud de chaise** (nouveau) | — | `Bowline Noeud de chaise.svg` (déjà légendé en français) + `Bowline in four steps.png` |

**Dessin maison**, style schématique validé pendant le cadrage (abstraction du geste, pas
de tracé littéral du fil — le seul risque qu'on écarte : un croisement mal dessiné qui
induirait en erreur) :

| Fiche | État actuel |
|---|---|
| Raccord ligne/bas de ligne | upgrade — 1 schéma → séquence |
| Drop shot | upgrade — 1 schéma → séquence |
| Texan | upgrade — 1 schéma → séquence |
| Pater-noster | upgrade — 1 schéma → séquence |
| **Carolina** (nouveau) | — |
| **Wacky** (nouveau) | — |
| **Anglaise** (nouveau) | — |
| **Feeder** (nouveau) | — |
| **Cheveu** (nouveau) | — |

Note honnête sur le sourcing : si Commons n'offre qu'une image combinée montrant toutes
les étapes dans un seul « poster » (cas fréquent pour les nœuds classiques), on l'utilise
telle quelle plutôt que de la découper à l'aveugle en fausses étapes — mieux vaut une image
qui couvre tout que plusieurs images dont on invente les coupures.

## Modèle de données

### Nœuds/montages

`Knot.steps` reste `string[]` (texte, inchangé — aucune fiche ne perd son contenu actuel).
Les illustrations vivent en overlay, à côté, même principe que `FICHES`/`EDIBILITY` pour
les espèces (une fiche descriptive ne doit jamais dupliquer une donnée qui vit ailleurs) :

```ts
// src/data/knot-step-media.ts (ou fusionné dans media.ts selon ce qui reste lisible)
export const KNOT_STEP_MEDIA: Record<string, MediaEntry[]>; // un élément par étape, dans l'ordre
```

`LOCAL_KNOT_MEDIA` (dessins maison) et `KNOT_MEDIA` (sourcé Commons) passent tous les deux
de `MediaEntry` (singulier) à `MediaEntry[]` — même changement que celui déjà fait pour
`SPECIES_MEDIA`, qui supporte déjà un tableau de photos (adulte/juvénile) par espèce.

### Guide matériel

Nouveau type à côté de l'actuel `GuideEntry` (qui reste utilisé tel quel pour les
catégories qui restent en liste simple, si besoin) :

```ts
export interface GuideCard {
  id: string;      // slug stable
  name: string;
  summary: string; // ce que c'est
  usage: string;   // comment/quand l'utiliser (animation, montage, saison)
  species?: string; // espèces ciblées, si pertinent
}
```

Nouveau `kind: "gear"` sur le composant `Media` existant (`src/components/Media.tsx`),
overlay `GEAR_MEDIA: Record<string, MediaEntry[]>` — même mécanique que `SPECIES_MEDIA`.

Les hameçons (tailles) restent en tableau (`GuideEntry[]`, format actuel) : ce ne sont pas
des « types » distincts mais des plages de taille, la table est déjà la bonne
représentation — seul le texte par ligne s'étoffe. Pas de photo prévue ici (une taille de
hameçon n'est pas lisible sur une photo sans repère d'échelle, et aucune source Commons
crédible n'a été trouvée pour ce cas précis).

## Pipeline d'images

`scripts/images.manifest.json` et `scripts/fetch-images.mjs` gèrent déjà des tableaux de
photos par id pour les espèces (`extra: [...]`). Le même mécanisme s'étend aux nœuds : un
nœud du manifeste porte un tableau `steps: [{ filename | url, author, license,
file_page_url, caption? }]` au lieu d'une entrée unique, et le script écrit
`KNOT_STEP_MEDIA` (tableau) au lieu de l'actuel `KNOT_MEDIA` (singulier). Les dessins
maison suivent la même convention de nommage que l'existant (`<id>-1.svg`, `<id>-2.svg`…
dans `public/assets/knots/`), référencés à la main dans `LOCAL_KNOT_MEDIA` comme
aujourd'hui (pas de script pour ceux-là, jamais eu de pipeline automatique pour le dessin
maison).

Le guide matériel utilise le pipeline espèces tel quel (`processSpecies`-like), juste avec
`subdir: "gear"` et écriture dans `GEAR_MEDIA`.

## Écrans

**`Noeuds.tsx` (`KnotDetail`)** : remplace le bloc « 1 image hero + liste de texte » par
une séquence où chaque étape affiche son illustration juste au-dessus de son texte (comme
une bande dessinée verticale). Si `KNOT_STEP_MEDIA[id]` est absent ou plus court que
`steps`, les étapes sans image gardent simplement leur texte seul — jamais d'image
manquante affichée comme un placeholder cassé (même logique de repli que `Media` déjà en
place pour les espèces).

**`Materiel.tsx` (`GuideMateriel`)** : les 3 sections enrichies (leurres, appâts, fils)
passent d'une liste texte à une grille de cartes (photo + nom + résumé), tap → détail
complet (summary + usage + species). La section hameçons garde son tableau actuel avec un
texte plus complet par ligne.

## Tests

**`src/data/knots.test.ts`** (nouveau) :
- chaque nœud a au moins 2 étapes ;
- si `KNOT_STEP_MEDIA[id]` existe, sa longueur ne dépasse jamais `steps.length` (jamais
  d'illustration orpheline sans étape correspondante) ;
- chaque `MediaEntry` dont la licence n'est pas « Schéma original » porte une `sourceUrl`
  non vide (même discipline de sourçage que le reste de l'app).

**`src/data/gear-guide.test.ts`** (nouveau) :
- chaque `GuideCard` a un id stable, un `summary` et un `usage` non vides ;
- même règle de sourçage pour `GEAR_MEDIA`.

## Critères de réussite

- 15 fiches nœuds/montages, toutes avec une séquence d'au moins 2 illustrations (sauf
  fallback documenté si aucune source n'existe et que le dessin maison n'a pas encore été
  produit pour cette fiche précise — auquel cas la fiche reste texte-seul plutôt que
  bloquer tout le chantier).
- Guide matériel : leurres/appâts/fils en fiches détaillées, avec photo pour au moins les
  types où Commons a un résultat pertinent (pas d'obligation à 100 %, comme pour les
  photos d'espèces : une fiche sans photo trouvée reste texte-seul plutôt que d'utiliser
  une image inadaptée).
- `npm run test`, `npm run lint`, `npm run build` verts.
- Aucune régression sur les 7 fiches existantes (contenu texte identique, juste enrichi
  visuellement).
