// Pure analysis of what conditions the notebook's catches tend to fall on —
// "quelles conditions font mordre" reduced to what the data can honestly say.
//
// Deliberately conservative on three fronts (see the feature spec):
//  1. Seuil de silence: below MIN_DOCUMENTED catches carrying a conditions
//     snapshot, nothing is computed — no chart on three points.
//  2. Ne montrer que ce qui se détache: a dimension only produces an insight
//     when one modality reaches CONCENTRATION_THRESHOLD of ITS OWN sample (not
//     the overall documented count — some fields, like water temperature, are
//     sparser than others and must clear the same bar on their own numbers).
//  3. Formulation factuelle: every sentence is "N of M catches fell on X", a
//     historical count, never a causal claim ("low pressure makes them bite").
//
// The biais rappelé in BIAS_NOTE is structural, not a caveat to soften: this
// module only ever sees LOGGED catches, never a fishless outing, so it can at
// best describe when-and-with-what the angler caught, not what makes fish bite.

import type { Catch, ConditionTrend } from "../types";
import { moonPhaseName } from "./astro";

/** Below this many catches carrying a conditions snapshot, no trend is shown
 *  at all — see silenceMessage(). Chosen as "about a fishing season's worth
 *  of documented outings", small enough to reach quickly, large enough that a
 *  single lucky afternoon can't dictate an insight. */
export const MIN_DOCUMENTED = 12;

/** A modality must cover at least two thirds of a dimension's documented
 *  catches to be shown — anything flatter doesn't "stand out" and would just
 *  restate chance. */
export const CONCENTRATION_THRESHOLD = 2 / 3;

export type InsightKey = "pressureTrend" | "flowTrend" | "moonPhase" | "waterTemp";

export interface DimensionInsight {
  key: InsightKey;
  title: string;
  /** Ready-to-display factual sentence — a count on the logged history, never a claim. */
  sentence: string;
  /** Share (0..100, rounded) of this dimension's documented catches on the winning modality. */
  pct: number;
}

export interface CatchesAnalysis {
  totalCatches: number;
  /** Catches carrying a conditions snapshot — the only ones any insight below draws from. */
  documented: number;
  /** True once `documented` clears MIN_DOCUMENTED. False ⇒ insights is always empty. */
  ready: boolean;
  /** How many more documented catches are needed to reach MIN_DOCUMENTED (0 once ready). */
  missing: number;
  insights: DimensionInsight[];
}

function trendPhrase(t: ConditionTrend): string {
  return t === "rising" ? "en hausse" : t === "falling" ? "en baisse" : "stable";
}

/** Simple, round buckets for water temperature — not a scientific cutoff, just
 *  a coarse split a French freshwater angler would recognize. */
function waterTempBucket(c: number): string {
  if (c < 12) return "froide (< 12 °C)";
  if (c <= 20) return "tempérée (12–20 °C)";
  return "chaude (> 20 °C)";
}

/** Count occurrences of each bucket key among the given (already-extracted,
 *  already-non-null) values, and report the winning one IF it clears
 *  CONCENTRATION_THRESHOLD of this dimension's own sample. Requires the
 *  dimension itself to have at least MIN_DOCUMENTED values — some fields are
 *  sparser than the overall `documented` count (e.g. water temperature,
 *  absent whenever no Hub'Eau sensor is nearby). */
function concentrationOf(values: string[]): { modality: string; count: number; total: number; pct: number } | null {
  const total = values.length;
  if (total < MIN_DOCUMENTED) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  let modality = "";
  let count = 0;
  for (const [k, c] of counts) {
    if (c > count) {
      modality = k;
      count = c;
    }
  }
  const pct = count / total;
  if (pct < CONCENTRATION_THRESHOLD) return null;
  return { modality, count, total, pct: Math.round(pct * 100) };
}

function pickValues<V>(catches: Catch[], pick: (c: NonNullable<Catch["conditions"]>) => V | undefined): V[] {
  const out: V[] = [];
  for (const c of catches) {
    if (!c.conditions) continue;
    const v = pick(c.conditions);
    if (v !== undefined) out.push(v);
  }
  return out;
}

/** Given the notebook's catches, what — if anything — the documented ones say
 *  about conditions. Never throws, never mutates its input. */
export function analysePrises(catches: Catch[]): CatchesAnalysis {
  const documented = catches.filter((c) => c.conditions).length;
  if (documented < MIN_DOCUMENTED) {
    return {
      totalCatches: catches.length,
      documented,
      ready: false,
      missing: MIN_DOCUMENTED - documented,
      insights: [],
    };
  }

  const insights: DimensionInsight[] = [];

  const pressure = concentrationOf(pickValues(catches, (c) => c.pressureTrend));
  if (pressure) {
    insights.push({
      key: "pressureTrend",
      title: "Pression atmosphérique",
      sentence: `${pressure.count} de vos ${pressure.total} prises documentées sont tombées avec une pression ${trendPhrase(
        pressure.modality as ConditionTrend,
      )}.`,
      pct: pressure.pct,
    });
  }

  const flow = concentrationOf(pickValues(catches, (c) => c.flowTrend));
  if (flow) {
    insights.push({
      key: "flowTrend",
      title: "Débit / niveau",
      sentence: `${flow.count} de vos ${flow.total} prises documentées sont tombées avec un débit/niveau ${trendPhrase(
        flow.modality as ConditionTrend,
      )}.`,
      pct: flow.pct,
    });
  }

  const moon = concentrationOf(
    pickValues(catches, (c) => (c.moonPhase != null ? moonPhaseName(c.moonPhase) : undefined)),
  );
  if (moon) {
    insights.push({
      key: "moonPhase",
      title: "Phase de lune",
      sentence: `${moon.count} de vos ${moon.total} prises documentées sont tombées en période de ${moon.modality.toLowerCase()}.`,
      pct: moon.pct,
    });
  }

  const waterTemp = concentrationOf(
    pickValues(catches, (c) => (c.waterTemp != null ? waterTempBucket(c.waterTemp) : undefined)),
  );
  if (waterTemp) {
    insights.push({
      key: "waterTemp",
      title: "Température de l'eau",
      sentence: `${waterTemp.count} de vos ${waterTemp.total} prises documentées sont tombées avec une eau ${waterTemp.modality}.`,
      pct: waterTemp.pct,
    });
  }

  return { totalCatches: catches.length, documented, ready: true, missing: 0, insights };
}

/** Copy for the "seuil de silence" state — never a chart on too few points. */
export function silenceMessage(missing: number): string {
  return `Encore ${missing} prise${missing > 1 ? "s" : ""} documentée${missing > 1 ? "s" : ""} avant que votre carnet puisse dire quelque chose.`;
}

/** The structural limitation of this whole analysis, always shown alongside
 *  any insight: only bites are counted, never a fishless outing. */
export const BIAS_NOTE =
  "Ces chiffres ne comptent que vos prises, jamais les sorties bredouilles : ils décrivent quand vous pêchez et prenez, pas ce qui fait mordre.";
