# Refonte de la section nœuds & montages — design

_Conception validée le 1er août 2026._

## Intention

Autoportant : lisible sans aucun contexte externe.

La section compte 15 fiches (7 nœuds, 8 montages) servies par un écran unique,
`src/screens/Noeuds.tsx` : une liste de tuiles, puis un détail composé d'**une illustration
figée, de trois lignes de texte et d'un encart « quand l'utiliser »**. Le reproche est qu'elle
ne ressemble pas à un tutoriel, et il est fondé — mais la cause n'est pas le rendu.

Elle est en amont, dans la nature des images. Les visuels viennent de deux sources
hétérogènes : dix planches Wikimedia Commons (photo réelle ici, dessin au trait là, cartoon
ailleurs) et deux SVG maison. **Trois fiches n'ont aucune image** (wacky, anglaise, feeder).
Surtout, une planche Commons montre les cinq gestes du palomar *dans une seule image* : elle
ne peut, par construction, être mise en regard d'une étape écrite. Aucune feuille de style ne
répare ça.

Le chantier est donc d'abord un chantier d'images — une par geste — et la refonte de l'écran
en est la conséquence.

Un précédent commande la prudence. Le commit `19f859b` a supprimé **trente schémas SVG
maison** au motif qu'ils « n'apprenaient pas le nœud qu'ils dessinaient » : le palomar, dont
tout l'intérêt est le passage de l'hameçon dans la boucle, s'y résumait à une ellipse posée
sur une ligne. Ce design ne doit pas les réintroduire sous un autre nom.

## Ce que Wikimedia Commons couvre réellement

Relevé fait le 1er août 2026 par l'API Commons (recherche par mot-clé, catégories
`Fishing knots`, `Knot diagrams`, `Fishing rigs`, `Animated knots`). Toutes les licences
citées sont libres et vérifiées.

| Fiche | Ressource | Forme | Découpable |
|---|---|---|---|
| Palomar | `PalomarKnotSequence.jpg` 992×421, CC BY-SA 3.0 | bande de vignettes | oui |
| Nœud de sang | `BloodKnot HowTo.jpg` 1074×930, CC BY-SA 3.0 | grille | oui |
| Albright | `Albright knot diagram retouched.png` 454×1024, DP | colonne de 4 | oui |
| Nœud de chaise | `Bowline in four steps.png` 559×713, CC BY-SA 3.0 | grille de 4 | oui |
| Boucle chirurgien | `Surgeon's Loop knot.svg` 271×612, DP | colonne | oui |
| Montage cheveu | `Knotless knot.svg` 512×1024, CC BY-SA 4.0 | colonne | oui |
| Montage texan | `Texas Rig Diagram 1→4.svg`, CC BY 4.0 | **déjà 4 fichiers** | rien à découper |
| Clinch | photo d'un nœud lâche | image unique | non |
| Raccord | `Uni knot.jpg` | image unique | non |
| Drop shot | photo du montage fini | image unique | non |
| Carolina, pater-noster, wacky, anglaise, feeder | — | rien | non |

Deux pistes ont été explorées et écartées : la série numérotée `Barb.NN`, qui promettait un
jeu photo cohérent d'un même auteur, est du macramé décoratif (nœuds japonais, vice-versa) et
ne touche la pêche que par deux fichiers isolés ; et les animations, dont Commons ne possède
qu'un exemplaire utile (`Anim Noeud de chaise.gif`), trop peu pour fonder une forme.

**Bilan : 7 fiches sur 15.** Et la répartition est l'information importante — **5 nœuds sur 7,
mais 2 montages sur 8**.

## Décisions retenues

### Un nœud et un montage ne sont pas le même objet, et n'appellent pas la même image

Ce déséquilibre 5/7 contre 2/8 n'est pas un trou de catalogue qu'une meilleure recherche
comblerait. Il est structurel.

Un **nœud** est une suite de gestes exercés sur un fil : il existe un geste 1, un geste 2, un
geste 3, et chacun se photographie. Un **montage** est un ordre d'assemblage de composants le
long de la ligne — plomb, perle, émerillon, bas de ligne, hameçon. Il n'y a pas de « geste 2 »
à montrer : il y a un plan légendé. C'est déjà ce que soutient le commentaire de
`src/data/knot-diagrams.ts`, qui défend le SVG du pater-noster parce qu'il montre « le montage
entier, légendé (corps de ligne, potence, plomb, surface, fond), lisible à 375 px ».

Chercher indéfiniment une séquence pour le feeder, c'est chercher une chose qui n'existe pas.
Les six montages non couverts reçoivent donc la forme qui leur convient, pas une séquence
dégradée.

### Trois producteurs d'images, un seul rendu

