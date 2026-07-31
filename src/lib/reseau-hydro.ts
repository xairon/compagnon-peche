import type { FeatureCollection } from "./sandre";

/**
 * Le réseau hydrographique complet, et non le seul premier ordre.
 *
 * `fetchRivers` n'interrogeait que `CoursEau1`. Le Sandre publie `CoursEau1` à
 * `CoursEau5`, par ordre de Strahler croissant : les grands cours d'eau
 * d'abord, les ruisseaux en dernier.
 *
 * Mesuré le 31/07/2026 sur une boîte de 0,5° × 0,6° autour de Blois :
 *
 *   CoursEau1  10 tronçons   973 ko
 *   CoursEau2   1 tronçon     34 ko
 *   CoursEau3   4 tronçons    70 ko
 *   CoursEau4  25 tronçons   191 ko
 *   CoursEau5  15 tronçons    49 ko
 *   ────────────────────────────────
 *   total      55 tronçons  1,32 Mo
 *
 * La carte montrait donc 10 cours d'eau sur 55 : les fleuves, et pas les
 * ruisseaux — précisément là où on pêche la truite.
 */

export const CLASSES_HYDRO = [1, 2, 3, 4, 5] as const;
export type ClasseHydro = (typeof CLASSES_HYDRO)[number];

/**
 * Zoom minimal auquel chaque classe est demandée.
 *
 * Ce n'est pas une économie de confort : CoursEau1 pèse à lui seul 973 ko sur
 * la boîte mesurée, et les cinq couches 1,32 Mo, retéléchargés à chaque
 * déplacement de la carte. Un ruisseau d'ordre 5 est de toute façon illisible
 * au zoom régional — on le demande quand on le regarde.
 *
 * Les seuils sont des choix, pas des mesures. Ils sont croissants avec l'ordre,
 * et un test l'impose.
 */
export const CLASSE_MINZOOM: Record<ClasseHydro, number> = {
  1: 9, // HYDRO_MINZOOM : les grands cours d'eau dès que la couche s'allume
  2: 10,
  3: 10,
  4: 11,
  5: 11,
};

export interface ReseauHydro {
  fc: FeatureCollection;
  /** Somme des compteurs, ou undefined si UNE SEULE couche s'est tue —
   *  additionner en comptant l'absente pour zéro annoncerait un total plus
   *  petit que la réalité, et une carte amputée passerait pour complète. */
  numberMatched: number | undefined;
}

/** Réunit les couches en un seul réseau. Une couche absente (échec réseau,
 *  classe non demandée à ce zoom) est ignorée, pas fatale : perdre les
 *  ruisseaux ne doit pas faire perdre le fleuve. */
export function fusionnerCoursEau(
  couches: (FeatureCollection | null | undefined)[],
): ReseauHydro {
  const features: FeatureCollection["features"] = [];
  let total: number | undefined = 0;
  for (const c of couches) {
    if (!c) continue;
    features.push(...(c.features ?? []));
    if (typeof c.numberMatched === "number") {
      if (total !== undefined) total += c.numberMatched;
    } else {
      total = undefined;
    }
  }
  return { fc: { type: "FeatureCollection", features }, numberMatched: total };
}

/** Les classes qu'on demande à ce niveau de zoom. */
export function classesAuZoom(zoom: number): ClasseHydro[] {
  return CLASSES_HYDRO.filter((c) => zoom >= CLASSE_MINZOOM[c]);
}

/**
 * Ce qu'il faut dire quand une partie du réseau n'a pas été demandée.
 *
 * Retirer délibérément 45 tronçons sur 55 et ne rien dire, c'est laisser lire
 * une carte amputée comme une carte complète — le même défaut que les
 * troncatures WFS, sauf qu'ici c'est l'app qui coupe. La phrase distingue les
 * deux : rien ne manque à la source, c'est l'échelle qui les masque.
 */
export function texteClassesMasquees(zoom: number): string | null {
  const manquantes = CLASSES_HYDRO.length - classesAuZoom(zoom).length;
  if (manquantes === 0) return null;
  return "Les petits cours d'eau ne sont pas chargés à cette échelle — zoomez pour les afficher.";
}
