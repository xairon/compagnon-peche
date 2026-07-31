import type { CSSProperties } from "react";
import { DEPARTEMENTS, type DeptId } from "../data/regulation";
import { REG_YEAR, regOutdated } from "../data/version";

/**
 * Warns that the embedded sizes and quotas are last season's.
 *
 * The app recomputes opening and closing dates for the current year but keeps
 * the arrêtés' figures frozen at REG_YEAR, so from 1 January the two disagree.
 * Saying nothing would be the worst option: the angler has no way to tell a
 * fresh figure from a stale one, and acts on both the same way.
 *
 * A standing banner rather than a toast — this is a property of the data, not
 * an event — and it names the missing year, because "we have 2026" is only
 * actionable once the reader knows 2027 is what they are missing.
 */
export function RegPerimeeWarning({
  dept,
  now = new Date(),
  style,
}: {
  dept: DeptId;
  now?: Date;
  style?: CSSProperties;
}) {
  if (!regOutdated(now)) return null;
  const d = DEPARTEMENTS[dept];
  return (
    <div className="ecr-warn" style={style}>
      Réglementation embarquée : saison {REG_YEAR}. L'arrêté préfectoral{" "}
      {now.getFullYear()} n'est pas dans l'application — les tailles et quotas
      affichés peuvent avoir changé. Vérifiez avant de conserver un poisson :{" "}
      <a href={d.url} target="_blank" rel="noreferrer">
        {d.fede} ↗
      </a>
    </div>
  );
}
