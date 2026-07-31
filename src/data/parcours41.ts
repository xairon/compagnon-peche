/**
 * Accès à la demande au snapshot Pilote41 (parcours & réserves du Loir-et-Cher).
 *
 * `parcours41-snapshot.ts` est un littéral GeoJSON de 226 parcours + 10
 * réserves : **268,30 ko minifiés, 96,93 ko gzip** dans le chunk de son
 * appelant, mesurés le 31/07/2026 (`npm run build`, chunk `Carte` à 338,76 ko
 * / 119,32 ko gzip, retombé à 70,46 ko / 22,39 ko une fois le littéral vidé).
 * Soit 79 % du chunk de la carte — pour un calque **éteint par défaut**
 * (`layers.parcours = false` dans `Carte.tsx`). Le pêcheur qui ouvre la carte
 * télécharge et fait analyser au moteur JS 268 ko qu'il ne verra jamais s'il
 * ne touche pas la bascule.
 *
 * Hors ligne : le chunk émis par cet `import()` est un `.js` de `dist/assets/`,
 * donc pris par le `globPatterns` de workbox et précaché comme les autres
 * chunks paresseux (vérifié sur `dist/sw.js` : `Carte-*.js`, `maplibre-*.js`,
 * `Guides-*.js` y sont tous). Le calque reste donc disponible au bord de l'eau,
 * sans réseau, exactement comme aujourd'hui.
 */

type Module = { PARCOURS41_SNAPSHOT: GeoJSON.FeatureCollection };
type Chargeur = () => Promise<Module>;

const parDefaut: Chargeur = () => import("./parcours41-snapshot");

let enCours: Promise<GeoJSON.FeatureCollection> | null = null;

/**
 * Le snapshot, chargé au premier appel puis mémorisé.
 *
 * Un échec n'est PAS mémorisé : le calque se rallume d'un doigt, et une
 * promesse rejetée collée au module obligerait à relancer l'app pour revoir
 * les parcours. Le paramètre `chargeur` n'existe que pour que le test puisse
 * provoquer cet échec — l'app appelle `chargerParcours41()` sans argument.
 */
export function chargerParcours41(chargeur: Chargeur = parDefaut): Promise<GeoJSON.FeatureCollection> {
  if (!enCours) {
    const p = chargeur().then((m) => m.PARCOURS41_SNAPSHOT);
    p.catch(() => {
      if (enCours === p) enCours = null;
    });
    enCours = p;
  }
  return enCours;
}
