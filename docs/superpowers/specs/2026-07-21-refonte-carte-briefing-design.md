# Refonte de la carte — outil de décision « briefing par point d'eau »

> Issu d'un brainstorm avec 4 agents de recherche (sources de données vérifiées sur les vrais
> endpoints, 2026-07-21). Contrainte fondatrice : **n'utiliser que de la vraie donnée** — aucune
> estimation inventée. PWA 100 % statique, offline-first, sans backend ni clé d'API.

## Vision
La carte cesse d'être un simple visualiseur de calques : elle devient un **outil de décision**.
On tape un cours d'eau, un plan d'eau ou un spot perso → un panneau **Briefing** remonte tout ce qui
compte pour décider d'une sortie, chaque bloc se chargeant indépendamment (rien ne bloque l'affichage).

## Sources de données (toutes vérifiées : gratuites, sans clé, CORS OK en PWA statique)
| Source | Endpoint | Usage |
|---|---|---|
| Hub'Eau Hydrométrie | `api/v2/hydrometrie` (`referentiel/stations`, `observations_tr`) | Niveau (H, mm) + débit (Q, L/s) temps réel (MAJ 5 min), tendance calculée |
| Hub'Eau Température | `api/v1/temperature` (`station`, `chronique`) | Température de l'eau — **couverture clairsemée (~50 stations actives)** |
| Hub'Eau ONDE | `api/v1/ecoulement` (`stations`, `observations`) | Assecs (campagnes mensuelles l'été) — usage léger |
| Open-Meteo | `api.open-meteo.com/v1/forecast` | Météo au point : vent, pluie, pression + **tendance calculée**, nuages, 7 j |
| Astro (local) | calcul JS embarqué (algos SunCalc, MIT) | Soleil/lune, phase, périodes solunaires — **offline** |
| IGN Géoplateforme | `data.geopf.fr/wmts` | Fonds raster : Ortho (satellite), Plan IGN |
| Sandre ROE | `services.sandre.eaufrance.fr/geo/obs` (`sa:ObstEcoul`) | Barrages/seuils/écluses + passe à poissons |
| Sandre (existant) | `.../geo/zonage` (CoursEau1, PlanEau) | Hydrographie (déjà en place, CORS déjà prouvé) |
| OSM Overpass | `overpass-api.de/api/interpreter` | Accès : parking, cale de mise à l'eau, ponton |

Détails critiques vérifiés : hydrométrie filtre station = `code_entite` (pas `code_station`), tri
desc = défaut ; ONDE = chemin `/ecoulement/` (pas `/onde/`) ; ROE exige
`OUTPUTFORMAT=application/json; subtype=geojson` + BBOX ordre lat,lon (EPSG:4326).

