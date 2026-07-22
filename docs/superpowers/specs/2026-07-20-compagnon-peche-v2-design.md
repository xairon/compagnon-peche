# Compagnon de pêche — Cahier des charges v2 : couverture nationale + carte

> Décidé avec l'utilisateur le 2026-07-20 (session 2). Fait suite au
> [backlog](2026-07-20-compagnon-peche-backlog.md) et au
> [design v1](2026-07-20-compagnon-peche-design.md).
>
> **Objectif** : passer de 25 fiches curées à **toutes les espèces d'eau douce de France**,
> **recettes pour toutes les comestibles**, puis une **carte** des cours d'eau et de la présence
> réelle des espèces.

## Décisions structurantes (arbitrées)

1. **Hors-ligne** : **offline-first + couche géo en ligne**. Tout le référentiel (fiches,
   réglementation, recettes, nœuds, identification) reste embarqué et 100 % hors-ligne. Seules la
   carte et la présence réelle (Hub'Eau) passent en ligne, avec cache des zones consultées.
2. **Couverture** : **toutes les espèces tout de suite, profondeur graduée**. Les ~90 espèces
   présentes via le pipeline (taxonomie + bio + réglementation par règles + photo) ; fiches
   d'identification / technique / recette riches pour les ~30 courantes ; longue traîne marquée
   « fiche en cours d'enrichissement ».
3. **Ordre de construction** : **① pipeline espèces → ② recettes → ③ carte**.

---

## 1. Sources de données (par type, avec provenance)

| Donnée | Source d'autorité | Accès | Rôle |
|---|---|---|---|
| Liste + taxonomie officielle | **TAXREF v18** (MNHN/PatriNat) | CSV data.gouv | Définit « toutes les espèces », noms FR/latin, `CD_NOM` |
| Bio-écologie (taille, habitat, frai, régime) | **FishBase** | `rfishbase` / exports | Enrichit chaque fiche |
| Taille légale (maille) | **Legifrance R436-18** | Règles (table ~10 valeurs) | Dérivé par règle, pas saisi |
| Quota | **Legifrance R436-21** | Règle (3 carnassiers/j dont 2 brochets) | Dérivé |
| Invasives (remise à l'eau interdite) | **Legifrance R432-5** | Liste fixe (perche-soleil, poisson-chat…) | Flag |
| Espèces protégées | **Arrêté 8 déc. 1988** + Directive Habitats | Liste | Flag « pêche interdite / relâcher » |
| Santé / polluants | **ANSES** (PCB, méthylmercure) | Avis (liste bioaccumulateurs) | Alerte conso |
| Présence réelle par cours d'eau | **API Poisson Hub'Eau** (OFB/ASPE) | REST JSON, en ligne | Couche « espèces ici » (phase 3) |
| Fond hydrographique | **BD TOPAGE** (Sandre/OFB/IGN) | SIG / tuiles | Carte (phase 3) |
| Photos | **Wikimedia Commons** | CC0/CC-BY/CC-BY-SA | Embarquées, créditées |

**Principe intangible** : réglementation et santé **sourcées ou marquées « à vérifier »**, jamais
inventées. Les recettes sont **originales** (les recettes publiées sont sous copyright).

## 2. Architecture des données (le changement clé)

On passe d'un `species.ts` écrit à la main à un modèle **base générée + overlay curé** :

```
src/data/species/
  base.generated.ts   ← généré par pipeline : id, name, latin, family, group,
                         maille/quota (par règle), invasive, protected, cd_nom, bio (FishBase)
                         → pour TOUTES les espèces
  curated.ts          ← overlays à la main/agents : ident, confusions, fish (technique),
                         cook (recettes), sante, alert — pour les espèces enrichies
  index.ts            ← merge(base, curated) → SPECIES ; calcule le niveau de profondeur
```

- Un champ **`depth: "curated" | "base"`** (ou dérivé de la présence d'`ident`) pilote l'affichage :
  une fiche « base » montre taxonomie + réglementation + bio + photo, avec un bandeau
  **« Fiche en cours d'enrichissement »** (honnêteté), sans sections vides.
- Provenance : chaque espèce porte `cd_nom` (TAXREF) et une clé FishBase pour retrouver la source.
- La réglementation est calculée par un module `regleFromRules(species)` (table des mailles
  nationales + règles quota + listes invasive/protégée), pas ressaisie 90 fois.

**Pipeline** (`scripts/`) :
1. `build-species-list` : liste TAXREF filtrée « poissons d'eau douce France » → `base.generated.ts`.
2. `enrich-fishbase` : ajoute la bio par espèce.
3. `apply-regulation` : applique les règles Legifrance (maille/quota/invasive/protégée).
4. `fetch-images` (existant) : photos + attributions, étendu à toutes les espèces.

## 3. Offline / hybride

- **Cœur offline** : tout le référentiel bundlé (JSON) + photos précachées. ~90 fiches + ~90 photos
  ≈ 8-12 Mo — acceptable pour une PWA installable. Mise à jour = mise à jour de l'app (versionnée).
- **Couche géo en ligne** (Service Worker `NetworkFirst` + cache) :
  - Hub'Eau : requêtes par station/commune, réponses mises en cache (utilisable ensuite hors-ligne
    sur les zones déjà consultées).
  - Tuiles carte : `CacheFirst` avec plafond ; l'utilisateur peut « télécharger ma région ».
- **Dégradation** : sans réseau, l'app affiche tout le référentiel ; la carte indique « connexion
  requise » et propose les zones déjà en cache.

## 4. Espèces protégées — sécurité

Nouveauté critique de l'échelle nationale : beaucoup d'espèces (apron, lamproie de Planer, bouvière,
toxostome, aloses, blageon…) sont **protégées → pêche interdite ou remise à l'eau obligatoire**. Le
modèle ajoute `protected: true` avec un **bandeau rouge dédié** et le parcours « Ma prise » doit
router vers « relâcher immédiatement » (comme le miroir des invasives, mais inverse). À traiter avec
le même sérieux que les mailles.

## 5. Recettes (phase 2)

- **Recettes originales** par espèce comestible, basées sur les techniques classiques (beurre blanc,
  meunière, friture, matelote, au bleu, papillote, terrine, rillettes…), rédigées maison.
- Modèle `Recipe` déjà en place ; « mode cuisine » déjà fonctionnel.
- Priorité aux espèces « Bon/Excellent » ; les « Médiocre/Déconseillé » ont au moins une note de
  préparation (dessalage, friture) sans recette dédiée.

## 6. Carte (phase 3, feature à part entière)

- **v1 « autour de moi »** : géoloc → Hub'Eau stations proches → **espèces réellement observées à
  proximité** + lien fiche. Fond BD TOPAGE léger. C'est le différenciateur (aucune app FR ne le fait
  proprement).
- **Catégorie piscicole** : overlay là où la donnée départementale existe ; sinon omise (pas de
  couche nationale consolidée — limite documentée).
- **Techno pressentie** : MapLibre GL + tuiles vectorielles ; cache régional pour l'offline partiel.
- Cadrée dans sa propre sous-spec avant construction.

## 7. Phasage & jalons

- **Phase 1 — Pipeline & couverture** ✅ **FAIT** : listes vérifiées (`scripts/species-list/*.json`)
  → `build-base-species.mjs` → `species-base.ts`. **78 espèces** (25 curées + 53 base), profondeur
  graduée, réglementation par règles, **20 espèces protégées** flaggées (bandeau + routage « Ma prise »),
  **61 photos** libres embarquées. Technique de pêche générique par groupe sur toutes les fiches.
- **Phase 3 — Carte + hydrographie** ✅ **FAIT (v2)** : refonte sur la stack de `time-serie-explo`
  — **MapLibre GL + fond Carto Voyager**. Couches **WFS Sandre/Eaufrance** en direct navigateur
  (CORS OK) : **CoursEau1** (rivières nommées : Loire, Cher, Beuvron…), **PlanEau** (plans d'eau,
  étangs, lacs). **Stations Hub'Eau** (OFB/ASPE) → clic → espèces réellement observées → lien fiche,
  avec **catégorie piscicole estimée** d'après les espèces (salmonidés → 1ʳᵉ cat.), faute de couche
  nationale (open data fragmenté par département). **Recherche de lieu** via le géocodeur IGN
  Géoplateforme. Géolocalisation. `lib/sandre.ts` + `lib/hubeau.ts`. Cache runtime (Carto/Sandre/
  IGN/Hub'Eau) pour les zones consultées ; le reste de l'app reste hors-ligne.
- **Matériel (tacklebox)** ✅ **FAIT** : inventaire + ensembles (bundles) + guide appâts/hameçons/
  leurres/fils, persistance IndexedDB.
- **Phase 2 — Recettes & techniques** ✅ **FAIT** : modèle relationnel propre — `data/recipes.ts`
  (Recipe riche : espèces, auteur/source/année, difficulté, prep/cook/repos, matériel, techniques
  liées, sécurité, intro, sous-recettes/`components`), `data/techniques.ts` (Technique + protocole),
  `SAFETY`. **14 recettes sourcées** (historiques domaine public La Varenne 1651 → Escoffier/Gouffé/
  Favre/Menon/Ali-Bab, reformulées en métrique ; contemporaines ligériennes citées : Christophe Hay,
  Ambroise Voreux) et **7 techniques** (Ikejime 5 phases IKEPODE/SMIDAP, garum de Tours/Thierry
  Bouvet, désarêtage, dégorgeage, dissolution oseille, stérilisation, maturation). Écrans : fiche →
  recettes de l'espèce ; détail recette enrichi (source, difficulté, techniques cliquables, bandeau
  sécurité, sous-recettes) ; **mode cuisine** enchaînant les composants ; écran **Techniques & gestes**
  + **sécurité sanitaire** (parasites, congélation −20 °C/24 h ou −35 °C/15 h confirmée Règl. CE
  853/2004, mucus). Attributions incertaines marquées « à vérifier » ; barème de stérilisation corrigé
  (~5 h, non « 150 °C/1 h 30 »).

**Enrichissements futurs** : fiches d'identification détaillées pour la longue traîne (les 53 base),
photos des ~17 espèces cryptiques restantes, cache carte offline régional, snapshot Hub'Eau.

## 8. Risques & parades

- **Volume/qualité de la longue traîne** → profondeur graduée assumée + bandeau « en cours » ;
  ne jamais afficher de section vide ni de donnée inventée.
- **Statuts réglementaires fins** (protégé/maille locale) → « à vérifier » systématique + renvoi à
  l'arrêté préfectoral ; le national est un socle, jamais une certitude locale.
- **Poids offline** → images WebP redimensionnées, budget de précache surveillé, option
  « télécharger ma région » pour la carte.
- **Dépendance API (Hub'Eau)** → strictement cantonnée à la couche géo ; le cœur reste autonome.
- **Bijection nom→id pour confusions/photos** → gérée par une table centrale + `cd_nom`.
