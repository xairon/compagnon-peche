import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import ts from "typescript";
import { parserFaces, parserPlage, couvre, type Face } from "./polices";
import { GLOB_IGNORES_PRECACHE, POLICES_HORS_PRECACHE } from "./precache-decoupe";

const RACINE = join(__dirname, "..", "..");
const CSS_POLICES = join(RACINE, "src", "fonts.css");
const DOSSIER_POLICES = join(RACINE, "public", "assets", "fonts");

/**
 * Le texte que l'app AFFICHE, et lui seul.
 *
 * Lire les sources brutes ne marche pas : `lib/helpers.ts` et `lib/mesure-eau.ts`
 * contiennent `/[̀-ͯ]/` — la plage de diacritiques que la normalisation
 * RETIRE avant de comparer. Écrite littéralement dans le fichier, elle ferait
 * passer U+0300 pour un caractère affiché, donc la police vietnamienne pour
 * utile, alors que ce caractère n'apparaît jamais à l'écran.
 *
 * On passe donc par l'analyseur de TypeScript et on ne retient que les nœuds
 * qui portent du texte : chaînes, gabarits, texte JSX. Expressions régulières
 * et commentaires sortent par construction. Le *scanner* seul ne suffisait
 * pas : sans parseur, il ne reconnaît pas `${}` et fait courir un gabarit d'un
 * backtick au suivant, avalant au passage la regex de `normaliser()` — c'est
 * exactement ce qui a d'abord fait croire à U+0300 affiché.
 */
function texteAffiche(fichier: string, source: string): string {
  const sf = ts.createSourceFile(fichier, source, ts.ScriptTarget.Latest, true);
  const morceaux: string[] = [];
  const visite = (n: ts.Node) => {
    if (
      ts.isStringLiteral(n) ||
      ts.isNoSubstitutionTemplateLiteral(n) ||
      ts.isTemplateHead(n) ||
      ts.isTemplateMiddle(n) ||
      ts.isTemplateTail(n) ||
      ts.isJsxText(n)
    ) {
      morceaux.push(n.text);
    }
    ts.forEachChild(n, visite);
  };
  visite(sf);
  return morceaux.join("\n");
}

function fichiers(dossier: string, exts: Set<string>): string[] {
  if (!existsSync(dossier)) return [];
  const out: string[] = [];
  for (const e of readdirSync(dossier)) {
    const p = join(dossier, e);
    if (statSync(p).isDirectory()) {
      if (e !== "__fixtures__") out.push(...fichiers(p, exts));
    } else if (exts.has(extname(e)) && !/\.(test|spec)\.tsx?$/.test(e)) {
      out.push(p);
    }
  }
  return out;
}

/** Tous les points de code non-ASCII que l'app peut afficher. */
function corpus(): Set<number> {
  const vus = new Set<number>();
  const ajoute = (t: string) => {
    for (const ch of t) {
      const cp = ch.codePointAt(0)!;
      if (cp >= 0x80) vus.add(cp);
    }
  };
  for (const dossier of ["data", "screens", "components", "lib"]) {
    for (const f of fichiers(join(RACINE, "src", dossier), new Set([".ts", ".tsx"]))) {
      ajoute(texteAffiche(f, readFileSync(f, "utf8")));
    }
  }
  // CSS et HTML : pas d'expression régulière, on peut prendre le texte brut.
  // `content:"▾"` et les titres d'index.html sont bel et bien affichés.
  ajoute(readFileSync(join(RACINE, "src", "styles.css"), "utf8"));
  ajoute(readFileSync(join(RACINE, "index.html"), "utf8"));
  return vus;
}

const FACES = parserFaces(readFileSync(CSS_POLICES, "utf8"));
const CORPUS = corpus();
const sert = (f: Face) => [...CORPUS].some((cp) => couvre(f, cp));

describe("parserPlage", () => {
  it("lit un point isolé, un intervalle et un joker", () => {
    expect(parserPlage("U+0323")).toEqual([0x323, 0x323]);
    expect(parserPlage(" U+0102-0103 ")).toEqual([0x102, 0x103]);
    expect(parserPlage("U+00??")).toEqual([0x00, 0xff]);
  });
});