**a. Découpe des planches Commons — 7 fiches.** Un script `scripts/crop-knot-steps.mjs`
adossé à `sharp` (déjà en dépendance de développement) découpe chaque planche en une image
par geste, pilotée par un manifeste déclaratif — `{id:"chaise", grid:{cols:2,rows:2}}`,
`{id:"palomar", grid:{cols:5,rows:1}}` — avec des boîtes de découpe manuelles pour les
planches qui ne sont pas des grilles régulières. Le texan ne se découpe pas : ses quatre SVG
existent déjà séparément, il suffit de les récupérer et de les convertir.

**La licence, l'auteur et l'URL source de la planche mère sont recopiés sur chaque vignette.**
L'attribution doit survivre à la découpe : c'est une obligation des licences CC BY et CC BY-SA,
et l'écran Crédits photos en dépend.

**b. Schémas d'assemblage — 6 montages** (drop shot, carolina, pater-noster, wacky, anglaise,
feeder). Un langage visuel unique, tenu par une contrainte explicite : même format portrait,
surface en haut et fond hachuré en bas, corps de ligne épais et bas de ligne fin, une
bibliothèque de composants constante d'un schéma à l'autre (plomb olive, plomb balle, plomb
drop shot, perle, émerillon, agrafe, hameçon simple, hameçon texan, waggler, panier feeder,
leurre souple, bouillette), et des pastilles numérotées qui renvoient aux étapes écrites.
Les couleurs sont prises dans les jetons du thème, pour que le mode sombre suive sans
retouche — le chantier de tokenisation du 31 juillet 2026 rend cela possible.

**c. Photographies maison — 2 nœuds** (clinch, raccord), quatre clichés chacun. Ce sont des
nœuds, pas des montages : la séquence est la bonne forme, et Commons ne l'a pas. Un protocole
de prise de vue et un script `scripts/import-knot-photos.mjs` (recadrage, redimensionnement,
conversion WebP, nommage) les intègrent.

### Le schéma d'assemblage est un fichier SVG, et voici pourquoi ce n'est pas un retour en arrière

La consigne de départ excluait le SVG. La décision s'en écarte sciemment, sur ce seul point,
et le motif doit rester lisible longtemps après.

Ce que `19f859b` a supprimé, ce sont des schémas qui tentaient de montrer **un geste de
nouage** avec un trait et une ellipse. Un trait et une ellipse ne peuvent pas montrer un
geste : il leur manque la main, la tension, l'ordre de passage des brins. L'échec était dans
l'ambition, pas dans le format.

Un **ordre d'assemblage**, lui, se dessine exactement avec ces moyens-là : c'est ce que fait
tout schéma de montage dans la presse halieutique. Et le format vectoriel y est le bon choix
pour trois raisons propres au projet — netteté à toutes les tailles sur une PWA installée,
poids négligeable dans le précache hors-ligne, et couleurs pilotées par les jetons du thème.

**Garde-fou.** Le pater-noster est dessiné **seul** et validé avant que les cinq autres soient
entrepris. Il est choisi parce qu'un schéma existe déjà pour lui, ce qui rend la comparaison
franche. Si le langage ne convainc pas, un schéma est perdu, pas six.

### Le texte reste séparé des images

`Knot` (`src/types.ts`) s'enrichit, mais ne porte aucun chemin de fichier :

```ts
export interface Knot {
  id: string; cat: "noeud" | "montage";
  name: string; use: string; when: string;
  steps: string[];              // 4 à 6 gestes, un par image
  besoins: BesoinId[];          // filtres de la liste
  difficulte: "facile" | "moyen" | "difficile";
  duree: string;                // "30 s", "2 min"
  fils: ("nylon" | "fluoro" | "tresse")[];
  resistance?: string;          // "~95 % de la résistance de ligne"
  erreur: string;               // l'erreur qui fait casser
  voirAussi?: string[];         // ids d'autres fiches
}
```

