# Reprise — Compagnon de pêche

Prompt de reprise autonome. À coller tel quel dans une nouvelle conversation.

---

## Contexte

`E:\fish`, branche `main`. PWA React 18 + TypeScript + Vite, offline-first, pour la pêche en
eau douce en France. IndexedDB (`idb-keyval`) pour les données, localStorage pour les
préférences critiques au premier rendu. Tests Vitest + Testing Library.

État à la reprise : **1898 tests verts (+ 2 expected-fail), lint 0, `tsc` 0, build OK,
arbre propre**. Couverture mesurée le 03/08/2026 : 68,7 % instructions · 61,9 % branches ·
59,6 % fonctions · 70,3 % lignes. Dernier commit `3e455d6`.

> **Session du 31/07/2026** — les trois demandes explicites (A1, A2, A3) et
> **tout l'audit des sources (B1 à B6)** sont faits. 841 → 1048 tests.
>
> **⚠️ Mise à jour du 03/08/2026 — la section C n'est plus « intacte ».**
> Elle a été écrite le 31/07/2026 et une grande partie a été livrée depuis, sans
> que ce document soit remis à jour. Les constats ci-dessous ont été **re-mesurés
> le 03/08/2026** et sont FAUX tels qu'ils sont écrits en section C :
>
> | Constat de la section C | Mesuré le 03/08/2026 |
> |---|---|
> | « zéro `<main>`/`<nav>` sur 26 écrans » | **55** occurrences |
> | « 33 `<label>`, `grep htmlFor` → **0** » | **20** `htmlFor` |
> | « `grep pushState\|popstate` → 0, le retour Android ferme l'app » | **12** — `lib/nav-historique.ts` |
> | « mentions légales manquantes » | `screens/Mentions.tsx` + `data/mentions-legales.ts` |
> | « couverture réelle 24,26 % » | **68,7 %**, seuils tenus en CI |
> | « la taille n'est jamais confrontée à la maille » | corrigé — `sousLaMaille` / `faitLaMaille` dans `lib/prise.ts` |
> | « `Fiche.tsx:180` fait `.slice(0, 2)` » | plus aucune occurrence |
> | « manifest sans `screenshots`, `shortcuts` ni `id` ; aucune balise `og:` » | `lib/manifest.ts` porte les trois ; **12** balises `og:` dans `index.html` |
> | « pas d'aide à l'installation iOS » | `components/InstallIOS.tsx` |
> | « précache 7,6 Mo tout-ou-rien » | découpé — `lib/precache-decoupe.ts`, noyau 3,5 Mo |
> | `theme-sombre` (section D) | livré — `lib/theme.ts`, `themeEffectif`, `lib/contraste-palette.ts` |
>
> **Ce qui reste vrai, vérifié le 03/08/2026** : `e2e-playwright-absent` (aucun
> `playwright.config`, aucun dossier `e2e/`) et `Carte.tsx` sans aucun test de
> rendu (0 % de couverture sur 1 306 lignes).
>
> **Le reste de la section C et de la section D n'a PAS été re-vérifié.** Les
> tableaux d'effort qui suivent ne sont donc plus un plan fiable : refaire le
> relevé avant de s'en servir, plutôt que de croire des chiffres d'il y a trois
> jours.

Trois documents portent l'analyse, à lire avant de commencer :

- `docs/audit/2026-07-30-audit-produit.md` — l'audit produit en 12 dimensions
- `docs/audit/2026-07-31-plan-execution.md` — le plan v0.9 / v1.0 / v1.x, le chemin critique
- `docs/audit/backlog-verifie.json` — 134 constats vérifiés (et `faux-positifs.json`, 102 écartés)

La v0.9 « sortie fermée » est **terminée** (10 lots). L'audit des sources de données qui a
suivi est **terminé lui aussi** (session du 31/07/2026, voir plus bas).

## Manière de travailler attendue

- **TDD strict.** Le test qui échoue d'abord, et il doit échouer pour la bonne raison.
  Compétences `superpowers:test-driven-development` et `superpowers:systematic-debugging`.
