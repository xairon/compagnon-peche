import { describe, it, expect } from "vitest";
import {
  DELAIS_MS,
  OCTETS_MAX,
  delaiPour,
  lireJsonBorne,
  CorpsTropGrand,
  type SourceReseau,
} from "./net-bornes";

// Un délai unique de 12 s pour tout le monde traitait de la même façon un appel
// météo de 2 ko et une couche hydrographique de 973 ko.
//
// Tailles et temps mesurés le 31/07/2026 sur connexion fixe :
//   Sandre CoursEau1  972 708 o   0,96 s
//   Sandre CoursEau4  190 962 o   0,69 s
//   GBIF (300 occ.)   537 206 o   0,59 s
//   Hub'Eau hydro      11 092 o   0,11 s
//   Open-Meteo          1 992 o   0,15 s
//
// Les délais ne se déduisent PAS de ces temps : au bord de l'eau la liaison
// n'est pas celle-là. Ils se déduisent de la taille, à débit mobile supposé.

describe("delaiPour", () => {
  it("laisse plus de temps à ce qui pèse plus lourd", () => {
    expect(delaiPour("sandre")).toBeGreaterThan(delaiPour("meteo"));
  });

  it("dépasse le budget serveur d'Overpass, jamais l'inverse", () => {
    // Overpass est réglé à 25 s côté serveur : abandonner à 12 s côté client
    // jette une réponse que le serveur était en train de produire.
    expect(delaiPour("overpass")).toBeGreaterThanOrEqual(25_000);
  });

  it("garde un délai pour une source inconnue plutôt que d'attendre sans fin", () => {
    expect(delaiPour("inconnue" as SourceReseau)).toBeGreaterThan(0);
  });

  it("chaque source nommée a son délai et sa borne", () => {
    for (const s of Object.keys(DELAIS_MS) as SourceReseau[]) {
      expect(DELAIS_MS[s]).toBeGreaterThan(0);
      expect(OCTETS_MAX[s]).toBeGreaterThan(0);
    }
  });

  it("borne le Sandre au-dessus de ce qu'il rend réellement", () => {
    // 973 ko mesurés pour une seule classe : une borne plus basse couperait
    // une réponse valide, ce qui serait pire que pas de borne du tout.
    expect(OCTETS_MAX.sandre).toBeGreaterThan(973_000);
  });
});

function reponseDe(octets: number, corps?: string): Response {
  const texte = corps ?? "x".repeat(octets);
  return new Response(new TextEncoder().encode(texte));
}

describe("lireJsonBorne", () => {
  it("lit normalement un corps sous la borne", async () => {
    const r = new Response(JSON.stringify({ a: 1 }));

    await expect(lireJsonBorne(r, 1000)).resolves.toEqual({ a: 1 });
  });

  it("refuse un corps qui dépasse la borne, au lieu de le charger en entier", async () => {
    // Sans borne, une réponse anormale (source en vrac, redirection vers une
    // page d'erreur volumineuse) est lue jusqu'au bout en mémoire, sur un
    // téléphone, hors ligne à moitié.
    await expect(lireJsonBorne(reponseDe(5000), 1000)).rejects.toBeInstanceOf(CorpsTropGrand);
  });

  it("nomme la cause, pour qu'un écran ne dise pas « pas de données »", async () => {
    // Une réponse trop grosse n'est pas une absence de données : confondre les
    // deux ferait afficher « aucune station » sur une source qui a répondu.
    await expect(lireJsonBorne(reponseDe(5000), 1000)).rejects.toThrow(/volumineuse|borne|taille/i);
  });

  it("laisse passer un corps exactement à la borne", async () => {
    const json = JSON.stringify({ v: "abc" });
    await expect(lireJsonBorne(new Response(json), json.length)).resolves.toEqual({ v: "abc" });
  });

  it("propage une erreur de JSON telle quelle, sans la déguiser en dépassement", async () => {
    await expect(lireJsonBorne(new Response("pas du json"), 1000)).rejects.not.toBeInstanceOf(
      CorpsTropGrand,
    );
  });
});

describe("cohérence avec Overpass", () => {
  it("le budget client d'Overpass ne peut pas dériver de celui d'ici", async () => {
    // Overpass a déjà sa paire serveur/client (25 s / 30 s). Deux endroits qui
    // décrivent le même budget finissent par se contredire ; ce test l'empêche.
    const { CLIENT_MS } = await import("./overpass");

    expect(delaiPour("overpass")).toBe(CLIENT_MS);
  });
});
