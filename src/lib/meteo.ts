// Weather at a point via Open-Meteo (free, no key, CORS `*`). It redistributes
// AROME/ARPEGE/ICON models — real forecast data. Pressure trend is computed
// locally from the hourly pressure series (deterministic, not invented).

import { compass } from "./geo";

const BASE = "https://api.open-meteo.com/v1/forecast";

export interface MeteoNow {
  temp: number;
  feels: number; // apparent temperature °C
  humidity: number; // %
  wind: number; // km/h
  windDir: number; // degrees
  windCompass: string;
  gust: number;
  precip: number; // mm
  cloud: number; // %
  pressure: number; // hPa
  code: number;
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
  code: number;
  tmax: number;
  tmin: number;
  precip: number; // mm
  wind: number; // km/h max
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
    `latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,weather_code` +
    `&hourly=temperature_2m,precipitation_probability,surface_pressure&past_days=1` + // past_days so the 3h trend works before 03:00 local
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max` +
    `&forecast_days=7&timezone=auto`;
  const r = await fetch(`${BASE}?${params}`, { signal });
  if (!r.ok) throw new Error("Open-Meteo " + r.status);
  const j = await r.json();

  const c = j.current;
  const now: MeteoNow = {
    temp: c.temperature_2m,
    feels: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    wind: c.wind_speed_10m,
    windDir: c.wind_direction_10m,
    windCompass: compass(c.wind_direction_10m),
    gust: c.wind_gusts_10m,
    precip: c.precipitation,
    cloud: c.cloud_cover,
    pressure: c.surface_pressure,
    code: c.weather_code,
  };

  // Pressure trend: compare the value nearest "now" with ~3h earlier.
  const times: string[] = j.hourly?.time || [];
  const press: number[] = j.hourly?.surface_pressure || [];
  const nowMs = new Date(c.time).getTime();
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

  const d = j.daily;
  const days: MeteoDay[] = (d?.time || []).map((date: string, i: number) => ({
    date,
    code: d.weather_code[i],
    tmax: d.temperature_2m_max[i],
    tmin: d.temperature_2m_min[i],
    precip: d.precipitation_sum[i],
    wind: d.wind_speed_10m_max[i],
  }));

  // Today's hourly temperature curve (local date of "now"), with a past/future flag.
  const temps: number[] = j.hourly?.temperature_2m || [];
  const pprob: number[] = j.hourly?.precipitation_probability || [];
  const todayStr = (c.time || "").slice(0, 10);
  const nowHour = new Date(c.time).getHours();
  const hours: MeteoHour[] = [];
  for (let i = 0; i < times.length; i++) {
    if (times[i].slice(0, 10) !== todayStr) continue;
    const hr = new Date(times[i]).getHours();
    hours.push({
      time: times[i],
      hour: hr,
      temp: temps[i],
      precipProb: pprob[i] ?? 0,
      past: hr < nowHour,
    });
  }

  return { now, pressureTrend, pressureDelta: Math.round(delta * 10) / 10, days, hours };
}

/** WMO weather-code → { emoji, label } (French). */
export function weatherLabel(code: number): { icon: string; label: string } {
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
  const [icon, label] = m[code] || ["🌡️", "—"];
  return { icon, label };
}
