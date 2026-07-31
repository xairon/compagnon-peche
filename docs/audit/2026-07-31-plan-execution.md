# Plan d'exécution — Compagnon de pêche

**Base** : audit 12 dimensions (26 agents) → contre-expertise → passe de consolidation (12 vérificateurs,
lecture de code obligatoire sur chaque constat). 31 juillet 2026.

Barème d'effort : **S** = 0,5 j · **M** = 1,5 j · **L** = 4 j.

---

## État consolidé

Le premier audit avait produit **135 constats**. La passe de consolidation en a **écarté 102 comme faux
positifs** — le code contredisait le constat, le garde-fou existait ailleurs, ou l'auditeur avait mal lu.
Il reste **134 items vérifiés ligne par ligne** : **2 bloquants, 46 majeurs, 69 moyens, 17 mineurs**.

Après fusion des doublons **inter-domaines** (que les vérificateurs ne pouvaient pas voir, chacun n'ayant
que son propre domaine — la CI apparaissait 4 fois, le département 3 fois, l'historique de navigation
2 fois), il reste **≈ 115 items réels**, pour une charge brute de **≈ 140 jours**.

Ce total n'est pas le chemin vers la v1.0. Il contient tout, y compris ce qui peut attendre indéfiniment.
Le séquencement ci-dessous met **15,5 jours** avant la sortie fermée et **32 jours** avant la publique.

---

## Doublons fusionnés

À traiter comme un seul item, sous peine de faire trois fois le même travail :

| Item canonique | Absorbe |
|---|---|
| `ci-gate` | `ci-sans-tests-ni-lint`, `ci-garde-fous`, `ci-sans-tests` |
| `stores-registre` | `crayfish-non-exporte`, `export-registre-stores` |
| `import-validation` | `import-sans-validation`, `import-schema-non-valide` |
| `dept-persiste` | `dept-non-persiste` (les deux décrivent `store.tsx:145`) |
| `dept-demande` | `dept-jamais-demande`, `hors-zone-hors-ligne`, `hors-zone-offline` |
| `reg-millesime` | `reg-year-peremption`, `millesime-reglementaire`, `millesime-non-versionne` |
| `nav-historique` | `retour-systeme-android`, `nav-history-api` |
| `contrastes-aa` | `contraste-textes-clairs` |
| `cibles-44` | `tap-targets-44`, `btn-light-sans-regle-de-base` |
| `mentions-legales` | `mentions-legales-contact` |
| `credits-licences` | `credits-medias-manquants`, `licences-photos` |
| `sources-a-jour` | `sources-perime`, `sources-perimees` |
| `eau-parallele` | `accueil-water-sequentiel`, `loadwater-sequentiel` |
| `precache-decoupe` | `precache-atomique-7-6-mo`, `precache-sans-indicateur`, `pret-hors-ligne-non-signale` |

---

## v0.9 — sortie fermée (5 à 10 testeurs, lien non public)

**15,5 jours.** Objectif : qu'un testeur ne puisse ni perdre ses données, ni lire une réglementation qui
n'est pas la sienne, ni tomber sur une fonction morte — et qu'il puisse te signaler ce qu'il trouve.

### Lot 1 — La porte de la CI · `ci-gate` · **0,5 j** · aucune dépendance
Deux lignes dans `.github/workflows/deploy.yml` entre `npm ci` (:32) et `npm run build` (:33) :
`npm run lint` et `npm test`. Plus un `ci.yml` sur `pull_request`, plus `.github/dependabot.yml`.

*Vérifié pendant la consolidation* : `npx eslint src` sort déjà en exit 0, zéro ligne. Le lint est propre,
il n'y a rien à nettoyer avant de brancher la porte. Et `npm run build` = `tsc -b && vite build`, donc le
typage bloque déjà — ce qui passe sans filet, ce sont les régressions de **logique** métier.

**Fini quand** : un commit qui casse un test de `maille.test.ts` fait échouer le workflow.
**Risque** : aucun. **À faire en premier** : c'est ce qui protège les 9 lots suivants.

