// L'historique du navigateur comme pile de navigation de l'app.
//
// Avant ce lot : `grep pushState|popstate src/` → 0 résultat, pour un manifest
// en `display: standalone`. En mode installé, le geste retour d'Android n'a rien
// à dépiler et FERME l'application — au milieu d'une fiche, d'une recette, d'une
// séance d'écrevisses. C'était le seul défaut de la liste v1.0 qu'un inconnu
// rencontrait dans les trente premières secondes.
//
// Le principe : une entrée d'historique par endroit visité, et l'état de
// navigation (écran + onglet + contexte) sérialisé DANS l'entrée. Le retour
// n'est donc plus reconstitué par l'app — il est restitué par le navigateur,
// ce qui fait que le geste système et le bouton « ‹ » font exactement la même
// chose, par construction et non par coïncidence.
//
// Ce module est la partie pure : extraire un point de l'état, comparer,
// revenir. Le branchement sur `window.history` vit dans le StoreProvider.
import type { Screen, Tab } from "../store";
import { CTX_CHAMPS, CTX_DEFAUT, ROUTES, depuisUrl, ongletDe, type Ctx } from "./nav-conventions";

/** Ce qui est écrit dans `history.state.nav`, et rien d'autre. */
export interface PointNav {
  screen: Screen;
  tab: Tab;
  ctx: Ctx;
  /** 0 = l'entrée par laquelle l'app a été ouverte. Sert à ne pas piéger le retour. */
  profondeur: number;
}

/** Ce que le point a besoin de lire dans l'état — pas le carnet, pas les photos. */
type SourceEtat = { screen: Screen; tab: Tab } & Partial<Ctx>;

export function pointDeEtat(etat: SourceEtat, profondeur: number): PointNav {
  const ctx = { ...CTX_DEFAUT };
  for (const champ of CTX_CHAMPS) {
    const v = etat[champ];
    if (v !== undefined) (ctx as Record<string, unknown>)[champ] = v;
  }
  return { screen: etat.screen, tab: etat.tab, ctx, profondeur };
}

/**
 * Deux points désignent-ils le même endroit ? La profondeur est exclue
 * volontairement : le même écran atteint par deux chemins n'est pas deux
 * endroits, et l'effet de synchronisation s'en sert pour savoir qu'il n'a rien
 * à pousser — sinon un retour par popstate repousserait aussitôt l'entrée qu'il
 * vient de dépiler, et le retour serait sans effet.
 */
export function memeEndroit(a: PointNav | null, b: PointNav): boolean {
  if (!a) return false;
  if (a.screen !== b.screen || a.tab !== b.tab) return false;
  return CTX_CHAMPS.every((c) => a.ctx[c] === b.ctx[c]);
}

/**
 * Le patch d'état à appliquer en arrivant sur ce point. Il porte TOUS les
 * champs de contexte, y compris ceux à zéro : un patch partiel laisserait
 * derrière lui le contexte de l'écran qu'on vient de quitter.
 */
export function patchDePoint(p: PointNav): { screen: Screen; tab: Tab } & Ctx {
  return { screen: p.screen, tab: p.tab, ...p.ctx };
}

/**
 * Relit `history.state`. C'est une donnée que nous n'écrivons pas seuls : une
 * autre page de la même origine peut y avoir mis n'importe quoi, et surtout une
 * version PRÉCÉDENTE de l'app a pu y laisser un écran qui n'existe plus. On
 * valide donc au lieu de faire confiance ; en cas de doute l'appelant retombe
 * sur l'URL, puis sur l'accueil.
 */
export function lirePoint(brut: unknown): PointNav | null {
  if (!brut || typeof brut !== "object") return null;
  const nav = (brut as { nav?: unknown }).nav;
  if (!nav || typeof nav !== "object") return null;
  const n = nav as Record<string, unknown>;
  if (typeof n.screen !== "string" || !(n.screen in ROUTES)) return null;
  if (typeof n.tab !== "string") return null;
  if (!n.ctx || typeof n.ctx !== "object") return null;

  const source = n.ctx as Record<string, unknown>;
  const ctx = { ...CTX_DEFAUT };
  for (const champ of CTX_CHAMPS) {
    const v = source[champ];
    if (champ === "cookStep") {
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) ctx.cookStep = Math.floor(v);
    } else if (typeof v === "string" || v === null) {
      (ctx as Record<string, unknown>)[champ] = v;
    }
  }
  const prof = typeof n.profondeur === "number" && n.profondeur >= 0 ? Math.floor(n.profondeur) : 0;
  return { screen: n.screen as Screen, tab: n.tab as Tab, ctx, profondeur: prof };
}

/**
 * Le point désigné par une URL. Aucune URL ne porte l'onglet actif — il est
 * déduit de la table des routes, sinon la barre du bas arriverait éteinte sur
 * un lien profond.
 */
export function pointDepuisUrl(url: string, profondeur = 0): PointNav | null {
  const lu = depuisUrl(url);
  if (!lu) return null;
  return { screen: lu.screen, tab: ongletDe(lu.screen), ctx: lu.ctx, profondeur };
}
