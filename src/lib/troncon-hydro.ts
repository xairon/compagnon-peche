import { boxAroundKm } from "./geo";
import { fetchT } from "./net";
import { lireJsonBorne, octetsMaxPour } from "./net-bornes";
import { coursDuPoint, SEUIL_COURS_M, type CoursDuPoint } from "./cours-du-point";
import type { FeatureCollection } from "./sandre";

/**
 * Le tronçon hydrographique sous un point — la couche Sandre la moins chère.
 *
 * POURQUOI PAS `fetchCoursEau` (lib/sandre.ts). Le WFS Sandre ne découpe pas ses
 * géométries sur la boîte demandée : la feature « la Loire » porte l'axe du
 * fleuve ENTIER, 7905 sommets, quelle que soit la taille de la boîte. Mesuré le
 * 31/07/2026 autour de Blois (47,586 / 1,336), sur une boîte de 300 m :
 *
 *   CoursEau1                       339 360 o
 *   CoursEau2..5                    4 × 71 o (vides)
 *   ────────────────────────────────────────── 5 requêtes, 339 644 o
 *   sa:TronconHydrographique          4 903 o   1 requête
 *
 * 69 fois moins, pour la même réponse : `CdCoursEau = "----0000"`, la Loire. La
 * couche des tronçons découpe, elle, sa géométrie (106 sommets ici).
 *
 * CE QU'ON PERD : cette couche ne publie AUCUN libellé. Ses quatre champs sont
 * CdTronconHydrographique, PkAvalTronconHydrographique,
 * PkAmontTronconHydrographique, CdCoursEau. Le nom du cours d'eau vient donc
 * d'ailleurs — les stations Hub'Eau le publient, elles, et l'app en interroge
 * déjà (voir hubeau.nearestQuality / nearestTemp).
 *
 * COMBIEN ÇA COÛTE QUAND MÊME : ~5 ko et une requête, à chaque point ouvert.
 * C'est pour ça que rien n'appelle ceci depuis l'Accueil, qui s'ouvre à chaque
 * session : seul le briefing, qui répond à un point que l'utilisateur a désigné.
 */

const WFS = "https://services.sandre.eaufrance.fr/geo/zonage";
const OUTPUT = "application/json; subtype=geojson";
/** Assez pour un confluent embrouillé ; 4 tronçons mesurés sur la boîte la plus
 *  chargée essayée (confluent Cisse/Loire, 1 km, 35,8 ko). */
const COUNT = 50;
/**
 * Délai propre, plus court que celui de la source « sandre ».
 *
 * net-bornes.ts accorde 25 s au Sandre, budget calculé sur ~1 Mo de couche
 * hydrographique. Ici la réponse fait 5 ko : appliquer le même délai ferait
 * attendre le briefing une demi-minute pour une requête accessoire. Les
 * températures et la qualité de l'eau attendent cette réponse — c'est elle qui
 * leur dit sur quelle rivière chercher — donc elle ne doit pas les retenir.
 * 8 s reste large pour 5 ko, y compris en 3G.
 */
const DELAI_MS = 8000;

/** Les deux chiffres du choix ci-dessus, gardés lisibles pour qu'il reste
 *  discutable au lieu d'être enfoui dans un commentaire. */
export const OCTETS_MESURES = {
  /** sa:TronconHydrographique, boîte de 300 m à Blois, 31/07/2026. */
  troncon: 4903,
  /** CoursEau1..5, même boîte, même jour. */
  coursEau1a5: 339644,
} as const;

/**
 * L'URL du WFS pour les tronçons autour d'un point.
 *
 * La boîte fait la taille du seuil de rattachement : un tronçon qui passe à
 * moins de SEUIL_COURS_M du point traverse forcément cette boîte, donc il sera
 * dans la réponse. Une boîte plus étroite écarterait sans le regarder un cours
 * d'eau que coursDuPoint aurait retenu.
 */
export function urlTronconsAutour(lat: number, lon: number): string {
  const { w, s, e, n } = boxAroundKm(lat, lon, SEUIL_COURS_M / 1000);
  // WFS 2.0 + EPSG:4326 attend l'ordre des axes lat,lon (comme lib/sandre.ts).
  const bbox = `${s.toFixed(5)},${w.toFixed(5)},${n.toFixed(5)},${e.toFixed(5)},urn:ogc:def:crs:EPSG::4326`;
  return (
    `${WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature` +
    `&OUTPUTFORMAT=${encodeURIComponent(OUTPUT)}` +
    `&TYPENAMES=${encodeURIComponent("sa:TronconHydrographique")}` +
    `&BBOX=${bbox}&COUNT=${COUNT}`
  );
}

/**
 * Le cours d'eau sous le point, ou null.
 *
 * `null` couvre trois situations que l'appelant n'a pas à distinguer, parce
 * qu'elles ont la même conséquence — le critère du cours d'eau reste en
 * sommeil, et tout le reste s'affiche : rien à portée, un confluent, ou la
 * source qui n'a pas répondu. Elle ne jette JAMAIS : ne pas savoir sur quelle
 * rivière on se tient n'est pas une panne du briefing.
 */
export async function coursSousLePoint(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<CoursDuPoint | null> {
  try {
    const r = await fetchT(urlTronconsAutour(lat, lon), {
      signal,
      source: "sandre",
      timeout: DELAI_MS,
    });
    if (!r.ok) return null;
    const fc = (await lireJsonBorne(r, octetsMaxPour("sandre"))) as FeatureCollection;
    return coursDuPoint(fc, lat, lon);
  } catch {
    return null;
  }
}
