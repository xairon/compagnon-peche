// Keep the screen awake in cook mode (hands busy, phone on the counter).
let wakeLock: { release: () => void } | null = null;

export function enterCuisine(navigate: () => void) {
  navigate();
  try {
    const nav = navigator as unknown as {
      wakeLock?: { request: (t: string) => Promise<{ release: () => void }> };
    };
    if (nav.wakeLock) {
      nav.wakeLock
        .request("screen")
        .then((l) => {
          wakeLock = l;
        })
        .catch(() => {});
    }
  } catch {
    /* not supported — ignore */
  }
}

export function exitCuisine(back: () => void) {
  try {
    if (wakeLock) {
      wakeLock.release();
      wakeLock = null;
    }
  } catch {
    /* ignore */
  }
  back();
}
