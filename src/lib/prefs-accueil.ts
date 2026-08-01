/**
 * Ce que l'Accueil retient d'un lancement à l'autre.
 *
 * MÊME RÈGLE QUE lib/prefs.ts, ET MÊME RAISON : lecture synchrone
 * (localStorage), parce que les deux valeurs décident du PREMIER rendu. Un repli
 * relu de façon asynchrone déplierait tout le tableau de bord le temps d'une
 * frame avant de le replier ; la rivière choisie, elle, décide quelles requêtes
 * partent — la relire trop tard, c'est lancer les mauvaises.
 *
 * POURQUOI UNE CLÉ À PART, et non deux champs de plus dans `carnet:prefs` :
 * `store.tsx` écrit l'objet entier à chaque changement de département —
 * `writePrefs({ dept, deptChosen, bigUI })`. Tout ce qu'on ajouterait à `Prefs`
 * serait effacé au premier changement de département, silencieusement. Deux
 * clés, deux propriétaires : `carnet:prefs` au store, `carnet:accueil` à
 * l'Accueil.
 */

const KEY = "carnet:accueil";

/**
 * La rivière que le pêcheur a désignée pour les conditions de l'eau.
 *
 * PLUSIEURS CLÉS, ET PAS UNE. Hub'Eau ne code pas ses cours d'eau dans un
 * référentiel unique : mesuré le 01/08/2026 autour de Blois, la Loire est
 * `CoursEau_Carthage2017:----0000` pour la thermie, la physico-chimie et ONDE,
 * et `CEA:----0000` pour l'hydrométrie (voir station.cleCours, qui préfixe
 * justement pour que deux référentiels ne se confondent pas). Une seule clé
 * stockée laisserait donc la moitié des réseaux sans rattachement.
 */
export interface RiviereChoisie {
  /** Libellé publié par la source, tel quel. Jamais forgé. */
  nom: string;
  /** Clés de cours d'eau comparables (voir station.cleCours), une par
   *  référentiel où la rivière a été vue. Jamais vide — sans clé, la rivière
   *  ne filtrerait rien (voir readPrefsAccueil). */
  cles: string[];
}

export interface PrefsAccueil {
  /**
   * Sections repliées, par identifiant.
   *
   * ABSENT ≠ DÉPLIÉ. Une section absente n'a jamais été touchée : elle garde le
   * défaut que l'écran lui donne. Stocker un booléen pour chaque section dès le
   * premier lancement figerait ces défauts chez tous les pêcheurs installés.
   */
  replis: Record<string, boolean>;
  /** Rivière désignée, ou null tant que le pêcheur n'a rien désigné. */
  riviere: RiviereChoisie | null;
}

export const PREFS_ACCUEIL_DEFAUT: PrefsAccueil = { replis: {}, riviere: null };

function lireReplis(v: unknown): Record<string, boolean> {
  // Un tableau est un objet : `typeof []` vaut "object". Sans ce test, des
  // replis stockés en tableau ressortiraient indexés par "0", "1"…
  if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
  const out: Record<string, boolean> = {};
  for (const [k, b] of Object.entries(v as Record<string, unknown>)) {
    // Rien d'autre qu'un booléen : « replié » n'a que deux valeurs, et un
    // "oui" ou un null seraient interprétés par la troncature de JS.
    if (typeof b === "boolean") out[k] = b;
  }
  return out;
}

function lireRiviere(v: unknown): RiviereChoisie | null {
  if (typeof v !== "object" || v === null) return null;
  const r = v as Record<string, unknown>;
  const nom = typeof r.nom === "string" ? r.nom.trim() : "";
  const cles = Array.isArray(r.cles)
    ? r.cles.filter((c): c is string => typeof c === "string" && c.length > 0)
    : [];
  // Sans nom, l'écran n'aurait rien à afficher — et un nom vide se lirait comme
  // « aucune rivière ». Sans clé, le filtre ne filtre rien : les conditions
  // retomberaient sur la station la plus proche, donc possiblement une AUTRE
  // rivière, sous le nom de celle-ci. C'est le défaut fondateur de l'audit ;
  // mieux vaut ne pas avoir de rivière du tout.
  if (!nom || !cles.length) return null;
  return { nom, cles };
}

/** Relit les préférences de l'Accueil. Ne lève jamais : en navigation privée,
 *  localStorage lève à la simple lecture. */
export function readPrefsAccueil(): PrefsAccueil {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...PREFS_ACCUEIL_DEFAUT };
    const p = JSON.parse(raw) as Record<string, unknown>;
    return { replis: lireReplis(p.replis), riviere: lireRiviere(p.riviere) };
  } catch {
    return { ...PREFS_ACCUEIL_DEFAUT };
  }
}

/** Enregistre. Au mieux : un refus (mode privé, quota) ne doit pas casser
 *  l'écran — le pêcheur retrouve simplement les défauts au lancement suivant. */
export function writePrefsAccueil(p: PrefsAccueil): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* au mieux */
  }
}

/** L'état de repli d'une section : le choix du pêcheur s'il en a fait un,
 *  sinon le défaut de la section. */
export function estReplie(
  replis: Record<string, boolean>,
  id: string,
  defaut: boolean,
): boolean {
  const v = replis[id];
  return typeof v === "boolean" ? v : defaut;
}
