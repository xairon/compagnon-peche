/**
 * Les horaires légaux de pêche : une demi-heure avant le lever du soleil, une
 * demi-heure après son coucher (art. R436-13 du code de l'environnement).
 *
 * POURQUOI UN MODULE POUR DEUX ADDITIONS. Parce que cette demi-heure est
 * réglementaire, et qu'elle n'existait sur l'Accueil que dans le texte d'une
 * infobulle, derrière un appui. Les deux seules heures affichées étaient le
 * lever et le coucher nus — c'est-à-dire, à la minute près, les deux heures
 * auxquelles il n'est PAS interdit de pêcher, mais pas celles que la loi donne.
 * `OutilsTerrain.tsx` refaisait le calcul dans son coin, avec ses propres
 * `30 * 60000` recopiés deux fois.
 */

/** La demi-heure légale, en minutes. Une seule fois, pour que les deux bornes
 *  ne puissent pas diverger. */
export const MARGE_LEGALE_MIN = 30;

const MARGE_MS = MARGE_LEGALE_MIN * 60000;

export interface HorairesPeche {
  /** Lever du soleil moins la demi-heure. */
  ouverture: Date;
  /** Coucher du soleil plus la demi-heure. */
  fermeture: Date;
  /** L'instant demandé tombe-t-il dans la fenêtre, bornes comprises. */
  ouvert: boolean;
}

/**
 * La fenêtre légale du jour, ou `null` quand l'éphéméride ne rend pas les deux
 * heures.
 *
 * `null` et non une fenêtre approchée : `sunTimes()` rend `null` sous les
 * latitudes où le soleil ne se lève ou ne se couche pas, et bâtir une heure sur
 * `null` afficherait « Invalid Date » à l'endroit précis où l'app cite la loi.
 * La France métropolitaine n'y va pas, mais l'app accepte des coordonnées GPS
 * quelconques.
 *
 * L'arithmétique se fait en millisecondes, pas en `setMinutes()` : un coucher à
 * 23 h 50 ferme à 00 h 20 LE LENDEMAIN, et reculer l'horloge sans changer la
 * date rendrait une fermeture antérieure à l'ouverture. Passer par le temps
 * absolu traverse aussi les changements d'heure sans y penser.
 */
export function horairesPeche(
  sun: { sunrise: Date | null; sunset: Date | null },
  maintenant: Date = new Date(),
): HorairesPeche | null {
  if (!sun.sunrise || !sun.sunset) return null;
  const ouverture = new Date(sun.sunrise.getTime() - MARGE_MS);
  const fermeture = new Date(sun.sunset.getTime() + MARGE_MS);
  const t = maintenant.getTime();
  // Bornes comprises : à l'instant exact de l'ouverture, la pêche est permise.
  return { ouverture, fermeture, ouvert: t >= ouverture.getTime() && t <= fermeture.getTime() };
}
