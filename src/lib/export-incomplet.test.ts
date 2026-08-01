import { describe, it, expect } from "vitest";
import { LIBELLE_MAGASIN, messageExportIncomplet } from "./export-incomplet";
import { STORES } from "./stores";

/**
 * `exportData` rend les noms techniques des magasins (`gear`, `bundles`, …).
 * Les afficher tels quels dirait à l'utilisateur qu'il lui manque « gear » :
 * exact et inutilisable. Cette table les traduit, et le test ci-dessous la
 * garde complète — un magasin ajouté à STORES sans libellé ferait fuiter son
 * slug dans le seul message qui compte.
 */
describe("messageExportIncomplet", () => {
  it("nomme le magasin manquant en français, jamais par son slug", () => {
    const msg = messageExportIncomplet(["gear"]);

    expect(msg).toMatch(/matériel/i);
    expect(msg).not.toMatch(/\bgear\b/);
  });

  it("énumère tout ce qui manque, pas seulement le premier", () => {
    const msg = messageExportIncomplet(["catches", "photos"]);

    expect(msg).toMatch(/prises/i);
    expect(msg).toMatch(/photos/i);
  });

  it("dit que le fichier ne remplace pas une sauvegarde entière", () => {
    // Le fil rouge : ne pas faire dire à une source ce qu'elle ne dit pas. Le
    // fichier existe et vaut mieux que rien, mais il est amputé.
    const msg = messageExportIncomplet(["spots"]);

    expect(msg).toMatch(/ne remplace pas une sauvegarde entière/i);
    // `\b` pour ne pas attraper le « complète » de « incomplète ».
    expect(msg).not.toMatch(/\bcomplète/i);
  });

  it("couvre tous les magasins que l'export peut déclarer illisibles", () => {
    // `photos` n'est pas dans STORES : exportData l'ajoute à part, quand
    // l'énumération des clés de blobs échoue.
    for (const nom of [...Object.keys(STORES), "photos"]) {
      expect(LIBELLE_MAGASIN[nom], `aucun libellé français pour « ${nom} »`).toBeTruthy();
    }
  });

  it("laisse passer un nom inconnu plutôt que de l'escamoter", () => {
    // Un magasin sans libellé doit se voir dans le message : afficher moins que
    // ce qui manque est précisément l'erreur que ce lot corrige.
    const msg = messageExportIncomplet(["magasin-futur"]);

    expect(msg).toMatch(/magasin-futur/);
  });
});
