// Sun & moon ephemeris + solunar periods — computed locally, works 100% offline.
// Core astronomy ported from SunCalc (Vladimir Agafonkin, MIT). No dependency,
// no network. Precision is a few minutes — ample for fishing.
//
// Honesty note: the astronomy (rise/set, phase, transit) is real, deterministic
// data. The "solunar" claim that fish bite more at these times (Knight, 1926) is
// NOT solidly established — the UI must label solunar periods as indicative.

const rad = Math.PI / 180;
const dayMs = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;
const e = rad * 23.4397; // obliquity of the Earth

const toJulian = (d: Date) => d.valueOf() / dayMs - 0.5 + J1970;
const fromJulian = (j: number) => new Date((j + 0.5 - J1970) * dayMs);
const toDays = (d: Date) => toJulian(d) - J2000;

const rightAscension = (l: number, b: number) =>
  Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
const declination = (l: number, b: number) =>
  Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
const azimuth = (H: number, phi: number, dec: number) =>
  Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
const altitude = (H: number, phi: number, dec: number) =>
  Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
const siderealTime = (d: number, lw: number) => rad * (280.16 + 360.9856235 * d) - lw;

function astroRefraction(h: number): number {
  if (h < 0) h = 0;
  return 0.0002967 / Math.tan(h + 0.00312536 / (h + 0.08901179));
}

const solarMeanAnomaly = (d: number) => rad * (357.5291 + 0.98560028 * d);
function eclipticLongitude(M: number): number {
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = rad * 102.9372;
  return M + C + P + Math.PI;
}
function sunCoords(d: number) {
  const M = solarMeanAnomaly(d);
  const L = eclipticLongitude(M);
  return { dec: declination(L, 0), ra: rightAscension(L, 0) };
}

export function sunPosition(date: Date, lat: number, lng: number) {
  const lw = rad * -lng;
  const phi = rad * lat;
  const d = toDays(date);
  const c = sunCoords(d);
  const H = siderealTime(d, lw) - c.ra;
  return { azimuth: azimuth(H, phi, c.dec), altitude: altitude(H, phi, c.dec) };
}

// ---- Sunrise / sunset ----
const J0 = 0.0009;
const julianCycle = (d: number, lw: number) => Math.round(d - J0 - lw / (2 * Math.PI));
const approxTransit = (Ht: number, lw: number, n: number) => J0 + (Ht + lw) / (2 * Math.PI) + n;
const solarTransitJ = (ds: number, M: number, L: number) =>
  J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
const hourAngle = (h: number, phi: number, d: number) =>
  Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));

function getSetJ(h: number, lw: number, phi: number, dec: number, n: number, M: number, L: number) {
  const w = hourAngle(h, phi, dec);
  const a = approxTransit(w, lw, n);
  return solarTransitJ(a, M, L);
}

export interface SunTimes {
  sunrise: Date | null;
  sunset: Date | null;
  dawn: Date | null;
  dusk: Date | null;
  noon: Date;
}

export function sunTimes(date: Date, lat: number, lng: number): SunTimes {
  const lw = rad * -lng;
  const phi = rad * lat;
  const d = toDays(date);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L, 0);
  const Jnoon = solarTransitJ(ds, M, L);

  const times = (angleDeg: number): [Date | null, Date | null] => {
    const arg = (Math.sin(angleDeg * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
    if (arg < -1 || arg > 1) return [null, null]; // polar day/night
    const Jset = getSetJ(angleDeg * rad, lw, phi, dec, n, M, L);
    const Jrise = Jnoon - (Jset - Jnoon);
    return [fromJulian(Jrise), fromJulian(Jset)];
  };

  const [sunrise, sunset] = times(-0.833);
  const [dawn, dusk] = times(-6); // civil twilight
  return { sunrise, sunset, dawn, dusk, noon: fromJulian(Jnoon) };
}

// ---- Moon ----
function moonCoords(d: number) {
  const L = rad * (218.316 + 13.176396 * d);
  const M = rad * (134.963 + 13.064993 * d);
  const F = rad * (93.272 + 13.22935 * d);
  const l = L + rad * 6.289 * Math.sin(M);
  const b = rad * 5.128 * Math.sin(F);
  const dt = 385001 - 20905 * Math.cos(M);
  return { ra: rightAscension(l, b), dec: declination(l, b), dist: dt };
}

export function moonPosition(date: Date, lat: number, lng: number) {
  const lw = rad * -lng;
  const phi = rad * lat;
  const d = toDays(date);
  const c = moonCoords(d);
  const H = siderealTime(d, lw) - c.ra;
  let h = altitude(H, phi, c.dec);
  h += astroRefraction(h);
  return { azimuth: azimuth(H, phi, c.dec), altitude: h, distance: c.dist };
}

export interface MoonIllumination {
  fraction: number; // 0 (new) .. 1 (full)
  phase: number; // 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter
}

export function moonIllumination(date: Date): MoonIllumination {
  const d = toDays(date);
  const s = sunCoords(d);
  const m = moonCoords(d);
  const sdist = 149598000;
  const phi = Math.acos(
    Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra),
  );
  const inc = Math.atan2(sdist * Math.sin(phi), m.dist - sdist * Math.cos(phi));
  const angle = Math.atan2(
    Math.cos(s.dec) * Math.sin(s.ra - m.ra),
    Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra),
  );
  return {
    fraction: (1 + Math.cos(inc)) / 2,
    phase: 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / Math.PI,
  };
}

