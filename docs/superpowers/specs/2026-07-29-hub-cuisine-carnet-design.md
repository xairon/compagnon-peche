# Hub Cuisine dans Carnet — recherche unifiée recettes/techniques — design

_Conception validée le 29 juillet 2026._

## Intention

Autoportant : lisible sans aucun contexte externe.

Le contenu cuisine de l'app (20 recettes de poisson, 3 recettes d'écrevisses, 9 techniques,
plus les recettes personnelles de l'utilisateur) existe et est correct, mais il est éclaté
en trois points d'accès qui ne se voient pas entre eux : l'onglet « guide » de l'écran
« Mes recettes », l'écran « Techniques & gestes », et la section « Recettes » de l'écran
Écrevisses. Rien ne permet de chercher ou de filtrer à travers l'ensemble.

Ce chantier crée un véritable point d'entrée unique : un 4ᵉ segment « Recettes » dans
Carnet, avec une recherche texte insensible aux accents, des filtres, et une mise en avant
des recettes qui correspondent aux prises réelles de l'utilisateur.

## Décisions retenues

### Placement : 4ᵉ segment de Carnet, pas un nouvel onglet de navigation

Carnet a déjà une architecture à segments (`Prises` / `Spots` / `Écrevisses`). Le nouveau
contenu y devient un 4ᵉ segment `"recettes"` plutôt qu'un 6ᵉ onglet de la barre de
navigation du bas — cette dernière a été volontairement resserrée à 5 emplacements dont un
bouton d'action central (« Prise »), et rajouter un onglet la contredirait.

### Deux écrans existants sont absorbés

- **« Mes recettes »** (tuile de la boîte à outils) disparaît. Son contenu — guide des
  recettes intégrées, recettes personnelles, création — migre entièrement dans le nouveau
  segment. `RecipeView` et `RecipeEditor` (déjà extraits dans un chantier précédent) sont
  réutilisés tels quels ; seule la coquille liste de `MesRecettes.tsx` disparaît.
