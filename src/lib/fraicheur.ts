import { ago } from "./geo";

// One freshness rule for every measured quantity the app displays.
//
// The audit of the data sources found the same omission in five of seven: a
// reading is rendered as the current state, and nothing lets its age
// disqualify it. Measured from Blois on 2026-07-31:
//   · débit de la Loire     → dernier relevé le 21/07     (10 jours)
//   · température de l'eau  → 17/08/2024, 22,6 °C         (11 mois)
//   · qualité physico-chim. → 05/12/2006, « très bonne »  (20 ans)
//   · pêche scientifique    → 21/06/2004                  (22 ans)
// None of them is detectable by the reader — 22 °C in July is perfectly
// plausible, and "très bonne" carried no date at all.
//
// Three freshness helpers already existed, in three modules, with three
// unrelated thresholds. This is the single place they belong.

/** The quantities the app measures, each with its own idea of "recent". */
export type Grandeur = "hydro" | "temperature" | "qualite" | "onde" | "poisson";

/**
 * How long a reading stays usable as "the current state", per quantity.
 *
 * These are not arbitrary: each matches how often the network behind it
 * actually publishes. Hydrometry is genuinely instantaneous, so hours; ONDE
 * runs monthly campaigns in summer and sleeps in winter, so a two-month gap is
 * normal; a physico-chemical sample is a lab analysis a few times a year;
 * scientific fishing passes come round every few years at best.
 */
export const AGE_MAX: Record<Grandeur, number> = {
  hydro: 6 * 3_600_000, // 6 h — the only real-time source
  temperature: 30 * 86_400_000, // a month; water temperature moves seasonally
  onde: 120 * 86_400_000, // campaigns are monthly in summer, dormant in winter
  qualite: 540 * 86_400_000, // ~18 months between lab samples is ordinary
  poisson: 5 * 365 * 86_400_000, // ASPE passes are years apart
};

export interface Fraicheur {
  /** True when the reading must NOT be shown as the current state. Also true
   *  when there is no usable date: an undated measurement cannot be vouched
   *  for, and treating it as fresh is exactly the defect this module fixes. */
  perime: boolean;
  /** Ready-to-display provenance, e.g. « dernier relevé il y a 2 ans ». */
  texte: string;
}

export function fraicheur(
  iso: string | undefined | null,
  grandeur: Grandeur,
  now: number = Date.now(),
): Fraicheur {
  if (!iso) return { perime: true, texte: "date inconnue" };
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return { perime: true, texte: "date inconnue" };

  const age = now - t;
  // A reading dated in the future means the device clock is wrong, not the
  // data — don't punish the measurement for it.
  const perime = age > AGE_MAX[grandeur];

  // Fresh: a relative age is what a reader wants ("il y a 12 min"). Stale: the
  // actual date, because that is what makes it checkable and reportable —
  // "il y a 2 ans" tells you to distrust it, "17/08/2024" tells you why.
  const texte = perime
    ? `dernier relevé le ${new Date(t).toLocaleDateString("fr-FR")}`
    : `dernier relevé ${ago(iso, new Date(now))}`;
  return { perime, texte };
}