- **Vérifier sur les données réelles avant d'écrire une ligne.** Ce projet consomme sept API
  publiques ; à chaque fois qu'on a supposé ce qu'un champ voulait dire, on s'est trompé.
  Tirer l'échantillon, compter la distribution, puis coder. `curl --ssl-no-revoke` sous
  Windows, ou une requête depuis le navigateur si l'API renvoie 403.
- **Ne jamais faire dire à une source ce qu'elle ne dit pas.** C'est le fil rouge de tout
  l'audit : un champ vide n'est pas un « non », une mesure à 35 km n'est pas la température
  d'ici, une requête qui échoue n'est pas une absence, un refus serveur n'est pas une panne
  de réseau du pêcheur. Trois états — oui / non / inconnu — partout où la source en a trois.
- **Commits en français**, sujet court, corps qui explique le *pourquoi* avec les chiffres
  mesurés. Dire explicitement ce qui n'a pas été vérifié.
- La CI (`.github/workflows/ci.yml`) et le déploiement (`deploy.yml`) exécutent
  `lint` + `test` + `build`. Ne rien pousser qui ne passe pas.

---

# Ce qui reste à faire

## A et B — FAITS le 31/07/2026

Les trois demandes explicites de l'utilisateur et la totalité de l'audit des
sources sont traitées. Ne pas les refaire. Neuf commits, `b44e47c..302e31c` :

| Commit | Sujet |
|---|---|
| `2974a7d` | **A1** — bouton département sur l'Accueil, par réglementation |
| `5a4bb4e` | **A2** — 96 fiches de coindepeche.fr, en seconde main et dites telles |
| `beaef44` | **A3** — carte de pêche par type + réciprocité, et 41 guides |
| `01125d2` | **B1** — critère du même cours d'eau, et namespaces de codes |
| `c88dca3` | **B2** — troncatures avouées, `size=1` d'analyse_pc corrigé |
| `6a8339b` | **B5** — cinq classes de cours d'eau au lieu d'une |
| `1990ef5` | **B4** — attributions ODbL / CC BY / Etalab / GBIF par enregistrement |
| `54443a1` | **B3** — délais par source, corps borné, SW aligné sur l'app |
| `302e31c` | **B6** — tests de contrat sur sept charges utiles réelles figées |

Deux documents détaillent ce qui a été mesuré et ce qui ne l'a pas été :
`docs/audit/2026-07-31-coindepeche-reglementation.md` et
`docs/audit/2026-07-31-carte-de-peche-et-guides.md`.

### Ce qui a été laissé ouvert, explicitement

Chacun de ces points est écrit dans le corps du commit correspondant.

- **B1 — le critère du cours d'eau est complet et testé mais DORMANT.** Aucun
  appelant ne fournit `coursRef` à `choisirStation()`. `coursDuPoint()` sait le
  déduire d'une couche Sandre déjà chargée, mais la Carte détient la couche du
  viewport entier, où la réponse est presque toujours « ambigu ». Il faut la
  filtrer sur une petite boîte autour du point, ce qui demande un calcul
  point-vers-ligne. C'est la suite immédiate la plus rentable : Muides
  (17,2 km, la Loire) serait enfin retenu depuis Blois.
- **B1 bis** — `analyse_pc` ne publie aucun rattachement au cours d'eau. Les
  stations LOIRE y existent (Chaumont 15,7 km, Muides 17,2 km) mais ne peuvent
  pas bénéficier du critère tant qu'on ne joint pas `station_pc` par
  `code_station`. Une requête de plus.
- **B3** — la lecture bornée n'est appliquée qu'au Sandre et à GBIF. Hub'Eau,
  Open-Meteo et le géocodeur IGN passent encore par `r.json()` sans borne.
- **B4** — trois licences n'ont pas pu être établies : IGN Géoplateforme, les
  couches WMS des DDT (GéoIDE) et Géopêche. Elles sont affichées comme « licence
  non établie », ce qui est honnête mais provisoire.
