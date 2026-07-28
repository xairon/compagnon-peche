# Liens matériel ↔ espèces (et fil ↔ leurre) — design

_Conception validée le 28 juillet 2026._

## Intention

Autoportant : lisible sans aucun contexte externe.

Le guide matériel (leurres/appâts/fils, 19 fiches) et les fiches espèces existent déjà,
mais ne se parlent pas : une fiche leurre affiche « Sandre, perche, brochet, black-bass »
en texte libre, sans qu'on puisse taper dessus pour ouvrir la fiche du poisson visé — et
inversement, la fiche sandre ne renvoie vers aucun leurre. Ce chantier relie les deux dans
les deux sens, plus le fil recommandé par leurre (avec son propre lien retour « utilisé
avec »).

C'est le premier de trois chantiers issus d'une même demande, découpés pour rester
gérables (voir l'échange qui a précédé cette spec) :
1. **Ce chantier** : liens gear ↔ espèces + fil ↔ leurre.
2. Fiches « animations de pêche » (linéaire, saccadé, walking the dog…) — dépend de ce
   chantier pour avoir un point d'ancrage utile.
3. Guide cannes (actions/tailles) — indépendant, catégorie aujourd'hui sans aucun contenu.

## Périmètre

**Dans le périmètre :**
- Convertir le champ `species` (texte libre) des 19 fiches gear en une liste de vrais ids
  d'espèces, tapables.
- Ajouter `filIds` sur les 7 fiches leurres (fil recommandé, tapable, lien retour sur la
  fiche fil).
- Ajouter un champ `hamecon` (texte, pas un nouveau lien — voir « Hors périmètre ») sur les
  leurres et les appâts où c'est pertinent.
- Ajouter une section « Matériel recommandé » sur les 25 fiches espèces vedettes
  (`CURATED_IDS`), dérivée au rendu — jamais stockée en double.
- Deux mécanismes de saut + surbrillance (« espèce → gear » et « fil → leurre ») sur le
  modèle du `focusSpot` déjà utilisé par la Carte.

**Hors périmètre (explicitement) :**
- Les 104 fiches espèces « base » — restent en texte libre, aucun lien structuré. La
  plupart sont des espèces rares ou non ciblées au leurre/appât ; le jeu n'en vaut pas la
  chandelle pour un contenu que personne ne consultera dans cet angle.
- Lien vers une fiche canne — la catégorie n'a aujourd'hui aucun contenu (chantier 3,
  séparé).
- Fiches « animations de pêche » — chantier 2, qui viendra s'appuyer sur les ids posés ici.
- Un nouveau lien tapable pour « hameçon » — la table des tailles reste un tableau, pas des
  fiches individuelles ; `hamecon` est un texte qui renvoie à une plage de la table
  existante (ex. « N° 1 à 2/0 »), jamais un id qui n'existerait nulle part.

## Modèle de données

### `GuideCard` (`src/data/gear-cards.ts`)

```ts
export interface GuideCard {
  id: string;
  name: string;
  summary: string;
  usage: string;
  species?: string[];  // CHANGÉ : était `string` (texte libre) → ids réels de SPECIES
  filIds?: string[];    // NOUVEAU — leurres seulement, ids vers GEAR_CARDS.fil
  hamecon?: string;     // NOUVEAU — texte libre, ex. "N° 1 à 2/0"
}
```

Règle de non-duplication : une fiche fil ne porte **aucun** champ listant les leurres qui
l'utilisent — ce sens se calcule en filtrant `GEAR_CARDS.leurre` sur celles dont `filIds`
contient l'id du fil courant. Si demain un leurre change de fil recommandé, un seul endroit
à modifier.

### Fiches espèces (aucun nouveau champ sur `Species`)

La section « Matériel recommandé » d'une fiche espèce se calcule en filtrant l'ensemble de
`GEAR_CARDS` (toutes catégories) sur celles dont `species` contient l'id de l'espèce
courante. Rien n'est stocké côté espèce — la source de vérité reste le `species[]` de
chaque fiche gear. Une espèce dont aucune fiche gear ne la cite n'affiche pas la section
(jamais de bloc vide).

## Navigation

Deux mécanismes distincts :

1. **Gear → espèce** : réutilise `nav("fiche", { spId })`, déjà utilisé partout ailleurs
   dans l'app. Rien de nouveau à construire.
2. **Espèce → gear** et **fil → leurre** : nouveau champ `AppState.gearFocusId: string |
   null` (même famille que `focusSpot`, déjà dans `AppState`). Poser `gearFocusId` puis
   naviguer vers `"guide-materiel"` ; `GuideMateriel` lit `state.gearFocusId` au montage,
   scrolle jusqu'à la carte correspondante (`scrollIntoView`), l'ouvre (`setOpen(id)`), et
   remet `gearFocusId` à `null` — même séquence lire/consommer/réinitialiser que
   `focusSpot` dans `Carte.tsx`.

## Contenu

**19 fiches gear existantes** : le texte `species` actuel de chaque fiche cite déjà des
noms d'espèces réels (vérifié pendant le cadrage — ex. leurre-souple : « Sandre, perche,
brochet, black-bass ») ; la conversion consiste à faire correspondre chaque nom à son id
dans `SPECIES`, pas à inventer de nouvelles associations. `filIds` et `hamecon` s'appuient
sur les usages déjà écrits dans le champ `usage` de chaque fiche quand c'est explicite (ex.
le drop shot et le texan mentionnent déjà des tresses/fluoro dans leurs fiches nœuds/
montages sœurs) ; sinon sur des associations d'usage courant et non controversées
(fluorocarbone en bas de ligne pour la finesse, tresse pour la puissance/sensibilité).

