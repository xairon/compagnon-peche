import { describe, it, expect } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { KNOTS } from "./knots";
import { ALL_KNOT_MEDIA } from "../components/media-helpers";
import { LOCAL_KNOT_MEDIA } from "./knot-diagrams";

const pub = (f: string) => join(process.cwd(), "public", f);

describe("nœuds & montages — cohérence des données", () => {
  it("chaque fiche a au moins 2 étapes", () => {
    const fautes = KNOTS.filter((k) => k.steps.length < 2).map((k) => k.id);
    expect(fautes).toEqual([]);
  });
});

/**
 * Une fiche montre UNE illustration, ou aucune. Rien entre les deux.
 *
 * L'app a longtemps affiché, sous chaque étape écrite, un « schéma » maison de
 * quelques traits — un trait vertical, une ellipse, une légende. Trente de ces
 * fichiers, pour dix montages. Aucun n'apprend à faire le nœud : le palomar,
 * dont tout l'intérêt est le passage de l'hameçon dans la boucle, s'y résumait
 * à une ellipse posée sur une ligne. Ils occupaient la place d'une illustration
 * sans en faire le travail.
 *
 * Ce tableau est l'arbitrage, fiche par fiche, et il est la référence :
 *
 *  · `commons`  — une vraie illustration libre, reprise de Wikimedia Commons,
 *                 avec auteur, licence et lien vers la page source ;
 *  · `maison`   — un schéma vectoriel dessiné ici, gardé parce qu'il est propre
 *                 et légendé (corps de ligne, potence, plomb, surface, fond) et
 *                 que Commons ne couvre pas ce montage ;
 *  · `aucune`   — rien de libre n'existe et rien de propre n'a été dessiné : la
 *                 fiche garde son texte, qui reste utile au bord de l'eau, et
 *                 ne montre aucun cadre.
 *
 * Changer une ligne, c'est décider ; le test est là pour que ça se décide.
 */
const ARBITRAGE: Record<string, "commons" | "maison" | "aucune"> = {
  // Nœuds
  clinch: "commons",
  palomar: "aucune",
  raccord: "maison",
  boucle: "commons",
  sang: "commons",
  albright: "commons",
  chaise: "commons",
  // Montages
  dropshot: "aucune",
  texan: "commons",
  paternoster: "maison",
  carolina: "aucune",
  wacky: "aucune",
  anglaise: "aucune",
  feeder: "aucune",
  cheveu: "aucune",
};

describe("illustrations des nœuds — une vraie, ou rien", () => {
  it("le tableau d'arbitrage couvre exactement le catalogue", () => {
    expect(Object.keys(ARBITRAGE).sort()).toEqual(KNOTS.map((k) => k.id).sort());
  });

  it("chaque fiche montre ce que l'arbitrage a décidé", () => {
    const reel: Record<string, string> = {};
    for (const k of KNOTS) {
      const m = ALL_KNOT_MEDIA[k.id];
      reel[k.id] = !m ? "aucune" : LOCAL_KNOT_MEDIA[k.id] ? "maison" : "commons";
    }
    expect(reel).toEqual(ARBITRAGE);
  });

  it("chaque illustration Commons porte auteur, licence et lien vers la page source", () => {
    const fautes: string[] = [];
    for (const [id, m] of Object.entries(ALL_KNOT_MEDIA)) {
      if (LOCAL_KNOT_MEDIA[id]) continue;
      if (!m.author?.trim() || !m.license?.trim()) fautes.push(`${id} — auteur ou licence manquant`);
      if (!/^https:\/\/commons\.wikimedia\.org\//.test(m.sourceUrl ?? ""))
        fautes.push(`${id} — pas de lien vers la page Commons`);
    }
    expect(fautes).toEqual([]);
  });

  it("chaque fichier référencé existe sous public/", () => {
    const manquants = Object.entries(ALL_KNOT_MEDIA)
      .filter(([, m]) => !existsSync(pub(m.file)))
      .map(([id, m]) => `${id} → ${m.file}`);
    expect(manquants).toEqual([]);
  });

  /**
   * L'inverse : un fichier livré que rien n'affiche. Il part quand même dans la
   * réserve hors ligne — l'app le télécharge, le garde, et personne ne le voit
   * jamais. C'est exactement ce qui était arrivé à `dropshot.svg`,
   * `paternoster.svg`, `raccord.svg` et `texan.webp`, masqués par les séquences
   * par étape qui les surchargeaient.
   */
  it("aucun fichier livré n'est invisible depuis l'app", () => {
    const affiches = new Set(Object.values(ALL_KNOT_MEDIA).map((m) => m.file));
    const orphelins: string[] = [];
    const dir = "assets/knots/";
    for (const f of readdirSync(pub(dir))) if (!affiches.has(dir + f)) orphelins.push(dir + f);
    expect(orphelins).toEqual([]);
  });
});
