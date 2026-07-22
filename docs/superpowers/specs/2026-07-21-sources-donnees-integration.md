# Intégration des sources de données — état & décisions

> Suite à la revue des sources (Hub'Eau, INPN/TaxRef, GBIF/OpenObs, FishMorph, GEOPECHE,
> cartedepeche.fr, FishFriender). Principe : n'utiliser que de la vraie donnée, sourcée.

## Triage (vérifié en direct)
| Source | Mode | Statut |
|---|---|---|
| **Hub'Eau** Poisson · Hydrométrie · Température · ONDE · Qualité | runtime (CORS OK) | ✅ intégré (5/5) |
| **GBIF** occurrences + écrevisses | runtime (CORS `*`) | ✅ intégré, testé (couche carte, clés taxo bakées) |
| **cartedepeche.fr** / **GEOPECHE** | liens sortants | ✅ intégré (Outils — pas d'API, on lie) |
| **TaxRef v18 + BDC-Statuts** (statuts Liste Rouge, protection, cd_nom) | build-time (Node) | ⚙️ script `npm run enrich` |
| **FISHMORPH** (traits morpho) | build-time (Node) | ⚙️ même script |
| **FishFriender** / scraping GEOPECHE | — | ❌ pas d'API, prises privées → écarté |

## Pourquoi TaxRef/FISHMORPH sont en build-time seulement
Testé : l'**API TaxRef** (`taxref.mnhn.fr/api`) et l'**API/CDN figshare** renvoient « Failed to fetch »
depuis un navigateur → **pas de CORS** (+ instabilité MNHN post-cyberattaque). Impossible en runtime
PWA, et impossible à peupler depuis l'environnement de dev (sans réseau). **Node ignore le CORS** →
le script d'enrichissement est la seule voie. Aucune donnée n'est inventée.

## Le pipeline `npm run enrich`
`scripts/enrich-species.mjs` (Node ≥ 18) :
1. Parse les 78 espèces (id, latin, cd_nom) depuis `species.ts` + `species-base.ts` (parser vérifié).
2. TaxRef : résout cd_nom manquants (25 curées) + nom vernaculaire officiel + statuts (Liste Rouge
   nationale UICN France, protection nationale) via `taxa/search`, `taxa/{cd}`, `taxa/{cd}/status/lines`.
3. FISHMORPH : télécharge le CSV via l'API figshare, joint par nom latin, extrait les traits morpho.
4. Écrit `src/data/species-enrichment.ts`.
Robustesse : dégrade proprement (écrit ce qu'il obtient), variantes de champs, détection de délimiteur,
log par espèce. Marqueurs `ADJUST` aux 2 endroits où un nom de champ TaxRef pourrait différer.
Licences : TaxRef/BDC-Statuts = Licence Ouverte/Etalab ; FISHMORPH = CC-BY (citer Brosse et al. 2021).

## Affichage
Fiche → section **« Statut & conservation »** (Liste Rouge + libellé FR, protection, nom officiel,
cd_nom, morpho + attribution). **Invisible tant que `species-enrichment.ts` est vide** — l'app compile
et fonctionne sans (fichier vide par défaut).

## Pour peupler (chez l'utilisateur, machine avec réseau)
```
npm run enrich   # remplit src/data/species-enrichment.ts (TaxRef + FISHMORPH)
npm run build
```
Si un statut ressort vide dans les logs : ajuster le nom de champ signalé `ADJUST` et relancer.
