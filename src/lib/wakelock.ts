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
// Two independent consumers can hold the wake lock at once (cook mode, the
// crayfish session screen). Reference-count so the first one to release
// doesn't kill the other's screen-on guarantee.
let refCount = 0;

function acquire() {
  try {
    const nav = navigator as unknown as WakeNav;
    if (!nav.wakeLock) return;
    if (lock) return; // already held — don't issue a redundant request
    nav.wakeLock
      .request("screen")
      .then((l) => {
        if (!wanted) {
          // nobody wants the lock anymore by the time this resolved —
          // release it immediately instead of storing it.
          try {
            l.release();
          } catch {
            /* ignore */
          }
          return;
        }
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

/** Ask for the screen to stay on. Idempotent per-consumer via a reference
 *  count — pair every call with a `releaseWake()`. */
export function requestWake(): void {
  refCount += 1;
  wanted = true;
  if (!listening) {
    document.addEventListener("visibilitychange", onVisibility);
    listening = true;
  }
  acquire();
}

/** Release this consumer's hold on the lock. Only tears down the underlying
 *  wake lock once every `requestWake()` call has been matched. Idempotent —
 *  calling it more times than `requestWake()` is a no-op past zero. */
export function releaseWake(): void {
  if (refCount > 0) refCount -= 1;
  if (refCount > 0) return;

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
