/**
 * Le sort d'une mise à jour que l'utilisateur n'applique pas.
 *
 * `registerType: "prompt"` (vite.config.ts) confie la décision à
 * l'utilisateur : c'est le bon choix — recharger de force sous les doigts de
 * quelqu'un qui remplit une fiche de prise lui ferait perdre sa saisie, le
 * brouillon n'étant pas persisté. Mais la mise en œuvre laissait deux trous.
 *
 * 1. **Aucun report possible.** Le bandeau n'offre que « Mettre à jour ». Qui
 *    ne veut pas maintenant n'a d'autre choix que de le laisser couvrir
 *    l'écran, au bord de l'eau, jusqu'à ce qu'il cède.
 * 2. **Aucune borne, et aucune mémoire.** L'état ne vivait qu'en mémoire : un
 *    rechargement le remettait à zéro. Rien ne savait qu'une mise à jour
 *    attendait depuis huit jours. Une installation qui décline en boucle ne
 *    reçoit jamais les correctifs réglementaires — et cette app dit des
 *    tailles légales, des périodes d'ouverture et des espèces qu'on n'a pas le
 *    droit de remettre à l'eau vivantes.
 *
 * Ce que ce module pose : un report **borné**. Trois fois vingt-quatre heures,
 * puis le bandeau reste. Il ne s'applique jamais tout seul — la borne pousse,
 * elle ne décide pas à la place. Et l'attente est comptée depuis la PREMIÈRE
 * apparition, pour qu'un écran puisse dire « depuis huit jours » et que ce soit
 * vrai.
 *
 * Tout est en fonctions pures + un dossier en localStorage, pour que la
 * décision soit testable sans service worker.
 */

export const JOUR_MS = 24 * 60 * 60 * 1000;

/** Durée d'un report. Une journée : assez pour finir une sortie de pêche, assez
 *  peu pour qu'un correctif ne dorme pas une semaine. */
export const REPORT_MS = JOUR_MS;

/** Nombre de reports accordés pour une même mise à jour. Au-delà, le bandeau
 *  reste : trois jours d'ajournement, c'est le maximum qu'un texte
 *  réglementaire faux puisse attendre sans que ce soit un problème. */
export const LIMITE_REPORTS = 3;

/** Écart minimum entre deux interrogations du serveur. Sans
 *  `registration.update()`, une PWA Android qu'on ne ferme jamais n'apprend
 *  l'existence d'une nouvelle version qu'au prochain démarrage à froid,
 *  c'est-à-dire peut-être jamais. Avec, mais sans écart minimum, chaque retour
 *  d'écran taperait sur le serveur. */
export const ECART_MIN_VERIFICATION_MS = 30 * 60 * 1000;

const CLE = "maj:dossier";

export interface DossierMaj {
  /** Première fois que cette mise à jour a été vue (ms epoch). */
  depuis: number;
  /** Reports déjà accordés. */
  reports: number;
  /** Masquée jusqu'à cette date (ms epoch) ; 0 si visible. */
  jusqua: number;
  /** Build qui tournait quand elle a été vue — sert à repérer un dossier périmé. */
  build: string;
}

function ecrire(d: DossierMaj | null): void {
  try {
    if (d) localStorage.setItem(CLE, JSON.stringify(d));
    else localStorage.removeItem(CLE);
  } catch {
    // Navigation privée, WebView ancienne : sans stockage, le report ne survit
    // pas au rechargement. C'est une dégradation, pas une panne — le bandeau
    // réapparaîtra, ce qui penche du bon côté (vers la mise à jour).
  }
}

/**
 * Le dossier en cours, ou `null`. Passer le build qui tourne fait oublier un
 * dossier devenu caduc : la mise à jour a été appliquée, ou l'app réinstallée,
 * et reprocher à l'utilisateur des reports qu'il a soldés n'aurait pas de sens.
 */
export function lireDossier(build?: string): DossierMaj | null {
  let brut: string | null = null;
  try {
    brut = localStorage.getItem(CLE);
  } catch {
    return null;
  }
  if (!brut) return null;
  let d: unknown;
  try {
    d = JSON.parse(brut);
  } catch {
    return null;
  }
  if (!d || typeof d !== "object") return null;
  const o = d as Partial<DossierMaj>;
  if (typeof o.depuis !== "number" || typeof o.build !== "string") return null;
  if (build !== undefined && o.build !== build) {
    ecrire(null);
    return null;
  }
  return {
    depuis: o.depuis,
    reports: typeof o.reports === "number" ? o.reports : 0,
    jusqua: typeof o.jusqua === "number" ? o.jusqua : 0,
    build: o.build,
  };
}

/** Une mise à jour attend. Idempotent : rappelé à chaque chargement de page pour
 *  le même worker en attente, il ne redémarre pas le compte. */
export function signalerMaj(maintenant: number, build: string): DossierMaj {
  const existant = lireDossier(build);
  if (existant) return existant;
  const d: DossierMaj = { depuis: maintenant, reports: 0, jusqua: 0, build };
  ecrire(d);
  return d;
}

/** La mise à jour a été appliquée : le dossier n'a plus d'objet. */
export function oublierMaj(): void {
  ecrire(null);
}

/** Reste-t-il un report à accorder ? */
export function reportPossible(d: DossierMaj | null): boolean {
  return !!d && d.reports < LIMITE_REPORTS;
}

/** Accorde un report, ou `null` s'il n'y a rien à reporter / plus de report à
 *  donner. Le refus n'est pas un détail d'implémentation : c'est la borne. */
export function reporterMaj(maintenant: number): DossierMaj | null {
  const d = lireDossier();
  if (!reportPossible(d) || !d) return null;
  const suivant: DossierMaj = { ...d, reports: d.reports + 1, jusqua: maintenant + REPORT_MS };
  ecrire(suivant);
  return suivant;
}

/** Le bandeau doit-il être à l'écran ? */
export function majVisible(d: DossierMaj | null, maintenant: number): boolean {
  if (!d) return false;
  return maintenant >= d.jusqua;
}

/** Depuis combien de jours entiers cette mise à jour attend. De quoi écrire
 *  « elle attend depuis 8 jours » sans l'inventer. */
export function joursDAttente(d: DossierMaj | null, maintenant: number): number {
  if (!d) return 0;
  return Math.max(0, Math.floor((maintenant - d.depuis) / JOUR_MS));
}

/** Assez de temps s'est-il écoulé pour réinterroger le serveur ? */
export function doitVerifier(dernier: number, maintenant: number): boolean {
  return maintenant - dernier > ECART_MIN_VERIFICATION_MS;
}
