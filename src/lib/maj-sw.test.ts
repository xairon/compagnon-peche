// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  JOUR_MS,
  REPORT_MS,
  LIMITE_REPORTS,
  ECART_MIN_VERIFICATION_MS,
  lireDossier,
  oublierMaj,
  signalerMaj,
  reporterMaj,
  majVisible,
  reportPossible,
  joursDAttente,
  doitVerifier,
} from "./maj-sw";

const T0 = Date.parse("2026-07-31T08:00:00Z");

beforeEach(() => {
  localStorage.clear();
});

/**
 * `registerType: "prompt"` : c'est l'utilisateur qui décide quand la nouvelle
 * version s'applique. Deux trous en découlaient.
 *
 * 1. **Aucun report.** Le bandeau n'a pas de « plus tard ». On ne peut que
 *    l'appliquer ou le laisser couvrir l'écran — au bord de l'eau, les deux
 *    dérangent.
 * 2. **Aucune borne.** Rien ne gardait trace d'une mise à jour déclinée : l'état
 *    ne vivait qu'en mémoire, un rechargement remettait tout à zéro. Une
 *    installation qui décline en boucle ne reçoit jamais les correctifs
 *    réglementaires — c'est le vrai enjeu, pas le confort.
 */
describe("dossier de mise à jour", () => {
  it("ne montre rien tant qu'aucune mise à jour n'attend", () => {
    expect(majVisible(lireDossier(), T0)).toBe(false);
  });

  it("montre la mise à jour dès qu'elle est signalée", () => {
    signalerMaj(T0, "abc1234");

    expect(majVisible(lireDossier(), T0)).toBe(true);
  });

  it("garde la date de la PREMIÈRE apparition, pas de la dernière", () => {
    // Sinon « elle attend depuis huit jours » ne veut rien dire : chaque
    // rechargement de page rappellerait onNeedRefresh et remettrait le compteur
    // à zéro, ce qui est exactement l'état d'avant.
    signalerMaj(T0, "abc1234");
    signalerMaj(T0 + 5 * JOUR_MS, "abc1234");

    expect(lireDossier()?.depuis).toBe(T0);
    expect(joursDAttente(lireDossier(), T0 + 5 * JOUR_MS)).toBe(5);
  });

  it("survit au rechargement : fermer l'app ne remet pas le compteur à zéro", () => {
    signalerMaj(T0, "abc1234");
    reporterMaj(T0);

    // `lireDossier` relit le stockage, il n'y a pas d'état en mémoire à vider.
    expect(lireDossier()?.reports).toBe(1);
  });

  it("oublie le dossier quand le build qui tourne a changé", () => {
    // La mise à jour a été appliquée (ou l'app réinstallée) : garder l'ancien
    // compteur reprocherait à l'utilisateur des reports qu'il a déjà soldés.
    signalerMaj(T0, "abc1234");

    expect(lireDossier("def5678")).toBeNull();
  });
});

describe("report", () => {
  it("masque la mise à jour pour la durée du report", () => {
    signalerMaj(T0, "abc1234");
    reporterMaj(T0);

    expect(majVisible(lireDossier(), T0 + 60_000)).toBe(false);
  });

  it("la fait revenir d'elle-même : reporter n'est pas refuser", () => {
    signalerMaj(T0, "abc1234");
    reporterMaj(T0);

    expect(majVisible(lireDossier(), T0 + REPORT_MS + 1)).toBe(true);
  });

  it("cesse d'accorder le report au bout de la limite", () => {
    // Une installation qui décline en boucle ne reçoit jamais les correctifs
    // réglementaires. Le report est un délai, pas un droit de veto.
    signalerMaj(T0, "abc1234");
    let t = T0;
    for (let i = 0; i < LIMITE_REPORTS; i++) {
      expect(reporterMaj(t)).not.toBeNull();
      t += REPORT_MS + 1;
    }

    expect(reportPossible(lireDossier())).toBe(false);
    expect(reporterMaj(t)).toBeNull();
    expect(majVisible(lireDossier(), t)).toBe(true);
  });

  it("reste affichée après le dernier report, sans jamais s'appliquer toute seule", () => {
    // Recharger de force sous les doigts de quelqu'un qui remplit une fiche de
    // prise lui ferait perdre sa saisie (le brouillon n'est pas persisté). La
    // borne pousse, elle ne décide pas à la place.
    signalerMaj(T0, "abc1234");
    let t = T0;
    for (let i = 0; i < LIMITE_REPORTS + 3; i++) {
      reporterMaj(t);
      t += REPORT_MS + 1;
    }

    expect(majVisible(lireDossier(), t + 30 * JOUR_MS)).toBe(true);
  });

  it("ne reporte rien s'il n'y a rien à reporter", () => {
    expect(reporterMaj(T0)).toBeNull();
  });
});

describe("oublierMaj", () => {
  it("efface le dossier une fois la mise à jour appliquée", () => {
    signalerMaj(T0, "abc1234");
    oublierMaj();

    expect(lireDossier()).toBeNull();
  });
});

describe("doitVerifier", () => {
  it("laisse vérifier au premier passage", () => {
    // Sans registration.update(), une app ouverte en permanence (le cas d'une
    // PWA Android qu'on ne ferme jamais) n'apprend l'existence d'une nouvelle
    // version qu'au prochain démarrage à froid — c'est-à-dire peut-être jamais.
    expect(doitVerifier(0, T0)).toBe(true);
  });

  it("n'interroge pas le serveur à chaque retour d'écran", () => {
    expect(doitVerifier(T0, T0 + ECART_MIN_VERIFICATION_MS - 1)).toBe(false);
  });

  it("finit toujours par revérifier", () => {
    expect(doitVerifier(T0, T0 + ECART_MIN_VERIFICATION_MS + 1)).toBe(true);
  });
});

describe("stockage indisponible", () => {
  it("ne casse rien quand localStorage refuse (navigation privée, WebView ancienne)", () => {
    const vrai = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("refusé");
      },
    });
    try {
      expect(() => signalerMaj(T0, "abc1234")).not.toThrow();
      expect(lireDossier()).toBeNull();
    } finally {
      if (vrai) Object.defineProperty(globalThis, "localStorage", vrai);
    }
  });
});
