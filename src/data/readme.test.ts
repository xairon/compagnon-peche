import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SPECIES } from "./species";
import { FICHES } from "./fiches";
import { RECIPES } from "./recipes";
import { KNOTS } from "./knots";
import { SPECIES_MEDIA } from "./media";
import { DEPARTEMENTS } from "./regulation";

/**
 * Les compteurs du README avaient dérivé de 35 % : il annonçait 83 espèces pour
 * 129, 17 recettes pour 20, 78/83 photos pour 120/129, et deux départements
 * réglementaires sur trois. Aucun effet au bord de l'eau — mais c'est la
 * vitrine, et un projet qui sous-estime son propre contenu se lit mal.
 *
 * Recompter à la main ne sert à rien : ces cinq nombres redeviendront faux au
 * prochain lot de fiches. Ce test les tient au code. Il est fait pour ÉCHOUER à
 * chaque ajout d'espèce, de recette ou de photo, et le message d'échec donne le
 * nombre à écrire — la mise à jour du README appartient au commit qui ajoute le
 * contenu, pas à un ménage six mois plus tard.
 *
 * Chaque compteur est dérivé des données, jamais recopié : si la dérivation et
 * le README divergent, c'est le README qui a tort.
 */
const README = readFileSync(join(process.cwd(), "README.md"), "utf8");

const attendu = (extrait: string) => {
  expect(
    README.includes(extrait),
    `Le README doit contenir « ${extrait} ». Recompté depuis les données ; c'est le README qu'il faut mettre à jour, dans le commit qui a changé le contenu.`,
  ).toBe(true);
};

describe("README — les compteurs annoncés sont ceux des données", () => {
  const nbEspeces = SPECIES.length;
  const nbBase = Object.keys(FICHES).length;
  const nbCurees = SPECIES.filter((s) => !FICHES[s.id]).length;
  const photos = Object.values(SPECIES_MEDIA).flat();
  const avecPhoto = SPECIES.filter((s) => (SPECIES_MEDIA[s.id]?.length ?? 0) > 0).length;
  const plusieursPhotos = SPECIES.filter((s) => (SPECIES_MEDIA[s.id]?.length ?? 0) > 1).length;
  const avecJuvenile = SPECIES.filter((s) =>
    SPECIES_MEDIA[s.id]?.some((m) => /juv/i.test(m.caption ?? "")),
  ).length;

  it("la dérivation elle-même est cohérente", () => {
    // Garde-fou du garde-fou : si `curées + base ≠ total`, les nombres écrits
    // dans le README seraient exacts un par un et faux ensemble.
    expect(nbCurees + nbBase).toBe(nbEspeces);
  });

  it("le nombre d'espèces", () => {
    attendu(`(${nbEspeces} espèces)`);
    attendu(`**${nbEspeces} fiches** (${nbCurees} curées + ${nbBase} base enrichies)`);
    attendu(`**Fiches curées** (${nbCurees})`);
  });

  it("le nombre de recettes", () => {
    attendu(`**${RECIPES.length} recettes sourcées**`);
  });

  it("le nombre de nœuds", () => {
    attendu(`**${KNOTS.length} nœuds et montages**`);
  });

  it("la couverture photo", () => {
    attendu(`**${photos.length} photos de poissons**`);
    attendu(
      `${avecPhoto}/${nbEspeces} espèces ont ≥ 1 photo, ${plusieursPhotos} en ont plusieurs, ${avecJuvenile} avec juvénile`,
    );
  });

  it("les départements dont la réglementation locale est portée", () => {
    const ids = Object.keys(DEPARTEMENTS).sort();
    expect(ids.length, "adapter la phrase du README si un 4ᵉ département entre").toBe(3);
    attendu(`arrêtés préfectoraux ${ids[0]}, ${ids[1]} & ${ids[2]}`);
  });
});
