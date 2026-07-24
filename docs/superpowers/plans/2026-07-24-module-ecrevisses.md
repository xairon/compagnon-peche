# Module Écrevisses — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Piloter une séance de pêche aux écrevisses — poser jusqu'à 10 balances chronométrées individuellement, être alerté à chaque échéance, et enregistrer le total capturé par espèce en fin de séance.

**Architecture:** Toute la logique métier vit dans un module **pur** (`src/lib/ecrevisses.ts`) qui prend l'instant courant en paramètre et rend de nouveaux objets `CrayfishSession` — l'état des balances se recalcule depuis des horodatages absolus, jamais depuis un compteur décrémenté. Les écrans React et le store ne sont que de la glue : ils appellent les transformateurs purs et persistent le résultat. C'est ce qui rend le module robuste au gel de l'app par Android, et testable sans attendre 30 minutes.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest, `idb-keyval` (IndexedDB), `vite-plugin-pwa` (service worker `generateSW`), CSS vanilla dans `src/styles.css`.

**Spec:** `docs/superpowers/specs/2026-07-24-module-ecrevisses-design.md`

## Global Constraints

- **Français** partout dans l'UI. Les commentaires de code sont en anglais, comme le reste du dépôt.
- **100 % hors-ligne, aucune donnée transmise** — pas de serveur, pas de push, pas d'appel réseau dans ce module.
- **Pas de nouvelle dépendance npm.**
- Persistance IndexedDB via `idb-keyval`, clé **`carnet:crayfish`**.
- Plafond réglementaire : **6 balances par défaut, 10 maximum**. Diamètre max 30 cm (texte affiché).
- Les fonctions de `src/lib/ecrevisses.ts` sont **pures** : aucune lecture de `Date.now()` à l'intérieur, l'instant est toujours un paramètre `now: number`.
- Le modèle `Catch` et l'écran `Statistiques` **ne sont pas modifiés**.
- Tests : `npm test` (Vitest) doit rester vert. Lint : `npm run lint`. Build : `npm run build`.
- Commits en français, une ligne de sujet + corps si utile.

---

### Task 1 : Types et logique métier pure

**Files:**
- Modify: `src/types.ts` (ajout en fin de fichier)
- Create: `src/lib/ecrevisses.ts`
- Test: `src/lib/ecrevisses.test.ts`

**Interfaces:**
- Consumes: `uid`, `isoDay`, `frDate` de `src/lib/helpers.ts`
- Produces: les interfaces `Balance`, `CrayfishTally`, `CrayfishSession` (`src/types.ts`) ; et depuis `src/lib/ecrevisses.ts` : `MAX_BALANCES`, `DEFAULT_BALANCES`, `DEFAULT_INTERVAL_MIN`, `STALE_SESSION_MS`, `type BalanceState`, `dueAt`, `balanceState`, `remainingSec`, `fmtDuration`, `notifKey`, `dueBalances`, `sortBalances`, `nextDue`, `makeBalances`, `createSession`, `poseBalance`, `poseAll`, `releveBalance`, `updateBalance`, `removeBalance`, `addBalance`, `addTally`, `tallyTotal`, `currentSession`, `isStaleSession`

- [ ] **Step 1: Ajouter les trois interfaces dans `src/types.ts`**

À la fin de `src/types.ts` :

```ts
/** Une balance à écrevisses dans une séance, persistée en IndexedDB.
 *  `poseeA` est un horodatage ABSOLU : l'état se recalcule à l'affichage, il
 *  n'est jamais décrémenté — la séance survit donc au gel de l'app. */
export interface Balance {
  id: string; // stable local id
  n: number; // displayed number (1…N)
  label?: string; // free label ("sous le saule")
  intervalMin: number; // soak time for THIS balance (seeded from the session default)
  poseeA: number | null; // ms timestamp of the drop; null = not in the water yet
  releves: number; // how many times it has been lifted (shown on the card)
}

/** Total capturé pour une espèce, saisi au bilan de fin de séance. */
export interface CrayfishTally {
  spId: string; // id in data/ecrevisses.ts
  count: number;
}

/** Une séance de pêche aux écrevisses. Une seule "en cours" (fin === null) à la fois. */
export interface CrayfishSession {
  id: string;
  iso: string; // yyyy-mm-dd
  date: string; // display date (frDate)
  debut: number; // ms timestamp
  fin: number | null; // null while the session is running
  lieu: string;
  spotId?: string; // linked personal spot
  intervalMin: number; // session default soak time
  balances: Balance[];
  tally: CrayfishTally[]; // filled in at the bilan
  note?: string;
}
```

- [ ] **Step 2: Écrire les tests de la logique — ils doivent échouer**

