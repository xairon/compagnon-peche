import type { FeatureCollection } from "./sandre";
import { riverName } from "./sandre";
import { cleCours } from "./station";

/**
 * Sur quel cours d'eau se trouve le pêcheur, d'après la couche hydrographique
 * Sandre déjà chargée.
 *
 * C'est le chaînon qui manquait au troisième critère de choisirStation : sans
 * cours d'eau de référence, « la même rivière » n'est pas une question qu'on
 * peut poser.
 *
 * Fonction PURE : elle ne va rien chercher. Le WFS Sandre renvoie ~400 ko de
 * géométries pour trois tronçons — l'appeler depuis l'Accueil paierait ça au
 * premier rendu de chaque session. Elle est donc alimentée par les écrans qui
 * ont déjà la couche en main.
 */

/**
 * Référentiel dont relèvent les codes du WFS Sandre CoursEau1.
 *
 * Vérifié le 31/07/2026 sur la boîte de Blois : Sandre publie
 * `CdEntiteHydrographique = "----0000"` pour « la Loire », et Hub'Eau
 * `temperature/station` publie `code_cours_eau = "----0000"` avec
 * `uri_cours_eau = …/CoursEau_Carthage2017/----0000` pour la même. Le GeoJSON
 * Sandre ne porte pas d'URI ; on déclare donc ici le référentiel dont il relève,
 * sans quoi cleCours() préfixerait « ? » et les deux codes ne s'apparieraient
 * jamais.
 */
export const REFERENTIEL_SANDRE = "CoursEau_Carthage2017";

export interface CoursDuPoint {
  /** Clé comparable à Candidat.coursCode (voir station.cleCours). */
  code: string;
  /** Libellé propre, pour l'affichage. */
  nom: string;
}

/**
 * Le cours d'eau de la zone, ou null quand il y en a plusieurs.
 *
 * Un confluent n'est pas une réponse : entre la Loire et la Cisse, l'app ne
 * sait pas laquelle le pêcheur a sous les yeux, et prétendre le contraire
 * rejouerait le défaut que tout l'audit traque. Trois tronçons du même cours
 * d'eau, en revanche, ne sont pas une ambiguïté — CoursEau1 découpe un fleuve.
 */
export function coursDuPoint(fc: FeatureCollection | null | undefined): CoursDuPoint | null {
  if (!fc?.features?.length) return null;
  const parCode = new Map<string, Record<string, unknown>>();
  for (const f of fc.features) {
    const code = f.properties?.["CdEntiteHydrographique"];
    // Un tronçon sans code n'est pas un cours d'eau de plus : il est illisible,
    // et l'ignorer vaut mieux que lui fabriquer une identité.
    if (typeof code !== "string" || !code) continue;
    if (!parCode.has(code)) parCode.set(code, f.properties);
  }
  if (parCode.size !== 1) return null;
  const [code, props] = [...parCode.entries()][0]!;
  return { code: cleCours(code, `/${REFERENTIEL_SANDRE}/${code}`)!, nom: riverName(props) };
}
