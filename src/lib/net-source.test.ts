import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchT } from "./net";
import { delaiPour } from "./net-bornes";

// fetchT accordait 12 000 ms à tout le monde. Le budget doit venir de la
// source : 8 s pour 2 ko de météo, 25 s pour 973 ko de couche hydrographique.

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Un fetch qui ne répond jamais, mais qui rejette quand on l'annule. */
function fetchQuiPend() {
  return vi.fn(
    (_u: unknown, init?: { signal?: AbortSignal }) =>
      new Promise<Response>((_, rejeter) => {
        init?.signal?.addEventListener("abort", () =>
          rejeter(init.signal!.reason ?? new DOMException("Aborted", "AbortError")),
        );
      }),
  );
}

describe("fetchT — délai par source", () => {
  it("abandonne un appel météo à son propre délai, pas à 12 s", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchQuiPend());

    const p = fetchT("https://exemple/meteo", { source: "meteo", retries: 0 });
    const attendu = expect(p).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(delaiPour("meteo") + 10);

    await attendu;
  });

  it("laisse au Sandre le temps que sa taille demande", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchQuiPend());

    let fini = false;
    const p = fetchT("https://exemple/sandre", { source: "sandre", retries: 0 }).catch(() => {
      fini = true;
    });

    // À l'ancien délai unique de 12 s, l'appel devait encore être en cours.
    await vi.advanceTimersByTimeAsync(12_000 + 10);
    expect(fini).toBe(false);

    await vi.advanceTimersByTimeAsync(delaiPour("sandre"));
    await p;
    expect(fini).toBe(true);
  });

  it("un délai explicite l'emporte sur celui de la source", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchQuiPend());

    const p = fetchT("https://exemple/x", { source: "sandre", timeout: 1000, retries: 0 });
    const attendu = expect(p).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(1010);

    await attendu;
  });

  it("sans source, garde le comportement d'avant", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchQuiPend());

    const p = fetchT("https://exemple/x", { retries: 0 });
    const attendu = expect(p).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(12_010);

    await attendu;
  });
});