Créer `src/lib/ecrevisses.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import {
  MAX_BALANCES,
  balanceState,
  remainingSec,
  fmtDuration,
  notifKey,
  dueBalances,
  sortBalances,
  nextDue,
  makeBalances,
  createSession,
  poseBalance,
  poseAll,
  releveBalance,
  updateBalance,
  removeBalance,
  addBalance,
  addTally,
  tallyTotal,
  currentSession,
  isStaleSession,
} from "./ecrevisses";
import type { Balance, CrayfishSession } from "../types";

const T0 = 1_700_000_000_000; // instant de référence arbitraire
const MIN = 60_000;

function bal(over: Partial<Balance> = {}): Balance {
  return { id: "b1", n: 1, intervalMin: 30, poseeA: null, releves: 0, ...over };
}

describe("balanceState", () => {
  it("balance non posée → vide", () => {
    expect(balanceState(bal(), T0)).toBe("vide");
  });

  it("balance posée, avant l'échéance → trempe", () => {
    expect(balanceState(bal({ poseeA: T0 }), T0 + 29 * MIN)).toBe("trempe");
  });

  it("à l'échéance exacte → échue (la borne bascule)", () => {
    expect(balanceState(bal({ poseeA: T0 }), T0 + 30 * MIN)).toBe("echue");
  });

  it("une milliseconde avant l'échéance → encore en trempe", () => {
    expect(balanceState(bal({ poseeA: T0 }), T0 + 30 * MIN - 1)).toBe("trempe");
  });

  it("l'intervalle propre à la balance prime sur celui de la séance", () => {
    const b = bal({ poseeA: T0, intervalMin: 60 });
    expect(balanceState(b, T0 + 45 * MIN)).toBe("trempe");
    expect(balanceState(b, T0 + 60 * MIN)).toBe("echue");
  });
});

describe("remainingSec", () => {
  it("null quand la balance n'est pas posée", () => {
    expect(remainingSec(bal(), T0)).toBeNull();
  });

  it("positif pendant la trempe", () => {
    expect(remainingSec(bal({ poseeA: T0 }), T0 + 10 * MIN)).toBe(20 * 60);
  });

  it("négatif après l'échéance — retard après un gel de 45 min", () => {
    expect(remainingSec(bal({ poseeA: T0 }), T0 + 45 * MIN)).toBe(-15 * 60);
  });
});

describe("fmtDuration", () => {
  it("formate en m:ss sous l'heure", () => {
    expect(fmtDuration(125)).toBe("2:05");
  });

  it("formate en h:mm:ss au-delà", () => {
    expect(fmtDuration(3725)).toBe("1:02:05");
  });

  it("ignore le signe (le retard est affiché avec son propre libellé)", () => {
    expect(fmtDuration(-125)).toBe("2:05");
  });
});

describe("sortBalances", () => {
  it("échues d'abord (plus en retard en tête), puis trempe, puis vides", () => {
    const balances = [
      bal({ id: "vide", n: 4 }),
      bal({ id: "trempe", n: 3, poseeA: T0 + 20 * MIN }),
      bal({ id: "retard-court", n: 2, poseeA: T0 - 5 * MIN }),
      bal({ id: "retard-long", n: 1, poseeA: T0 - 20 * MIN }),
    ];
    const ids = sortBalances(balances, T0 + 30 * MIN).map((b) => b.id);
    expect(ids).toEqual(["retard-long", "retard-court", "trempe", "vide"]);
  });

  it("ne mute pas le tableau reçu", () => {
    const balances = [bal({ id: "a", n: 2 }), bal({ id: "b", n: 1 })];
    sortBalances(balances, T0);
    expect(balances.map((b) => b.id)).toEqual(["a", "b"]);
  });
});

describe("nextDue", () => {
  it("rend la balance dont l'échéance est la plus proche", () => {
    const balances = [
      bal({ id: "a", n: 1, poseeA: T0 }),
      bal({ id: "b", n: 2, poseeA: T0 + 5 * MIN }),
    ];
    const r = nextDue(balances, T0 + 10 * MIN);
    expect(r?.balance.id).toBe("a");
    expect(r?.inSec).toBe(20 * 60);
  });

  it("null quand aucune balance n'est en trempe", () => {
    expect(nextDue([bal(), bal({ id: "x", poseeA: T0 - 60 * MIN })], T0)).toBeNull();
  });
});

describe("makeBalances", () => {
  it("numérote de 1 à N et sème l'intervalle de la séance", () => {
    const bs = makeBalances(3, 45);
    expect(bs.map((b) => b.n)).toEqual([1, 2, 3]);
    expect(bs.every((b) => b.intervalMin === 45)).toBe(true);
    expect(bs.every((b) => b.poseeA === null)).toBe(true);
  });

  it("plafonne au maximum réglementaire", () => {
    expect(makeBalances(99, 30)).toHaveLength(MAX_BALANCES);
  });

  it("plancher à une balance", () => {
    expect(makeBalances(0, 30)).toHaveLength(1);
  });

  it("donne des identifiants distincts", () => {
    const ids = new Set(makeBalances(6, 30).map((b) => b.id));
    expect(ids.size).toBe(6);
  });
});

describe("poseBalance / poseAll", () => {
  it("horodate la balance visée et ne touche pas les autres", () => {
    const s = createSession({ count: 2, intervalMin: 30, lieu: "Étang", now: T0 });
    const target = s.balances[0].id;
    const next = poseBalance(s, target, T0 + MIN);
    expect(next.balances[0].poseeA).toBe(T0 + MIN);
    expect(next.balances[1].poseeA).toBeNull();
  });

  it("ne mute pas la séance reçue", () => {
    const s = createSession({ count: 2, intervalMin: 30, lieu: "Étang", now: T0 });
    poseBalance(s, s.balances[0].id, T0 + MIN);
    expect(s.balances[0].poseeA).toBeNull();
  });

  it("poseAll ne pose que les balances vides", () => {
    const s = createSession({ count: 3, intervalMin: 30, lieu: "Étang", now: T0 });
    const partial = poseBalance(s, s.balances[0].id, T0);
    const all = poseAll(partial, T0 + 5 * MIN);
    expect(all.balances[0].poseeA).toBe(T0); // déjà posée : inchangée
    expect(all.balances[1].poseeA).toBe(T0 + 5 * MIN);
    expect(all.balances[2].poseeA).toBe(T0 + 5 * MIN);
  });
});

describe("releveBalance", () => {
  it("réhorodate et incrémente le compteur de relèves", () => {
    const s = createSession({ count: 1, intervalMin: 30, lieu: "Étang", now: T0 });
    const id = s.balances[0].id;
    const posed = poseBalance(s, id, T0);
    const next = releveBalance(posed, id, T0 + 31 * MIN);
    expect(next.balances[0].poseeA).toBe(T0 + 31 * MIN);
    expect(next.balances[0].releves).toBe(1);
  });

  it("repose=false laisse la balance vide après la relève", () => {
    const s = createSession({ count: 1, intervalMin: 30, lieu: "Étang", now: T0 });
    const id = s.balances[0].id;
    const next = releveBalance(poseBalance(s, id, T0), id, T0 + 31 * MIN, false);
    expect(next.balances[0].poseeA).toBeNull();
    expect(next.balances[0].releves).toBe(1);
  });
});

describe("updateBalance / removeBalance / addBalance", () => {
  it("updateBalance applique le patch à la seule balance visée", () => {
    const s = createSession({ count: 2, intervalMin: 30, lieu: "Étang", now: T0 });
    const next = updateBalance(s, s.balances[1].id, { intervalMin: 60, label: "sous le saule" });
    expect(next.balances[1].intervalMin).toBe(60);
    expect(next.balances[1].label).toBe("sous le saule");
    expect(next.balances[0].intervalMin).toBe(30);
  });

  it("removeBalance retire la balance et renumérote les suivantes", () => {
    const s = createSession({ count: 3, intervalMin: 30, lieu: "Étang", now: T0 });
    const next = removeBalance(s, s.balances[0].id);
    expect(next.balances).toHaveLength(2);
    expect(next.balances.map((b) => b.n)).toEqual([1, 2]);
  });

  it("addBalance ajoute une balance vide numérotée à la suite", () => {
    const s = createSession({ count: 2, intervalMin: 30, lieu: "Étang", now: T0 });
    const next = addBalance(s);
    expect(next.balances).toHaveLength(3);
    expect(next.balances[2].n).toBe(3);
    expect(next.balances[2].poseeA).toBeNull();
  });

  it("addBalance refuse de dépasser le plafond réglementaire", () => {
    let s = createSession({ count: MAX_BALANCES, intervalMin: 30, lieu: "Étang", now: T0 });
    s = addBalance(s);
    expect(s.balances).toHaveLength(MAX_BALANCES);
  });
});

describe("addTally / tallyTotal", () => {
  it("crée la ligne à la première incrémentation", () => {
    expect(addTally([], "louisiane", 1)).toEqual([{ spId: "louisiane", count: 1 }]);
  });

  it("fusionne deux saisies pour la même espèce", () => {
    const t = addTally(addTally([], "louisiane", 3), "louisiane", 2);
    expect(t).toEqual([{ spId: "louisiane", count: 5 }]);
  });

  it("ne descend jamais sous zéro", () => {
    expect(addTally([{ spId: "signal", count: 1 }], "signal", -5)).toEqual([
      { spId: "signal", count: 0 },
    ]);
  });

  it("totalise toutes les espèces", () => {
    expect(
      tallyTotal([
        { spId: "louisiane", count: 12 },
        { spId: "signal", count: 3 },
      ]),
    ).toBe(15);
  });
});

describe("currentSession / isStaleSession", () => {
  it("rend la séance dont fin est null", () => {
    const finie = { ...createSession({ count: 1, intervalMin: 30, lieu: "A", now: T0 }), id: "f", fin: T0 };
    const ouverte = { ...createSession({ count: 1, intervalMin: 30, lieu: "B", now: T0 }), id: "o" };
    expect(currentSession([finie, ouverte])?.id).toBe("o");
  });

  it("null quand toutes les séances sont terminées", () => {
    const finie = { ...createSession({ count: 1, intervalMin: 30, lieu: "A", now: T0 }), fin: T0 };
    expect(currentSession([finie])).toBeNull();
  });

  it("une séance ouverte depuis plus de 12 h est considérée oubliée", () => {
    const s = createSession({ count: 1, intervalMin: 30, lieu: "A", now: T0 });
    expect(isStaleSession(s, T0 + 11 * 3600_000)).toBe(false);
    expect(isStaleSession(s, T0 + 13 * 3600_000)).toBe(true);
  });

  it("une séance terminée n'est jamais oubliée", () => {
    const s = { ...createSession({ count: 1, intervalMin: 30, lieu: "A", now: T0 }), fin: T0 };
    expect(isStaleSession(s, T0 + 48 * 3600_000)).toBe(false);
  });
});

describe("dueBalances / notifKey", () => {
  it("ne rend que les balances échues non encore notifiées", () => {
    const a = bal({ id: "a", poseeA: T0 });
    const b = bal({ id: "b", poseeA: T0 + 10 * MIN });
    const now = T0 + 35 * MIN; // a est échue, b non
    expect(dueBalances([a, b], now, new Set()).map((x) => x.id)).toEqual(["a"]);
    expect(dueBalances([a, b], now, new Set([notifKey(a)]))).toEqual([]);
  });

  it("une balance reposée redevient notifiable (la clé suit l'échéance)", () => {
    const a = bal({ id: "a", poseeA: T0 });
    const notified = new Set([notifKey(a)]);
    const reposee = { ...a, poseeA: T0 + 31 * MIN };
    expect(dueBalances([reposee], T0 + 62 * MIN, notified).map((x) => x.id)).toEqual(["a"]);
  });
});
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test -- src/lib/ecrevisses.test.ts`
Expected: FAIL — `Failed to resolve import "./ecrevisses"`.

- [ ] **Step 4: Écrire la logique pure**

Créer `src/lib/ecrevisses.ts` :

