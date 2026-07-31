import { describe, it, expect } from "vitest";
import { LICENCES_DONNEES } from "./licences-donnees";
import { CSP_DIRECTIVES } from "../lib/csp";

// Une source qu'on interroge et qu'on ne crédite pas, c'est une obligation de
// licence non tenue — ODbL et CC BY font de l'attribution une CONDITION de la
// redistribution, pas une politesse.
//
// Ce test lie la liste des crédits aux hôtes que l'app contacte réellement,
// pris dans la CSP. Ajouter une source sans la créditer casse la CI, sur le
// modèle du test qui garde déjà la CSP en phase avec les couches de la carte.

function hotesConnectSrc(): string[] {
  const d = CSP_DIRECTIVES.find((x) => x.startsWith("connect-src")) ?? "";
  return d
    .split(/\s+/)
    .slice(1)
    .filter((h) => h.startsWith("https://"))
    .map((h) => h.replace("https://", "").replace(/^\*\./, ""));
}

describe("LICENCES_DONNEES", () => {
  it("crédite chaque hôte que l'app interroge", () => {
    const credites = new Set(LICENCES_DONNEES.flatMap((l) => l.hotes));
    const manquants = hotesConnectSrc().filter((h) => !credites.has(h));

    expect(manquants).toEqual([]);
  });

  it("ne crédite pas des hôtes que l'app ne contacte pas", () => {
    // Un crédit sans appel décrit une app qui n'existe pas.
    const contactes = new Set([
      ...hotesConnectSrc(),
      // frame-src : la carte Géopêche, chargée en iframe et non en fetch.
      "map.geopeche.com",
    ]);
    const orphelins = LICENCES_DONNEES.flatMap((l) => l.hotes).filter((h) => !contactes.has(h));

    expect(orphelins).toEqual([]);
  });

  it("nomme la licence ou avoue ne pas l'avoir vérifiée", () => {
    // Trois états, comme partout : licence connue, licence connue sans version
    // publiée, licence non vérifiée. Aucune entrée ne peut rester muette.
    for (const l of LICENCES_DONNEES) {
      expect(l.licence.length).toBeGreaterThan(0);
      expect(["verifiee", "sans-version", "non-verifiee"]).toContain(l.etat);
    }
  });

  it("donne un lien vers le texte de licence dès qu'elle est vérifiée", () => {
    // « CC BY 4.0 » écrit en toutes lettres ne dit pas au lecteur ce qu'il peut
    // faire ; la licence exige qu'on l'identifie ET qu'on y renvoie.
    for (const l of LICENCES_DONNEES.filter((x) => x.etat !== "non-verifiee")) {
      expect(l.url).toMatch(/^https?:\/\//);
    }
  });

  it("date ce qui a été vérifié, pour qu'on sache quand le revérifier", () => {
    for (const l of LICENCES_DONNEES.filter((x) => x.etat !== "non-verifiee")) {
      expect(l.verifieLe).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    }
  });

  it("marque GBIF comme attribué enregistrement par enregistrement", () => {
    const gbif = LICENCES_DONNEES.find((l) => l.hotes.includes("api.gbif.org"));

    // GBIF n'a pas UNE licence : chaque occurrence porte celle de son jeu de
    // données, et l'échantillon mesuré autour de Blois mêle CC BY et CC BY-NC.
    expect(gbif?.parEnregistrement).toBe(true);
  });

  it("n'annonce pas une version de licence que la source ne publie pas", () => {
    // Hub'Eau renvoie à la « licence ouverte Etalab » sans numéro de version
    // (conditions générales, consultées le 31/07/2026). Sandre, lui, écrit
    // explicitement etalab-2.0. Les deux ne peuvent pas s'afficher pareil.
    const hubeau = LICENCES_DONNEES.find((l) => l.hotes.includes("hubeau.eaufrance.fr"));
    const sandre = LICENCES_DONNEES.find((l) => l.hotes.includes("services.sandre.eaufrance.fr"));

    expect(hubeau?.etat).toBe("sans-version");
    expect(hubeau?.licence).not.toMatch(/\d\.\d/);
    expect(sandre?.licence).toContain("2.0");
  });
});
