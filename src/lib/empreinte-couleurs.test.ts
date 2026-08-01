import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  empreinte,
  normaliser,
  resoudreVars,
  sansCommentaires,
  variablesRacine,
} from "../../scripts/empreinte-couleurs.mjs";

const CSS = readFileSync(fileURLToPath(new URL("../styles.css", import.meta.url)), "utf8");
const FIXTURE = fileURLToPath(new URL("./__fixtures__/empreinte-couleurs.txt", import.meta.url));
const SRC_DIR = fileURLToPath(new URL("..", import.meta.url));

/** Tous les .tsx sous src/, récursivement (pas de dépendance de glob ici). */
function fichiersTsx(dir: string): string[] {
  const resultats: string[] = [];
  for (const entree of readdirSync(dir, { withFileTypes: true })) {
    const chemin = join(dir, entree.name);
    if (entree.isDirectory()) resultats.push(...fichiersTsx(chemin));
    else if (entree.name.endsWith(".tsx")) resultats.push(chemin);
  }
  return resultats;
}

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

describe("jetons de :root", () => {
  // Angle mort de l'empreinte ci-dessus : un jeton déclaré dans :root mais
  // jamais référencé par var(--x) nulle part est invisible pour elle. Sa
  // VALEUR peut changer sans qu'aucune "couleur effective" ne bouge, puisque
  // aucun consommateur ne la résout — l'empreinte ne mesure que ce que var()
  // résout, pas ce qui est déclaré. Ce test-ci couvre ce trou : il échoue si
  // un jeton n'a strictement aucun consommateur.
  //
  // Où compte-t-on les consommateurs ? Dans src/styles.css (y compris une
  // définition de jeton qui référence un autre jeton, ex. --x: var(--y)), MAIS
  // AUSSI dans les styles inline des composants .tsx, qui écrivent couramment
  // style={{ color: "var(--muted)" }}. Une tâche à venir en ajoute beaucoup.
  // Si ce test ignorait les .tsx, il déclarerait orphelin un jeton pourtant
  // utilisé et ferait échouer cette tâche future à tort — c'est le piège
  // principal de ce test, traité ici en scannant aussi src/**/*.tsx.
  it("chaque jeton a au moins un consommateur (styles.css ou .tsx)", () => {
    const css = sansCommentaires(CSS);
    const declares = Object.keys(variablesRacine(css));

    const references = new Set<string>();
    const collecter = (texte: string) => {
      for (const m of texte.matchAll(/var\(\s*(--[\w-]+)/g)) references.add(m[1]);
    };
    // Le bloc :root lui-même est inclus ici : une définition --x: var(--y)
    // compte comme une référence à --y.
    collecter(css);
    for (const fichier of fichiersTsx(SRC_DIR)) collecter(readFileSync(fichier, "utf8"));

    const orphelins = declares.filter((nom) => !references.has(nom));
    expect(
      orphelins,
      orphelins.length
        ? `Jeton(s) déclaré(s) dans :root mais jamais référencés, ni dans src/styles.css ni ` +
            `dans un src/**/*.tsx : ${orphelins.join(", ")}. Leur valeur peut changer sans que ` +
            `l'empreinte ci-dessus ne bouge. Pour chacun : soit il devait être câblé quelque ` +
            `part et cet oubli est le bug à corriger, soit il est mort et doit être retiré de ` +
            `:root.`
        : undefined,
    ).toEqual([]);
  });
});
