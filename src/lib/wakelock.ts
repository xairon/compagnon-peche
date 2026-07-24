// Keep the screen awake while hands are busy: cook mode, and the crayfish
// session when the angler asks for a guaranteed on-time alert.
// The system releases the lock whenever the page is hidden, so we re-acquire it
// on the way back — otherwise the lock silently dies on the first screen-off.

// Loosely typed: the real WakeLockSentinel supports `addEventListener`, but
// the test stub and older engines may not — every call to it is guarded.
type Lock = { release: () => void; addEventListener?: (type: "release", cb: () => void) => void };
interface WakeNav {
  wakeLock?: { request: (t: string) => Promise<Lock> };
}

let lock: Lock | null = null;
let wanted = false;
let listening = false;
// A request is async: two acquire() calls that both fire before the first
// resolves (visibility flicker, two consumers calling requestWake() back to
// back) would otherwise each issue a request, with the second sentinel
// clobbering `lock` and leaking the first past releaseWake().
let acquiring = false;
// Two independent consumers can hold the wake lock at once (cook mode, the
// crayfish session screen). Reference-count so the first one to release
// doesn't kill the other's screen-on guarantee.
let refCount = 0;

function acquire() {
  try {
    const nav = navigator as unknown as WakeNav;
    if (!nav.wakeLock) return;
    if (lock || acquiring) return; // already held, or a request is already in flight
    acquiring = true;
    nav.wakeLock
      .request("screen")
      .then((l) => {
        acquiring = false;
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
        // The platform releases the sentinel by itself whenever the document
        // is hidden — that's the whole reason onVisibility exists. Without
        // this listener, `lock` keeps pointing at the now-dead sentinel and
        // the next visibilitychange short-circuits on `if (lock) return`,
        // silently losing the wake lock for the rest of the session. Only
        // clear `lock` if it's still the sentinel we're tracking — an
        // explicit releaseWake() may have already replaced or nulled it.
        try {
          l.addEventListener?.("release", () => {
            if (lock === l) lock = null;
          });
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        acquiring = false;
      });
  } catch {
    acquiring = false;
    /* not supported, or request() threw synchronously — ignore */
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
