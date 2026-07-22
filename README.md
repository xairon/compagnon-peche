# Compagnon de pêche 🎣

PWA installable, **100 % hors-ligne**, pour la pêche en eau douce en France (Centre-Val de Loire).
Répond en quelques secondes, au bord de l'eau : *« J'ai cette prise — qu'est-ce que j'ai le droit
et l'envie d'en faire ? »* — de l'identification à la recette, en passant par « je garde ou je
relâche », comment la tuer proprement, la vider, et les polluants à connaître.

Cahier des charges complet : [`docs/superpowers/specs/2026-07-20-compagnon-peche-design.md`](docs/superpowers/specs/2026-07-20-compagnon-peche-design.md).

## Lancer

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # bundle de production + service worker (dossier dist/)
npm run preview    # sert le build
```

Hébergement : n'importe quel hébergeur statique (GitHub Pages, Cloudflare Pages, Netlify). HTTPS
requis pour le service worker et l'installation PWA.

## Installer sur Android (ou iOS)

L'app est une **PWA installable** : ouvrez l'URL déployée dans **Chrome** (Android) ou **Safari**
(iOS), puis :

- **Android / Chrome** : menu **⋮ → « Installer l'application »** (ou « Ajouter à l'écran
  d'accueil »). L'app apparaît avec son icône, s'ouvre en plein écran, et fonctionne **hors-ligne**.
- **iOS / Safari** : bouton **Partager → « Sur l'écran d'accueil »**.

Une fois installée, tout le nécessaire est précaché : fiches, réglementation, gestes, et les
parcours des départements 41 · 23 · 36 marchent **sans réseau**. Les conditions live (météo, niveau
d'eau, stations poisson) se chargent quand il y a du réseau.

## Déploiement (GitHub Pages)

Automatique via `.github/workflows/deploy.yml` : chaque `git push` sur `main` construit le bundle et
le publie sur Pages. Réglage unique : **Settings → Pages → Source : GitHub Actions**. L'app utilise
`base: "./"` (chemins relatifs), donc elle marche telle quelle sur un sous-chemin
`https://<user>.github.io/<repo>/`, sans configuration supplémentaire.

## Écrans

Espèces (recherche + grille + identification guidée) · Fiche espèce (verdict + info-bulles,
sections dépliables, glossaire cliquable, confusions) · **Carte** (MapLibre GL + géoloc + présence
réelle Hub'Eau) · **Ma prise** (parcours garder/relâcher, route les protégées/invasives) · Règle à
l'écran · Carnet de captures (IndexedDB) · **Matériel** (inventaire + ensembles + guide
appâts/hameçons) · Nœuds & montages · Recette + **mode cuisine** · Réglementation · Sources ·
Crédits.

### Carte & données réelles (couche hybride en ligne)

`src/screens/Carte.tsx` + `src/lib/hubeau.ts` : carte MapLibre GL (fonds IGN/Carto), bouton « autour de
moi » (géolocalisation), et **API Poisson Hub'Eau** (OFB/ASPE) → stations de pêche scientifique de
la zone visible ; toucher une station liste les **espèces réellement observées**, chacune reliée à
sa fiche. Seule couche nécessitant le réseau — le reste de l'app reste 100 % hors-ligne.

### Matériel (tacklebox)

`src/screens/Materiel.tsx` : inventaire d'équipement par catégorie (cannes, moulinets, leurres,
appâts, hameçons…), **ensembles** (combos de matériel pour une pêche donnée), et un **guide** de
référence (types d'appâts, tailles d'hameçons, familles de leurres, fils). Stockage IndexedDB local.

## Stack & structure

- **React 18 + TypeScript + Vite**, PWA via `vite-plugin-pwa` (Workbox, precache de tout le shell +
  données + images → fonctionne sans réseau une fois installée).
- **Carnet** : `idb-keyval` (IndexedDB). 100 % local, rien n'est transmis.

### Couverture des espèces — profondeur graduée (78 espèces)

