// Weather at a point via Open-Meteo (free, no key, CORS `*`). It redistributes
// AROME/ARPEGE/ICON models — real forecast data. Pressure trend is computed
// locally from the hourly pressure series (deterministic, not invented).

import { compass } from "./geo";
import { fetchT } from "./net";

const BASE = "https://api.open-meteo.com/v1/forecast";

/** Raised when a 200 response doesn't have the shape we asked for. Distinct
 *  from a network failure on purpose: the screens used to report a schema
 *  change as "connexion requise", which sends the maintainer looking in
 *  entirely the wrong place. */
export class SchemaError extends Error {
  constructor(champ: string) {
    super(`Réponse Open-Meteo inattendue : champ « ${champ} » absent.`);
    this.name = "SchemaError";
  }
}

/** A measurement, or null when the model didn't produce one. Never coerced to
 *  0: `Math.round(null)` is 0, and 0 °C is a real reading. */
type Mesure = number | null;

function num(v: unknown): Mesure {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export interface MeteoNow {
  temp: Mesure;
  feels: Mesure; // apparent temperature °C
  humidity: Mesure; // %
  wind: Mesure; // km/h
  windDir: Mesure; // degrees
  windCompass: string;
  gust: Mesure;
  precip: number; // mm — absent means none fell, so 0 is the honest default
  cloud: Mesure; // %
  /** Sea-level pressure (hPa). NOT surface pressure: at 76 m the two read
   *  1009 and 1018, and every angling rule of thumb about "high" and "low"
   *  is stated at sea level — showing the surface value under a sea-level
   *  label had readers seeing a depression during an anticyclone. */
  pressure: Mesure;
  code: Mesure;
}

/** One hourly point of today (for the temperature curve). */
export interface MeteoHour {
  time: string; // ISO local
  hour: number; // 0..23
  temp: number; // °C
  precipProb: number; // %
  past: boolean; // earlier than the current hour
}

export interface MeteoDay {
  date: string; // yyyy-mm-dd
  code: Mesure;
  tmax: Mesure;
  tmin: Mesure;
  precip: Mesure; // mm
  wind: Mesure; // km/h max
}

export type PressureTrend = "rising" | "falling" | "stable";

export interface Meteo {
  now: MeteoNow;
  pressureTrend: PressureTrend;
  pressureDelta: number; // hPa over ~3h
  days: MeteoDay[];
  hours: MeteoHour[]; // today, 00–23 h local
}

export async function fetchMeteo(lat: number, lon: number, signal?: AbortSignal): Promise<Meteo> {
  const params =
    // 3 decimals (~110 m) is plenty for a local forecast and avoids sending the
    // user's precise fishing spot to a third party (see privacy note on Sources).
    `latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,weather_code` +
    `&hourly=temperature_2m,precipitation_probability,pressure_msl&past_days=1` + // past_days so the 3h trend works before 03:00 local
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max` +
    `&forecast_days=7&timezone=auto`;
  const r = await fetchT(`${BASE}?${params}`, { signal, source: "meteo" });
  if (!r.ok) throw new Error("Open-Meteo " + r.status);
  return parseMeteo(await r.json());
}

/**
 * Turn an Open-Meteo payload into the app's shape.
 *
 * Split out of fetchMeteo so it can be tested against real payloads without a
 * network round-trip — the module had no test at all, and three defects lived
 * here undetected: yesterday leaking into the forecast, surface pressure shown
 * as sea-level pressure, and nulls becoming zeroes.
 */
export function parseMeteo(j: Record<string, unknown>): Meteo {
  const c = (j as { current?: Record<string, unknown> }).current;
  if (!c) throw new SchemaError("current");

  const now: MeteoNow = {
    temp: num(c.temperature_2m),
    feels: num(c.apparent_temperature),
    humidity: num(c.relative_humidity_2m),
    wind: num(c.wind_speed_10m),
    windDir: num(c.wind_direction_10m),
    windCompass: compass(num(c.wind_direction_10m) ?? 0),
    gust: num(c.wind_gusts_10m),
    precip: num(c.precipitation) ?? 0, // no reading means none fell
    cloud: num(c.cloud_cover),
    pressure: num(c.pressure_msl),
    code: num(c.weather_code),
  };

  // Pressure trend: compare the value nearest "now" with ~3h earlier. Same
  // quantity as the one displayed, or the arrow would contradict the number.
  const hourly = (j as { hourly?: Record<string, unknown> }).hourly;
  const times: string[] = (hourly?.time as string[]) || [];
  const press: number[] = (hourly?.pressure_msl as number[]) || [];
  const nowMs = new Date(String(c.time)).getTime();
  let iNow = 0;
  let best = Infinity;
  for (let i = 0; i < times.length; i++) {
    const dt = Math.abs(new Date(times[i]).getTime() - nowMs);
    if (dt < best) {
      best = dt;
      iNow = i;
    }
  }
  const iPast = Math.max(0, iNow - 3);
  const delta =
    press.length && press[iNow] != null && press[iPast] != null ? press[iNow] - press[iPast] : 0;
  const pressureTrend: PressureTrend = delta > 1 ? "rising" : delta < -1 ? "falling" : "stable";

  const todayStr = String(c.time || "").slice(0, 10);

  // `past_days=1` is requested for the 3 h pressure trend — and Open-Meteo
  // applies it to `daily` as well. Verified on the live API: daily.time began
  // at yesterday, carrying yesterday's thunderstorm code as the headline of the
  // forecast, and every tile after it was labelled a day late. Nothing on
  // screen let a reader notice.
  const d = (j as { daily?: Record<string, unknown[]> }).daily;
  const days: MeteoDay[] = ((d?.time as string[]) || [])
    .map((date: string, i: number) => ({
      date,
      code: num(d?.weather_code?.[i]),
      tmax: num(d?.temperature_2m_max?.[i]),
      tmin: num(d?.temperature_2m_min?.[i]),
      precip: num(d?.precipitation_sum?.[i]),
      wind: num(d?.wind_speed_10m_max?.[i]),
    }))
    .filter((x) => x.date >= todayStr);

  // Today's hourly temperature curve (local date of "now"), with a past/future flag.
  const temps: number[] = (hourly?.temperature_2m as number[]) || [];
  const pprob: number[] = (hourly?.precipitation_probability as number[]) || [];
  const nowHour = new Date(String(c.time)).getHours();
  const hours: MeteoHour[] = [];
  for (let i = 0; i < times.length; i++) {
    if (times[i].slice(0, 10) !== todayStr) continue;
    // Skip hours whose temperature is missing/null so the curve never sees NaN
    // (Open-Meteo can return null temps in partial model responses).
    const t = temps[i];
    if (typeof t !== "number" || !Number.isFinite(t)) continue;
    const hr = new Date(times[i]).getHours();
    hours.push({
      time: times[i],
      hour: hr,
      temp: t,
      precipProb: pprob[i] ?? 0,
      past: hr < nowHour,
    });
  }

  return { now, pressureTrend, pressureDelta: Math.round(delta * 10) / 10, days, hours };
}

/** WMO weather-code → { emoji, label } (French). */
export function weatherLabel(code: Mesure): { icon: string; label: string } {
  const m: Record<number, [string, string]> = {
    0: ["☀️", "Ciel clair"],
    1: ["🌤️", "Peu nuageux"],
    2: ["⛅", "Partiellement nuageux"],
    3: ["☁️", "Couvert"],
    45: ["🌫️", "Brouillard"],
    48: ["🌫️", "Brouillard givrant"],
    51: ["🌦️", "Bruine légère"],
    53: ["🌦️", "Bruine"],
    55: ["🌦️", "Bruine dense"],
    // 56/57 were missing from the table and fell through to "—". Freezing
    // drizzle is precisely the condition that turns a bank into a skating rink.
    56: ["🌨️", "Bruine verglaçante"],
    57: ["🌨️", "Bruine verglaçante forte"],
    61: ["🌧️", "Pluie faible"],
    63: ["🌧️", "Pluie"],
    65: ["🌧️", "Pluie forte"],
    66: ["🌧️", "Pluie verglaçante"],
    67: ["🌧️", "Pluie verglaçante forte"],
    71: ["🌨️", "Neige faible"],
    73: ["🌨️", "Neige"],
    75: ["🌨️", "Neige forte"],
    77: ["🌨️", "Grésil"],
    80: ["🌦️", "Averses"],
    81: ["🌦️", "Averses"],
    82: ["⛈️", "Averses violentes"],
    85: ["🌨️", "Averses de neige"],
    86: ["🌨️", "Averses de neige"],
    95: ["⛈️", "Orage"],
    96: ["⛈️", "Orage, grêle"],
    99: ["⛈️", "Orage, grêle"],
  };
  const [icon, label] = (code != null && m[code]) || ["🌡️", "—"];
  return { icon, label };
}
