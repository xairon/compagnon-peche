# Cahier des charges — « Compagnon de pêche eau douce »

> Document de référence pour la conception UI/UX et le développement.
> Autoportant : lisible sans aucun contexte externe.
> Version 1.0 — 2026-07-20

---

## 0. En une phrase

Une application (PWA installable, **100 % hors-ligne**) qui répond en quelques secondes, au bord de l'eau, à la question : **« J'ai cette prise — qu'est-ce que j'ai le droit et l'envie d'en faire ? »** — de l'identification jusqu'à la recette, en passant par « je garde ou je relâche », comment la tuer proprement, la vider, et les polluants à connaître.

---

## 1. Utilisateur & contexte d'usage

**Utilisateur** : pêcheur de loisir (le porteur du projet + son entourage). Usage privé, pas de compte, pas de communauté.

**Contexte physique — dimensionne TOUTE la conception :**
- **Dehors, en plein soleil** → contraste élevé obligatoire, pas de gris clair sur blanc.
- **Mains mouillées, froides, occupées** (canne dans une main) → grandes cibles tactiles (min 48×48 px), navigation au pouce, une seule main.
- **Réseau absent ou instable** → tout doit fonctionner sans connexion, images comprises.
- **Urgence douce** : un poisson vivant au bout de la ligne, il faut décider vite (le garder implique de le tuer rapidement ; le relâcher implique de le faire bien et tout de suite).
- **Batterie précieuse** → sobriété (pas d'animations lourdes, pas de GPS en continu).

**Zone géographique de référence** : France métropolitaine, avec données départementales détaillées pour l'**Indre (36)** et le **Loir-et-Cher (41)** (Centre-Val de Loire). Réglementation nationale pour le reste.

---

## 2. Principes directeurs (non négociables)

1. **Offline-first, réellement.** Une fois installée, l'app marche à 100 % sans réseau. Zéro dépendance à un serveur au moment de l'usage.
2. **Anti « IA slop ».** Épuré, éditorial, calme. Palette réduite, typo soignée, **zéro emoji en guise d'icône**, pas de gradients criards, pas de soupe de badges colorés. On vise « fait par un studio », pas « généré ».
3. **Le verdict d'abord.** Chaque fiche donne en 1 seconde l'essentiel (comestible ? maille ? quota ? saison ?) avant tout détail.
4. **Rien d'inventé.** Toute donnée réglementaire ou sanitaire est sourcée et vérifiable (voir §12). Quand une donnée dépend d'un arrêté local non vérifié, l'app le dit explicitement et renvoie à la source.
5. **Sobriété du geste.** Le moins de taps possible entre « j'ouvre l'app » et « je sais quoi faire ».

---

## 3. Périmètre

### Dans le périmètre (v1)
- Base d'espèces d'eau douce de France (~80 espèces, voir §11).
- Recherche + **identification guidée** par critères visuels.
- **Fiche espèce complète** : identification, biologie, saison, réglementation, comestibilité/polluants, mise à mort, préparation, recettes, technique/leurres/postes.
- Parcours **« Que faire de ma prise ? »** (décision garder/relâcher + geste).
- **Réglementation** : socle national en dur + détail Indre/Loir-et-Cher en dur + lien fédération pour le reste.
- **Carnet de captures** (local, offline).
- **Nœuds & montages** (guides pas-à-pas, offline).

### Hors périmètre (explicitement exclu de la v1)
- Comptes utilisateurs, synchronisation cloud, communauté/partage.
- Météo / pression / activité du poisson (dépendance réseau).
- Identification par photo/IA (v2 éventuelle).
- Achat de carte de pêche (renvoi vers cartedepeche.fr).
- Couverture départementale exhaustive des 94 fédérations.

---

## 4. Architecture de l'information

Navigation principale par **barre inférieure** (4 onglets, atteignables au pouce) :

1. **Espèces** (accueil) — recherche + grille visuelle + identification guidée.
2. **Ma prise** — le parcours de décision express (garder/relâcher/geste), aussi accessible depuis chaque fiche.
3. **Carnet** — historique des captures.
4. **Outils** — nœuds & montages, réglementation générale, réglages, sources.

Hiérarchie des écrans :

```
Espèces (accueil)
├─ Recherche instantanée
├─ Grille de photos (filtrable : carnassiers / cyprinidés / salmonidés…)
├─ Identification guidée (assistant par critères)
└─ Fiche espèce ────────────────────────┐
      ├─ Verdict (comestible/maille/quota/saison)
      ├─ « Que faire de ma prise ? » (CTA)
      ├─ Identification & confusions
      ├─ Réglementation locale
      ├─ Où & comment le pêcher (postes, leurres, techniques)
      ├─ Cuisine & recettes (vider, filets, arêtes, recettes)
      └─ Santé & polluants
Ma prise (parcours express)
Carnet
Outils
      ├─ Nœuds & montages
      ├─ Réglementation générale (national + mes départements)
      ├─ Réglages (mode jour/nuit, département actif)
      └─ Sources & mentions
```

---

## 5. Fonctionnalités détaillées

### 5.1 Accueil « Espèces »
- **Recherche instantanée** en haut (nom commun, avec tolérance aux fautes : « sandr » → Sandre). Filtre local, résultats en < 100 ms.
- **Grille de vignettes** (photo + nom), 2 colonnes, filtrable par famille (chips : Carnassiers, Cyprinidés, Salmonidés, Migrateurs, Autres).
- **Entrée « Identifier ma prise »** bien visible (pour qui ne connaît pas l'espèce).
- 2 taps maximum jusqu'à la fiche.

### 5.2 Identification guidée
Assistant pas-à-pas qui **réduit progressivement** la liste d'espèces par critères visuels simples, illustrés :
- Forme générale du corps (allongé / fusiforme / trapu / serpentiforme).
- Présence de **barbillons** (combien) → distingue silure, poisson-chat, barbeau, carpe, goujon…
- Nageoire(s) : une ou deux dorsales, présence d'**adipeuse** (salmonidés), épines.
- Couleur/robe dominante, taille approximative.
- **Confusions ciblées** intégrées : sandre/perche, brochet/… , chevesne/ide/vandoise, brème/brème bordelière, silure/poisson-chat, gardon/rotengle, truite fario/arc-en-ciel.
- À chaque étape, l'app affiche les espèces encore possibles (photos). L'utilisateur peut couper court dès qu'il reconnaît.

### 5.3 Fiche espèce — la pièce maîtresse
Structure imposée (cohérente pour les ~80 espèces) :

**A. En-tête** : photo pleine largeur, nom commun (+ noms régionaux), nom latin, pastille **saison** (ouverte/fermée aujourd'hui, calculée depuis la date + catégorie + département actif).

**B. Bandeau verdict** (3 cellules, lecture 1 seconde) :
- **Comestible** : Excellent / Bon / Médiocre / Déconseillé / Interdit (+ raison courte).
- **Maille** : taille légale minimale (national ou départemental si connu ; sinon « voir arrêté »).
- **Quota** : nb/jour si applicable (ex. carnassiers).

**C. CTA « Que faire de ma prise ? »** (voir 5.4).

**D. Sections dépliables** (ordre fixe) :
1. Identification & confusions (renvoi 5.2).
2. Réglementation locale (voir 5.8).
3. Où & comment le pêcher (voir 5.7).
4. Cuisine & recettes (voir 5.5).
5. Santé & polluants (voir 5.6).
6. Biologie (habitat, régime, reproduction, taille/poids records) — pour les curieux, en bas.

### 5.4 Parcours « Que faire de ma prise ? »
Arbre de décision court, orienté action, adapté à l'espèce :
1. **Statut légal immédiat** : espèce protégée ? interdite ? → si oui : « Remise à l'eau obligatoire et immédiate » (ou geste spécifique).
2. **Espèce classée susceptible de provoquer des déséquilibres / invasive** (perche soleil, poisson-chat, écrevisses américaines…) : rappel qu'il est **interdit de la remettre vivante dans l'eau** → il faut la mettre à mort ; comment le faire proprement.
3. **Maille & quota** : mesure rapide (silhouette/règle à l'écran optionnelle) ; sous la maille ou quota atteint → remise à l'eau soignée.
4. **Si je garde** :
   - **Mise à mort propre et rapide** : percussion (ikejime décrit pour les espèces concernées), méthode adaptée à la taille. Insister sur le côté éthique + réglementaire.
   - **Conservation** : saigner, glace, sac.
5. **Si je relâche** : gestes pour maximiser la survie (mains mouillées, hameçon, temps hors de l'eau, réanimation).

### 5.5 Cuisine & recettes
- **Préparer** : écailler / dépouiller (silure, anguille), vider, étêter, **lever les filets** (illustré), gestion des **arêtes** (les cyprinidés ont des arêtes intramusculaires en Y — technique de tranchage/incision, ou usage haché/quenelles).
- **Qualité gustative** honnête par espèce (certains cyprinidés sont médiocres/vaseux ; le dire).
- **Recettes** françaises + internationales par espèce (2 à 6 selon l'espèce), avec ingrédients, étapes, temps. Format offline, lisible cuisine.

### 5.6 Santé & polluants — section sensible
Le modèle de données **sépare deux dimensions** (ne jamais les confondre) :
- **(a) Toxicité intrinsèque / bioaccumulation par espèce** (national, permanent). Les gros bioaccumulateurs — **anguille, barbeau, brème, carpe, silure** — concentrent PCB/dioxines/méthylmercure. Recommandations ANSES à afficher tel quel :
  - Population générale : **2 fois par mois maximum** pour ces espèces.
  - Publics sensibles (femmes en âge de procréer/enceintes/allaitantes, enfants < 3 ans, adolescentes) : **1 fois tous les 2 mois maximum**.
  - Les autres espèces : consommation normale (2 portions de poisson/semaine, variées).
- **(b) Pollution locale d'un cours d'eau** (géographique, réglementaire). Indépendante de l'espèce : dans les zones sous **arrêté préfectoral d'interdiction** (PCB), c'est souvent **toutes espèces interdites**. L'app affiche un avertissement générique + **champ « dernière vérification »** + renvoi à la vérification locale (pas de carte nationale existante).
- **Disclaimer** visible : l'app informe, ne se substitue pas aux arrêtés en vigueur. (Point de risque juridique n°1 du projet.)

### 5.7 Où & comment le pêcher
Par espèce : **techniques** (leurre, pêche au coup, carpe, mouche…), **leurres/appâts** recommandés, **postes** (type de fond, structure — bois noyé, cassure, pont —, hauteur d'eau, courant), **période & moment** de la journée les plus favorables.

### 5.8 Réglementation locale
- **Socle national** (toujours présent, offline) : tailles minimales (R436-18), quota carnassiers (R436-21), périodes par catégorie (F2117), horaires.
- **Départements Indre (36) & Loir-et-Cher (41)** : spécificités en dur (offline), avec **date de validité de l'arrêté** affichée et **rappel de revérifier l'année en cours**.
- **Ailleurs en France** : lien direct vers la fédération du département (détecté par GPS si l'utilisateur l'active ponctuellement, sinon sélection manuelle).
- **Catégorie piscicole** du cours d'eau : indiquée quand la donnée est disponible, sinon explication de comment la connaître.

### 5.9 Carnet de captures (offline, local)
- Ajouter une capture : espèce (pré-remplie si on vient d'une fiche), taille, poids (optionnel), date/heure (auto), lieu (nom libre + GPS optionnel), photo (stockée localement), note, gardé/relâché.
- Liste chronologique + filtres (espèce, période). Statistiques simples (nb par espèce, plus grosse prise).
- **100 % local** (IndexedDB). Export/import JSON pour sauvegarde manuelle. Aucune donnée envoyée nulle part.

### 5.10 Nœuds & montages (offline)
- Bibliothèque de **nœuds** (clinch amélioré, palomar, raccord ligne/bas de ligne, boucle…) et **montages** (cuiller/leurre, drop shot, texan, pater-noster, pêche au coup…), classés par usage.
- Chaque fiche : étapes illustrées (schémas vectoriels, pas de vidéo lourde), quand l'utiliser.

---

## 6. Modèle de données

Données statiques versionnées, livrées **en JSON validé par schéma**, embarquées dans l'app. Séparation nette entre données (JSON) et code.

### 6.1 Entité `Species`
```jsonc
{
  "id": "sandre",                       // slug stable
  "commonName": "Sandre",
  "regionalNames": ["Perche-brochet"],
  "scientificName": "Sander lucioperca",
  "family": "Percidés",
  "group": "carnassiers",               // carnassiers | cyprinides | salmonides | migrateurs | autres
  "photos": [                            // voir §12 pour licences
    { "src": "sandre-01.webp", "credit": "…", "license": "CC-BY-SA-4.0", "author": "…", "sourceUrl": "…" }
  ],
  "identification": {
    "summary": "…",
    "keyTraits": ["2 nageoires dorsales", "dents canines", "flancs barrés"],
    "confusions": [
      { "withId": "perche", "howToTell": "…" }
    ],
    "guidedTraits": {                    // pour l'assistant d'identification
      "bodyShape": "fusiforme",
      "barbels": 0,
      "adiposeFin": false,
      "dominantColor": "gris-vert barré",
      "typicalSizeCm": [40, 70]
    }
  },
  "biology": { "habitat": "…", "diet": "…", "reproduction": "…", "maxSizeCm": 100, "maxWeightKg": 12 },
  "edibility": {
    "rating": "excellent",              // excellent | bon | mediocre | deconseille | interdit
    "note": "Chair blanche, fine, peu d'arêtes",
    "bones": "peu",                      // peu | moyen | beaucoup (arêtes en Y)
    "pollutant": {
      "bioaccumulator": false,          // gros accumulateur PCB/dioxines/mercure ?
      "advice": "…",                     // recommandation de fréquence (source ANSES)
      "source": "anses-…"
    }
  },
  "regulation": {
    "legalSizeCmNational": 40,          // R436-18 (peut être null si non fixé nationalement)
    "quotaNote": "Compte dans les 3 carnassiers/jour (dont 2 brochets max)",
    "category": "2",                     // catégorie piscicole type
    "protected": false,
    "invasiveNoReturn": false,          // interdit de remise à l'eau vivant ?
    "seasonRule": "openYearRound|refId", // référence vers règle de saison
    "sourceRefs": ["legifrance-r436-18", "sp-f2117"]
  },
  "keepOrRelease": {                     // pilote le parcours 5.4
    "mustKill": false,                   // obligation de mise à mort (invasive)
    "killMethod": "percussion|ikejime|…",
    "releaseTips": "…"
  },
  "fishing": {
    "techniques": ["leurre", "vif", "drop shot"],
    "lures": ["leurre souple", "…"],
    "spots": "cassures, bois noyé, ponts, fonds durs",
    "waterDepth": "2–6 m",
    "bestPeriod": "…", "bestTime": "aube/crépuscule"
  },
  "cooking": {
    "prep": ["écailler", "vider", "lever les filets"],
    "recipes": [
      { "id": "…", "title": "…", "origin": "France", "ingredients": ["…"], "steps": ["…"], "timeMin": 30 }
    ]
  }
}
```

### 6.2 Entités annexes
- `RegulationNational` : tailles, quotas, périodes par catégorie (socle Legifrance/F2117).
- `RegulationDepartement` : `{ dept: "41", arreteRef, validYear, sourceUrl, overrides: {…}, notes }`.
- `Knot` / `Rig` : `{ id, name, useCase, steps: [{ illustration, caption }] }`.
- `Catch` (carnet, IndexedDB, non versionné) : `{ id, speciesId, sizeCm, weightKg, datetime, place, gps?, photoBlob, kept, note }`.

### 6.3 Règles de validation
- Chaque `Species` doit référencer au moins une source pour `regulation` et pour `edibility.pollutant`.
- Toute valeur réglementaire non vérifiée est `null` + flag `unverified: true` (l'UI affiche « à vérifier localement », jamais une valeur inventée).

---

## 7. Design system

### 7.1 Direction retenue
Épuré, éditorial, « guide de terrain moderne ». **Deux registres typographiques** : un serif pour les titres d'espèces (côté guide/encyclopédie), un sans-serif pour l'interface.

### 7.2 Palette (restreinte)
- **Encre** `#1A201C` (texte principal).
- **Crème/papier** `#FBFAF7` (fond clair).
- **Vert forêt** `#1D6E42` (accent unique / actions positives).
- **Ambre** `#9A6A12` (attention : maille, quota).
- **Rouge terre** `#B33A2E` (interdit / relâche obligatoire) — usage rare, réservé aux alertes.
- Gris chauds pour les séparateurs (`#ECE8DD`).
- **Mode nuit** (pêche au crépuscule/nuit) : fond vert-nuit profond `#0E1A14`, texte crème, mêmes accents désaturés. Bascule **manuelle** + option auto selon l'heure.

### 7.3 Typographie
- Titres/espèces : serif (ex. « Fraunces », « Source Serif », ou Georgia en repli). Poids 600–700.
- Interface/corps : sans-serif système (`-apple-system, Segoe UI, system-ui`) pour la perf offline et la lisibilité.
- Tailles minimales généreuses (corps ≥ 16 px, cibles ≥ 48 px).

### 7.4 Iconographie
- **Icônes ligne, dessinées** (SVG, stroke ~1.5), style cohérent. **Aucun emoji** dans l'UI.
- Un petit set maison (recherche, poisson, réglementation, cuisine, hameçon/technique, bouclier santé, carnet, nœud).

### 7.5 Composants clés
- **Bandeau verdict** (3 cellules, bordure fine, pas de couleur de fond criarde ; la couleur porte uniquement sur la valeur).
- **Bouton d'action primaire** (encre foncé, plein, grand).
- **Lignes de section** (icône + titre + sous-titre + chevron), listes calmes.
- **Pastille saison** (point coloré + label), discrète.
- **Cartes recette / nœud** sobres.
- **Chips de filtre** (familles d'espèces).

### 7.6 Mouvement & accessibilité
- Transitions courtes et sobres (≤ 200 ms), respect de `prefers-reduced-motion`.
- Contraste AA minimum, testé en plein soleil (fort contraste privilégié).
- Navigation une main, cibles larges, pas de geste complexe requis.

---

## 8. Spécifications écran (pour la conception UI)

Écrans à concevoir en priorité, du plus au moins critique :
1. **Fiche espèce** (piste visuelle de référence dans `.superpowers/brainstorm/…/refined-fiche.html` — direction épurée à confirmer/affiner par le designer). C'est l'écran signature.
2. **Accueil Espèces** (recherche + grille + entrée identification).
3. **Parcours « Que faire de ma prise ? »** (séquence de décision, gros boutons).
4. **Identification guidée** (assistant par critères illustrés).
5. **Réglementation locale** (socle + département + disclaimer).
6. **Cuisine/recette** et **Santé/polluants** (contenu long, lisible).
7. **Carnet** (liste + ajout).
8. **Nœuds & montages** (étapes illustrées).

Format cible : **mobile-first** (portrait, ~390 px), agrandi proprement en tablette/desktop.

---

## 9. Stack technique & architecture

- **PWA** (Progressive Web App) installable, pas d'app store.
- **React + TypeScript + Vite** (build statique).
- **Routing** : React Router (ou équivalent léger).
- **Données** : fichiers **JSON statiques** validés par **schéma (Zod ou JSON Schema)** au build ; embarqués dans le bundle / préchargés.
- **Carnet** : **IndexedDB** (via `idb` léger) ; photos stockées en Blob local.
- **Service Worker** (Workbox) : **precache** de tout le shell applicatif, des données JSON et des images (stratégie cache-first). L'app s'installe et fonctionne intégralement hors-ligne.
- **Images** : format **WebP/AVIF**, tailles responsives, toutes embarquées/précachées (pas de CDN externe au runtime).
- **Icônes** : SVG inline (set maison).
- **Aucun backend, aucune base serveur, aucune analytics tierce.** Zéro donnée personnelle sortante.
- **Hébergement** : statique (Cloudflare Pages / Netlify / GitHub Pages) — gratuit, HTTPS, requis pour le service worker.
- **Mise à jour des données** (1–2 fois/an, arrêtés annuels) : nouveau déploiement ; le service worker met à jour le cache et notifie « nouvelle version disponible ».

### Arborescence projet (proposition)
```
/data            # JSON sources (species/, regulation/, knots/, recipes/) + schémas
/scripts         # validation + build des données, optimisation images
/public          # manifest PWA, icônes app, images précachées
/src
  /components    # design system (VerdictBar, SectionRow, SeasonPill…)
  /features      # species, identify, catch (carnet), knots, regulation, keepOrRelease
  /pages
  /data-access   # chargement JSON, requêtes IndexedDB
  /styles        # tokens (couleurs, typo), thèmes jour/nuit
  sw.ts          # service worker (Workbox)
```

---

## 10. Stratégie offline / PWA (détail)

- **App shell** précaché à l'installation.
- **Données + images** : precache complet au premier lancement (afficher une **progression de téléchargement** « préparation du mode hors-ligne »). Poids cible à surveiller (viser < 50–80 Mo images comprises ; sinon proposer un téléchargement par lots de familles d'espèces).
- **Manifeste PWA** : nom, icônes, `display: standalone`, orientation portrait, thème.
- **Détection hors-ligne** : bandeau discret « hors-ligne — toutes les fiches restent disponibles ».
- **GPS** : utilisé **ponctuellement et à la demande** (lien fédération, position dans le carnet), jamais en continu.

---

## 11. Contenu à produire (inventaire espèces)

~80 espèces d'eau douce de France métropolitaine, groupées :
- **Carnassiers** : sandre, brochet, perche, black-bass, silure, aspe, chevesne (opportuniste).
- **Salmonidés** : truite fario, truite arc-en-ciel, truite de lac, omble chevalier, omble de fontaine, ombre commun, huchon, saumon atlantique.
- **Cyprinidés** : carpe (commune, miroir, cuir), gardon, rotengle, tanche, brème commune, brème bordelière, barbeau fluviatile, hotu, vandoise, ide mélanote, goujon, ablette, bouvière, carassin, poisson rouge, amour blanc.
- **Migrateurs** : anguille, alose, lamproie (marine, fluviatile), truite de mer, saumon.
- **Autres / classés nuisibles ou invasifs** : perche soleil, poisson-chat, pseudorasbora, écrevisses américaines (signal, de Louisiane, américaine), grémille.
- **Protégés / interdits** : apron du Rhône, bouvière (protégée), lamproies (statuts), etc. — à traiter comme « pêche interdite / remise à l'eau obligatoire ».

> La liste exacte et le statut réglementaire de chaque espèce seront figés à partir des sources §12 (INPN/TAXREF pour la taxonomie, Legifrance pour les statuts). Aucun statut ne sera inventé.

---

## 12. Sources de données (vérifiées — ne rien inventer)

> Cette section liste les sources **réellement vérifiées**. Principe : Legifrance et les arrêtés préfectoraux font foi ; les fédérations et sites tiers sont des repères, pas des références juridiques.

### 12.1 Réglementation nationale (source faisant foi)
- **Legifrance — Code de l'environnement, art. R436-18** (tailles minimales) : https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074220/LEGISCTA000006188898/
  - Valeurs vérifiées : brochet 0,50 m ; sandre 0,40 m (2e cat.) ; black-bass 0,30 m ; truites 0,23 m ; ombre commun 0,30 m ; huchon 0,70 m ; écrevisses (R436-10) 0,09 m ; etc.
  - **Attention** : R436-19/R436-20 autorisent le **préfet à modifier** ces tailles localement → traiter le national comme un **socle**, pas une constante figée.
- **Legifrance — art. R436-21** (quota carnassiers) : https://www.legifrance.gouv.fr/codes/id/LEGISCTA000006176936
  - Vérifié : **3 carnassiers/jour** (sandre + brochet + black-bass) **dont 2 brochets max** en 2e catégorie. Le préfet peut durcir, jamais assouplir.
- **service-public.gouv.fr — fiche F2117** (périodes & horaires, vulgarisation officielle) : https://www.service-public.gouv.fr/particuliers/vosdroits/F2117
  - 1re cat. : 2e samedi de mars → 3e dimanche de septembre. 2e cat. : ouverte à l'année (brochet fermé sauf 1er janv.→dernier dim. de janv., puis dernier sam. d'avril→31 déc.). Horaires : ½ h avant lever → ½ h après coucher du soleil.
- **FNPF** (source secondaire pédagogique, non normative) : https://www.federationpeche.fr/

### 12.2 Réglementation départementale (donnée réellement applicable)
Mécanisme : **arrêté préfectoral annuel** publié au Recueil des Actes Administratifs, relayé par la fédération départementale. **Format PDF/HTML non structuré, à revérifier chaque année. Aucun format national normalisé n'existe** — c'est le principal coût de maintenance du projet.
- **Indre (36)** — Préfecture : https://www.indre.gouv.fr/Actions-de-l-Etat/Environnement/Peche/Reglementation (arrêté relevé : n° 36-2025-12-12-00002 « pêche 2026 »). Fédération : https://www.peche36.fr/322-reglementation.htm · ouvertures : https://www.peche36.fr/324-ouvertures.htm
- **Loir-et-Cher (41)** — Fédération : http://www.peche41.fr/603-reglementation.htm · périodes : http://www.peche41.fr/605-periodes-de-peche.htm · Préfecture/DDT (RAA) : https://www.loir-et-cher.gouv.fr/ *(URL exacte de l'arrêté annuel non stable — à récupérer manuellement chaque année)*.

### 12.3 Open data exploitable
- **API Hub'Eau « Poisson » (OFB)** — présence d'espèces par station (données scientifiques, PAS réglementaires) : https://hubeau.eaufrance.fr/page/api-poisson (JSON/GeoJSON/CSV, Licence Ouverte Etalab). Usage possible : enrichir « quelles espèces dans tel cours d'eau ». **Pas** pour tailles/dates/quotas.
- **Catégories piscicoles** — data.gouv, **fragmenté par département** (SIG, Licence Ouverte, parfois anciennes) ; **pas de couche nationale consolidée vérifiée**. Ex. Loir-et-Cher : https://www.data.gouv.fr/datasets/peche-categories-piscicoles-des-cours-deau-et-plans-deau-majeurs-en-loir-et-cher
- **cartedepeche.fr** (FNPF) — vente de cartes ; **aucune API/open data ouvert des parcours/réserves/réciprocité** (verrouillé côté FNPF). Renvoi lien uniquement.

### 12.4 Taxonomie & biologie des espèces
- **GBIF Species API** (socle recommandé — testé, JSON, ouvert, résilient) : `https://api.gbif.org/v1/species/search?q=Salmo+trutta` — classification, noms vernaculaires, statuts, habitats. **Non affecté par la panne INPN.**
- **FishBase API** (biologie détaillée : morphologie, taille/poids, habitat, régime) : `https://fishbase.ropensci.org/` — lecture seule. ⚠️ **Licence non totalement libre** (crédit requis, restrictions non-commerciales sur certains contenus) → à valider au cas par cas.
- **TAXREF (MNHN)** — référentiel taxonomique national officiel (autorité française, statuts de protection) : `https://taxref.mnhn.fr/` + miroir téléchargeable data.gouv `https://www.data.gouv.fr/datasets/referentiel-taxonomique-taxref` (CSV, Licence Ouverte Etalab). ⚠️ **Le site INPN/TAXREF a subi une cyberattaque en 2025 et peut être indisponible — utiliser le miroir data.gouv et GBIF entre-temps ; revérifier au moment de l'intégration.**
- **Atlas des poissons d'eau douce de France** (Keith et al., 2011, jeu INPN) : `https://inpn.mnhn.fr/espece/jeudonnees/29` (référence scientifique française ; même caveat de disponibilité).
- **Wikipédia** — liste indicative : `https://fr.wikipedia.org/wiki/Liste_des_poissons_d'eau_douce_en_France_métropolitaine` (CC-BY-SA) — **source secondaire uniquement, à recouper avec TAXREF/GBIF.**

### 12.5 Photos / illustrations (licences à vérifier IMAGE PAR IMAGE)
- **Wikimedia Commons** (meilleure source pour embarquer légalement) : `https://commons.wikimedia.org/` — n'accepte que CC0, CC-BY, CC-BY-SA, domaine public. Attribution : auteur + licence + lien pour CC-BY/BY-SA.
- **iNaturalist** : `https://www.inaturalist.org/` — ⚠️ **PIÈGE : licence par défaut CC-BY-NC (non commercial), incompatible.** Filtrer strictement sur CC0 / CC-BY / CC-BY-SA.
- **INPN Galerie** : `https://inpn.mnhn.fr/informations/photos/galerie` — ⚠️ **PAS libre par défaut** (© photographes individuels, charte) → **ne pas embarquer sans autorisation.**
- **Obligation** : stocker pour chaque image → auteur, licence exacte, URL source, lien licence (cf. modèle `Species.photos` §6.1).

### 12.6 Santé & polluants (ANSES + arrêtés locaux)
- **Fiche ANSES « Poissons, conseils de consommation »** (vérifiée, PDF officiel) : `https://www.anses.fr/system/files/ANSES-Ft-RecosPoissons.pdf`
  - **Population générale** : poissons d'eau douce **fortement bioaccumulateurs** (anguille, barbeau, brème, carpe, silure) = **2 fois/mois maximum**, en variant espèces et lieux.
  - **Populations sensibles** (femmes en âge de procréer/enceintes/allaitantes, enfants < 3 ans, adolescentes) : ces mêmes espèces = **1 fois tous les 2 mois maximum**.
  - Motif : PCB, dioxines, méthylmercure. Seuil réglementaire PCB : 250 ng/g.
  - Rapport d'expertise « Poissons d'eau douce et PCB » (2015) : `https://www.anses.fr/fr/system/files/ERCA2014sa0122Ra.pdf`
- **Arrêtés préfectoraux d'interdiction de consommation (pollution locale)** : pas d'API ni de carte nationale. Meilleure consolidation = bassin **Rhône-Méditerranée** : `https://www.rhone-mediterranee.eaufrance.fr/gestions-des-pollutions/pollution-par-les-pcb/les-arretes-dinterdiction` (le plus touché : Rhône, Saône, Doubs). Ailleurs : sites préfectoraux `*.gouv.fr` département par département. **Prévoir un champ « date de dernière vérification » par cours d'eau.** C'est le **point de risque juridique n°1** → disclaimer renvoyant à l'arrêté en vigueur.

### 12.7 Espèces invasives / protégées (source juridique)
- **Legifrance — art. R432-5** (vérifié, texte de loi) : `https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038416150` — espèces susceptibles de provoquer des **déséquilibres biologiques**, introduction interdite : **poisson-chat (*Ameiurus melas*), perche soleil (*Lepomis gibbosus*), crabe chinois**, + écrevisses hors 4 espèces natives européennes. Base légale de l'**interdiction de remise à l'eau vivant** (relayée par les fédérations pour : poisson-chat, perche soleil, gambusie, pseudorasbora, écrevisses américaines *Procambarus clarkii / Pacifastacus leniusculus / Faxonius limosus / Procambarus virginalis*).
- **Liste rouge UICN — Poissons d'eau douce de France métropolitaine (2019)** : `https://uicn.fr/liste-rouge-poissons-d-eau-douce/` (tableau : `https://uicn.fr/wp-content/uploads/2019/08/tableau-liste-rouge-poissons-d-eau-douce-de-france-metropolitaine.pdf`) — ~80 espèces évaluées, identifie les espèces menacées/protégées (pêche interdite).
- Statuts de protection officiels par espèce : **TAXREF/INPN** (même caveat de disponibilité 2025).

### 12.8 Ce qui N'EXISTE PAS / points de fragilité (constats vérifiés — à ne pas supposer)
- Pas d'API officielle des tailles/dates/quotas légaux (Legifrance = HTML à interpréter).
- Pas de format structuré national des arrêtés préfectoraux (PDF/HTML, 94 sources, revérif annuelle).
- Pas d'open data ouvert des parcours de pêche / réserves / réciprocité (verrouillé FNPF).
- Pas de couche nationale consolidée et à jour des catégories piscicoles (fragmenté par dép.).
- **Pas de cartographie nationale ouverte des interdictions de consommation** (arrêtés PCB par bassin/préfecture, agrégation manuelle).
- **INPN/TAXREF potentiellement indisponible** (cyberattaque 2025) → dépendre de GBIF + miroir data.gouv.
- **Licences FishBase et INPN non totalement libres** → validation au cas par cas.

---

## 13. Contraintes légales & avertissements

- **Disclaimer permanent** (écran Sources + bas des fiches réglementation/santé) : l'app est un outil d'aide, **la réglementation applicable est celle de l'arrêté préfectoral en vigueur** ; l'utilisateur doit la vérifier. Les recommandations sanitaires renvoient à l'ANSES et aux arrêtés locaux.
- **Licences des contenus** : chaque photo doit porter crédit + licence (CC-BY/CC-BY-SA/CC0/domaine public). Textes réglementaires : citation de la source, pas de reproduction intégrale non nécessaire.
- **Données personnelles** : le carnet reste **local**, rien n'est transmis. Pas de tracking.

---

## 14. Phasage

- **v1.0 (socle)** : espèces + fiche complète + identification guidée + verdict + parcours prise + réglementation (national + 36/41) + cuisine/recettes + santé/polluants + technique. Offline complet.
- **v1.1** : carnet de captures.
- **v1.2** : nœuds & montages.
- **v2 (idées)** : identification par photo (IA embarquée), extension à d'autres départements, météo/pression.

---

## 15. Critères de réussite

- Depuis l'ouverture de l'app, **≤ 3 taps** pour obtenir le verdict d'une espèce connue.
- Fonctionne **intégralement sans réseau** après installation (testé mode avion).
- **Aucune donnée réglementaire/sanitaire inventée** : tout est sourcé ou marqué « à vérifier ».
- Lisible **en plein soleil**, utilisable **d'une seule main**.
- L'esthétique ne « sent » pas l'IA : sobre, cohérente, soignée.
