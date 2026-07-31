import { describe, it, expect, vi, afterEach } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CorpsTropGrand, OCTETS_MAX } from "./net-bornes";

/**
 * Reliquat du lot B3 : la lecture bornée n'était appliquée qu'au Sandre et à
 * GBIF. Hub'Eau, Open-Meteo, le géocodeur IGN et Overpass passaient encore par
 * `r.json()`, qui charge tout avant de pouvoir juger.
 *
 * L'objection « leurs réponses sont petites » ne tient pas : 11 ko pour
 * Hub'Eau et 2 ko pour Open-Meteo (mesurés le 31/07/2026) décrivent ce que la
 * source rend quand tout va bien. La borne n'est pas là pour ça. Elle est là
 * pour le portail captif du camping qui renvoie sa page d'accueil à la place de
 * la réponse, pour la redirection vers une page d'erreur volumineuse, pour la
 * source en vrac — sur un téléphone, à moitié hors ligne.
 */
const LIB = join(process.cwd(), "src", "lib");

/** Les lignes de code (commentaires retirés) de chaque module de src/lib. */
function lignesDeCode(fichier: string): string[] {
  return readFileSync(join(LIB, fichier), "utf8")
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      return t !== "" && !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
    });
}

describe("aucune lecture de source n'est laissée sans borne", () => {
  it("plus un seul `.json()` de réponse dans src/lib", () => {
    // Test structurel plutôt que cas par cas : c'est la seule forme qui
    // attrape la PROCHAINE source branchée sans borne, et c'est exactement
    // comme ça que Hub'Eau, la météo et le géocodeur avaient été oubliés.
    const fautifs: string[] = [];
    for (const f of readdirSync(LIB)) {
      if (!f.endsWith(".ts") || f.includes(".test.")) continue;
      for (const l of lignesDeCode(f)) {
        if (/\b\w+\.json\(\)/.test(l)) fautifs.push(`${f}: ${l.trim()}`);
      }
    }

    expect(fautifs).toEqual([]);
  });
});

// ── Le comportement, source par source ────────────────────────────────────
// Un corps au-delà de la borne doit lever CorpsTropGrand, pas être analysé.
// CorpsTropGrand est distinct d'une absence de données : la source A répondu,
// et un écran qui confondrait les deux afficherait « aucune station ».

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Une réponse dont le corps dépasse `octets`. */
function reponseEnorme(octets: number): Response {
  return new Response(new TextEncoder().encode("x".repeat(octets + 1)), { status: 200 });
}

describe("Hub'Eau", () => {
  it("arrête la lecture au-delà de sa borne au lieu de tout charger", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reponseEnorme(OCTETS_MAX.hubeau)));
    const { stationsInBbox } = await import("./hubeau");

    await expect(stationsInBbox(47.5, 1.3, 47.7, 1.4)).rejects.toBeInstanceOf(CorpsTropGrand);
  });
});

describe("Open-Meteo", () => {
  it("arrête la lecture au-delà de sa borne", async () => {
    // 2 ko mesurés ; la borne est à 500 ko, très au-dessus de ce que la source
    // rend — une borne trop basse couperait une réponse valide.
    vi.stubGlobal("fetch", vi.fn(async () => reponseEnorme(OCTETS_MAX.meteo)));
    const { fetchMeteo } = await import("./meteo");

    await expect(fetchMeteo(47.58, 1.33)).rejects.toBeInstanceOf(CorpsTropGrand);
  });
});

describe("géocodeur IGN", () => {
  it("arrête la lecture au-delà de sa borne", async () => {
    // C'est le cas le plus exposé au portail captif : le géocodeur est
    // interrogé dès qu'on cherche une commune, souvent depuis un wifi inconnu.
    vi.stubGlobal("fetch", vi.fn(async () => reponseEnorme(OCTETS_MAX.ign)));
    const { geocode } = await import("./sandre");

    await expect(geocode("Blois")).rejects.toBeInstanceOf(CorpsTropGrand);
  });
});
