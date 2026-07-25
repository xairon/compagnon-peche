import type { Species } from "../types";
import { localMaille, strictestCm, type DeptId } from "../data/regulation";

export interface EffectiveMaille {
  /** The size to announce, in centimetres. 0 when the species has none. */
  cm: number;
  /** What to PRINT. Usually "60 cm", but some species carry a wording rather
   *  than a number — "Interdit" for the sturgeon, "spéciale" for the salmon.
   *  Reducing everything to an integer turned "Interdit" into "Pas de maille",
   *  which is strictly more permissive than the law for a species protected
   *  everywhere. null when there genuinely is no size. */
  label: string | null;
  /** The arrêté's own wording when it sets one — exceptions included, so the
   *  angler can check the case that applies to them. */
  text: string | null;
  /** True when the départemental arrêté, not the national floor, sets the size. */
  local: boolean;
  /** True only when the local size is genuinely STRICTER than the national one:
   *  most arrêtés simply restate the national figure, and claiming otherwise on
   *  a regulatory screen is noise at best, contradiction at worst. */
  aboveNational: boolean;
}

/**
 * The minimum legal size to announce for a species in a department — the single
 * answer every surface of the app must give.
 *
 * It exists because the first fix wired the arrêté into the decision card only,
 * while the size input and the on-screen ruler kept parsing `sp.maille`: one tap
 * from a card announcing 60 cm, the ruler still measured 50. Any screen that
 * shows a maille resolves it here.
 *
 * Never returns less than the national floor. The invariant "an arrêté can only
 * be stricter" does NOT hold — R436-19 lets a préfet LOWER the trout size on
 * listed rivers (the Creuse does, to 20 cm) — and announcing the lower figure
 * would have the angler keep an undersized fish everywhere else in the
 * department. Releasing a fish that was legal on one river is the safe error.
 */
export function effectiveMaille(sp: Species, dept: DeptId | undefined): EffectiveMaille {
  const national = strictestCm(sp.maille) ?? 0;
  const local = dept ? localMaille(dept, sp.id) : null;
  if (!local) {
    // No number, but a wording ("Interdit", "spéciale") — keep it: it carries
    // the rule that matters, and dropping it reads as "no size limit".
    const label = national > 0 ? national + " cm" : wording(sp.maille);
    return { cm: national, label, text: null, local: false, aboveNational: false };
  }
  const cm = Math.max(local.cm, national);
  return { cm, label: cm + " cm", text: local.text, local: true, aboveNational: cm > national };
}

/** A maille field that isn't a size: keep it verbatim, unless it's the "no rule"
 *  placeholder the dataset uses. */
function wording(maille: string): string | null {
  const t = (maille || "").trim();
  return t === "" || t === "—" ? null : t;
}
