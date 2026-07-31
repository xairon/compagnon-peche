import { distKm } from "./geo";
import type { WaterTemp } from "./hubeau";

/**
 * Lecture des analyses physico-chimiques (Hub'Eau `qualite_rivieres/analyse_pc`).
 *
 * Pourquoi ce module existe : `waterTemp` interrogeait cette API avec
 * `sort=desc&size=1` sur une boîte entière et prenait ce que l'API voulait bien
 * donner. La distance n'avait aucun mot à dire — l'API choisissait d'abord,
 * l'app filtrait après. Mesuré autour de Blois le 31/07/2026 : la première
 * réponse est LA CISSE A AVERDON à 8,9 km, alors que MEES à
 * CHAUSSEE-SAINT-VICTOR est à 3,4 km.
 *
 * Au passage, une correction : le commentaire du code affirmait que le
 * `sort=desc` de cette API « n'est pas garanti par date ». Vérification sur 10
 * puis 50 enregistrements : il l'est, l'ordre est bien décroissant par
 * `date_prelevement`. Le problème n'était pas l'ordre, c'était le `size=1`.
 */

/** Analyse individuelle rendue comparable au reste des sources d'eau. */
export type AnalysePc = WaterTemp;

interface EnveloppePc {
  count?: number;
  data?: Record<string, unknown>[];
}

/**
 * Toutes les analyses de la réponse, avec leur distance au point demandé.
 *
 * Ne trie pas, ne choisit pas : c'est `choisirStation` qui applique la règle du
 * projet (la distance décide, la fraîcheur filtre). Une analyse sans résultat
 * est écartée — l'absence de valeur n'est pas un zéro. Une analyse sans
 * coordonnées est gardée avec une distance NaN : on ne peut dire ni qu'elle est
 * proche, ni le contraire, et `choisirStation` l'écarte pour cette raison-là.
 */
export function parseAnalysePc(
  brut: EnveloppePc,
  lat: number,
  lon: number,
): AnalysePc[] {
  const out: AnalysePc[] = [];
  for (const a of brut.data ?? []) {
    if (a.resultat == null) continue;
    const la = Number(a.latitude);
    const lo = Number(a.longitude);
    out.push({
      value: Number(a.resultat),
      date: String(a.date_prelevement ?? ""),
      station: String(a.libelle_station ?? ""),
      dist: Number.isFinite(la) && Number.isFinite(lo) ? distKm(lat, lon, la, lo) : NaN,
      source: "physico",
      // analyse_pc ne publie aucun rattachement au cours d'eau : ses 67 champs
      // ont été listés le 31/07/2026, il n'y a ni libellé ni code. Vide veut
      // dire « la source ne le dit pas », jamais « autre rivière ».
      cours: "",
    });
  }
  return out;
}