- **A3** — les tarifs FNPF réels n'ont pas été relevés sur `cartedepeche.fr`.
  On sait que les deux pages de coindepeche.fr se contredisent sur tous les
  prix ; on ne sait pas laquelle a raison. La composition réelle d'EHGO, CHI et
  URNE n'a pas été établie non plus.
- **Défaut antérieur repéré, non corrigé** : le formulaire d'édition du profil
  émet un avertissement React « changing an uncontrolled input to be
  controlled ». Reproduit sur `b44e47c` par `git stash` — ce n'est pas une
  régression de cette session.

### Limite de vérification de la session

Le volet navigateur intégré **crée le canvas MapLibre mais ne compose pas** :
la carte reste sur « Chargement… » et ne déclenche jamais le chargement de ses
couches. Rien de ce qui touche la carte n'a donc été vu à l'écran — troncatures,
traits par classe de Strahler, infobulle GBIF, ligne « eau : … » du briefing.
En compensation, **la logique a été rejouée sur les réponses réellement
enregistrées** (cinq couches Sandre, trois réponses WFS, la charge GBIF), ce qui
est une preuve différente mais pas nulle. Les écrans sans carte — Accueil,
Réglementation, Guides, Carnet, Sources — ont bien été vérifiés au navigateur.

---

## C. v1.0 publique — ~16,5 jours

Détail complet dans `docs/audit/2026-07-31-plan-execution.md`, section « v1.0 ». Résumé :

