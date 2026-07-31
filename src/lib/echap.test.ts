// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFermetureEchap } from "./echap";

/**
 * Échap ferme la feuille ouverte. Sur un clavier physique (tablette avec étui,
 * ordinateur), et pour la navigation au clavier en général, c'est le geste
 * attendu — sans lui, la seule issue est de viser le petit bouton « Fermer ».
 */
function echap() {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
}

describe("useFermetureEchap", () => {
  it("appelle la fermeture quand Échap est pressée et que la feuille est ouverte", () => {
    const fermer = vi.fn();
    renderHook(() => useFermetureEchap(true, fermer));

    echap();

    expect(fermer).toHaveBeenCalledTimes(1);
  });

  it("ne ferme rien quand la feuille n'est pas ouverte", () => {
    const fermer = vi.fn();
    renderHook(() => useFermetureEchap(false, fermer));

    echap();

    expect(fermer).not.toHaveBeenCalled();
  });

  it("ignore les autres touches", () => {
    const fermer = vi.fn();
    renderHook(() => useFermetureEchap(true, fermer));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));

    expect(fermer).not.toHaveBeenCalled();
  });

  it("retire son écouteur au démontage : une feuille fermée ne réagit plus", () => {
    const fermer = vi.fn();
    const { unmount } = renderHook(() => useFermetureEchap(true, fermer));

    unmount();
    echap();

    expect(fermer).not.toHaveBeenCalled();
  });

  it("suit la dernière fermeture fournie, sans réabonnement manqué", () => {
    const premier = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ f }) => useFermetureEchap(true, f), {
      initialProps: { f: premier },
    });

    rerender({ f: second });
    echap();

    expect(premier).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
