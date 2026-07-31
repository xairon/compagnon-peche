import { describe, it, expect } from "vitest";
import {
  PREFIXES_RESERVE,
  GLOB_IGNORES_PRECACHE,
  MOTIF_RESERVE,
  estDansLaReserve,
} from "./precache-decoupe";

/**
 * Le précache pesait 7 860 Kio en 246 entrées, et workbox les installe UNE PAR
 * UNE (PrecacheController.install : boucle `for … await`). Tant que la 246e
 * n'est pas arrivée, le service worker ne s'active pas : le hors-ligne vaut
 * zéro, quel que soit le chemin parcouru. Un install interrompu en 4G ne laisse
 * donc rien — alors que l'app affiche « Hors-ligne — toutes les fiches restent
 * disponibles ».
 *
 * Composition mesurée le 31/07/2026 sur `npm run build` (dist/sw.js) :
 *
 *   assets/species-sm  2 514 Kio  154 fichiers
 *   assets (JS/CSS)    2 250 Kio   12 fichiers
 *   assets/gear        1 113 Kio   15 fichiers
 *   assets/crayfish      684 Kio    6 fichiers
 *   assets/fonts         431 Kio    7 fichiers
 *   assets/recipes       356 Kio    4 fichiers
 *   assets/techniques    197 Kio    2 fichiers
 *   assets/knots         145 Kio   36 fichiers
 *   assets/knots-steps   123 Kio    4 fichiers
 *   (racine)              47 Kio    6 fichiers
 *
 * La coupure : le NOYAU (code, styles, polices, icônes, manifeste) doit être là
 * pour que l'app démarre et rende un verdict — un verdict est du texte, il ne
 * dépend d'aucune photo. Les 221 illustrations sont la RÉSERVE : elles restent
 * disponibles hors ligne, mais elles arrivent après, sans bloquer l'activation.
 */
describe("découpe précache / réserve", () => {
  it("sort de l'install bloquant les sept dossiers d'illustrations", () => {
    // Ce sont les 221 fichiers, 5 132 Kio, qui représentent 90 % des entrées et
    // 65 % du poids — et aucun n'est nécessaire pour rendre un verdict.
    expect([...PREFIXES_RESERVE].sort()).toEqual([
      "assets/crayfish/",
      "assets/gear/",
      "assets/knots-steps/",
      "assets/knots/",
      "assets/recipes/",
      "assets/species-sm/",
      "assets/techniques/",
    ]);
  });

  it("chaque préfixe de la réserve a bien son exclusion de précache", () => {
    // Deux listes qui décrivent la même coupure finissent par se contredire :
    // un dossier sorti de la réserve mais toujours précaché est téléchargé deux
    // fois ; l'inverse le rend indisponible hors ligne sans que rien ne le dise.
    for (const p of PREFIXES_RESERVE) {
      expect(GLOB_IGNORES_PRECACHE).toContain(`**/${p}**`);
    }
  });

  it("laisse les photos pleine taille là où elles étaient déjà", () => {
    // assets/species (14,5 Mio) était déjà hors précache, avec sa propre route
    // CacheFirst. La découpe ne la reprend pas : sa règle existe.
    expect(GLOB_IGNORES_PRECACHE).toContain("**/assets/species/**");
    expect(estDansLaReserve("assets/species/brochet.webp")).toBe(false);
  });

  it("reconnaît une illustration de la réserve, quel que soit le préfixe d'URL", () => {
    expect(estDansLaReserve("assets/species-sm/brochet.webp")).toBe(true);
    expect(estDansLaReserve("./assets/knots/clinch.webp")).toBe(true);
    expect(estDansLaReserve("https://exemple.fr/app/assets/gear/tresse.webp")).toBe(true);
  });

  it("ne reconnaît PAS le noyau : le confondre le sortirait du précache", () => {
    for (const u of [
      "index.html",
      "manifest.webmanifest",
      "assets/index-D1ycGXhu.css",
      "assets/index-DtltjjE0.js",
      "assets/maplibre-D6KsYbmY.js",
      "assets/fonts/ss4-normal-700-latin.woff2",
      "icon-512.png",
    ]) {
      expect(estDansLaReserve(u)).toBe(false);
    }
  });

  it("le motif de route du service worker vise les mêmes fichiers", () => {
    // Le service worker sert la réserve depuis le cache que l'app remplit. Si
    // le motif et la liste divergent, l'app remplit un cache que personne ne lit.
    for (const p of PREFIXES_RESERVE) {
      expect(MOTIF_RESERVE.test(`https://exemple.fr/${p}fichier.webp`)).toBe(true);
    }
    expect(MOTIF_RESERVE.test("https://exemple.fr/assets/index-DtltjjE0.js")).toBe(false);
    expect(MOTIF_RESERVE.test("https://exemple.fr/assets/species/brochet.webp")).toBe(false);
  });
});