Les images vivent dans `src/data/knot-steps.gen.ts` — un `Record<string, MediaEntry[]>`
indexé par id, dans l'ordre des `steps`. C'est la convention déjà en vigueur (`media.ts` est
généré et porte l'en-tête « do not edit by hand », `knots.ts` est écrit à la main), et le
suffixe `.gen.ts` est celui du dépôt. La conséquence pratique : **la découpe se rejoue sans
jamais toucher à la prose**, et une planche mieux découpée demain ne met pas les textes en
danger.

`resistance` est optionnel à dessein. Les pourcentages de résistance publiés varient beaucoup
selon le protocole de test ; le champ n'est rempli que là où une source sérieuse le donne, et
laissé vide ailleurs plutôt que meublé.

Les cinq besoins couvrent les 15 fiches sans reste : *attacher un hameçon ou un leurre*
(clinch, palomar) · *relier deux fils* (raccord, sang, albright) · *faire une boucle* (boucle,
chaise) · *présenter au fond* (texan, carolina, pater-noster, feeder, cheveu) · *entre deux
eaux ou en surface* (drop shot, anglaise, wacky).

### La fiche se déroule verticalement

Pour chaque geste : l'image en pleine largeur, puis son texte numéroté dessous. Ni carrousel,
ni pas-à-pas plein écran.

Le motif est l'usage : au bord de l'eau, les mains sont mouillées et occupées par une canne et
un fil. Le défilement au pouce est le seul geste qui ne demande pas de viser une cible ; un
« suivant » à toucher à chaque étape en demande un par geste, et fait perdre la vue d'ensemble
quand on veut revenir vérifier l'étape précédente. Le déroulé s'imprime et se capture aussi en
entier, ce qu'une vue à état ne permet pas.

Suivent, dans l'ordre : les pastilles (difficulté, durée, fils, résistance) placées sous le
titre, la séquence, l'encart **« L'erreur qui fait casser »**, le bloc « Quand l'utiliser »
existant, et les renvois cliquables vers les fiches liées — le drop shot vers le palomar
qu'il emploie, le raccord vers l'albright quand les diamètres sont trop différents. Ces
renvois existent déjà en toutes lettres dans les textes, sans être cliquables.

### La liste répond à la question qu'on se pose vraiment

Deux changements. Chaque tuile porte la vignette de son propre nœud — la dernière image de la
séquence, celle du nœud fini, affichée en `contain` pour ne jamais recadrer de travers — au
lieu de l'icône générique aujourd'hui répétée quinze fois. Et une rangée de filtres par besoin
coiffe les groupes Nœuds / Montages.

Le motif : au bord de l'eau on ne cherche pas « l'albright », on cherche « comment relier ma
tresse à mon fluoro ». Un champ de recherche texte suppose qu'on connaît déjà le nom — soit
l'inverse du débutant auquel un tutoriel s'adresse.

### L'écran se scinde en deux

`Noeuds.tsx` porte aujourd'hui la liste et le détail en 102 lignes. La liste gagne des filtres,
la fiche gagne une séquence, des pastilles, un encart et des renvois : le fichier déborderait.
`Noeuds.tsx` garde la liste, `NoeudFiche.tsx` prend la fiche, `noeuds.css` sert les deux.

### La table d'arbitrage reste le registre de décision

`src/data/knots.test.ts` contient déjà une table `ARBITRAGE` qui consigne, fiche par fiche, le
choix d'illustration retenu, avec ce commentaire : « Changer une ligne, c'est décider ; le test
est là pour que ça se décide. » Le réflexe est bon et se conserve : la table est étendue aux
nouvelles valeurs `commons-decoupe`, `schema-maison`, `photo-maison`.

S'y ajoutent les invariants suivants, chacun protégeant une dérive précise :

- chaque fiche compte 4 à 6 étapes ;
- **autant d'images que d'étapes** quand la séquence existe — c'est le test qui empêche le
  texte et les images de dériver l'un par rapport à l'autre au fil des retouches ;
- chaque fichier référencé existe sur le disque ;
- chaque vignette porte une licence libre, un auteur et une URL source ;
- tout id cité dans `voirAussi` et tout `besoin` résout ;
- les écrans passent les tests d'accessibilité existants, filtres au clavier compris.

### Une fiche sans séquence retombe proprement sur son image actuelle

Les deux séries photographiques dépendent d'une session d'atelier hors code. Le rendu traite
donc l'absence de séquence comme un cas normal et affiche l'illustration unique existante —
jamais un cadre vide, qui se lirait comme une image cassée. C'est déjà la règle en vigueur
dans `KnotDetail`, et elle rend le chantier livrable en 13 fiches sur 15 sans rien casser.

## Ce qui n'est pas fait

- **Pas de mode pas-à-pas plein écran**, même en option : deux affichages à construire et à
  tester pour un gain qui se discute, alors que le déroulé vertical couvre l'usage.
- **Pas de recherche texte** : les filtres par besoin répondent mieux au même besoin.
- **Pas d'animation ni de vidéo** : Commons n'a qu'un fichier animé utile, et une vidéo
  contredirait le fonctionnement hors-ligne.
- **Pas de retouche du matériel ni des espèces**, que les fiches citent — hors périmètre.

## Ordre de travail

1. Modèle de données et les 15 textes redécoupés en gestes, avec erreur, pastilles et renvois.
   Données pures : testable et vérifiable sans une seule image.
2. Les deux écrans, qui fonctionnent d'emblée en retombant sur les illustrations actuelles.
3. Script de découpe et les 7 fiches Commons.
4. **Le pater-noster seul, soumis à validation.**
5. Les cinq schémas d'assemblage restants.
6. Les deux séries photographiques et leur import.
