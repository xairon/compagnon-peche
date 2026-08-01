import { describe, it, expect } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { KNOT_STEPS } from "./knot-steps.gen";
import { KNOTS } from "./knots";

const pub = (f: string) => join(process.cwd(), "public", f);

describe("séquences par étape", () => {
  it("chaque séquence vise une fiche du catalogue", () => {
    const ids = new Set(KNOTS.map((k) => k.id));
    expect(Object.keys(KNOT_STEPS).filter((id) => !ids.has(id))).toEqual([]);
  });

  /**
   * L'invariant central. Le texte et les images sont écrits et générés
   * séparément, par deux mains et à deux moments : rien d'autre que ce test
   * n'empêche un geste ajouté au texte de rester sans image, ou une planche
   * redécoupée plus finement de laisser une vignette orpheline.
   *
   * Quand il casse, c'est la PLANCHE qui a raison : elle montre un nombre de
   * gestes qu'on ne choisit pas. C'est le texte qui se redécoupe.
   */
  it("autant d'images que de gestes écrits", () => {
    const fautes: string[] = [];
    for (const [id, imgs] of Object.entries(KNOT_STEPS)) {
      const k = KNOTS.find((x) => x.id === id);
      if (k && k.steps.length !== imgs.length)
        fautes.push(`${id} — ${k.steps.length} gestes, ${imgs.length} images`);
    }
    expect(fautes).toEqual([]);
  });

  it("les vignettes d'une séquence se suivent sans trou", () => {
    const fautes: string[] = [];
    for (const [id, imgs] of Object.entries(KNOT_STEPS))
      imgs.forEach((m, i) => {
        if (!m.file.endsWith(`/${id}-${i + 1}.webp`))
          fautes.push(`${id}[${i}] → ${m.file} (attendu ${id}-${i + 1}.webp)`);
      });
    expect(fautes).toEqual([]);
  });

  it("chaque vignette existe sous public/", () => {
    const manquants = Object.entries(KNOT_STEPS).flatMap(([id, imgs]) =>
      imgs.filter((m) => !existsSync(pub(m.file))).map((m) => `${id} → ${m.file}`),
    );
    expect(manquants).toEqual([]);
  });

  /**
   * L'attribution doit survivre à la découpe : une vignette extraite d'une
   * planche CC BY reste soumise à la même obligation que la planche entière,
   * et l'écran Crédits photos la lit ici.
   */
  it("chaque vignette porte auteur, licence et page source Commons", () => {
    const fautes: string[] = [];
    for (const [id, imgs] of Object.entries(KNOT_STEPS))
      for (const m of imgs) {
        if (!m.author?.trim() || !m.license?.trim())
          fautes.push(`${id} → ${m.file} : auteur ou licence`);
        if (!/^https:\/\/commons\.wikimedia\.org\//.test(m.sourceUrl ?? ""))
          fautes.push(`${id} → ${m.file} : pas de page Commons`);
      }
    expect(fautes).toEqual([]);
  });

  /** L'inverse : un fichier livré que rien n'affiche part quand même dans la
   *  réserve hors ligne, et personne ne le voit jamais. */
  it("aucune vignette livrée n'est orpheline", () => {
    const affichees = new Set(Object.values(KNOT_STEPS).flatMap((a) => a.map((m) => m.file)));
    const dir = "assets/knots-steps/";
    const orphelins = readdirSync(pub(dir)).filter((f) => !affichees.has(dir + f));
    expect(orphelins).toEqual([]);
  });
});
