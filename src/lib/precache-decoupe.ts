/**
 * Où passe la coupure entre ce qui bloque l'installation et ce qui arrive après.
 *
 * Le précache pesait **7 860 Kio en 246 entrées** (mesuré le 31/07/2026 sur
 * `npm run build`, dépouillement de `dist/sw.js`). Workbox les installe **une
 * par une** — `PrecacheController.install()` est une boucle `for … await` — et
 * le service worker ne s'active qu'une fois la dernière arrivée. Tant qu'elle
 * n'est pas là, le hors-ligne vaut **zéro**, quel que soit le chemin déjà
 * parcouru. Ce qui a été téléchargé n'est pas perdu (`PrecacheStrategy._handle`
 * commence par un `cacheMatch`, donc la reprise ne retélécharge pas), mais ça ne
 * sert à rien tant que le compte n'y est pas.
 *
 * Composition mesurée :
 *
 *   assets/species-sm  2 514 Kio  154 f
 *   assets (JS/CSS)    2 250 Kio   12 f
 *   assets/gear        1 113 Kio   15 f
 *   assets/crayfish      684 Kio    6 f
 *   assets/fonts         431 Kio    7 f
 *   assets/recipes       356 Kio    4 f
 *   assets/techniques    197 Kio    2 f
 *   assets/knots         145 Kio   36 f
 *   assets/knots-steps   123 Kio    4 f
 *   (racine)              47 Kio    6 f
 *
 * La coupure retenue :
 *
 * - **NOYAU** (précache, bloque l'activation) — code, styles, polices, icônes,
 *   manifeste, HTML : 25 entrées, 2 728 Kio. C'est tout ce qu'il faut pour que
 *   l'app démarre et rende un verdict, parce qu'un verdict est du texte :
 *   espèce, taille, maille, période, département. Aucune photo n'y entre.
 * - **RÉSERVE** (hors précache, arrive derrière) — les 221 illustrations,
 *   5 132 Kio. Elles restent disponibles hors ligne : `lib/reserve-hors-ligne.ts`
 *   les télécharge après l'activation, dans le cache que la route CacheFirst du
 *   service worker interroge. Ce qui change, c'est qu'elles ne retiennent plus
 *   l'activation en otage.
 *
 * Ce fichier est importé par `vite.config.ts` : il doit rester listé dans
 * `tsconfig.node.json`, comme `csp.ts` et `sw-delais.ts`, sinon le build casse.
 * Il n'importe rien lui-même, exprès — la dérivation des URL réelles vit dans
 * `reserve-hors-ligne.ts`, qui a besoin du catalogue de médias.
 */

/**
 * Les dossiers d'illustrations sortis du précache bloquant, **par ordre
 * d'urgence**. L'ordre n'est pas décoratif : c'est lui qui décide de ce qui
 * manque si la préparation est coupée en route.
 *
 * D'abord l'identification — c'est elle qui dit si le poisson dans l'épuisette
 * est une espèce dont la remise à l'eau vivante est interdite (R432-5), et elle
 * se fait au bord de l'eau, là où il n'y a pas de réseau. Ensuite les nœuds, qui
 * se refont sur place. Puis les appâts. En dernier les recettes et les
 * techniques de cuisine, qui se regardent dans une cuisine, avec du réseau.
 */
export const PREFIXES_RESERVE: readonly string[] = [
  "assets/species-sm/",
  "assets/crayfish/",
  "assets/knots/",
  "assets/knots-steps/",
  "assets/gear/",
  "assets/recipes/",
  "assets/techniques/",
];

/**
 * Nom du cache que l'app remplit et que le service worker interroge. Les deux
 * doivent le nommer pareil, sinon l'app remplit un cache que personne ne lit.
 */
export const CACHE_RESERVE = "reserve-hors-ligne";

/**
 * Les polices que le précache n'a pas à descendre — 71,5 Kio sur les 431 Kio
 * de `assets/fonts`.
 *
 * Décidé sur la plage `unicode-range` déclarée dans `src/fonts.css`, jamais
 * sur le nom du fichier : le nom ment, `lib/polices.ts` explique pourquoi.
 * Ces trois-là sont déclarées avec la plage VIETNAMIENNE (U+1EA0-1EF9, U+20AB,
 * Ă/Đ/Ơ/Ư et les marques combinantes). `polices.test.ts` confronte chaque
 * plage au texte que l'app affiche vraiment — analyseur TypeScript, chaînes et
 * texte JSX seulement — et n'y trouve aucun de ces points de code.
 *
 * Elles restent LIVRÉES dans `dist/` et déclarées dans `fonts.css` : rien
 * n'est retiré à l'app, seule l'installation bloquante cesse de les descendre.
 * Si un jour un texte vietnamien apparaît en ligne, le navigateur ira les
 * chercher comme n'importe quel autre asset.
 *
 * Le sous-ensemble latin-ext, lui, RESTE au précache : c'est lui qui porte
 * `ᵉ` (U+1D49) et `ʳ` (U+02B3), donc « 2ᵉ catégorie » et « 1ʳᵉ catégorie »,
 * qui sont partout dans la réglementation. Le retirer au motif qu'il « sert
 * rarement » aurait cassé exactement le vocabulaire le plus fréquent.
 */
export const POLICES_HORS_PRECACHE: readonly string[] = [
  "ss4-italic-400-latin-ext.woff2",
  "ss4-normal-600-latin-ext.woff2",
  "ss4-normal-700-latin-ext.woff2",
];

/**
 * `workbox.globIgnores`. Dérivé des préfixes plutôt que réécrit à la main : un
 * dossier ajouté à la réserve mais resté précaché serait téléchargé deux fois.
 *
 * `assets/species/` ne vient pas de la réserve : les photos pleine taille
 * (14,5 Mio) étaient déjà hors précache avant cette découpe et ont leur propre
 * route CacheFirst, alimentée à l'ouverture d'une fiche.
 */
export const GLOB_IGNORES_PRECACHE: readonly string[] = [
  "**/assets/species/**",
  ...PREFIXES_RESERVE.map((p) => `**/${p}**`),
  // Les polices dont aucun caractère de l'app ne déclenche le téléchargement.
  // Contrairement à la réserve, celles-ci ne sont PAS reprises derrière : rien
  // ne les demandera jamais hors ligne, il n'y a donc rien à rendre disponible.
  ...POLICES_HORS_PRECACHE.map((f) => `**/assets/fonts/${f}`),
];

const echappe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Motif de la route runtime du service worker. Ancré sur `/<préfixe>` pour ne
 * pas attraper `assets/species/` avec `assets/species-sm/`.
 */
export const MOTIF_RESERVE = new RegExp(`/(?:${PREFIXES_RESERVE.map(echappe).join("|")})[^/]+$`);

/** Ce chemin (relatif, `./`-préfixé ou URL absolue) appartient-il à la réserve ? */
export function estDansLaReserve(url: string): boolean {
  return MOTIF_RESERVE.test(url.startsWith("/") ? url : `/${url.replace(/^\.\//, "")}`);
}
