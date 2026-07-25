import { describe, it, expect } from "vitest";
import { BASE_SPECIES } from "./species-base";
import { SPECIES } from "./species";

// Régression — audit exactitude réglementaire (branche coherence-reglementaire) :
// deux statuts d'espèce trouvés faux ou incomplets lors de la vérification
// systématique contre les sources primaires.

describe("saumon atlantique — n'est pas une espèce « protégée » au sens strict", () => {
  // L'arrêté du 8 décembre 1988 (art. 1, JORFTEXT000000327373) protège les œufs
  // et les frayères du saumon atlantique, PAS la capture de l'adulte : la pêche
  // du saumon est légale, encadrée par TAC/carnet/timbre migrateur, rivière par
  // rivière (voir generationpeche.fr, federation-peche14.fr). `protected: true`
  // déclenchait pourtant le même bandeau "RELÂCHER — espèce protégée ou menacée"
  // que l'esturgeon (pêche interdite en tout point du territoire), ce qui est
  // faux : le générateur (scripts/build-base-species.mjs) prévoit justement un
  // statut "moratoire" pour ce cas précis (alose, lamproie marine/rivière) —
  // le saumon aurait dû l'utiliser depuis le début.
  const saumon = BASE_SPECIES.find((s) => s.id === "saumon-atlantique");

  it("existe dans le socle national", () => {
    expect(saumon).toBeDefined();
  });

  it("n'est plus marqué protégé au sens strict (pêche interdite partout)", () => {
    expect(saumon?.protected).not.toBe(true);
  });

  it("porte un statut de migrateur réglementé, pas « espèce protégée »", () => {
    const statutRow = saumon?.reg?.rows.find(([k]) => k === "Statut");
    expect(statutRow?.[1]).toMatch(/moratoire|réglement/i);
    expect(statutRow?.[1]).not.toMatch(/protégée \/ menacée/i);
  });

  it("garde une alerte de vigilance (TAC / carnet / fermetures par bassin)", () => {
    expect(saumon?.alert).toBeDefined();
  });
});

describe("silure glane — nouveau statut R432-5 (décret n° 2026-464 du 8 juin 2026)", () => {
  // Le décret n° 2026-464 du 8 juin 2026 (JORFTEXT000054223579) inscrit le
  // silure glane à l'art. R432-5 (espèces susceptibles de provoquer des
  // déséquilibres biologiques), mais seulement dans les bassins Adour-Garonne
  // et Loire-Bretagne — pas sur tout le territoire. Les trois départements
  // couverts par l'app (23 Creuse, 36 Indre, 41 Loir-et-Cher) sont tous dans
  // le bassin Loire-Bretagne : la règle s'applique donc à tous leurs usagers.
  const silure = SPECIES.find((s) => s.id === "silure");

  it("existe dans les fiches curées", () => {
    expect(silure).toBeDefined();
  });

  it("est désormais marqué invasive, avec sa base légale et sa portée par bassin", () => {
    expect(silure?.invasive).toBe(true);
    expect(silure?.invasiveBasis).toMatch(/2026-464/);
    expect(silure?.invasiveBasis).toMatch(/Adour-Garonne|Loire-Bretagne/);
  });

  it("garde son alerte sanitaire (bioaccumulateur) en plus du nouveau statut légal", () => {
    expect(silure?.alert?.title).toMatch(/Consommation/i);
  });
});
