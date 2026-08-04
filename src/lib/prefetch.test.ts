import { describe, it, expect, vi, afterEach } from "vitest";
import { prefetchHeavyScreens } from "./prefetch";

describe("prefetchHeavyScreens", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("précharge les écrans lourds pendant l'inactivité", () => {
    const loader = vi.fn(() => Promise.resolve("ok"));
    vi.stubGlobal("requestIdleCallback", (cb: () => void) => {
      cb();
      return 0;
    });
    prefetchHeavyScreens([loader]);
    return Promise.resolve().then(() => {
      expect(loader).toHaveBeenCalledTimes(1);
    });
  });

  it("se replie sur un délai quand requestIdleCallback est absent (Safari)", () => {
    vi.stubGlobal("requestIdleCallback", undefined);
    vi.useFakeTimers();
    const loader = vi.fn(() => Promise.resolve("ok"));
    prefetchHeavyScreens([loader]);
    expect(loader).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("un échec de préchargement ne fait rien planter au démarrage", () => {
    const loader = vi.fn(() => Promise.reject(new Error("hors-ligne")));
    vi.stubGlobal("requestIdleCallback", (cb: () => void) => {
      cb();
      return 0;
    });
    expect(() => prefetchHeavyScreens([loader])).not.toThrow();
    return Promise.resolve().then(() => {
      expect(loader).toHaveBeenCalledTimes(1);
    });
  });
});
