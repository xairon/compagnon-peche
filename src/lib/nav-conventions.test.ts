import { describe, it, expect } from "vitest";
import type { Screen } from "../store";
import {
  ROUTES,
  TABS,
  CTX_DEFAUT,
  CTX_CHAMPS,
  CTX_FACULTATIFS,
  contexteNettoye,
  ecranParent,
  ongletDe,
  versUrl,
  depuisUrl,
} from "./nav-conventions";

const ECRANS = Object.keys(ROUTES) as Screen[];

/** Un contexte plausible pour chaque champ, pour les allers-retours d'URL. */
const CTX_EXEMPLE = {
  spId: "sandre",
  recipeId: "friture-perche-soleil",
  knotId: "palomar",
  techId: "peche-au-posé",
  catchSlot: "p_17a3",
  focusSpot: "s_44b",
  gearFocusId: "hamecons",
  bilanSession: "ecr_9",
  cookStep: 3,
} as const;

describe("table des routes", () => {
  it("couvre les 27 écrans du store", () => {
    // Le compte est le point de départ du lot : si un écran est ajouté sans
    // route, il n'a ni URL ni parent, et le retour depuis un lien profond le
    // renvoie à l'accueil sans raison. `Record<Screen, Route>` l'attrape à la
    // compilation ; ce test l'attrape aussi quand on regarde le rouge.
    expect(ECRANS).toHaveLength(27);
  });

  it("ne donne jamais deux fois le même chemin", () => {
    const chemins = ECRANS.map((e) => ROUTES[e].path);

    expect(new Set(chemins).size).toBe(chemins.length);
  });

  it("attribue chaque champ de contexte à au moins un écran", () => {
    // C'est l'invariant qui rend le nettoyage décidable : un champ que personne
    // ne réclame ne serait jamais remis à zéro par personne.
    const reclames = new Set(ECRANS.flatMap((e) => ROUTES[e].ctx ?? []));

    expect([...CTX_CHAMPS].filter((c) => !reclames.has(c))).toEqual([]);
  });

  it("compte neuf champs de contexte", () => {
    expect(CTX_CHAMPS).toHaveLength(9);
    expect(Object.keys(CTX_DEFAUT).sort()).toEqual([...CTX_CHAMPS].sort());
  });
});

describe("nettoyage du contexte", () => {
  it("efface les champs que l'écran de destination ne réclame pas", () => {
    // Le défaut mesuré avant ce lot : nav() n'effaçait QUE `bilanSession`.
    // Ouvrir une recette depuis une fiche espèce laissait `spId`, `techId`,
    // `catchSlot`… derrière soi, et l'écran suivant héritait d'un contexte
    // dont il n'avait jamais entendu parler.
    const patch = contexteNettoye("recette");

    expect(patch.recipeId).toBeUndefined(); // réclamé par « recette » : intouché
    expect(patch.spId).toBeNull();
    expect(patch.knotId).toBeNull();
    expect(patch.techId).toBeNull();
    expect(patch.catchSlot).toBeNull();
    expect(patch.focusSpot).toBeNull();
    expect(patch.gearFocusId).toBeNull();
    expect(patch.bilanSession).toBeNull();
    expect(patch.cookStep).toBe(0);
  });

  it("laisse intacts les deux champs de la cuisine", () => {
    // La cuisine est le seul écran à deux champs : la recette ET l'étape.
    const patch = contexteNettoye("cuisine");

    expect(patch.recipeId).toBeUndefined();
    expect(patch.cookStep).toBeUndefined();
    expect(patch.spId).toBeNull();
  });

  it("efface tout pour un écran sans contexte", () => {
    const patch = contexteNettoye("outils");

    expect(Object.keys(patch).sort()).toEqual([...CTX_CHAMPS].sort());
  });
});

describe("écran parent", () => {
  it("remonte à l'accueil depuis n'importe quel écran sans jamais boucler", () => {
    // Sert au repli du bouton « ‹ » quand l'app a été ouverte DIRECTEMENT sur
    // un écran profond : il n'y a rien derrière dans l'historique, et on ne
    // veut ni piéger l'utilisateur ni le faire sortir de l'app.
    for (const e of ECRANS) {
      let cur = e;
      let pas = 0;
      while (cur !== "accueil" && pas < 10) {
        cur = ecranParent(cur);
        pas++;
      }
      expect(cur, `${e} ne remonte pas à l'accueil`).toBe("accueil");
    }
  });

  it("fait de l'accueil son propre parent", () => {
    expect(ecranParent("accueil")).toBe("accueil");
  });
});

