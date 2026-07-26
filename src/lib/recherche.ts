import type { Species } from "../types";
import { norm } from "./helpers";

/**
 * Variety and vernacular names an angler is likely to type, mapped to the
 * species id they belong to.
 *
 * Carp scale varieties are the reason this exists: miroir, cuir and royale are
 * not species but scale patterns of *Cyprinus carpio*, so TAXREF — and the app,
 * correctly — lists only "carpe commune". An angler searching "carpe miroir"
 * found nothing at all. Same for the regional names people actually use.
 *
 * These are search aliases, never a claim that they are distinct species: the
 * fiche says so explicitly (see speciesAliases).
 */
const ALIASES: Record<string, string[]> = {
  // Variétés d'écailles de la carpe commune — même espèce, Cyprinus carpio.
  // « koi » sans tréma est inutile : `norm` retire les accents avant de comparer.
  carpe: ["carpe miroir", "miroir", "carpe cuir", "cuir", "carpe royale", "royale", "koï", "carpe koï"],
  // Noms populaires et régionaux courants.
  gardon: ["gardèche", "rousse", "vengeron"],
  chevesne: ["chevaine", "cabot", "meunier"],
  brochet: ["bec de canard"],
  "perche-soleil": ["calicoba", "perche arc-en-ciel"],
  "poisson-chat": ["barbotte"],
  ablette: ["able"],
  vandoise: ["dard", "seuffe"],
  hotu: ["nase"],
  "truite-arc-en-ciel": ["arc en ciel"],
  silure: ["silure glane", "poisson-chat géant"],
  anguille: ["pibale", "civelle"],
  tanche: ["tanche verte"],
  "black-bass": ["achigan", "perche truitée"],

  // ── Espèces « base » ────────────────────────────────────────────────────
  // Les alias ci-dessus ne couvraient que les 25 fiches curatées. Or c'est
  // souvent une espèce « base » qu'on cherche sous un autre nom que le sien :
  // personne au bord du Léman ne dit « corégone lavaret », on dit « féra ».
  //
  // Un nom n'est retenu que s'il est établi et non ambigu. Deux exclusions
  // volontaires, pour la même raison :
  //   · « loche de rivière » comme synonyme de la loche franche — c'est le nom
  //     officiel d'une AUTRE espèce, protégée : l'alias enverrait le pêcheur
  //     sur la mauvaise fiche, exactement là où l'erreur coûte le plus cher ;
  //   · « sofie »/« souffie », que la littérature attribue tantôt au toxostome
  //     tantôt au blageon — le toxostome le porte déjà dans son nom, on ne
  //     rajoute pas de flou par-dessus.
  // `norm` retire les accents : « féra » couvre déjà « fera », inutile de doubler.
  //
  // PAS « bondelle » ni « gravenche » : ce ne sont pas des synonymes du lavaret
  // mais les noms d'AUTRES corégones — Coregonus oxyrinchus pour la bondelle,
  // C. hiemalis pour la gravenche, éteint. Les mettre ici ferait dire à la
  // fiche « même espèce » d'un taxon distinct, la faute même qu'on évite pour
  // « loche de rivière ». « Féra » est gardé : c'est ainsi qu'on nomme
  // aujourd'hui le corégone pêché du Léman, même si le C. fera d'origine a
  // disparu.
  "coregone-lavaret": ["féra", "lavaret"],
  cristivomer: ["touladi", "omble du Canada", "truite de lac américaine"],
  huchon: ["saumon du Danube"],
  "omble-chevalier": ["omble", "salvelin"],
  "saumon-atlantique": ["saumon"],
  "brochet-aquitain": ["brochet du Sud-Ouest"],
  "black-bass-petite-bouche": ["achigan à petite bouche", "smallmouth"],
  // Pas « loche » seul : le catalogue compte trois vraies loches, dont deux
  // protégées — la requête doit rester sur elles.
  "lote-de-riviere": ["lotte de rivière", "lotte d'eau douce"],
  "loche-franche": ["dormille"],
  "mulet-cabot": ["muge", "mulet à grosse tête"],
  flet: ["flondre", "picaud"],
  "grande-alose": ["alose vraie", "alose commune"],
  "lamproie-marine": ["lamproie de mer"],
  vairon: ["véron"],
  toxostome: ["sofie"],
  vimbe: ["vimba"],
  "amour-blanc": ["carpe amour", "carpe herbivore", "carpe chinoise"],
  "poisson-rouge": ["carassin doré", "carpe dorée"],
  "carassin-argente": ["carassin de Prusse"],
  gambusie: ["poisson-moustique"],
  pseudorasbora: ["faux goujon", "goujon asiatique"],
  epinoche: ["épinoche à trois épines"],
};

/** Species ids carrying aliases — exposed so a test can prove none is a typo
 *  (an alias pointing at a non-existent id would silently match nothing). */
export const ALIASES_IDS: Record<string, true> = Object.fromEntries(
  Object.keys(ALIASES).map((k) => [k, true as const]),
);

/** Every variety / vernacular name known for a species — the search set. */
export function speciesAliases(id: string): string[] {
  return ALIASES[id] ?? [];
}

/**
 * The same names, trimmed for display on the fiche.
 *
 * The search set carries short forms on purpose — someone types "miroir" alone,
 * and it must hit. Printing them all gives "carpe miroir, miroir, carpe cuir,
 * cuir…", which reads like a stutter. So any name contained in a longer one is
 * dropped: "miroir" goes, "carpe miroir" stays. Names that stand on their own
 * — féra, lavaret, bondelle — are all kept.
 *
 * Nothing is capped: the fiche shows every name it knows, or the list would
 * quietly claim to be complete while hiding some.
 */
export function speciesAliasLabels(id: string): string[] {
  const all = speciesAliases(id);
  return all.filter((a) => {
    const n = norm(a);
    return !all.some((other) => other !== a && norm(other).includes(n));
  });
}

/**
 * Whether a species answers a free-text query — by name, latin name, or any of
 * the variety and vernacular names above. An empty query matches everything.
 */
export function matchSpecies(sp: Species, query: string): boolean {
  const q = norm(query);
  if (!q) return true;
  if (norm(sp.name).includes(q) || norm(sp.latin).includes(q)) return true;
  return speciesAliases(sp.id).some((a) => norm(a).includes(q));
}
