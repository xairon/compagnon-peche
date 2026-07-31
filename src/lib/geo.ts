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

/** Longueur d'un degré sur la sphère de rayon 6371 km — celle de distKm. */
const KM_PAR_DEGRE = (Math.PI * 6371) / 180;

/**
 * Distance en kilomètres d'un point à une polyligne, ou `null` si la géométrie
 * ne situe rien.
 *
 * Pourquoi pas simplement le sommet le plus proche : le Sandre échantillonne
 * ses axes très inégalement. Mesuré le 31/07/2026 sur `sa:TronconHydrographique`
 * autour de Blois, l'écart reste faible (161 m au segment contre 165 m au
 * sommet), mais un tronçon rectiligne de plusieurs kilomètres n'a que deux
 * sommets, et le point qui se tient au milieu serait alors déclaré à des
 * kilomètres d'une rivière qu'il touche.
 *
 * `null` et non `Infinity` : un tronçon dont on ne sait pas lire la géométrie
 * n'est pas « très loin », il est illisible. Rendre un nombre laisserait
 * l'appelant comparer à un seuil et croire avoir répondu.
 *
 * Projection locale plate (equirectangulaire) : à l'échelle du kilomètre en
 * France, l'erreur devant la haversine est de l'ordre du millième — et la
 * question posée est « à moins de N mètres ? », pas une mesure géodésique.
 * Les coordonnées sont en [lon, lat], l'ordre GeoJSON du Sandre.
 */
export function distKmPolyligne(lat: number, lon: number, geometry: unknown): number | null {
  const g = geometry as { type?: string; coordinates?: unknown } | null | undefined;
  if (!g || !Array.isArray(g.coordinates)) return null;
  const lignes: unknown[] =
    g.type === "LineString"
      ? [g.coordinates]
      : g.type === "MultiLineString"
        ? g.coordinates
        : [];
  // Un Point, un Polygon ou un type inconnu ne sont pas des polylignes : on ne
  // les convertit pas en silence, on dit qu'on ne sait pas.
  if (!lignes.length) return null;

  // Échelle locale, calculée une fois : combien de kilomètres vaut un degré ici.
  // MÊME sphère que distKm (R = 6371 km), sinon les deux fonctions se
  // contredisent : avec la moyenne usuelle de 111,32 km/°, l'écart atteignait
  // 8,5 m sur 7,5 km — 0,11 %, invisible mais gratuit.
  const kx = KM_PAR_DEGRE * Math.cos((lat * Math.PI) / 180);
  const ky = KM_PAR_DEGRE;
  let best = Infinity;
  for (const l of lignes) {
    if (!Array.isArray(l)) continue;
    const pts: [number, number][] = [];
    for (const p of l) {
      if (!Array.isArray(p) || !Number.isFinite(Number(p[0])) || !Number.isFinite(Number(p[1])))
        continue;
      pts.push([(Number(p[0]) - lon) * kx, (Number(p[1]) - lat) * ky]);
    }
    if (!pts.length) continue;
    // Une ligne réduite à un sommet est une position, pas un segment : la
    // distance à ce sommet reste la bonne réponse.
    if (pts.length === 1) best = Math.min(best, Math.hypot(pts[0][0], pts[0][1]));
    for (let i = 0; i + 1 < pts.length; i++) {
      best = Math.min(best, distSegment(pts[i], pts[i + 1]));
    }
  }
  return Number.isFinite(best) ? best : null;
}

/** Distance de l'origine au segment [a, b], en coordonnées locales (km). */
function distSegment(a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  // Segment dégénéré (deux sommets confondus) : pas de division par zéro, la
  // projection vaut le sommet.
  let t = len2 === 0 ? 0 : -(a[0] * dx + a[1] * dy) / len2;
  // La perpendiculaire n'existe que sur le segment ; au-delà, c'est un bout.
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(a[0] + t * dx, a[1] + t * dy);
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
