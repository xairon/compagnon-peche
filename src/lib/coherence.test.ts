import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Garde-fou de cohérence réglementaire.
 *
 * L'app a affiché pendant un temps deux mailles différentes pour le même
 * poisson : « Ma prise » annonçait celle de l'arrêté départemental pendant que
 * la grille d'espèces, le carrousel d'accueil, la fiche et la règle affichaient
 * encore la valeur nationale. Toute maille ou quota montré à l'utilisateur doit
 * passer par effectiveMaille / effectiveQuota — jamais par le champ brut.
 *
 * Ce test échoue si quelqu'un réintroduit un accès direct dans un écran.
 */
const UI_DIRS = ["src/screens", "src/components"];

function uiFiles(): string[] {
  const out: string[] = [];
  for (const d of UI_DIRS) {
    for (const f of readdirSync(d)) {
      if ((f.endsWith(".tsx") || f.endsWith(".ts")) && !f.includes(".test.")) out.push(join(d, f));
    }
  }
  return out;
}

describe("cohérence réglementaire dans l'interface", () => {
  it("aucun écran n'affiche sp.maille ou sp.quota sans passer par la résolution partagée", () => {
    const offenders: string[] = [];
    for (const path of uiFiles()) {
      const src = readFileSync(path, "utf8");
      src.split("\n").forEach((line: string, i: number) => {
        // On ne vise que l'AFFICHAGE DIRECT en JSX. La valeur brute reste
        // légitime en second rang, explicitement étiquetée « national », à côté
        // de la valeur applicable — c'est ce que fait la barre de verdict de la
        // fiche. D'où le refus des `${...}` (interpolation dans un libellé).
        const shows = /(?<!\$)\{\s*sp\.(maille|quota)\s*\}/.test(line);
        if (shows) offenders.push(`${path}:${i + 1} → ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("les écrans qui montrent une maille importent bien la résolution partagée", () => {
    const showsSize = ["src/screens/Prise.tsx", "src/screens/Regle.tsx", "src/screens/Fiche.tsx",
                       "src/screens/Especes.tsx", "src/screens/Accueil.tsx"];
    for (const path of showsSize) {
      const src = readFileSync(path, "utf8");
      expect(src, `${path} doit importer effectiveMaille`).toContain("effectiveMaille");
    }
  });
});
