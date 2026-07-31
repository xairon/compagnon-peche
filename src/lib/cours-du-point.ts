import type { FeatureCollection } from "./sandre";
import { riverName } from "./sandre";
import { distKmPolyligne } from "./geo";
import { cleCours } from "./station";

/**
 * Sur quel cours d'eau se trouve le pêcheur, d'après une couche hydrographique
 * Sandre.
 *
 * C'est le chaînon qui manquait au troisième critère de choisirStation : sans
 * cours d'eau de référence, « la même rivière » n'est pas une question qu'on
 * peut poser.
 *
 * Fonction PURE : elle ne va rien chercher. Voir lib/troncon-hydro.ts pour
 * l'appel, et pour ce qu'il coûte.
 */

/**
 * Référentiel dont relèvent les codes du WFS Sandre.
 *
 * Vérifié le 31/07/2026 sur la boîte de Blois : Sandre publie `----0000` pour
 * « la Loire » (CdEntiteHydrographique sur CoursEau1..5, CdCoursEau sur
 * sa:TronconHydrographique), et Hub'Eau `temperature/station` comme
 * `qualite_rivieres/station_pc` publient `code_cours_eau = "----0000"` avec
 * `uri_cours_eau = …/CoursEau_Carthage2017/----0000` pour la même. Le GeoJSON
 * Sandre ne porte pas d'URI ; on déclare donc ici le référentiel dont il relève,
 * sans quoi cleCours() préfixerait « ? » et les deux codes ne s'apparieraient
 * jamais.
 */
export const REFERENTIEL_SANDRE = "CoursEau_Carthage2017";

/**
 * À quelle distance un tronçon compte comme « le cours d'eau d'ici », en mètres.
 *
 * C'EST UN CHOIX, PAS UNE MESURE. Ce qui est mesuré, c'est ce qu'il doit
 * absorber, le 31/07/2026 sur la réponse réelle du Sandre à Blois :
 *   · le Sandre publie un AXE, pas une berge. Le point 47,586 / 1,336, posé sur
 *     la rive de la Loire, est à 161 m de l'axe — la Loire fait là ~250 m de
 *     large. Un seuil de 200 m aurait écarté la bonne rivière.
 *   · les deux autres cours d'eau de la même boîte sont à 1051 m et 1302 m.
 *     300 m les écarte avec trois fois la marge.
 * S'y ajoute, non mesurée, l'erreur du GPS en fond de vallée, et celle d'un
 * point désigné au doigt sur une carte.
 *
 * Trop large, le seuil fabrique des confluents partout et la fonction ne répond
 * plus rien ; trop étroit, elle rate le fleuve depuis sa berge. 300 m est le
 * compromis retenu, et il se change au cas par cas (4ᵉ paramètre).
 */
export const SEUIL_COURS_M = 300;

export interface CoursDuPoint {
  /** Clé comparable à Candidat.coursCode (voir station.cleCours). */
  code: string;
  /** Libellé propre, ou "" quand la couche n'en publie AUCUN — pas un nom
   *  forgé, qui se lirait comme le nom réel du cours d'eau. */
  nom: string;
}

/**
 * Le code du cours d'eau porté par un tronçon, selon la couche d'où il vient.
 *
 * CoursEau1..5 le nomment `CdEntiteHydrographique`, sa:TronconHydrographique
 * `CdCoursEau` — vérifié le 31/07/2026 sur les deux réponses réelles. La même
 * valeur `----0000` sort des deux pour la Loire.
 */
function codeCours(props: Record<string, unknown> | undefined): string | null {
  for (const champ of ["CdEntiteHydrographique", "CdCoursEau"]) {
    const v = props?.[champ];
    if (typeof v === "string" && v) return v;
  }
  return null;
}

/**
 * Le cours d'eau sous les pieds du pêcheur, ou null.
 *
 * Ne retient que les tronçons qui passent à moins de `seuilM` mètres du point.
 * La règle d'avant — « la zone entière ne doit contenir qu'un cours d'eau » —
 * était inapplicable : sur la boîte réelle de 1 km autour de Blois il y en a
 * trois, donc la réponse était toujours « ambigu », donc le critère du cours
 * d'eau n'était jamais réveillé.
 *
 * Un confluent reste sans réponse : quand deux cours d'eau distincts sont à
 * portée, l'app ne sait pas lequel le pêcheur a sous les yeux, et prétendre le
 * contraire rejouerait le défaut que tout l'audit traque. Plusieurs tronçons du
 * même cours d'eau, en revanche, ne sont pas une ambiguïté — les deux couches
 * découpent un fleuve.
 */
export function coursDuPoint(
  fc: FeatureCollection | null | undefined,
  lat: number,
  lon: number,
  seuilM: number = SEUIL_COURS_M,
): CoursDuPoint | null {
  if (!fc?.features?.length) return null;
  const seuilKm = seuilM / 1000;
  const parCode = new Map<string, Record<string, unknown>>();
  for (const f of fc.features) {
    const code = codeCours(f.properties);
    // Un tronçon sans code n'est pas un cours d'eau de plus : il est illisible,
    // et l'ignorer vaut mieux que lui fabriquer une identité.
    if (!code) continue;
    const d = distKmPolyligne(lat, lon, f.geometry);
    // null = géométrie illisible. Ce n'est ni « à portée » (ça fabriquerait un
    // confluent) ni « loin » (ça ferait dire à la source qu'elle a répondu).
    if (d === null || d > seuilKm) continue;
    if (!parCode.has(code)) parCode.set(code, f.properties ?? {});
  }
  if (parCode.size !== 1) return null;
  const [code, props] = [...parCode.entries()][0]!;
  return {
    code: cleCours(code, `/${REFERENTIEL_SANDRE}/${code}`)!,
    // riverName() rend « Cours d'eau » sur un libellé vide, ce qui convient à
    // une carte mais pas ici : une couche qui ne publie aucun libellé n'a rien
    // dit, et l'écrire comme un nom serait l'inventer.
    nom: props["NomEntiteHydrographique"] ? riverName(props) : "",
  };
}
