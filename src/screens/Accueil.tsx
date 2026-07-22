import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store";
import { SPECIES } from "../data/species";
import { DEPARTEMENTS } from "../data/regulation";
import { Media } from "../components/Media";
import { Icon } from "../components/Icon";
import { Tip } from "../components/Tip";
import { MiniMap } from "../components/MiniMap";
import { usePhotoUrl } from "../lib/photos";
import { fetchMeteo, weatherLabel, type Meteo, type MeteoHour } from "../lib/meteo";
import {
  nearestOnde,
  nearestHydroStation,
  latestHydro,
  waterTemp,
  isStaleWaterTemp,
  type OndeReading,
  type HydroReading,
  type WaterTemp,
} from "../lib/hubeau";
import { sunTimes, moonIllumination, moonPhaseName, type SunTimes } from "../lib/astro";
import { quotaToday } from "../lib/helpers";
import { hhmm, ago } from "../lib/geo";
import { season } from "../lib/season";
import { locate, locateMessage } from "../lib/locate";
import type { Screen } from "../store";

// Default "home water" until GPS refines it (Blois / Loire).
const HOME = { lat: 47.586, lon: 1.336 };
const FISH_ICON = "M4 12c2.5-3.5 6-5.5 9-5.5 3 0 5.5 2.5 7 5.5-1.5 3-4 5.5-7 5.5-3 0-6.5-2-9-5.5zM4 12 1.5 9v6zM16 11h.01";
const MOON_EMOJI = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];

const TOOLS: { icon: string; label: string; to: Screen }[] = [
  { icon: "M3 9h18v6H3zM7 9v3M11 9v4M15 9v3M19 9v4", label: "Règle", to: "regle" },
  { icon: "M4 12c3-5 6-5 8 0s5 5 8 0M7 9l3 6M14 9l3 6", label: "Nœuds", to: "noeuds" },
  { icon: "M16 3a2 2 0 1 1 0 4v6a5 5 0 0 1-10 0v-2m0 0-2.2 2.2M6 11l2.2 2.2", label: "Matériel", to: "materiel" },
  { icon: "M12 4v17M5 6h14M7 6l-3 7a3.5 3.5 0 0 0 6 0zM17 6l-3 7a3.5 3.5 0 0 0 6 0z", label: "Réglementation", to: "reglement" },
];

interface Water {
  station?: string;
  flow?: HydroReading | null;
  level?: HydroReading | null;
  temp?: WaterTemp | null;
}

async function loadWater(lat: number, lon: number): Promise<Water> {
  const st = await nearestHydroStation(lat, lon).catch(() => null);
  let flow: HydroReading | null = null;
  let level: HydroReading | null = null;
  if (st) {
    flow = await latestHydro(st.code, "Q").catch(() => null);
    if (!flow) level = await latestHydro(st.code, "H").catch(() => null);
  }
  // Freshest real reading across both Hub'Eau networks — always shown WITH its
  // date (no French river has continuous coverage), so it's never faked as "live".
  const temp = await waterTemp(lat, lon).catch(() => null);
  return { station: st?.nom, flow, level, temp };
}

