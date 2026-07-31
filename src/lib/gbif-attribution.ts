/**
 * Attribution des occurrences GBIF — par enregistrement, comme GBIF l'exige.
 *
 * Chaque occurrence porte la licence du jeu de données qui la publie, et ces
 * licences ne sont pas les mêmes. Mesuré le 31/07/2026 autour de Blois : sur
 * 300 occurrences de nos taxons, 6 jeux de données distincts, toutes en
 * CC BY 4.0 ; mais la même zone sans filtre de taxon ramène du CC BY-NC 4.0.
 * Un usage permis sous BY ne l'est pas forcément sous BY-NC.
 *
 * `gbif.ts` affirmait en commentaire « attribution shown on the map » et ne
 * lisait même pas le champ `license`.
 */

export interface OccurrenceAttribuee {
  key: number;
  sci: string;
  lat: number;
  lon: number;
  date: string;
  taxonKey?: number;
  speciesKey?: number;
  /** URL de licence telle que GBIF la sert. Jamais réécrite. */
  licence: string;
  /** Clé du jeu de données. Sans elle, l'attribution ne désigne personne. */
  dataset: string;
  /** Détenteur des droits quand le jeu de données le publie ; souvent absent
   *  (0 sur 300 dans l'échantillon mesuré). "" = non publié, pas « personne ». */
  detenteur: string;
}

export interface ResultatGbif {
  occurrences: OccurrenceAttribuee[];
  /** Total annoncé par GBIF pour la requête, ou null s'il ne le dit pas. */
  total: number | null;
  /** true / false / null — `endOfRecords` absent n'est pas « oui ». */
  complet: boolean | null;
}

interface EnveloppeGbif {
  results?: Record<string, unknown>[];
  count?: number;
  endOfRecords?: boolean;
}

/** Accepte `unknown` : la lecture bornée (net-bornes) rend du JSON non typé,
 *  et c'est ici qu'on décide ce qu'on en croit — un champ manquant devient
 *  null ou undefined, jamais une valeur inventée. */
export function parseOccurrences(source: unknown): ResultatGbif {
  const brut = (source ?? {}) as EnveloppeGbif;
  const occurrences: OccurrenceAttribuee[] = [];
  for (const o of brut.results ?? []) {
    const la = o.decimalLatitude;
    const lo = o.decimalLongitude;
    if (typeof la !== "number" || typeof lo !== "number") continue;
    occurrences.push({
      key: Number(o.key),
      sci: String(o.species ?? o.scientificName ?? ""),
      lat: la,
      lon: lo,
      date: String(o.eventDate ?? ""),
      taxonKey: typeof o.taxonKey === "number" ? o.taxonKey : undefined,
      speciesKey: typeof o.speciesKey === "number" ? o.speciesKey : undefined,
      licence: String(o.license ?? ""),
      dataset: String(o.datasetKey ?? ""),
      detenteur: String(o.rightsHolder ?? ""),
    });
  }
  return {
    occurrences,
    total: typeof brut.count === "number" ? brut.count : null,
    complet: typeof brut.endOfRecords === "boolean" ? brut.endOfRecords : null,
  };
}

/**
 * Nom lisible d'une licence Creative Commons à partir de son URL.
 *
 * Rend null plutôt que de deviner, même règle que `licenceUrl` : nommer de
 * travers la licence d'un tiers énonce des conditions d'usage qu'il n'a pas
 * données, ce qui est pire que ne rien nommer.
 */
export function nomLicenceCC(url: string): string | null {
  const u = url.trim();
  if (!u) return null;
  if (/creativecommons\.org\/publicdomain\/zero\/(\d\.\d)/i.test(u)) {
    return `CC0 ${/zero\/(\d\.\d)/i.exec(u)![1]}`;
  }
  const m = /creativecommons\.org\/licenses\/([a-z-]+)\/(\d\.\d)/i.exec(u);
  if (!m) return null;
  const type = m[1]!.toUpperCase();
  // Uniquement les combinaisons que GBIF publie réellement.
  if (!/^(BY|BY-SA|BY-NC|BY-NC-SA|BY-ND|BY-NC-ND)$/.test(type)) return null;
  return `CC ${type} ${m[2]}`;
}
