# Ne montrer d'un arrêté que ce qui concerne le poisson regardé

> « Dans les fiches de poisson y'a trop d'info dans autres points de l'arrêté, je veux juste la
> législation du poisson que je regarde moi, je m'en fous des autres, la fiche doit être bien
> pensée. »

La fiche espèce affiche, sous « Réglementation locale », un bloc **« Autres points de l'arrêté »**
qui déverse toutes les notes départementales que le rattachement n'a pas su relier à l'espèce
affichée. Sur une fiche gardon dans l'Indre, cela fait six notes — brochet, sandre, black-bass,
truite arc-en-ciel, anguille, saumon — dont aucune ne concerne un gardon.

Ce document décrit comment la fiche cesse de le faire sans qu'aucune obligation légale ne
disparaisse de l'application.

## 1. L'invariant qu'il faut déplacer, pas supprimer

`lib/notes-dept.ts` porte aujourd'hui cette phrase dans sa docstring :

> « espece + autres contient TOUJOURS l'intégralité des notes reçues. Le rattachement ne fait que
> décider de l'ordre et du bloc. Se tromper de poisson n'a donc aucune conséquence réglementaire —
> la note est affichée dans les deux cas. »

C'est exact, et c'est la raison d'être du bloc que l'on veut retirer : **tout est montré pour que
les erreurs de classement soient sans gravité.** Masquer casse ce raisonnement — une erreur de
rattachement devient une omission réglementaire.

La réponse n'est pas d'abandonner l'invariant mais de le **déplacer d'un cran** :

- la bibliothèque partitionne en trois seaux et garantit, sous test, que leur réunion redonne
  exactement les notes reçues, sans perte ni doublon ; elle ne masque rien ;
- **l'écran** décide de n'en afficher que deux.

La décision de masquer vit alors à un seul endroit, lisible et testable indépendamment du
classement.

## 2. Mesures — les 13 notes réelles

Classement obtenu en confrontant chaque note au catalogue complet (129 espèces), via le
`termesEspece` existant.

| Dept | Note (abrégée) | Nomme | Seau |
|---|---|---|---|
| 23 | Fenêtre brochet — lacs de Vassivière et St-Marc | brochet (+2 variantes) | espèce |
| 23 | Écrevisses à pattes blanches, rouges et grêles — fermée toute l'année | **aucun poisson** | **faux « générale »** |
| 23 | Pêche interdite sur le bassin du Cher | aucun | générale |
| 36 | Brochet no-kill du 14/03 au 24/04 | brochet | espèce |
| 36 | Sandre fermé du 26/01 au 24/04 | sandre, brochet | espèce |
| 36 | Black-bass — « no-kill », dans le doute relâchez | black-bass (+1) | espèce |
| 36 | Truite arc-en-ciel toute l'année en 2ᵉ catégorie | truites (4) | espèce |
| 36 | Anguille jaune / argentée | anguille | espèce |
| 36 | Saumon, truite de mer et alose interdits | 9 espèces | espèce |
| 41 | Maille truite — 25 cm retenus | truites (4) | espèce |
| 41 | Plafond global : 6 truites et 2 brochets/jour | truites, brochets | espèce |
| 41 | Transport de carpes vivantes > 60 cm interdit | carpes (5) | espèce |
| 41 | Carpe de nuit au Plan d'eau de la Coudraie | carpes (5) | espèce |

**11 notes sur 13 nomment une espèce du catalogue.** Le rattachement est fiable ; ce n'est pas lui
qu'il faut refaire.

### 2.1 Le seul faux positif, et ce qu'il coûte

La note écrevisses du 23 ne nomme aucun **poisson** — les écrevisses vivent dans
`data/ecrevisses.ts`, hors du catalogue interrogé. Sans correction elle serait promue « règle
générale » et affichée sur les 129 fiches poisson : exactement le bruit que la demande veut
supprimer, et le seul cas où le classement se trompe.

Corriger demande d'étendre le vocabulaire de rattachement aux noms d'écrevisses. La note bascule
alors en « autre espèce » — et se retrouve sans foyer, puisque aucune fiche poisson ne l'accueille.
Elle part donc vers l'écran **Écrevisses**, qui porte déjà un bloc réglementation
(`REG_BALANCES` / `MAILLE_NOTE` / `REG_SOURCE`) mais ignore aujourd'hui le département.

## 3. Ce que la fiche affiche après

Pour une fiche **gardon** :

| Dept | Avant | Après |
|---|---|---|
| Indre (36) | 6 notes | **0** |
| Loir-et-Cher (41) | 4 notes | **0** |
| Creuse (23) | 3 notes | **1** — « Pêche interdite sur le bassin du Cher » |

Aucune note ne disparaît de l'application : celles qui nomment un poisson restent sur la fiche de ce
poisson, celle qui nomme des écrevisses rejoint l'écran Écrevisses, celle qui ne nomme rien
s'affiche partout. La note black-bass « dans le doute, relâchez » se lit sur la fiche black-bass,
pas sur celle du gardon.

Sur 36 et 41, le bloc « Règles générales du département » n'apparaîtra jamais : aucune de leurs
notes n'est générale. Le bloc n'est rendu que s'il est non vide.

## 4. Les trois points de code

**`lib/notes-dept.ts`** — `deptNotes` retourne `{ espece, autresEspeces, generales }`. Le
vocabulaire de rattachement couvre les poissons **et** les écrevisses. Une fonction
`notesEcrevisses(notes)` expose les notes qui nomment une écrevisse, pour l'écran dédié.

**`screens/Fiche.tsx`** — « Autres points de l'arrêté » devient « Règles générales du département »,
alimenté par `generales` seul, rendu conditionnellement. `autresEspeces` n'est pas affiché.

**`screens/Ecrevisses.tsx`** — le bloc réglementation lit `notesEcrevisses(DEPT_REG[state.dept].notes)`
et les affiche à la suite des règles nationales, distinctement, avec le département nommé.

## 5. Tests

- **Partition** : sur les 13 notes réelles des trois départements et pour un échantillon d'espèces,
  `espece ∪ autresEspeces ∪ generales` redonne exactement l'entrée, sans doublon. C'est l'invariant
  déplacé, et le test qui le garde.
- La note écrevisses du 23 tombe dans `autresEspeces`, **jamais** dans `generales` — le faux positif
  mesuré au §2.1 ne peut pas revenir.
- « Pêche interdite sur le bassin du Cher » tombe dans `generales`.
- Fiche gardon dans l'Indre : aucune note départementale à l'écran.
- Fiche gardon en Creuse : la note bassin du Cher, et elle seule.
- Écran Écrevisses en Creuse : la note écrevisses est présente ; dans l'Indre, elle est absente.

## 6. Le risque accepté, écrit

Masquer introduit un risque d'omission que l'application n'avait pas. Il est **dissymétrique**, et
c'est ce qui le rend acceptable :

- une note dont l'espèce n'est pas reconnue (graphie inattendue, poisson hors catalogue) tombe dans
  `generales` et s'affiche **partout** — bruyant, jamais silencieux ;
- rien ne peut être masqué sans avoir été rattaché à une créature connue du catalogue.

La défaillance du classement produit donc du bruit, pas une omission. C'est la même dissymétrie qui
justifiait l'invariant d'origine, conservée sous une autre forme.
