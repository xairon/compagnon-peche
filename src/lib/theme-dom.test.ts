import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { THEME_COLORS } from "./theme";

const HTML = readFileSync(
  fileURLToPath(new URL("../../index.html", import.meta.url)),
  "utf8",
);

/**
 * Le script anti-flash d'index.html duplique nécessairement la logique de
 * theme.ts : il doit être synchrone et précéder le bundle, donc il ne peut
 * rien importer. Ce test est ce qui rend cette duplication tenable — il fait
 * échouer la suite dès que les deux divergent.
 */
describe("script anti-flash d'index.html", () => {
  it("utilise la même clé de stockage que prefs.ts", () => {
    expect(HTML).toContain('localStorage.getItem("carnet:prefs")');
  });

  it("emploie les couleurs de barre d'état de theme.ts", () => {
    expect(HTML).toContain(THEME_COLORS.dark);
    expect(HTML).toContain(THEME_COLORS.light);
  });

  it("s'exécute avant le bundle, sinon il ne sert à rien", () => {
    expect(HTML.indexOf("data-theme")).toBeLessThan(HTML.indexOf("/src/main.tsx"));
  });

  it("déclare les deux balises theme-color à media, plus celle sans media", () => {
    expect(HTML).toContain('media="(prefers-color-scheme: dark)"');
    expect(HTML).toContain('media="(prefers-color-scheme: light)"');
    expect(/<meta name="theme-color" content=/.test(HTML)).toBe(true);
  });
});
