# Carnet de pêche riche + profil (le « Fishbrain sans réseau social »)

> Objectif : récupérer les fonctionnalités **non-sociales** de Fishbrain/FishAngler/FishFriender —
> prise détaillée, profil/tableau de bord, statistiques, galerie photos — 100 % local, offline-first,
> sans compte ni transmission de données.

## Décisions validées (utilisateur)
- **Champs de prise** : tous — heure+moment, lieu (spot lié / GPS), matériel + appât + technique,
  poids + photo + note. Espèce + taille restent les seuls requis.
- **Profil** : le Carnet actuel est **transformé** en profil complet (pas de 5ᵉ onglet).
- **Identité** : éditable en local (nom, bio, région, avatar) — stockée sur l'appareil, jamais transmise.

## Modèle de données

### Catch (étendu — tous les nouveaux champs optionnels, rétro-compatible)
```
Catch { slot, sp, spid, iso, size, n, date, place, kept,
        time?, weight?, spotId?, lat?, lon?, gearIds?[], bait?, technique?, photo?, note? }
```
- `time` : "HH:MM" locale ; `photo` : clé blob IndexedDB (`photo:<slot>`) ; `gearIds` : ids de la boîte à outils.

### GearItem (remonté dans le store)
`GearItem { id, cat, name, detail }` — déplacé de Materiel.tsx vers types.ts. Source de vérité unique
dans le store (clé IDB `fish-gear`) pour être relié aux prises et au profil. Les *bundles* restent
locaux à Materiel (non liés aux prises).

### Profile (nouveau)
`Profile { name, bio, region, avatar? }` — clé IDB `carnet:profile`. `avatar` = clé blob.

## Photos (blobs locaux)
- `lib/photos.ts` : `savePhoto(key, blob)`, `loadPhoto(key)`, `deletePhoto(key)`, hook `usePhotoUrl(key)`
  (crée/révoque l'object URL). `downscaleImage(file, max=1280)` via canvas pour limiter le poids.
- Saisie : `<input type="file" accept="image/*" capture="environment">`. Rien n'est transmis.

## Écrans

### Carnet → Profil / tableau de bord
- **En-tête identité éditable** : avatar (tap → changer), nom, bio, région ; crayon → édition.
- **Ligne de stats** : Prises · Espèces (spid distincts) · Record (max n cm).
- **Boutons rapides** : Espèces pêchées · Statistiques · Matériel (→ materiel) · Carte (→ carte).
- **Galerie des prises** : grille 2 colonnes de photos (placeholder espèce si pas de photo) ;
  tri (récent / taille / espèce) ; tap → détail. « + Capture » ouvre le formulaire riche.
- **Mes spots** : conservé.

### Détail de prise (nouveau — `prise-detail`)
Photo, espèce (→ fiche), taille + poids, date + heure + moment, lieu (+ spot/GPS → carte),
matériel, appât, technique, gardé/relâché, note. Boutons Modifier / Supprimer.

### Statistiques (nouveau — `statistiques`)
- Résumé (total, espèces, record, gardé vs relâché).
- **Par espèce** : liste count + record, tap → fiche.
- **Par mois** : histogramme Jan→Déc.
- **Par moment de la journée** : nuit / aube / matin / midi / après-midi / soir (depuis `time`).

## Store & persistance
- `AppState` : + `gear: GearItem[]`, `profile: Profile`. Hydratation charge gear + profile.
- Actions : `setGear`, `setProfile`, `updateCatch(slot, patch)` (édition), `addCatchFull(catch)` (form riche).
  `addCatch`/`removeCatch` conservés. Materiel refactoré pour lire/écrire `gear` via le store.
- Nouveaux `Screen` : `statistiques`, `prise-detail` (+ routing App.tsx).

## Phases de build
1. **Fondation** : types + db (photos/gear/profile) + store + `lib/photos.ts` + formulaire de prise riche + écran détail.
2. **Profil** : en-tête identité éditable + ligne de stats + boutons + galerie photos.
3. **Statistiques** : écran insights (par espèce / mois / moment / gardé-relâché).

## Vérification
tsc 0, build OK, zéro erreur console. Test navigateur : ajout d'une prise riche (heure/lieu/matériel/
appât/poids/photo/note), galerie profil, détail, édition/suppression, statistiques.
