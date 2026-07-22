# Refonte navigation & parcours — Compagnon de pêche

> Issu d'un brainstorm à 4 agents (parcours utilisateur · architecture de l'info · benchmark
> concurrents · usabilité bord de l'eau). Objectif : lever la confusion Espèces / Ma prise / Carnet.

## Diagnostic partagé
Le chevauchement vient de traiter Espèces (référence), Ma prise (action) et Carnet (historique)
comme **trois pairs**, alors que ce sont **trois intentions à des moments différents** :
- **Espèces** = *savoir* (consultation à froid).
- **Ma prise** = *agir* (décision à chaud, poisson en main).
- **Carnet** = *se souvenir* (relecture après coup).
Résultat : on choisit une espèce à 2 endroits, on ajoute une capture à 2 endroits.

## Consensus des 4 lentilles (à implémenter)
1. **« Prise » = bouton d'action central proéminent** dans la barre (modèle Strava « Record » /
   Fishbrain « + » — confirmé par le benchmark : les meilleures apps tiennent en **5 emplacements =
   4 onglets + 1 action centrale**). Pas un onglet ordinaire, pas un FAB flottant (déclenchements
   accidentels avec gants mouillés). Atteignable **partout, en 1 tap**.
2. **Prise = un seul parcours** : identifier → verdict garder/relâcher → journaliser.
3. **Un seul moteur d'identification**, réutilisé : dans **Espèces** (consultation) et dans **Prise**
   (action). Deux entrées, zéro logique dupliquée.
