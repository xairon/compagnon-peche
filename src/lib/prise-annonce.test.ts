import { describe, it, expect } from "vitest";
import { priseView, type PriseView } from "./prise";
import { annonceVerdict } from "./prise-annonce";
import { SPECIES } from "../data/species";

/**
 * Le verdict de prise est la sortie la plus lourde de l'app : il dit si on a le
 * droit de garder un poisson. À l'écran il est porté par une bannière colorée,
 * un cartouche et un titre — trois `<div>` muets. Rien ne l'annonce.
 *
 * `annonceVerdict` fabrique la phrase à annoncer : la bannière (ce qui bloque
 * la décision, lu en moins de trois secondes) PUIS le titre, parce qu'un
 * lecteur d'écran lit dans l'ordre et que « ne pas relâcher vivant » doit venir
 * en premier.
 *
 * CE QUE CE FICHIER NE COUVRE PAS : la région live qui doit porter la phrase,
 * dans `src/screens/Prise.tsx`. Cet écran appartient à un autre lot de la
 * vague et n'est pas modifié ici — voir le rapport du lot.
 */
const sp = (id: string) => SPECIES.find((s) => s.id === id);
const LE_15_JUIN = new Date("2026-06-15T10:00:00");
const QUOTA_VIDE = { c: 0, b: 0 };

/** Un verdict minimal, pour tester la mise en phrase sans dépendre des données. */
const verdict = (p: Partial<PriseView>): PriseView => ({
  bd: "",
  kickFg: "",
  titleFg: "",
  kicker: "",
  title: "",
  paras: [],
  list: [],
  note: null,
  actions: [],
  ...p,
});

describe("annonceVerdict", () => {
  it("annonce la bannière avant le titre : ce qui bloque, d'abord", () => {
    const pv = priseView(sp("perche-soleil"), "statut", QUOTA_VIDE, "41", LE_15_JUIN);
    expect(pv).not.toBeNull();

    const phrase = annonceVerdict(pv!);

    // « Ne pas relâcher vivant » (la bannière) précède « Interdit de la
    // remettre vivante à l'eau » (le titre).
    expect(phrase.indexOf("Ne pas relâcher vivant")).toBe(0);
    expect(phrase.indexOf("Interdit de la remettre")).toBeGreaterThan(0);
  });

  it("n'annonce pas en capitales : plusieurs synthèses vocales les épellent", () => {
    const pv = priseView(sp("perche-soleil"), "statut", QUOTA_VIDE, "41", LE_15_JUIN);

    expect(pv!.banner).toBe("NE PAS RELÂCHER VIVANT");
    expect(annonceVerdict(pv!)).not.toContain("NE PAS RELÂCHER VIVANT");
  });

  it("respecte la casse d'une bannière déjà mixte", () => {
    expect(annonceVerdict(verdict({ banner: "Maille non atteinte", title: "Rejeter" }))).toBe(
      "Maille non atteinte — Rejeter",
    );
  });

  it("se rabat sur le titre seul quand il n'y a pas de bannière", () => {
    const pv = priseView(sp("sandre"), "release", QUOTA_VIDE, "41", LE_15_JUIN);
    expect(pv!.banner).toBeUndefined();

    expect(annonceVerdict(pv!)).toBe(pv!.title);
  });

  it("se rabat sur la bannière seule quand il n'y a pas de titre", () => {
    expect(annonceVerdict(verdict({ banner: "RELÂCHER", title: "" }))).toBe("Relâcher");
  });

  it("ne fabrique rien à partir de rien", () => {
    expect(annonceVerdict(null)).toBe("");
  });

  it("ne répète pas le titre quand la bannière le redit déjà", () => {
    expect(annonceVerdict(verdict({ banner: "RELÂCHER", title: "Relâcher — soigneusement" }))).toBe(
      "Relâcher — soigneusement",
    );
  });
});