export function Accueil() {
  const { state, nav, goTab, openSp, startPrise } = useStore();
  const p = state.profile;
  const avatar = usePhotoUrl(p.avatar);
  const deptName = DEPARTEMENTS[state.dept].name;

  const [pt, setPt] = useState(HOME);
  const [located, setLocated] = useState(false);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);
  const [meteo, setMeteo] = useState<Meteo | null>(null);
  const [onde, setOnde] = useState<OndeReading | null>(null);
  const [water, setWater] = useState<Water | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(false);
    setWater(null);
    Promise.all([
      fetchMeteo(pt.lat, pt.lon).catch(() => null),
      nearestOnde(pt.lat, pt.lon).catch(() => null),
    ]).then(([m, o]) => {
      if (!alive) return;
      setMeteo(m);
      setOnde(o);
      setLoading(false);
      setErr(!m);
    });
    loadWater(pt.lat, pt.lon).then((w) => alive && setWater(w));
    return () => {
      alive = false;
    };
  }, [pt.lat, pt.lon]);

  const sun = useMemo(() => sunTimes(new Date(), pt.lat, pt.lon), [pt.lat, pt.lon]);
  const moon = useMemo(() => moonIllumination(new Date()), []);
  const qt = quotaToday(state.catches);

  const today = useMemo(() => {
    const s = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, []);

  const openSpecies = useMemo(
    () => SPECIES.filter((s) => s.depth !== "base" && season(s).open && !s.protected).slice(0, 10),
    [],
  );

  const useGps = () => {
    setGpsMsg("Localisation…");
    locate()
      .then(({ lat, lon }) => {
        setPt({ lat, lon });
        setLocated(true);
        setGpsMsg(null);
      })
      .catch((e) => setGpsMsg(locateMessage(e)));
  };

  const wl = meteo ? weatherLabel(meteo.now.code) : null;
  const n = meteo?.now;

  return (
    <div className="screen dash">
      <div className="pad" style={{ paddingTop: 22 }}>
        {/* Header */}
        <div className="ac-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ac-kicker">{today}</div>
            <div className="ac-hello">Bonjour{p.name ? `, ${p.name}` : ""}</div>
          </div>
          <button className="ac-avatar" onClick={() => goTab("carnet")} aria-label="Mon carnet">
            {avatar ? <img src={avatar} alt="" /> : <span>🎣</span>}
          </button>
        </div>

        {/* Minimap hero */}
        <div className="dash-map">
          <MiniMap lat={pt.lat} lon={pt.lon} zoom={13} onClick={() => goTab("carte")} />
          <div className="dash-map-bar">
            <div className="loc">
              <span className="ping" />
              <div style={{ minWidth: 0 }}>
                <div className="place">{located ? "Ma position" : `${deptName} · défaut`}</div>
                <div className="coord">
                  {pt.lat.toFixed(3)}, {pt.lon.toFixed(3)}
                </div>
              </div>
            </div>
            <button className="loc-gps" onClick={useGps}>
              {gpsMsg || (located ? "Recentrer" : "📍 Me localiser")}
            </button>
          </div>
        </div>

        {/* Weather hero + temperature curve */}
        <div className="dash-wx">
          {err && !meteo ? (
            <div className="dash-wx-off">Conditions météo indisponibles hors-ligne.</div>
          ) : (
            <>
              <div className="dash-wx-top">
                <div className="dash-wx-temp">
                  <span className="deg">{n ? Math.round(n.temp) : loading ? "…" : "—"}</span>
                  <span className="unit">°C</span>
                </div>
                <div className="dash-wx-cond">
                  <div className="emoji">{wl ? wl.icon : ""}</div>
                  <div className="lbl">{wl ? wl.label : loading ? "Chargement…" : "—"}</div>
                  {n && <div className="feels">Ressenti {Math.round(n.feels)}°</div>}
                </div>
              </div>

              {meteo && meteo.hours.length > 1 && <TempCurve hours={meteo.hours} sun={sun} />}

              {n && (
                <div className="dash-metrics">
                  <Metric
                    k="Vent"
                    v={`${Math.round(n.wind)}`}
                    s={`km/h ${n.windCompass}`}
                    tip="Vent moyen à 10 m du sol, avec sa direction. Source : Open-Meteo (modèle météo)."
                  />
                  <Metric
                    k="Rafales"
                    v={`${Math.round(n.gust)}`}
                    s="km/h"
                    tip="Rafales de vent maximales. Source : Open-Meteo."
                  />
                  <Metric
                    k="Humidité"
                    v={`${Math.round(n.humidity)}`}
                    s="%"
                    tip="Humidité relative de l'air. Source : Open-Meteo."
                  />
                  <Metric
                    k="Pression"
                    v={`${Math.round(n.pressure)}`}
                    s={`hPa ${trendArrow(meteo!.pressureTrend)}`}
                    tip="Pression atmosphérique au niveau de la mer, avec la tendance sur 3 h (↑ hausse, ↓ baisse). Une pression qui chute annonce souvent une meilleure activité. Source : Open-Meteo."
                  />
                  <Metric
                    k="Couvert"
                    v={`${Math.round(n.cloud)}`}
                    s="% ciel"
                    tip="Part du ciel couverte par les nuages. Source : Open-Meteo."
                  />
                  <Metric
                    k="Pluie"
                    v={`${n.precip.toFixed(1)}`}
                    s="mm/h"
                    tip="Précipitations sur l'heure en cours. Source : Open-Meteo."
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Water card */}
        <div className="dash-water">
          <div className="dash-card-h">
            <Icon d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" size={15} stroke="#2b6c8f" width={1.6} />
            <span>Conditions de l'eau</span>
            {water?.station && <span className="src">{water.station}</span>}
          </div>
          <div className="dash-water-grid">
            <WaterTile
              k={water?.flow ? "Débit" : "Niveau"}
              val={
                water?.flow
                  ? `${water.flow.value.toFixed(1)}`
                  : water?.level
                    ? `${water.level.value.toFixed(2)}`
                    : "—"
              }
              unit={water?.flow ? "m³/s" : water?.level ? "m" : ""}
              trend={water?.flow?.trend || water?.level?.trend}
              when={water?.flow?.date || water?.level?.date}
              tip="Débit (m³/s) ou hauteur d'eau à l'échelle (m) du cours d'eau, avec la tendance. Une crue trouble l'eau et disperse le poisson ; un étiage le concentre. Source : Hub'Eau / OFB (station hydrométrique la plus proche)."
            />
            {(() => {
              // French river thermometry is sparse/campaign-based: the freshest
              // real reading can be months old. Beyond ~30 days it is not a
              // "current condition" — show "pas de relevé récent" instead of a
              // stale number (the old value stays in the water briefing on tap).
              const t = water?.temp;
              const tooOld = t ? Date.now() - new Date(t.date).getTime() > 30 * 86400000 : false;
              return (
                <WaterTile
                  k="Temp. eau"
                  val={t && !tooOld ? `${t.value.toFixed(1)}` : "—"}
                  unit={t && !tooOld ? "°C" : ""}
                  tip="Température de l'eau. Elle règle l'activité des poissons. Source : Hub'Eau (réseau thermie + physico-chimie). La mesure est rare et par campagnes en France : souvent pas de relevé récent — on n'affiche jamais une valeur estimée."
                  when={t && !tooOld ? t.date : undefined}
                  stale={t && !tooOld ? isStaleWaterTemp(t.date) : false}
                  sub={
                    !water
                      ? undefined
                      : !t
                        ? "pas de mesure"
                        : tooOld
                          ? `dernier relevé ${ago(t.date)}`
                          : undefined
                  }
                />
              );
            })()}
            <WaterTile
              k="Écoulement"
              val={onde ? ondeShort(onde.code) : "—"}
              unit=""
              tip="État d'écoulement du cours d'eau : en eau, écoulement faible, ou à sec (assec). Observations ONDE de l'OFB, relevées par campagnes (≈ mensuelles l'été, dormantes l'hiver) — ce n'est pas du temps réel. Source : Hub'Eau / ONDE."
              // ONDE is campaign-based (roughly monthly in summer, dormant in
              // winter): surface the reading's age so a months-old state isn't
              // read as current. Age first so it's never ellipsed away.
              sub={onde ? `${ago(onde.date)} · ${onde.cours || onde.station}` : "ONDE"}
            />
          </div>
          {!water && !onde && (
            <div className="dash-water-empty">Recherche des stations Hub'Eau proches…</div>
          )}
        </div>

        {/* Sun & moon */}
        <div className="dash-astro">
          <SunArc sun={sun} />
          <div className="dash-moon">
            <div className="disc">{MOON_EMOJI[Math.round(moon.phase * 8) % 8]}</div>
            <div className="mtx">
              <div className="ph">
                <Tip text="Phase de la lune et part du disque éclairé. Repère traditionnel des pêcheurs (indicatif, non prouvé scientifiquement). Calcul d'éphéméride local — fonctionne hors-ligne.">
                  {moonPhaseName(moon.phase)}
                </Tip>
              </div>
              <div className="il">{Math.round(moon.fraction * 100)} % éclairée</div>
            </div>
          </div>
        </div>

        {/* Quota + Prise CTA */}
        <div className="dash-quota">
          <Icon d="M4 6v12M8 6v12M12 6v12M16 6v12M3 16l16-9" size={15} stroke="#726e62" width={1.6} />
          <span className="q">
            <Tip text="Limite légale nationale : 3 carnassiers (sandre, brochet, black-bass) par jour et par pêcheur, dont 2 brochets maximum — art. R436-21. Décompté depuis votre carnet du jour. Un arrêté préfectoral peut être plus strict.">
              Quota du jour
            </Tip>{" "}
            : <b>{qt.c}/3 carnassiers · {qt.b}/2 brochets</b>
          </span>
          <button className="carnet-link" onClick={() => goTab("carnet")}>
            Carnet ›
          </button>
        </div>

        <button className="ac-prise" onClick={() => startPrise()}>
          <span className="disc">
            <Icon d={FISH_ICON} size={21} stroke="#FBFAF7" width={1.7} />
          </span>
          <span className="txt">
            <span className="t">J'ai une prise</span>
            <span className="s">Garder ou relâcher — le bon geste en 3 étapes</span>
          </span>
          <span className="chev">›</span>
        </button>

        {/* Species open today */}
        <div className="ac-sec-h">
          <span>En ce moment dans vos eaux</span>
          <button onClick={() => goTab("especes")}>Espèces ›</button>
        </div>
        <div className="ac-carousel">
          {openSpecies.map((sp) => (
            <button key={sp.id} className="ac-spcard" onClick={() => openSp(sp.id)}>
              <div className="img">
                <Media kind="species" id={sp.id} placeholder={sp.name} />
                {sp.maille !== "—" && <span className="maille">Maille {sp.maille}</span>}
              </div>
              <div className="body">
                <div className="nm">{sp.name}</div>
                <div className="st">● Pêche ouverte</div>
              </div>
            </button>
          ))}
        </div>

        {/* Toolbox */}
        <div className="ac-sec-h">
          <span>Boîte à outils</span>
          <button onClick={() => nav("outils")}>Tout ›</button>
        </div>
        <div className="ac-tools">
          {TOOLS.map((t) => (
            <button key={t.label} className="ac-tool" onClick={() => nav(t.to)}>
              <Icon d={t.icon} size={20} stroke="#1d6e42" width={1.6} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11.5, color: "#a8a495", margin: "16px 0 4px", lineHeight: 1.5 }}>
          Météo & conditions : requêtes aux API publiques Open-Meteo et Hub'Eau avec vos coordonnées
          (éphéméride calculée localement). Votre carnet, vos photos et votre profil, eux, restent
          100 % sur votre appareil — jamais transmis.
        </div>
      </div>
    </div>
  );
}

function Metric({ k, v, s, tip }: { k: string; v: string; s: string; tip?: string }) {
  return (
    <div className="dash-metric">
      <div className="k">{tip ? <Tip text={tip}>{k}</Tip> : k}</div>
      <div className="v">{v}</div>
      <div className="s">{s}</div>
    </div>
  );
}

function WaterTile({
  k,
  val,
  unit,
  trend,
  when,
  sub,
  stale,
  tip,
}: {
  k: string;
  val: string;
  unit: string;
  trend?: "rising" | "falling" | "stable";
  when?: string;
  sub?: string;
  stale?: boolean;
  tip?: string;
}) {
  return (
    <div className="dash-wtile">
      <div className="k">{tip ? <Tip text={tip}>{k}</Tip> : k}</div>
      <div className="v">
        {val}
        {unit && <span className="u"> {unit}</span>}
        {trend && <span className={"tr " + trend}>{trendArrow(trend)}</span>}
      </div>
      <div className={"s" + (stale ? " stale" : "")}>
        {sub || (when ? ago(when) + (stale ? " · ancienne" : "") : "—")}
      </div>
    </div>
  );
}

function trendArrow(t: "rising" | "falling" | "stable"): string {
  return t === "rising" ? "↑" : t === "falling" ? "↓" : "→";
}

// 24h temperature area chart with night shading, sun markers and a "now" cursor.
function TempCurve({ hours, sun }: { hours: MeteoHour[]; sun: SunTimes }) {
  const W = 320;
  const H = 118;
  const padX = 8;
  const padTop = 20;
  const padBot = 24;
  const temps = hours.map((h) => h.temp);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const span = Math.max(1, max - min);
  const xOf = (hr: number) => padX + (hr / 23) * (W - 2 * padX);
  const yOf = (t: number) => padTop + (1 - (t - min) / span) * (H - padTop - padBot);
  const pts = hours.map((h) => [xOf(h.hour), yOf(h.temp)] as [number, number]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const base = H - padBot;
  const area = `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${base} L ${pts[0][0].toFixed(1)} ${base} Z`;

  const iMax = temps.indexOf(max);
  const iMin = temps.indexOf(min);
  const nowIdx = hours.findIndex((h) => !h.past);
  const nowPt = nowIdx >= 0 ? pts[nowIdx] : null;

  const hrDec = (d: Date | null) => (d ? d.getHours() + d.getMinutes() / 60 : null);
  const sr = hrDec(sun.sunrise);
  const ss = hrDec(sun.sunset);

  return (
    <svg className="dash-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Courbe de température du jour">
      <defs>
        <linearGradient id="tempg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c99a3e" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#c99a3e" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* night shading */}
      {sr != null && <rect x={padX} y={padTop} width={xOf(sr) - padX} height={base - padTop} fill="#0f1f16" opacity="0.06" />}
      {ss != null && <rect x={xOf(ss)} y={padTop} width={W - padX - xOf(ss)} height={base - padTop} fill="#0f1f16" opacity="0.06" />}
      {/* sun markers */}
      {sr != null && <line x1={xOf(sr)} y1={padTop} x2={xOf(sr)} y2={base} stroke="#c9a24a" strokeWidth="1" strokeDasharray="2 3" />}
      {ss != null && <line x1={xOf(ss)} y1={padTop} x2={xOf(ss)} y2={base} stroke="#8a6d2f" strokeWidth="1" strokeDasharray="2 3" />}
      <path d={area} fill="url(#tempg)" />
      <path d={line} fill="none" stroke="#b08a3e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* min / max labels */}
      <circle cx={pts[iMax][0]} cy={pts[iMax][1]} r="2.6" fill="#b33a2e" />
      <text x={pts[iMax][0]} y={pts[iMax][1] - 6} className="dash-chart-t hi" textAnchor="middle">{Math.round(max)}°</text>
      <circle cx={pts[iMin][0]} cy={pts[iMin][1]} r="2.6" fill="#2b6c8f" />
      <text x={pts[iMin][0]} y={pts[iMin][1] + 12} className="dash-chart-t lo" textAnchor="middle">{Math.round(min)}°</text>
      {/* now cursor */}
      {nowPt && (
        <>
          <line x1={nowPt[0]} y1={padTop - 4} x2={nowPt[0]} y2={base} stroke="#16281e" strokeWidth="1.2" opacity="0.5" />
          <circle cx={nowPt[0]} cy={nowPt[1]} r="4" fill="#16281e" stroke="#fff" strokeWidth="1.5" />
        </>
      )}
      {/* x axis hours */}
      {[0, 6, 12, 18].map((h) => (
        <text key={h} x={xOf(h)} y={H - 8} className="dash-chart-x" textAnchor="middle">{h}h</text>
      ))}
    </svg>
  );
}

// Daytime arc with the sun at its current position (or a "nuit" marker).
function SunArc({ sun }: { sun: SunTimes }) {
  const W = 300;
  const H = 96;
  const cx = W / 2;
  const baseY = 78;
  const rx = 130;
  const ry = 62;
  const now = new Date();
  const sr = sun.sunrise;
  const ss = sun.sunset;
  let p: number | null = null;
  if (sr && ss) {
    const t = (now.getTime() - sr.getTime()) / (ss.getTime() - sr.getTime());
    p = Math.max(0, Math.min(1, t));
  }
  const daytime = p != null && now >= (sr as Date) && now <= (ss as Date);
  const ang = p != null ? Math.PI * (1 - p) : 0;
  const sx = cx + rx * Math.cos(ang);
  const sy = baseY - ry * Math.sin(ang);

  return (
    <div className="dash-sun">
      <svg viewBox={`0 0 ${W} ${H}`} aria-label="Course du soleil">
        <defs>
          <linearGradient id="sunarc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e6c169" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#e6c169" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#e6c169" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <line x1="6" y1={baseY} x2={W - 6} y2={baseY} stroke="#e6e2d8" strokeWidth="1" />
        <path d={`M ${cx - rx} ${baseY} A ${rx} ${ry} 0 0 1 ${cx + rx} ${baseY}`} fill="none" stroke="url(#sunarc)" strokeWidth="2" strokeDasharray="3 3" />
        {daytime && (
          <>
            <circle cx={sx} cy={sy} r="9" fill="#f2c04d" opacity="0.35" />
            <circle cx={sx} cy={sy} r="5" fill="#efb52f" />
          </>
        )}
      </svg>
      <div className="dash-sun-lbl">
        <div>
          <span className="ic">☀︎</span> Lever <b>{hhmm(sun.sunrise)}</b>
        </div>
        <div className="mid">
          <Tip text="Lever et coucher du soleil (éphéméride locale, hors-ligne). Pêche autorisée d'une demi-heure avant le lever à une demi-heure après le coucher.">
            {daytime ? "Jour" : "Nuit"}
          </Tip>
        </div>
        <div>
          Coucher <b>{hhmm(sun.sunset)}</b> <span className="ic">☾</span>
        </div>
      </div>
    </div>
  );
}

function ondeShort(code: string): string {
  if (code === "3") return "Assec";
  if (code === "1" || code === "1a" || code === "1b") return "Visible";
  if (code === "2") return "Non visible";
  return "—";
}
