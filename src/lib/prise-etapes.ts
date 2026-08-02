import type { Species } from "../types";
import type { DeptId } from "../data/regulation";
import type { PriseEtape } from "./nav-conventions";
import { QUOTA_CARNASSIERS } from "./helpers";
import { effectiveMaille } from "./maille";
import { effectiveQuota } from "./quota";

/** L'issue du parcours. `choix` mène à l'une ou l'autre, jamais aux deux. */
export type Issue = "kill" | "release";

/**
 * A-t-on une maille à opposer à cette espèce, ici ?
 *
 * LE CRITÈRE N'EST PAS LE CHIFFRE. `effectiveMaille` rend `cm: 0` pour le
 * saumon sous moratoire et deux esturgeons — mais avec un `label` non nul
 * (« spéciale », « Interdit »), qui porte justement la règle. Sauter sur
 * `cm === 0` seul escamoterait un moratoire, c'est-à-dire exactement ce que le
 * parcours existe pour dire. Voir lib/maille.ts, qui garde ce libellé pour
 * cette raison.
 */
function aMailleADire(sp: Species, dept: DeptId | undefined): boolean {
  const m = effectiveMaille(sp, dept);
  return m.cm > 0 || m.label !== null;
}

/**
 * A-t-on un quota à opposer à cette espèce, ici ?
 *
 * `sp.quota` ne suffit pas davantage : une truite fario porte « — » au national
 * alors que le Loir-et-Cher la plafonne à 6/jour. C'est `effectiveQuota`, qui
 * replie l'arrêté départemental, qui sait. Les trois espèces de
 * QUOTA_CARNASSIERS relèvent en plus du plafond R436-21, qui ne s'écrit dans
 * aucun champ d'espèce.
 */
function aQuotaADire(sp: Species, dept: DeptId | undefined): boolean {
  return QUOTA_CARNASSIERS.includes(sp.id) || effectiveQuota(sp, dept).text !== null;
}

/**
 * La suite d'étapes que CETTE espèce fait traverser, dans l'ordre.
 *
 * Le parcours imposait les mêmes cinq étapes à tout le monde. Pour une perche,
 * maille et quota n'ont rien à instruire et s'affichaient quand même, avec un
 * unique bouton « Continuer » — deux appuis pour ne rien apprendre.
 *
 * `statut` ouvre toujours, `kill` ou `release` ferme toujours. Entre les deux,
 * seules restent les étapes que l'app peut remplir.
 */
export function etapesPour(
  sp: Species,
  dept: DeptId | undefined,
  issue: Issue = "kill",
): PriseEtape[] {
  const etapes: PriseEtape[] = ["statut"];
  if (aMailleADire(sp, dept)) etapes.push("maille");
  if (aQuotaADire(sp, dept)) etapes.push("quota");
  etapes.push("choix", issue);
  return etapes;
}

/**
 * L'étape qui suit `courante` dans le parcours de cette espèce.
 *
 * Les transitions étaient écrites en dur — « statut » menait à « maille »,
 * « maille » à « quota » — ce qui rendait le parcours infalsifiable depuis
 * l'extérieur : sauter une étape aurait demandé de récrire chaque bouton. En la
 * dérivant, un seul endroit décide de l'ordre, et les boutons n'ont plus qu'à
 * demander « la suivante ».
 *
 * Rend `null` au bout : `kill` et `release` ferment le parcours.
 */
export function etapeSuivante(
  sp: Species,
  dept: DeptId | undefined,
  courante: PriseEtape,
  issue: Issue = "kill",
): PriseEtape | null {
  const etapes = etapesPour(sp, dept, issue);
  const i = etapes.indexOf(courante);
  // Étape hors parcours (un lien vers `maille` sur une perche, par exemple) :
  // on ne devine pas, on renvoie à la décision, qui existe pour toute espèce.
  if (i === -1) return "choix";
  return etapes[i + 1] ?? null;
}

/**
 * Ce que le parcours a passé sous silence, pour qu'il cesse de l'être.
 *
 * L'étape maille écrit « Aucune maille nationale pour cette espèce — un arrêté
 * local peut en fixer une : vérifiez ». L'app REFUSE donc d'affirmer qu'aucune
 * règle n'existe : elle ne connaît que le socle national et les arrêtés des
 * trois départements couverts. Supprimer l'étape sans rien dire ferait cette
 * affirmation à sa place, et c'est le seul risque que ce raccourci introduit.
 *
 * L'écran suivant nomme donc ce qui a été sauté. Le complémentaire exact de
 * `etapesPour` : aucune étape ne peut être à la fois traversée et déclarée
 * sautée.
 */
export function etapesSautees(sp: Species, dept: DeptId | undefined): PriseEtape[] {
  const sautees: PriseEtape[] = [];
  if (!aMailleADire(sp, dept)) sautees.push("maille");
  if (!aQuotaADire(sp, dept)) sautees.push("quota");
  return sautees;
}
