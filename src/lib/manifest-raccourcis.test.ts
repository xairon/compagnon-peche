import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { MANIFEST } from "./manifest";
import { versUrl, CTX_DEFAUT, ROUTES } from "./nav-conventions";
import type { Screen } from "../store";

// Les raccourcis du manifeste (appui long sur l'icône installée) étaient
// délibérément absents : ils ont besoin de liens profonds, et il n'y en avait
// aucun. Le lot navigation en a livré pour les 27 écrans, donc ils deviennent
// possibles — et honnêtes, ce qui n'est pas la même chose.
//
// Un raccourci qui atterrit sur l'Accueil quel que soit le libellé serait un
// mensonge d'interface : quatre entrées de menu qui font toutes la même chose.

describe("raccourcis du manifeste", () => {
  it("existent, maintenant que les liens profonds existent", () => {
    expect(MANIFEST.shortcuts?.length).toBeGreaterThan(0);
  });

  it("mènent chacun à un écran RÉELLEMENT différent", () => {
    const urls = new Set(MANIFEST.shortcuts!.map((s) => s.url));

    expect(urls.size).toBe(MANIFEST.shortcuts!.length);
  });

  it("portent l'URL que la table de routes produit vraiment", () => {
    // Les URL sont des littéraux dans manifest.ts, et NON dérivées à
    // l'exécution : ce fichier est importé par vite.config.ts, donc par le
    // projet TypeScript de la config, où faire entrer nav-conventions ferait
    // entrer store.tsx et son JSX — le build casse (TS6307/TS6142).
    //
    // La dérivation vit donc ICI, dans le projet de l'app, qui peut importer
    // les deux. La garantie est la même : renommer une route fait tomber ce
    // test au lieu de produire un raccourci mort en silence.
    for (const s of MANIFEST.shortcuts!) {
      const attendu = "./" + versUrl(s.ecran as Screen, CTX_DEFAUT);
      expect(s.url, s.ecran).toBe(attendu);
    }
  });

  it("restent relatifs, pour survivre au sous-chemin de GitHub Pages", () => {
    // `base: "./"` : l'app n'est pas servie à la racine. Une URL commençant
    // par « / » pointerait hors de l'app une fois déployée.
    for (const s of MANIFEST.shortcuts!) {
      expect(s.url.startsWith("./"), s.url).toBe(true);
    }
  });

  it("ne déclarent aucune icône absente de public/", () => {
    // Même piège que les captures d'écran : une icône annoncée et manquante
    // dégrade le menu au lieu de l'enrichir. Aucune icône propre aux
    // raccourcis n'a été produite, donc aucune n'est annoncée.
    const presents = new Set(readdirSync("public"));
    for (const s of MANIFEST.shortcuts!) {
      for (const i of s.icons ?? []) {
        expect(presents.has(i.src.replace(/^\.?\//, "")), i.src).toBe(true);
      }
    }
  });

  it("ne visent que des écrans que la table de routes connaît", () => {
    for (const s of MANIFEST.shortcuts!) {
      expect(Object.keys(ROUTES)).toContain(s.ecran as string);
    }
  });

  it("portent un nom court, lisible dans un menu système", () => {
    for (const s of MANIFEST.shortcuts!) {
      expect(s.short_name.length, s.short_name).toBeLessThanOrEqual(12);
      expect(s.name.length).toBeGreaterThan(0);
    }
  });

  it("mènent au geste de prise, qui est l'action centrale de l'app", () => {
    const ecrans = MANIFEST.shortcuts!.map((s) => s.ecran as Screen);

    expect(ecrans).toContain("prise");
  });
});

describe("manifeste réellement produit", () => {
  it("n'écrit pas la clé interne « ecran » dans le fichier livré", async () => {
    // `ecran` sert à dériver et vérifier l'URL ; ce n'est pas une clé du
    // standard Web App Manifest. La laisser fuiter met une clé inconnue dans
    // un fichier que des navigateurs analysent — inoffensif aujourd'hui, mais
    // c'est exactement le genre de résidu qu'on ne remarque plus ensuite.
    const { manifestPublie } = await import("./manifest");

    for (const s of manifestPublie().shortcuts ?? []) {
      expect(Object.keys(s)).not.toContain("ecran");
    }
  });

  it("garde tout le reste du raccourci intact", async () => {
    const { manifestPublie, RACCOURCIS } = await import("./manifest");
    const publie = manifestPublie().shortcuts!;

    expect(publie).toHaveLength(RACCOURCIS.length);
    expect(publie[0]!.url).toBe(RACCOURCIS[0]!.url);
    expect(publie[0]!.name).toBe(RACCOURCIS[0]!.name);
  });
});
