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
// Idem : les délais réseau du service worker vivent dans src/lib/sw-delais.ts,
// dérivés de ceux de fetchT, pour que les deux ne puissent pas se contredire.
// Un service worker qui coupe avant l'app sert un cache vide à la 1re visite.
import { SW_DELAIS_S } from "./src/lib/sw-delais";
// Idem pour la découpe du précache : quels dossiers restent dans l'install
// bloquant et lesquels passent en réserve. La liste est partagée avec
// src/lib/reserve-hors-ligne.ts, qui remplit le cache que la route lit — deux
// listes séparées finiraient par décrire deux découpes différentes.
import { GLOB_IGNORES_PRECACHE, MOTIF_RESERVE, CACHE_RESERVE } from "./src/lib/precache-decoupe";
// Idem pour le manifeste : sorti d'ici pour que manifest.test.ts puisse
// confronter chaque icône et chaque capture déclarées au contenu réel de
// public/, et vérifier que les balises og: d'index.html pointent vers la même
// app. Un chemin mort dans le manifeste ne se voit qu'à l'installation.
import { MANIFEST } from "./src/lib/manifest";

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
        // Ce qui reste ici est le NOYAU : code, styles, polices, icônes,
        // manifeste — 25 entrées, 2 728 Kio mesurés le 31/07/2026. C'est tout
        // ce qu'il faut pour démarrer et rendre un verdict, et c'est la seule
        // chose dont l'activation du service worker dépend désormais.
        //
        // Sortent d'ici (voir src/lib/precache-decoupe.ts pour les chiffres) :
        //  · assets/species/ — les 14,5 Mio de photos pleine taille, déjà
        //    exclues avant cette découpe, servies par leur route CacheFirst à
        //    l'ouverture d'une fiche ;
        //  · les 221 illustrations de la RÉSERVE — 5 132 Kio, 90 % des entrées
        //    du précache. Elles restent disponibles hors ligne : l'app les
        //    télécharge derrière l'activation (src/lib/reserve-hors-ligne.ts)
        //    dans le cache que la route ci-dessous interroge.
        globIgnores: [...GLOB_IGNORES_PRECACHE],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Once the user accepts the update, the freshly-activated worker must take
        // control of the OPEN page so `controllerchange` fires and the plugin reloads
        // at the right moment. Without clientsClaim that event never fires on the
        // current client, which is why the update used to "come back in a loop".
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // La réserve hors-ligne : les 221 illustrations sorties du précache
            // bloquant. C'est l'app qui remplit ce cache, après l'activation et
            // en parallèle (src/lib/reserve-hors-ligne.ts) ; le service worker
            // n'a qu'à le lire. Pas d'`expiration` : la réserve est bornée par
            // sa propre liste (5 132 Kio), et c'est `preparerReserve()` qui en
            // fait le ménage — un `maxEntries` ici purgerait des fichiers que
            // l'app croit présents, donc promettrait un hors-ligne faux.
            urlPattern: MOTIF_RESERVE,
            handler: "CacheFirst",
            options: {
              cacheName: CACHE_RESERVE,
              // 200 seulement : une réponse opaque ou un 404 mis en cache
              // serait resservi hors ligne à la place de l'image, sans recours.
              cacheableResponse: { statuses: [200] },
            },
          },
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
            //
            // 25 s, et non 6. Une classe de CoursEau pèse 973 ko (mesuré le
            // 31/07/2026) : à 6 s, le service worker abandonnait le réseau et
            // servait le cache — vide à la première visite. La couche
            // hydrographie n'apparaissait donc jamais au premier lancement.
            // Aligné sur DELAIS_MS.sandre de src/lib/net-bornes.ts, où le
            // calcul est expliqué.
            urlPattern: /^https:\/\/services\.sandre\.eaufrance\.fr\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "sandre-hydro",
              networkTimeoutSeconds: SW_DELAIS_S.sandre,
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
              networkTimeoutSeconds: SW_DELAIS_S.ign,
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
              networkTimeoutSeconds: SW_DELAIS_S.hubeau,
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
              networkTimeoutSeconds: SW_DELAIS_S.meteo,
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
              networkTimeoutSeconds: SW_DELAIS_S.gbif,
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
              networkTimeoutSeconds: SW_DELAIS_S.overpass,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: MANIFEST,
    }),
  ],
});