### Lot 2 — La sauvegarde dit la vérité · `stores-registre` + `import-validation` · **3,5 j** · après lot 1
L'item le plus important du plan. `storage.ts:210-217` lit six clés ; `carnet:crayfish` n'y est pas, alors
que le fichier produit affirme `"Sauvegarde locale complète"` (`storage.ts:234`) et que l'écran répète
« c'est votre seul filet en cas de perte d'appareil » (`Stockage.tsx:191-195`). Second défaut au même
endroit : `mergeById("fish-bundles", …)` (`storage.ts:297`) **jette son résultat**, donc restaurer des
ensembles matériel affiche « tout y était déjà présent ».

1. `db.ts:7-12` → registre exporté `STORES` (7 clés, dont `bundles` qui n'y était pas), et remplacer les
   6 constantes locales par ses membres. **Recopier les valeurs littérales à l'identique** — une faute de
   frappe rend le carnet existant invisible.
2. `storage.ts` : 7ᵉ `get(STORES.crayfish)`, champ `crayfish` dans le bundle, `EXPORT_SCHEMA` 2 → 3,
   texte de `note` corrigé, `crayfish` et `bundles` dans `ImportResult`, retour de `mergeById` capturé.
3. `Stockage.tsx:51` : les deux nouveaux compteurs dans le total et dans le récapitulatif.
4. `Materiel.tsx:35,46` : `"fish-bundles"` → `STORES.bundles`.
5. Contrôle de schéma dans `importData`, après `data.app` (:278) : refuser `sc > EXPORT_SCHEMA` avec un
   message clair. Tolérer l'absence du champ (`?? 1`) et comparer avec `>`, **jamais** `!==` — les
   sauvegardes déjà téléchargées par les testeurs n'ont pas le champ.

**Fini quand** : `export-couverture.test.ts` compare `Object.keys(STORES)` aux clés lues par `exportData`
et échoue si un magasin manque — c'est le seul test qui empêche le prochain oubli du même type. Plus un
round-trip export→import avec une séance écrevisses (`idb-keyval` mocké, patron de `photos.test.ts:8-19`).
**Risque** : le renommage touche 6 fonctions `load/save` de `db.ts`.

### Lot 3 — L'export ne ment plus sur son succès · `export-succes-non-verifie` · **1,5 j** · après lot 2
`storage.ts:256` appelle `setLastExportAt` après un simple `a.click()`, et `Stockage.tsx:37-41` n'a pas de
`try/catch` : le libellé passe à « ✓ Sauvegarde téléchargée » et le rappel s'éteint 14 jours, même quand
rien n'a été écrit — cas réel sur PWA iOS en mode standalone, où l'ancre+blob est silencieusement avortée.

`try/catch` autour de `doExport`, repli `navigator.share({files})` quand `canShare` est vrai, et
`setLastExportAt` **après** résolution seulement. Ajouter la phrase « ce fichier contient les coordonnées
GPS de vos spots » — le testeur va l'envoyer par mail.

**Nuance retenue de la consolidation** : `setLastExportAt` est situé *après* la construction du blob, donc
une exception (OOM base64) empêche déjà le réarmement. Le faux sentiment de sécurité vient uniquement du
téléchargement avorté, pas de l'exception. Le fix reste le même, la justification change.

### Lot 4 — L'app sait où pêche son utilisateur · `dept-persiste` + `dept-demande` · **2 j** · après lot 1
`store.tsx:145` : `dept: "41"` en dur. Un `grep dept src/store.tsx` ne rend **que** les lignes 103 et 145 —
aucun des six effets de persistance ne le touche. Rien ne le demande jamais : `Onboarding.tsx` (66 lignes)
n'a aucune étape département, et le sélecteur de `Reglement.tsx:84-108` est une rangée de trois boutons nus
placée **après** tout le contenu réglementaire, sans libellé au-dessus.

Conséquence mesurée : un pêcheur de l'Indre lit « 6 truites/jour » (`regulation.ts:124`, le 41) au lieu de
« 6 salmonidés dont 2 fario max » (`regulation.ts:102`) — **plus permissif que sa loi**.

1. `src/lib/prefs.ts` : `readPrefs`/`writePrefs` sur `localStorage` (synchrone — `dept` et `bigUI`
   influencent le premier rendu ; IndexedDB provoquerait un flash). Garde obligatoire
   `p.dept in DEPARTEMENTS`. **Fallback sur l'ancienne clé `bigUI`** sinon tous les utilisateurs existants
   perdent leur mode gants au déploiement.
2. `store.tsx` : `const PREFS = readPrefs()` avant `initialState`, 7ᵉ effet de persistance. Supprimer
   `App.tsx:97-104`, la clé `bigUI` a désormais un seul propriétaire.
3. 2ᵉ carte d'onboarding « Où pêchez-vous ? » : les 3 puces + « Me localiser ». **Ne jamais bloquer
   l'entrée** — le CTA reste actif sans choix.
4. `DeptDefautWarning.tsx` sur le modèle de `OutOfZoneWarning.tsx`, posé aux trois endroits où la
   réglementation est affirmée (`Accueil.tsx:207`, `Prise.tsx:77`, `Reglement.tsx:19`).
5. Remonter le sélecteur de `Reglement.tsx` **avant** le contenu, avec un libellé.

**Piège** : `deptFromCoords` (`sandre.ts:124`) appelle `data.geopf.fr` — le chemin GPS ne marche pas hors
réseau. Les trois puces manuelles sont le chemin principal, pas le repli, sinon le premier écran d'une app
« offline-first » commence par un échec.

### Lot 5 — Les couches réglementaires s'affichent enfin · `csp-geo-ide` · **0,5 j** · parallélisable
`parcours.ts:31` sert 10 couches WMS (catégorie piscicole + réserves) depuis `ogc.geo-ide…gouv.fr`, absent
de `img-src` **et** de `connect-src` (`vite.config.ts:17,19`). La CSP n'est injectée qu'au build
(`apply: "build"`) : **tout marche en dev, rien en prod**. L'utilisateur en déduit qu'il n'y a pas de
réserve. Effet secondaire : chaque tuile bloquée déclenche `Carte.tsx:599`, « Fond de carte indisponible
(hors-ligne ?) » en pleine 4G.

Ajouter le hôte aux deux directives, plus une entrée `runtimeCaching` CacheFirst (sinon ces couches ne
survivent pas hors-ligne). **Vérifier sur `npm run build && npx vite preview`, jamais en dev.** Puis le
test qui parse la constante `CSP` et échoue si un hôte de `BASEMAPS + PARCOURS_WMS + CATEGORIE_WMS` manque
— sans ce garde-fou, personne ne reverra jamais cette panne.

### Lot 6 — Le moratoire ne devient plus « à vous de décider » · `maille-label-perdu` · **0,5 j** · parallélisable
`prise.ts:177-208` lit `m.cm`, `m.text`, `m.local`, `m.aboveNational` — **jamais `m.label`**. Le saumon
atlantique et deux esturgeons (`maille: "spéciale"`, donc `cm = 0`) arrivent sur « Pas de taille légale
nationale — sinon, à vous de décider ». Or `maille.ts:8-11` documente que `label` existe *précisément*
pour ça, et il est rendu partout ailleurs (`Especes.tsx:207`, `Accueil.tsx:414`, `Fiche.tsx:468`).

Dans la branche `!has` : si `m.label !== null`, rendre le libellé, `tone: "warn"`, bannière
« VÉRIFIER L'ARRÊTÉ », et **supprimer** « à vous de décider » (le garder pour `label === null` : gardon,
carpe, silure). Test miroir de `maille.test.ts:66-86`.

