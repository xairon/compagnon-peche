# Tutoriels de gestion des arêtes et recettes d'écrevisses — design

_Conception validée le 29 juillet 2026._

## Intention

Autoportant : lisible sans aucun contexte externe.

L'app a des techniques d'après-levé (désarêtage des arêtes en Y, dissolution à l'oseille,
stérilisation) mais aucune ne couvre le **lever de filet lui-même**, geste que toutes les
autres supposent déjà acquis. Elle n'a pas non plus la technique d'entaille en croisillons,
répandue en Europe centrale et orientale pour les petits poissons très arêtés.

Par ailleurs, le module écrevisses (six espèces en fiche depuis le dernier chantier) n'a
**aucune recette et aucune technique** — un vide total, alors que bisque, à la nage et
gratin sont parmi les préparations françaises les mieux établies.

Ce chantier ajoute les deux techniques manquantes, comble les trous réels des espèces déjà
couvertes par une seule recette, et crée les premières recettes d'écrevisses.

## Décisions retenues

### Format des tutoriels : texte, comme l'existant

Comme les 7 techniques actuelles (ikejime, désarêtage, dégorgeage, arête à l'oseille,
stérilisation, garum, maturation) : protocole en étapes numérotées, photo de couverture
si une source Commons convenable existe, pas de schéma dédié dessiné. Cohérent avec le
reste du module, plus rapide qu'un traitement à la nœuds/montages.

### La technique d'entaille : « Europe centrale et orientale », pas « polonaise »

Recherche faite avant cette spec : la technique — entailler la chair en croisillons à moins
de 4 mm d'intervalle jusqu'à l'arête centrale, sans la sectionner, puis frire à très forte
température, ce qui dissout les petites arêtes intramusculaires — est documentée comme
répandue en Europe centrale et orientale, sur carassin, petit brochet (< 1 kg), petit
barbeau, brème, gardon. Aucune source n'a confirmé une origine spécifiquement polonaise :
l'app la nommera sur la base vérifiée plutôt que d'affirmer une attribution non sourcée.

### Combler les trous, sans gonfler artificiellement

Espèces actuellement à une seule recette : sandre (partagée avec le brochet dans
`sandre-brochet-au-beurre-blanc`), tanche, perche, et chaque espèce des groupes
`friture-poissons-blancs` et `terrine-cyprinides` (qui n'ont qu'une recette chacun, partagée
entre plusieurs espèces).

Règle stricte : pour chacune, vérifier s'il existe une **deuxième tradition française
réelle et sourçable, distincte de la première** — pas une variante cosmétique de la même
préparation. Si elle existe, l'ajouter avec sa source. Si elle n'existe pas, l'espèce reste
à une recette et l'audit le dit explicitement plutôt que d'inventer un plat pour combler un
chiffre. Ceci prolonge directement la règle déjà appliquée aux cyprinidés arêtés lors du
chantier précédent.

### Écrevisses : les trois espèces pêchables seulement

Louisiane, américaine, signal — jamais pattes blanches, grêles ou rouges, fermées toute
l'année. Recettes ciblées : bisque, à la nage, gratin — les trois préparations les mieux
établies en cuisine française.

`Crayfish` (`src/data/ecrevisses.ts`) n'a pas de champ `edibility` séparé comme les
poissons — chaque nouvelle recette porte donc son propre `safety` autonome, sans renvoi
vers un fichier qui n'existe pas pour ce domaine.

## Contenu

### Technique : Lever un filet

Geste de base pour poisson rond (brochet, sandre, perche, silure, carpe…) : inciser
derrière les ouïes jusqu'à l'arête, coucher la lame, longer la colonne vertébrale jusqu'à
la queue, retourner le poisson, répéter de l'autre côté, parer la cage thoracique. Technique
générale, non controversée, sourcée comme un savoir-faire de couteau plutôt que par une
référence médicale — au même niveau de sourçage que `ikejime` ou `dégorgeage`.

### Technique : Entailler en croisillons

Entailles parallèles à moins de 4 mm d'intervalle, jusqu'à l'arête centrale sans la
sectionner, puis friture à très forte température. `speciesNote` couvrant carassin, petit
brochet, barbeau, brème, gardon. Référencée en option depuis `friture-poissons-blancs` et
`terrine-cyprinides` (`techniques[]`), sans modifier leurs autres champs.

### Recettes d'espèces déjà couvertes (sous réserve de l'audit)

Le plan d'implémentation contient une tâche d'audit explicite qui déterminera, espèce par
espèce, si une deuxième recette est ajoutée. Aucune recette n'est pré-écrite dans cette spec
pour ne pas présumer du résultat de l'audit.

### Recettes d'écrevisses

Trois recettes, une par grande préparation, ciblant `["louisiane", "americaine", "signal"]`
ou un sous-ensemble si la tradition est propre à une préparation :
- **Bisque d'écrevisses** — la préparation la plus classique, base de fumet de carapaces.
- **Écrevisses à la nage** — court-bouillon aromatique, service simple.
- **Gratin d'écrevisses** — préparation plus riche, béchamel ou sauce Nantua.

Chaque recette suit le format des recettes de poisson (`ing`, `steps`, `safety`, `source`).
Le `safety` couvre ce qui est propre aux écrevisses : cuisson à cœur des carapaces,
et pour la Louisiane spécifiquement — espèce R432-5 — aucun avertissement sanitaire
alimentaire particulier n'est actuellement documenté au-delà de l'interdiction de transport
vivant déjà couverte par la fiche espèce ; ne rien inventer ici.

## Tests

- Chaque nouvelle technique : `speciesNote` ids résolvent dans `SPECIES`.
- Chaque nouvelle recette d'écrevisse : chaque id de `species[]` résout dans `ECREVISSES`
  et correspond à une espèce `pechable: true` — un test dédié interdit qu'une recette cible
  une espèce fermée, symétrique à celui qui existe déjà côté poissons
  (`EDIBILITY[id].status !== "non"`).
- Les recettes de poissons ajoutées par l'audit passent les mêmes gardes que les recettes
  existantes (Task 6 du chantier précédent : liens, médias, invariant ANSES).

## Périmètre

**Dans le périmètre :** les deux techniques ; l'audit borné des espèces à une recette ; les
trois recettes d'écrevisses pêchables.

**Hors périmètre :**
- Recettes pour les écrevisses fermées (pattes blanches, grêles, rouges) — on ne cuisine
  pas une espèce qu'on ne peut pas prélever.
- Photos pour les nouvelles techniques/recettes si aucune source Commons convenable
  n'existe — repli sur la photo d'espèce, comme pour le reste du module.
- Toute recette qui ne correspond pas à une tradition française réelle et sourçable.