**25 fiches espèces vedettes** : aucun contenu à écrire — uniquement du rendu dérivé. Une
espèce vedette qu'aucune fiche gear ne cite (cas possible, ex. une espèce surtout pêchée au
vif quand « vif » n'est pas dans les 19 fiches actuelles — à vérifier au cas par cas) reste
sans section, ce qui est correct et pas un bug.

## Écrans

**`GuideMateriel` (fiche dépliée)** :
- La ligne actuelle « Espèces : … » devient une rangée de puces tapables (chaque puce =
  `nav("fiche", { spId })`).
- Nouvelle ligne « Fil recommandé » (leurres uniquement, si `filIds` est renseigné) : puces
  tapables, chacune pose `gearFocusId` puis reste sur l'écran (le scroll+expand gère le
  reste).
- Nouvelle ligne « Hamecon » (texte simple, si renseigné).
- Sur une fiche **fil**, nouvelle ligne « Utilisé avec » (dérivée, puces tapables vers les
  leurres qui la référencent) — absente si aucun leurre ne la cite.

**Fiche espèce (`Fiche.tsx`)**, sous la section « Où & comment le pêcher » existante :
nouvelle sous-section « Matériel recommandé », rendue uniquement pour les 25 espèces
vedettes et uniquement si `GEAR_CARDS` filtré est non vide. Puces tapables, chacune pose
`gearFocusId` puis `nav("guide-materiel")`.

## Tests

Étend `src/data/gear-guide.test.ts` :
- Chaque id dans `species[]` d'une fiche gear existe réellement dans `SPECIES` (pas de lien
  mort).
- Chaque id dans `filIds` existe réellement dans `GEAR_CARDS.fil`.
- Aucune fiche `fil` ne porte elle-même un champ `filIds` (évite la duplication à
  l'envers).

## Critères de réussite

- Depuis n'importe laquelle des 19 fiches gear, taper une espèce citée ouvre sa fiche.
- Depuis les 25 fiches espèces vedettes citées par au moins une fiche gear, une section
  « Matériel recommandé » fonctionnelle apparaît.
- Depuis une fiche leurre avec `filIds`, taper le fil scrolle et ouvre la fiche fil
  correspondante ; celle-ci affiche « Utilisé avec » et liste bien ce leurre.
- `npx tsc -b`, `npx eslint src`, `npx vitest run`, `npm run build` verts.
- Aucune régression sur les 129 fiches espèces « base » ni sur le contenu existant des 19
  fiches gear (texte de `summary`/`usage` inchangé).
