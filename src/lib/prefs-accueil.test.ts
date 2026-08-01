// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readPrefs, writePrefs } from "./prefs";
import {
  readPrefsAccueil,
  writePrefsAccueil,
  estReplie,
  PREFS_ACCUEIL_DEFAUT,
} from "./prefs-accueil";

// L'Accueil retient deux choses entre deux lancements : les sections que le
// pêcheur a repliées, et la rivière qu'il a désignée. Ni l'une ni l'autre ne
// peut voyager dans `carnet:prefs` : `store.tsx` y écrit l'objet ENTIER
// (`writePrefs({ dept, deptChosen, bigUI })`) à chaque changement de
// département, ce qui effacerait tout le reste. D'où une clé distincte.

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("readPrefsAccueil", () => {
  it("part de rien : aucun repli mémorisé, aucune rivière désignée", () => {
    expect(readPrefsAccueil()).toEqual(PREFS_ACCUEIL_DEFAUT);
    expect(readPrefsAccueil().riviere).toBeNull();
  });

  it("relit ce qui a été écrit", () => {
    writePrefsAccueil({
      replis: { carte: true, meteo: false },
      riviere: { nom: "la Loire", cles: ["CoursEau_Carthage2017:----0000"] },
    });

    expect(readPrefsAccueil()).toEqual({
      replis: { carte: true, meteo: false },
      riviere: { nom: "la Loire", cles: ["CoursEau_Carthage2017:----0000"] },
    });
  });

  it("n'est pas effacé quand le store réécrit les préférences d'appareil", () => {
    // Le scénario réel : le pêcheur replie la carte, puis change de
    // département. store.tsx appelle alors writePrefs() avec ses trois champs.
    writePrefsAccueil({ replis: { carte: true }, riviere: null });

    writePrefs({ ...readPrefs(), dept: "36", deptChosen: true });

    expect(readPrefsAccueil().replis).toEqual({ carte: true });
  });

  it("survit à un contenu corrompu sans lever", () => {
    localStorage.setItem("carnet:accueil", "{pas du json");

    expect(readPrefsAccueil()).toEqual(PREFS_ACCUEIL_DEFAUT);
  });

  it("ignore un repli qui n'est pas un booléen", () => {
    localStorage.setItem(
      "carnet:accueil",
      JSON.stringify({ replis: { carte: "oui", meteo: true, eau: null } }),
    );

    expect(readPrefsAccueil().replis).toEqual({ meteo: true });
  });

  it("ignore des replis qui ne sont pas un objet", () => {
    localStorage.setItem("carnet:accueil", JSON.stringify({ replis: ["carte"] }));

    expect(readPrefsAccueil().replis).toEqual({});
  });

  it("refuse une rivière sans aucune clé de cours d'eau", () => {
    // Une rivière sans clé ne filtre rien : les conditions de l'eau
    // retomberaient sur la station la plus proche — donc, éventuellement, sur
    // une AUTRE rivière — tout en affichant « la Loire ». C'est exactement le
    // défaut que ce choix existe pour supprimer.
    localStorage.setItem("carnet:accueil", JSON.stringify({ riviere: { nom: "la Loire", cles: [] } }));

    expect(readPrefsAccueil().riviere).toBeNull();
  });

  it("refuse une rivière sans nom", () => {
    localStorage.setItem(
      "carnet:accueil",
      JSON.stringify({ riviere: { nom: "", cles: ["CoursEau_Carthage2017:----0000"] } }),
    );

    expect(readPrefsAccueil().riviere).toBeNull();
  });

  it("écarte les clés vides sans jeter la rivière", () => {
    localStorage.setItem(
      "carnet:accueil",
      JSON.stringify({ riviere: { nom: "la Loire", cles: ["CEA:----0000", "", 7] } }),
    );

    expect(readPrefsAccueil().riviere).toEqual({ nom: "la Loire", cles: ["CEA:----0000"] });
  });

  it("ne lève pas quand localStorage est indisponible (navigation privée)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => readPrefsAccueil()).not.toThrow();
    expect(readPrefsAccueil()).toEqual(PREFS_ACCUEIL_DEFAUT);
  });
});

describe("writePrefsAccueil", () => {
  it("ne lève pas quand l'écriture est refusée", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => writePrefsAccueil({ replis: { carte: true }, riviere: null })).not.toThrow();
  });
});

describe("estReplie", () => {
  it("rend le défaut de la section tant que le pêcheur n'a rien décidé", () => {
    expect(estReplie({}, "carte", true)).toBe(true);
    expect(estReplie({}, "eau", false)).toBe(false);
  });

  it("le choix du pêcheur l'emporte sur le défaut, dans les deux sens", () => {
    expect(estReplie({ carte: false }, "carte", true)).toBe(false);
    expect(estReplie({ eau: true }, "eau", false)).toBe(true);
  });
});
