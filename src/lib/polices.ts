/**
 * Lecture des `@font-face` de `src/fonts.css`, pour que le précache puisse être
 * décidé sur ce que chaque fichier COUVRE, et pas sur son nom.
 *
 * Le nom, justement, ment. `scripts/fetch-fonts.mjs` découpe la feuille de
 * Google sur `@font-face` et cherche ensuite le commentaire `/* subset *\/`
 * dans le bloc obtenu — or ce commentaire précède le `@font-face` suivant :
 * chaque fichier hérite du nom du sous-ensemble d'APRÈS. Vérifiable dans
 * `src/fonts.css` sans rien télécharger : le fichier appelé
 * `ss4-normal-700-latin-ext.woff2` y est déclaré avec la plage vietnamienne
 * (U+1EA0-1EF9, U+20AB…), et celui appelé `…-latin.woff2` avec la plage
 * latin-ext (U+0100-02BA…). Seule la plage déclarée compte : c'est elle, et
 * elle seule, qui décide si le navigateur va chercher le fichier.
 *
 * D'où ce module : `unicode-range` est la seule source de vérité, et
 * `polices.test.ts` s'en sert pour confronter chaque fichier au texte que
 * l'app affiche réellement.
 */

export interface Face {
  /** Nom du fichier woff2, tel qu'il apparaît sous `public/assets/fonts/`. */
  fichier: string;
  /** `normal` ou `italic`. */
  style: string;
  /** `400`, `600`, `700`… */
  poids: string;
  /** Plages `unicode-range`, bornes incluses. */
  plages: [number, number][];
}

/**
 * Une entrée `unicode-range` : `U+0323`, `U+0102-0103`, ou la forme à jokers
 * `U+00??`. Les jokers ne servent pas aujourd'hui dans `fonts.css`, mais une
 * régénération peut en produire — les ignorer silencieusement ferait croire à
 * une plage vide, donc à une police inutile.
 */
export function parserPlage(entree: string): [number, number] {
  const t = entree.trim().replace(/^U\+/i, "");
  const tiret = t.indexOf("-");
  if (tiret > 0) {
    return [parseInt(t.slice(0, tiret), 16), parseInt(t.slice(tiret + 1), 16)];
  }
  if (t.includes("?")) {
    return [parseInt(t.replace(/\?/g, "0"), 16), parseInt(t.replace(/\?/g, "F"), 16)];
  }
  const n = parseInt(t, 16);
  return [n, n];
}

/** Les `@font-face` déclarés par une feuille de style, dans l'ordre. */
export function parserFaces(css: string): Face[] {
  const faces: Face[] = [];
  for (const bloc of css.match(/@font-face\s*\{[^}]*\}/g) ?? []) {
    const url = /src:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/.exec(bloc)?.[1];
    if (!url) continue;
    const range = /unicode-range:\s*([^;}]+)/.exec(bloc)?.[1] ?? "";
    faces.push({
      fichier: url.split("/").pop()!,
      style: /font-style:\s*([^;}]+)/.exec(bloc)?.[1]?.trim() ?? "normal",
      poids: /font-weight:\s*([^;}]+)/.exec(bloc)?.[1]?.trim() ?? "400",
      // Pas de `unicode-range` = la face couvre tout. Une plage vide dirait le
      // contraire, et la police serait déclarée inutile à tort.
      plages: range.trim()
        ? range.split(",").map(parserPlage)
        : [[0, 0x10ffff]],
    });
  }
  return faces;
}

/** Ce point de code déclenche-t-il le téléchargement de cette face ? */
export function couvre(f: Face, cp: number): boolean {
  return f.plages.some(([a, b]) => cp >= a && cp <= b);
}

/** Les points de code d'un texte que cette face servirait à afficher. */
export function pointsCouverts(f: Face, points: Iterable<number>): number[] {
  return [...points].filter((cp) => couvre(f, cp));
}