*Correction de l'audit initial* : ces trois espèces ne portent **pas** `protected: true` — les seules du
dépôt sont `apron-du-rhone` et `esturgeon-europeen`, interceptées en amont par `prise.ts:60`. Le défaut est
réel, la dramatisation « espèce protégée » ne l'était pas.

### Lot 7 — Les licences sont respectées · `credits-licences` · **2 j** · parallélisable
`Credits.tsx:4` n'importe que `SPECIES_MEDIA, GEAR_MEDIA, CRAYFISH_MEDIA`. `RECIPE_MEDIA` et
`TECHNIQUE_MEDIA` sont pourtant affichées en production (`Recette.tsx:28`, `Techniques.tsx:29`,
`CarnetRecettes.tsx:237`) : **cinq images CC BY-SA redistribuées sans le crédit que la licence exige**, sur
l'écran qui promet « Merci à leurs auteurs » (`Credits.tsx:88`).

Deux sections bâties comme `gearRows`. Ajouter `licenseUrl` au type media (les licences CC exigent un lien
vers le texte). Supprimer ou rattacher `SPECIES_MEDIA["truite-de-mer"]` (`media.ts:554`), clé sans espèce
correspondante, qui affiche un slug brut. Puis le test qui itère `MEDIA_BY_KIND` et échoue si une clé n'est
pas rendue par Credits.

