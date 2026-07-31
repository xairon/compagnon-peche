/**
 * Ratio de contraste WCAG 2.x, calculé — jamais estimé à l'œil.
 *
 * Ces textes se lisent en plein soleil au bord de l'eau : le contraste n'est pas
 * une case à cocher, c'est la différence entre une info lue et une info perdue.
 *
 * Volontairement limité : ce module ne connaît que des couleurs. Il ne lit pas
 * une feuille de style, ne résout aucune cascade et ne devine aucun fond hérité.
 * Déclarer les paires réellement employées est le travail de contraste-palette,
 * et cette séparation est ce qui empêche le test de faire semblant de tout voir.
 */

export type Couleur = { r: number; g: number; b: number; a: number };

const NOMMEES: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
};

/**
 * Lit `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()` et deux noms
 * CSS. Rend `null` pour tout le reste — un dégradé, `transparent`, une `var()`
 * non résolue : autant de valeurs dont on ne peut RIEN conclure. Rendre null
 * force l'appelant à traiter le cas au lieu de mesurer une couleur inventée.
 */
export function lireCouleur(valeur: string): Couleur | null {
  if (typeof valeur !== "string") return null;
  const v = valeur.trim().toLowerCase();
  if (!v) return null;
  if (NOMMEES[v]) return lireCouleur(NOMMEES[v]);

  const hex = /^#([0-9a-f]{3,8})$/.exec(v);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) {
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    }
    if (h.length !== 6 && h.length !== 8) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }

  const fn = /^rgba?\(([^)]+)\)$/.exec(v);
  if (fn) {
    // Les deux syntaxes cohabitent en CSS moderne : `rgb(1, 2, 3)` et
    // `rgb(1 2 3 / 50%)`. On accepte les deux séparateurs.
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3 || parts.length > 4) return null;
    const nb = parts.map((p) =>
      p.endsWith("%") ? Number(p.slice(0, -1)) / 100 : Number(p),
    );
    if (nb.some((n) => !Number.isFinite(n))) return null;
    return {
      r: parts[0].endsWith("%") ? nb[0] * 255 : nb[0],
      g: parts[1].endsWith("%") ? nb[1] * 255 : nb[1],
      b: parts[2].endsWith("%") ? nb[2] * 255 : nb[2],
      a: parts.length === 4 ? nb[3] : 1,
    };
  }

  return null;
}

/** Linéarisation sRGB d'un canal 0–255 (WCAG 2.x, §relative luminance). */
function canalLineaire(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Luminance relative 0–1. L'alpha est ignoré : composer d'abord si besoin. */
export function luminanceRelative(c: Couleur): number {
  return (
    0.2126 * canalLineaire(c.r) +
    0.7152 * canalLineaire(c.g) +
    0.0722 * canalLineaire(c.b)
  );
}

/** Composition « source-over » d'une couleur semi-transparente sur un fond opaque. */
export function composer(dessus: Couleur, dessous: Couleur): Couleur {
  if (dessus.a >= 1) return { ...dessus };
  if (dessus.a <= 0) return { ...dessous };
  const m = (h: number, b: number) => h * dessus.a + b * (1 - dessus.a);
  return {
    r: m(dessus.r, dessous.r),
    g: m(dessus.g, dessous.g),
    b: m(dessus.b, dessous.b),
    a: 1,
  };
}

/**
 * Ratio entre un texte et son fond. Le fond doit être opaque : s'il ne l'est
 * pas, on ne sait pas ce qu'il y a dessous, et le ratio serait une fiction.
 */
export function ratioContraste(texte: string, fond: string): number {
  const t = lireCouleur(texte);
  const f = lireCouleur(fond);
  if (!t) throw new Error(`couleur de texte illisible : ${JSON.stringify(texte)}`);
  if (!f) throw new Error(`couleur de fond illisible : ${JSON.stringify(fond)}`);
  if (f.a < 1) {
    throw new Error(
      `fond semi-transparent (${fond}) : le ratio dépend de ce qu'il y a dessous`,
    );
  }
  const l1 = luminanceRelative(composer(t, f));
  const l2 = luminanceRelative(f);
  const [haut, bas] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (haut + 0.05) / (bas + 0.05);
}

/**
 * Seuil AA applicable. WCAG 1.4.3 : 4,5:1 pour du texte, 3:1 seulement pour du
 * « grand texte » — 18 pt (24 px), ou 14 pt gras (18,66 px). Un 14 px gras n'est
 * PAS du grand texte, et plusieurs libellés de l'app tombent exactement là.
 * 1.4.11 : 3:1 pour un élément non textuel porteur d'information (chevron,
 * bordure de champ, pastille d'état).
 */
export function seuilRequis(o: {
  taillePx: number;
  gras?: boolean;
  nonTexte?: boolean;
}): number {
  if (o.nonTexte) return 3;
  const grand = o.taillePx >= 24 || (!!o.gras && o.taillePx >= 18.66);
  return grand ? 3 : 4.5;
}
