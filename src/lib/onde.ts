// ONDE — Observatoire National Des Étiages (OFB), via Hub'Eau.
//
// WHAT THE NETWORK ACTUALLY IS, because the app kept getting this wrong: ONDE
// exists to watch SMALL watercourses that are prone to drying out. Its stations
// are sited on headwaters and tributaries by design; large rivers have none.
// Around Blois the nearest station is 13,2 km away on la Cisse — the Loire, a
// few hundred metres from the same point, is not monitored at all.
//
// So an ONDE reading is never "the state of the water in front of you". It is
// "how the small watercourses of this area are doing". On the July 2026
// campaign, 40 % of the stations in Loir-et-Cher were legitimately in assec —
// which is why an angler on the Loire kept being told «Assec». The measurement
// was right; the sentence the app built from it was not.
//
// Observations are campaign-based (roughly monthly in summer, dormant in
// winter), never real time.

/** Every code the API actually returns. Verified against the live endpoint over
 *  two national campaigns: 3 (656), 1f (614), 1a (444), 2 (198), 1 (24).
 *  The previous tables in Accueil and Briefing tested "1b" — which does not
 *  exist — and omitted "1f", the second most frequent value of the whole set. */
export const ONDE_CODES = ["1", "1a", "1f", "2", "3"] as const;

export type OndeTone = "good" | "warn" | "bad" | "inconnu";

export interface OndeEtat {
  /** Full wording, for a detail view. */
  mot: string;
  /** Short wording, for a dashboard tile. */
  court: string;
  tone: OndeTone;
}

const TABLE: Record<string, OndeEtat> = {
  "1": { mot: "Écoulement visible", court: "Visible", tone: "good" },
  "1a": { mot: "Écoulement visible acceptable", court: "Acceptable", tone: "good" },
  "1f": { mot: "Écoulement visible faible", court: "Faible", tone: "warn" },
  "2": { mot: "Écoulement non visible", court: "Non visible", tone: "warn" },
  "3": { mot: "Assec", court: "À sec", tone: "bad" },
};

/**
 * How to read a flow code.
 *
 * `label` is Hub'Eau's own wording (`libelle_ecoulement`) and wins when present:
 * the producer is authoritative on its own vocabulary, and our table exists for
 * the case where `fields=` left it out — not as a second opinion.
 *
 * An unrecognised code yields "inconnu" rather than a guess: this feeds a
 * screen that tells anglers whether water is there, and inventing a state is
 * worse than admitting none is known.
 */
export function ondeEtat(code: string, label?: string): OndeEtat {
  const connu = TABLE[code];
  if (!connu) return { mot: label || "État inconnu", court: "—", tone: "inconnu" };
  return label ? { ...connu, mot: label } : connu;
}

/** Same threshold and same reasoning as qualiteEau.MAX_DIST_KM: past it the app
 *  abstains rather than implying a relevance the data does not have. */
export const ONDE_MAX_DIST_KM = 15;

/** True when the nearest station is too far to say anything useful about the
 *  area — including when the distance is unknown, which is not a reason to
 *  assume it is close. */
export function ondeTropLoin(distKm: number | undefined): boolean {
  return !Number.isFinite(distKm as number) || (distKm as number) > ONDE_MAX_DIST_KM;
}
