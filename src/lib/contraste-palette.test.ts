import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { variablesRacine, resoudreCouleur, PAIRES, evaluerPaire, variablesTheme } from "./contraste-palette";

const CSS = readFileSync(
  fileURLToPath(new URL("../styles.css", import.meta.url)),
  "utf8",
);

// ————————————————————————————————————————————————————————————————
// CE QUE CE FICHIER GARANTIT — ET CE QU'IL NE GARANTIT PAS
//
// Garanti : les paires listées dans PAIRES (contraste-palette.ts) sont relues à
// chaque exécution DANS src/styles.css. Changer `--amber` dans `:root` change
// donc le résultat du test : c'est ça, le garde-fou. Une palette retouchée qui
// repasse sous AA fait échouer la suite, avec le ratio mesuré dans le message.
//
// NON garanti, et il faut le dire clairement :
//   • le test ne balaie PAS la feuille. Il ne voit que les paires déclarées à la
//     main. Une règle ajoutée demain avec une couleur neuve passe inaperçue.
//   • il ne résout AUCUNE cascade : le fond de chaque paire est écrit par un
//     humain qui a lu le HTML. Si un écran change de fond, la paire déclarée
//     devient fausse sans que rien ne le signale.
//   • il ignore tout ce qui vit en style inline dans les .tsx (il y en a
//     beaucoup ici : couleurs de verdict, pastilles de saison, etc.).
//   • il ne mesure pas les dégradés autrement qu'en prenant leur extrémité la
//     plus défavorable, recopiée en dur dans la paire.
//   • il ne dit rien des tailles réelles à l'écran : la taille de chaque paire
//     est relevée à la main dans la règle CSS correspondante.
// ————————————————————————————————————————————————————————————————

describe("variablesRacine", () => {
  it("lit les variables de :root, commentaires compris", () => {
    const vars = variablesRacine(`
      :root {
        --paper: #fbfaf7;
        /* un commentaire au milieu */
        --brass: #b08a3e; /* accent en fin de ligne */
      }
      .x { color: var(--paper); }
    `);
    expect(vars["--paper"]).toBe("#fbfaf7");
    expect(vars["--brass"]).toBe("#b08a3e");
  });

  it("trouve dans styles.css les jetons dont dépendent les paires déclarées", () => {
    // Si quelqu'un renomme un jeton, on veut un échec bruyant ici plutôt qu'une
    // paire qui se résout silencieusement à null et ne mesure plus rien.
    const vars = variablesRacine(CSS);
    for (const nom of ["--paper", "--sand", "--amber", "--amber-bg", "--brass-ink", "--muted", "--faint"]) {
      expect(vars[nom], `jeton ${nom} absent de :root`).toBeTruthy();
    }
  });
});

describe("resoudreCouleur", () => {
  const vars = { "--amber": "#9a6a12", "--relais": "var(--amber)" };

  it("résout var(), y compris en chaîne", () => {
    expect(resoudreCouleur("var(--amber)", vars)).toBe("#9a6a12");
    expect(resoudreCouleur("var(--relais)", vars)).toBe("#9a6a12");
    expect(resoudreCouleur("#fff", vars)).toBe("#fff");
  });

  it("n'utilise le repli que si la variable est absente", () => {
    // `var(--amber, #b08a3e)` avec --amber défini vaut --amber : le repli écrit
    // dans plusieurs règles de ce dépôt est du code mort, et le test ne doit
    // surtout pas mesurer le repli à la place de la vraie couleur.
    expect(resoudreCouleur("var(--amber, #b08a3e)", vars)).toBe("#9a6a12");
    expect(resoudreCouleur("var(--inconnu, #b08a3e)", vars)).toBe("#b08a3e");
  });

  it("rend null pour une variable inconnue sans repli", () => {
    expect(resoudreCouleur("var(--inconnu)", vars)).toBeNull();
  });
});

