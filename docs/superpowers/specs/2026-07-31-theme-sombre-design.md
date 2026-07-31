# Thème sombre — design

_Conception validée le 31 juillet 2026._

## Intention

Autoportant : lisible sans aucun contexte externe.

L'app n'a qu'un thème, clair, conçu pour la lisibilité en plein soleil au bord de l'eau. Elle
ignore `prefers-color-scheme` : ouverte le soir sur un téléphone réglé en sombre, elle éclaire
la pièce. Le besoin exprimé est celui-là et rien d'autre — **cohérence avec le système**, pas
un mode « vision nocturne » pour la pêche de nuit. Aucun besoin terrain n'est identifié, donc
aucune concession terrain n'est faite : le thème clair ne bouge pas d'un pixel.

L'obstacle n'est pas le design du thème sombre, il est en amont. `src/styles.css` fait 6 567
lignes et contient **582 couleurs écrites en dur** pour seulement **18 jetons** dans `:root` ;
les inline styles TSX en contiennent **154** de plus. Une couleur en dur ne peut pas changer
avec le thème. Ce chantier est donc d'abord un chantier de tokenisation, et le thème sombre en
est la conséquence.

La bonne nouvelle, qui rend l'affaire tractable : ces 582 occurrences ne sont que **120 valeurs
distinctes** (44 côté TSX), et le haut du classement est constitué de **copies littérales de
jetons qui existent déjà** — `#6b675c` (69 occurrences) est `--muted`, `#1d6e42` (33) est
`--green`, `#fbfaf7` (21) est `--paper`, `#16281e` (22) est `--green-dark`. On balaie par
valeur, pas par site.

## Décisions retenues

### Le balayage se fait en trois temps, chacun prouvable seul

L'erreur à éviter est de mélanger « je range les couleurs » et « je change les couleurs » :
si les deux arrivent dans le même commit, plus rien ne dit si une différence visuelle est
voulue ou accidentelle sur une feuille de cette taille.

1. **Neutralisation.** Les valeurs qui sont des copies littérales d'un jeton existant
   deviennent ce jeton. **Aucun changement visuel** : la vérification est que le CSS compilé,
   une fois les `var()` résolus, est identique à l'octet près. C'est mécanique et sûr.
2. **Extension.** Les valeurs restantes deviennent de nouveaux jetons, nommés par rôle.
   Toujours aucun changement visuel, même vérification.
3. **Thème sombre.** Un bloc qui ne redéfinit **que** les jetons. Les 6 567 lignes de règles
   ne sont jamais retouchées pour le sombre — c'est ce qui rend le thème relisable et ce qui
   empêche les deux thèmes de diverger au fil des retouches futures.

Les étapes 1 et 2 ont de la valeur même si le chantier s'arrête là : une feuille où la palette
est déclarée en un seul endroit est plus facile à faire évoluer, thème sombre ou non.

### Les jetons sont nommés par rôle, pas par teinte

`:root` passe d'environ 18 à environ 32 jetons. Un jeton nommé par sa teinte (`--vert-fonce`)
n'a pas de sens en sombre, où la surface la plus foncée devient la plus claire ; un jeton nommé
par son rôle en garde un.

- **Surfaces** — `--paper`, `--card`, `--backdrop`, `--sand`, `--surface-raised`
- **Texte** — `--ink`, `--ink-2`, `--body`, `--muted`, `--faint`, `--on-accent`
- **Traits** — `--line`, `--line-strong`
- **Sémantique** — `--green`, `--amber`, `--red`, `--info`, chacun avec son `-bg` (fond de
  cartouche) et son `-ink` (texte posé sur ce fond)
- **Décor** — `--brass`, `--brass-ink`, `--fir`

Les jetons actuels gardent leur nom quand leur rôle est déjà clair (`--paper`, `--ink`,
`--muted`, `--line`, `--green`, `--amber`, `--red`, `--sand`, `--brass`, `--brass-ink`,
`--fir`), pour ne pas transformer une tokenisation en renommage massif.

Une dizaine de cas ne se rangent dans aucun rôle : dégradés, ombres portées, `rgba()` de voile
(80 occurrences de `rgba()` dans la feuille). Ils sont traités à la main en fin d'étape 2, pas
mécaniquement. Les voiles noirs semi-transparents posés sur une surface claire doivent devenir
des voiles blancs en sombre, ce qu'aucun remplacement de valeur ne devine.

### Les inline styles TSX suivent le même traitement

154 sites, 44 valeurs distinctes, répartis dans une vingtaine de composants et d'écrans :
`style={{ color: "#6b675c" }}` devient `style={{ color: "var(--muted)" }}`.