4. **Un seul point d'ajout** au carnet. Le Carnet **relit et édite** ; son « + » = ajout rétroactif
   (même fiche de saisie, sans l'étape de décision — déjà prise).
5. **Verdict = ce qui bloque d'abord**, en GROS + couleur + pictogramme (jamais couleur seule) :
   **protégé → hors-saison → maille → quota → 🟢 gardable**. Le « comestible / recette » n'apparaît
   **jamais** dans le verdict (confort, pas décision).
6. **Journalisation = sous-produit** : espèce (écran A) + taille (saisie pour la maille) + lieu (GPS)
   déjà connus → **1 tap « Enregistrer »**, pré-rempli, **opt-out** (sauvé par défaut), jamais bloquant.
   On journalise aussi les relâchés (utile quota), sans effort.
7. **Anti-erreur** : « Relâcher » = 1 tap (sûr, réversible) ; « Garder / mise à mort » = **appui long
   ou glisser-pour-confirmer**. Impossible d'ouvrir le guide ikejime sur une espèce protégée.
8. **100 % hors-ligne** pour tout le chemin critique (déjà le cas). Géoloc = GPS pur.

## Structure cible

**Barre : 4 onglets + 1 action centrale (5 emplacements).**

```
   Espèces        Carte      [ + PRISE ]      Carnet        Outils
   (savoir)     (où pêcher)   (agir, héros)  (se souvenir)  (boîte à outils)
```

- **Espèces** — catalogue + recherche + identification guidée → **fiche riche** (Identification,
  Réglementation, Technique, Cuisine, Santé, Bio). Bouton fiche « Je l'ai pêché → » qui **entre dans
  le parcours Prise à l'étape verdict**, espèce pré-remplie.
- **Carte** — rivières & plans d'eau (Sandre) + stations Hub'Eau (espèces réellement inventoriées).
- **[+ Prise]** — bouton central surélevé. Ouvre **toujours** le parcours ci-dessous.
- **Carnet** — historique + stats (quota du jour, records). « + » = ajout rétroactif.
- **Outils** — matériel, nœuds, techniques & recettes, réglementation générale, sources.

**Le parcours Prise (déclenché par [+]) :**
```
1. IDENTIFIER
   • grille des espèces probables (récemment vues + proximité Hub'Eau) — 1 tap si connue
   • recherche texte
   • « Identifier par critères » (forme → barbillons → adipeuse → …) — 4-5 taps si inconnue
   ↓ (les voies convergent vers la même espèce)
2. VERDICT garder/relâcher — bannière couleur, ce qui bloque d'abord
   protégé/invasif → hors-saison → maille (saisie taille) → quota du jour → 🟢 gardable
   • [ Relâcher ] = 1 tap   • [ Garder ] = appui long → guide ikejime pas-à-pas
   ↓
3. JOURNALISER — pré-rempli (espèce, décision, taille, lieu GPS, heure) → 1 tap « Enregistrer »
   (photo / poids / appât / note = optionnels ; sauvé par défaut)
```

**Résolution des chevauchements :** identifier, décider, journaliser deviennent **3 étapes d'un seul
parcours**, pas 3 onglets. Espèces ne sert plus qu'à consulter ; le Carnet ne sert plus qu'à relire.

## Nommage
Onglets = **noms** (lieux), action = **verbe** (« Prise »). Vocabulaire pêcheur (« Carnet », pas
« Journal »). « Ma prise » → **« Prise »** (le possessif est superflu — tout est déjà local/personnel).

## Différenciateurs à mettre en avant (benchmark)
- **100 % hors-ligne, sans compte** (comme Merlin Bird ID en fait un slogan).
- **Réglementation FR au moment de la décision** (le verdict garder/relâcher = la signature, cf.
  FishVerify ID+règles aux US ; aucune app FR ne pousse ce parcours).
- **Fiche riche** (cuisine sourcée + santé + bio) là où Génération Pêche s'arrête au référentiel.

## Ce qui change concrètement dans le code
- `BottomNav` : 4 onglets + bouton central surélevé « Prise ».
- `store` : `Tab` = especes | carte | carnet | outils (+ l'action prise hors barre) ; l'app ouvre
  sur… (à décider : Espèces ou directement le parcours Prise ?).
- `Prise` (écran) : devient le parcours complet (étape « identifier » ajoutée en amont, réutilisant
  le composant d'identification d'`Especes`/`Identify`).
- `Carnet` : retire le formulaire d'ajout autonome dupliqué → « + » = même parcours/saisie.
- `Especes` : reste le catalogue ; le sélecteur d'espèce est extrait en composant réutilisable.
- Verdict `prise.ts` : réordonner l'affichage « ce qui bloque d'abord » + confirmation appui-long
  pour « garder/kill ».

## Décisions (validées) & état
- **Écran d'ouverture** : **Espèces** (validé).
- **Bouton central** : « **Prise** » (disque vert surélevé dans la barre).
- ✅ **IMPLÉMENTÉ & vérifié** : barre à 4 onglets (Espèces · Carte · Carnet · Outils) + bouton central
  Prise ; le parcours Prise s'ouvre sur l'étape **identifier** (recherche + « je ne connais pas
  l'espèce » guidée + récemment vus + grille photos) → verdict → journaliser ; « Que faire de ma
  prise ? » de la fiche entre au verdict ; `tab:"prise"` supprimé partout. tsc propre, zéro erreur.

## Affinages du parcours ✅ FAIT
- **Grand bandeau verdict** « ce qui bloque d'abord » : bannière couleur pleine largeur en tête de
  carte — 🔴 RELÂCHER (protégé) / NE PAS RELÂCHER VIVANT (invasif) / PÊCHE FERMÉE ; 🟠 MESURER — 40 cm ;
  🟢 PÊCHE OUVERTE. (`prise.ts` `tone`/`banner` + `.verdict-banner`.)
- **Anti-erreur appui-long** (`HoldButton`) : « Garder / mise à mort » exige un maintien ~0,9 s (anneau
  de remplissage) — pas de déclenchement accidentel avec des gants. « Relâcher » reste à 1 tap.
- **Log 1 tap / opt-out** : taille mesurée saisie à l'étape maille → pré-remplit le carnet ; l'ajout
  crée l'entrée **directement** (plus de formulaire intermédiaire) et affiche une confirmation
  « ✓ ajoutée » + surbrillance de la ligne. (`addCatch(sp, kept, size)` + `justAdded`.)

## Spots perso (mes coins de pêche) ✅ FAIT
Déclarer ses propres points de pêche **dans la Carte** (un spot = un lieu), 100 % local.
- **Modèle** `Spot { id, name, lat, lon, species[], technique, best, note, created }` (`types.ts`),
  persisté en IndexedDB comme le carnet (`loadSpots`/`saveSpots`, clé `carnet:spots`, aucune donnée
  factice au départ). État + actions `addSpot`/`updateSpot`/`removeSpot` dans le store.
- **Création** : bouton ambre « Ajouter un spot » → mode placement (bannière) → **tap sur la carte**
  pour poser le pin, ou **« Ma position »** (GPS `getCurrentPosition`). Ouvre un formulaire : nom
  (requis), **espèces** (sélecteur recherche → chips), **technique/leurre/appât**, meilleur moment,
  note d'accès.
- **Calque** : pins ambre + halo, toujours visibles, distincts des stations Hub'Eau (noires) ; la
  légende compte « N spot(s) perso ».
- **Fiche** : tap sur un pin → espèces (chips → fiche espèce), technique, moment, note, coords
  cliquables (« centrer ») + **Modifier** / **Supprimer** (confirmation en 2 temps).
- Vérifié en navigateur : création (tap + formulaire), rendu du pin, fiche, **persistance après
  rechargement** (IndexedDB), zéro erreur console. tsc 0, build OK.

### Spot ↔ Prise ↔ Carnet (liaisons) ✅ FAIT
- **« 🎣 Je pêche ici »** dans la fiche du spot → lance le parcours Prise avec le **lieu pré-rempli**
  (`startPrise(spot.name)` → `prise.place`). Le lieu est conservé à travers toutes les étapes
  (spread de `prise` dans `pick`/`goBack`/annuler) et **inscrit dans la capture** (`addCatch` lit
  `prise.place` au lieu de « — »). Bandeau ambre « 📍 Enregistrée à : … » visible tout le parcours.
- **Liste « Mes spots » dans le Carnet** (nom + espèces + technique) ; tap sur une ligne →
  `focusSpot` + bascule Carte, qui **vole vers le spot et ouvre sa fiche**.
- Vérifié bout en bout : Carnet → spot sur carte → « Je pêche ici » → Sandre 58 cm relâché →
  capture enregistrée **à « Fosse du pont de Blois »**. tsc 0, build OK, zéro erreur console.
