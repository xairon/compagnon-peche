import { DEPARTEMENTS, type DeptId } from "../data/regulation";
import { estTheme, type Theme } from "./theme";

// Device preferences that must be known *before* the first paint: the
// department decides which arrêté préfectoral every screen quotes, and bigUI
// decides how large every control is drawn. That rules out IndexedDB — an async
// read would render Loir-et-Cher rules for a frame, then swap them. localStorage
// is synchronous, and these two values are tiny.
//
// Everything else the user owns (catches, spots, gear…) lives in IndexedDB via
// db.ts; this is not a general settings store, and should not become one.

const KEY = "carnet:prefs";
const LEGACY_BIG_UI = "bigUI"; // the scheme this replaces

export interface Prefs {
  dept: DeptId;
  /** True once the user has actually picked a department, as opposed to being
   *  left on the default. Drives the "we never asked" warning. */
  deptChosen: boolean;
  bigUI: boolean;
  /** Thème demandé. « auto » suit le réglage du téléphone ; voir lib/theme.ts. */
  theme: Theme;
}

export const DEFAULT_PREFS: Prefs = { dept: "41", deptChosen: false, bigUI: false, theme: "auto" };

function isCoveredDept(v: unknown): v is DeptId {
  return typeof v === "string" && v in DEPARTEMENTS;
}

/** Read stored preferences, falling back to defaults on anything unexpected.
 *  Never throws: private browsing makes localStorage itself throw on access. */
export function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      // No prefs yet — but a returning user may still carry the old standalone
      // gloves flag. Dropping it here would shrink every control for exactly
      // the people who needed them big.
      return {
        ...DEFAULT_PREFS,
        bigUI: localStorage.getItem(LEGACY_BIG_UI) === "1",
      };
    }
    const p = JSON.parse(raw) as Partial<Prefs>;
    const dept = isCoveredDept(p.dept) ? p.dept : DEFAULT_PREFS.dept;
    return {
      // An unknown department would make the app quote a réglementation it does
      // not have. Falling back is the only safe answer.
      dept,
      // A rejected department is not a choice, whatever the stored flag says.
      deptChosen: p.deptChosen === true && isCoveredDept(p.dept),
      bigUI: p.bigUI === true,
      // Une préférence de thème corrompue ne doit pas laisser l'app sans
      // thème du tout — « auto » est toujours une réponse valable.
      theme: estTheme(p.theme) ? p.theme : DEFAULT_PREFS.theme,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

/** Persist preferences. Best-effort: a refusal (private mode, quota) must never
 *  break the app — the user just gets the defaults again next launch. */
export function writePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* best-effort */
  }
}
