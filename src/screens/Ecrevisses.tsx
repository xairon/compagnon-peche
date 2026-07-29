import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store-hooks";
import { BalanceCard } from "../components/BalanceCard";
import { BilanEcrevisses } from "../components/BilanEcrevisses";
import { REG_BALANCES, REG_SOURCE, MAILLE_NOTE } from "../data/ecrevisses";
import { CRAYFISH_RECIPES } from "../data/ecrevisses-recipes";
import { wakeSupported } from "../lib/wakelock";
import { askNotifyPermission, notifyPermission } from "../lib/notify";
import {
  DEFAULT_INTERVAL_MIN,
  MAX_BALANCES,
  balanceState,
  createSession,
  currentSession,
  isStaleSession,
  poseAll,
  poseBalance,
  releveBalance,
  updateBalance,
  removeBalance,
  restoreBalance,
  addBalance,
  sortBalances,
  nextDue,
  setWake,
  fmtDuration,
  fmtElapsed,
} from "../lib/ecrevisses";
import type { Balance, CrayfishSession, Spot } from "../types";

/** How long the "Balance retirée · Annuler" toast stays up. Long enough to
 *  react with a wet hand, short enough not to pile up across a few taps. */
const UNDO_MS = 5000;

const INTERVALS = [10, 15, 20, 30];