Attention à ce que devient le garde-fou : `src/lib/contraste-inline.test.ts` ne résout **pas**
les `var()`. C'est une **liste noire** de trois valeurs hexadécimales mesurées trop faibles, qui
interdit leur réapparition. Une fois un site tokenisé, ce test ne le voit donc plus du tout —
la couverture se déplace vers la table de paires, qui mesure les jetons. C'est un gain net
(un jeton est mesuré partout où il sert, une liste noire ne voit que ce qu'on y a écrit), mais
il faut que le déplacement soit délibéré : le test mute d'une liste noire de trois valeurs vers
l'interdiction de **tout** littéral de couleur en style inline. Plus strict, et plus simple.

### Le thème se choisit : système par défaut, bascule manuelle possible

Trois états — **Auto**, **Clair**, **Sombre** — dans un contrôle segmenté placé en haut de
`src/screens/Outils.tsx`. Pas un nouvel écran ni une nouvelle tuile : Outils est une liste de
destinations, or un thème est un réglage, pas une destination. Le contrôle vit donc en tête
d'écran, au-dessus des tuiles.

La préférence rejoint `src/lib/prefs.ts`, qui existe précisément pour « les préférences qui
doivent être connues **avant le premier paint** » (c'est écrit en tête du fichier) et qui porte
déjà `dept` et `bigUI` sous la clé `carnet:prefs`. Le thème y ajoute un champ
`theme: "auto" | "light" | "dark"`. Pas de clé `localStorage` séparée : une seconde clé
obligerait le script anti-flash à connaître deux emplacements, et ferait diverger deux
mécanismes de persistance pour la même catégorie de réglage.

Cette préférence n'est pas lue par la feuille de style : **`prefers-color-scheme` n'apparaît nulle part dans
le CSS**. Une seule chose pilote l'apparence, l'attribut `data-theme` sur `<html>`, qui vaut
toujours `"light"` ou `"dark"` — jamais `"auto"`. La feuille n'a donc qu'un bloc sombre :

```css
:root[data-theme="dark"] { /* jetons sombres */ }
```

C'est le code qui résout `"auto"` en une valeur concrète, en interrogeant
`matchMedia("(prefers-color-scheme: dark)")`. L'alternative — un bloc `@media` plus un bloc
`[data-theme]` — obligerait à écrire la liste des jetons deux fois, puisqu'on ne peut pas
grouper un sélecteur sous `@media` avec un sélecteur hors `@media`. Deux listes de jetons qui
doivent rester synchrones, c'est exactement ce que ce chantier cherche à supprimer.

En mode Auto, un écouteur sur ce `matchMedia` réécrit `data-theme` quand l'utilisateur bascule
le thème de son téléphone app ouverte. L'écouteur est retiré dès que la préférence est Clair
ou Sombre.

**Anti-flash.** Un script inline synchrone dans `index.html`, avant tout `<script type="module">`,
fait cette résolution une première fois et pose `data-theme` sur `<html>`. Sans lui, un
utilisateur en thème sombre voit un flash blanc pleine page à chaque lancement, le temps que le
bundle React se charge et s'exécute — sur une PWA lancée depuis l'écran d'accueil, c'est le
défaut le plus visible de toute la fonctionnalité. Le script doit être minimal et défensif : un
`localStorage` inaccessible en navigation privée ne doit pas empêcher l'app de démarrer. La
logique de résolution est écrite une fois dans un module testable et le script inline en est la
forme minimale, pas une seconde implémentation.

**`theme-color`.** La balise unique `<meta name="theme-color" content="#16281E">` devient deux
balises différenciées par `media="(prefers-color-scheme: light)"` et `"(prefers-color-scheme:
dark)"`, ce qui donne la bonne barre d'état en mode Auto avant même que le moindre script ne
tourne. C'est la seule exception assumée à la règle « `prefers-color-scheme` n'apparaît pas
dans la feuille » : il s'agit ici de balises `<meta>`, pas de règles CSS, et elles ne pilotent
rien d'autre que la couleur de la barre d'état. Dès que le thème est résolu — au chargement
comme à chaque changement — la valeur est réécrite depuis le thème effectif, sinon la barre
d'état du téléphone contredit l'app.

### La carte bascule sur un fond sombre, sauf les rasters IGN

`src/lib/basemaps.ts` gagne un style sombre pour le fond vectoriel par défaut : Carto **Dark
Matter** (`https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`) en regard du
Voyager actuel. Le style est choisi selon le thème actif, et un changement de thème carte
ouverte recharge le style de la carte.

Trois points à dire plutôt qu'à laisser découvrir :

- **Le satellite et le plan IGN restent clairs**, dans les deux thèmes. Ce sont des rasters
  photographiques et cartographiques ; il n'en existe pas de version sombre. Une orthophoto
  n'a pas de thème, pas plus qu'une photo d'espèce.
- **Le hors-ligne ne change pas de nature.** `vite.config.ts:137` a déjà une règle
  `CacheFirst` sur `basemaps.cartocdn.com/*` : le style sombre, ses glyphes et ses sprites se
  cachent exactement comme le clair, c'est-à-dire **après un premier affichage en ligne**. Le
  fond de carte vectoriel n'est pas préchargé aujourd'hui non plus ; la promesse hors-ligne de
  l'app porte sur les fiches, la réglementation et les parcours, pas sur le fond de carte.
  L'effet réel est qu'un utilisateur qui n'a jamais ouvert la carte en ligne dans un thème
  donné n'aura pas ce fond hors-ligne — même situation qu'aujourd'hui, appliquée à deux styles.
- **Aucun changement de CSP.** `src/lib/csp.ts` autorise déjà `basemaps.cartocdn.com` et son
  joker de sous-domaines en `img-src` et `connect-src` ; Dark Matter est servi par le même hôte.

### Les garde-fous de contraste jouent les deux thèmes

C'est la partie qui empêche le thème sombre de se dégrader silencieusement. `contraste-palette.ts`
tient aujourd'hui **63 paires** écrites à la main (texte, fond, taille, seuil), relues dans la
feuille de style.

- La fonction de résolution prend un **thème** en paramètre et lit les jetons du bloc
  correspondant. La table des 63 paires **n'est pas dupliquée** : les fonds y sont exprimés en
  jetons, donc ils suivent le thème d'eux-mêmes. Le test s'exécute deux fois sur la même table.
- Un test neuf **échoue si un jeton défini en clair n'a pas d'équivalent sombre**. C'est ce qui
  attrape le cas où quelqu'un ajoute une couleur dans six mois en oubliant le sombre.
- Un test de non-régression **interdit le retour de couleurs en dur** : aucun littéral
  hexadécimal ou `rgb()` dans `styles.css` hors du bloc `:root` et des blocs de thème, ni dans
  les inline styles TSX. Sans lui, la feuille se re-remplit de couleurs en dur en quelques
  chantiers et le thème sombre pourrit par endroits.

La limite documentée en tête de `contraste-palette.ts` reste vraie et n'est pas levée ici : le
fichier ne balaie pas la feuille, il ne connaît que les paires écrites à la main, et les fonds
hérités ne sont pas déduits de la cascade. Le thème sombre hérite de cette limite.

### La règle à l'écran garde son fond clair

`src/screens/Regle.tsx` affiche une réglette de mesure sur laquelle on pose le poisson. Elle
garde son fond clair dans les deux thèmes : c'est un instrument, le contraste de la silhouette
du poisson posé dessus prime sur la cohérence du thème. Elle est donc explicitement exclue de
la tokenisation de surface, avec un commentaire qui dit pourquoi — sinon la prochaine passe la
« corrigera ».

## Hors périmètre

- **Les photos d'espèces et les diagrammes de nœuds** ne sont pas retouchés. Une image de
  contenu n'a pas de thème. Les diagrammes SVG de nœuds sur fond clair sont conservés tels
  quels ; si leur cadre paraît trop lumineux en sombre, c'est une passe esthétique ultérieure,
  pas ce chantier.
- **Aucun mode « vision nocturne »** (teintes rouges, luminosité réduite pour préserver
  l'adaptation à l'obscurité). Ce serait une fonctionnalité terrain, avec ses propres exigences
  de contraste ; le besoin n'est pas exprimé.
- **Le thème clair ne change pas.** Aucune retouche esthétique n'est glissée dans ce chantier.

## Vérification

- Étapes 1 et 2 : le CSS compilé, `var()` résolus, est identique avant/après.
- Les 63 paires de contraste passent dans les deux thèmes, aux seuils actuels (4,5:1 texte,
  3:1 non-texte).
- Chaque jeton clair a son équivalent sombre (test dédié).
- Aucune couleur en dur hors des blocs de thème, en CSS comme en inline TSX (test dédié).
- La suite existante passe sans modification des tests métier.
- Vérification visuelle des deux thèmes sur les écrans principaux, plus le lancement en PWA
  installée pour confirmer l'absence de flash blanc.