- **« Techniques & gestes »** (tuile de la boîte à outils) disparaît aussi. Le composant
  liste `Techniques` (dans `src/screens/Techniques.tsx`) devient mort et est retiré. Le
  composant `TechniqueDetail` (la fiche d'une technique) **reste** — atteignable comme
  aujourd'hui depuis une puce de recette, et désormais aussi depuis une recherche. Le bloc
  « Sécurité sanitaire » (parasites, congélation, mucus) qui vivait en bas de l'écran liste
  garde sa place dans le nouveau segment, pour ne rien perdre.

### La barre de segments de Carnet perd « Statistiques »

`.pf-seg` contient aujourd'hui trois segments et un lien « Statistiques › » greffé dedans.
À quatre vrais segments, la rangée serait trop serrée sur un petit téléphone (`flex:1` sur
chaque bouton, police 13px, déjà tendu à trois segments + un lien). « Statistiques » sort de
la rangée segmentée vers un lien séparé à côté — la rangée redevient un sélecteur homogène
à 4 choix.

## Contenu et comportement de recherche

Une seule barre de recherche texte, deux blocs de résultats en dessous : **Recettes**
(guide + personnelles mélangées, badge « Ma recette » comme aujourd'hui dans `MineCard`) et
**Techniques**. Les deux blocs filtrent sur la même requête texte, contre `title`
(+ `ing[]` et les noms des techniques liées pour les recettes ; `name` + `summary` pour les
techniques).

Trois puces de filtre — **Espèce**, **Difficulté & temps**, **Bivouac** — ne s'appliquent
qu'au bloc Recettes. Une technique n'a ni difficulté, ni temps, ni statut bivouac ; lui
imposer ces filtres n'aurait pas de sens et ferait comme si les deux types de contenu
étaient interchangeables, alors qu'ils ne le sont pas.

**Recherche insensible aux accents et à la casse** : une recherche sur « peche » doit
trouver « pêche ». Les deux côtés de la comparaison (requête et contenu) sont normalisés
(minuscules, diacritiques retirés via NFD) avant comparaison — sans quoi la recherche
paraît cassée pour quiconque tape vite sur mobile sans accent.

### « D'après vos prises »

Section en tête du segment, visible seulement si l'utilisateur a au moins une prise
enregistrée (poisson ou écrevisse). Algorithme : prendre les prises de `state.catches`
triées par date décroissante (`iso`, puis `time`), dédupliquer par `spid` en gardant la plus
récente occurrence de chaque espèce, ne retenir que les espèces qui ont au moins une vraie
recette (`recipesForSpecies(spid).length > 0`), garder les 3 premières. Même logique côté
écrevisses avec les sessions de `state.crayfish` (dédupliquées par espèce de leur `tally`)
contre `CRAYFISH_RECIPES`. Aucune prise ne correspondant à une recette → la section ne
s'affiche pas, jamais un message vide.

### Création d'une recette personnelle

Un bouton « + » dans le nouveau segment ouvre le même `RecipeEditor` qu'aujourd'hui — le
flux ne change pas, seul son point d'entrée se déplace. La navigation interne
(`editing`/`viewId`) reproduit exactement le pattern déjà en place dans
`MesRecettes.tsx` : une recette du guide s'ouvre via `nav("recette", {recipeId})` (l'écran
`Recette.tsx` existant), une recette personnelle s'ouvre en état local via `RecipeView`.
Cette asymétrie existe déjà et fonctionne ; elle n'est pas unifiée ici, pour ne rien
risquer sur un flux qui marche.

### Filtre Espèce

La liste d'espèces proposées n'est pas le catalogue complet (129 poissons + 6 écrevisses,
la plupart sans recette) mais uniquement les espèces qui apparaissent réellement dans au
moins une recette (`RECIPES[].species` + `CRAYFISH_RECIPES[].species`, dédupliquées) —
offrir un filtre qui mène systématiquement à zéro résultat serait une impasse, exactement
ce que ce projet évite ailleurs (le guide matériel ne propose que des espèces reliées, pas
le catalogue entier).

### Filtre Difficulté & temps

Difficulté : les trois valeurs existantes (`1|2|3` → Facile/Moyen/Difficile, `DIFF_LABEL`
déjà utilisé ailleurs). Temps : trois choix — « ≤ 20 min », « ≤ 45 min », « Toutes durées » —
calculés sur `prep + cook`, à une exception près : la recette dont `cook === 0`
(stérilisation de conserve, dont la durée n'est délibérément pas chiffrée — voir le chantier
comestibilité) compte comme `prep` seul, jamais `prep + 0` présenté comme un total, exactement
la règle déjà posée dans `Fiche.tsx` pour l'affichage de cette même recette.

## Données et fichiers

**Logique en fonctions pures, testables, dans `src/lib/recipes.ts`** (pas dans le
composant) :
- `searchRecipes(query, filters, recipes)` — texte + espèce + difficulté/temps + bivouac.
- `searchTechniques(query, techniques)` — texte seul.
- `recentCatchRecipes(catches, crayfishSessions)` — l'algorithme « d'après vos prises »
  ci-dessus, retourne au plus 3 suggestions avec leur(s) recette(s).
- Une fonction de normalisation de texte partagée (minuscule + retrait des diacritiques),
  utilisée par les trois.

**Nouveau composant** `src/components/CarnetRecettes.tsx` : affichage seul (barre de
recherche, puces de filtre, suggestions, deux blocs de résultats, bouton de création),
consommant les fonctions ci-dessus et `RecipeView`/`RecipeEditor` existants.

**Fichiers modifiés** : `src/store.tsx` (`CarnetSeg` gagne `"recettes"`), `src/screens/Carnet.tsx`
(4ᵉ bouton de segment, rendu du nouveau composant, sortie de « Statistiques » de `.pf-seg`),
`src/screens/Outils.tsx` (retrait des tuiles « Mes recettes » et « Techniques & gestes »),
`src/App.tsx` (retrait de la route `"mes-recettes"` et du rendu de la liste `Techniques` —
`TechniqueDetail` reste routée), `src/screens/Techniques.tsx` (retrait du composant liste
devenu mort ; `TechniqueDetail` inchangé), `src/screens/MesRecettes.tsx` (supprimé — sa
coquille liste n'a plus de rôle une fois `RecipeView`/`RecipeEditor` consommés directement
par `CarnetRecettes`).

## Tests

- `searchRecipes`/`searchTechniques` : recherche accentuée vs non accentuée trouve le même
  résultat ; chaque filtre isolément ; les filtres combinés (ET logique) ; requête vide
  retourne tout.
- `recentCatchRecipes` : avec et sans historique de prises ; une espèce sans recette réelle
  n'apparaît jamais dans les suggestions ; déduplication par espèce ; plafond à 3.
- Le cas `cook === 0` de la recette de conserves n'entre jamais dans le bucket « ≤ 20 min »
  sur la seule valeur de `prep` sans vérification — test dédié qui confirme le calcul exact.
- Rien à ajouter côté intégrité des données (`RECIPES`/`CRAYFISH_RECIPES`/`TECHNIQUES`
  liens) : déjà couvert par les tests existants.
- Vérification navigateur : recherche, chaque filtre, section « d'après vos prises » avec
  au moins une prise réelle en jeu de données de test, création d'une recette personnelle
  de bout en bout, `TechniqueDetail` atteignable depuis un résultat de recherche, lien
  Statistiques toujours joignable après être sorti de la rangée segmentée.

## Périmètre

**Dans le périmètre :** le 4ᵉ segment, la recherche unifiée, les 3 filtres, « d'après vos
prises », le retrait des deux écrans absorbés, la sortie de Statistiques de la rangée
segmentée.

**Hors périmètre :**
- Toute suggestion algorithmique au-delà des prises réelles (pas de recommandation par
  saison, météo, ou espèce en vogue).
- Modifier le contenu des recettes/techniques elles-mêmes — ce chantier ne touche qu'à leur
  découverte, pas à leur contenu.
- Le chantier sélecteur de département (demandé séparément) — traité à part.
