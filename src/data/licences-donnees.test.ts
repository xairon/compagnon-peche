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

  it("établit la licence des couches IGN plutôt que de la laisser en suspens", () => {
    // Relevé le 31/07/2026. Les CGU de cartes.gouv.fr (où redirige désormais
    // geoservices.ign.fr/cgu-licences, 301) ne posent AUCUNE licence sur le
    // service de diffusion : « L'accès à une API ne confère aucun droit de
    // propriété intellectuelle sur l'API et sur les données mises à disposition
    // via l'API », et renvoient à la licence du jeu de données. Les fiches
    // data.gouv.fr de PLAN IGN et de BD ORTHO® écrivent toutes deux
    // « Licence Ouverte / Open Licence version 2.0 ».
    const ign = LICENCES_DONNEES.find((l) => l.hotes.includes("data.geopf.fr"));

    expect(ign?.etat).toBe("verifiee");
    expect(ign?.licence).toContain("2.0");
    expect(ign?.verifieLe).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("établit la licence des couches DDT sur la couche que l'app affiche vraiment", () => {
    // GéoIDE ne publie pas de licence de plateforme et le dit : « La licence
    // ouverte Etalab est applicable à de NOMBREUSES données publiées sur
    // Géo-IDE. Elle est alors mentionnée explicitement dans les fiches de
    // métadonnées correspondantes. » La fiche ISO de N_CAT_PISCICOLE_L_041 —
    // le Loir-et-Cher, département principal de l'app — porte
    // « Licence Ouverte / Open Licence Version 2.0 ». La réserve doit dire
    // que c'est une couche sur dix.
    const ddt = LICENCES_DONNEES.find((l) =>
      l.hotes.includes("ogc.geo-ide.developpement-durable.gouv.fr"),
    );

    expect(ddt?.etat).toBe("verifiee");
    expect(ddt?.licence).toContain("2.0");
    expect(ddt?.reserve).toMatch(/couche/i);
  });

  it("n'attribue pas Géopêche à la FNPF, que la source ne nomme pas", () => {
    // geopeche.com/contact.php nomme « GEOPECHE - CREALEAD, 55 rue Saint
    // Cléophas, 34070 MONTPELLIER ». La FNPF n'y figure nulle part comme
    // éditeur. Créditer une fédération qui ne publie pas le service, c'est
    // exactement l'erreur que cette liste existe pour empêcher.
    const geo = LICENCES_DONNEES.find((l) => l.hotes.includes("map.geopeche.com"));

    expect(geo?.mention).not.toMatch(/FNPF/);
  });

  it("reste sur « non vérifiée » là où la source ne publie aucune licence", () => {
    // Géopêche : /mentions-legales et /cgu répondent 404 (31/07/2026), et la
    // seule déclaration publiée est « Tous droits d'usage et de reproduction
    // réservés » — l'inverse d'une licence ouverte. Ne rien conclure est ici
    // le seul résultat honnête, et il doit rester visible à l'écran.
    const geo = LICENCES_DONNEES.find((l) => l.hotes.includes("map.geopeche.com"));

    expect(geo?.etat).toBe("non-verifiee");
    expect(geo?.reserve).toMatch(/réserv/i);
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
