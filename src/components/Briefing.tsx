import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  nearestHydroStation,
  latestHydro,
  nearestTemp,
  nearestOnde,
  nearestQuality,
  isStaleWaterTemp,
  type HydroStation,
  type HydroReading,
  type TempReading,
  type Trend,
} from "../lib/hubeau";
import { fetchMeteo, weatherLabel, type Meteo } from "../lib/meteo";
import { sunTimes, moonIllumination, moonTimes, moonPhaseName, solunar } from "../lib/astro";
import { fetchObstacles, obstacleInfo } from "../lib/sandre";
import { fetchAccess, nearestByKind, accessIcon, accessLabel } from "../lib/overpass";
import { boxAround, distKm, hhmm, ago } from "../lib/geo";

// A tiny fetch hook with per-key caching, so re-opening a point offline still
// shows the last known data (flagged stale) instead of an error.
const CACHE = new Map<string, unknown>();
interface Async<T> {
  loading: boolean;
  data: T | null;
  error: boolean;
  stale: boolean;
}
function useFetch<T>(key: string, fn: (s: AbortSignal) => Promise<T>, deps: unknown[]): Async<T> {
  const [st, setSt] = useState<Async<T>>({
    loading: true,
    data: (CACHE.get(key) as T) ?? null,
    error: false,
    stale: false,
  });
  useEffect(() => {
    const ac = new AbortController();
    setSt((p) => ({ ...p, loading: true, error: false }));
    fn(ac.signal)
      .then((data) => {
        CACHE.set(key, data);
        setSt({ loading: false, data, error: false, stale: false });
      })
      .catch((e) => {
        if ((e as Error).name === "AbortError") return;
        const cached = CACHE.get(key) as T | undefined;
        setSt({ loading: false, data: cached ?? null, error: cached == null, stale: cached != null });
      });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return st;
}

const trendIcon = (t: Trend) => (t === "rising" ? "↗" : t === "falling" ? "↘" : "→");
const trendWord = (t: Trend) => (t === "rising" ? "en hausse" : t === "falling" ? "en baisse" : "stable");

export interface BriefingTarget {
  lat: number;
  lon: number;
  title: string;
  subtitle?: string;
}

export function Briefing({
  target,
  onClose,
  onOfficial,
}: {
  target: BriefingTarget;
  onClose: () => void;
  onOfficial?: () => void;
}) {
  const { lat, lon, title, subtitle } = target;
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const sheetRef = useRef<HTMLDivElement>(null);

  // Scroll back to top whenever the target changes.
  useEffect(() => {
    sheetRef.current?.scrollTo(0, 0);
  }, [key]);

  // ---- Water (hydrometry + temperature) ----
  const water = useFetch<{ station: HydroStation | null; h: HydroReading | null; q: HydroReading | null }>(
    `water:${key}`,
    async (s) => {
      const station = await nearestHydroStation(lat, lon, s);
      if (!station) return { station: null, h: null, q: null };
      const [h, q] = await Promise.all([
        latestHydro(station.code, "H", s).catch(() => null),
        latestHydro(station.code, "Q", s).catch(() => null),
      ]);
      return { station, h, q };
    },
    [key],
  );
  const temp = useFetch<TempReading | null>(`temp:${key}`, (s) => nearestTemp(lat, lon, s), [key]);
  const onde = useFetch(`onde:${key}`, (s) => nearestOnde(lat, lon, s), [key]);
  const quality = useFetch(`quality:${key}`, (s) => nearestQuality(lat, lon, s), [key]);

  // ---- Weather ----
  const meteo = useFetch<Meteo>(`meteo:${key}`, (s) => fetchMeteo(lat, lon, s), [key]);

  // ---- Sun & moon (local, offline) ----
  const astro = useMemo(() => {
    const now = new Date();
    return {
      sun: sunTimes(now, lat, lon),
      moon: moonIllumination(now),
      mt: moonTimes(now, lat, lon),
      sol: solunar(now, lat, lon),
    };
  }, [lat, lon]);

  // ---- Obstacles (ROE, nearest 3 within ~5 km) ----
  const obstacles = useFetch(
    `roe:${key}`,
    async (s) => {
      const { w, s: so, e, n } = boxAround(lat, lon, 0.05);
      const fc = await fetchObstacles(w, so, e, n, s);
      return (fc.features || [])
        .map((f) => {
          const g = f.geometry as { coordinates?: [number, number] };
          const c = g.coordinates;
          if (!c) return null;
          return { info: obstacleInfo(f.properties), dist: distKm(lat, lon, c[1], c[0]) };
        })
        .filter((x): x is { info: ReturnType<typeof obstacleInfo>; dist: number } => !!x)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3);
    },
    [key],
  );

  // ---- Access (OSM, nearest per kind within ~5 km) ----
  const access = useFetch(
    `access:${key}`,
    async (s) => {
      const { w, s: so, e, n } = boxAround(lat, lon, 0.05);
      const pts = await fetchAccess(w, so, e, n, s);
      return nearestByKind(pts, lat, lon).slice(0, 4);
    },
    [key],
  );

  const km = (d: number) => (d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`);

  return (
    <div className="carte-sheet brief-sheet" ref={sheetRef}>
      <div className="sheet-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sheet-title">{title}</div>
          {subtitle && <div className="sheet-sub">{subtitle}</div>}
        </div>
        <button className="sheet-x" onClick={onClose} aria-label="Fermer">
          ✕
        </button>
      </div>

      <div className="sheet-body">
        {onOfficial && (
          <button className="official-jump" onClick={onOfficial}>
            🗺️ Parcours & réserves ici — carte officielle
          </button>
        )}

        {/* WATER — level/flow (hydro station) + temperature (independent, sparse) */}
        <Section title="💧 Eau" state={water}>
          {water.data &&
            (water.data.station || temp.data ? (
              <>
                <div className="brief-grid">
                  {water.data.station && (
                    <Metric
                      label="Niveau (échelle)"
                      value={water.data.h ? `${water.data.h.value.toFixed(2)} m` : "—"}
                      extra={water.data.h ? `${trendIcon(water.data.h.trend)} ${trendWord(water.data.h.trend)}` : undefined}
                    />
                  )}
                  {water.data.station && (
                    <Metric
                      label="Débit"
                      value={water.data.q ? `${fmtQ(water.data.q.value)}` : "—"}
                      extra={water.data.q ? `${trendIcon(water.data.q.trend)} ${trendWord(water.data.q.trend)}` : undefined}
                    />
                  )}
                  <Metric label="Temp. eau" value={temp.data ? `${temp.data.value.toFixed(1)} °C` : temp.loading ? "…" : "—"} />
                </div>
                <div className="brief-note">
                  {water.data.station
                    ? `Station ${water.data.station.nom} · ${km(water.data.station.dist)}`
                    : "Pas de station hydrométrique à proximité (niveau/débit indisponibles)"}
                  {water.data.station && water.data.h && ` · relevé ${ago(water.data.h.date)}`}
                  {temp.data
                    ? ` · eau : ${temp.data.station} (${km(temp.data.dist)}) · relevé ${ago(temp.data.date)}`
                    : !temp.loading && " · pas de capteur température à proximité"}
                  {temp.data && isStaleWaterTemp(temp.data.date) && (
                    <b style={{ color: "#b06e14" }}> — température ancienne, à titre indicatif</b>
                  )}
                </div>
              </>
            ) : (
              <div className="brief-empty">
                {temp.loading ? "Recherche des capteurs…" : "Aucune station hydrométrique ni de température à proximité."}
              </div>
            ))}
        </Section>

        {/* FLOW (ONDE) */}
        <Section title="🌊 Écoulement" state={onde}>
          {onde.data &&
            (() => {
              const info = ondeInfo(onde.data.code);
              // Prefer the authoritative label returned by Hub'Eau (libelle_ecoulement);
              // fall back to our code map only if the API didn't provide one.
              return (
                <>
                  <div className={"onde-state " + info.tone}>{onde.data.label || info.word}</div>
                  <div className="brief-note">
                    {onde.data.station}
                    {onde.data.dist != null && ` · ${km(onde.data.dist)}`} · relevé ONDE du{" "}
                    {frShort(onde.data.date)} (suivi par campagnes, pas temps réel)
                  </div>
                </>
              );
            })()}
          {onde.data === null && !onde.loading && !onde.error && (
            <div className="brief-empty">Aucune station ONDE avec relevé récent à proximité.</div>
          )}
        </Section>

        {/* QUALITY (physico-chemistry) */}
        <Section title="🧪 Qualité de l'eau" state={quality}>
          {quality.data && (
            <>
              <div className="brief-grid">
                {quality.data.o2 != null && <Metric label="Oxygène dissous" value={`${quality.data.o2.toFixed(1)} mg/L`} />}
                {quality.data.sat != null && <Metric label="Saturation O₂" value={`${Math.round(quality.data.sat)} %`} />}
                {quality.data.ph != null && <Metric label="pH" value={quality.data.ph.toFixed(1)} />}
              </div>
              <div className="brief-note">
                {quality.data.station} · {km(quality.data.dist)} · analyse ponctuelle (labo) du{" "}
                {frShort(quality.data.date)}
                {isOld(quality.data.date) && (
                  <b style={{ color: "#b06e14" }}> — donnée ancienne, à titre indicatif</b>
                )}
              </div>
            </>
          )}
          {quality.data === null && !quality.loading && !quality.error && (
            <div className="brief-empty">Aucune analyse physico-chimique à proximité.</div>
          )}
        </Section>

        {/* WEATHER */}
        <Section title="🌤️ Météo" state={meteo}>
          {meteo.data && (
            <>
              <div className="brief-grid">
                <Metric label={weatherLabel(meteo.data.now.code).icon + " Ciel"} value={`${Math.round(meteo.data.now.temp)} °C`} extra={weatherLabel(meteo.data.now.code).label} />
                <Metric label="Vent" value={`${Math.round(meteo.data.now.wind)} km/h`} extra={`${meteo.data.now.windCompass}${meteo.data.now.gust ? ` · raf. ${Math.round(meteo.data.now.gust)}` : ""}`} />
                <Metric
                  label="Pression"
                  value={`${Math.round(meteo.data.now.pressure)} hPa`}
                  extra={`${meteo.data.pressureTrend === "rising" ? "↗" : meteo.data.pressureTrend === "falling" ? "↘" : "→"} ${meteo.data.pressureDelta > 0 ? "+" : ""}${meteo.data.pressureDelta}/3h`}
                />
                <Metric label="Pluie / nuages" value={`${meteo.data.now.precip} mm`} extra={`${meteo.data.now.cloud}% nuages`} />
              </div>
              <div className="brief-days">
                {meteo.data.days.map((d) => (
                  <div className="brief-day" key={d.date}>
                    <span className="dw">{dayShort(d.date)}</span>
                    <span className="di">{weatherLabel(d.code).icon}</span>
                    <span className="dt">
                      {Math.round(d.tmax)}° <span className="lo">{Math.round(d.tmin)}°</span>
                    </span>
                    <span className="dp">{d.precip > 0 ? `${d.precip.toFixed(0)}mm` : ""}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>

        {/* SUN & MOON — always available (local) */}
        <div className="brief-sec">
          <div className="brief-sec-h">🌙 Soleil &amp; lune</div>
          <div className="brief-grid">
            <Metric label="🌅 Lever soleil" value={hhmm(astro.sun.sunrise)} />
            <Metric label="🌇 Coucher soleil" value={hhmm(astro.sun.sunset)} />
            <Metric label="Lune" value={`${Math.round(astro.moon.fraction * 100)}%`} extra={moonPhaseName(astro.moon.phase)} />
            <Metric label="Lune lever/coucher" value={`${hhmm(astro.mt.rise)} / ${hhmm(astro.mt.set)}`} />
          </div>
          <div className="brief-solunar">
            <b>Périodes solunaires</b> (indicatif, non scientifique) — majeures{" "}
            {hhmm(astro.sol.major[0])} · {hhmm(astro.sol.major[1])}
            {(astro.sol.minor[0] || astro.sol.minor[1]) &&
              ` · mineures ${hhmm(astro.sol.minor[0])} · ${hhmm(astro.sol.minor[1])}`}
          </div>
        </div>

        {/* OBSTACLES */}
        <Section title="🚧 Obstacles proches" state={obstacles}>
          {obstacles.data &&
            (obstacles.data.length ? (
              obstacles.data.map((o, i) => (
                <div className="brief-line" key={i}>
                  <div className="bl-main">
                    <b>{o.info.name}</b> · {o.info.type}
                    {o.info.height ? ` · ${o.info.height}` : ""}
                  </div>
                  <div className="bl-sub">
                    {km(o.dist)}
                    {o.info.pass ? ` · passe : ${o.info.pass}` : " · pas de passe à poissons"}
                  </div>
                </div>
              ))
            ) : (
              <div className="brief-empty">Aucun ouvrage recensé dans ~5 km.</div>
            ))}
        </Section>

        {/* ACCESS */}
        <Section title="🅿️ Accès proches" state={access}>
          {access.data &&
            (access.data.length ? (
              access.data.map((a, i) => (
                <div className="brief-line" key={i}>
                  <div className="bl-main">
                    {accessIcon(a.point.kind)} {a.point.name}
                  </div>
                  <div className="bl-sub">
                    {accessLabel(a.point.kind)} · {km(a.dist)}
                  </div>
                </div>
              ))
            ) : (
              <div className="brief-empty">Aucun accès référencé (OSM) dans ~5 km.</div>
            ))}
        </Section>

        <div className="brief-src">
          Données : Hub'Eau (OFB) · Open-Meteo · éphéméride locale · ROE/Sandre · OpenStreetMap.
        </div>
      </div>
    </div>
  );
}

// --- little presentational helpers ---

function Section<T>({ title, state, children }: { title: string; state: Async<T>; children: ReactNode }) {
  return (
    <div className="brief-sec">
      <div className="brief-sec-h">
        {title}
        {state.stale && <span className="brief-stale">· hors-ligne (dernier relevé)</span>}
      </div>
      {state.loading && !state.data && <div className="brief-load">Chargement…</div>}
      {state.error && <div className="brief-empty">Indisponible (connexion requise).</div>}
      {children}
    </div>
  );
}

function Metric({ label, value, extra }: { label: string; value: string; extra?: string }) {
  return (
    <div className="brief-metric">
      <div className="bm-label">{label}</div>
      <div className="bm-value">{value}</div>
      {extra && <div className="bm-extra">{extra}</div>}
    </div>
  );
}

function fmtQ(m3s: number): string {
  if (m3s < 1) return `${Math.round(m3s * 1000)} L/s`;
  return `${m3s.toFixed(m3s < 10 ? 2 : 0)} m³/s`;
}

function dayShort(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
}

function frShort(ymd: string): string {
  if (!ymd) return "—";
  const d = new Date(ymd + "T12:00:00");
  if (isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

/** True if a YYYY-MM-DD date is older than ~18 months (stale quality sample). */
function isOld(ymd: string): boolean {
  const t = new Date(ymd + "T12:00:00").getTime();
  if (isNaN(t)) return false;
  return Date.now() - t > 540 * 86400000;
}

// ONDE code → human state + tone. Only 1/1a/2/3/4 exist in the data.
function ondeInfo(code: string): { word: string; tone: string } {
  if (code === "3") return { word: "À SEC (assec)", tone: "bad" };
  if (code === "1" || code === "1a") return { word: "En eau — écoulement visible", tone: "good" };
  if (code === "1b") return { word: "En eau — écoulement faible", tone: "warn" };
  if (code === "2") return { word: "Écoulement non visible", tone: "warn" };
  return { word: "Observation impossible", tone: "" };
}
