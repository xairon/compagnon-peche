import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { defineConfig, type Plugin } from "vite";

const pkg = createRequire(import.meta.url)("./package.json") as { version: string };
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// The policy itself lives in src/lib/csp.ts so csp.test.ts can check it against
// the map's own source lists — a host missing here is invisible in dev (the
// policy is build-only) and blanks a layer for every user in production.
import { cspHeader } from "./src/lib/csp";

const CSP = cspHeader();

const cspPlugin: Plugin = {
  name: "inject-csp",
  apply: "build",
  transformIndexHtml() {
    return [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: CSP },
        injectTo: "head-prepend",
      },
    ];
  },
};

// Offline-first PWA. Everything the app needs is precached so it runs with
// zero network once installed — the core requirement for use at the water's edge.
// Build identity, substituted into src/lib/build.ts. The commit is read from
// git rather than stored, so it cannot drift; a missing git (tarball build)
// degrades to "inconnu" instead of failing the build.
function commitCourt(): string {
  try {
    // execFileSync, not execSync: no shell, nothing to interpolate into.
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "inconnu";
  }
}

export default defineConfig({
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __COMMIT__: JSON.stringify(commitCourt()),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  build: {
    // Isolate MapLibre in its own chunk so it loads only with the Carte screen.
    rollupOptions: { output: { manualChunks: { maplibre: ["maplibre-gl"] } } },
  },
  plugins: [
    cspPlugin,
    react(),
    VitePWA({
      // Prompt mode: we surface a "new version" toast instead of a silent reload.
      // injectRegister null -> only our manual registerSW (lib/pwa.ts) registers.
      registerType: "prompt",
      injectRegister: null,
      includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2}"],
        // Full-size species photos (~11 MB) are NOT precached: they made a first
        // install 13.7 MB, which is a lot to ask over 4G at the water's edge. The
        // 400 px thumbnails under /assets/species-sm ARE precached (~1.9 MB), so
        // every list, grid and confusion tile works offline out of the box; the
        // full photo is cached the first time a fiche is opened, and the gallery
        // falls back to the thumbnail until then. Regenerate with `npm run thumbs`.
        globIgnores: ["**/assets/species/**"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Once the user accepts the update, the freshly-activated worker must take
        // control of the OPEN page so `controllerchange` fires and the plugin reloads
        // at the right moment. Without clientsClaim that event never fires on the
        // current client, which is why the update used to "come back in a loop".
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Full-size species photos, kept out of the precache (see globIgnores):
            // cached the first time a fiche is opened, then available offline for good.
            urlPattern: /\/assets\/species\/[^/]+\.webp$/,
            handler: "CacheFirst",
            options: {
              cacheName: "species-photos",
              expiration: { maxEntries: 250, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Carto basemap style, glyphs, sprites and vector tiles — cache on use
            // so viewed map areas keep working offline.
            urlPattern: /^https:\/\/[a-z0-9]*\.?basemaps\.cartocdn\.com\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "carto-basemap",
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // DDT MapServer overlays (réserves de pêche, catégorie piscicole) —
            // see lib/parcours.ts. Cache-first like the other raster layers:
            // these are regulatory boundaries, they change once a year at most,
            // and a blank layer reads as "no reserve here" rather than as a
            // missing tile. Modest quota — the layers are off by default.
            urlPattern: /^https:\/\/ogc\.geo-ide\.developpement-durable\.gouv\.fr\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "wms-parcours",
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Sandre hydrography (rivers, water bodies) — fresh online, cached fallback.
            urlPattern: /^https:\/\/services\.sandre\.eaufrance\.fr\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "sandre-hydro",
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // IGN WMTS raster tiles (Satellite / Plan IGN) — cache-first with a
            // large quota so viewed areas keep working offline.
            urlPattern: /^https:\/\/data\.geopf\.fr\/wmts.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "ign-tiles",
              expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // IGN Géoplateforme geocoder (JSON) — network first with cache fallback.
            urlPattern: /^https:\/\/data\.geopf\.fr\/geocodage\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "ign-geocode",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Hub'Eau: fresh when online, fall back to the last response offline.
            urlPattern: /^https:\/\/hubeau\.eaufrance\.fr\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "hubeau-api",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Open-Meteo weather — fresh online, last forecast offline.
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "open-meteo",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 12 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // GBIF occurrences — fresh online, last response offline.
            urlPattern: /^https:\/\/api\.gbif\.org\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "gbif-api",
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // OpenStreetMap Overpass (access POIs) — GET, cached for offline reuse.
            urlPattern: /^https:\/\/overpass-api\.de\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "overpass-osm",
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: "Compagnon de pêche",
        short_name: "Pêche",
        description:
          "Fiches espèces, réglementation, cuisine et gestes de pêche en eau douce — hors-ligne.",
        lang: "fr",
        theme_color: "#16281E",
        background_color: "#FBFAF7",
        display: "standalone",
        orientation: "portrait",
        start_url: "./",
        scope: "./",
        icons: [
          { src: "favicon.svg", sizes: "any", type: "image/svg+xml" },
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
