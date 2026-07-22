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
  return `il y a ${d} j`;
}

/** Local HH:MM for a Date (or "—" if invalid/null). */
export function hhmm(d: Date | null | undefined): string {
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
