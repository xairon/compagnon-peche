// Empreinte des couleurs EFFECTIVES de src/styles.css.
//
// À quoi ça sert : le chantier « thème sombre » remplace ~582 couleurs écrites
// en dur par des jetons. Ce remplacement ne doit RIEN changer visuellement, et
// personne ne peut le vérifier à l'œil sur 6 567 lignes. Le script résout les
// var() depuis :root et sort la liste triée des couleurs réellement appliquées.
// Tokeniser change l'écriture, pas la couleur : l'empreinte doit rester
// identique. Si elle bouge, c'est un bug, ou une décision à assumer par écrit.
//
// Les déclarations de jeton elles-mêmes (propriété commençant par `--`, telles
// que trouvées dans :root) sont exclues du calcul : ce ne sont pas des
// couleurs appliquées à l'écran, seulement des définitions. Leur effet est
// déjà mesuré chez leurs consommateurs, où le var() est résolu. Les compter
// ferait bouger l'empreinte à la simple DÉCLARATION d'un nouveau jeton, sans
// qu'aucun pixel ne change — ce que ce script n'a pas vocation à détecter.
// Changer la VALEUR d'un jeton reste détecté : tous ses consommateurs
// résolvent alors vers la nouvelle valeur et bougent dans l'empreinte.
//
// C'est un multiensemble TRIÉ, pas une liste ordonnée : déplacer une règle ne
// doit pas faire échouer le test, seule une valeur qui change doit le faire.
//
// Angle mort assumé : un jeton déclaré dans :root mais jamais référencé par
// var(--x) nulle part (ni dans styles.css, ni dans les styles inline des
// .tsx) est invisible ICI, puisque cette empreinte ne mesure que ce que var()
// résout chez ses consommateurs — pas ce qui est déclaré. Sa valeur peut donc
// changer sans faire bouger une seule ligne de cette empreinte. C'est le test
// « jetons de :root » dans src/lib/empreinte-couleurs.test.ts qui couvre ce
// trou-là, en listant nommément tout jeton sans consommateur.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CSS = fileURLToPath(new URL("../src/styles.css", import.meta.url));
const FIXTURE = fileURLToPath(
  new URL("../src/lib/__fixtures__/empreinte-couleurs.txt", import.meta.url),
);

/** Retire les commentaires CSS (ils contiennent des hex d'explication). */
export function sansCommentaires(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Les variables de :root, commentaires déjà retirés. */
export function variablesRacine(css) {
  const vars = {};
  const bloc = /:root\s*\{([\s\S]*?)\}/.exec(css);
  if (!bloc) return vars;
  for (const decl of bloc[1].split(";")) {
    const m = /^\s*(--[\w-]+)\s*:\s*([\s\S]+)$/.exec(decl);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

/** Résout var(--x) et var(--x, repli), en chaîne. */
export function resoudreVars(valeur, vars, profondeur = 0) {
  if (profondeur > 10) return valeur;
  return valeur.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g, (tout, nom, repli) => {
    const v = vars[nom];
    if (v === undefined) return repli !== undefined ? repli.trim() : tout;
    return resoudreVars(v, vars, profondeur + 1);
  });
}

/** #abc -> #aabbcc ; majuscules -> minuscules. Sinon deux écritures de la
 *  même couleur compteraient comme deux couleurs différentes. */
export function normaliser(v) {
  return v.replace(/#[0-9a-fA-F]{3,8}\b/g, (h) => {
    let c = h.slice(1).toLowerCase();
    if (c.length === 3 || c.length === 4) c = c.split("").map((x) => x + x).join("");
    return "#" + c;
  });
}

const COULEUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/;

/** Liste triée « sélecteur|propriété|valeur » des déclarations colorées. */
export function empreinte(cssBrut) {
  const css = sansCommentaires(cssBrut);
  const vars = variablesRacine(css);
  const lignes = [];
  // Découpage volontairement simple : on ne construit pas un AST, on veut une
  // empreinte STABLE, pas un parseur CSS correct. Les @media et @supports sont
  // conservés comme préfixe de contexte pour que deux règles homonymes dans
  // deux media queries ne se confondent pas.
  let contexte = [];
  let tampon = "";
  for (const ch of css) {
    if (ch === "{") {
      const tete = tampon.trim().replace(/\s+/g, " ");
      contexte.push(tete);
      tampon = "";
    } else if (ch === "}") {
      const corps = tampon;
      const chemin = contexte.join(" >> ");
      for (const decl of corps.split(";")) {
        const m = /^\s*([\w-]+)\s*:\s*([\s\S]+)$/.exec(decl);
        if (!m) continue;
        // Une déclaration de jeton (--x: ...) n'est pas une couleur appliquée,
        // voir le commentaire d'en-tête : on ne mesure que ses consommateurs.
        if (m[1].startsWith("--")) continue;
        const valeur = normaliser(resoudreVars(m[2].trim(), vars));
        if (COULEUR.test(valeur)) lignes.push(`${chemin}|${m[1]}|${valeur}`);
      }
      contexte.pop();
      tampon = "";
    } else {
      tampon += ch;
    }
  }
  return lignes.sort().join("\n") + "\n";
}

// Partie CLI. Elle est gardée parce que ce fichier est AUSSI importé par
// src/lib/empreinte-couleurs.test.ts : sans cette garde, importer le module
// lirait la feuille et écrirait sur stdout à chaque exécution des tests.
// `process.argv[1]` est le fichier lancé ; sous vitest, ce n'est pas celui-ci.
if (process.argv[1] && process.argv[1].endsWith("empreinte-couleurs.mjs")) {
  const sortie = empreinte(readFileSync(CSS, "utf8"));
  if (process.argv.includes("--ecrire")) {
    writeFileSync(FIXTURE, sortie);
    console.error(`empreinte écrite : ${sortie.split("\n").length - 1} déclarations`);
  } else {
    process.stdout.write(sortie);
  }
}
