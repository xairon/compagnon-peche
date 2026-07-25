import type { Species } from "../types";
import { localQuota, type DeptId } from "../data/regulation";

export interface EffectiveQuota {
  /** The quota to announce, or null when neither the arrêté nor the national
   *  sheet sets one for this species. */
  text: string | null;
  /** True when the départemental arrêté, not `sp.quota`, supplies the text. */
  local: boolean;
}

/**
 * The daily quota to announce for a species in a department — the quota-step
 * analogue of effectiveMaille (see src/lib/maille.ts, the reference for this
 * module's shape and reasoning).
 *
 * It exists because the department was wired into the maille step only: the
 * quota step still read `sp.quota` alone. A truite fario carries
 * `sp.quota === "—"` (no *national* quota) even though the Loir-et-Cher
 * arrêté sets one ("6 truites/jour") — reading only `sp.quota` had the app
 * tell the angler "no quota" while the fiche espèce, fed by the same arrêté
 * data, said otherwise one screen away.
 *
 * Scope: this covers species whose quota is informative arrêté text (the
 * salmonidés 1ʳᵉ-catégorie group, and the sandre/brochet/black-bass group for
 * departments that restate their own wording). It does NOT replace the hard
 * R436-21 carnassier limit (3/jour, dont 2 brochets) that prise.ts tracks
 * against the day's catch book — that count-based check must keep running
 * regardless of what this function returns for those species.
 */
export function effectiveQuota(sp: Species, dept: DeptId | undefined): EffectiveQuota {
  const local = dept ? localQuota(dept, sp.id) : null;
  if (local) return { text: local, local: true };
  if (sp.quota && sp.quota !== "—") return { text: sp.quota, local: false };
  return { text: null, local: false };
}
