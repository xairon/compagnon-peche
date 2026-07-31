import { buildLabel } from "./build";
import { REG_YEAR, VERIFIE_LE } from "../data/version";

// A correction channel.
//
// The app's argument is that nothing in it is invented — every size, quota and
// health warning is sourced. An app that cannot be corrected cannot hold that
// claim: a doubt is already written into the code (regulation.ts:127, trout at
// 23 or 25 cm in the Loir-et-Cher) and the only people able to settle it are
// anglers standing in front of the arrêté.
//
// The channel is the project's public issue tracker rather than an e-mail
// address: publishing a personal address in a client-side app hands it to every
// scraper that loads the page, and the maintainer can swap CONTACT for a
// `mailto:` if they prefer.

/** Public issue tracker of the project. */
export const CONTACT = "https://github.com/xairon/compagnon-peche/issues/new";

export interface Contexte {
  /** Screen the user was on. */
  ecran?: string;
  /** Active département — most reports are about its arrêté. */
  dept?: string;
  /** Species being displayed, when there is one. */
  espece?: string;
  /** Free text, or a caught error's message. */
  detail?: string;
}

/**
 * The technical block that goes with a report.
 *
 * Deliberately narrow: build, regulation vintage, screen, department, species.
 * It is pasted into a PUBLIC tracker, so it must never carry position, catches,
 * photos or profile — the app's privacy promise does not get an exception for
 * debugging.
 */
export function rapportDiagnostic(c: Contexte): string {
  const lignes = [
    `Version : ${buildLabel()}`,
    `Réglementation embarquée : saison ${REG_YEAR} (vérifiée le ${VERIFIE_LE})`,
    c.ecran && `Écran : ${c.ecran}`,
    c.dept && `Département : ${c.dept}`,
    c.espece && `Espèce : ${c.espece}`,
    c.detail && `Détail : ${c.detail}`,
  ];
  return lignes.filter(Boolean).join("\n");
}

/** Pre-filled report link, so the user only has to describe what they saw. */
export function lienSignalement(c: Contexte): string {
  const corps = [
    "<!-- Décrivez ce que vous avez constaté, et ce que vous attendiez. -->",
    "",
    "",
    "---",
    rapportDiagnostic(c),
  ].join("\n");
  const params = new URLSearchParams({
    title: c.ecran ? `Signalement — ${c.ecran}` : "Signalement",
    body: corps,
  });
  return `${CONTACT}?${params.toString()}`;
}
