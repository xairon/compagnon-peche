import type { Species } from "../types";
import { season } from "./season";

export type StatutKind = "protegee" | "invasive" | "fermee" | "speciale" | "ouverte";

export interface Statut {
  kind: StatutKind;
  /** Short label for a pill or badge. */
  label: string;
  /** "bad" blocks or forbids, "warn" demands a check, "good" is a clear go. */
  cls: "bad" | "warn" | "good";
}

/**
 * The one status every surface must agree on.
 *
 * It exists because `season(sp).open` returns TRUE for the "special" regime
 * (eel, salmon, shads, lampreys): that flag answers "is there a national closed
 * season", not "may I keep this fish". Screens that read it as a green light
 * showed a green "● Ouverte" pill for the Atlantic salmon — fished under
 * moratorium on most French basins — while the decision flow correctly said
 * "vérifiez l'arrêté". Same split that once had the ruler measuring 50 cm while
 * the card announced 60.
 *
 * `invasive` reads "ne pas relâcher" and NOT "à relâcher": R432-5 forbids
 * putting those species back alive, so telling the angler to release one is the
 * exact opposite of the rule.
 */
export function speciesStatus(sp: Species, now: Date = new Date()): Statut {
  if (sp.protected) return { kind: "protegee", label: "À relâcher", cls: "bad" };
  if (sp.invasive) return { kind: "invasive", label: "Ne pas relâcher", cls: "bad" };
  if (sp.season === "special")
    return { kind: "speciale", label: "Réglementée", cls: "warn" };
  if (!season(sp, now).open) return { kind: "fermee", label: "● Fermée", cls: "bad" };
  return { kind: "ouverte", label: "● Ouverte", cls: "good" };
}

/** Whether the app may present this species as plainly fishable today — the
 *  test for "show it in the what's-biting carousel", never a keep verdict. */
export function isPlainlyOpen(sp: Species, now: Date = new Date()): boolean {
  return speciesStatus(sp, now).kind === "ouverte";
}
