// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { resoudreTheme, appliquerTheme, THEME_COLORS } from "./theme";

describe("resoudreTheme", () => {
  it("suit le système en auto", () => {
    expect(resoudreTheme("auto", true)).toBe("dark");
    expect(resoudreTheme("auto", false)).toBe("light");
  });

  it("ignore le système quand le choix est explicite", () => {
    // Le cas qui compte : téléphone en sombre, utilisateur qui a choisi Clair
    // parce qu'il pêche en plein soleil. Le choix doit gagner.
    expect(resoudreTheme("light", true)).toBe("light");
    expect(resoudreTheme("dark", false)).toBe("dark");
  });
});

describe("appliquerTheme", () => {
  it("pose data-theme et réécrit theme-color", () => {
    const doc = document.implementation.createHTMLDocument();
    const meta = doc.createElement("meta");
    meta.setAttribute("name", "theme-color");
    doc.head.appendChild(meta);

    appliquerTheme("dark", doc);
    expect(doc.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(meta.getAttribute("content")).toBe(THEME_COLORS.dark);

    appliquerTheme("light", doc);
    expect(doc.documentElement.getAttribute("data-theme")).toBe("light");
    expect(meta.getAttribute("content")).toBe(THEME_COLORS.light);
  });

  it("ne lève pas si aucune balise theme-color n'existe", () => {
    const doc = document.implementation.createHTMLDocument();
    expect(() => appliquerTheme("dark", doc)).not.toThrow();
    expect(doc.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
