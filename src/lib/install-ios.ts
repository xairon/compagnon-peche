/**
 * Faut-il expliquer l'installation à la main ?
 *
 * `src/lib/pwa.ts` capte `beforeinstallprompt` et sait proposer l'installation
 * — mais cet évènement n'existe QUE sur les navigateurs Chromium. Safari ne
 * l'émet pas et n'en a pas d'équivalent : sur iPhone et iPad, l'app n'a
 * strictement aucun moyen de signaler qu'elle s'installe. Or sans installation,
 * pas de service worker durable ni d'icône — le hors-ligne au bord de l'eau,
 * qui est toute la promesse de l'app, ne tient plus.
 *
 * Pur et sans lecture d'environnement, comme le reste de src/lib : la fonction
 * reçoit ce qu'elle doit savoir, ce qui la rend testable sur les quatre
 * plateformes sans truquer `navigator`.
 */

export interface EnvInstall {
  ua: string;
  /** navigator.maxTouchPoints — le seul indice qui distingue un iPad d'un Mac. */
  maxTouchPoints: number;
  /** navigator.standalone : propre à Safari iOS, absent partout ailleurs. */
  standaloneSafari?: boolean;
  /** matchMedia("(display-mode: standalone)").matches */
  displayModeStandalone: boolean;
}

/** Lecture de l'environnement réel. Tolère l'absence de chaque API. */
export function lireEnvInstall(): EnvInstall {
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    ua: nav.userAgent ?? "",
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    standaloneSafari: nav.standalone,
    displayModeStandalone:
      typeof matchMedia === "function" ? matchMedia("(display-mode: standalone)").matches : false,
  };
}

/**
 * iOS, y compris l'iPad qui se déclare « Macintosh » depuis iPadOS 13.
 *
 * Ce déguisement est indiscernable de macOS par le seul UA ; le tactile est ce
 * qui reste. Un Mac à écran tactile n'existe pas, un iPad sans tactile non plus.
 */
function estIOS({ ua, maxTouchPoints }: EnvInstall): boolean {
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return /Macintosh/.test(ua) && maxTouchPoints > 1;
}

/** L'app tourne-t-elle déjà comme app installée ? Deux signaux, l'un ou l'autre. */
function dejaInstallee(env: EnvInstall): boolean {
  return env.standaloneSafari === true || env.displayModeStandalone;
}

/** Vrai seulement là où le prompt natif manque : iOS, hors mode installé. */
export function doitAiderInstallIOS(env: EnvInstall): boolean {
  return estIOS(env) && !dejaInstallee(env);
}
