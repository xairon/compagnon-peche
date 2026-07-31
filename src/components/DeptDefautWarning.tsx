import type { CSSProperties } from "react";
import { DEPARTEMENTS, type DeptId } from "../data/regulation";

/**
 * Warns that the angler never told the app where they fish, so every figure on
 * screen comes from the default département.
 *
 * Companion to OutOfZoneWarning, which covers the case where GPS placed the
 * angler outside the covered zone. This one covers the case that comes first
 * and is far more common: nobody ever asked. The difference matters because the
 * default is not always the safe side — mailles are floored by
 * `Math.max(local, national)`, but quotas are not: Loir-et-Cher reads
 * "6 truites/jour" where the Indre reads "6 salmonidés dont 2 fario max", i.e.
 * the default is MORE permissive than the Indre angler's actual law.
 *
 * Renders nothing once a choice has been made.
 */
export function DeptDefautWarning({
  deptChosen,
  activeDept,
  style,
}: {
  deptChosen: boolean;
  activeDept: DeptId;
  style?: CSSProperties;
}) {
  if (deptChosen) return null;
  return (
    <div className="ecr-warn" style={style}>
      Département non confirmé — l'application applique par défaut la réglementation du{" "}
      {DEPARTEMENTS[activeDept].name}. Si vous pêchez ailleurs, les tailles et quotas affichés ne
      sont pas les vôtres : choisissez votre département dans Réglementation.
    </div>
  );
}
