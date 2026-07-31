import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { SPECIES } from "./species";
import { SPECIES_FICHES } from "./species-fiches";

// Les 182 ko de sections descriptives sont sortis du chargement initial : tout
// écran important SPECIES les tirait, alors qu'un seul les lit.
//
// Ce découpage n'a de valeur que tant que PERSONNE ne réimporte les fiches
// statiquement. Un seul `import { … } from "./fiches"` ailleurs, et les 182 ko
// reviennent dans le chunk principal sans que rien ne le signale — le gain
// disparaît en silence, ce qui est exactement le genre de dérive que ce dépôt
// attrape partout ailleurs.

function sources(): string[] {
  const out: string[] = [];
  const parcourir = (d: string) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) parcourir(p);
      else if (/\.tsx?$/.test(e) && !/\.test\./.test(e)) out.push(p);
    }
  };
  parcourir("src");
  return out;
}

describe("découpage des fiches", () => {
  it("un seul module importe data/fiches statiquement", () => {
    const importeurs = sources().filter((p) => {
      const s = readFileSync(p, "utf8");
      // `import … from "./fiches"` ou "../data/fiches", hors import() dynamique.
      return /^\s*import[^(]*from\s+["'][^"']*\/fiches["']/m.test(s);
    });

    expect(importeurs.map((p) => p.replace(/\\/g, "/"))).toEqual(["src/data/species-fiches.ts"]);
  });

  it("l'overlay ajoute réellement du contenu au catalogue léger", () => {
    // Nuance mesurée en écrivant ce test, et qui vaut d'être écrite : le
    // catalogue LÉGER porte déjà des sections `fish`/`cook`/`bio` — celles des
    // espèces rédigées à la main, qui vivent dans species.ts même. Ce qui est
    // parti dans le module paresseux, ce sont les 182 ko de l'overlay
    // `data/fiches/**`, pas toute section descriptive.
    //
    // Le découpage se mesure donc à la DIFFÉRENCE entre les deux catalogues.
    const enrichies = SPECIES_FICHES.filter((f, i) => {
      const l = SPECIES[i]!;
      return f.ident !== l.ident || f.fish !== l.fish || f.cook !== l.cook || f.bio !== l.bio;
    });

    expect(enrichies.length).toBeGreaterThan(100);
  });

  it("les deux catalogues décrivent les mêmes espèces, dans le même ordre", () => {
    // Sinon l'écran Fiche afficherait une espèce différente de celle que la
    // liste a ouverte.
    expect(SPECIES_FICHES.map((s) => s.id)).toEqual(SPECIES.map((s) => s.id));
  });

  it("la garde « espèce protégée » vit dans le catalogue LÉGER", () => {
    // C'est le point de la séparation : une règle qui décide de ce que l'app a
    // le droit d'afficher ne peut pas attendre un chargement paresseux. Un
    // écran monté avant les fiches ne doit jamais pouvoir proposer une
    // technique de pêche sur une espèce protégée.
    const interdites = SPECIES.filter((s) => s.protected || s.season === "special");

    expect(interdites.length).toBeGreaterThan(0);
    expect(interdites.every((s) => !s.fish && !s.cook)).toBe(true);
  });

  it("et elle tient aussi dans le catalogue enrichi", () => {
    const interdites = SPECIES_FICHES.filter((s) => s.protected || s.season === "special");

    expect(interdites.every((s) => !s.fish && !s.cook)).toBe(true);
  });
});
