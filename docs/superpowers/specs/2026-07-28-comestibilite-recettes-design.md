# Comestibilité, recettes et techniques — reprise — design

_Conception validée le 28 juillet 2026._

## Intention

Autoportant : lisible sans aucun contexte externe.

Trois audits croisés (contenu sanitaire, intégrité des données, écrans) ont passé en revue
les 129 fiches de comestibilité, les 17 recettes, les 7 techniques et les 5 écrans qui les
affichent. Le socle est solide — couverture complète, aucun lien cassé, sources citées
partout — mais **cinq erreurs sanitaires** s'y sont glissées, deux jeux de données correctes
ne sont affichés nulle part, et l'avis ANSES est écrit en double à deux endroits qui peuvent
diverger.

Ce chantier corrige d'abord la santé, puis supprime la double écriture, puis rend visible ce
qui existe déjà, puis comble les trous d'images et de tests.

## Ce que les audits ont établi

### Cinq erreurs sanitaires (vérifiées une par une)

1. **L'anguille n'avertit pas sur son sang toxique.** Son entrée ne mentionne pas
   l'ichtyohémotoxisme, alors que les deux fiches lamproie de la même app citent
   explicitement l'anguille comme l'exemple de référence du poisson à sang toxique. L'app
   connaît le fait et l'omet là où il compte le plus — l'anguille a par ailleurs deux
   recettes impliquant sa manipulation crue.
2. **Les parasites nommés sont les mauvais.** `SAFETY.parasites` cite « Anisakis,
   Gnathostoma » : le premier est marin, le second propre à l'Asie du Sud-Est et à
   l'Amérique latine. Le risque français documenté — le bothriocéphale (*Diphyllobothrium
   latum*) — n'apparaît nulle part, alors qu'il est établi dans la perche, le brochet et la
   lote du Léman, trois espèces que l'app a en fiche.
3. **La recette de conserves d'alose se contredit.** Le champ `cook: 90` s'affiche en badge
   à côté d'un texte disant « Aucune durée n'est donnée ici : un barème approximatif expose
   au botulisme ». Le texte a raison ; le badge le dément.
4. **Les recettes de carpe et deux des trois recettes de silure n'ont aucun avertissement
   ANSES**, alors que ces deux espèces sont parmi les cinq nommées par l'avis, et que les
   autres recettes concernées en portent un.
5. **L'avis ANSES sur l'anguille est incomplet.** Le chiffre (2 fois/mois) est correct et
   sourcé, mais il manque ce qui distingue précisément l'anguille des quatre autres
   bioaccumulateurs : l'ANSES recommande une consommation exceptionnelle **quel que soit le
   bassin versant**, là où les autres espèces peuvent être assouplies en eau propre. À
   ajouter, pas à substituer — remplacer le chiffre par la formule perdrait une donnée juste.

### Deux jeux de données correctes que personne ne voit

- **`Recipe.bivouac`** est renseigné sur **8 des 17 recettes** et lu par **zéro écran**
  (vérifié). Il marque les préparations réalisables au bord de l'eau avec très peu de
  matériel — c'est-à-dire exactement la promesse de l'app.
- **La navigation est à sens unique** dans les deux relations : on va d'une fiche espèce à
  ses recettes mais pas d'une recette à l'espèce ; d'une recette à sa technique mais pas
  d'une technique aux recettes qui l'emploient. C'est le même défaut que celui corrigé
  récemment entre les leurres et les fils.

### Une double écriture dangereuse

L'avis ANSES existe en deux exemplaires : `EDIBILITY[id].anses` (affiché dans
« Comestibilité ») et `sp.sante.paras` construit depuis `ANSES_GEN`/`ANSES_SENS` dans
`species.ts` (affiché dans « Santé & polluants »). Formulations quasi identiques, deux
fichiers, deux onglets de la même fiche. Corriger l'un laisse l'autre faux.

### Trous de couverture

- **Images** : 1 photo pour 17 recettes, **0 pour 7 techniques** (`public/assets/techniques/`
  est vide). Le repli est propre — on retombe sur la photo de l'espèce — mais 16 recettes
  sur 17 montrent un poisson au lieu du plat.
- **Tests** : aucun test ne couvre `recipes.ts`, `techniques.ts` ni les médias associés. Tout
  ce que l'audit d'intégrité a vérifié l'a été à la main et régresserait en silence.
- **Recettes** : 10 des 25 espèces vedettes n'ont aucune recette.

## Décisions retenues

### Les cyprinidés arêtés reçoivent une vraie recette, pas un rattachement forcé

Barbeau, brème, chevesne, hotu et carassin n'ont aucune recette. L'audit proposait de les
ajouter à `friture-poissons-blancs` : c'est faux pour quatre d'entre eux, la friture étant
une préparation de **petits** poissons (la recette le dit elle-même : « goujons, ablettes,
gardons ») quand le barbeau atteint 90 cm et le chevesne 60.