describe("parserFaces", () => {
  it("relit les faces déclarées par src/fonts.css", () => {
    expect(FACES.length).toBeGreaterThan(0);
    for (const f of FACES) {
      expect(f.fichier, "nom de fichier").toMatch(/\.woff2$/);
      expect(f.plages.length, `${f.fichier} : plages`).toBeGreaterThan(0);
    }
  });

  it("chaque face déclarée existe vraiment sous public/assets/fonts", () => {
    const manquants = FACES.filter((f) => !existsSync(join(DOSSIER_POLICES, f.fichier)));
    expect(manquants.map((f) => f.fichier)).toEqual([]);
  });

  it("aucun fichier de police n'est livré sans être déclaré", () => {
    const declares = new Set(FACES.map((f) => f.fichier));
    const orphelins = readdirSync(DOSSIER_POLICES).filter((f) => !declares.has(f));
    expect(orphelins).toEqual([]);
  });
});

describe("polices précachées", () => {
  it("chaque police retirée du précache est bien une face déclarée", () => {
    const declares = new Set(FACES.map((f) => f.fichier));
    const inconnues = POLICES_HORS_PRECACHE.filter((f) => !declares.has(f));
    expect(inconnues, "une exclusion qui ne vise rien ne fait rien").toEqual([]);
  });

  it("aucune police retirée ne sert à afficher un caractère de l'app", () => {
    const aTort = FACES.filter((f) => POLICES_HORS_PRECACHE.includes(f.fichier) && sert(f)).map(
      (f) => [f.fichier, [...CORPUS].filter((cp) => couvre(f, cp)).map((cp) => String.fromCodePoint(cp))] as const,
    );
    expect(aTort).toEqual([]);
  });

  it("aucune police précachée n'est inutile", () => {
    const inutiles = FACES.filter((f) => !POLICES_HORS_PRECACHE.includes(f.fichier) && !sert(f)).map(
      (f) => f.fichier,
    );
    expect(inutiles, "précachée mais aucun caractère de l'app ne la déclenche").toEqual([]);
  });

  it("les polices exclues sortent effectivement du précache", () => {
    for (const f of POLICES_HORS_PRECACHE) {
      expect(GLOB_IGNORES_PRECACHE).toContain(`**/assets/fonts/${f}`);
    }
  });

  it("le sous-ensemble latin-ext reste précaché : « 2ᵉ catégorie » en dépend", () => {
    // U+1D49 (ᵉ) et U+02B3 (ʳ) sont dans la plage latin-ext, pas dans le latin
    // de base : les retirer casserait « 2ᵉ catégorie » et « 1ʳᵉ catégorie »,
    // qui sont partout dans la réglementation.
    for (const cp of [0x1d49, 0x02b3]) {
      expect(CORPUS.has(cp), `U+${cp.toString(16)} attendu dans le corpus`).toBe(true);
      const servantes = FACES.filter((f) => couvre(f, cp));
      expect(servantes.length, `U+${cp.toString(16)} : aucune face ne le couvre`).toBeGreaterThan(0);
      for (const f of servantes) expect(POLICES_HORS_PRECACHE).not.toContain(f.fichier);
    }
  });
});

describe("défaut connu de scripts/fetch-fonts.mjs", () => {
  /**
   * CE TEST DOCUMENTE UN BOGUE, il ne le bénit pas.
   *
   * Le décalage décrit dans `polices.ts` n'a pas seulement mal nommé les
   * fichiers : le sous-ensemble « latin » (U+0000-00FF — donc é, è, à, ç, ù,
   * tout le français courant) n'a été téléchargé que pour la DERNIÈRE face de
   * la feuille de Google. L'italique 400 et le demi-gras 600 n'ont aucune face
   * qui couvre le latin de base : ces textes s'affichent en Georgia, la police
   * de repli, pendant que « 2ᵉ » à côté sort en Source Serif. Correction hors
   * de ce lot : elle touche `scripts/fetch-fonts.mjs` et `src/fonts.css`.
   *
   * Quand ce sera fait, cette liste doit devenir vide et ce bloc disparaître.
   */
  it("l'italique 400 et le 600 n'ont toujours pas de face latin de base", () => {
    const latinDeBase = 0x00e9; // é
    const orphelines = [...new Set(FACES.map((f) => `${f.style} ${f.poids}`))].filter(
      (cle) => !FACES.some((f) => `${f.style} ${f.poids}` === cle && couvre(f, latinDeBase)),
    );
    expect(orphelines).toEqual(["italic 400", "normal 600"]);
  });
});