export function Ecrevisses() {
  const { state, set, back, addCrayfishSession, saveCrayfishSession } = useStore();
  const session = currentSession(state.crayfish);

  // One tick per second while a session is running, for the DISPLAY only: every
  // shown state is recomputed from `now`, so nothing drifts and nothing is stored
  // as a counter. Alerting has its own clock in useCrayfishAlerts(), at the App
  // level, so it keeps running when this screen is not mounted.
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

  // The bilan being edited is designated by its id in the store, and resolved
  // against the full list rather than currentSession(): finish() stamps `fin`,
  // which would otherwise make currentSession() return null and the bilan vanish
  // mid-edit. In the store rather than in a local state so the Carnet can ask for
  // the bilan of an ALREADY CLOSED session, to correct a forgotten total.
  const bilan = state.bilanSession
    ? state.crayfish.find((c) => c.id === state.bilanSession) ?? null
    : null;

  if (bilan) {
    return (
      <BilanEcrevisses
        session={bilan}
        onClose={() => {
          set({ bilanSession: null });
          // Correcting a closed session: "‹" goes back where it was asked from
          // (the Carnet), not to the preparation screen of a brand new session.
          if (bilan.fin !== null) back();
        }}
      />
    );
  }

  if (session) {
    return (
      <SessionEnCours
        session={session}
        now={now}
        onSave={saveCrayfishSession}
        onFinish={() => set({ bilanSession: session.id })}
        onBack={back}
      />
    );
  }

  // Never offer to start before IndexedDB has answered: a session created while
  // state.crayfish is still empty would end up alongside the loaded one, and the
  // loaded one — "en cours" forever, with no path to a bilan — would be shadowed.
  if (!state.hydrated) return <div className="screen-loading">Chargement…</div>;

  return <Preparation onBack={back} onStart={(s) => addCrayfishSession(s)} spots={state.spots} />;
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
  const { nav } = useStore();
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
        // Start with a single balance; the angler builds the battery up with the
        // "+" as they bait and drop each net (up to the regulatory MAX_BALANCES).
        count: 1,
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
          Temps de trempe
        </div>
        <div className="ecr-chips">
          {INTERVALS.map((m) => (
            <button key={m} className={trempe === m ? "on" : ""} onClick={() => setTrempe(m)}>
              {m} min
            </button>
          ))}
          <label className="ecr-chip-input" aria-label="Temps de trempe personnalisé">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={trempe}
              onChange={(e) => setTrempe(Math.max(1, parseInt(e.target.value) || 1))}
            />
            <span>min</span>
          </label>
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

        <button className="btn-light ecr-more" onClick={() => nav("ecrevisses-ident")}>
          Reconnaître les écrevisses
        </button>

        {CRAYFISH_RECIPES.length > 0 && (
          <>
            <div className="label" style={{ margin: "16px 0 8px" }}>
              Recettes
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
              {CRAYFISH_RECIPES.map((r) => (
                <span
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  className="chip chip-sm"
                  onClick={() => nav("recette", { recipeId: r.id })}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    e.stopPropagation();
                    nav("recette", { recipeId: r.id });
                  }}
                >
                  {r.title}
                </span>
              ))}
            </div>
          </>
        )}

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

  // Removing a balance is undoable rather than armed-then-confirmed: it's an
  // action taken several times a session (an empty or overdue net dropped by
  // mistake), and doubling every tap would fight the "one hand, wet fingers"
  // goal more than it protects. What's lost on a mis-tap is modest (a number
  // and a lift count, never a running net — canRemove withholds this while
  // soaking), so a toast that really restores the balance is enough of a net.
  const [undo, setUndo] = useState<{ balance: Balance; index: number } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A pending toast must not survive leaving the screen with a stale timer
  // still armed to clear state nobody can see anymore.
  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    [],
  );

  const handleRemove = (id: string) => {
    const index = session.balances.findIndex((b) => b.id === id);
    if (index === -1) return;
    const balance = session.balances[index];
    onSave(removeBalance(session, id));
    setUndo({ balance, index });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
  };

  const handleUndo = () => {
    if (!undo) return;
    onSave(restoreBalance(session, undo.balance, undo.index));
    setUndo(null);
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
  };

  // Alerting and the wake lock are driven by useCrayfishAlerts() at the App
  // level — this screen only displays the session.
  const sorted = useMemo(() => sortBalances(session.balances, now), [session, now]);
  const next = nextDue(session.balances, now);
  const elapsed = fmtElapsed((now - session.debut) / 1000);
  const perm = notifyPermission();
  const opt = options ? session.balances.find((b) => b.id === options) : null;

  // What a screen reader should hear when this ticks: not the seconds (that
  // would read out a new number every second), the actionable summary — how
  // many are overdue, or which one is coming up next. Its TEXT only changes
  // on a real state transition, so React only touches the live region (and a
  // screen reader only announces) when there is something to say.
  const dueCount = session.balances.filter((b) => balanceState(b, now) === "echue").length;
  const announce =
    dueCount > 0
      ? `${dueCount} balance${dueCount > 1 ? "s" : ""} à relever`
      : next
        ? `Balance ${next.balance.n} est la prochaine à relever`
        : "Aucune balance en trempe";

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
        {/* Same information, worded for a screen reader — see `announce` above. */}
        <div className="sr-only" aria-live="polite">
          {announce}
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
              canRemove={session.balances.length > 1}
              onToggle={() => setExpanded((e) => (e === b.id ? null : b.id))}
              onPose={() => onSave(poseBalance(session, b.id, Date.now()))}
              onReleve={() => {
                setExpanded(null);
                onSave(releveBalance(session, b.id, Date.now()));
              }}
              onOptions={() => setOptions(b.id)}
              onRemove={() => handleRemove(b.id)}
            />
          ))}
          {/* Grow the battery one net at a time, up to the regulatory cap. */}
          {session.balances.length < MAX_BALANCES && (
            <button
              className="bal-add"
              onClick={() => onSave(addBalance(session))}
              aria-label="Ajouter une balance"
            >
              <span className="bal-add-plus">+</span>
              <span className="bal-add-lbl">Ajouter une balance</span>
            </button>
          )}
        </div>

        <button className="ecr-poseall" onClick={() => onSave(poseAll(session, Date.now()))}>
          Poser toutes les balances
        </button>

        {wakeSupported() && (
          <label className="ecr-wake">
            <input
              type="checkbox"
              checked={session.wake === true}
              onChange={(e) => onSave(setWake(session, e.target.checked))}
            />
            <span>
              Garder l'écran allumé
              <em>alerte à l'heure garantie — consomme la batterie</em>
            </span>
          </label>
        )}

        <button className="ecr-finish" onClick={onFinish}>
          Terminer la séance
        </button>
      </div>

      {undo && (
        <div className="ecr-undo-toast" aria-live="polite">
          <span>Balance retirée</span>
          <button onClick={handleUndo}>Annuler</button>
        </div>
      )}

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

            <button className="ecr-sheet-close" onClick={() => setOptions(null)}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
