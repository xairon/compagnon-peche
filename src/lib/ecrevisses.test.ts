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
import type { Balance } from "../types";

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