### Lot 8 — La réglementation connaît sa date de péremption · `reg-millesime` · **1,5 j** · parallélisable
`grep REG_YEAR src/` → **0**. Les mailles et quotas sont un instantané 2026 figé, mais `localRegRows`
(`regulation.ts:203-212`) prend `new Date().getFullYear()` et recalcule les dates : **au 1ᵉʳ janvier 2027,
l'écran affichera les dates 2027 à côté des mailles 2026**, sans un mot.

`src/data/version.ts` : `REG_YEAR`, `VERIFIE_LE`, numéros d'arrêté par département, `regOutdated()`.
Interpoler dans les ~18 chaînes qui recopient « 2026 ». Bannière ambre **persistante** (pas un toast) sur
Accueil, Prise, Fiche et Réglementation. Un test qui échoue dès que l'écart dépasse un an, pour que la CI
réclame la corvée annuelle.

Le mécanisme existe déjà à côté : `ProfileHeader.tsx:146-149` fait exactement ça pour la carte de pêche.

### Lot 9 — Le testeur peut te parler · `version-invisible` + `canal-de-retour` + `journal-erreurs-local` · **2,5 j** · après lot 1
Sans ça, la sortie fermée ne sert à rien. Aucun numéro de build nulle part (`grep __APP_VERSION__` → rien) :
un incident est impossible à rattacher à une version, et `registerType: "prompt"` laisse des installations
sur d'anciennes versions indéfiniment.

`define: { __APP_VERSION__, __COMMIT__, __BUILD_DATE__ }` dans `vite.config.ts`, affichés au pied de
`Sources.tsx` et dans `ErrorBoundary`. Lien « Signaler une erreur » (`mailto:` pré-rempli avec écran,
département, espèce, version, contenu affiché) en tête d'`Outils.tsx`, sous le bouton d'`ErrorBoundary`,
au pied de `Reglement.tsx`. Handlers globaux `unhandledrejection` et `error` dans `main.tsx` branchés sur
le bandeau `persistMsg` existant — un ErrorBoundary n'attrape ni les handlers d'événement ni les promesses.

Le doute sur la maille truite du 41 est **déjà écrit dans le code** (`regulation.ts:127`) et personne ne
peut le lever aujourd'hui.

### Lot 10 — L'app est utilisable sur un iPhone installé · `safe-area-top` + `etats-interactifs` · **1 j** · parallélisable
`grep safe-area` → 5 occurrences, **toutes en bas**, alors qu'`index.html:7` déclare `viewport-fit=cover` et
`:11` `black-translucent`. Le `.hero .back` de la fiche espèce occupe 14→54 px, **entièrement** dans l'inset
de 59 px d'un iPhone Pro : le bouton retour est totalement recouvert en mode installé. Invisible en onglet.

