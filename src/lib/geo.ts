// Small geographic helpers shared by the map data modules.

/** Great-circle distance in kilometres (haversine). */
export function distKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** A lon/lat bounding box of half-size `d` degrees around a point. */
export function boxAround(lat: number, lon: number, d: number) {
  return { w: lon - d, s: lat - d, e: lon + d, n: lat + d };
}

/**
 * A bounding box that really covers `km` in every direction.
 *
 * A degree of longitude is 111 km at the equator and 75 km at Blois, so a box
 * expressed in degrees is an ellipse in kilometres — narrower east-west, and
 * more so the further north. Every caller asked for degrees and then filtered
 * the answer in kilometres, which meant the query stopped short of the radius
 * the app went on to report having searched.
 */
export function boxAroundKm(lat: number, lon: number, km: number) {
  // 2 % over, because 111,32 km/° is a spherical average and the Earth is not
  // one: at Ajaccio the plain formula lands 30 m short of a 30 km radius. A box
  // slightly larger than asked costs a few extra features; one slightly smaller
  // lets the app claim it searched ground it never looked at.
  km *= 1.02;
  const dLat = km / 111.32;
  // Meridians converge to nothing at the poles; clamp so the box stays finite
  // instead of spanning the globe. France never comes close, but a division by
  // ~0 would turn a 20 km query into a worldwide one.
  const dLon = km / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.05));
  return { w: lon - dLon, s: lat - dLat, e: lon + dLon, n: lat + dLat };
}

/** Compass point (16-wind) for a bearing in degrees. */
const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO",
];
export function compass(deg: number): string {
  return COMPASS[Math.round(((deg % 360) / 22.5)) % 16];
}

/** "il y a 12 min" / "il y a 3 h" from an ISO timestamp, relative to now. */
export function ago(iso: string, now: Date = new Date()): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const min = Math.round((now.getTime() - t) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 45) return `il y a ${d} j`;
  // Past a few weeks, days stop being readable: "il y a 714 j" is a number
  // nobody converts into "the summer before last", and that reading was being
  // shown as the current water temperature.
  const mois = Math.round(d / 30.44);
  if (mois < 18) return `il y a ${mois} mois`;
  const ans = Math.floor(d / 365.25);
  return ans <= 1 ? "il y a un an" : `il y a ${ans} ans`;
}

/** Local HH:MM for a Date (or "—" if invalid/null). */
export function hhmm(d: Date | null | undefined): string {
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
