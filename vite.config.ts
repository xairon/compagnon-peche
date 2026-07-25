import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Content-Security-Policy (defense-in-depth). Injected only in the built HTML —
// NOT in dev, where Vite's HMR needs inline/eval and a ws: connection. Scripts are
// restricted to 'self' (no inline script ships in prod); connect/img/frame are
// whitelisted to the exact third parties the app talks to. `data:`/`blob:` are
// needed for photo blobs and the backup import (fetch on a data: URL).
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com https://data.geopf.fr",
  "worker-src 'self' blob:",
  "connect-src 'self' data: blob: https://hubeau.eaufrance.fr https://services.sandre.eaufrance.fr https://data.geopf.fr https://api.open-meteo.com https://api.gbif.org https://overpass-api.de https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com",
  "frame-src https://map.geopeche.com",
  "manifest-src 'self'",
].join("; ");

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
export default defineConfig({
  base: "./",
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
