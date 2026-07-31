import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { empreinte, normaliser, resoudreVars } from "../../scripts/empreinte-couleurs.mjs";

const CSS = readFileSync(fileURLToPath(new URL("../styles.css", import.meta.url)), "utf8");
const FIXTURE = fileURLToPath(new URL("./__fixtures__/empreinte-couleurs.txt", import.meta.url));

describe("normaliser", () => {
  it("développe les hex courts et passe en minuscules", () => {
    expect(normaliser("color: #FFF")).toBe("color: #ffffff");
    expect(normaliser("color: #1D6E42")).toBe("color: #1d6e42");
  });
});

describe("resoudreVars", () => {
  it("résout en chaîne et préfère le jeton au repli", () => {
    const vars = { "--a": "var(--b)", "--b": "#123456" };
    expect(resoudreVars("color: var(--a)", vars)).toBe("color: #123456");
    expect(resoudreVars("color: var(--b, #000000)", vars)).toBe("color: #123456");
  });
});

describe("empreinte de src/styles.css", () => {
  // LE garde-fou du chantier de tokenisation. Remplacer une couleur en dur par
  // le jeton qui porte la même valeur ne change pas l'empreinte. Si ce test
  // échoue pendant une tâche de tokenisation, c'est que le remplacement a
  // changé une couleur — à corriger, pas à régénérer.
  //
  // Pour régénérer VOLONTAIREMENT (thème sombre ajouté, fusion assumée) :
  //   node scripts/empreinte-couleurs.mjs --ecrire
  it("est identique au fixture", () => {
    expect(empreinte(CSS)).toBe(readFileSync(FIXTURE, "utf8"));
  });
});
