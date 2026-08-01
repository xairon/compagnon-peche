// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readPrefs, writePrefs } from "./prefs";
import { readCoin, writeCoin, CLE_COIN } from "./prefs-coin";
import type { CoinEspeces } from "./especes-du-coin";

// Le relevé du coin coûte ~237 ko de réseau. Le perdre à chaque lancement
// rendrait la fonctionnalité inutilisable au bord de l'eau — c'est justement
// hors-ligne qu'elle sert. D'où une clé à part : `store.tsx` réécrit
// `carnet:prefs` en ENTIER à chaque changement de département.

const COIN: CoinEspeces = {
  ids: ["brochet", "sandre"],
  ecrevisses: ["louisiane"],
  inconnus: ["Cyprinidae sp."],
  stations: [{ code: "04052800", nom: "COSSON à CHAILLES", dist: 5.06 }],
  lat: 47.586,
  lon: 1.336,
  releveIso: "2026-08-01",
};

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("readCoin", () => {
  it("part de rien : aucun relevé mémorisé", () => {
    expect(readCoin()).toBeNull();
  });

  it("relit ce qui a été écrit", () => {
    writeCoin(COIN);
    expect(readCoin()).toEqual(COIN);
  });

  it("n'est pas effacé quand le store réécrit les préférences d'appareil", () => {
    writeCoin(COIN);
    writePrefs({ ...readPrefs(), dept: "36", deptChosen: true });
    expect(readCoin()).toEqual(COIN);
  });

  it("survit à un contenu corrompu sans lever", () => {
    localStorage.setItem(CLE_COIN, "{pas du json");
    expect(readCoin()).toBeNull();
  });

  it("refuse un relevé sans station : il n'aurait aucune provenance à citer", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify({ ...COIN, stations: [] }));
    expect(readCoin()).toBeNull();
  });

  it("refuse un relevé sans date : l'écran ne pourrait pas dire de quand il parle", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify({ ...COIN, releveIso: "l'autre jour" }));
    expect(readCoin()).toBeNull();
  });

  it("refuse un relevé sans point : il ne serait rattaché à aucun coin", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify({ ...COIN, lat: "quarante-sept" }));
    expect(readCoin()).toBeNull();
  });

  it("écarte un id qui n'est pas une chaîne sans jeter le relevé", () => {
    localStorage.setItem(CLE_COIN, JSON.stringify({ ...COIN, ids: ["brochet", 7, "", null] }));
    expect(readCoin()!.ids).toEqual(["brochet"]);
  });

  it("accepte un relevé où AUCUNE espèce n'a été appariée", () => {
    // Trois lots identifiés à la famille, et rien d'autre : c'est un relevé
    // valide, et le dire vaut mieux que faire comme s'il n'existait pas.
    localStorage.setItem(CLE_COIN, JSON.stringify({ ...COIN, ids: [] }));
    expect(readCoin()!.ids).toEqual([]);
  });

  it("écarte une station sans code ou sans distance chiffrée", () => {
    localStorage.setItem(
      CLE_COIN,
      JSON.stringify({
        ...COIN,
        stations: [
          { code: "04052800", nom: "COSSON à CHAILLES", dist: 5.06 },
          { code: "", nom: "?", dist: 1 },
          { code: "04052600", nom: "BEUVRON", dist: "loin" },
        ],
      }),
    );
    expect(readCoin()!.stations).toEqual([
      { code: "04052800", nom: "COSSON à CHAILLES", dist: 5.06 },
    ]);
  });

  it("ne lève pas quand localStorage est indisponible (navigation privée)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => readCoin()).not.toThrow();
    expect(readCoin()).toBeNull();
  });
});

describe("writeCoin", () => {
  it("ne lève pas quand l'écriture est refusée", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => writeCoin(COIN)).not.toThrow();
  });
});
