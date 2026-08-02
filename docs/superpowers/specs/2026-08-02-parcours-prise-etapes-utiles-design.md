# Ne faire traverser au pêcheur que les étapes qui le concernent

> « Faudrait filtrer les trucs inutiles pendant la note de prise, si par exemple je prends une perche,
> j'ai pas à vérifier la maille ou le quota, je peux juste donner la taille et une photo et décider
> de si je note le lieu. »

Le parcours « Ma prise » impose la même suite de cinq étapes à toutes les espèces :
`statut → maille → quota → choix → garder/relâcher`. Pour une perche, deux de ces étapes n'ont rien
à dire — la perche n'a pas de maille nationale et ne figure pas dans les trois espèces du quota
carnassiers (`QUOTA_CARNASSIERS` : sandre, brochet, black-bass). Elles s'affichent quand même, avec
un unique bouton « Continuer ».

Ce document décrit comment le parcours se réduit à ce qui concerne l'espèce, et comment l'écran de
saisie qui manquait vient s'y ajouter.

## 1. Les deux buts que le parcours confond

« Ma prise » sert à deux choses que rien ne distingue aujourd'hui :

- **décider** — puis-je garder ce poisson ? (`statut`, `maille`, `quota`)
- **consigner** — l'enregistrer (taille, photo, lieu)

Pour une espèce sans contrainte, le premier but n'a rien à instruire. Et le second n'existe pas
vraiment : `addCatch` écrit l'entrée puis dépose le pêcheur sur la LISTE du carnet. Aucun moment ne
propose la photo ni ne demande son avis sur le lieu — il faut rouvrir la fiche ensuite.

## 2. Un parcours calculé

`lib/prise.ts` reçoit une fonction pure :

```ts
export function etapesPour(sp: Species, dept: DeptId): Etape[]
```

Elle rend la suite d'étapes de cette espèce. `statut`, `choix`, `kill`/`release` et la nouvelle
`consigner` y sont toujours. Les deux autres sont conditionnelles :

| Étape | Retenue quand |
|---|---|
| `maille` | `effectiveMaille(sp, dept)` a un chiffre **ou** un libellé |
| `quota` | l'espèce est dans `QUOTA_CARNASSIERS`, **ou** `sp.quota === "Déclarer"`, **ou** `effectiveQuota(sp, dept).text !== null` |

### 2.1 Le piège : le chiffre ne suffit pas

`effectiveMaille` rend `cm: 0` pour le saumon sous moratoire et deux esturgeons — mais avec un
`label` non nul (« spéciale », « Interdit »). Le code le dit déjà en toutes lettres :

> « A species can have no number and still be governed by a rule […] flattening it to "no national
> size" […] hands the angler a discretion the law does not give them. »

Sauter sur `cm === 0` seul escamoterait donc un moratoire. Le critère retenu est **ni chiffre ni
libellé**. Un test dédié le verrouille.

Symétriquement côté quota : une truite fario a `sp.quota === "—"` alors que le Loir-et-Cher la
plafonne à 6/jour. Lire `sp.quota` seul ferait disparaître une étape qui contraint. C'est
`effectiveQuota(sp, dept)`, qui replie l'arrêté départemental, qui décide.

### 2.2 Le compteur cesse de mentir

Le compteur est aujourd'hui `étape N / 5`, avec une table `STEP_ORDER` figée. Le code admet déjà
qu'il ment sur les chemins courts (`isShortcutStep` le masque plutôt que de le corriger). Il devient
`N / etapes.length`, dérivé du parcours réel : il ne peut plus annoncer un cinquième écran qui
n'existe pas.

Pour une perche : `statut → choix → garder/relâcher → consigner`, soit quatre écrans au lieu de six.

## 3. Ce qui est sauté est dit

Sur l'écran qui suit le saut, une ligne discrète nomme ce qui a été passé :

> Ni maille ni quota connus pour la perche — un arrêté local peut en fixer : vérifiez l'arrêté en
> vigueur.

Elle n'apparaît **que** si quelque chose a été sauté, et son libellé nomme précisément ce qui l'a
été (maille seule, quota seul, ou les deux).

Cette ligne n'est pas décorative. L'étape maille écrit aujourd'hui « Aucune maille nationale pour
cette espèce — un arrêté local peut en fixer une : vérifiez ». L'app refuse donc délibérément
d'affirmer qu'aucune règle n'existe : elle ne connaît que le socle national et les arrêtés des trois
départements couverts. Supprimer l'étape sans rien dire ferait cette affirmation à sa place.

La formulation ne prétend jamais à l'absence de règle — seulement à ce que l'app n'en détient
aucune.

## 4. L'étape « Consigner »

Elle suit `kill` / `release`, et remplace le bouton « Ajouter au carnet » qui écrivait à l'aveugle.

Elle porte trois champs :

- **taille** — déjà saisie pendant le parcours, modifiable ici ;
- **photo** — même chemin que la fiche de prise : blob IndexedDB sous la clé `photo:<slot>` ;
- **lieu** — un interrupteur, dont le sens dépend de ce qui existe :

| Contexte | Libellé | Défaut |
|---|---|---|
| Parcours lancé depuis un spot (`prisePlace`) | « Noter le lieu : *nom du spot* » | **actif** |
| Sinon | « Noter ma position GPS » | **inactif** |

L'opt-in du second cas est délibéré : un coin de pêche se garde. L'app ne doit pas capturer une
position parce que le pêcheur ne s'y est pas opposé. Le premier cas est actif par défaut parce que
le lieu est déjà connu et déjà affiché à l'écran depuis le début du parcours.

La prise s'écrit à la validation, avec tout d'un coup. « Terminer sans consigner » reste : le
parcours doit pouvoir servir à décider sans rien enregistrer.

Interrupteur éteint, `place` vaut « — », comme aujourd'hui quand le parcours ne vient pas d'un spot.

## 5. Tests

**`etapesPour`** sur les quatre cas qui décident :

- perche — ni maille ni quota : `statut, choix, kill|release, consigner` ;
- brochet — les deux : parcours complet ;
- **saumon** — `cm: 0` mais moratoire : l'étape maille **reste** ;
- **truite fario en Loir-et-Cher** — quota départemental là où le national n'en a pas : l'étape
  quota **reste**.

**Le compteur** égale la longueur du parcours, pour chacune de ces espèces.

**La ligne d'avertissement** n'apparaît que quand il y a eu saut, nomme ce qui a été sauté, et ne
contient jamais d'affirmation d'absence de règle.

**L'étape consigner** écrit taille, photo et lieu en une fois ; l'interrupteur éteint laisse `place`
à « — » ; « Terminer sans consigner » n'écrit rien.

## 6. Ce que ce document ne fait pas

Il ne touche pas au contenu réglementaire des étapes conservées : les textes de `maille`, `quota`,
`kill` et `release` restent mot pour mot. Seule change la question de savoir **quelles** étapes sont
traversées, et ce qui se passe à la fin.
