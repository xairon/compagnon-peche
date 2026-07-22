import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { Icon } from "../components/Icon";
import { sunTimes } from "../lib/astro";
import { hhmm } from "../lib/geo";
import { DEPARTEMENTS } from "../data/regulation";

// Practical field chronos. Legal fishing hours are ½h before sunrise → ½h after
// sunset (national rule) — computed from the local ephemeris (real, offline).
const HOME = { lat: 47.586, lon: 1.336 };
const CLOCK = "M12 8v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z";

const PRESETS: { id: string; label: string; sub: string; min: number }[] = [
  { id: "balances", label: "Relève des balances", sub: "Écrevisses — relever régulièrement", min: 30 },
  { id: "saignee", label: "Saignée & glace", sub: "Ikejime — exsanguination à froid", min: 10 },
  { id: "marinade", label: "Marinade / salage", sub: "Avant cuisson ou fumage", min: 30 },
  { id: "degorgeage", label: "Dégorgeage", sub: "Purge en eau claire", min: 120 },
];

function fmt(sec: number): string {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function OutilsTerrain() {
  const { state, back } = useStore();
  const deptName = DEPARTEMENTS[state.dept].name;

  const legal = useMemo(() => {
    const t = sunTimes(new Date(), HOME.lat, HOME.lon);
    if (!t.sunrise || !t.sunset) return null;
    const open = new Date(t.sunrise.getTime() - 30 * 60000);
    const close = new Date(t.sunset.getTime() + 30 * 60000);
    const now = Date.now();
    const isOpen = now >= open.getTime() && now <= close.getTime();
    const beforeOpen = now < open.getTime();
    const remainMs = isOpen ? close.getTime() - now : beforeOpen ? open.getTime() - now : 0;
    const h = Math.floor(remainMs / 3600000);
    const m = Math.floor((remainMs % 3600000) / 60000);
    return { open, close, isOpen, beforeOpen, remain: `${h} h ${String(m).padStart(2, "0")}` };
  }, []);

  // A single active countdown at a time.
  const [active, setActive] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          setDone(true);
          navigator.vibrate?.([200, 120, 200]);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [running]);

  const start = (p: (typeof PRESETS)[number]) => {
    setActive(p.id);
    setRemaining(p.min * 60);
    setRunning(true);
    setDone(false);
  };
  const reset = () => {
    setRunning(false);
    setActive(null);
    setDone(false);
    setRemaining(0);
  };

  const activePreset = PRESETS.find((p) => p.id === active);

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={back} aria-label="Retour">
          ‹
        </button>
        <div style={{ flex: 1 }}>
          <div className="topbar-title">Outils de terrain</div>
          <div style={{ fontSize: 12, color: "#948f81", marginTop: 1 }}>Chronos & repères réglementaires</div>
        </div>
      </div>

      <div className="pad">
        {/* Legal hours */}
        {legal && (
          <div className="ot-legal">
            <div className="ot-legal-h">
              <Icon d={CLOCK} size={16} stroke="#cfa85c" width={1.7} />
              <span>Horaires légaux · aujourd'hui</span>
            </div>
            <div className="ot-legal-time">
              <b>{hhmm(legal.open)}</b> <span>→ {hhmm(legal.close)}</span>
            </div>
            <div className="ot-legal-sub">
              {legal.isOpen ? (
                <>
                  Pêche autorisée — il reste <b>{legal.remain}</b> avant la fermeture au coucher.
                </>
              ) : legal.beforeOpen ? (
                <>
                  Pêche fermée — ouverture dans <b>{legal.remain}</b>.
                </>
              ) : (
                <>Pêche fermée pour aujourd'hui (après le coucher).</>
              )}
            </div>
            <div className="ot-legal-note">
              ½ h avant le lever → ½ h après le coucher (repère national). {deptName} : vérifiez l'arrêté.
            </div>
          </div>
        )}

        {/* Active countdown */}
        {activePreset && (
          <div className={"ot-count" + (done ? " done" : "")}>
            <div className="ot-count-lbl">{done ? "Terminé" : activePreset.label}</div>
            <div className="ot-count-time">{fmt(remaining)}</div>
            <div className="ot-count-actions">
              {!done && (
                <button className="btn-light" onClick={() => setRunning((r) => !r)}>
                  {running ? "Pause" : "Reprendre"}
                </button>
              )}
              <button className="btn-light" onClick={reset}>
                {done ? "Fermer" : "Arrêter"}
              </button>
            </div>
          </div>
        )}

        <div className="label" style={{ margin: "20px 0 10px" }}>
          Chronos
        </div>
        <div className="ot-timers">
          {PRESETS.map((p) => (
            <button key={p.id} className="ot-timer" onClick={() => start(p)}>
              <div className="ic">
                <Icon d={CLOCK} size={22} stroke="#b08a3e" width={1.6} />
              </div>
              <div className="tx">
                <div className="t">{p.label}</div>
                <div className="s">{p.sub}</div>
              </div>
              <span className="dur">{p.min} min</span>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11.5, color: "#a8a495", marginTop: 16, lineHeight: 1.5 }}>
          Chronos locaux à titre d'aide. Les horaires sont calculés depuis l'éphéméride — la
          réglementation applicable reste celle de l'arrêté préfectoral.
        </div>
      </div>
    </div>
  );
}