Décision : ajouter **une recette de terrine/rillettes de cyprinidés** couvrant brème,
chevesne, hotu et barbeau — c'est précisément la préparation que la tradition a inventée
pour les chairs fades et arêtées, et l'app possède déjà les techniques qui la servent
(`desaretage-brochet`, `arete-oseille`, `sterilisation-arete`). Sourcée comme la friture
l'est déjà (`origin: "tradition"`). Le **carassin** rejoint la friture : petit, il s'y prête
réellement.

La recette dira franchement pourquoi cette préparation existe — la chair est fade et
arêtée — plutôt que de vanter un poisson que les fiches décrivent honnêtement comme médiocre.

### Comestibilité et Santé restent deux sections, avec une seule source

Ce sont deux questions différentes : « est-ce bon à manger, et comment » d'un côté,
« qu'est-ce que j'ingère » de l'autre. Les fusionner noierait l'avis sanitaire dans le
culinaire.

Décision : garder les deux sections, mais **supprimer la double écriture**. Les textes ANSES
sont définis une seule fois dans `edibility.ts` et exportés ; `species.ts` les importe au
lieu de les redéclarer. Un test interdit la redivergence.

## Périmètre

**Dans le périmètre :** les cinq corrections sanitaires ; la déduplication ANSES ; l'affichage
de `bivouac` ; les deux liens retour (recette→espèce, technique→recettes) ; la taille des
puces `.tech-chip` ; la nouvelle recette cyprinidés + carassin en friture ; les photos de
recettes et de techniques ; les tests de liens et d'existence de fichiers ; le découpage de
`MesRecettes.tsx`.

**Hors périmètre :**
- Fusionner les sections Comestibilité et Santé (décidé contre, ci-dessus).
- Écrire une recette pour perche-soleil, poisson-chat, black-bass, ombre et vandoise :
  poissons de sport, invasifs ou fragiles sans tradition culinaire française établie —
  l'absence est honnête.
- Les points mineurs relevés sans conséquence : catégorie `"cuisson"` vide mais déjà masquée,
  `garum` non référencé par une recette mais atteignable directement, `Ligula intestinalis`
  (parasite inoffensif pour l'homme).

## Corrections sanitaires — ce que chacune doit dire

- **Anguille** : ajouter l'avertissement sang toxique (ichtyohémotoxine, détruite à la
  cuisson, éviter le contact avec plaies et yeux lors de l'habillage) et le « quel que soit
  le bassin versant » à l'avis ANSES.
- **Parasites** : remplacer Anisakis/Gnathostoma par le bothriocéphale, en nommant les
  espèces concernées et en gardant le protocole de congélation existant, qui est exact.
- **Conserves d'alose** : le champ `cook` ne doit pas afficher une durée qui laisse croire
  que la stérilisation est couverte.
- **Carpe et silure** : porter l'avertissement ANSES sur toutes leurs recettes, comme le
  fait déjà `silure-confit-jus-ecrevisse`.
- **Silure confit** : « cuisson à cœur » doit s'accompagner d'une température ou d'une durée,
  sans quoi l'affirmation n'est pas vérifiable par un cuisinier amateur.

Corrections de rigueur associées, relevées par l'audit : la citation médicale sur les œufs de
brochet est posée sur le brochet aquitain (jamais étudié) alors que le brochet commun est
l'espèce de l'étude ; le garum est décrit comme « lacto-fermenté » quand il relève de
l'autolyse enzymatique, et son affirmation de sécurité est la seule du fichier sans source
d'autorité sanitaire.

## Tests

- Chaque `Recipe.species[]` et `Recipe.techniques[]` résout ; chaque `Technique.speciesNote`
  résout.
- Aucune recette ne vise une espèce dont `EDIBILITY.status === "non"`.
- Toute recette d'une espèce portant un `anses` en comestibilité porte elle-même un `safety`
  mentionnant l'avis — c'est l'invariant qui aurait attrapé le trou de la carpe.
- Les textes ANSES de `species.ts` et `edibility.ts` sont la même valeur, pas deux copies.
- Chaque fichier référencé par `RECIPE_MEDIA` et `TECHNIQUE_MEDIA` existe sur le disque.

## Critères de réussite

- Les cinq erreurs sanitaires corrigées, chacune sourcée.
- Plus aucun texte ANSES dupliqué entre les deux fichiers.
- `bivouac` visible sur les recettes concernées.
- Recette → espèce et technique → recettes navigables, avec des puces à 44 px.
- `npx tsc -b`, `npx eslint src`, `npx vitest run`, `npm run build` verts.
