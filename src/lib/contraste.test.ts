import { describe, it, expect } from "vitest";
import {
  lireCouleur,
  luminanceRelative,
  composer,
  ratioContraste,
  seuilRequis,
} from "./contraste";

// Le ratio de contraste de WCAG 2.x : (L1 + 0,05) / (L2 + 0,05), où L est la
// luminance relative calculée sur les canaux sRGB linéarisés.
//
// Les valeurs attendues ci-dessous ne sont pas reprises d'un énoncé : elles sont
// soit fixées par la norme (noir sur blanc = 21, une couleur sur elle-même = 1),
// soit des repères publiés (#767676 est LA couleur grise que tout le monde cite
// comme « la plus claire qui passe AA sur blanc » — 4,54:1).
//
// Ce module ne connaît que des couleurs opaques ou semi-transparentes composées
// sur un fond connu. Il ne sait pas lire une feuille de style, ni deviner quel
// fond hérite un élément : c'est le travail (et la limite) de contraste-palette.

describe("lireCouleur", () => {
  it("lit les trois écritures hexadécimales du dépôt", () => {
    expect(lireCouleur("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(lireCouleur("#1d6e42")).toEqual({ r: 29, g: 110, b: 66, a: 1 });
    expect(lireCouleur("  #1D6E42  ")).toEqual({ r: 29, g: 110, b: 66, a: 1 });
  });

  it("lit l'alpha, en notation hexadécimale comme en rgba()", () => {
    expect(lireCouleur("#00000080")).toEqual({ r: 0, g: 0, b: 0, a: 128 / 255 });
    expect(lireCouleur("rgba(251, 250, 247, 0.92)")).toEqual({
      r: 251,
      g: 250,
      b: 247,
      a: 0.92,
    });
    expect(lireCouleur("rgb(15 31 22)")).toEqual({ r: 15, g: 31, b: 22, a: 1 });
  });

  it("rend null plutôt que de deviner, quand la valeur n'est pas une couleur", () => {
    // « transparent », un dégradé, une variable non résolue : trois cas où
    // supposer une couleur ferait dire au test quelque chose de faux.
    expect(lireCouleur("transparent")).toBeNull();
    expect(lireCouleur("linear-gradient(180deg, #f3f8fa, #eef4f6)")).toBeNull();
    expect(lireCouleur("var(--amber)")).toBeNull();
    expect(lireCouleur("")).toBeNull();
  });
});

describe("luminanceRelative", () => {
  it("vaut 0 pour le noir et 1 pour le blanc", () => {
    expect(luminanceRelative({ r: 0, g: 0, b: 0, a: 1 })).toBeCloseTo(0, 10);
    expect(luminanceRelative({ r: 255, g: 255, b: 255, a: 1 })).toBeCloseTo(1, 10);
  });

  it("applique bien le segment linéaire sous 0,04045 (canal 8/255)", () => {
    // 8/255 = 0,03137 < 0,04045 : la norme veut c/12,92, pas la puissance 2,4.
    // Avec la mauvaise branche on obtiendrait 0,00224 au lieu de 0,00243.
    const l = luminanceRelative({ r: 8, g: 8, b: 8, a: 1 });
    expect(l).toBeCloseTo(8 / 255 / 12.92, 10);
  });
});

describe("ratioContraste", () => {
  it("donne 21 pour noir/blanc et 1 pour une couleur sur elle-même", () => {
    expect(ratioContraste("#000000", "#ffffff")).toBeCloseTo(21, 10);
    expect(ratioContraste("#ffffff", "#000000")).toBeCloseTo(21, 10);
    expect(ratioContraste("#1d6e42", "#1d6e42")).toBeCloseTo(1, 10);
  });

  it("retrouve le repère publié #767676 sur blanc = 4,54:1", () => {
    expect(ratioContraste("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });

  it("compose le texte semi-transparent sur son fond avant de mesurer", () => {
    // Du noir à 50 % sur du blanc, c'est du gris #808080 (127,5 exactement) :
    // sans composition on mesurerait 21:1 pour un texte à peine visible.
    const r = ratioContraste("rgba(0, 0, 0, 0.5)", "#ffffff");
    expect(r).toBeCloseTo(ratioContraste("#808080", "#ffffff"), 1);
    expect(r).toBeLessThan(21);
  });

  it("refuse de rendre un ratio quand une des deux couleurs est illisible", () => {
    expect(() => ratioContraste("transparent", "#ffffff")).toThrow();
  });
});

describe("composer", () => {
  it("rend le fond quand le dessus est totalement transparent", () => {
    const fond = { r: 251, g: 250, b: 247, a: 1 };
    expect(composer({ r: 0, g: 0, b: 0, a: 0 }, fond)).toEqual(fond);
  });

  it("rend le dessus quand il est opaque", () => {
    const dessus = { r: 29, g: 110, b: 66, a: 1 };
    expect(composer(dessus, { r: 255, g: 255, b: 255, a: 1 })).toEqual(dessus);
  });
});

describe("seuilRequis", () => {
  // WCAG 1.4.3 : « grand texte » = 18 pt (24 px) ou 14 pt gras (18,66 px).
  // C'est le piège classique : un 14 px en gras n'est PAS du grand texte, et
  // plusieurs libellés de cette app sont exactement dans ce cas.
  it("exige 4,5:1 pour du texte normal", () => {
    expect(seuilRequis({ taillePx: 13 })).toBe(4.5);
    expect(seuilRequis({ taillePx: 14, gras: true })).toBe(4.5);
    expect(seuilRequis({ taillePx: 18, gras: true })).toBe(4.5);
  });

  it("n'exige 3:1 qu'à partir de 24 px, ou 18,66 px en gras", () => {
    expect(seuilRequis({ taillePx: 24 })).toBe(3);
    expect(seuilRequis({ taillePx: 18.66, gras: true })).toBe(3);
    expect(seuilRequis({ taillePx: 20 })).toBe(4.5);
  });

  it("exige 3:1 pour un élément non textuel (1.4.11)", () => {
    expect(seuilRequis({ taillePx: 17, nonTexte: true })).toBe(3);
  });
});
