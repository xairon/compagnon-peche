import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Ce test a changé de nature avec le thème sombre, et c'est un gain.
 *
 * Avant : une liste noire de trois couleurs mesurées trop faibles sur --paper.
 * Elle ne voyait que ce qu'on y avait écrit, et elle ne dit plus rien depuis
 * que les styles inline sont passés aux jetons.
 *
 * Maintenant : AUCUN littéral de couleur en style inline. C'est plus strict et
 * plus simple à tenir — une couleur en dur ne peut pas changer avec le thème,
 * donc elle est un bug de thème sombre, indépendamment de son contraste. La
 * mesure du contraste, elle, se fait sur les jetons dans contraste-palette.
 */
const LITTERAL =
  /(?:background(?:Color)?|color|fill|stroke|borderColor|outlineColor)\s*:\s*"(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))"/g;

const RACINES = ["src/screens", "src/components"];

/**
 * Fichiers tolérés, avec la raison. Une exception qui ne se justifie pas se
 * retire ; une exception muette se transforme en oubli.
 */
const TOLERES: Record<string, string> = {
  "src/screens/Regle.tsx":
    "Instrument de mesure : fond clair dans les deux thèmes, pour que la " +
    "silhouette du poisson posé dessus reste lisible. Voir la spec du thème sombre.",
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

describe("aucun littéral de couleur en style inline", () => {
  it("chaque fichier .tsx est soit propre, soit toléré avec une raison", () => {
    const restants: string[] = [];
    for (const f of fichiers()) {
      const chemin = f.replace(/\\/g, "/");
      if (chemin in TOLERES) continue;
      const contenu = readFileSync(f, "utf8");
      for (const m of contenu.matchAll(LITTERAL)) {
        restants.push(`${chemin} : ${m[0]}`);
      }
    }
    expect(restants).toEqual([]);
  });

  it("chaque exception nomme sa raison", () => {
    for (const [f, raison] of Object.entries(TOLERES)) {
      expect(raison.length, f).toBeGreaterThan(10);
    }
  });
});
