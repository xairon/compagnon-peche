import { describe, it, expect } from "vitest";
import { CTX_DEFAUT } from "./nav-conventions";
import { pointDeEtat, memeEndroit, patchDePoint, lirePoint, pointDepuisUrl } from "./nav-historique";

const etat = {
  screen: "fiche" as const,
  tab: "especes" as const,
  ...CTX_DEFAUT,
  spId: "sandre",
};

describe("point de navigation", () => {
  it("n'extrait de l'état que l'écran, l'onglet et le contexte", () => {
    // Le carnet, les photos, les préférences n'ont rien à faire dans
    // `history.state` : le navigateur le sérialise à chaque entrée, et il
    // survit à un rechargement — ce serait une seconde copie des données.
    // Passé par une variable : le contrôle des propriétés en trop de TypeScript
    // ne s'applique qu'aux littéraux, et c'est justement un état COMPLET qu'on
    // veut donner ici, comme le fait le store.
    const etatComplet = { ...etat, catches: [], profile: { name: "x" } };

    const p = pointDeEtat(etatComplet, 2);

    expect(p).toEqual({ screen: "fiche", tab: "especes", ctx: { ...CTX_DEFAUT, spId: "sandre" }, profondeur: 2 });
  });
});

describe("même endroit", () => {
  it("ignore la profondeur : le même écran atteint deux fois reste le même endroit", () => {
    const a = pointDeEtat(etat, 0);
    const b = pointDeEtat(etat, 5);

    expect(memeEndroit(a, b)).toBe(true);
  });

  it("distingue deux fiches d'espèces différentes", () => {
    const a = pointDeEtat(etat, 0);
    const b = pointDeEtat({ ...etat, spId: "brochet" }, 0);

    expect(memeEndroit(a, b)).toBe(false);
  });

  it("distingue un changement d'onglet seul", () => {
    const a = pointDeEtat(etat, 0);
    const b = pointDeEtat({ ...etat, tab: "carnet" as const }, 0);

    expect(memeEndroit(a, b)).toBe(false);
  });

  it("traite l'absence de point de référence comme « pas le même endroit »", () => {
    expect(memeEndroit(null, pointDeEtat(etat, 0))).toBe(false);
  });
});

describe("retour à l'état", () => {
  it("rend un patch complet : tout champ absent de l'entrée revient à zéro", () => {
    // Sans ça, revenir en arrière laisserait le contexte de l'écran quitté.
    const p = pointDeEtat(etat, 1);

    expect(patchDePoint(p)).toEqual({ screen: "fiche", tab: "especes", ...CTX_DEFAUT, spId: "sandre" });
  });
});

describe("lecture de history.state", () => {
  it("relit ce que l'app y a écrit", () => {
    const p = pointDeEtat(etat, 3);

    expect(lirePoint({ nav: p })).toEqual(p);
  });

  it("refuse ce qui ne vient pas de nous plutôt que de faire confiance", () => {
    // `history.state` peut avoir été posé par une autre page de la même origine,
    // ou par une version précédente de l'app restée dans l'historique du
    // navigateur. Un écran inconnu ferait un rendu vide.
    expect(lirePoint(null)).toBeNull();
    expect(lirePoint(undefined)).toBeNull();
    expect(lirePoint({})).toBeNull();
    expect(lirePoint({ nav: { screen: "un-ecran-supprime", tab: "accueil", ctx: CTX_DEFAUT, profondeur: 0 } })).toBeNull();
    expect(lirePoint({ nav: { screen: "fiche" } })).toBeNull();
    expect(lirePoint("une chaîne")).toBeNull();
  });

  it("complète un contexte partiel au lieu de le propager tel quel", () => {
    const p = lirePoint({ nav: { screen: "fiche", tab: "especes", ctx: { spId: "sandre" }, profondeur: 0 } });

    expect(p?.ctx).toEqual({ ...CTX_DEFAUT, spId: "sandre" });
  });
});

describe("point depuis une URL", () => {
  it("déduit l'onglet, qu'aucune URL ne porte", () => {
    expect(pointDepuisUrl("#/espece/sandre")).toEqual({
      screen: "fiche",
      tab: "especes",
      ctx: { ...CTX_DEFAUT, spId: "sandre" },
      profondeur: 0,
    });
  });

  it("rend null sur une URL qui ne désigne rien", () => {
    expect(pointDepuisUrl("#/pas-un-ecran")).toBeNull();
  });
});