Le référentiel combine deux niveaux, fusionnés dans `src/data/species.ts` :
- **Fiches curées** (~25) : identification, confusions, technique, recettes, santé — écrites et
  sourcées à la main.
- **Fiches « base »** (`src/data/species-base.ts`, **générées**) : taxonomie (TAXREF `cd_nom`),
  réglementation par règles (maille R436-18, statut protégé/invasive) et bio, pour couvrir **toutes**
  les espèces de France. Bandeau « fiche en cours d'enrichissement ».

Pipeline (reproductible) : listes vérifiées dans `scripts/species-list/*.json` →
`node scripts/build-base-species.mjs` → `species-base.ts` (dédoublonnage contre les fiches curées).

### Sécurité réglementaire

`protected: true` (espèces menacées / directive Habitats / esturgeon) → bandeau rouge + le parcours
« Ma prise » route vers « relâcher ». Miroir des invasives (R432-5) qui, elles, ne doivent pas être
remises à l'eau vivantes.

```
src/
  data/        species.ts (+ species-base.ts généré) · knots.ts · regulation.ts · glossary.ts · media.ts
  lib/         season.ts · prise.ts · helpers.ts · db.ts · recipes.ts · wakelock.ts
  components/  Icon · Media · Glossed · Tip · ImgSlot · BottomNav
  screens/     Especes · Identify · Fiche · Prise · Regle · Carnet · Outils · Noeuds · Recette · Reglement · Sources · Credits · Cuisine
  store.tsx    état applicatif + navigation + persistance carnet
scripts/       fetch-images.mjs · build-base-species.mjs · species-list/*.json
```

## Données — rien n'est inventé

Réglementation et santé sont sourcées et vérifiables ; toute valeur non vérifiée est marquée « à
vérifier ». Sources : **Legifrance** (R436-18 tailles, R436-21 quota, R432-5 invasives),
**service-public F2117** (périodes), **ANSES** (bioaccumulateurs : 2×/mois, publics sensibles
1×/2 mois), arrêtés préfectoraux 36 & 41. Taxonomie/biologie : TAXREF/GBIF/FishBase.
Détail dans l'écran **Sources** et la section 12 du cahier des charges.

## Assets (images)

Toutes les images sont **libres, vérifiées et embarquées** (`public/assets`, précachées pour
l'offline). Sources et licences dans l'écran **Crédits photos**, `src/data/media.ts` et
`src/data/knot-diagrams.ts`.

- **25 photos de poissons** (Wikimedia Commons, domaine public / CC BY / CC BY-SA).
- **7 schémas de montage** : clinch, palomar, boucle chirurgien, texan (Commons) + drop shot,
  pater-noster, raccord (schémas SVG originaux, `public/assets/knots/*.svg`).

Ré-exécuter le sourcing (idempotent) : éditer `scripts/images.manifest.json` puis
`node scripts/fetch-images.mjs` (télécharge depuis le CDN Wikimedia, redimensionne en WebP, régénère
`src/data/media.ts` avec les attributions).

## À compléter

- **Recettes (v2)** : sourcer et vérifier les recettes de cuisine (actuellement quelques recettes
  de départ ; les 14 nouvelles espèces n'ont pas encore de recettes).
- **Espèces** : **25 espèces** aujourd'hui ; modèle prêt pour étendre vers l'inventaire ~80.
- **Photos de juvéniles** : quasi introuvables sans main sur Commons (seule la carpe est propre) —
  à compléter plus tard (galerie multi-photos par espèce).
- **Données réelles Hubeau / TAXREF / FishBase** : voir la stratégie dans le backlog.
- **Icônes PWA** : PNG 192/512 maskables pour un rendu store (optionnel).

## Licence

Code sous licence **MIT** (voir [`LICENSE`](LICENSE)). Les données réglementaires, sanitaires et les
images gardent les droits de leurs sources respectives (attributions dans les écrans **Sources** et
**Crédits** de l'app).
