/**
 * Le thème, et rien d'autre.
 *
 * Ce module est la SEULE source de vérité sur « quel thème est actif ». Il est
 * consommé deux fois : par React (au montage et à chaque changement de
 * préférence) et par le script inline d'index.html, qui doit poser l'attribut
 * avant le premier paint. Deux consommateurs, une implémentation — d'où un
 * module sans dépendance à React et sans effet de bord à l'import.
 *
 * `prefers-color-scheme` n'apparaît PAS dans src/styles.css : la feuille ne
 * connaît que `:root[data-theme="dark"]`. C'est ici que « auto » devient une
 * valeur concrète. L'alternative — un bloc @media plus un bloc [data-theme] —
 * obligerait à écrire la liste des jetons deux fois, puisqu'on ne peut pas
 * grouper un sélecteur sous @media avec un sélecteur hors @media.
 */

export type Theme = "auto" | "light" | "dark";
export type ThemeEffectif = "light" | "dark";

export const THEMES: Theme[] = ["auto", "light", "dark"];

export function estTheme(v: unknown): v is Theme {
  return typeof v === "string" && (THEMES as string[]).includes(v);
}

/** Couleur de la barre d'état du téléphone, par thème effectif.
 *  Elle doit suivre ce que l'app affiche EN HAUT, pas une surface quelconque :
 *  en clair c'est le bandeau sapin (la valeur historique, inchangée), en sombre
 *  c'est --backdrop. Une barre système qui jure avec le haut de l'écran se voit
 *  immédiatement sur une PWA plein écran. */
export const THEME_COLORS: Record<ThemeEffectif, string> = {
  light: "#16281E",
  dark: "#0D120F",
};

export const REQUETE_SOMBRE = "(prefers-color-scheme: dark)";

export function resoudreTheme(pref: Theme, systemeSombre: boolean): ThemeEffectif {
  if (pref === "auto") return systemeSombre ? "dark" : "light";
  return pref;
}

/** Le système est-il en sombre ? Faux si matchMedia est absent (jsdom, vieux
 *  navigateur) — le thème clair est le repli sûr, c'est celui d'origine. */
export function systemeSombre(win: Window = window): boolean {
  try {
    return win.matchMedia?.(REQUETE_SOMBRE).matches ?? false;
  } catch {
    return false;
  }
}

/** Pose l'attribut et met la barre d'état d'accord avec lui. */
export function appliquerTheme(effectif: ThemeEffectif, doc: Document = document): void {
  doc.documentElement.setAttribute("data-theme", effectif);
  // Les deux balises `media` d'index.html couvrent le mode auto avant tout
  // script ; dès qu'un thème est résolu, c'est cette balise-ci qui tranche.
  const meta = doc.querySelector('meta[name="theme-color"]:not([media])')
    ?? doc.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", THEME_COLORS[effectif]);
}
