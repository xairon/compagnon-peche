import { describe, it, expect } from "vitest";
import { isStale } from "./now";

const T0 = 1_700_000_000_000;
const JOUR = 86_400_000;

describe("isStale", () => {
  it("un relevé récent n'est pas périmé", () => {
    expect(isStale(new Date(T0 - JOUR).toISOString(), T0, 30 * JOUR)).toBe(false);
  });

  it("un relevé au-delà de la fenêtre est périmé", () => {
    expect(isStale(new Date(T0 - 31 * JOUR).toISOString(), T0, 30 * JOUR)).toBe(true);
  });

  it("à la borne exacte, pas encore périmé", () => {
    expect(isStale(T0 - 30 * JOUR, T0, 30 * JOUR)).toBe(false);
  });

  // Une date absente ne doit pas se lire comme « périmé » : il n'y a rien à
  // juger, et afficher un avertissement de fraîcheur sur une donnée inexistante
  // inquiéterait sans raison.
  it("une date absente ou illisible n'est jamais « périmée »", () => {
    expect(isStale(undefined, T0, JOUR)).toBe(false);
    expect(isStale(null, T0, JOUR)).toBe(false);
    expect(isStale("", T0, JOUR)).toBe(false);
    expect(isStale("pas une date", T0, JOUR)).toBe(false);
  });

  it("accepte aussi bien un horodatage qu'une chaîne ISO", () => {
    expect(isStale(T0 - 2 * JOUR, T0, JOUR)).toBe(true);
    expect(isStale(new Date(T0 - 2 * JOUR).toISOString(), T0, JOUR)).toBe(true);
  });
});
