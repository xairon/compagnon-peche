# Compagnon de pêche — Backlog & évolutions (reprise)

> Retours utilisateur du 2026-07-20 après la v1 (11 espèces + assets images).
> Point de reprise pour la prochaine session. Priorités : P0 = bug à corriger, P1 = amélioration
> proche, P2 = contenu/feature de fond, P3 = grande feature long terme.
> À lire avec le cahier des charges principal : [`2026-07-20-compagnon-peche-design.md`](2026-07-20-compagnon-peche-design.md).

---

## État — session 2 (2026-07-20)

**Fait :**
- ✅ **B1** sommaire (passage en 2 lignes, offset de scroll dynamique) · ✅ **B2** module recette/cuisine
  (reset `cookStep` à l'entrée, « Préc. » à l'étape 0 quitte, barre de progression).
- ✅ **U1** info-bulles verdict (Comestible/Maille/Quota/Saison, panneau au tap) · ✅ **U2** glossaire
  cliquable (`src/data/glossary.ts` + `Glossed`/`Tip`) · 🟡 **U3** francisation (anglicismes désormais
  expliqués via le glossaire ; pas de renommage systématique).
- ✅ **C1** meilleures photos (silure/black-bass/perche-soleil remplacés, sans main) · 🟡 juvéniles
  (images libres sans main quasi inexistantes → reporté).
- 🟡 **C2** espèces **11 → 25** (14 ajoutées, sourcées). · ✅ **C3** 3 schémas SVG (drop shot,
  pater-noster, raccord).

**Reste :** U4 (biologie des 11 initiales), juvéniles, C2 jusqu'à ~80, M1 carte + Hubeau, v2 recettes.

---

## P0 — Bugs à corriger

### B1. Sommaire (chips « Identifier / Règles / Pêcher… ») déborde à droite
Sur la fiche espèce, la barre de sommaire collante déborde du cadre à droite au lieu de scroller
proprement. À corriger : conteneur `.sommaire` doit masquer le débordement et scroller
horizontalement sans « fuite » hors du cadre 390 px (vérifier `overflow-x`, largeur, et le
`-webkit-scrollbar` déjà à 0). Idem vérifier les autres barres de chips (filtres accueil).
Fichier : `src/screens/Fiche.tsx` + `.sommaire` dans `src/styles.css`.

### B2. Bouton « Préc. » inopérant dans les recettes / mode cuisine
Le bouton précédent du **mode cuisine** ne fonctionne pas correctement. **Revoir tout le module
recette + cuisine** : navigation avant/arrière entre ingrédients ↔ étapes, état `cookStep`, bornes,
libellés du bouton suivant/terminé. Retester le cycle complet (ouvrir recette → mode cuisine →
avancer → reculer → sortir). Fichiers : `src/screens/Cuisine.tsx`, `src/screens/Recette.tsx`,
`src/lib/wakelock.ts`.

---

## P1 — Améliorations UX de la fiche

### U1. Info-bulles explicatives sur le bandeau verdict
Ajouter un **hover / tap** sur « Comestible », « Maille », « Quota » (et la pastille saison) qui
explique le terme en clair :
- *Maille* = taille légale minimale en dessous de laquelle il faut relâcher le poisson.
- *Quota* = nombre maximum autorisé par jour et par pêcheur.
- *Comestible* = qualité gustative + alerte polluants éventuelle.
- *Saison* = période où la pêche de l'espèce est autorisée.
Tactile oblige : prévoir un tap (pas seulement hover) qui ouvre une petite bulle. Composant tooltip
maison, accessible, qui marche au doigt.

### U2. Glossaire cliquable (termes techniques → fiches)
Rendre **cliquables** les termes techniques (techniques de pêche, types de leurres, montages,
postes) pour ouvrir une **fiche explicative courte**. Ex. « drop shot », « leurre souple »,
« jerkbait », « cassure », « pater-noster » → mini-fiche (définition + quand l'utiliser + lien vers
le montage si dispo). Nécessite un petit modèle `Glossary` (terme → définition, illustration
optionnelle) et un repérage des termes dans les fiches.

### U3. Franciser le vocabulaire quand c'est possible
Éviter l'anglais pour les termes techniques quand un équivalent français existe / est courant. Ex :
« shad » → « leurre souple », « jerkbait/swimbait » → préciser en français (« poisson-nageur »),
« drop shot »/« texan »/« no-kill » sont passés dans l'usage FR — les garder mais **les expliquer**
via le glossaire (U2). Passe de relecture sur tous les champs `fish` et `cook` de `species.ts`.

### U4. Enrichir la fiche (biologie / cycle de vie)
Étoffer la section biologie : **histoire/origine de l'espèce, reproduction (frai), cycle de vie,
croissance, comportement saisonnier**. Intéressant à terme, format « en savoir plus » en bas de
fiche pour ne pas alourdir le verdict rapide. Sourcer via FishBase / INPN / Atlas Keith (déjà
identifiés au §12 du cahier des charges principal).

---

## P2 — Contenu

