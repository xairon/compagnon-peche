import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseGuideCoindepeche } from "./coindepeche-guides";

// Deuxième test de contrat sur charge utile réelle, sur les pages telles que
// coindepeche.fr les servait le 31/07/2026. L'utilisateur a l'accord de
// l'administrateur du site pour les guides ; l'attribution ne doit inventer ni
// nom d'auteur ni date. Les 41 guides portent tous un auteur, et c'est une
// ORGANISATION (« Coin de Pêche »), jamais une personne — c'est donc ce que
// l'app cite, sans jamais transformer ça en signature humaine.

const fixture = (n: string) =>
  readFileSync(fileURLToPath(new URL(`./__fixtures__/${n}`, import.meta.url)), "utf8");

const SANDRE = fixture("coindepeche-guide-peche-sandre-techniques.html");
const CARTE = fixture("coindepeche-guide-carte-de-peche-2026.html");
const URL_SANDRE = "https://www.coindepeche.fr/guide/peche-sandre-techniques";
const URL_CARTE = "https://www.coindepeche.fr/guide/guide-carte-de-peche-2026";

describe("parseGuideCoindepeche", () => {
  it("prend le titre que la page affiche, pas celui destiné aux moteurs", () => {
    // Le JSON-LD annonce « Carte de pêche 2026 — Prix, types et achat » ; le
    // titre visible est autre. C'est le second qu'un lecteur reconnaîtra.
    const g = parseGuideCoindepeche(CARTE, URL_CARTE);

    expect(g?.titre).toBe("Carte de pêche 2026 : prix, types et comment l'obtenir");
  });

  it("reprend le résumé que le site donne de lui-même", () => {
    const g = parseGuideCoindepeche(SANDRE, URL_SANDRE);

    expect(g?.description).toBe(
      "Guide complet pour pêcher le sandre : leurres souples, verticale, linéaire, drop shot. Stratégies par saison et conditions.",
    );
  });

  it("relève la catégorie affichée par le site, sans en inventer une", () => {
    expect(parseGuideCoindepeche(SANDRE, URL_SANDRE)?.categorie).toBe("Technique");
  });

  it("cite l'auteur tel qu'il est déclaré : une organisation, jamais une personne", () => {
    const g = parseGuideCoindepeche(SANDRE, URL_SANDRE);

    expect(g?.auteur).toBe("Coin de Pêche");
    expect(g?.auteurType).toBe("Organization");
  });

  it("garde les dates réelles de publication et de modification", () => {
    const g = parseGuideCoindepeche(CARTE, URL_CARTE);

    expect(g?.publieLe).toBe("2026-02-20");
    expect(g?.modifieLe).toBe("2026-02-20");
  });

  it("dérive le slug de l'URL, pour que la clé ne dépende pas du titre", () => {
    expect(parseGuideCoindepeche(SANDRE, URL_SANDRE)?.slug).toBe("peche-sandre-techniques");
  });

  it("n'embarque pas le corps de l'article", () => {
    const g = parseGuideCoindepeche(SANDRE, URL_SANDRE);

    // Seuls le titre et le résumé du site sont repris ; le texte reste chez lui.
    expect(Object.keys(g!).sort()).toEqual([
      "auteur",
      "auteurType",
      "categorie",
      "description",
      "modifieLe",
      "publieLe",
      "slug",
      "titre",
      "url",
    ]);
  });

  it("refuse une page qui n'est pas un guide", () => {
    expect(parseGuideCoindepeche("<html><body>rien</body></html>", URL_SANDRE)).toBeNull();
  });
});
