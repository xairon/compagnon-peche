import { describe, it, expect } from "vitest";
import { promesseHorsLigne } from "./promesse-hors-ligne";

// Le précache est passé de 250 entrées / 7860 Kio à 29 / 2737 Kio : le noyau
// s'installe seul, les 221 illustrations arrivent ensuite en réserve. C'est un
// vrai gain — un install interrompu en 4G laissait auparavant une app qui
// promettait le hors-ligne devant des écrans vides.
//
// Mais la phrase affichée, elle, n'a pas bougé : « Hors-ligne — toutes les
// fiches restent disponibles », sans condition. Elle était vraie par accident
// (sans précache complet, l'app ne démarrait pas du tout). Elle ne l'est plus
// pendant que la réserve se remplit, et c'est exactement le défaut que tout ce
// dépôt traque : promettre une capacité qu'on n'a pas encore.
//
// Ce qui reste vrai dans TOUS les cas : le texte des fiches et les données
// réglementaires sont dans le noyau. Seules les photos peuvent manquer.

const R = (p: number, total = 221) => ({
  total,
  presents: p,
  echecs: 0,
  enCours: p < total,
  complete: p >= total,
});

describe("promesseHorsLigne", () => {
  it("promet tout quand la réserve est complète", () => {
    const p = promesseHorsLigne(R(221));

    expect(p.complet).toBe(true);
    expect(p.texte).toMatch(/toutes les fiches/i);
  });

  it("ne promet pas les photos tant que la réserve se remplit", () => {
    const p = promesseHorsLigne(R(40));

    expect(p.complet).toBe(false);
    expect(p.texte).not.toMatch(/toutes les fiches/i);
  });

  it("dit ce qui est garanti même à réserve vide — le texte et la réglementation", () => {
    // C'est le point : l'app ne doit pas passer de « tout marche » à « rien ne
    // marche ». Le noyau porte les fiches et les arrêtés, et ça se dit.
    const p = promesseHorsLigne(R(0));

    expect(p.texte).toMatch(/réglementation|règles/i);
  });

  it("chiffre l'avancement plutôt que de laisser deviner", () => {
    expect(promesseHorsLigne(R(40)).texte).toMatch(/40/);
    expect(promesseHorsLigne(R(40)).texte).toMatch(/221/);
  });

  it("ne parle pas de réserve quand il n'y a rien à télécharger", () => {
    // total = 0 : la liste est vide (build sans illustrations). Annoncer
    // « 0 sur 0 » ferait croire à un téléchargement en panne.
    const p = promesseHorsLigne(R(0, 0));

    expect(p.complet).toBe(true);
    expect(p.texte).not.toMatch(/\d/);
  });

  it("ne présente pas un échec comme un téléchargement en cours", () => {
    // Des photos qui ont échoué ne reviendront pas toutes seules : le dire
    // « en cours » ferait attendre pour rien.
    const p = promesseHorsLigne({
      total: 221,
      presents: 200,
      echecs: 21,
      enCours: false,
      complete: false,
    });

    expect(p.texte).not.toMatch(/en cours|téléchargement/i);
  });
});