### C1. Meilleures photos + stades de vie
Problème : certaines photos sont médiocres (ex. **silure** = un pêcheur tenant le poisson en main,
peu lisible pour l'identification). Objectif :
- **Reprendre les photos faibles** : privilégier une vue latérale nette du poisson seul, fond
  neutre, sans main/pêcheur. Candidats à revoir en priorité : silure, et repasser toute la série.
- **Ajouter des stades de vie** quand disponible en licence libre : **juvénile / jeune**, adulte,
  livrée de reproduction, variantes (ex. carpe commune/miroir/cuir). Prévoir plusieurs images par
  espèce dans le modèle (`photos: MediaEntry[]` au lieu d'une seule) + une petite galerie sur la
  fiche.
- Contrainte : mêmes licences libres (CC0/CC BY/CC BY-SA), crédit par image. Le pipeline
  `scripts/fetch-images.mjs` + `images.manifest.json` est déjà en place et idempotent — étendre le
  manifeste (plusieurs entrées par espèce, ex. `silure`, `silure-juvenile`).

### C2. Compléter l'inventaire des espèces (11 → ~80)
Il n'y a que **11 espèces** aujourd'hui. Étendre vers l'inventaire complet des poissons d'eau douce
de France (liste §11 du cahier des charges principal). Chaque espèce = données sourcées
(identification, réglementation Legifrance, santé/ANSES, technique) + photo(s) libre(s). Gros travail
de contenu, à faire par lots (carnassiers → cyprinidés → salmonidés → migrateurs → autres/invasives).
Taxonomie de référence : TAXREF/GBIF. Ne rien inventer (réglementation/santé sourcées ou « à
vérifier »).

### C3. Schémas des 3 montages manquants
Drop shot, pater-noster, raccord ligne/bas de ligne : **aucun schéma libre trouvé** sur Wikimedia
Commons. À **créer en SVG maison** (propre, cohérent avec le style de l'app) ou sourcer sous licence.

---

## P3 — Grande feature : carte interactive

### M1. Carte des cours d'eau et de la pêche
Vision « un truc giga propre » : une **carte** (rivières, plans d'eau) affichant, par cours d'eau :
- **catégorie piscicole** (1ʳᵉ / 2ᵉ),
- **saison / réglementation** applicable,
- **espèces présentes / connues**,
- éventuellement postes, réserves, parcours.

**Contraintes de données (déjà recherchées, §12 du cahier des charges principal — points durs) :**
- Fond hydrographique : **BD TOPAGE** (Sandre/OFB/IGN), Licence Ouverte, formats SIG.
- **Catégories piscicoles** : **pas de couche nationale consolidée** — fragmenté par département
  (data.gouv, SIG, parfois ancien). À agréger.
- **Espèces présentes par station** : **API Hub'Eau « Poisson »** (OFB, JSON/GeoJSON, Licence
  Ouverte) — données scientifiques, exploitables.
- **Réglementation par cours d'eau** : pas d'API ; arrêtés préfectoraux (PDF), à raccrocher
  manuellement.
- **Parcours/réserves/réciprocité** : verrouillé côté FNPF, pas d'open data.

**Implication offline** : une carte plein territoire hors-ligne est lourde (tuiles). Options à
étudier : couverture limitée aux départements de l'utilisateur, tuiles vectorielles légères, ou mode
en ligne pour la carte uniquement (dérogation au tout-offline, à décider). **Feature à cadrer dans sa
propre session** (spec + plan dédiés) vu son ampleur.

---

---

## STRATÉGIE HUBEAU — Intégration données scientifiques réelles (reprise future)

**Contexte** : l'utilisateur connaît Hubeau et peut bypass limites d'API. Opportunité de transformer
l'app : passer de « 11 espèces statiques » à « données nationales scientifiques + carte interactive ».

### Sources d'autorité à intégrer

1. **TAXREF v18.0** (MNHN/INPN) — référentiel taxonomique officiel FR
   - CSV data.gouv.fr ; noms scientifiques + vernaculaires officiels
   - Remplacer IDs hardcodés `species.ts` par TAXREF `CD_NOM`

2. **FishBase** — bio-écologie complète (35k+ espèces)
   - Régime alimentaire, niveau trophique, taille/poids, distribution, habitat, reproduction
   - Package R `rfishbase` pour requêtes structurées
   - Enrichir fiches : cycle de vie, reproduction, records de taille

3. **Hub'Eau API Poisson** (OFB/ASPE) — **clé pour FR**
   - Données scientifiques réelles : opérations d'échantillonnage, espèces capturées, effectifs, tailles
   - Filtrables par rivière, secteur, année
   - RESTful, user connaît bypass limites
   - **À intégrer** : espèces observées par cours d'eau + tendances (« silure en expansion sur Loire »)

4. **GBIF API** (optionnel) — distribution globale par espèce

### Défi offline

Hubeau = données live (intérêt si à jour), mais offline-first = USP. **Trois approches** :
- **Hybrid sync** : snapshot annuel Hubeau précaché + auto-update optionnel au réseau
- **Géo-snapshot** : limiter périmètre (ex. Centre-Val-de-Loire) + données statiques offline + live-sync optionnel pour stats
- **Stratifiée** : données statiques (où ?) offline ; dynamiques (tendances, dernière obs) optionnelles online

**À décider** : quel compromis offline/online ?

### Implémentation (phasing)

1. Remplacer `species.ts` par import TAXREF (CSV → JSON versioning)
2. Ajouter `taxref_cd_nom` + `fishbase_id` à chaque espèce (linking)
3. Intégrer API Hubeau : `species.occurrence_by_river` (rivières + ASPE)
4. Carte M1 : fond BD TOPAGE + points Hubeau

---

## Ordre de reprise suggéré
1. **P0** (B1 sommaire, B2 module recette/cuisine) — rapides, qualité perçue immédiate.
2. **P1** (U1 tooltips, U3 francisation, U2 glossaire, U4 biologie) — améliorent la fiche existante.
3. **C1** (meilleures photos + stades de vie) puis **C3** (3 schémas SVG).
4. **C2** (extension à ~80 espèces) — par lots, gros volume de contenu.
5. **M1** (carte) — grande feature, cadrage dédié. **À combiner avec stratégie Hubeau** (données réelles).
6. **v2** — recettes de cuisine (sourcing dédié, déjà convenu).
