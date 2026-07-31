import { describe, it, expect } from "vitest";
// Importe SPECIES_FICHES et non SPECIES : depuis que les 182 ko de sections
// descriptives sont chargés à la demande, `SPECIES` est le catalogue LÉGER.
// Ces garde-fous portent sur le contenu des fiches — les faire lire le
// catalogue léger les rendrait aveugles sans rien casser, ce qui est la pire
// des dérives. Aucune assertion n'est modifiée, seule la source l'est.
import { CURATED_IDS } from "../data/species";
import { SPECIES_FICHES as SPECIES } from "../data/species-fiches";
import { isPlainlyOpen } from "./statut";

/**
 * Le carrousel « en ce moment dans vos eaux » filtrait sur `depth !== "base"`.
 * C'était un raccourci qui a cessé d'être vrai : depuis que les fiches « base »
 * ont du contenu, `depth` est effacé, et un poisson rouge ou un carassin
 * argenté aurait fini par être proposé comme « ce qui mord ». La dépendance
 * était silencieuse — rien ne l'aurait signalée.
 */
const carrousel = () =>
  SPECIES.filter((s) => CURATED_IDS.has(s.id) && isPlainlyOpen(s)).slice(0, 10);

describe("carrousel de l'accueil", () => {
  it("ne propose que des espèces du catalogue vedette", () => {
    const intrus = carrousel().filter((s) => !CURATED_IDS.has(s.id)).map((s) => s.id);
    expect(intrus).toEqual([]);
  });

  it("ne propose jamais une espèce protégée, invasive ou au régime spécial", () => {
    const fautes = carrousel()
      .filter((s) => s.protected || s.invasive || s.season === "special")
      .map((s) => s.id);
    expect(fautes).toEqual([]);
  });

  it("ne dépend plus du champ depth", () => {
    // Si le filtre repassait sur `depth`, une espèce enrichie deviendrait
    // éligible : on vérifie qu'aucune espèce hors catalogue ne peut entrer,
    // quel que soit son `depth`.
    const enrichiesHorsCatalogue = SPECIES.filter(
      (s) => !CURATED_IDS.has(s.id) && s.depth === undefined,
    );
    expect(enrichiesHorsCatalogue.length).toBeGreaterThan(0); // sinon le test ne prouve rien
    for (const sp of enrichiesHorsCatalogue) {
      expect(carrousel().map((c) => c.id)).not.toContain(sp.id);
    }
  });
});
