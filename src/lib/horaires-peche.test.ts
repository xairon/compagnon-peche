import { describe, it, expect } from "vitest";
import { horairesPeche, MARGE_LEGALE_MIN } from "./horaires-peche";

/**
 * Les horaires légaux de pêche : une demi-heure avant le lever du soleil, une
 * demi-heure après son coucher (art. R436-13). Ce n'est pas un ornement du
 * module « soleil » — c'est ce qui décide si le pêcheur est en règle.
 *
 * Sur l'Accueil, cette demi-heure n'existait QUE dans le texte d'une infobulle,
 * derrière un appui. Les deux seules heures affichées étaient le lever et le
 * coucher nus, c'est-à-dire les deux heures auxquelles il n'est PAS interdit de
 * pêcher. La sortir du calcul et la poser à côté des heures est la raison de ce
 * module.
 */

const d = (iso: string) => new Date(iso);

describe("horairesPeche", () => {
  it("ouvre une demi-heure avant le lever", () => {
    const h = horairesPeche({ sunrise: d("2026-06-21T06:00:00"), sunset: d("2026-06-21T21:00:00") });

    expect(h!.ouverture.toISOString()).toBe(d("2026-06-21T05:30:00").toISOString());
  });

  it("ferme une demi-heure après le coucher", () => {
    const h = horairesPeche({ sunrise: d("2026-06-21T06:00:00"), sunset: d("2026-06-21T21:00:00") });

    expect(h!.fermeture.toISOString()).toBe(d("2026-06-21T21:30:00").toISOString());
  });

  it("passe minuit sans se replier sur le même jour", () => {
    // Un coucher à 23h50 ferme à 00h20 le lendemain. Ajouter 30 min à
    // l'horloge sans changer de date rendrait 23h50 → 00h20 du MÊME jour,
    // c'est-à-dire une fermeture avant l'ouverture.
    const h = horairesPeche({ sunrise: d("2026-06-21T00:20:00"), sunset: d("2026-06-21T23:50:00") });

    expect(h!.fermeture.getDate()).toBe(22);
    expect(h!.ouverture.getDate()).toBe(20);
    expect(h!.fermeture.getTime()).toBeGreaterThan(h!.ouverture.getTime());
  });

  it("la demi-heure est une seule constante, pas deux nombres recopiés", () => {
    expect(MARGE_LEGALE_MIN).toBe(30);
  });

  it("ne rend rien quand l'éphéméride ne rend ni lever ni coucher", () => {
    // Nuit ou jour polaire : sunTimes() rend null. Fabriquer une heure à
    // partir de null (Math : NaN) afficherait « Invalid Date » là où la loi est
    // citée. Trois états, et celui-ci est « inconnu ».
    expect(horairesPeche({ sunrise: null, sunset: d("2026-06-21T21:00:00") })).toBeNull();
    expect(horairesPeche({ sunrise: d("2026-06-21T06:00:00"), sunset: null })).toBeNull();
    expect(horairesPeche({ sunrise: null, sunset: null })).toBeNull();
  });

  it("dit si l'instant donné est dans la fenêtre légale, bornes comprises", () => {
    const sun = { sunrise: d("2026-06-21T06:00:00"), sunset: d("2026-06-21T21:00:00") };

    expect(horairesPeche(sun, d("2026-06-21T05:29:59"))!.ouvert).toBe(false);
    expect(horairesPeche(sun, d("2026-06-21T05:30:00"))!.ouvert).toBe(true);
    expect(horairesPeche(sun, d("2026-06-21T12:00:00"))!.ouvert).toBe(true);
    expect(horairesPeche(sun, d("2026-06-21T21:30:00"))!.ouvert).toBe(true);
    expect(horairesPeche(sun, d("2026-06-21T21:30:01"))!.ouvert).toBe(false);
  });
});