Plus : `-webkit-tap-highlight-color: transparent` est posé sur `*` (`styles.css:32-36`) et il n'existe que
**5 règles `:active`** pour 217 boutons — aucun retour tactile nulle part. Un bloc `:where(…):active` +
`:disabled` partagé.

---

## v1.0 — publique

**+16,5 jours (32 au total).** Objectif : ce qu'un inconnu est en droit d'attendre.

| Lot | Items | Effort |
|---|---|---|
| **Mentions légales** | `mentions-legales` — éditeur, contact, hébergeur, confidentialité, « ni conseil juridique ni avis médical ». *Les clauses réglementaires existent déjà* (`Fiche.tsx:701-704`, `Reglement.tsx:110-114`, `prise.ts:194`) : seul le volet identité + sanitaire manque. | M |
| **Accessibilité — fondations** | `structure-titres-reperes` (zéro `<h1>`, zéro `<main>`/`<nav>` dans 26 écrans), `focus-changement-ecran` (`<ErrorBoundary key={s}>` démonte l'élément focalisé, le focus retombe sur `<body>`), `verdict-prise-non-annonce` (la sortie la plus lourde de l'app, jamais annoncée) | M+M+S |
| **Accessibilité — formulaires** | `labels-non-associes` (33 `<label>`, `grep htmlFor` → 0 ; toucher « Poids » ne focalise pas le champ, donc la cible tactile est divisée par deux avec des gants), `cibles-44`, `etat-bascules-aria`, `feuille-balance-sans-echap` | M+S+S+S |
| **Contrastes** | `contrastes-aa` — `--amber` sur `--amber-bg` = 4,19:1, `--brass-ink` = 4,04:1, le ⓘ des cellules verdict à 1,9:1 *et c'est le seul indice qu'elles sont cliquables*. Ce sont les textes à lire en plein soleil. | M |
| **Navigation** | `nav-conventions` puis `nav-historique` — `grep pushState\|popstate` → 0 en `display: standalone` : le geste retour Android **ferme l'app**. Aucun lien profond, donc rien de partageable. | M+L |
| **Performance** | `lazy-ecrans-restants` (17 écrans statiques → 240 ko gzip avant le premier pixel), `fiches-eager-dans-species` (189 ko de fiches parsés par tout écran important `SPECIES`), `parcours41-litteral-eager` (270 ko pour un calque **désactivé par défaut**), `fonts-inutiles-precachees` | S+M+S+S |
| **Réseau** | `carte-statut-echecs` (tout échec rendu en « 0 station » — l'app ment sur la connectivité), `carte-refetch-pan` (1,5 Mo retéléchargés à chaque pan de quelques pixels), `spot-save-refetch`, `sandre-sw-timeout-charge` (6 s de timeout SW pour 1,5 Mo : la couche hydrographie **n'apparaît jamais** à la première visite), `net-corps-non-borne`, `briefing-concurrence-hubeau`, `geoloc-options-precision` | ≈ 7 j |
| **Offline** | `precache-decoupe` (7,6 Mo tout-ou-rien : un install interrompu en 4G laisse une app qui promet le hors-ligne devant des écrans vides), `maj-sw-sans-controle-ni-report`, `lecture-echouee-gele-ecritures`, `brouillon-prise-non-persiste` | ≈ 5 j |
| **Tests** | `coverage-include-et-seuils` (le 66 % affiché n'instrumente que les fichiers déjà importés — le réel est **24,26 %**), `storage-backup-non-teste`, `parcours-prise-carnet-non-teste` (`addCatch` n'est appelé par **aucun** test), `store-tests`, `net-fetcht-non-teste` | ≈ 7 j |
| **Moteur** | `taille-vs-maille` (la taille saisie n'est jamais confrontée à la maille : « Oui, elle fait la maille » reste l'action principale avec 45 cm pour un brochet), `notes-dept-espece` (`Fiche.tsx:180` fait `.slice(0,2)` — dans l'Indre, la note black-bass est l'indice 2, **jamais affichée**), `prise-now-injectable`, `horloge-non-verifiee` | ≈ 5 j |
| **Données** | `recettes-invasives-friture` (ni perche-soleil ni poisson-chat, les deux que l'app **interdit** de remettre à l'eau vivantes), `toxostome-critere-inverse` (la fiche affichée lui donne le critère du hotu), `ident-corpus-mort` (42 ko de code mort dans le bundle), `confusion-photos-non-resolues`, `sources-a-jour`, `readme-compteurs-perimes` | ≈ 5 j |
| **Distribution** | `manifest-partage` (ni `screenshots`, ni `shortcuts`, ni `id` ; aucune balise `og:` — un lien envoyé par WhatsApp entre pêcheurs s'affiche comme une URL nue), `install-ios-absente`, `geopeche-iframe` | M+M+S |

---

## v1.x — produit qui grandit

`theme-sombre` (L) — l'app cible explicitement l'aube, le crépuscule et les séances d'écrevisses nocturnes ·
`gants-liste-blanche` (L) — le mode gants est une liste blanche de 29 sélecteurs, absent de l'Accueil et de
la Carte, alors que l'onboarding promet qu'il « agrandit **toutes** les commandes » · `carte-monolithe` (L) ·
`repartition-geo-identificateur` (L) — l'identificateur propose des endémiques corses et pyrénéennes ·
`e2e-playwright-absent` (L) · `ecrans-sans-test-de-rendu` (L) · `export-base64-monolithique` (L) ·
`emoji-vs-icones` (M) · `multi-contexte-ecrasement` (M) · `picker-espece-degrade` (M) ·
`kill-sans-chrono-ni-cuisine` (M) · `especes-rerender-par-frappe` (M) · `doc-architecture` (S).

---

## Chemin critique

Une seule chaîne ne peut pas être parallélisée :

```
ci-gate → stores-registre → export-succes-non-verifie → import-validation
                ↓
        dept-persiste → dept-demande
                ↓
        nav-conventions → nav-historique
```

**Raisons réelles** : `export-succes-non-verifie` touche les mêmes lignes de `storage.ts` que le registre —
les faire en parallèle garantit le conflit. `dept-demande` a besoin que `readPrefs` existe pour savoir si le
département a déjà été choisi. `nav-historique` réécrit les 18 `onClick={back}`, ce qui n'a de sens
qu'après avoir unifié les conventions de navigation.

**Tout le reste est parallélisable.** Les lots 5, 6, 7, 8 et 10 de la v0.9 ne partagent aucun fichier avec
la chaîne principale : `vite.config.ts`, `prise.ts`, `Credits.tsx`, `version.ts`, `styles.css`.

Durée minimale du chemin critique : **≈ 11 jours**, ce qui borne la v1.0 par le bas quel que soit le nombre
de personnes sur le projet.

---

## Premier jour

### Tâche 1 — La porte (30 min)
```bash
npx eslint src && npm test
```
Doit sortir en exit 0 (vérifié pendant la consolidation : le lint est déjà propre). Puis insérer
`- run: npm run lint` et `- run: npm test` entre les lignes 32 et 33 de `.github/workflows/deploy.yml`,
créer `.github/workflows/ci.yml` sur `pull_request`, et `.github/dependabot.yml`.

**Vérification** : casser volontairement une assertion de `src/lib/maille.test.ts`, pousser sur une branche,
constater l'échec du workflow, annuler.

### Tâche 2 — Le registre des magasins (2 h)
Remplacer `db.ts:7-12` par `export const STORES = { … }` à 7 entrées, puis substituer les 6 constantes dans
les fonctions `load*`/`save*`. **Recopier les valeurs de chaînes à l'identique.**

**Vérification** :
```bash
npm test && npx tsc --noEmit
```
Puis lancer l'app, ouvrir le Carnet, confirmer que les prises existantes sont toujours là — c'est le seul
contrôle qui attrape une faute de frappe sur une clé.

### Tâche 3 — Les écrevisses entrent dans la sauvegarde (2 h)
7ᵉ `get(STORES.crayfish)` dans `exportData`, champ `crayfish` dans le bundle, `EXPORT_SCHEMA` → 3, texte de
`note` corrigé. `crayfish` et `bundles` dans `ImportResult`, résultat de `mergeById("fish-bundles")` capturé,
compteurs de `Stockage.tsx:51`.

**Vérification** : depuis l'app, créer une séance écrevisses, exporter, ouvrir le `.json` et confirmer la
présence du tableau `crayfish`. Puis « Tout effacer », réimporter, vérifier que la séance revient et que le
récapitulatif la compte.

### Tâche 4 — Le test qui empêche la récidive (1 h 30)
`src/lib/export-couverture.test.ts` : `expect(new Set(EXPORTED_KEYS)).toEqual(new Set(Object.values(STORES)))`.
Plus un round-trip export→import avec une séance, sur `idb-keyval` mocké (patron de `photos.test.ts:8-19`).

**Vérification** : ajouter une 8ᵉ clé factice à `STORES` sans l'exporter → le test doit échouer. La retirer.

### Tâche 5 — L'export cesse de mentir (2 h)
`try/catch` dans `Stockage.tsx:37-41`, repli `navigator.share({files})`, `setLastExportAt` déplacé après
résolution, mention des coordonnées GPS.

**Vérification** : simuler l'échec (`vi.spyOn` sur la création d'ancre, ou couper l'écriture disque) et
confirmer que le libellé n'affiche pas « ✓ » et que `backup:lastExportAt` n'a pas bougé.

---

## Écarté — ne pas faire

102 constats du premier audit ont été réfutés par lecture du code. Les plus coûteux si on les suivait :

- **« La sécurité applicative est à refaire »** — non. Zéro `dangerouslySetInnerHTML`, l'unique puits
  `Popup.setHTML` passe par `esc()` y compris pour OSM/GBIF/Sandre, CSP réelle, iframe sandboxée sans
  `allow-top-navigation`, `npm audit --omit=dev` → 0 vulnérabilité.
- **« Forcer Europe/Paris dans les calculs de saison »** — non-problème : `season.ts:46-62` compare `now` et
  `new Date(y, m, d)`, **tous deux en heure locale**. Les bornes tombent déjà au bon minuit.
- **« Le champ Taille est le mauvais tap le plus probable »** — faux : `Prise.tsx:227` l'étiquette
  « facultatif, pré-remplira le carnet », et « Je garde » est un `HoldButton` à maintien
  (`Prise.tsx:252-257`), ajouté explicitement contre le tap accidentel avec des gants.
- **« Un import abîmé rend le carnet définitivement en lecture seule »** — chaîne causale fausse :
  `mergeById` refuse toute valeur entrante non-tableau (`storage.ts:283`), donc l'import ne peut pas écrire
  la valeur qui gèlerait les écritures.
- **« Aucune clause de non-responsabilité »** — faux : `Reglement.tsx:110-114` et `Fiche.tsx:701-704`
  portent chacune un bloc `.disclaimer`. Seul le volet sanitaire manque.
- **« Le verdict écrevisses ignore la date »** — non-problème : les trois espèces indigènes sont fermées
  **toute l'année** dans le 36 et le 23. Un verdict indépendant de la date est ici le verdict correct.
- **« La fiche espèce est un cul-de-sac »** — réfuté, `.sommaire` est `position: sticky`.
- **« Les noms d'espèces tombent en Georgia sur Android »** — réfuté : le font-matching CSS filtre par
  `unicode-range` **avant** le style. Le vrai défaut est que toute la typo serif est bloquée à 700
  (`serif-bloque-700`, S).
- **« Les bottom sheets de la carte n'ont pas `aria-modal` »** — correct ainsi : elles sont volontairement
  **non modales**, la carte reste interactive.
- **Activer `noUncheckedIndexedAccess`** — 198 erreurs, beaucoup sûres par construction. Mauvais rapport
  effort/gain ; préférer `exactOptionalPropertyTypes` et une passe sur les 24 `!` de `src/screens/`.
