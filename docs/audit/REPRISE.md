# Reprise — Compagnon de pêche

Prompt de reprise autonome. À coller tel quel dans une nouvelle conversation.

---

## Contexte

`E:\fish`, branche `main`. PWA React 18 + TypeScript + Vite, offline-first, pour la pêche en
eau douce en France. IndexedDB (`idb-keyval`) pour les données, localStorage pour les
préférences critiques au premier rendu. Tests Vitest + Testing Library.

État à la reprise : **841 tests verts, lint 0, `tsc` 0, build OK, arbre propre**.
Dernier commit `dc7898c`. Des commits sont en avance sur le déploiement.

Trois documents portent l'analyse, à lire avant de commencer :

- `docs/audit/2026-07-30-audit-produit.md` — l'audit produit en 12 dimensions
- `docs/audit/2026-07-31-plan-execution.md` — le plan v0.9 / v1.0 / v1.x, le chemin critique
- `docs/audit/backlog-verifie.json` — 134 constats vérifiés (et `faux-positifs.json`, 102 écartés)

La v0.9 « sortie fermée » est **terminée** (10 lots). Un audit des sources de données a
suivi, dont 5 points sur 10 sont traités.

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

## A. Trois demandes explicites de l'utilisateur, non commencées

Ce sont les priorités. Elles passent avant la fin de l'audit.

### A1. Bouton département sur l'accueil — par réglementation

Demande verbatim : *« le choix du département devrait être un bouton très intuitif sur
l'accueil par réglementation »*.

Le socle existe : `src/lib/prefs.ts` (`readPrefs`/`writePrefs`, clé `carnet:prefs`),
`src/components/Onboarding.tsx` (sélecteur au premier lancement),
`src/components/DeptDefautWarning.tsx`. Trois départements sont couverts : Creuse (23),
Indre (36), Loir-et-Cher (41) — voir `DEPARTEMENTS`.

Manque : un bouton **sur l'écran Accueil** (`src/screens/Accueil.tsx`), visible et évident,
qui montre le département actif et permet d'en changer d'un geste. Le lien avec la
réglementation doit être explicite — c'est *la réglementation applicable* qu'on choisit,
pas une préférence d'affichage. Enjeu réel : dans l'Indre, un mauvais département affichait
un quota salmonidés **plus permissif** que la loi.

Cible tactile 44 px minimum (l'app se pilote avec des gants mouillés).

### A2. Scraper les réglementations de coindepeche.fr

Demande verbatim : *« scrap toutes les réglementations dans
https://www.coindepeche.fr/reglementation pour les intégrer à notre app »*, et plus loin
*« toutes les demandes de scrapping tu peux les faire elles sont légales c'est que des
données publiques hein toutes les réglementations »*.

Contrainte de méthode : la provenance doit être **honnête**. Une donnée issue de
coindepeche.fr se cite « coindepeche.fr, consulté le JJ/MM/AAAA » — jamais blanchie en
« arrêté préfectoral n° X ». Si l'arrêté est la source réelle, il faut le vérifier
séparément. Le millésime existe déjà : `src/data/version.ts` (`REG_YEAR`, `VERIFIE_LE`,
`ARRETES`, `regOutdated()`), avec un test-sentinelle qui casse la CI quand l'année dépasse
`REG_YEAR`, et `src/components/RegPerimeeWarning.tsx` affiché sur 4 écrans.

### A3. Scraper les guides utiles + gestion de la carte de pêche

Demande verbatim : *« prospecte/scrape aussi tout les guides
https://www.coindepeche.fr/guides utiles pour notre app, en citant bien sûr la source »*.
L'utilisateur précise : *« pour les guides j'ai demandé la permission ils sont d'accord »*,
*« c'est l'admin du site qui m'a donné son accord »*. L'attribution ne doit pas inventer de
nom d'auteur ni de date qu'on n'a pas.

**Carte de pêche** — demande verbatim : *« faudra aussi gérer de manière parfaite l'achat et
la gestion de carte de pêche dans l'app »*. À couvrir : type de carte (annuelle, hebdo,
journalière, découverte, mineur), réciprocité **EHGO / URNE / CHI**, rappel d'échéance,
lien contextuel vers l'achat.

> **L'app ne doit traiter aucun paiement.** `cartedepeche.fr` est le canal officiel FNPF ;
> l'app y renvoie, elle n'encaisse pas. (Contrainte de sécurité, pas de préférence.)

---

## B. Fin de l'audit des sources de données — ~5,5 jours

Déclenché par un bug signalé : *« j'ai "assec" pour l'écoulement très souvent »*. Diagnostic :
la donnée était juste, l'inférence fausse — ONDE surveille délibérément les **petits cours
d'eau qui s'assèchent**, la station la plus proche est à 13,2 km sur la Cisse, et la Loire
n'en a aucune. Principe unificateur trouvé : *chaque module convertit une mesure en verdict
en jetant la distance, la date et la confiance.*

### Déjà traité (ne pas refaire)

