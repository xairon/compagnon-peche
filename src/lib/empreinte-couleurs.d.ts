// Déclaration de types pour scripts/empreinte-couleurs.mjs.
//
// Ce fichier .mjs est à la fois un script CLI (exécuté directement pour
// régénérer le fixture) et un module importé par
// src/lib/empreinte-couleurs.test.ts. Pour que `tsc` type-checke cet import
// sans avaler tout `src` en JS, on déclare ici uniquement les exports
// utilisés, plutôt que d'activer `allowJs` globalement dans tsconfig.json
// (ce qui ouvrirait la résolution de type à n'importe quel futur import
// .js/.mjs, bien au-delà du besoin).
//
// Placé dans src/lib/ (et non scripts/) parce que seul le glob "include":
// ["src"] de tsconfig.json — et la liste explicite de tsconfig.node.json —
// sont vus par TypeScript ; un .d.ts posé dans scripts/ serait ignoré.
declare module "*/empreinte-couleurs.mjs" {
  /** Retire les commentaires CSS (ils contiennent des hex d'explication). */
  export function sansCommentaires(css: string): string;

  /** Les variables de :root, commentaires déjà retirés. */
  export function variablesRacine(css: string): Record<string, string>;

  /** Résout var(--x) et var(--x, repli), en chaîne. */
  export function resoudreVars(
    valeur: string,
    vars: Record<string, string>,
    profondeur?: number,
  ): string;

  /** #abc -> #aabbcc ; majuscules -> minuscules. */
  export function normaliser(v: string): string;

  /** Liste triée « sélecteur|propriété|valeur » des déclarations colorées. */
  export function empreinte(cssBrut: string): string;
}
