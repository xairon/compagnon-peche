import type { ReactElement } from "react";

/**
 * Les schémas d'assemblage des montages que Wikimedia Commons ne couvre pas.
 *
 * Un montage n'est pas une suite de gestes : c'est un ordre de composants le
 * long de la ligne. Il n'y a pas de « geste 2 » à photographier, il y a un plan
 * légendé — d'où cette forme, et non une séquence dégradée. C'est aussi la
 * raison pour laquelle ces montages n'apparaissent pas dans `KNOT_STEPS`.
 *
 * SVG inline et non fichier sous `public/` : un `<img src="…svg">` est un
 * document isolé qui n'hérite d'aucune variable CSS de la page, donc qui ne
 * suivrait pas le thème sombre. Inline, `stroke="var(--body)"` se résout dans
 * le contexte du document.
 *
 * Le langage est commun à tous et ne se négocie pas fiche par fiche : même
 * boîte 200 × 320, surface en haut, fond hachuré en bas, corps de ligne épais,
 * bas de ligne fin, mêmes primitives de composants, mêmes tailles de légende.
 * C'est cette constance qui fait de plusieurs dessins un ensemble.
 *
 * Ce fichier n'exporte QUE des composants ; le registre `SCHEMAS`, qui n'en est
 * pas un, vit dans `schemas-montage.ts` — même partage que `media-helpers.ts`
 * face à `Media.tsx`, et pour la même raison (react-refresh/only-export-components).
 */

const BOITE = "0 0 200 320";

/** Ligne d'eau et fond : le repère vertical commun à tous les schémas. */
function Eau() {
  return (
    <>
      <path
        d="M0 18q11-7 22 0t22 0t22 0t22 0t22 0t22 0t22 0t22 0t24 0"
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth="1.5"
      />
      <text x="3" y="12" className="schema-legende">
        Surface
      </text>
      <rect x="0" y="298" width="200" height="22" fill="var(--sand)" />
      <path
        d="M0 298h200M2 320l11-15M22 320l11-15M42 320l11-15M62 320l11-15M82 320l11-15M102 320l11-15M122 320l11-15M142 320l11-15M162 320l11-15M182 320l11-15"
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth="1.1"
      />
      <text x="3" y="294" className="schema-legende">
        Fond
      </text>
    </>
  );
}

/** Pastille numérotée : le renvoi vers l'étape écrite du même numéro. */
function Repere({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g data-repere={n}>
      <circle cx={x} cy={y} r="8.5" fill="var(--green)" />
      <text x={x} y={y + 3.4} textAnchor="middle" className="schema-repere">
        {n}
      </text>
    </g>
  );
}

function Plomb({ x, y }: { x: number; y: number }) {
  return <ellipse cx={x} cy={y} rx="7" ry="10" fill="var(--body)" />;
}

/** Hameçon simple, hampe vers le haut, pointe et ardillon vers la gauche. */
function Hamecon({ x, y }: { x: number; y: number }) {
  return (
    <g fill="none" stroke="var(--body)" strokeWidth="2" strokeLinecap="round">
      <path d={`M${x} ${y}v12a7 7 0 1 1-11-4`} />
      <path d={`M${x - 11} ${y + 8}l3 4l4-1`} />
    </g>
  );
}

export function PaterNoster(): ReactElement {
  return (
    <svg viewBox={BOITE} className="schema-svg" role="img" aria-labelledby="schema-paternoster">
      <title id="schema-paternoster">
        Pater-noster : corps de ligne vertical, potence à mi-hauteur portant le bas de ligne
        esché, et plomb posé au fond sous la potence.
      </title>
      <Eau />

      {/* Corps de ligne, de la surface au plomb. */}
      <line x1="100" y1="20" x2="100" y2="278" stroke="var(--body)" strokeWidth="2.4" />
      <text x="92" y="76" textAnchor="end" className="schema-legende">
        Corps de ligne
      </text>

      {/* La potence : une boucle de chirurgien faite sur le corps de ligne. */}
      <circle cx="100" cy="140" r="5.5" fill="none" stroke="var(--body)" strokeWidth="2.4" />
      <text x="88" y="143" textAnchor="end" className="schema-legende">
        Potence
      </text>
      <Repere x={122} y={132} n={1} />

      {/* Bas de ligne : plus fin, tenu à l'écart du corps de ligne. */}
      <path d="M105 144q40 12 62 44" fill="none" stroke="var(--muted)" strokeWidth="1.4" />
      <Repere x={128} y={172} n={4} />
      <Hamecon x={169} y={190} />
      <Repere x={172} y={222} n={3} />
      <text x="196" y="243" textAnchor="end" className="schema-legende">
        Bas de ligne
      </text>

      <Plomb x={100} y={280} />
      <Repere x={76} y={280} n={2} />
      <text x="114" y="284" className="schema-legende">
        Plomb
      </text>
    </svg>
  );
}