### Écarté (assumé)
Réglementation (catégorie/réserves/parcours) : **pas de donnée nationale**, éparse par département,
sans API/CORS → hors périmètre. Météo-France direct (clé → backend). VigiCrues (CORS non garanti).
Bathymétrie eau douce (rien d'ouvert).

## Le panneau Briefing (héros)
Déclenché au tap sur cours d'eau / plan d'eau / spot. Sections indépendantes, chacune avec état
*chargement / donnée / indisponible*, dernier résultat mis en cache (consultable hors-ligne) :

1. **💧 Eau** — station Hub'Eau la plus proche : niveau + débit + **tendance** (↗/↘/→ sur ~3 h).
   Température si station active proche, sinon « pas de capteur à proximité ».
2. **🌤️ Météo** (Open-Meteo au point) — maintenant + prochaines heures : vent (force/direction
   boussole), pluie, **pression + tendance**, nuages ; mini-prévision 7 j.
3. **🌙 Soleil & lune** (local, offline) — lever/coucher soleil & lune, phase, périodes solunaires
   **étiquetées « indicatif, non scientifique »**.
4. **🚧 Obstacles proches** (ROE, rayon ~5 km) — barrage/seuil + info passe à poissons.
5. **🅿️ Accès proches** (OSM, rayon ~5 km) — parking / cale / ponton le plus proche.

## Calques & fond (secondaire)
- **Bascule de fond** : Satellite (IGN ortho) · Plan IGN · Carto (défaut actuel).
- **Interrupteurs** : Obstacles ROE · Accès · Stations Hub'Eau · Mes spots.
- Spots perso, recherche de lieu, géoloc : conservés.

## Architecture (découpage du Carte.tsx devenu trop gros)
- `lib/geo.ts` — haversine `distKm`, formatage.
- `lib/hubeau.ts` (étendu) — `nearestHydroStation`, `latestHydro`+`hydroTrend`, `nearestTempStation`+`latestTemp` ; existant (poisson) conservé.
- `lib/meteo.ts` — `fetchMeteo` (Open-Meteo) + tendance de pression + boussole + libellés weather-code.
- `lib/astro.ts` — soleil/lune/solunaire **sans dépendance** (algos embarqués).
- `lib/sandre.ts` (étendu) — `fetchObstacles` (ROE), wfs paramétrable par base.
- `lib/overpass.ts` — `fetchAccess` (POI OSM) + `nearestAccess`.
- `lib/basemaps.ts` — sources raster IGN WMTS + Carto.
- `components/Briefing.tsx` — le panneau (fetch parallèles, sections indépendantes, cache mémoire).
- `components/MapControls.tsx` — bascule fond + interrupteurs de calques.
- `screens/Carte.tsx` — allégé : orchestre carte + briefing + spots.

## Limites assumées dans l'UI
Température clairsemée → message clair. Solunaire → « indicatif ». ONDE → « dernière campagne du … ».
Pas de réglementation. Hors-ligne → astro OK, le reste montre le dernier cache + invite à se reconnecter.

## Vérification — ✅ FAIT (2026-07-21)
tsc 0, build OK, zéro erreur console. Testé en navigateur sur « La Loire à Blois » :
- **Eau** : station La Loire à Blois (724 m, relevé il y a 20 min) — niveau, débit 63 m³/s ↗, temp. 22,6 °C.
- **Météo** (Open-Meteo) : 19 °C, vent 16 km/h NE, pression 1011 hPa → +0,9/3h, prévi 7 j.
- **Soleil & lune** (local) : lever 06:19 / coucher 21:44, lune 49 % premier quartier, solunaire « indicatif ».
- **Obstacles ROE** : Barrage de Blois, Les Ponts St Michel (passe à poissons) — WFS Sandre en direct.
- **Accès OSM** : parking 93 m, mise à l'eau 920 m, ponton 2,2 km — Overpass en direct.
- **Fonds** : bascule Carte / Satellite IGN / Plan IGN OK (overlays ré-appliqués). Calques obstacles/accès OK.

### Intégration Hub'Eau complète — ✅ FAIT (5/5 APIs, 2026-07-21)
Endpoints/champs re-vérifiés en direct avant implémentation. Les 5 APIs Hub'Eau sont branchées :
- **Poisson** (`etat_piscicole`) — carte : stations + espèces inventoriées (note « effectifs cumulés »).
- **Hydrométrie** (`v2/hydrometrie`) — briefing Eau : niveau (mm→m) + débit (L/s→m³/s) + tendance 3 h.
- **Température** (`v1/temperature`) — briefing Eau ; heure = **Europe/Paris** (parse local, jamais `Z`).
- **Écoulement/ONDE** (`v1/ecoulement`) — briefing « 🌊 Écoulement » : assec / écoulement visible (codes
  1/1a/2/3/4), station + distance + date de campagne (« pas temps réel »). Vérifié : « En eau — LA CISSE
  A AVERDON · 26 juin 2026 ».
- **Qualité** (`v2/qualite_rivieres`) — briefing « 🧪 Qualité de l'eau » : O₂ dissous (1311), saturation
  (1312), pH (1302) de la dernière analyse, **datée** « analyse ponctuelle du … » + marqueur « donnée
  ancienne » si > 18 mois. Vérifié : « O₂ 10,5 mg/L · 93 % · pH 8,0 · LOIRE à BLOIS · 5 déc. 2006 ».
Défauts corrigés : `conv` redondant nettoyé ; fuseau température documenté (local) ; wording poisson clarifié.