export function moonPhaseName(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return "Nouvelle lune";
  if (phase < 0.22) return "Premier croissant";
  if (phase < 0.28) return "Premier quartier";
  if (phase < 0.47) return "Gibbeuse croissante";
  if (phase < 0.53) return "Pleine lune";
  if (phase < 0.72) return "Gibbeuse décroissante";
  if (phase < 0.78) return "Dernier quartier";
  return "Dernier croissant";
}

// ---- Moonrise / moonset (scan of the day) ----
export function moonTimes(date: Date, lat: number, lng: number): { rise: Date | null; set: Date | null } {
  const t = new Date(date);
  t.setHours(0, 0, 0, 0);
  const hc = 0.133 * rad;
  let h0 = moonPosition(t, lat, lng).altitude - hc;
  let rise: number | null = null;
  let set: number | null = null;

  // Sample every 2 hours, root-find the crossing quadratically (SunCalc method).
  for (let i = 1; i <= 24; i += 2) {
    const h1 = moonPosition(hoursLater(t, i), lat, lng).altitude - hc;
    const h2 = moonPosition(hoursLater(t, i + 1), lat, lng).altitude - hc;
    const a = (h0 + h2) / 2 - h1;
    const b = (h2 - h0) / 2;
    const xe = -b / (2 * a);
    const ye = (a * xe + b) * xe + h1;
    const d = b * b - 4 * a * h1;
    let roots = 0;
    let x1 = 0;
    let x2 = 0;
    if (d >= 0) {
      const dx = Math.sqrt(d) / (Math.abs(a) * 2);
      x1 = xe - dx;
      x2 = xe + dx;
      if (Math.abs(x1) <= 1) roots++;
      if (Math.abs(x2) <= 1) roots++;
      if (x1 < -1) x1 = x2;
    }
    if (roots === 1) {
      if (h0 < 0) rise = i + x1;
      else set = i + x1;
    } else if (roots === 2) {
      rise = i + (ye < 0 ? x2 : x1);
      set = i + (ye < 0 ? x1 : x2);
    }
    if (rise !== null && set !== null) break;
    h0 = h2;
  }
  return {
    rise: rise !== null ? hoursLater(t, rise) : null,
    set: set !== null ? hoursLater(t, set) : null,
  };
}

function hoursLater(d: Date, h: number): Date {
  return new Date(d.getTime() + h * 3600000);
}

// ---- Solunar periods (indicative) ----
// Major = moon overhead (transit) & underfoot (anti-transit) — found as the day's
// max & min moon altitude. Minor = moonrise & moonset. Astronomy is real; the
// bite-prediction is folklore (label accordingly in the UI).
export interface Solunar {
  major: [Date, Date]; // overhead, underfoot
  minor: [Date | null, Date | null]; // rise, set
}

export function solunar(date: Date, lat: number, lng: number): Solunar {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  let maxT = start;
  let minT = start;
  let maxA = -Infinity;
  let minA = Infinity;
  for (let m = 0; m <= 24 * 60; m += 10) {
    const t = new Date(start.getTime() + m * 60000);
    const a = moonPosition(t, lat, lng).altitude;
    if (a > maxA) {
      maxA = a;
      maxT = t;
    }
    if (a < minA) {
      minA = a;
      minT = t;
    }
  }
  const { rise, set } = moonTimes(date, lat, lng);
  return { major: [maxT, minT], minor: [rise, set] };
}
