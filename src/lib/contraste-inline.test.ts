import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ratioContraste } from "./contraste";

/**
 * Le trou que contraste-palette.test.ts laisse ouvert, et le dit lui-même :
 * il ne voit que `src/styles.css`. Or ce dépôt pose beaucoup de couleurs en
 * style inline dans le JSX, et celles-là échappaient à toute mesure.
 *
 * Ce test ne prétend PAS balayer le JSX — impossible sans résoudre le fond
 * hérité de chaque élément, ce qu'aucune analyse statique ne sait faire. Il
 * fait quelque chose de plus étroit et de vérifiable : il interdit la
 * réapparition des couleurs de texte dont le ratio a été MESURÉ trop bas sur
 * les fonds clairs de l'app.
 *
 * Trois couleurs ne sont volontairement PAS dans la liste :
 *  · #fbfaf7, #fff, #8fbfa4, #9db4a6, #cfa85c, #c9a24a — mesurées à moins de
 *    2,4:1 sur --paper, mais ce sont des textes CLAIRS sur fonds SOMBRES
 *    (surfaces sapin). Les compter serait le faux positif que le test doit
 *    éviter.
 *  · #b08a3e à 3,07:1 — employé en `stroke` d'icône et de courbe, pas en
 *    texte. Un élément graphique porteur d'information relève du seuil 3:1
 *    (WCAG 1.4.11), qu'il passe.
 */

const RACINES = ["src/screens", "src/components"];
const PAPIER = "#fbfaf7";

/** Couleurs de TEXTE mesurées sous 4,5:1 sur --paper, et leur remplaçant. */
const INTERDITES: { hex: string; ratio: number; remplacant: string }[] = [
  { hex: "#a8a495", ratio: 2.39, remplacant: "var(--muted) — 5,4:1" },
  { hex: "#c9c3b4", ratio: 1.68, remplacant: "#95907f — 3,06:1 (chevron, 1.4.11)" },
  { hex: "#b06e14", ratio: 3.96, remplacant: "var(--amber) — 4,9:1" },
];

/**
 * Fichiers tolérés, avec la raison. Une exception qui ne se justifie pas se
 * retire ; une exception muette se transforme en oubli.
 */
const EXCEPTIONS: Record<string, string> = {
  // Deux sessions parallèles tenaient ces fichiers ouverts au moment de la
  // correction (attribution Géopêche dans Carte.tsx, lien profond vers une
  // recette supprimée dans RecipeView.tsx). Corriger dessus aurait produit un
  // conflit. À reprendre — ce sont les deux dernières occurrences.
  "Carte.tsx": "session parallèle en cours",
  "RecipeView.tsx": "session parallèle en cours",
};

function fichiers(): string[] {
  const out: string[] = [];
  for (const r of RACINES) {
    for (const f of readdirSync(r)) {
      if (/\.tsx?$/.test(f) && !/\.test\./.test(f)) out.push(join(r, f));
    }
  }
  return out;
}

/** Occurrences en position de COULEUR DE TEXTE (`color:`), pas de `stroke`. */
function occurrences(hex: string): string[] {
  const re = new RegExp(`color\\s*:\\s*["']?${hex}`, "i");
  return fichiers().filter((f) => re.test(readFileSync(f, "utf8")));
}

describe("couleurs de texte posées en dur dans le JSX", () => {
  for (const { hex, ratio, remplacant } of INTERDITES) {
    it(`${hex} (${ratio}:1) ne revient pas comme couleur de texte — remplacer par ${remplacant}`, () => {
      const restants = occurrences(hex)
        .map((f) => f.split(/[\\/]/).pop()!)
        .filter((n) => !(n in EXCEPTIONS));

      expect(restants).toEqual([]);
    });
  }

  it("les valeurs interdites sont bien sous le seuil AA sur --paper", () => {
    // Le test ne vaut que si la mesure qui le motive est juste : on la refait.
    for (const { hex } of INTERDITES) {
      expect(ratioContraste(hex, PAPIER), hex).toBeLessThan(4.5);
    }
  });

  it("chaque exception nomme sa raison", () => {
    for (const [f, raison] of Object.entries(EXCEPTIONS)) {
      expect(raison.length, f).toBeGreaterThan(10);
    }
  });
});
