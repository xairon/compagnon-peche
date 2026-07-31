import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { urlTronconsAutour, coursSousLePoint, OCTETS_MESURES } from "./troncon-hydro";

/**
 * Le tronçon hydrographique sous un point — la couche Sandre la moins chère.
 *
 * Le WFS Sandre ne découpe PAS ses géométries sur la boîte demandée. Mesuré le
 * 31/07/2026 autour de Blois (47,586 / 1,336), même sur une boîte de 300 m :
 *
 *   CoursEau1..5      5 requêtes   339 644 octets   (la Loire entière, 7905 sommets)
 *   sa:TronconHydrographique  1 requête    4 903 octets   (le tronçon, 106 sommets)
 *
 * 69 fois moins cher, et une requête au lieu de cinq, pour la même réponse :
 * CdCoursEau = "----0000". Le prix : cette couche ne publie aucun libellé.
 */

const reel = () =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL("./__fixtures__/sandre-troncon-blois.json", import.meta.url)),
      "utf8",
    ),
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("urlTronconsAutour", () => {
  it("demande la couche des tronçons, pas les cinq couches CoursEau", () => {
    const u = urlTronconsAutour(47.586, 1.336);

    expect(u).toContain("TYPENAMES=sa%3ATronconHydrographique");
    expect(u).not.toContain("CoursEau");
  });

  it("demande une boîte au moins aussi large que le seuil de rattachement", () => {
    // Sinon un tronçon qui passe à 280 m du point pourrait ne pas intersecter
    // la boîte : on l'écarterait sans l'avoir regardé, et l'app dirait « aucun
    // cours d'eau ici » d'un endroit posé sur une rive.
    const bbox = /BBOX=([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)/.exec(urlTronconsAutour(47.586, 1.336));

    expect(bbox).not.toBeNull();
    const [s, w, n, e] = bbox!.slice(1).map(Number);
    // WFS 2.0 + EPSG:4326 : l'ordre des axes est lat,lon.
    expect((n - s) / 2).toBeGreaterThan(0.3 / 111.2);
    expect(e).toBeGreaterThan(w);
  });
});

describe("coursSousLePoint", () => {
  it("tranche le cas réel de Blois : la Loire", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(reel()), { status: 200 })),
    );

    const c = await coursSousLePoint(47.586, 1.336);

    expect(c?.code).toBe("CoursEau_Carthage2017:----0000");
  });

  it("ne fait qu'UNE requête — c'est tout l'intérêt de cette couche", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify(reel()), { status: 200 }));
    vi.stubGlobal("fetch", f);

    await coursSousLePoint(47.586, 1.336);

    expect(f).toHaveBeenCalledTimes(1);
  });

  it("rend null quand la source refuse, au lieu de propager", async () => {
    // Ne pas savoir sur quelle rivière on est n'est pas une panne du briefing :
    // c'est le critère du cours d'eau qui reste en sommeil, et tout le reste
    // continue de s'afficher.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );

    await expect(coursSousLePoint(47.586, 1.336)).resolves.toBeNull();
  });

  it("rend null quand le réseau tombe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );

    await expect(coursSousLePoint(47.586, 1.336)).resolves.toBeNull();
  });
});

describe("le coût, écrit là où on le paie", () => {
  it("garde les deux chiffres mesurés, pour que le choix reste discutable", () => {
    expect(OCTETS_MESURES.troncon).toBe(4903);
    expect(OCTETS_MESURES.coursEau1a5).toBe(339644);
    expect(OCTETS_MESURES.troncon * 60).toBeLessThan(OCTETS_MESURES.coursEau1a5);
  });
});
