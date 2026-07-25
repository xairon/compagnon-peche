// Fishing card (carte de pêche) status — pure, clock-free. The card is
// annual: it runs from 1 January to 31 December of the year printed on it,
// so "carteAnnee: 2026" means "valid through 31 déc. 2026, 23:59". Every
// function takes `now` as a parameter (never reads the clock itself), same
// convention as src/lib/ecrevisses.ts — the caller decides what "now" means,
// which is what makes this testable without mocking the system clock.

/** Absente = nothing recorded yet (not necessarily unlawful: under 12, or the
 *  angler simply hasn't filled it in). Only "perimee" is a hard legal problem. */
export type FishingCardStatus = "absente" | "valide" | "expire-bientot" | "perimee";

/** Days of lead time before 31 décembre during which the reminder turns from
 *  quiet to visible. A month matches when the FNPF opens next season's card
 *  sales (mid/late November) — the angler can act on the reminder as soon as
 *  it appears, rather than being told to renew a card that isn't on sale yet. */
export const CARD_WARNING_DAYS = 30;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Calendar days remaining until 31 décembre of `carteAnnee` (0 on the last
 *  valid day, negative once it has lapsed). Time-of-day on `now` doesn't
 *  matter — the card is valid for the whole of its last day. */
export function daysUntilCardExpiry(carteAnnee: number, now: Date): number {
  const expiry = startOfDay(new Date(carteAnnee, 11, 31));
  const today = startOfDay(now);
  return Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
}

/** Where the card stands at `now`. No card year on file → "absente"; past
 *  31 décembre of its year → "perimee"; inside the CARD_WARNING_DAYS window
 *  before that → "expire-bientot"; otherwise "valide". */
export function fishingCardStatus(carteAnnee: number | undefined, now: Date): FishingCardStatus {
  if (!carteAnnee) return "absente";
  const daysLeft = daysUntilCardExpiry(carteAnnee, now);
  if (daysLeft < 0) return "perimee";
  if (daysLeft <= CARD_WARNING_DAYS) return "expire-bientot";
  return "valide";
}