describe("les paires réellement employées passent AA", () => {
  it("déclare au moins toutes les paires que l'audit avait pointées", () => {
    const noms = PAIRES.map((p) => p.nom);
    expect(noms).toContain("--amber sur --amber-bg");
    expect(noms).toContain("--brass-ink sur --paper");
    expect(noms).toContain("ⓘ des cellules verdict sur --card");
  });

  it.each(PAIRES.map((p) => [p.nom, p] as const))("%s", (_nom, paire) => {
    const r = evaluerPaire(CSS, paire);
    expect(
      r.ratio,
      `${paire.nom} — ${r.texte} sur ${r.fond} = ${r.ratio.toFixed(2)}:1, ` +
        `seuil ${r.seuil}:1 (${paire.ou})`,
    ).toBeGreaterThanOrEqual(r.seuil);
  });
});

/** Les noms de jetons EXPLICITEMENT redéfinis dans le bloc `:root[data-theme="dark"]`.
 *  Différent de `Object.keys(variablesTheme(css, "dark"))` : ce dernier hérite
 *  TOUJOURS de la totalité des clés de :root (la cascade ne fait jamais
 *  disparaître une clé), donc il ne peut structurellement rien manquer — un
 *  jeton oublié en sombre y garde simplement sa valeur claire, invisible à un
 *  test qui ne regarde que l'ensemble des clés. Cette fonction-ci ne regarde
 *  QUE ce que le bloc sombre déclare lui-même. */
function jetonsRedefinisEnSombre(css: string): Set<string> {
  const bloc = /:root\[data-theme="dark"\]\s*\{([\s\S]*?)\}/.exec(css);
  const noms = new Set<string>();
  if (!bloc) return noms;
  const corps = bloc[1].replace(/\/\*[\s\S]*?\*\//g, "");
  for (const decl of corps.split(";")) {
    const m = /^\s*(--[\w-]+)\s*:/.exec(decl);
    if (m) noms.add(m[1]);
  }
  return noms;
}

describe("thème sombre", () => {
  /**
   * Jetons clairs volontairement SANS équivalent sombre, avec leur raison.
   * Une exception qui ne se justifie pas se corrige ; une exception muette se
   * transforme en oubli.
   *
   * --on-accent et --on-accent-warm ne sont PAS ici : ils sont bel et bien
   * redéfinis dans le bloc sombre (voir styles.css) — ce sont des marques
   * posées sur un accent plein, qui restent claires dans les deux thèmes,
   * mais elles ont une déclaration sombre écrite, donc ce test les voit déjà.
   */
  const EXCEPTIONS_THEME: Record<string, string> = {
    "--veil-tint":
      "voile qui assombrit une photo pour que du texte s'y lise : un rôle " +
      "que le thème ne change pas, les photos ne s'inversent pas.",
    "--paper-fade":
      "dérivé de --paper-tint via var(), qui suit déjà --paper en sombre : " +
      "se résout dynamiquement à l'usage, pas besoin d'être redéclaré.",
  };

  it("chaque jeton du thème clair a son équivalent sombre", () => {
    // Le garde-fou qui attrape l'oubli de demain : quelqu'un ajoute une
    // couleur dans :root six mois après ce chantier, sans penser au sombre.
    // Sans ce test, l'app affiche une couleur claire au milieu du sombre et
    // personne ne le voit avant un utilisateur.
    const clair = Object.keys(variablesRacine(CSS));
    const sombre = jetonsRedefinisEnSombre(CSS);
    const manquants = clair.filter((j) => !sombre.has(j) && !(j in EXCEPTIONS_THEME));
    expect(manquants).toEqual([]);

    // Les exceptions ne doivent pas devenir des faux positifs silencieux : si
    // l'un de ces jetons est un jour redéfini en sombre, l'exception est
    // caduque et doit être retirée d'ici.
    for (const jeton of Object.keys(EXCEPTIONS_THEME)) {
      expect(sombre.has(jeton), `${jeton} est maintenant redéfini en sombre — retirer l'exception`).toBe(false);
    }
  });

  it("les 63 paires passent leur seuil dans les deux thèmes", () => {
    for (const theme of ["light", "dark"] as const) {
      const vars = variablesTheme(CSS, theme);
      for (const paire of PAIRES) {
        const { ratio, seuil } = evaluerPaire(CSS, paire, vars);
        expect(
          ratio,
          `[${theme}] ${paire.nom} (${paire.ou}) : ${ratio.toFixed(2)}:1 < ${seuil}:1`,
        ).toBeGreaterThanOrEqual(seuil);
      }
    }
  });
});