```ts
// Crayfish session logic — pure, clock-free. Every function takes `now` as a
// parameter and returns new objects: a balance's state is RECOMPUTED from its
// absolute drop timestamp, never decremented. That is what makes a session
// survive the app being backgrounded, frozen or killed by Android, and what
// makes all of this testable in milliseconds.

import type { Balance, CrayfishSession, CrayfishTally } from "../types";
import { uid, isoDay, frDate } from "./helpers";

/** National rule: 6 balances per angler, up to 10 in some départements. */
export const DEFAULT_BALANCES = 6;
export const MAX_BALANCES = 10;
export const DEFAULT_INTERVAL_MIN = 30;
/** Past this, a still-open session is treated as forgotten (banner, no auto-close). */
export const STALE_SESSION_MS = 12 * 3600_000;

export type BalanceState = "vide" | "trempe" | "echue";

/** Absolute due timestamp, or null when the balance isn't in the water. */
export function dueAt(b: Balance): number | null {
  return b.poseeA === null ? null : b.poseeA + b.intervalMin * 60_000;
}

export function balanceState(b: Balance, now: number): BalanceState {
  const d = dueAt(b);
  if (d === null) return "vide";
  return now >= d ? "echue" : "trempe";
}

/** Seconds left (positive) or overdue (negative). null when not dropped. */
export function remainingSec(b: Balance, now: number): number | null {
  const d = dueAt(b);
  if (d === null) return null;
  return Math.round((d - now) / 1000);
}

/** m:ss, or h:mm:ss past the hour. Sign-agnostic — the caller words the delay. */
export function fmtDuration(sec: number): string {
  const s = Math.abs(Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** Notification identity: balance + its CURRENT due date, so a balance that has
 *  been lifted and dropped again becomes notifiable anew. */
export function notifKey(b: Balance): string {
  return b.id + ":" + (dueAt(b) ?? 0);
}

export function dueBalances(balances: Balance[], now: number, notified: Set<string>): Balance[] {
  return balances.filter((b) => balanceState(b, now) === "echue" && !notified.has(notifKey(b)));
}

/** Display order: overdue first (longest overdue on top), then soaking (closest
 *  to due first), then empty ones by number. Never mutates the input. */
export function sortBalances(balances: Balance[], now: number): Balance[] {
  const rank: Record<BalanceState, number> = { echue: 0, trempe: 1, vide: 2 };
  return [...balances].sort((a, b) => {
    const ra = rank[balanceState(a, now)];
    const rb = rank[balanceState(b, now)];
    if (ra !== rb) return ra - rb;
    const sa = remainingSec(a, now);
    const sb = remainingSec(b, now);
    if (sa === null || sb === null) return a.n - b.n;
    return sa - sb;
  });
}

/** The soonest balance still soaking, or null. */
export function nextDue(balances: Balance[], now: number): { balance: Balance; inSec: number } | null {
  let best: { balance: Balance; inSec: number } | null = null;
  for (const b of balances) {
    if (balanceState(b, now) !== "trempe") continue;
    const inSec = remainingSec(b, now) as number;
    if (!best || inSec < best.inSec) best = { balance: b, inSec };
  }
  return best;
}

export function makeBalances(count: number, intervalMin: number): Balance[] {
  const n = Math.max(1, Math.min(MAX_BALANCES, Math.floor(count) || 1));
  return Array.from({ length: n }, (_, i) => ({
    id: uid("b"),
    n: i + 1,
    intervalMin,
    poseeA: null,
    releves: 0,
  }));
}

export function createSession(opts: {
  count: number;
  intervalMin: number;
  lieu: string;
  spotId?: string;
  now: number;
}): CrayfishSession {
  const d = new Date(opts.now);
  return {
    id: uid("cs"),
    iso: isoDay(d),
    date: frDate(d),
    debut: opts.now,
    fin: null,
    lieu: opts.lieu,
    spotId: opts.spotId,
    intervalMin: opts.intervalMin,
    balances: makeBalances(opts.count, opts.intervalMin),
    tally: [],
  };
}

function mapBalances(
  s: CrayfishSession,
  fn: (b: Balance) => Balance,
): CrayfishSession {
  return { ...s, balances: s.balances.map(fn) };
}

export function poseBalance(s: CrayfishSession, id: string, now: number): CrayfishSession {
  return mapBalances(s, (b) => (b.id === id ? { ...b, poseeA: now } : b));
}

/** Drop every balance still out of the water — the "je lance la batterie" button. */
export function poseAll(s: CrayfishSession, now: number): CrayfishSession {
  return mapBalances(s, (b) => (b.poseeA === null ? { ...b, poseeA: now } : b));
}

/** Lift a balance. By default it goes straight back in the water (one gesture). */
export function releveBalance(
  s: CrayfishSession,
  id: string,
  now: number,
  repose = true,
): CrayfishSession {
  return mapBalances(s, (b) =>
    b.id === id ? { ...b, poseeA: repose ? now : null, releves: b.releves + 1 } : b,
  );
}

export function updateBalance(
  s: CrayfishSession,
  id: string,
  patch: Partial<Balance>,
): CrayfishSession {
  return mapBalances(s, (b) => (b.id === id ? { ...b, ...patch } : b));
}

/** Remove a balance and renumber the rest so the displayed numbers stay 1…N. */
export function removeBalance(s: CrayfishSession, id: string): CrayfishSession {
  const kept = s.balances.filter((b) => b.id !== id);
  return { ...s, balances: kept.map((b, i) => ({ ...b, n: i + 1 })) };
}

/** Add an empty balance, refusing to exceed the regulatory cap. */
export function addBalance(s: CrayfishSession): CrayfishSession {
  if (s.balances.length >= MAX_BALANCES) return s;
  const b: Balance = {
    id: uid("b"),
    n: s.balances.length + 1,
    intervalMin: s.intervalMin,
    poseeA: null,
    releves: 0,
  };
  return { ...s, balances: [...s.balances, b] };
}

/** Add `delta` to a species' count, creating the row on first use. Never negative. */
export function addTally(tally: CrayfishTally[], spId: string, delta: number): CrayfishTally[] {
  const found = tally.some((t) => t.spId === spId);
  if (!found) return [...tally, { spId, count: Math.max(0, delta) }];
  return tally.map((t) => (t.spId === spId ? { ...t, count: Math.max(0, t.count + delta) } : t));
}

export function tallyTotal(tally: CrayfishTally[]): number {
  return tally.reduce((sum, t) => sum + t.count, 0);
}

export function currentSession(sessions: CrayfishSession[]): CrayfishSession | null {
  return sessions.find((s) => s.fin === null) ?? null;
}

/** A session left open for more than 12 h: the UI offers to close it, and never
 *  closes it on its own — that would silently lose the bilan. */
export function isStaleSession(s: CrayfishSession, now: number): boolean {
  return s.fin === null && now - s.debut > STALE_SESSION_MS;
}
```

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils passent**

Run: `npm test -- src/lib/ecrevisses.test.ts`
Expected: PASS — tous les tests verts.

- [ ] **Step 6: Vérifier lint et types**

Run: `npm run lint && npx tsc -b`
Expected: aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/lib/ecrevisses.ts src/lib/ecrevisses.test.ts
git commit -m "Écrevisses : modèle de séance et logique pure (horodatage absolu)"
```

---

### Task 2 : Données espèces et réglementation

**Files:**
- Create: `src/data/ecrevisses.ts`
- Test: `src/data/ecrevisses.test.ts`

**Interfaces:**
- Consumes: rien
- Produces: `interface Crayfish`, `ECREVISSES: Crayfish[]`, `PECHABLES: Crayfish[]`, `crayfishById(id: string): Crayfish | undefined`, `REG_BALANCES: string[]`, `REG_SOURCE: string`, `MAILLE_NOTE: string`

- [ ] **Step 1: Écrire les tests de cohérence — ils doivent échouer**

Créer `src/data/ecrevisses.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { ECREVISSES, PECHABLES, crayfishById, REG_BALANCES, MAILLE_NOTE } from "./ecrevisses";

