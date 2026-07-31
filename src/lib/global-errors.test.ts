// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { installGlobalErrorHandlers } from "./global-errors";
import { onPersistError } from "./storage";

// An ErrorBoundary catches render errors and nothing else: not event handlers,
// not rejected promises, not anything in a setTimeout. So an `await` that
// rejected inside a save path produced exactly nothing on screen — the user
// carried on believing their catch was recorded.

let messages: (string | null)[] = [];
let detach: (() => void) | undefined;
let uninstall: (() => void) | undefined;

beforeEach(() => {
  messages = [];
  detach = onPersistError((m) => messages.push(m));
  messages = []; // drop the immediate replay of current state
  vi.spyOn(console, "error").mockImplementation(() => {});
  uninstall = installGlobalErrorHandlers();
});
afterEach(() => {
  uninstall?.();
  detach?.();
  vi.restoreAllMocks();
});

describe("installGlobalErrorHandlers", () => {
  it("signale une promesse rejetée que personne n'attrape", () => {
    window.dispatchEvent(
      Object.assign(new Event("unhandledrejection"), { reason: new Error("échec silencieux") }),
    );

    expect(messages.filter(Boolean)).toHaveLength(1);
  });

  it("signale une erreur non capturée", () => {
    window.dispatchEvent(Object.assign(new Event("error"), { message: "boum" }));

    expect(messages.filter(Boolean)).toHaveLength(1);
  });

  it("ne noie pas l'écran quand la même erreur se répète", () => {
    for (let i = 0; i < 5; i++) {
      window.dispatchEvent(
        Object.assign(new Event("unhandledrejection"), { reason: new Error("même erreur") }),
      );
    }

    // The banner is a single line at the bottom of a phone screen.
    expect(messages.filter(Boolean).length).toBeLessThanOrEqual(1);
  });

  it("se retire proprement", () => {
    uninstall?.();
    uninstall = undefined;

    window.dispatchEvent(Object.assign(new Event("error"), { message: "après retrait" }));

    expect(messages.filter(Boolean)).toHaveLength(0);
  });

  it("ne transmet rien — la trace reste sur l'appareil", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());

    window.dispatchEvent(
      Object.assign(new Event("unhandledrejection"), { reason: new Error("x") }),
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
