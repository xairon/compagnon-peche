import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchAccess, nearestByKind, SourceOccupee, budgetAcces } from "./overpass";

// Overpass is a shared free service that pushes back, and its ways of pushing
// back all used to arrive at the user as "Indisponible (connexion requise)" —
// a claim about *their* network for a refusal that came from the server, on a
// panel whose other branch reads "Aucun accès cartographié dans 5 km".
//
// Observed live on 31/07/2026 querying the Blois box:
//   • HTTP 504 with an XHTML error page as the body — .json() would throw a
//     SyntaxError, not an informative one;
//   • a successful answer capped at exactly 60 parkings, the per-set budget.
//
// The last one is why the budget is per kind. Under a single global cap the
// parkings — by far the most numerous tag — can fill it entirely and the only
// slipway on the river never comes back, which the panel then reports as there
// being none.

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

const el = (id: number, tags: Record<string, string>, lat = 47.6, lon = 1.33) => ({
  type: "node",
  id,
  lat,
  lon,
  tags,
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const BOX = [1.27, 47.54, 1.39, 47.63] as const;
const appel = (s?: AbortSignal) => fetchAccess(BOX[0], BOX[1], BOX[2], BOX[3], s);

describe("fetchAccess — refus du serveur", () => {
  it("distingue un 429 d'une panne de réseau", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("rate limited", { status: 429 })));

    await expect(appel()).rejects.toBeInstanceOf(SourceOccupee);
  });

  it("traite un 504 comme une saturation, pas comme une absence", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>gateway timeout</html>", { status: 504 })));

    await expect(appel()).rejects.toBeInstanceOf(SourceOccupee);
  });

  it("porte un message qui n'accuse pas la connexion de l'utilisateur", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 429 })));

    await expect(appel()).rejects.toThrow(/OpenStreetMap|Overpass/i);
    await expect(appel()).rejects.not.toThrow(/connexion requise/i);
  });

  it("ne rend pas une liste vide quand la réponse n'est pas du JSON", async () => {
    // Overpass renvoie une page XHTML sur erreur — observé le 31/07/2026.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<?xml version=\"1.0\"?><html>error</html>", { status: 200 })),
    );

    await expect(appel()).rejects.toThrow();
  });

  it("ne rend pas une liste tronquée comme si elle était complète", async () => {
    // `remark` est la façon dont Overpass signale un échec DANS une réponse 200.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ok({ elements: [el(1, { amenity: "parking" })], remark: "runtime error: Query timed out" }),
      ),
    );

    await expect(appel()).rejects.toBeInstanceOf(SourceOccupee);
  });

  it("laisse passer une annulation sans la déguiser en saturation", async () => {
    const ac = new AbortController();
    ac.abort();
    vi.stubGlobal("fetch", vi.fn(async () => ok({ elements: [] })));

    await expect(appel(ac.signal)).rejects.toHaveProperty("name", "AbortError");
  });
});

describe("fetchAccess — budget par catégorie", () => {
  it("demande un budget propre à chaque catégorie", async () => {
    const f = vi.fn(async (..._a: unknown[]) => ok({ elements: [] }));
    vi.stubGlobal("fetch", f);

    await appel();

    const url = decodeURIComponent(String(f.mock.calls[0][0]));
    // Un seul `out` global laisserait les parkings — de loin les plus nombreux —
    // consommer tout le quota.
    expect(url.match(/out center tags/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("réserve un budget à chaque catégorie, y compris les plus rares", () => {
    for (const k of ["parking", "slipway", "pier", "fishing"] as const) {
      expect(budgetAcces[k], `budget manquant pour ${k}`).toBeGreaterThan(0);
    }
  });

  it("annonce un délai serveur au moins aussi long que celui qu'il s'accorde", async () => {
    const f = vi.fn(async (..._a: unknown[]) => ok({ elements: [] }));
    vi.stubGlobal("fetch", f);

    await appel();

    const url = decodeURIComponent(String(f.mock.calls[0][0]));
    const serveur = Number(url.match(/timeout:(\d+)/)?.[1]);
    expect(serveur).toBeGreaterThan(0);
    // Le client abandonnait à 12 s une requête que le serveur avait le droit de
    // mettre 20 s à produire : l'attente était garantie perdue.
    expect(f.mock.calls[0][1]).toHaveProperty("signal");
  });
});

describe("fetchAccess — lecture des éléments", () => {
  it("classe chaque type de point", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ok({
          elements: [
            el(1, { amenity: "parking", name: "P du port" }),
            el(2, { leisure: "slipway" }),
            el(3, { man_made: "pier" }),
            el(4, { leisure: "fishing" }),
          ],
        }),
      ),
    );

    const pts = await appel();

    expect(pts.map((p) => p.kind).sort()).toEqual(["fishing", "parking", "pier", "slipway"]);
    expect(pts.find((p) => p.kind === "parking")?.name).toBe("P du port");
  });

  it("accepte un way dont la position vient du centroïde", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ok({ elements: [{ type: "way", id: 9, center: { lat: 47.6, lon: 1.33 }, tags: { leisure: "slipway" } }] }),
      ),
    );

    const pts = await appel();

    expect(pts).toHaveLength(1);
    expect(pts[0].lat).toBe(47.6);
  });

  it("ignore un élément sans position plutôt que de le placer à 0,0", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ok({ elements: [{ type: "way", id: 9, tags: { leisure: "slipway" } }] })));

    expect(await appel()).toEqual([]);
  });

  it("rend une liste vide quand la zone est réellement vide", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ok({ elements: [] })));

    expect(await appel()).toEqual([]);
  });
});

describe("nearestByKind", () => {
  it("garde le plus proche de chaque catégorie", () => {
    const pts = [
      { kind: "parking" as const, name: "loin", lat: 47.7, lon: 1.33 },
      { kind: "parking" as const, name: "près", lat: 47.601, lon: 1.33 },
      { kind: "slipway" as const, name: "cale", lat: 47.61, lon: 1.33 },
    ];

    const r = nearestByKind(pts, 47.6, 1.33);

    expect(r.map((x) => x.point.name)).toEqual(["près", "cale"]);
  });
});
