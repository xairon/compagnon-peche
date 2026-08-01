import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  SPECIES_MEDIA,
  KNOT_MEDIA,
  CRAYFISH_MEDIA,
  GEAR_MEDIA,
  type MediaEntry,
} from "./media";
import { SPECIES } from "./species";
import { KNOTS } from "./knots";
import { ECREVISSES } from "./ecrevisses";

const pub = (f: string) => join(process.cwd(), "public", f);

const toutes: [string, MediaEntry][] = [
  ...Object.entries(SPECIES_MEDIA).flatMap(([k, arr]): [string, MediaEntry][] =>
    arr.map((m, i) => [`SPECIES_MEDIA.${k}[${i}]`, m]),
  ),
  ...Object.entries(KNOT_MEDIA).map(([k, m]): [string, MediaEntry] => [`KNOT_MEDIA.${k}`, m]),
  ...Object.entries(CRAYFISH_MEDIA).map(([k, m]): [string, MediaEntry] => [`CRAYFISH_MEDIA.${k}`, m]),
  ...Object.entries(GEAR_MEDIA).map(([k, m]): [string, MediaEntry] => [`GEAR_MEDIA.${k}`, m]),
];

/**
 * `media.ts` est régénéré depuis `scripts/images.manifest.json` sans jamais être
 * confronté au catalogue : rien, dans la chaîne de génération, ne vérifie que la
 * clé écrite correspond à une espèce, un nœud ou une écrevisse qui existe. Une
 * clé orpheline ne casse pas le build — elle s'affiche telle quelle, sous forme
 * de slug brut, sur l'écran Crédits photos, et sa vignette part quand même dans
 * le précache du service worker. Ces tests sont le seul endroit où la
 * correspondance est vérifiée.
 */
describe("médias — aucune clé ne pointe dans le vide", () => {
  it("chaque clé de SPECIES_MEDIA vise une espèce du catalogue", () => {
    const ids = new Set(SPECIES.map((s) => s.id));
    expect(Object.keys(SPECIES_MEDIA).filter((k) => !ids.has(k))).toEqual([]);
  });

  it("chaque clé de KNOT_MEDIA vise un nœud existant", () => {
    const ids = new Set(KNOTS.map((k) => k.id));
    expect(Object.keys(KNOT_MEDIA).filter((k) => !ids.has(k))).toEqual([]);
  });

  it("chaque clé de CRAYFISH_MEDIA vise une écrevisse existante", () => {
    const ids = new Set(ECREVISSES.map((e) => e.id));
    expect(Object.keys(CRAYFISH_MEDIA).filter((k) => !ids.has(k))).toEqual([]);
  });
});

/**
 * L'autre moitié du même défaut : une entrée peut nommer un fichier que
 * personne n'a téléchargé. L'écran rend alors un cadre vide, sans erreur.
 * `recipes.test.ts` couvrait déjà RECIPE_MEDIA et TECHNIQUE_MEDIA ; les cinq
 * autres collections, dont les 155 photos d'espèces, ne l'étaient pas.
 */
describe("médias — chaque fichier référencé existe vraiment", () => {
  it("le fichier pleine taille de chaque entrée est présent sous public/", () => {
    const manquants = toutes.filter(([, m]) => !existsSync(pub(m.file))).map(([k, m]) => `${k} → ${m.file}`);
    expect(manquants).toEqual([]);
  });

  // Ce sont les vignettes 400 px, et elles seules, qui sont précachées
  // (vite.config.ts : les photos pleine taille, ~11 Mo, ne le sont pas). Une
  // photo d'espèce sans vignette est donc une photo qui n'existe pas hors ligne
  // — c'est-à-dire dans la situation d'usage de l'app.
  it("chaque photo d'espèce a sa vignette précachée sous assets/species-sm", () => {
    const sans: string[] = [];
    for (const [id, arr] of Object.entries(SPECIES_MEDIA)) {
      for (const m of arr) {
        const sm = m.file.replace("assets/species/", "assets/species-sm/");
        if (!existsSync(pub(sm))) sans.push(`${id} → ${sm}`);
      }
    }
    expect(sans).toEqual([]);
  });
});

/**
 * Toutes les images embarquées sont sous licence libre, et CC BY / CC BY-SA
 * EXIGENT l'attribution. Une entrée sans auteur, sans licence ou sans lien vers
 * la page source est une redistribution qui ne respecte pas sa propre licence —
 * sur un écran qui promet « Merci à leurs auteurs ».
 */
describe("médias — l'attribution que la licence exige est présente", () => {
  it("chaque entrée porte auteur, licence et URL source", () => {
    const fautes = toutes
      .filter(([, m]) => !m.author?.trim() || !m.license?.trim() || !/^https?:\/\//.test(m.sourceUrl ?? ""))
      .map(([k]) => k);
    expect(fautes).toEqual([]);
  });
});
