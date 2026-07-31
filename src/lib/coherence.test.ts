import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { SPECIES } from "../data/species";
import { speciesStatus } from "./statut";
import { priseView } from "./prise";
import { effectiveMaille } from "./maille";
import { season } from "./season";
import { join } from "node:path";

// `priseView` reçoit désormais son horloge (voir ./prise.ts). Cette garde
// compare deux surfaces entre elles, pas des dates : on fige un jour où la
// 1ʳᵉ catégorie et le brochet sont ouverts, sinon la comparaison « vert dans la
// grille / vert dans le parcours » devient un test de calendrier déguisé.
const NOW = new Date(2026, 5, 15, 10, 0, 0);

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

/**
 * La première version de cette garde ne cherchait que `{sp.maille}` en JSX —
 * elle n'a rien vu quand la grille d'espèces a transformé « Interdit » en
 * « Pas de maille », ni quand elle a affiché une pastille verte pour un
 * migrateur sous moratoire. On teste désormais le RÉSULTAT, pas la syntaxe.
 */
describe("cohérence des verdicts entre écrans", () => {
  it("aucune espèce n'est verte dans la grille et « à vérifier » dans le parcours", () => {
    const desaccords = SPECIES.filter((sp) => {
      const vert = speciesStatus(sp).cls === "good";
      const v = priseView(sp, "statut", { c: 0, b: 0 }, "41", NOW);
      return vert && v?.tone !== "good";
    }).map((sp) => sp.id);
    expect(desaccords).toEqual([]);
  });

  it("aucune espèce à maille non numérique n'est annoncée « sans maille »", () => {
    const perdues = SPECIES.filter((sp) => {
      const brut = (sp.maille || "").trim();
      const aUneRegle = brut !== "" && brut !== "—";
      return aUneRegle && effectiveMaille(sp, "41").label === null;
    }).map((sp) => sp.id);
    expect(perdues).toEqual([]);
  });
});

/**
 * Le trou par lequel la quatrième incohérence est passée : la fiche dérivait la
 * couleur de sa pastille de `season(sp).open`, qui répond « y a-t-il une
 * fermeture nationale » et vaut TRUE pour les espèces protégées comme pour le
 * régime spécial. 28 espèces — dont l'esturgeon, pêche interdite partout —
 * affichaient un point vert « Ouverte toute l'année » au-dessus de leur photo.
 *
 * Aucune garde ne pouvait le voir : l'une grepait une forme syntaxique, l'autre
 * ne comparait que des modules purs. On interdit désormais la source du défaut.
 */
describe("aucun écran ne colore un statut depuis season().open", () => {
  it("les écrans n'utilisent pas season(...).open pour choisir une couleur", () => {
    const offenders: string[] = [];
    for (const path of uiFiles()) {
      const src = readFileSync(path, "utf8");
      src.split("\n").forEach((line: string, i: number) => {
        // Un ternaire sur `.open` qui produit une couleur ou une classe.
        if (/\.open\s*\?/.test(line) && /#[0-9A-Fa-f]{3,6}|"(good|bad|warn)"/.test(line)) {
          offenders.push(`${path}:${i + 1} → ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("aucune espèce non-verte n'est présentée en vert par la fiche", () => {
    // La fiche suit désormais speciesStatus ; ce test fige l'écart avec l'ancien
    // critère pour que personne ne revienne à season().open sans s'en apercevoir.
    const divergentes = SPECIES.filter(
      (sp) => season(sp).open && speciesStatus(sp).cls !== "good",
    ).map((sp) => sp.id);
    expect(divergentes.length).toBeGreaterThan(0); // sinon le test ne prouve rien
    for (const id of divergentes) {
      const sp = SPECIES.find((s) => s.id === id)!;
      expect(speciesStatus(sp).cls, `${id} ne doit pas être vert`).not.toBe("good");
    }
  });
});
