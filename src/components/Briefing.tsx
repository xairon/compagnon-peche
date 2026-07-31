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
import { assessCrue, crueLabel } from "../lib/crue";
import { ondeEtat } from "../lib/onde";
import { useNow } from "../lib/now";
import {
  classeO2,
  classeSaturationO2,
  sursaturationO2,
  classePh,
  classeGlobale,
  classeLabel,
  isStaleQuality,
  isTooFar,
  MAX_DIST_KM,
} from "../lib/qualiteEau";
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
// `fetchedKey` tags which `key` the rest of the record was resolved for.
// `loading`/`error` are derived by comparing it to the current `key` instead
// of being reset with a synchronous setState at the top of the effect: same
// result (a key change immediately shows loading, old data included, until
// the new fetch resolves — the effect never touches `loading`/`error`
// directly), no setState before the async boundary.
interface FetchRecord<T> {
  fetchedKey: string | null;
  data: T | null;
  error: boolean;
  stale: boolean;
}
function useFetch<T>(key: string, fn: (s: AbortSignal) => Promise<T>, deps: unknown[]): Async<T> {
  const [rec, setRec] = useState<FetchRecord<T>>({
    fetchedKey: null,
    data: (CACHE.get(key) as T) ?? null,
    error: false,
    stale: false,
  });
  useEffect(() => {
    const ac = new AbortController();
    fn(ac.signal)
      .then((data) => {
        CACHE.set(key, data);
        setRec({ fetchedKey: key, data, error: false, stale: false });
      })
      .catch((e) => {
        if ((e as Error).name === "AbortError") return;
        const cached = CACHE.get(key) as T | undefined;
        setRec({ fetchedKey: key, data: cached ?? null, error: cached == null, stale: cached != null });
      });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return {
    loading: rec.fetchedKey !== key,
    data: rec.data,
    error: rec.fetchedKey === key && rec.error,
    stale: rec.stale,
  };
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

  // ---- Flood-rise heuristic (see lib/crue.ts) — derived from the SAME hydro
  // readings above, recomputed whenever they're refreshed. No banner at all
  // when nothing is happening: staying quiet at "aucune" IS the discreet state.
  // `now` comes from the clock hook, so the freshness guard inside assessCrue is
  // re-evaluated as time passes. Memoised on Date.now() it stayed frozen at the
  // moment of the fetch — a page left open kept reusing that verdict for hours.
  const now = useNow();
  const crue = useMemo(
    () => (water.data ? assessCrue(water.data.h, water.data.q, now) : null),
    [water.data, now],
  );

  // ---- Water quality verdict (see lib/qualiteEau.ts) — worst-of the three
  // classified parameters, SEQ-Eau grid. Abstains beyond MAX_DIST_KM (see
  // the Section below) rather than showing a number that isn't representative.
  const qGlobal = useMemo(() => {
    if (!quality.data || isTooFar(quality.data.dist)) return null;
    const { o2, sat, ph } = quality.data;
    return classeGlobale([
      o2 != null ? classeO2(o2) : undefined,
      sat != null ? classeSaturationO2(sat) : undefined,
      ph != null ? classePh(ph) : undefined,
    ]);
  }, [quality.data]);

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

        {/* FLOOD-RISE HEURISTIC — quiet when nothing's happening, unmissable
            otherwise. Not the official Vigicrues vigilance: an indice derived
            from the same Hub'Eau readings shown below (see lib/crue.ts). */}
        {crue && crue.level !== "aucune" && (
          <>
            <div className={"verdict-banner " + crueLabel(crue.level).tone}>
              <span className="vb-word">⚠️ {crueLabel(crue.level).title}</span>
            </div>
            <div className="brief-note" style={{ marginTop: -8, marginBottom: 14 }}>
              {crue.reasons.join(" · ")} — indice calculé à partir des relevés Hub'Eau ci-dessous, ce
              n'est pas la vigilance officielle.{" "}
              <a href="https://www.vigicrues.gouv.fr/" target="_blank" rel="noopener noreferrer">
                Voir Vigicrues →
              </a>
            </div>
          </>
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

        {/* FLOW (ONDE) — titled by what the network actually observes. ONDE
            watches small watercourses prone to drying; large rivers have no
            station, so this never describes the water the angler is standing
            in. Saying "Écoulement" made an assec on a brook 13 km away read as
            a verdict on the Loire. */}
        <Section title="🌊 Petits cours d'eau du secteur" state={onde}>
          {onde.data &&
            (() => {
              const etat = ondeEtat(onde.data.code, onde.data.label);
              return (
                <>
                  <div className={"onde-state " + (etat.tone === "inconnu" ? "" : etat.tone)}>
                    {etat.mot}
                  </div>
                  <div className="brief-note">
                    {onde.data.station}
                    {onde.data.dist != null && ` · ${km(onde.data.dist)}`} · relevé ONDE du{" "}
                    {frShort(onde.data.date)} (suivi par campagnes, pas temps réel)
                  </div>
                  <div className="brief-note">
                    Le réseau ONDE suit les ruisseaux et têtes de bassin sujets à l'assèchement — pas
                    les grandes rivières. Un assec ici ne dit rien du cours d'eau où vous pêchez.
                  </div>
                </>
              );
            })()}
          {onde.data === null && !onde.loading && !onde.error && (
            <div className="brief-empty">Aucune station ONDE avec relevé récent à proximité.</div>
          )}
        </Section>

        {/* QUALITY (physico-chemistry) — classified with the SEQ-Eau grid
            (lib/qualiteEau.ts), never as a health/consumption verdict. */}
        <Section title="🧪 Qualité de l'eau" state={quality}>
          {quality.data &&
            (isTooFar(quality.data.dist) ? (
              <div className="brief-empty">
                Station physico-chimique la plus proche : {quality.data.station} · {km(quality.data.dist)} — trop
                loin (plus de {MAX_DIST_KM} km) pour représenter cet endroit, non affichée.
              </div>
            ) : (
              <>
                {qGlobal && (
                  <div className={"verdict-banner " + classeLabel(qGlobal).tone} style={{ marginBottom: 10 }}>
                    <span className="vb-word">Qualité {classeLabel(qGlobal).word.toLowerCase()}</span>
                  </div>
                )}
                <div className="brief-grid">
                  {quality.data.o2 != null && (
                    <Metric label="Oxygène dissous" value={`${quality.data.o2.toFixed(1)} mg/L`} extra={classeLabel(classeO2(quality.data.o2)).word} />
                  )}
                  {quality.data.sat != null && (
                    <Metric
                      label="Saturation O₂"
                      value={`${Math.round(quality.data.sat)} %`}
                      // SEQ-Eau ne borne que le déficit : 224 % y est « très
                      // bon ». On garde le verdict de la grille et on ajoute la
                      // réserve, plutôt que de réécrire la source.
                      extra={
                        sursaturationO2(quality.data.sat)
                          ? "sursaturation — eau eutrophe, oxygène qui chute la nuit"
                          : classeLabel(classeSaturationO2(quality.data.sat)).word
                      }
                    />
                  )}
                  {quality.data.ph != null && (
                    <Metric label="pH" value={quality.data.ph.toFixed(1)} extra={classeLabel(classePh(quality.data.ph)).word} />
                  )}
                </div>
                <div className="brief-note">
                  {quality.data.station} · {km(quality.data.dist)} · analyse ponctuelle (labo) du{" "}
                  {frShort(quality.data.date)}
                  {isStaleQuality(quality.data.date) && (
                    <b style={{ color: "#b06e14" }}> — donnée ancienne, à titre indicatif</b>
                  )}
                </div>
                <div className="brief-note" style={{ fontSize: 11, opacity: 0.75 }}>
                  Classement selon la grille SEQ-Eau (oxygène, acidification — MEDD &amp; agences de l'eau, 2003), un
                  seul prélèvement, pas une synthèse DCE annuelle. Ce n'est pas un avis sanitaire : voir la fiche
                  espèce pour les recommandations ANSES sur la consommation.
                </div>
              </>
            ))}
          {quality.data === null && !quality.loading && !quality.error && (
            <div className="brief-empty">Aucune analyse physico-chimique à moins de {MAX_DIST_KM} km.</div>
          )}
        </Section>

        {/* WEATHER */}
        <Section title="🌤️ Météo" state={meteo}>
          {meteo.data && (
            <>
              <div className="brief-grid">
                <Metric label={weatherLabel(meteo.data.now.code).icon + " Ciel"} value={mes(meteo.data.now.temp, " °C")} extra={weatherLabel(meteo.data.now.code).label} />
                <Metric label="Vent" value={mes(meteo.data.now.wind, " km/h")} extra={`${meteo.data.now.windCompass}${meteo.data.now.gust ? ` · raf. ${Math.round(meteo.data.now.gust)}` : ""}`} />
                <Metric
                  label="Pression au niveau de la mer"
                  value={mes(meteo.data.now.pressure, " hPa")}
                  extra={`${meteo.data.pressureTrend === "rising" ? "↗" : meteo.data.pressureTrend === "falling" ? "↘" : "→"} ${meteo.data.pressureDelta > 0 ? "+" : ""}${meteo.data.pressureDelta}/3h`}
                />
                <Metric label="Pluie / nuages" value={`${meteo.data.now.precip} mm`} extra={mes(meteo.data.now.cloud, "% nuages")} />
              </div>
              <div className="brief-days">
                {meteo.data.days.map((d) => (
                  <div className="brief-day" key={d.date}>
                    {/* Day name AND date: with past_days leaking into `daily`
                        the row read "jeu ven sam dim lun mar mer jeu" — two
                        Thursdays and nothing to notice it by. */}
                    <span className="dw">
                      {dayShort(d.date)} {d.date.slice(8, 10)}
                    </span>
                    <span className="di">{weatherLabel(d.code).icon}</span>
                    <span className="dt">
                      {mes(d.tmax, "°")} <span className="lo">{mes(d.tmin, "°")}</span>
                    </span>
                    <span className="dp">{d.precip && d.precip > 0 ? `${d.precip.toFixed(0)}mm` : ""}</span>
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

/** A measurement the model may not have produced. Renders "—" rather than a
 *  rounded null, which reads as a genuine zero. */
function mes(v: number | null | undefined, unite = "", decimales = 0): string {
  return v == null ? "—" : `${v.toFixed(decimales)}${unite}`;
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

