// Which build is running.
//
// Nothing in the app said. `registerType: "prompt"` means an install that keeps
// dismissing the update toast stays on an old build indefinitely, so "it breaks
// when I open the map" was impossible to attach to a version — and impossible
// to tell apart from a bug already fixed weeks earlier.
//
// The values are substituted at build time by `define` in vite.config.ts. The
// fallbacks below are what tests and `npm run dev` see: honest placeholders,
// never a fake version number.

declare const __APP_VERSION__: string;
declare const __COMMIT__: string;
declare const __BUILD_DATE__: string;

const lire = (v: () => string, defaut: string): string => {
  try {
    return v() || defaut;
  } catch {
    return defaut; // not substituted (dev server, vitest)
  }
};

export const APP_VERSION = lire(() => __APP_VERSION__, "dev");
export const COMMIT = lire(() => __COMMIT__, "local");
export const BUILD_DATE = lire(() => __BUILD_DATE__, "");

/** One-line build identity, for the footer and for bug reports. */
export function buildLabel(): string {
  const date = BUILD_DATE ? ` · ${BUILD_DATE}` : "";
  return `v${APP_VERSION} (${COMMIT})${date}`;
}