describe("données écrevisses", () => {
  it("couvre les cinq espèces attendues", () => {
    expect(ECREVISSES.map((e) => e.id).sort()).toEqual(
      ["americaine", "louisiane", "pattes-blanches", "pattes-rouges", "signal"].sort(),
    );
  });

  it("les identifiants sont uniques", () => {
    expect(new Set(ECREVISSES.map((e) => e.id)).size).toBe(ECREVISSES.length);
  });

  it("exactement trois espèces pêchables", () => {
    expect(PECHABLES.map((e) => e.id).sort()).toEqual(["americaine", "louisiane", "signal"]);
  });

  it("les deux espèces protégées ne sont pas pêchables", () => {
    expect(crayfishById("pattes-blanches")?.pechable).toBe(false);
    expect(crayfishById("pattes-rouges")?.pechable).toBe(false);
  });

  it("chaque espèce pêchable rappelle l'interdiction de remise à l'eau vivante", () => {
    for (const e of PECHABLES) expect(e.note).toMatch(/vivante?/i);
  });

  it("chaque espèce protégée impose la remise à l'eau", () => {
    for (const e of ECREVISSES.filter((x) => !x.pechable)) {
      expect(e.note).toMatch(/remise à l'eau/i);
    }
  });

  it("crayfishById rend undefined pour un id inconnu", () => {
    expect(crayfishById("truite")).toBeUndefined();
  });

  it("le rappel réglementaire cite le plafond de balances et le diamètre", () => {
    const txt = REG_BALANCES.join(" ");
    expect(txt).toMatch(/6 balances/);
    expect(txt).toMatch(/30 cm/);
  });

  it("la maille de 9 cm n'est jamais présentée comme une autorisation", () => {
    expect(MAILLE_NOTE).toMatch(/9 cm/);
    expect(MAILLE_NOTE).toMatch(/protégée/i);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test -- src/data/ecrevisses.test.ts`
Expected: FAIL — `Failed to resolve import "./ecrevisses"`.

- [ ] **Step 3: Écrire les données**

Créer `src/data/ecrevisses.ts` :

```ts
// The five crayfish an angler meets in Centre-Val de Loire. Regulatory wording
// follows the house rule: the national figure first, the préfectoral arrêté
// always as the last word — never a bare green light.

export interface Crayfish {
  id: string;
  name: string;
  latin: string;
  /** true = fishable (invasive); false = nationally protected. */
  pechable: boolean;
  /** The one sentence that matters when the balance comes out of the water. */
  note: string;
}

export const ECREVISSES: Crayfish[] = [
  {
    id: "louisiane",
    name: "Écrevisse de Louisiane",
    latin: "Procambarus clarkii",
    pechable: true,
    note: "Pêchable — remise à l'eau vivante et transport vivant interdits (R432-5).",
  },
  {
    id: "americaine",
    name: "Écrevisse américaine",
    latin: "Faxonius limosus",
    pechable: true,
    note: "Pêchable — remise à l'eau vivante et transport vivant interdits (R432-5).",
  },
  {
    id: "signal",
    name: "Écrevisse signal",
    latin: "Pacifastacus leniusculus",
    pechable: true,
    note: "Pêchable — remise à l'eau vivante et transport vivant interdits (R432-5).",
  },
  {
    id: "pattes-blanches",
    name: "Écrevisse à pattes blanches",
    latin: "Austropotamobius pallipes",
    pechable: false,
    note: "Espèce protégée — remise à l'eau immédiate, sans la sortir de l'eau si possible.",
  },
  {
    id: "pattes-rouges",
    name: "Écrevisse à pattes rouges",
    latin: "Astacus astacus",
    pechable: false,
    note: "Espèce protégée dans les départements couverts — remise à l'eau immédiate.",
  },
];

export const PECHABLES = ECREVISSES.filter((e) => e.pechable);

export function crayfishById(id: string): Crayfish | undefined {
  return ECREVISSES.find((e) => e.id === id);
}

/** Shown on the session setup screen. */
export const REG_BALANCES = [
  "6 balances au maximum par pêcheur (repère national) — jusqu'à 10 dans certains départements.",
  "Diamètre maximal d'une balance : 30 cm.",
  "Périodes et cours d'eau autorisés : vérifiez l'arrêté préfectoral en vigueur.",
];

export const REG_SOURCE = "Code de l'environnement, art. R436-23 à R436-29 · R432-5";

/** The 9 cm figure exists (R436-18) but the species it targets is protected here:
 *  it is displayed WITH that caveat, never as a permission. */
export const MAILLE_NOTE =
  "Une maille de 9 cm figure au R436-18 pour l'écrevisse à pattes rouges, mais cette espèce est protégée dans les départements couverts (23 · 36 · 41) : elle ne se pêche pas. Les trois espèces pêchables n'ont pas de taille minimale.";
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npm test -- src/data/ecrevisses.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/ecrevisses.ts src/data/ecrevisses.test.ts
git commit -m "Écrevisses : les 5 espèces et les repères réglementaires"
```

---

### Task 3 : Persistance IndexedDB et store

**Files:**
- Modify: `src/lib/db.ts`
- Modify: `src/store.tsx`

**Interfaces:**
- Consumes: `CrayfishSession` (Task 1)
- Produces: `loadCrayfish(): Promise<CrayfishSession[]>`, `saveCrayfish(sessions: CrayfishSession[]): Promise<void>` (db) ; dans le store : l'état `crayfish: CrayfishSession[]`, l'écran `"ecrevisses"` dans le type `Screen`, et les actions `addCrayfishSession(s: CrayfishSession): void`, `saveCrayfishSession(s: CrayfishSession): void` (upsert par id), `removeCrayfishSession(id: string): void`

- [ ] **Step 1: Ajouter le chargement / la sauvegarde dans `src/lib/db.ts`**

Ajouter l'import du type dans la ligne 2 existante :

```ts
import type { Catch, Spot, GearItem, Profile, PersonalRecipe, CrayfishSession } from "../types";
```

Ajouter la clé auprès des autres (après `RECIPES_KEY`) :

```ts
const CRAYFISH_KEY = "carnet:crayfish";
```

Puis, à la fin du fichier :

```ts
// Crayfish sessions — device-only, same guarantees as the rest of the notebook.
export async function loadCrayfish(): Promise<CrayfishSession[]> {
  return (await get<CrayfishSession[]>(CRAYFISH_KEY)) ?? [];
}

export async function saveCrayfish(sessions: CrayfishSession[]): Promise<void> {
  try {
    await set(CRAYFISH_KEY, sessions);
    clearPersistError();
  } catch (e) {
    reportPersistError(e); // keep working in memory, but warn the user
  }
}
```

- [ ] **Step 2: Câbler le store — type d'écran, état, hydratation, persistance**

Dans `src/store.tsx` :

1. Ajouter `"ecrevisses"` au type `Screen`, après `"stockage"` :

```ts
  | "stockage"
  | "ecrevisses";
```

2. Étendre l'import de types (ligne 10) :

```ts
import type { Catch, Species, Spot, GearItem, Profile, PersonalRecipe, CrayfishSession } from "./types";
```

3. Étendre l'import de `./lib/db` (ligne 12-24) en ajoutant `loadCrayfish,` et `saveCrayfish,` avant `runMigrations,`.

4. Ajouter le champ à `AppState`, après `recipes: PersonalRecipe[];` :

```ts
  crayfish: CrayfishSession[];
```

5. Ajouter la valeur initiale dans `initialState`, après `recipes: [],` :

```ts
  crayfish: [],
```

6. Dans l'effet d'hydratation, ajouter le chargement au `Promise.all` :

```ts
      const [catches, spots, gear, profile, recipes, crayfish] = await Promise.all([
        safe(loadCatches(), [] as Catch[]),
        safe(loadSpots(), [] as Spot[]),
        safe(loadGear(), [] as GearItem[]),
        safe(loadProfile(), { name: "", bio: "", region: "" } as Profile),
        safe(loadRecipes(), [] as PersonalRecipe[]),
        safe(loadCrayfish(), [] as CrayfishSession[]),
      ]);
```

et dans le `dispatch` qui suit, ajouter la fusion (même logique que `catches` : ne pas écraser une séance démarrée avant la fin du chargement) :

```ts
        crayfish: [...s.crayfish, ...crayfish],
```

7. Ajouter l'effet de persistance, à la suite de celui des recettes :

```ts
  useEffect(() => {
    if (!state.hydrated || !state.loadOk) return;
    saveCrayfish(state.crayfish);
  }, [state.crayfish, state.hydrated, state.loadOk]);
```

- [ ] **Step 3: Ajouter les trois actions**

Dans l'interface `Store`, après `removeRecipe` :

```ts
  addCrayfishSession: (session: CrayfishSession) => void;
  saveCrayfishSession: (session: CrayfishSession) => void;
  removeCrayfishSession: (id: string) => void;
```

Dans le `useMemo` des actions, avant le `return { … }` :

```ts
    // Crayfish sessions. The screen computes the next session with the pure
    // helpers of lib/ecrevisses and hands the whole object back — the store is
    // deliberately thin glue here, so all the logic stays testable.
    const addCrayfishSession: Store["addCrayfishSession"] = (session) =>
      dispatch((s) => ({ crayfish: [session, ...s.crayfish] }));
    const saveCrayfishSession: Store["saveCrayfishSession"] = (session) =>
      dispatch((s) => ({ crayfish: s.crayfish.map((c) => (c.id === session.id ? session : c)) }));
    const removeCrayfishSession: Store["removeCrayfishSession"] = (id) =>
      dispatch((s) => ({ crayfish: s.crayfish.filter((c) => c.id !== id) }));
```

et les ajouter à l'objet retourné, après `removeRecipe,` :

```ts
      addCrayfishSession,
      saveCrayfishSession,
      removeCrayfishSession,
```

- [ ] **Step 4: Vérifier types, lint et suite de tests**

Run: `npx tsc -b && npm run lint && npm test`
Expected: aucune erreur, tous les tests verts (aucune régression sur les tests existants).

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts src/store.tsx
git commit -m "Écrevisses : persistance IndexedDB et actions de séance"
```

---

### Task 4 : Notifications et WakeLock généralisé

**Files:**
- Create: `src/lib/notify.ts`
- Modify: `src/lib/wakelock.ts`

**Interfaces:**
- Consumes: rien
- Produces: depuis `src/lib/notify.ts` : `notifySupported(): boolean`, `notifyPermission(): NotificationPermission | "unsupported"`, `askNotifyPermission(): Promise<boolean>`, `notifyBalance(n: number, label: string | undefined, lateSec: number, tag: string): Promise<void>` ; depuis `src/lib/wakelock.ts` : `requestWake(): void`, `releaseWake(): void`, `wakeSupported(): boolean` (et `enterCuisine` / `exitCuisine` inchangés à l'usage)

- [ ] **Step 1: Généraliser `src/lib/wakelock.ts`**

Remplacer intégralement le contenu du fichier par :

```ts
// Keep the screen awake while hands are busy: cook mode, and the crayfish
// session when the angler asks for a guaranteed on-time alert.
// The system releases the lock whenever the page is hidden, so we re-acquire it
// on the way back — otherwise the lock silently dies on the first screen-off.

type Lock = { release: () => void };
interface WakeNav {
  wakeLock?: { request: (t: string) => Promise<Lock> };
}

let lock: Lock | null = null;
let wanted = false;
let listening = false;

function acquire() {
  try {
    const nav = navigator as unknown as WakeNav;
    if (!nav.wakeLock) return;
    nav.wakeLock
      .request("screen")
      .then((l) => {
        lock = l;
      })
      .catch(() => {});
  } catch {
    /* not supported — ignore */
  }
}

function onVisibility() {
  if (wanted && document.visibilityState === "visible") acquire();
}

/** Ask for the screen to stay on. Idempotent. */
export function requestWake(): void {
  wanted = true;
  if (!listening) {
    document.addEventListener("visibilitychange", onVisibility);
    listening = true;
  }
  acquire();
}

/** Release the lock and stop re-acquiring it. Idempotent. */
export function releaseWake(): void {
  wanted = false;
  if (listening) {
    document.removeEventListener("visibilitychange", onVisibility);
    listening = false;
  }
  try {
    lock?.release();
  } catch {
    /* ignore */
  }
  lock = null;
}

/** True when the platform can keep the screen awake at all. */
export function wakeSupported(): boolean {
  try {
    return !!(navigator as unknown as WakeNav).wakeLock;
  } catch {
    return false;
  }
}

export function enterCuisine(navigate: () => void) {
  navigate();
  requestWake();
}

export function exitCuisine(back: () => void) {
  releaseWake();
  back();
}
```

- [ ] **Step 2: Écrire `src/lib/notify.ts`**

```ts
// Local notifications for the crayfish session.
//
// Hard platform limit, stated plainly: the Notification Triggers API
// (TimestampTrigger), which would let us schedule a notification ahead of time,
// never shipped — it still needs a Chrome flag. Without a push server (excluded:
// it would break the "100% offline, nothing is transmitted" promise), a PWA
// cannot alert once Android has frozen the page. So notifications fire while the
// app is alive, and the screen catches up from the timestamps on every return.

export function notifySupported(): boolean {
  return typeof Notification !== "undefined" && "serviceWorker" in navigator;
}

export function notifyPermission(): NotificationPermission | "unsupported" {
  if (!notifySupported()) return "unsupported";
  return Notification.permission;
}

/** Ask once, at the start of the first session — never at app launch. */
export async function askNotifyPermission(): Promise<boolean> {
  if (!notifySupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/** Notify that a balance is due. `tag` makes a balance's notifications replace
 *  each other instead of stacking. Falls back to vibration alone. */
export async function notifyBalance(
  n: number,
  label: string | undefined,
  lateSec: number,
  tag: string,
): Promise<void> {
  navigator.vibrate?.([200, 120, 200]);
  if (!notifySupported() || Notification.permission !== "granted") return;
  const late = Math.max(0, Math.round(lateSec / 60));
  const body = late > 0 ? `À relever depuis ${late} min` : "À relever maintenant";
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(`Balance ${n}${label ? " · " + label : ""}`, {
      body,
      tag,
      renotify: true,
      requireInteraction: true,
      badge: "./icon-192.png",
      icon: "./icon-192.png",
    } as NotificationOptions);
  } catch {
    /* vibration already fired — nothing more we can do */
  }
}
```

- [ ] **Step 3: Vérifier que les icônes référencées existent**

Run: `ls public/`
Expected: le dossier contient `icon-192.png`. **Si ce n'est pas le cas**, relever le nom réel des icônes et corriger les champs `badge` / `icon` en conséquence ; si aucune icône PNG n'existe, supprimer ces deux champs (ils sont optionnels).

- [ ] **Step 4: Vérifier que le mode cuisine n'a pas régressé**

Run: `grep -rn "enterCuisine\|exitCuisine" src/`
Expected: les appelants existants compilent sans changement (mêmes signatures).

Run: `npx tsc -b && npm run lint && npm test`
Expected: aucune erreur, tests verts.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notify.ts src/lib/wakelock.ts
git commit -m "Écrevisses : notifications locales et WakeLock réutilisable"
```

---

### Task 5 : Carte d'une balance

**Files:**
- Create: `src/components/BalanceCard.tsx`
- Modify: `src/styles.css` (ajout en fin de fichier)

**Interfaces:**
- Consumes: `Balance` (Task 1), `balanceState`, `remainingSec`, `fmtDuration` (Task 1)
- Produces: `BalanceCard` — props `{ b: Balance; now: number; expanded: boolean; onToggle: () => void; onPose: () => void; onReleve: () => void; onOptions: () => void }`

- [ ] **Step 1: Écrire le composant**

Créer `src/components/BalanceCard.tsx` :

```tsx
import type { Balance } from "../types";
import { balanceState, remainingSec, fmtDuration } from "../lib/ecrevisses";

/**
 * One balance in the session grid.
 *
 * Tap semantics are deliberate: an empty balance drops on a single tap, an
 * overdue one is lifted-and-redropped in the same gesture, but a SOAKING one
 * only expands — a stray tap must never silently reset a running countdown.
 */
export function BalanceCard({
  b,
  now,
  expanded,
  onToggle,
  onPose,
  onReleve,
  onOptions,
}: {
  b: Balance;
  now: number;
  expanded: boolean;
  onToggle: () => void;
  onPose: () => void;
  onReleve: () => void;
  onOptions: () => void;
}) {
  const st = balanceState(b, now);
  const rem = remainingSec(b, now);

  const main = st === "vide" ? "Poser" : fmtDuration(rem as number);
  const sub =
    st === "vide"
      ? "pas à l'eau"
      : st === "echue"
        ? "de retard — à relever"
        : "avant relève";

  return (
    <div className={"bal-card bal-" + st}>
      <button
        className="bal-main"
        onClick={st === "vide" ? onPose : st === "echue" ? onReleve : onToggle}
        aria-label={
          st === "vide"
            ? `Poser la balance ${b.n}`
            : st === "echue"
              ? `Relever la balance ${b.n}`
              : `Balance ${b.n}, ${fmtDuration(rem as number)} avant relève`
        }
      >
        <div className="bal-head">
          <span className="bal-n">{b.n}</span>
          {b.label && <span className="bal-lbl">{b.label}</span>}
          {b.releves > 0 && <span className="bal-rel">{b.releves} relève{b.releves > 1 ? "s" : ""}</span>}
        </div>
        <div className="bal-time">{main}</div>
        <div className="bal-sub">{sub}</div>
      </button>

      {expanded && st === "trempe" && (
        <div className="bal-actions">
          <button className="btn-light" onClick={onReleve}>
            Relever maintenant
          </button>
          <button className="btn-light" onClick={onOptions}>
            Options
          </button>
        </div>
      )}

      {st !== "trempe" && (
        <button className="bal-opt" onClick={onOptions} aria-label={`Options de la balance ${b.n}`}>
          ⋯
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Ajouter les styles**

À la fin de `src/styles.css` :

```css
/* ---- Écrevisses : grille de balances ---- */
.bal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.bal-card {
  position: relative;
  background: #fff;
  border: 1.5px solid var(--line-strong);
  border-radius: 16px;
  overflow: hidden;
}
.bal-card.bal-echue {
  border-color: var(--red);
  background: #fdf3f1;
}
.bal-card.bal-trempe {
  border-color: var(--fir);
}
.bal-main {
  width: 100%;
  border: none;
  background: transparent;
  padding: 14px 12px 12px;
  text-align: left;
  display: block;
}
.bal-head {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.bal-n {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--sand);
  font-size: 12px;
  font-weight: 700;
  color: var(--fir);
}
.bal-lbl {
  font-size: 12px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bal-rel {
  font-size: 11px;
  color: var(--brass-ink);
}
.bal-time {
  font-size: 27px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--ink);
  margin-top: 8px;
  font-variant-numeric: tabular-nums;
}
.bal-echue .bal-time {
  color: var(--red);
}
.bal-sub {
  font-size: 11.5px;
  color: var(--muted);
  margin-top: 2px;
}
.bal-actions {
  display: flex;
  gap: 6px;
  padding: 0 10px 10px;
}
.bal-actions button {
  flex: 1;
  font-size: 12.5px;
  padding: 8px 4px;
}
.bal-opt {
  position: absolute;
  top: 6px;
  right: 6px;
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 16px;
  line-height: 1;
  padding: 4px 8px;
}
```

- [ ] **Step 3: Vérifier types et lint**

Run: `npx tsc -b && npm run lint`
Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add src/components/BalanceCard.tsx src/styles.css
git commit -m "Écrevisses : carte d'une balance (états, compte à rebours)"
```

---

### Task 6 : Écran de séance, routage et points d'entrée

**Files:**
- Create: `src/screens/Ecrevisses.tsx`
- Modify: `src/App.tsx`
- Modify: `src/screens/Accueil.tsx:34-39` (tableau `TOOLS`)
- Modify: `src/screens/Outils.tsx:9-20` (tableau `rows`)
- Modify: `src/screens/OutilsTerrain.tsx:13-18` (preset `balances`)
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: tout ce que produisent les Tasks 1 à 5, plus `BilanEcrevisses` (Task 7 — créé ici avec un rendu minimal, complété en Task 7)
- Produces: `Ecrevisses` — composant d'écran sans props, monté sur `state.screen === "ecrevisses"`

- [ ] **Step 1: Écrire l'écran**

Créer `src/screens/Ecrevisses.tsx` :

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { BalanceCard } from "../components/BalanceCard";
import { BilanEcrevisses } from "../components/BilanEcrevisses";
import { REG_BALANCES, REG_SOURCE, MAILLE_NOTE } from "../data/ecrevisses";
import { requestWake, releaseWake, wakeSupported } from "../lib/wakelock";
import { askNotifyPermission, notifyPermission, notifyBalance } from "../lib/notify";
import {
  DEFAULT_BALANCES,
  DEFAULT_INTERVAL_MIN,
  MAX_BALANCES,
  createSession,
  currentSession,
  isStaleSession,
  poseAll,
  poseBalance,
  releveBalance,
  updateBalance,
  removeBalance,
  addBalance,
  sortBalances,
  nextDue,
  dueBalances,
  notifKey,
  fmtDuration,
  remainingSec,
} from "../lib/ecrevisses";
import type { CrayfishSession, Spot } from "../types";

const INTERVALS = [25, 30, 45, 60];

export function Ecrevisses() {
  const { state, back, addCrayfishSession, saveCrayfishSession } = useStore();
  const session = currentSession(state.crayfish);

  // One tick per second while a session is running: every displayed state is
  // recomputed from `now`, so nothing drifts and nothing is stored as a counter.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session]);

  // Recompute immediately on return from background — this is the catch-up path
  // that makes an overdue balance visible even after Android froze the page.
  useEffect(() => {
    const onVis = () => setNow(Date.now());
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, []);

  const [bilan, setBilan] = useState(false);

  if (bilan && session) {
    return <BilanEcrevisses session={session} onClose={() => setBilan(false)} />;
  }

  return session ? (
    <SessionEnCours
      session={session}
      now={now}
      onSave={saveCrayfishSession}
      onFinish={() => setBilan(true)}
      onBack={back}
    />
  ) : (
    <Preparation onBack={back} onStart={(s) => addCrayfishSession(s)} spots={state.spots} />
  );
}

/* ---------------- Préparation ---------------- */

function Preparation({
  onBack,
  onStart,
  spots,
}: {
  onBack: () => void;
  onStart: (s: CrayfishSession) => void;
  spots: Spot[];
}) {
  const [count, setCount] = useState(DEFAULT_BALANCES);
  const [trempe, setTrempe] = useState(DEFAULT_INTERVAL_MIN);
  const [lieu, setLieu] = useState("");
  const [spotId, setSpotId] = useState("");

  // Picking a personal spot fills the free-text place, which stays editable.
  const pickSpot = (id: string) => {
    setSpotId(id);
    const sp = spots.find((s) => s.id === id);
    if (sp) setLieu(sp.name);
  };

  const start = async () => {
    await askNotifyPermission(); // asked here, at the first session — never at launch
    onStart(
      createSession({
        count,
        intervalMin: trempe,
        lieu: lieu.trim() || "—",
        spotId: spotId || undefined,
        now: Date.now(),
      }),
    );
  };

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={onBack} aria-label="Retour">
          ‹
        </button>
        <div style={{ flex: 1 }}>
          <div className="topbar-title">Écrevisses</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
            Séance de balances chronométrées
          </div>
        </div>
      </div>

      <div className="pad">
        <div className="label" style={{ margin: "12px 0 8px" }}>
          Nombre de balances
        </div>
        <div className="ecr-count">
          <button onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label="Une balance de moins">
            −
          </button>
          <span>{count}</span>
          <button
            onClick={() => setCount((c) => Math.min(MAX_BALANCES, c + 1))}
            aria-label="Une balance de plus"
          >
            +
          </button>
        </div>

        <div className="label" style={{ margin: "18px 0 8px" }}>
          Temps de trempe
        </div>
        <div className="ecr-chips">
          {INTERVALS.map((m) => (
            <button key={m} className={trempe === m ? "on" : ""} onClick={() => setTrempe(m)}>
              {m} min
            </button>
          ))}
        </div>

        <div className="label" style={{ margin: "18px 0 8px" }}>
          Lieu
        </div>
        {spots.length > 0 && (
          <select
            className="ecr-input"
            style={{ marginBottom: 8 }}
            value={spotId}
            onChange={(e) => pickSpot(e.target.value)}
            aria-label="Rattacher à un spot personnel"
          >
            <option value="">Aucun spot rattaché</option>
            {spots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <input
          className="ecr-input"
          value={lieu}
          onChange={(e) => setLieu(e.target.value)}
          placeholder="Étang, bras mort, nom du coin…"
        />

        <button className="ecr-start" onClick={start}>
          Démarrer la séance
        </button>

        <div className="ecr-reg">
          {REG_BALANCES.map((r) => (
            <div key={r}>· {r}</div>
          ))}
          <div className="ecr-reg-note">{MAILLE_NOTE}</div>
          <div className="ecr-reg-src">{REG_SOURCE}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Séance en cours ---------------- */

function SessionEnCours({
  session,
  now,
  onSave,
  onFinish,
  onBack,
}: {
  session: CrayfishSession;
  now: number;
  onSave: (s: CrayfishSession) => void;
  onFinish: () => void;
  onBack: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [options, setOptions] = useState<string | null>(null);
  const [wake, setWake] = useState(false);
  const notified = useRef<Set<string>>(new Set());

  // Fire one notification per balance that just came due. The key embeds the due
  // date, so a balance dropped again becomes notifiable anew (see notifKey).
  useEffect(() => {
    for (const b of dueBalances(session.balances, now, notified.current)) {
      notified.current.add(notifKey(b));
      notifyBalance(b.n, b.label, -(remainingSec(b, now) as number), b.id);
    }
  }, [session, now]);

  useEffect(() => {
    if (wake) requestWake();
    else releaseWake();
    return () => releaseWake();
  }, [wake]);

  const sorted = useMemo(() => sortBalances(session.balances, now), [session, now]);
  const next = nextDue(session.balances, now);
  const elapsed = fmtDuration((now - session.debut) / 1000);
  const perm = notifyPermission();
  const opt = options ? session.balances.find((b) => b.id === options) : null;

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={onBack} aria-label="Retour">
          ‹
        </button>
        <div style={{ flex: 1 }}>
          <div className="topbar-title">Séance en cours</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
            {session.lieu} · {elapsed}
          </div>
        </div>
      </div>

      <div className="pad">
        {isStaleSession(session, now) && (
          <div className="ecr-warn" style={{ marginTop: 0, marginBottom: 10 }}>
            Cette séance du {session.date} est ouverte depuis plus de 12 h. Terminez-la pour en
            démarrer une nouvelle — rien n'est clôturé automatiquement, votre bilan est conservé.
          </div>
        )}

        <div className="ecr-next">
          {next ? (
            <>
              Prochaine : <b>balance {next.balance.n}</b> dans {fmtDuration(next.inSec)}
            </>
          ) : (
            <>Aucune balance en trempe</>
          )}
        </div>

        {perm !== "granted" && (
          <div className="ecr-warn">
            Les notifications sont désactivées : l'alerte ne s'affichera que dans l'app. Activez
            « garder l'écran allumé » pour être prévenu à l'heure.
          </div>
        )}

        <div className="bal-grid">
          {sorted.map((b) => (
            <BalanceCard
              key={b.id}
              b={b}
              now={now}
              expanded={expanded === b.id}
              onToggle={() => setExpanded((e) => (e === b.id ? null : b.id))}
              onPose={() => onSave(poseBalance(session, b.id, Date.now()))}
              onReleve={() => {
                setExpanded(null);
                onSave(releveBalance(session, b.id, Date.now()));
              }}
              onOptions={() => setOptions(b.id)}
            />
          ))}
        </div>

        <button className="ecr-poseall" onClick={() => onSave(poseAll(session, Date.now()))}>
          Poser toutes les balances
        </button>

        {wakeSupported() && (
          <label className="ecr-wake">
            <input type="checkbox" checked={wake} onChange={(e) => setWake(e.target.checked)} />
            <span>
              Garder l'écran allumé
              <em>alerte à l'heure garantie — consomme la batterie</em>
            </span>
          </label>
        )}

        <div className="ecr-foot">
          <button className="btn-light" onClick={() => onSave(addBalance(session))}>
            + Balance
          </button>
          <button className="ecr-finish" onClick={onFinish}>
            Terminer la séance
          </button>
        </div>
      </div>

      {opt && (
        <div className="ecr-sheet" role="dialog" aria-label={`Options de la balance ${opt.n}`}>
          <div className="ecr-sheet-in">
            <div className="ecr-sheet-t">Balance {opt.n}</div>

            <label className="ecr-sheet-row">
              <span>Nom</span>
              <input
                value={opt.label || ""}
                onChange={(e) => onSave(updateBalance(session, opt.id, { label: e.target.value }))}
                placeholder="sous le saule"
              />
            </label>

            <label className="ecr-sheet-row">
              <span>Trempe (min)</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={opt.intervalMin}
                onChange={(e) =>
                  onSave(
                    updateBalance(session, opt.id, {
                      intervalMin: Math.max(1, parseInt(e.target.value) || 1),
                    }),
                  )
                }
              />
            </label>

            {opt.poseeA !== null && (
              <button
                className="btn-light"
                onClick={() => {
                  onSave(releveBalance(session, opt.id, Date.now(), false));
                  setOptions(null);
                }}
              >
                Relever et laisser vide
              </button>
            )}

            <button
              className="btn-light"
              onClick={() => {
                onSave(removeBalance(session, opt.id));
                setOptions(null);
              }}
            >
              Retirer cette balance
            </button>

            <button className="ecr-sheet-close" onClick={() => setOptions(null)}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Créer un `BilanEcrevisses` provisoire pour que l'écran compile**

Créer `src/components/BilanEcrevisses.tsx` — version minimale, remplacée intégralement en Task 7 :

```tsx
import type { CrayfishSession } from "../types";

export function BilanEcrevisses({
  session,
  onClose,
}: {
  session: CrayfishSession;
  onClose: () => void;
}) {
  return (
    <div className="screen">
      <div className="pad">
        <div className="h1">Bilan — {session.lieu}</div>
        <button className="btn-light" onClick={onClose}>
          Retour
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Router l'écran dans `src/App.tsx`**

Ajouter l'import auprès des autres écrans non code-splittés :

```ts
import { Ecrevisses } from "./screens/Ecrevisses";
```

et la ligne de rendu, après `{s === "outils-terrain" && <OutilsTerrain />}` :

```tsx
        {s === "ecrevisses" && <Ecrevisses />}
```

- [ ] **Step 4: Ajouter les points d'entrée**

Dans `src/screens/Accueil.tsx`, ajouter une entrée au tableau `TOOLS` (après « Matériel ») :

```ts
  { icon: "M6 14a6 6 0 0 1 12 0v3H6zM8 14 4 9M16 14l4-5M9 20v-3M15 20v-3", label: "Écrevisses", to: "ecrevisses" },
```

Dans `src/screens/Outils.tsx`, ajouter une ligne au tableau `rows`, après « Outils de terrain » :

```ts
    { title: "Écrevisses", sub: "Séance de balances : chronos individuels, alertes, bilan", icon: ICONS.regle, to: "ecrevisses" },
```

Dans `src/screens/OutilsTerrain.tsx`, retirer le preset `balances` du tableau `PRESETS` (première entrée, ligne 14) — il faisait doublon — et ajouter, juste au-dessus de la liste `.ot-timers` dans le JSX, un renvoi vers le module :

```tsx
        <button className="ot-timer" onClick={() => nav("ecrevisses")}>
          <div className="ic">
            <Icon d={CLOCK} size={22} stroke="#b08a3e" width={1.6} />
          </div>
          <div className="tx">
            <div className="t">Séance écrevisses</div>
            <div className="s">Balances chronométrées individuellement</div>
          </div>
          <span className="dur">›</span>
        </button>
```

et récupérer `nav` depuis le store en modifiant la ligne 30 :

```ts
  const { state, back, nav } = useStore();
```

- [ ] **Step 5: Ajouter les styles de l'écran**

À la fin de `src/styles.css` :

```css
/* ---- Écrevisses : écran de séance ---- */
.ecr-count {
  display: flex;
  align-items: center;
  gap: 16px;
}
.ecr-count button {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1.5px solid var(--line-strong);
  background: #fff;
  font-size: 22px;
  color: var(--fir);
}
.ecr-count span {
  font-size: 28px;
  font-weight: 700;
  min-width: 40px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.ecr-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.ecr-chips button {
  border: 1.5px solid var(--line-strong);
  background: #fff;
  border-radius: 999px;
  padding: 9px 15px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--body);
}
.ecr-chips button.on {
  background: var(--fir);
  border-color: var(--fir);
  color: #fbfaf7;
}
.ecr-input {
  width: 100%;
  border: 1.5px solid var(--line-strong);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  background: #fff;
  color: var(--ink);
}
.ecr-start,
.ecr-poseall,
.ecr-finish {
  width: 100%;
  border: none;
  border-radius: 14px;
  padding: 15px;
  font-size: 15.5px;
  font-weight: 700;
  background: var(--fir);
  color: #fbfaf7;
  margin-top: 22px;
}
.ecr-poseall {
  margin-top: 14px;
  background: var(--green);
}
.ecr-finish {
  margin-top: 0;
  flex: 1;
}
.ecr-next {
  background: var(--sand);
  border-radius: 12px;
  padding: 11px 14px;
  font-size: 13.5px;
  color: var(--body);
}
.ecr-warn {
  margin-top: 10px;
  background: var(--amber-bg);
  border-radius: 12px;
  padding: 11px 14px;
  font-size: 12.5px;
  line-height: 1.5;
  color: #6d4d0d;
}
.ecr-wake {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-top: 16px;
  font-size: 13.5px;
  color: var(--body);
}
.ecr-wake em {
  display: block;
  font-style: normal;
  font-size: 11.5px;
  color: var(--muted);
  margin-top: 2px;
}
.ecr-foot {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 20px;
}
.ecr-reg {
  margin-top: 24px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--muted);
}
.ecr-reg-note {
  margin-top: 8px;
  color: #6d4d0d;
  background: var(--amber-bg);
  border-radius: 10px;
  padding: 9px 11px;
}
.ecr-reg-src {
  margin-top: 8px;
  font-size: 11px;
  color: #a8a495;
}
.ecr-sheet {
  position: fixed;
  inset: 0;
  background: rgba(20, 26, 22, 0.42);
  display: flex;
  align-items: flex-end;
  z-index: 60;
}
.ecr-sheet-in {
  width: 100%;
  background: var(--paper);
  border-radius: 20px 20px 0 0;
  padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ecr-sheet-t {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}
.ecr-sheet-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  color: var(--body);
}
.ecr-sheet-row span {
  width: 110px;
  flex: none;
}
.ecr-sheet-row input {
  flex: 1;
  border: 1.5px solid var(--line-strong);
  border-radius: 10px;
  padding: 9px 11px;
  font-size: 14.5px;
  background: #fff;
  color: var(--ink);
}
.ecr-sheet-close {
  border: none;
  background: var(--fir);
  color: #fbfaf7;
  border-radius: 12px;
  padding: 13px;
  font-size: 15px;
  font-weight: 700;
  margin-top: 4px;
}
```

- [ ] **Step 6: Vérifier types, lint et build**

Run: `npx tsc -b && npm run lint && npm test && npm run build`
Expected: aucune erreur, tests verts, build réussi.

- [ ] **Step 7: Vérifier le parcours dans le navigateur**

Lancer `npm run dev`, ouvrir l'app, puis : Accueil → tuile « Écrevisses » → régler 3 balances / 25 min → Démarrer → « Poser toutes » → les trois cartes passent en trempe avec un compte à rebours qui descend chaque seconde. Passer une balance à 1 min via ⋯ et vérifier qu'elle bascule en rouge « de retard » à l'échéance. Recharger la page en pleine séance : la séance est restaurée avec les bons compteurs.

- [ ] **Step 8: Commit**

```bash
git add src/screens/Ecrevisses.tsx src/components/BilanEcrevisses.tsx src/App.tsx src/screens/Accueil.tsx src/screens/Outils.tsx src/screens/OutilsTerrain.tsx src/styles.css
git commit -m "Écrevisses : écran de séance, routage et points d'entrée"
```

---

### Task 7 : Bilan de fin de séance

**Files:**
- Modify: `src/components/BilanEcrevisses.tsx` (remplace la version provisoire de la Task 6)
- Modify: `src/screens/Ecrevisses.tsx` (câblage de la clôture)
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `ECREVISSES`, `crayfishById` (Task 2), `addTally`, `tallyTotal` (Task 1), `saveCrayfishSession` (Task 3)
- Produces: `BilanEcrevisses` — props `{ session: CrayfishSession; onClose: () => void }`

- [ ] **Step 1: Écrire le bilan**

Remplacer intégralement `src/components/BilanEcrevisses.tsx` :

```tsx
import { useState } from "react";
import { useStore } from "../store";
import { ECREVISSES, crayfishById } from "../data/ecrevisses";
import { addTally, tallyTotal } from "../lib/ecrevisses";
import type { CrayfishSession } from "../types";

/**
 * End-of-session tally. Steppers only — big targets, one hand, wet fingers.
 * The fishable species are offered first; declaring a protected one swaps the
 * counter for the release warning, because that is the decision that matters.
 */
export function BilanEcrevisses({
  session,
  onClose,
}: {
  session: CrayfishSession;
  onClose: () => void;
}) {
  const { set, saveCrayfishSession } = useStore();
  const [tally, setTally] = useState(session.tally);
  const [note, setNote] = useState(session.note || "");
  const [showAll, setShowAll] = useState(session.tally.some((t) => !crayfishById(t.spId)?.pechable));

  const shown = showAll ? ECREVISSES : ECREVISSES.filter((e) => e.pechable);
  const countOf = (id: string) => tally.find((t) => t.spId === id)?.count ?? 0;
  const bump = (id: string, d: number) => setTally((t) => addTally(t, id, d));

  const finish = () => {
    saveCrayfishSession({
      ...session,
      tally: tally.filter((t) => t.count > 0),
      note: note.trim() || undefined,
      fin: Date.now(),
    });
    set({ screen: "carnet", tab: "carnet", stack: [] });
  };

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={onClose} aria-label="Retour à la séance">
          ‹
        </button>
        <div style={{ flex: 1 }}>
          <div className="topbar-title">Bilan de séance</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
            {session.lieu} · {session.balances.length} balance
            {session.balances.length > 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div className="pad">
        <div className="ecr-total">
          <b>{tallyTotal(tally)}</b> écrevisse{tallyTotal(tally) > 1 ? "s" : ""} au total
        </div>

        {shown.map((e) => (
          <div key={e.id} className={"ecr-sp" + (e.pechable ? "" : " protegee")}>
            <div className="ecr-sp-tx">
              <div className="n">{e.name}</div>
              <div className="l">{e.latin}</div>
              <div className="w">{e.note}</div>
            </div>
            <div className="ecr-step">
              <button onClick={() => bump(e.id, -1)} aria-label={`Une ${e.name} de moins`}>
                −
              </button>
              <span>{countOf(e.id)}</span>
              <button onClick={() => bump(e.id, 1)} aria-label={`Une ${e.name} de plus`}>
                +
              </button>
            </div>
          </div>
        ))}

        {!showAll && (
          <button className="btn-light ecr-more" onClick={() => setShowAll(true)}>
            J'ai relevé une espèce protégée
          </button>
        )}

        <div className="label" style={{ margin: "20px 0 8px" }}>
          Note
        </div>
        <textarea
          className="ecr-input"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Conditions, coin qui a donné, remarques…"
        />

        <button className="ecr-start" onClick={finish}>
          Enregistrer et clôturer
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Ajouter les styles du bilan**

À la fin de `src/styles.css` :

```css
/* ---- Écrevisses : bilan ---- */
.ecr-total {
  background: var(--green-tint);
  border-radius: 12px;
  padding: 13px 15px;
  font-size: 14.5px;
  color: var(--green-dark);
  margin-bottom: 14px;
}
.ecr-total b {
  font-size: 20px;
}
.ecr-sp {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1.5px solid var(--line-strong);
  border-radius: 16px;
  padding: 13px 14px;
  margin-bottom: 10px;
}
.ecr-sp.protegee {
  border-color: var(--red);
  background: #fdf3f1;
}
.ecr-sp-tx {
  flex: 1;
  min-width: 0;
}
.ecr-sp-tx .n {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--ink);
}
.ecr-sp-tx .l {
  font-size: 11.5px;
  font-style: italic;
  color: var(--muted);
  margin-top: 1px;
}
.ecr-sp-tx .w {
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--body);
  margin-top: 5px;
}
.ecr-sp.protegee .w {
  color: #8c2f24;
  font-weight: 600;
}
.ecr-step {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}
.ecr-step button {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  border: 1.5px solid var(--line-strong);
  background: var(--sand);
  font-size: 20px;
  color: var(--fir);
}
.ecr-step span {
  min-width: 30px;
  text-align: center;
  font-size: 19px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.ecr-more {
  width: 100%;
  margin-top: 4px;
}
```

- [ ] **Step 3: Vérifier types, lint et build**

Run: `npx tsc -b && npm run lint && npm test && npm run build`
Expected: aucune erreur, tests verts, build réussi.

- [ ] **Step 4: Vérifier le parcours dans le navigateur**

Depuis une séance en cours : « Terminer la séance » → incrémenter 12 Louisiane → « J'ai relevé une espèce protégée » fait apparaître les deux protégées avec l'encadré rouge → « Enregistrer et clôturer » renvoie vers le carnet. Rouvrir le module : il propose bien une nouvelle séance (l'ancienne est clôturée).

- [ ] **Step 5: Commit**

```bash
git add src/components/BilanEcrevisses.tsx src/styles.css
git commit -m "Écrevisses : bilan de fin de séance par espèce"
```

---

### Task 8 : Historique des séances dans le Carnet

**Files:**
- Modify: `src/screens/Carnet.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `state.crayfish`, `removeCrayfishSession` (Task 3), `tallyTotal`, `fmtDuration` (Task 1), `crayfishById` (Task 2)
- Produces: rien de nouveau — c'est le point de sortie du module

- [ ] **Step 1: Ajouter le segment « Écrevisses » au Carnet**

Dans `src/screens/Carnet.tsx` :

1. Ajouter les imports :

```ts
import { tallyTotal, fmtDuration } from "../lib/ecrevisses";
import { crayfishById } from "../data/ecrevisses";
import type { Catch, CrayfishSession } from "../types";
```

(la ligne `import type { Catch } from "../types";` existante est remplacée par celle ci-dessus)

2. Élargir le type du segment (ligne 21) :

```ts
  const [seg, setSeg] = useState<"prises" | "spots" | "ecrevisses">("prises");
```

3. Récupérer les séances et l'action de suppression depuis le store (ligne 15) :

```ts
  const { state, set, nav, addCatchFull, removeCrayfishSession } = useStore();
```

et, sous `const spots = state.spots;` :

```ts
  const sessions = [...state.crayfish].sort((a, b) => b.debut - a.debut);
```

4. Ajouter le bouton de segment, entre « Spots » et « Statistiques » :

```tsx
          <button className={seg === "ecrevisses" ? "on" : ""} onClick={() => setSeg("ecrevisses")}>
            Écrevisses · {sessions.length}
          </button>
```

5. Ajouter le panneau, après le bloc `{seg === "spots" && …}` :

```tsx
        {seg === "ecrevisses" && (
          <div style={{ marginTop: 14 }}>
            <button className="pill-btn" onClick={() => nav("ecrevisses")}>
              + Séance
            </button>
            {sessions.length === 0 && (
              <div className="empty-note">
                Aucune séance. Démarrez-en une avec « + Séance » : balances chronométrées, alertes,
                bilan par espèce.
              </div>
            )}
            {sessions.map((s) => (
              <SessionRow key={s.id} s={s} onDelete={() => removeCrayfishSession(s.id)} />
            ))}
          </div>
        )}
```

6. Ajouter le composant de ligne, à la fin du fichier :

```tsx
function SessionRow({ s, onDelete }: { s: CrayfishSession; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const total = tallyTotal(s.tally);
  const duree = s.fin ? fmtDuration((s.fin - s.debut) / 1000) : null;

  return (
    <div className="ecr-row">
      <button className="ecr-row-head" onClick={() => setOpen((o) => !o)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nm">
            {s.lieu} · {s.date}
          </div>
          <div className="sub">
            {s.balances.length} balance{s.balances.length > 1 ? "s" : ""}
            {duree ? ` · ${duree}` : " · en cours"}
            {total > 0 ? ` · ${total} écrevisse${total > 1 ? "s" : ""}` : ""}
          </div>
        </div>
        <span className="go">{open ? "⌄" : "›"}</span>
      </button>

      {open && (
        <div className="ecr-row-body">
          {s.tally.length === 0 && <div className="sub">Aucune capture enregistrée.</div>}
          {s.tally.map((t) => (
            <div key={t.spId} className="sub">
              {crayfishById(t.spId)?.name ?? t.spId} — <b>{t.count}</b>
            </div>
          ))}
          {s.note && <div className="ecr-row-note">{s.note}</div>}
          <button className="btn-light" onClick={onDelete}>
            Supprimer cette séance
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Ajouter les styles de l'historique**

À la fin de `src/styles.css` :

```css
/* ---- Écrevisses : historique dans le carnet ---- */
.ecr-row {
  background: #fff;
  border: 1px solid var(--line-strong);
  border-radius: 14px;
  margin-top: 10px;
  overflow: hidden;
}
.ecr-row-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  padding: 13px 14px;
  text-align: left;
}
.ecr-row-head .nm {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--ink);
}
.ecr-row-head .sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}
.ecr-row-head .go {
  color: var(--muted);
  font-size: 18px;
}
.ecr-row-body {
  padding: 0 14px 13px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ecr-row-body .sub {
  font-size: 13px;
  color: var(--body);
}
.ecr-row-note {
  font-size: 12.5px;
  color: var(--muted);
  line-height: 1.5;
  margin-top: 4px;
}
.ecr-row-body .btn-light {
  margin-top: 8px;
  align-self: flex-start;
}
```

- [ ] **Step 3: Vérifier types, lint, tests et build**

Run: `npx tsc -b && npm run lint && npm test && npm run build`
Expected: aucune erreur, tous les tests verts, build réussi.

- [ ] **Step 4: Vérifier le parcours complet dans le navigateur**

Lancer `npm run dev`, puis dérouler le scénario de bout en bout : Accueil → Écrevisses → 6 balances / 30 min / lieu → Démarrer → poser deux balances à la main, « Poser toutes » pour le reste → renommer la balance 3 et lui mettre 1 min de trempe → attendre son échéance (carte rouge, vibration, notification si la permission a été accordée) → la relever d'un tap → Terminer → saisir 8 Louisiane → Enregistrer → le Carnet s'ouvre, segment « Écrevisses · 1 », la ligne se déplie sur le détail. Recharger : tout est là.

- [ ] **Step 5: Mettre à jour le README**

Dans la section « Écrans » de `README.md`, ajouter à l'énumération, après « Carnet de captures (IndexedDB) » :

```
**Écrevisses** (séance de balances : chrono par balance, alertes, bilan par espèce)
```

- [ ] **Step 6: Commit**

```bash
git add src/screens/Carnet.tsx src/styles.css README.md
git commit -m "Écrevisses : historique des séances dans le carnet"
```

---

## Vérification finale

- [ ] `npm test` — vert, y compris les suites préexistantes
- [ ] `npm run lint` — aucun avertissement
- [ ] `npm run build` — build de production réussi
- [ ] Une séance en cours survit à un rechargement complet de la page
- [ ] Une balance échue pendant que l'app était en arrière-plan apparaît en rouge avec son retard exact au retour
- [ ] Le modèle `Catch` et l'écran `Statistiques` sont inchangés (`git diff --stat` ne les mentionne pas)
