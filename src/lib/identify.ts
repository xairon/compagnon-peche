// Adaptive guided-identification engine. Given the answers picked so far, it
// returns the still-possible species AND the questions worth asking next — with
// only the options at least one candidate actually has. That guarantees the user
// can never build an impossible combination (e.g. "fuselé + 4 barbillons"): once
// a trait is chosen, incompatible options for the other traits simply disappear.

import { SPECIES } from "../data/species";
import { ID_TRAITS, TRAIT_META, type TraitKey, type IdTrait } from "../data/idtraits";
import type { Species } from "../types";

export type Answers = Record<string, string>;

// Species covered by the identifier (those with at least a partial trait record).
const COVERED: Species[] = SPECIES.filter((s) => ID_TRAITS[s.id]);

/** The value a species presents for a trait, as the string the UI uses (or null if unknown). */
function traitValue(tr: IdTrait, key: TraitKey): string | null {
  const raw = tr[key];
  if (raw === undefined) return null;
  if (key === "adipeuse") return raw ? "oui" : "non";
  return String(raw);
}

/** Species still compatible with every answer (unknown trait ⇒ never excluded). */
export function candidates(answers: Answers): Species[] {
  const entries = Object.entries(answers);
  return COVERED.filter((sp) => {
    const tr = ID_TRAITS[sp.id];
    for (const [k, v] of entries) {
      const sv = traitValue(tr, k as TraitKey);
      if (sv !== null && sv !== v) return false;
    }
    return true;
  });
}

export interface QOption {
  val: string;
  label: string;
  sub?: string;
  icon?: string;
  count: number; // candidates that would remain if picked
}
export interface Question {
  key: string;
  title: string;
  hint?: string;
  options: QOption[];
}

/**
 * Questions worth asking, most-discriminating first. A question is only kept if
 * the current candidates split across ≥2 known values for it; each option is only
 * kept if ≥1 candidate has that value — so no dead ends and no impossible combos.
 */
export function nextQuestions(answers: Answers, cands: Species[]): Question[] {
  const out: (Question & { score: number })[] = [];
  for (const meta of TRAIT_META) {
    if (answers[meta.key] != null) continue; // already answered
    const counts = new Map<string, number>();
    for (const sp of cands) {
      const v = traitValue(ID_TRAITS[sp.id], meta.key);
      if (v === null) continue;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    if (counts.size < 2) continue; // doesn't split anything → not useful now
    const options = meta.options
      .filter((o) => counts.has(o.val))
      .map((o) => ({ ...o, count: counts.get(o.val)! }));
    // Information-ish score: rewards even splits over broad coverage.
    const known = [...counts.values()].reduce((a, b) => a + b, 0);
    const maxShare = Math.max(...counts.values()) / known;
    out.push({ key: meta.key, title: meta.title, hint: meta.hint, options, score: known * (1 - maxShare) });
  }
  out.sort((a, b) => b.score - a.score);
  return out.map(({ score: _score, ...q }) => q);
}

/** Human labels for chosen answers, to render removable chips. */
export function answerLabel(key: string, val: string): string {
  const meta = TRAIT_META.find((m) => m.key === key);
  const opt = meta?.options.find((o) => o.val === val);
  return opt ? opt.label : val;
}

export const IDENTIFIER_COVERAGE = COVERED.length;