| Lot | Contenu | Effort |
|---|---|---|
| **Mentions légales** | éditeur, contact, hébergeur, confidentialité, « ni conseil juridique ni avis médical ». Les clauses réglementaires existent déjà ; seul le volet identité + sanitaire manque. | M |
| **A11y — fondations** | zéro `<h1>`, zéro `<main>`/`<nav>` sur 26 écrans ; `<ErrorBoundary key={s}>` démonte l'élément focalisé et le focus retombe sur `<body>` ; le verdict de prise — la sortie la plus lourde de l'app — n'est jamais annoncé. | M+M+S |
| **A11y — formulaires** | 33 `<label>`, `grep htmlFor` → **0** : toucher « Poids » ne focalise pas le champ, la cible tactile est divisée par deux avec des gants. Plus cibles 44 px, état des bascules, échappement de la feuille balance. | M+S+S+S |
| **Contrastes** | `--amber` sur `--amber-bg` = 4,19:1, `--brass-ink` = 4,04:1, le ⓘ des cellules verdict à **1,9:1** — et c'est le seul indice qu'elles sont cliquables. Textes à lire en plein soleil. | M |
| **Navigation** | `grep pushState\|popstate` → 0 en `display: standalone` : **le geste retour Android ferme l'app**. Aucun lien profond, donc rien de partageable. | M+L |
| **Performance** | 17 écrans statiques = 240 ko gzip avant le premier pixel ; 189 ko de fiches parsés par tout écran important `SPECIES` ; 270 ko pour un calque désactivé par défaut ; polices inutiles précachées. | S+M+S+S |
| **Réseau** | tout échec rendu en « 0 station » (l'app ment sur la connectivité) ; 1,5 Mo retéléchargés à chaque pan de quelques pixels — **aggravé** depuis B5, la carte demande désormais cinq couches ; refetch à la sauvegarde d'un spot ; concurrence Hub'Eau du briefing ; options de précision géoloc. *`net-corps-non-borne` et `sandre-sw-timeout-charge` sont faits (B3).* | ≈ 6 j |
| **Offline** | précache 7,6 Mo tout-ou-rien — un install interrompu en 4G laisse une app qui **promet le hors-ligne** devant des écrans vides ; mise à jour SW sans contrôle ni report ; une lecture échouée gèle les écritures ; brouillon de prise non persisté. | ≈ 5 j |
| **Tests** | la couverture affichée de 66 % n'instrumente que les fichiers déjà importés — **le réel est 24,26 %** ; `addCatch` n'est appelé par **aucun** test ; `store` et `net.fetchT` non testés. | ≈ 7 j |
| **Moteur** | la taille saisie n'est **jamais confrontée à la maille** — « Oui, elle fait la maille » reste l'action principale avec 45 cm pour un brochet ; `Fiche.tsx:180` fait `.slice(0,2)` donc dans l'Indre la note black-bass (indice 2) n'est **jamais affichée** ; horloge non injectable ni vérifiée. | ≈ 5 j |
| **Données** | recettes de friture sans perche-soleil ni poisson-chat — les deux espèces que l'app **interdit** de remettre à l'eau vivantes ; la fiche toxostome porte le critère du hotu (inversé) ; 42 ko de corpus mort dans le bundle ; compteurs du README périmés. | ≈ 5 j |
| **Distribution** | manifest sans `screenshots`, `shortcuts` ni `id` ; aucune balise `og:` — un lien envoyé par WhatsApp entre pêcheurs s'affiche comme une URL nue ; pas d'aide à l'installation iOS. | M+M+S |

**Chemin critique** (non parallélisable) :
`nav-conventions → nav-historique` réécrit les 18 `onClick={back}`, à ne faire qu'après avoir
unifié les conventions. Tout le reste de la v1.0 est parallélisable.

---

## D. v1.x — après la publication

`theme-sombre` (L, l'app cible explicitement l'aube, le crépuscule et les séances d'écrevisses
nocturnes) · `gants-liste-blanche` (L, le mode gants est une liste blanche de 29 sélecteurs,
absent de l'Accueil et de la Carte, alors que l'onboarding promet qu'il agrandit **toutes** les
commandes) · `carte-monolithe` (L) · `repartition-geo-identificateur` (L, l'identificateur
propose des endémiques corses et pyrénéennes) · `e2e-playwright-absent` (L) ·
`ecrans-sans-test-de-rendu` (L) · `export-base64-monolithique` (L) · `emoji-vs-icones` (M) ·
`multi-contexte-ecrasement` (M) · `picker-espece-degrade` (M) · `kill-sans-chrono-ni-cuisine` (M) ·
`especes-rerender-par-frappe` (M) · `doc-architecture` (S).

---

## Points de vigilance hérités

- **Une seule chose n'a pas été vérifiée au navigateur dans la session précédente** : le rendu
  de la ligne « ouvrage » dans le panneau briefing (`src/components/Briefing.tsx`, section
  Obstacles) et le style `.bl-etat`. Les fonctions pures sont testées et vérifiées sur données
  réelles ; le JSX ne l'a pas été à l'écran.
- Le volet navigateur intégré ne composait pas les images ; les clics de synthèse
  n'aboutissaient pas. Contournement qui marche : `javascript_tool` avec `element.click()`.
- L'onboarding ne se laisse pas passer en écrivant seulement `carnet:prefs` dans localStorage —
  il faut cliquer « Ouvrir le carnet ».
- Sous Windows, `curl` a besoin de `--ssl-no-revoke`. Hub'Eau a fini par renvoyer 403 en
  ligne de commande ; passer par le navigateur dans ce cas.
- Attention à la version d'API : l'app utilise `qualite_rivieres` **v2** et `hydrometrie` **v2**,
  mais `temperature`, `ecoulement` et `etat_piscicole` en **v1**.
- `tsconfig.node.json` doit inclure tout fichier importé par `vite.config.ts`, sinon le build
  casse. Ils sont quatre aujourd'hui (03/08/2026) : `csp.ts`, `sw-delais.ts`, `net-bornes.ts`
  et `precache-decoupe.ts` — la liste est commentée dans le fichier lui-même.
- `tsconfig.json` restreint `types` à une liste explicite. Une dépendance qui fournit des types
  GLOBAUX doit y être inscrite nommément : ajouter `@types/geojson` aux `devDependencies` ne
  suffisait pas, il a fallu `"geojson"` dans `types` pour éteindre 12 TS2503 (migration
  maplibre-gl 6, commit `e36eb65`).
