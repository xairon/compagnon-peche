import { describe, it, expect } from "vitest";
import { apparier } from "./especes-du-coin";

/**
 * Apparier un taxon relevé à une fiche, mesuré le 01/08/2026 sur les trois
 * stations ASPE les plus proches de Blois : 39 taxons distincts, dont 2
 * seulement échouent à cause d'un SYNONYME. Dans un filtre qui masque, rater un
 * synonyme masque une espèce réellement présente — d'où la table, et d'où le
 * test de garde qui échouera quand une divergence nouvelle apparaîtra.
 */

describe("apparier", () => {
  it("retrouve le chevaine sous le nom que l'ASPE lui donne", () => {
    // ASPE écrit `Leuciscus cephalus` ; le dépôt écrit `Squalius cephalus`.
    expect(apparier(["Leuciscus cephalus"]).ids).toEqual(["chevesne"]);
  });

  it("retrouve la grémille malgré la terminaison du genre", () => {
    // ASPE écrit `cernua`, le dépôt `cernuus`.
    expect(apparier(["Gymnocephalus cernua"]).ids).toEqual(["gremille"]);
  });

  it("ne confond pas le chevaine et le mulet", () => {
    // LE piège de l'épithète : apparier sur `cephalus` seul rendrait le
    // chevaine pour un mulet. Les deux sont dans le catalogue.
    expect(apparier(["Mugil cephalus"]).ids).toEqual(["mulet-cabot"]);
  });

  it("range les écrevisses à part : elles ont une fiche, mais ailleurs", () => {
    // Les compter comme « sans fiche » serait faux — l'écran Écrevisses en a
    // une. Elles ne filtrent pas la grille pour autant : SPECIES ne les
    // contient pas.
    const r = apparier(["Procambarus clarkii", "Faxonius limosus"]);
    expect(r.ecrevisses).toEqual(["americaine", "louisiane"]);
    expect(r.ids).toEqual([]);
    expect(r.inconnus).toEqual([]);
  });

  it("ne devine pas un lot identifié au genre, à la famille, ni un hybride", () => {
    const r = apparier(["Cyprinidae sp.", "Lampetra spp", "Hybride brème-gardon"]);
    expect(r.ids).toEqual([]);
    expect(r.inconnus).toEqual(["Cyprinidae sp.", "Hybride brème-gardon", "Lampetra spp"]);
  });

  it("dédoublonne et trie, pour que deux relevés rendent le même ordre", () => {
    const r = apparier(["Sander lucioperca", "Esox lucius", "Sander lucioperca"]);
    expect(r.ids).toEqual(["brochet", "sandre"]);
  });

  it("ignore une chaîne vide sans la compter comme inconnue", () => {
    expect(apparier(["", "   "])).toEqual({ ids: [], ecrevisses: [], inconnus: [] });
  });
});
