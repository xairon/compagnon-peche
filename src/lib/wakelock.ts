// Keep the screen awake while hands are busy: cook mode, and the crayfish
// session when the angler asks for a guaranteed on-time alert.
// The system releases the lock whenever the page is hidden, so we re-acquire it
// on the way back — otherwise the lock silently dies on the first screen-off.

type Lock = { release: () => void };
interface WakeNav {
  wakeLock?: { request: (t: string) => Promise<Lock> };
}

let lock: Lock | null = null;
let wanted = false;
let listening = false;

function acquire() {
  try {
    const nav = navigator as unknown as WakeNav;
    if (!nav.wakeLock) return;
    nav.wakeLock
      .request("screen")
      .then((l) => {
        lock = l;
      })
      .catch(() => {});
  } catch {
    /* not supported — ignore */
  }
}

function onVisibility() {
  if (wanted && document.visibilityState === "visible") acquire();
}

/** Ask for the screen to stay on. Idempotent. */
export function requestWake(): void {
  wanted = true;
  if (!listening) {
    document.addEventListener("visibilitychange", onVisibility);
    listening = true;
  }
  acquire();
}

/** Release the lock and stop re-acquiring it. Idempotent. */
export function releaseWake(): void {
  wanted = false;
  if (listening) {
    document.removeEventListener("visibilitychange", onVisibility);
    listening = false;
  }
  try {
    lock?.release();
  } catch {
    /* ignore */
  }
  lock = null;
}

/** True when the platform can keep the screen awake at all. */
export function wakeSupported(): boolean {
  try {
    return !!(navigator as unknown as WakeNav).wakeLock;
  } catch {
    return false;
  }
}

export function enterCuisine(navigate: () => void) {
  navigate();
  requestWake();
}

export function exitCuisine(back: () => void) {
  releaseWake();
  back();
}
