import { describe, it, expect, vi, beforeEach } from "vitest";

// wakelock.ts keeps module-global state (lock, wanted, listening, refCount),
// so every test loads a fresh copy via vi.resetModules() + a dynamic import —
// otherwise state from one test would leak into the next.

/** Lets pending .then()/.catch() chains settle before assertions run. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** A fake WakeLockSentinel that supports the real `release` event, plus a
 *  helper to simulate the platform releasing it on its own (page hidden). */
function makeSentinel() {
  const listeners: Record<string, Array<() => void>> = {};
  const sentinel = {
    release: vi.fn(() => {
      (listeners["release"] ?? []).forEach((cb) => cb());
      return Promise.resolve();
    }),
    addEventListener: vi.fn((type: string, cb: () => void) => {
      (listeners[type] ??= []).push(cb);
    }),
    // Test-only: fires the `release` event without going through release().
    simulatePlatformRelease() {
      (listeners["release"] ?? []).forEach((cb) => cb());
    },
  };
  return sentinel;
}

type Deferred = {
  sentinel: ReturnType<typeof makeSentinel>;
  resolve: () => void;
  reject: (e: unknown) => void;
};

/** Installs a fake navigator.wakeLock. Each request() call is captured in
 *  `pending` so a test can resolve/reject it whenever it wants. */
function setupNavigator() {
  const pending: Deferred[] = [];
  const request = vi.fn(() => {
    const sentinel = makeSentinel();
    let resolveFn!: () => void;
    let rejectFn!: (e: unknown) => void;
    const promise = new Promise((resolve, reject) => {
      resolveFn = () => resolve(sentinel);
      rejectFn = reject;
    });
    pending.push({ sentinel, resolve: resolveFn, reject: rejectFn });
    return promise;
  });
  // Assigner globalThis.navigator directement échoue sur les runtimes récents
  // (Node ≥ 21 expose un navigator getter-only) : vi.stubGlobal passe par
  // Object.defineProperty, comme partout ailleurs dans le dépôt.
  vi.stubGlobal("navigator", { wakeLock: { request } });
  return { request, pending };
}

/** Installs a fake document with a controllable visibilityState and a real
 *  visibilitychange listener registry. */
function setupDocument(initial: string = "visible") {
  const listeners: Record<string, Array<() => void>> = {};
  const doc = {
    visibilityState: initial,
    addEventListener: vi.fn((type: string, cb: () => void) => {
      (listeners[type] ??= []).push(cb);
    }),
    removeEventListener: vi.fn((type: string, cb: () => void) => {
      listeners[type] = (listeners[type] ?? []).filter((l) => l !== cb);
    }),
    fireVisibilityChange() {
      (listeners["visibilitychange"] ?? []).forEach((cb) => cb());
    },
  };
  (globalThis as unknown as { document: unknown }).document = doc;
  return doc;
}

async function loadModule() {
  return await import("./wakelock");
}

beforeEach(() => {
  vi.resetModules();
});

describe("requestWake", () => {
  it("requests a screen wake lock", async () => {
    const { request } = setupNavigator();
    setupDocument();
    const { requestWake } = await loadModule();

    requestWake();

    expect(request).toHaveBeenCalledWith("screen");
  });
});

describe("re-acquisition after the platform silently releases the sentinel", () => {
  it("requests a new lock once visible again — regression for the never-reacquired bug", async () => {
    const { request, pending } = setupNavigator();
    const doc = setupDocument("visible");
    const { requestWake } = await loadModule();

    requestWake();
    expect(pending).toHaveLength(1);
    pending[0].resolve();
    await flush();

    // The platform hides the page and releases the sentinel on its own —
    // nobody calls releaseWake().
    doc.visibilityState = "hidden";
    pending[0].sentinel.simulatePlatformRelease();

    // The page becomes visible again.
    doc.visibilityState = "visible";
    doc.fireVisibilityChange();

    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe("releaseWake", () => {
  it("releases the held sentinel and stops re-acquiring on later visibility changes", async () => {
    const { request, pending } = setupNavigator();
    const doc = setupDocument("visible");
    const { requestWake, releaseWake } = await loadModule();

    requestWake();
    pending[0].resolve();
    await flush();

    releaseWake();
    expect(pending[0].sentinel.release).toHaveBeenCalledTimes(1);

    doc.fireVisibilityChange();
    expect(request).toHaveBeenCalledTimes(1); // no re-acquisition — nobody wants it anymore
  });
});

describe("reference counting", () => {
  it("two requestWake() then one releaseWake() keeps the lock; the second releases it", async () => {
    const { pending } = setupNavigator();
    setupDocument();
    const { requestWake, releaseWake } = await loadModule();

    requestWake();
    pending[0].resolve();
    await flush();
    requestWake(); // second consumer

    releaseWake();
    expect(pending[0].sentinel.release).not.toHaveBeenCalled();

    releaseWake();
    expect(pending[0].sentinel.release).toHaveBeenCalledTimes(1);
  });

  it("extra releaseWake() calls beyond zero are harmless no-ops", async () => {
    setupNavigator();
    setupDocument();
    const { releaseWake } = await loadModule();

    expect(() => {
      releaseWake();
      releaseWake();
      releaseWake();
    }).not.toThrow();
  });
});

describe("in-flight request race", () => {
  it("two acquire attempts while a request is still pending issue only one request", async () => {
    const { request, pending } = setupNavigator();
    setupDocument();
    const { requestWake } = await loadModule();

    requestWake();
    requestWake(); // second consumer while the first request is still unresolved

    expect(request).toHaveBeenCalledTimes(1);
    expect(pending).toHaveLength(1);
  });
});

describe("wakeSupported", () => {
  it("is false when navigator.wakeLock is absent", async () => {
    vi.stubGlobal("navigator", {});
    setupDocument();
    const { wakeSupported } = await loadModule();

    expect(wakeSupported()).toBe(false);
  });
});

describe("a rejected request", () => {
  it("leaves the module able to acquire again afterward", async () => {
    const { request, pending } = setupNavigator();
    setupDocument();
    const { requestWake } = await loadModule();

    requestWake();
    pending[0].reject(new Error("platform refused"));
    await flush();

    requestWake();
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe("enterCuisine / exitCuisine", () => {
  it("enterCuisine navigates then requests the wake lock", async () => {
    const { request } = setupNavigator();
    setupDocument();
    const { enterCuisine } = await loadModule();
    const navigate = vi.fn();

    enterCuisine(navigate);

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("screen");
  });

  it("exitCuisine releases the wake lock then navigates back", async () => {
    const { pending } = setupNavigator();
    setupDocument();
    const { enterCuisine, exitCuisine } = await loadModule();
    enterCuisine(() => {});
    pending[0].resolve();
    await flush();

    const back = vi.fn();
    exitCuisine(back);

    expect(pending[0].sentinel.release).toHaveBeenCalledTimes(1);
    expect(back).toHaveBeenCalledTimes(1);
  });
});
