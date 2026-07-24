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
