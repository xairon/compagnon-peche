import { describe, it, expect } from "vitest";
import { CSP_DIRECTIVES, cspHeader } from "./csp";
import { BASEMAPS } from "./basemaps";
import { PARCOURS_WMS, CATEGORIE_WMS } from "./parcours";

// The Content-Security-Policy is injected at BUILD time only (dev needs
// inline/eval for HMR). A host missing from it therefore works perfectly on
// `npm run dev` and is silently blocked in production — which is how the ten
// WMS layers of "réserves de pêche" and "catégorie piscicole" came to be
// tickable and permanently blank, letting an angler conclude there is no
// reserve where there is one.
//
// Nobody would catch that by hand again, so this test derives the required
// hosts from the very lists the map builds its sources from.

function hostsOf(urls: string[]): string[] {
  const seen = new Set<string>();
  for (const u of urls) {
    try {
      seen.add(new URL(u).origin);
    } catch {
      /* template strings like {z}/{x} are still parseable up to the host */
    }
  }
  return [...seen];
}

/** Every remote origin the map actually fetches from. */
function mapOrigins(): string[] {
  const urls = [
    ...Object.values(BASEMAPS).flatMap((b) => [b.style, b.tiles].filter((s): s is string => !!s)),
    ...[...PARCOURS_WMS, ...CATEGORIE_WMS].map((w) => w.base),
  ];
  return hostsOf(urls);
}

/** Sources listed for a directive, wildcards expanded to a matcher. */
function allows(directive: string, origin: string): boolean {
  const line = CSP_DIRECTIVES.find((d) => d.startsWith(directive + " "));
  if (!line) return false;
  return line
    .slice(directive.length + 1)
    .split(/\s+/)
    .some((src) => {
      if (src === origin) return true;
      if (!src.includes("*")) return false;
      const re = new RegExp("^" + src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, "[^.]+") + "$");
      return re.test(origin);
    });
}

describe("CSP de production", () => {
  it("autorise en img-src chaque origine dont la carte tire des tuiles", () => {
    for (const origin of mapOrigins()) {
      expect(allows("img-src", origin), `${origin} absent de img-src`).toBe(true);
    }
  });

  it("autorise en connect-src chaque origine que la carte interroge", () => {
    // MapLibre fetches vector styles and WMS GetMap through XHR, not just <img>.
    for (const origin of mapOrigins()) {
      expect(allows("connect-src", origin), `${origin} absent de connect-src`).toBe(true);
    }
  });

  it("garde les verrous qui font l'intérêt de la politique", () => {
    const header = cspHeader();
    expect(header).toContain("object-src 'none'");
    expect(header).toContain("script-src 'self'");
    expect(header).toContain("base-uri 'self'");
    expect(header).not.toMatch(/script-src[^;]*unsafe-(inline|eval)/);
  });
});
