import { describe, it, expect } from "vitest";
import { speciesStatus, isPlainlyOpen } from "./statut";
import { SPECIES } from "../data/species";

const sp = (id: string) => SPECIES.find((s) => s.id === id)!;

/**
 * `season(sp).open` répond « y a-t-il une fermeture nationale », pas « puis-je
 * garder ce poisson ». Trois écrans le lisaient comme un feu vert : la grille
 * d'espèces affichait une pastille verte « ● Ouverte » pour le saumon
 * atlantique, sous moratoire sur la plupart des bassins, pendant que le
 * parcours disait « vérifiez l'arrêté ».
 */
describe("speciesStatus", () => {
  it("le saumon atlantique n'est jamais présenté comme ouvert", () => {
    const st = speciesStatus(sp("saumon-atlantique"));
    expect(st.kind).toBe("speciale");
    expect(st.cls).not.toBe("good");
  });

  it("aucun migrateur au régime spécial n'est vert", () => {
    const verts = SPECIES.filter((s) => s.season === "special" && speciesStatus(s).cls === "good");
    expect(verts.map((s) => s.id)).toEqual([]);
  });

  it("une espèce protégée reste « à relâcher »", () => {
    expect(speciesStatus(sp("esturgeon-europeen")).kind).toBe("protegee");
  });

  // R432-5 interdit de les remettre vivantes : dire « à relâcher » serait
  // exactement l'inverse de la règle.
  it("une invasive dit « ne pas relâcher », pas « à relâcher »", () => {
    const st = speciesStatus(sp("perche-soleil"));
    expect(st.kind).toBe("invasive");
    expect(st.label.toLowerCase()).toContain("ne pas relâcher");
  });

  // Les gobies ponto-caspiens sont invasive:true, mais leur base légale
  // (L432-10) interdit de les DÉPLACER, pas de les relâcher sur place — c'est
  // même explicitement autorisé, l'espèce y étant déjà établie. Réutiliser le
  // libellé R432-5 leur ferait dire l'inverse de leur propre règle.
  it("un gobie ponto-caspien (L432-10) dit « ne pas déplacer », pas « ne pas relâcher »", () => {
    const st = speciesStatus(sp("gobie-a-taches-noires"));
    expect(st.kind).toBe("invasive");
    expect(st.label.toLowerCase()).toContain("ne pas déplacer");
    expect(st.label.toLowerCase()).not.toContain("relâcher");
  });

  it("une espèce ordinaire en saison reste verte", () => {
    const st = speciesStatus(sp("sandre"), new Date("2026-07-15"));
    expect(st.kind).toBe("ouverte");
    expect(st.cls).toBe("good");
  });

  it("isPlainlyOpen exclut protégées, invasives et régimes spéciaux", () => {
    expect(isPlainlyOpen(sp("saumon-atlantique"))).toBe(false);
    expect(isPlainlyOpen(sp("esturgeon-europeen"))).toBe(false);
    expect(isPlainlyOpen(sp("perche-soleil"))).toBe(false);
    expect(isPlainlyOpen(sp("anguille"))).toBe(false);
  });
});
