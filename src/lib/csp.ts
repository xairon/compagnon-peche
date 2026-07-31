// Content-Security-Policy (defense-in-depth). Injected only into the BUILT html
// — not in dev, where Vite's HMR needs inline/eval and a ws: connection.
// Scripts are restricted to 'self' (no inline script ships in prod);
// connect/img/frame are whitelisted to the exact third parties the app talks to.
// `data:`/`blob:` are needed for photo blobs and the backup import (fetch on a
// data: URL).
//
// Lives here rather than inside vite.config.ts so csp.test.ts can check it
// against the host lists the map actually builds its sources from. Because the
// policy only exists in a production build, a missing host is invisible during
// development and silently breaks a layer for every user — that test is the
// only thing standing between a new remote source and a blank map.

export const CSP_DIRECTIVES: string[] = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  // ogc.geo-ide… serves the DDT MapServer layers (réserves de pêche, catégorie
  // piscicole) listed in lib/parcours.ts — see csp.test.ts, which derives the
  // required hosts from that list rather than trusting this line.
  "img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com https://data.geopf.fr https://ogc.geo-ide.developpement-durable.gouv.fr",
  "worker-src 'self' blob:",
  "connect-src 'self' data: blob: https://hubeau.eaufrance.fr https://services.sandre.eaufrance.fr https://data.geopf.fr https://ogc.geo-ide.developpement-durable.gouv.fr https://api.open-meteo.com https://api.gbif.org https://overpass-api.de https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com",
  "frame-src https://map.geopeche.com",
  "manifest-src 'self'",
];

export const cspHeader = (): string => CSP_DIRECTIVES.join("; ");
