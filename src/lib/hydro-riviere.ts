import { distKm, boxAroundKm } from "./geo";
import { fetchT } from "./net";
import { lireJsonBorne, octetsMaxPour } from "./net-bornes";
import { DIST_MAX_MEME_COURS } from "./station";
import { cleCours } from "./station";

/**
 * Les stations hydrométriques d'un secteur, AVEC leur cours d'eau.
 *
 * POURQUOI PAS `hubeau.nearestHydroStation()`. Elle rend une station et une
 * seule, choisie sur la distance, et ne demande à l'API ni `code_cours_eau` ni
 * `uri_cours_eau` : rien, dans ce qu'elle rend, ne dit sur quelle rivière est
 * la mesure. Impossible avec elle de tenir « vous avez choisi la Loire », ni de
 * distinguer « pas de station sur la Loire » de « pas de station du tout ».
 * Elle reste en place pour l'usage automatique ; celle-ci répond à un choix.
 *
 * MESURÉ le 01/08/2026 autour de Blois (47,586 / 1,336), boîte de 40 km :
 * 30 stations en service, 8 136 o. Les plus proches :
 *
 *    0,1 km  K447001001  La Loire à Blois                  ----0000  la Loire
 *    5,1 km  K479301001  Le Cosson à Chailles              K47-0300  le Cosson
 *    8,7 km  K467000101  Le Beuvron à Cellettes            K4--0220  le Beuvron
 *    8,7 km  K484000102  La Cisse à Coulanges              K4--0150  la Cisse
 *   15,6 km  K480001002  La Loire à Onzain - Amont         ----0000  la Loire
 *
 * Référentiel `CEA` (`uri .../CEA/----0000`), pas `CoursEau_Carthage2017` —
 * d'où les deux clés que porte une rivière choisie (voir rivieres.ts).
 */

/**
 * Rayon demandé, en kilomètres.
 *
 * La portée ÉLARGIE, pas l'ordinaire, et pour la raison que `porteePour()` a
 * dû corriger dans hubeau.ts : une station de la bonne rivière à 15,6 km serait
 * acceptée par `choisirStation` sur la portée « même cours d'eau »… mais jamais
 * téléchargée si la boîte ne fait que DIST_MAX.hydro (20 km). La borne réelle
 * reste posée par `choisirStation`, qui reçoit ensuite la liste ; demander plus
 * large ne relâche donc rien, ça évite seulement d'écarter sans regarder.
 */
export const PORTEE_HYDRO_RIVIERE_KM = DIST_MAX_MEME_COURS.hydro;

/** Ce que `choisirStation` et `surLaRiviere` ont besoin de savoir d'une
 *  station hydrométrique. Pas de `date` : le référentiel ne date pas ses
 *  stations, la fraîcheur se juge en aval sur l'observation rendue. */
export interface CandidatHydro {
  code: string;
  nom: string;
  /** Libellé du cours d'eau publié, ou "" quand la source n'en publie pas. */
  cours: string;
  /** Kilomètres depuis le point demandé. */
  dist: number;
  /** Clé de cours d'eau comparable (voir station.cleCours), ou undefined. */
  coursCode?: string;
}

const HYDRO = "https://hubeau.eaufrance.fr/api/v2/hydrometrie";

/**
 * Les stations en service autour d'un point, non filtrées et non triées.
 *
 * NE LÈVE JAMAIS : `[]` couvre indifféremment « rien à portée » et « la source
 * n'a pas répondu ». L'appelant n'a pas à distinguer les deux ici — c'est
 * l'écran qui sait qu'il est hors-ligne, et `nearestOnde` / `waterTemp` ont la
 * même convention.
 */
export async function stationsHydro(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<CandidatHydro[]> {
  const { w, s, e, n } = boxAroundKm(lat, lon, PORTEE_HYDRO_RIVIERE_KM);
  const url =
    `${HYDRO}/referentiel/stations?bbox=${w.toFixed(4)},${s.toFixed(4)},${e.toFixed(4)},${n.toFixed(4)}` +
    `&en_service=true&size=200&format=json` +
    `&fields=code_station,libelle_station,latitude_station,longitude_station` +
    `,code_cours_eau,libelle_cours_eau,uri_cours_eau`;
  try {
    const r = await fetchT(url, { signal, source: "hubeau" });
    if (!r.ok && r.status !== 206) return [];
    const j = (await lireJsonBorne(r, octetsMaxPour("hubeau"))) as {
      data?: Record<string, unknown>[];
    };
    const out: CandidatHydro[] = [];
    for (const d of j.data || []) {
      // `?? NaN` et non `Number(d.x)` seul : `Number(null)` vaut 0, donc une
      // station sans coordonnées se serait placée au large de l'Afrique — et
      // à quelques milliers de kilomètres, elle aurait simplement été écartée
      // par la distance, sans que rien ne signale qu'elle était illisible.
      const la = d.latitude_station == null ? NaN : Number(d.latitude_station);
      const lo = d.longitude_station == null ? NaN : Number(d.longitude_station);
      if (!Number.isFinite(la) || !Number.isFinite(lo)) continue;
      out.push({
        code: String(d.code_station),
        nom: String(d.libelle_station || d.libelle_cours_eau || "Station"),
        cours: String(d.libelle_cours_eau || ""),
        dist: distKm(lat, lon, la, lo),
        coursCode: cleCours(d.code_cours_eau as string, d.uri_cours_eau as string),
      });
    }
    return out;
  } catch {
    return [];
  }
}