describe("onglet d'un écran", () => {
  it("donne un onglet à chacun des 27 écrans", () => {
    // Sert aux liens profonds : arriver directement sur `#/recette/x` doit
    // allumer un onglet de la barre du bas, sinon aucun n'est allumé et la
    // barre a l'air cassée.
    for (const e of ECRANS) {
      expect(TABS, `${e}`).toContain(ongletDe(e));
    }
  });

  it("rend l'onglet lui-même pour un écran d'onglet", () => {
    for (const t of TABS) {
      expect(ongletDe(t)).toBe(t);
    }
  });

  it("rattache une fiche espèce à Espèces et une prise à Carnet", () => {
    expect(ongletDe("fiche")).toBe("especes");
    expect(ongletDe("prise-detail")).toBe("carnet");
    expect(ongletDe("noeuds")).toBe("accueil"); // via Outils, qui n'est plus un onglet
  });
});

describe("URL ↔ écran", () => {
  it("n'émet que des URL relatives à hash", () => {
    // `base: "./"` : l'app est servie depuis un sous-chemin sur GitHub Pages.
    // Un chemin absolu marcherait à la racine et nulle part ailleurs, et
    // GitHub Pages renvoie 404 sur un chemin que le serveur ne connaît pas.
    for (const e of ECRANS) {
      const url = versUrl(e, CTX_DEFAUT);
      expect(url.startsWith("#/"), `${e} → ${url}`).toBe(true);
    }
  });

  it("fait l'aller-retour pour chaque écran avec son contexte", () => {
    for (const e of ECRANS) {
      const ctx = { ...CTX_DEFAUT };
      for (const champ of ROUTES[e].ctx ?? []) {
        (ctx as Record<string, unknown>)[champ] = CTX_EXEMPLE[champ];
      }

      const relu = depuisUrl(versUrl(e, ctx));

      expect(relu, `${e} : ${versUrl(e, ctx)}`).toEqual({ screen: e, ctx });
    }
  });

  it("ramène l'accueil pour une URL vide ou nue", () => {
    expect(depuisUrl("")).toEqual({ screen: "accueil", ctx: CTX_DEFAUT });
    expect(depuisUrl("#/")).toEqual({ screen: "accueil", ctx: CTX_DEFAUT });
    expect(depuisUrl("#")).toEqual({ screen: "accueil", ctx: CTX_DEFAUT });
  });

  it("refuse un chemin inconnu plutôt que d'inventer un écran", () => {
    expect(depuisUrl("#/n-importe-quoi")).toBeNull();
    expect(depuisUrl("#/espece/sandre/en-trop")).toBeNull();
  });

  it("refuse un lien profond amputé de l'identifiant qu'il exige", () => {
    // « #/espece » sans espèce afficherait une fiche vide sans retour possible.
    expect(depuisUrl("#/espece")).toBeNull();
    expect(depuisUrl("#/recette")).toBeNull();
    expect(depuisUrl("#/noeud")).toBeNull();
    expect(depuisUrl("#/capture")).toBeNull();
  });

  it("accepte les écrans dont l'identifiant est facultatif", () => {
    // La carte, le guide matériel et les écrevisses existent pleinement sans
    // leur identifiant : il ne fait que désigner quoi ouvrir en arrivant.
    expect(depuisUrl("#/carte")).toEqual({ screen: "carte", ctx: CTX_DEFAUT });
    expect(depuisUrl("#/guide-materiel")).toEqual({ screen: "guide-materiel", ctx: CTX_DEFAUT });
    expect(depuisUrl("#/ecrevisses")).toEqual({ screen: "ecrevisses", ctx: CTX_DEFAUT });
    expect(CTX_FACULTATIFS).toContain("focusSpot");
  });

  it("omet un identifiant facultatif resté à sa valeur par défaut", () => {
    expect(versUrl("carte", CTX_DEFAUT)).toBe("#/carte");
    expect(versUrl("cuisine", { ...CTX_DEFAUT, recipeId: "r1" })).toBe("#/cuisine/r1");
    expect(versUrl("cuisine", { ...CTX_DEFAUT, recipeId: "r1", cookStep: 4 })).toBe("#/cuisine/r1/4");
  });

  it("échappe un identifiant qui contient une barre oblique ou un espace", () => {
    const ctx = { ...CTX_DEFAUT, spId: "truite arc-en-ciel/2" };

    expect(depuisUrl(versUrl("fiche", ctx))).toEqual({ screen: "fiche", ctx });
  });

  it("relit une étape de cuisine comme un nombre, pas comme une chaîne", () => {
    expect(depuisUrl("#/cuisine/r1/4")).toEqual({ ...{ screen: "cuisine" }, ctx: { ...CTX_DEFAUT, recipeId: "r1", cookStep: 4 } });
    // Une étape absurde ne doit pas propager un NaN jusqu'au rendu.
    expect(depuisUrl("#/cuisine/r1/abc")?.ctx.cookStep).toBe(0);
  });
});
