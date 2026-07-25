import type { CSSProperties } from "react";
import { DEPARTEMENTS, type DeptId } from "../data/regulation";

/**
 * Warns that GPS detected a département the app doesn't cover — only 23
 * (Creuse), 36 (Indre) and 41 (Loir-et-Cher) are. The app never guesses: it
 * keeps showing the ACTIVE département's regulation regardless of where the
 * angler physically is, so every screen that displays or acts on
 * regulation-derived figures (maille, quota, dates) must carry this warning,
 * not just the dashboard. Was duplicated near-identically between Accueil and
 * Reglement; extracted here so Prise (and any future screen) reuses the exact
 * same wording instead of drifting.
 */
export function OutOfZoneWarning({
  outOfZoneDept,
  activeDept,
  style,
}: {
  outOfZoneDept: string;
  activeDept: DeptId;
  style?: CSSProperties;
}) {
  return (
    <div className="ecr-warn" style={style}>
      Département détecté : n° {outOfZoneDept} — l'application ne couvre que la Creuse (23),
      l'Indre (36) et le Loir-et-Cher (41). Ce qui s'affiche ici reste celui du département actif,{" "}
      {DEPARTEMENTS[activeDept].name} : cela ne s'applique pas forcément là où vous êtes. Consultez
      l'arrêté préfectoral de votre propre département.
    </div>
  );
}
