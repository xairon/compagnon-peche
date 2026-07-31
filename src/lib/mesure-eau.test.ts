import { describe, it, expect } from "vitest";
import { descriptionMesure } from "./mesure-eau";

// Une mesure d'eau se lit avec trois choses : où, sur quoi, à quelle distance.
// Le « sur quoi » manquait, et c'est lui qui aurait fait voir d'un coup d'œil
// qu'une température venait du Cher alors qu'on pêche la Loire.

describe("descriptionMesure", () => {
  it("donne la station, son cours d'eau et sa distance", () => {
    const d = descriptionMesure({ station: "MUIDES", cours: "la Loire", dist: 17.2 });

    expect(d).toBe("MUIDES · la Loire · 17,2 km");
  });

  it("ne répète pas le cours d'eau que le nom de station porte déjà", () => {
    // « LA CISSE A AVERDON · la Cisse » n'apprend rien et double la ligne.
    // Rapprochement de surface, assumé : il ne décide de rien, il met en forme.
    const d = descriptionMesure({ station: "LA CISSE A AVERDON", cours: "la Cisse", dist: 3.4 });

    expect(d).toBe("LA CISSE A AVERDON · 3,4 km");
  });

  it("se tait sur le cours d'eau quand la source ne le publie pas", () => {
    // analyse_pc n'a aucun champ de rattachement. Ne rien écrire, plutôt
    // qu'un « cours d'eau inconnu » qui se lirait comme une anomalie.
    const d = descriptionMesure({ station: "STATION X", cours: "", dist: 5 });

    expect(d).toBe("STATION X · 5,0 km");
  });

  it("reste lisible quand la station elle-même n'est pas nommée", () => {
    expect(descriptionMesure({ station: "", cours: "la Loire", dist: 2 })).toBe("la Loire · 2,0 km");
  });

  it("ne prétend pas connaître une distance qu'on n'a pas", () => {
    expect(descriptionMesure({ station: "MUIDES", cours: "", dist: NaN })).toBe("MUIDES");
  });
});
