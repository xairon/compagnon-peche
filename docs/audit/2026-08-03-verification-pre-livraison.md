# Vérification finale pré-livraison — 2026-08-03

Branche : `fix/audit-corrections` — copie de travail propre, HEAD `f8a652c`.
Commande : `npm run test && npm run lint && npm run build` (Node v22.23.2, npm 10.9.8).

## Résultats

| Étape | Commande | Résultat |
|---|---|---|
| Tests | `npm run test` (vitest run) | ✅ 149 fichiers, 1908 passed, 2 expected fail |
| Lint | `npm run lint` (eslint src) | ✅ 0 erreur |
| Build | `npm run build` (tsc -b && vite build) | ✅ exit 0, 9,5 s |
| PWA | vite-plugin-pwa generateSW | ✅ sw.js + workbox, 91 entrées precache (3 527,72 KiB) |

## Détail tests

- Durée : 103,7 s (setup 63,4 s, import 32,3 s).
- **2 expected fail** : `src/store-carnet.test.tsx` lignes 246 et 254, déclarés
  `it.fails` — défaut connu documenté : `addCatch` (geste unique « Ma prise »)
  n'écrit ni `time` ni `conditions`, contrairement à `CatchEditor`. Conséquences :
  les prises du geste unique n'apparaissent jamais dans Statistiques (comptage par
  moment de la journée) et restent invisibles pour `lib/analysePrises`. Non corrigé
  volontairement ici : `src/store.tsx` appartient à d'autres lots en cours.
  **Action attendue au lot suivant** : corriger `addCatch`, puis repasser les deux
  tests en `it` normal.

## Build / PWA

- `dist/` : 24 Mo, 65 assets, manifest.webmanifest + sw.js présents.
- Avertissement Rollup (non bloquant) : 2 chunks > 500 kB —
  `maplibre-*.js` 967,16 kB (gzip 251,71) et `index-*.js` 515,53 kB (gzip 140,80).
  Cohérent avec le code-split livré (tous les écrans en lazy chunks, le shell
  reste dans le chunk principal ; maplibre est la dépendance carte, incompressible
  par découpage applicatif).

## Couverture

Seuils configurés dans `vitest.config.ts` (mesurés le 03/08/2026) :
statements 69,06 % · branches 62,22 % · fonctions 60,05 % · lignes 70,60 % —
seuils posés à 67,5 / 60,5 / 58,5 / 69 (marge ~1,5 point, cf. commentaire du
fichier). Rappel : `screens/Carte.tsx` reste à 0 % sur 1 306 lignes — cible
prioritaire de tests, pas un blocage de livraison.

## Conclusion

Le lot `fix/audit-corrections` est **prêt à livrer** : tests, lint et build
passent, PWA générée. Le seul point à traiter avant la prochaine itération est
le défaut connu `addCatch` (traces dans `store-carnet.test.tsx`).