| # | Sujet | Commit |
|---|---|---|
| 1 | ONDE ne décrit pas la rivière du pêcheur ; le code `1f` n'était pas géré | `95f622f` |
| 2 | Pression au niveau de la mer, prévision du bon jour, sursaturation O₂ assumée | `fb10636` |
| 3 | Fraîcheur : une mesure périmée cesse d'être présentée comme l'état actuel (`src/lib/fraicheur.ts`, `AGE_MAX` par grandeur) | `d74002c` |
| 4 | Sélection de station : la distance décide, la fraîcheur filtre (`src/lib/station.ts`, `DIST_MAX` par grandeur) | `0f52f6a` |
| 5 | Absences honnêtes : ROE passe/état/hauteur, boîtes en km, refus Overpass distingués | `dc7898c` |

### B1. Le critère du même cours d'eau — reste du point 4

`choisirStation()` dans `src/lib/station.ts` retient deux critères : distance puis fraîcheur.
Il en manque un troisième, **le même cours d'eau**. La donnée existe (`libelle_cours_eau`
dans les réponses Hub'Eau) mais `WaterTemp` ne la transporte pas.

Cas mesuré depuis Blois : CHER à Saint-Aignan (35,2 km, *autre rivière*, 10,3 °C du 05/03/2026)
contre LOIRE à Muides (17,2 km, *bonne rivière*, 22,6 °C du 17/08/2024). Le tri par date
faisait gagner le Cher : l'app affichait **10,3 °C comme température de la Loire fin juillet**.
Les deux sortent aujourd'hui de portée et la tuile dit « pas de mesure » — correct, mais avec
le critère du cours d'eau, Muides gagnerait au lieu que les deux soient écartées.

### B2. Troncatures avouées — ~1 j

Les réponses sont plafonnées sans que rien ne le dise :

- Sandre WFS : `COUNT=500` (rivières), `400` (plans d'eau), `200` (obstacles) — la réponse
  porte `numberMatched`, jamais lu. Voir `src/lib/sandre.ts`.
- Hub'Eau : paramètre `size`, et un `count` dans l'enveloppe, jamais lu. Voir `src/lib/hubeau.ts`.
- GBIF : `endOfRecords`, jamais lu. Voir `src/lib/gbif.ts`.
- **Cas le plus grave** : `waterTemp()` interroge `analyse_pc` avec `sort=desc&size=1` sur une
  boîte entière — « un échantillon quelconque de cette zone », dont l'identité change avec la
  taille de la boîte. À reconsidérer entièrement.

Attendu : lire le compteur, et quand la réponse est tronquée, le dire (« 200 ouvrages
affichés sur 340 dans la zone ») plutôt que de laisser croire à l'exhaustivité.

### B3. Délais et volumes — ~1 j

- `src/lib/net.ts` : `DEFAULT_TIMEOUT = 12 000 ms` pour tout le monde. Overpass vient d'être
  réglé à 30 s côté client pour 25 s côté serveur ; Sandre WFS ramène jusqu'à 1,5 Mo et
  souffre du même décalage.
- `net-corps-non-borne` : aucune borne sur la taille du corps téléchargé.
- La requête poissons interroge par station ; l'audit suggère `code_operation`.
- `sandre-sw-timeout-charge` : 6 s de timeout service-worker pour 1,5 Mo — **la couche
  hydrographie n'apparaît jamais à la première visite**.

### B4. Attributions — ~1 j

Obligations de licence non honorées, ou honorées à moitié, dans `src/screens/Sources.tsx`
et `Credits.tsx` :

- **OpenStreetMap / Overpass** → ODbL, attribution obligatoire
- **Open-Meteo** → CC BY 4.0
- **Sandre / ROE / Eaufrance** → Licence Ouverte Etalab
- **GBIF** → attribution **par enregistrement** (chaque occurrence porte son propre dataset)
- **IGN Géoplateforme**, **Hub'Eau / OFB** → à vérifier

`src/lib/licences.ts` existe déjà (`licenceUrl()` dérive l'URL CC d'une chaîne de licence,
préserve le suffixe de juridiction, et **renvoie null plutôt que deviner**). Le réutiliser.

### B5. Couche hydrographique complète — ~1,5 j

`fetchRivers()` n'interroge que `sa:CoursEau1`. Le Sandre publie `CoursEau1` à `CoursEau5`
(ordres de Strahler croissants). Résultat mesuré : **14 tronçons affichés sur 919** dans une
zone donnée. La carte montre les fleuves et rate les ruisseaux — précisément là où on pêche
la truite.

### B6. Tests de contrat — ~1 j

Aucun test ne vérifie que le schéma d'une API est toujours celui qu'on lit. Les défauts
trouvés pendant l'audit (`surface_pressure` au lieu de `pressure_msl`, code ONDE `1b`
inexistant testé pendant que `1f` — 2ᵉ plus fréquent nationalement — était ignoré) auraient
tous été attrapés par un test de contrat sur payload figé. `src/lib/meteo.ts` montre le
motif : `parseMeteo()` extrait et exporté, testable sans réseau.

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
| **Réseau** | tout échec rendu en « 0 station » (l'app ment sur la connectivité) ; 1,5 Mo retéléchargés à chaque pan de quelques pixels ; refetch à la sauvegarde d'un spot ; concurrence Hub'Eau du briefing ; options de précision géoloc. | ≈ 7 j |
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
- `tsconfig.node.json` doit inclure tout fichier importé par `vite.config.ts`
  (aujourd'hui `src/lib/csp.ts`), sinon le build casse.
