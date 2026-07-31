import { DEPARTEMENTS, type DeptId } from "../data/regulation";
import type { EspeceRegCdp, RegDeptCdp } from "./coindepeche";

// Réglementation de troisième main : ce que l'app peut dire d'un département
// dont elle ne connaît pas l'arrêté.
//
// Mesuré sur les 96 fiches de coindepeche.fr relevées le 31/07/2026 :
//  · la variation réelle d'un département à l'autre ne porte que sur la truite
//    (4 combinaisons) et le saumon (5). Carnassier, ombre, anguille et écrevisse
//    y sont un jeu de valeurs unique répété partout — un socle national, pas un
//    arrêté départemental.
//  · sur les trois départements dont l'app connaît l'arrêté, la fiche est plus
//    grossière (« 6 » contre « 6 salmonidés dont 2 fario max » dans l'Indre) et
//    parfois moins protectrice (truite 23 cm contre les 25 cm que l'app retient
//    dans le 41).
//
// D'où la règle : cette source ne remplace jamais un arrêté connu. Elle sert
// uniquement les 93 départements pour lesquels l'app n'avait rien du tout.

export type OrigineReg =
  | { origine: "arrete"; dept: DeptId }
  | { origine: "tiers"; fiche: RegDeptCdp; consulteLe: string }
  | { origine: "aucune"; code: string };

/** Quelle source fait foi pour ce code département. L'arrêté d'abord — la fiche
 *  tierce n'est un progrès que là où il n'y a rien. */
export function origineReg(code: string, fiches: RegDeptCdp[], consulteLe: string): OrigineReg {
  if (code in DEPARTEMENTS) return { origine: "arrete", dept: code as DeptId };
  const fiche = fiches.find((f) => f.code === code);
  if (fiche) return { origine: "tiers", fiche, consulteLe };
  return { origine: "aucune", code };
}

/** Tailles en centimètres citées dans la note d'un bloc. */
function taillesDansNote(note: string | null): Set<string> {
  if (!note) return new Set();
  return new Set([...note.matchAll(/(\d+)\s*cm/g)].map((m) => m[1]!));
}

/**
 * Vrai quand la « Taille min. » affichée en tête du bloc n'est la maille
 * d'aucune espèce en particulier.
 *
 * Cas unique mais systématique dans les 96 fiches : le bloc « Carnassier »
 * titre 50 cm, et sa note dit brochet 60, sandre 50, black-bass 30. Un pêcheur
 * qui garde un brochet de 52 cm sur ce chiffre est en infraction dans les trois
 * départements où l'app connaît l'arrêté. Le critère est dérivé de la note (au
 * moins deux tailles distinctes) plutôt que codé sur le nom « Carnassier » :
 * si le site regroupe demain d'autres espèces, la règle suit.
 */
export function tailleDeTeteTrompeuse(e: EspeceRegCdp): boolean {
  return taillesDansNote(e.note).size >= 2;
}

export interface RegTiers {
  fiches: RegDeptCdp[];
  /** Date de consultation, à citer avec toute valeur affichée. */
  consulteLe: string;
  /** Fiches annoncées par le sitemap lors de la collecte : un écart avec
   *  fiches.length est une troncature, et doit se dire. */
  annoncees: number;
}

/** Chargement paresseux : 80 ko de fiches que l'immense majorité des sessions
 *  n'ouvrira jamais (l'app cible trois départements). Les importer en statique
 *  les mettrait dans le premier chargement de tout le monde. */
export async function chargerRegTiers(): Promise<RegTiers> {
  const m = await import("../data/reglementation-coindepeche.gen");
  return {
    fiches: m.REG_COINDEPECHE,
    consulteLe: m.CDP_CONSULTE_LE,
    annoncees: m.CDP_FICHES_ANNONCEES,
  };
}
