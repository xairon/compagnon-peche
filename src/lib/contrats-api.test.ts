import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseMeteo } from "./meteo";
import { ondeEtat, ONDE_CODES } from "./onde";

/**
 * Tests de CONTRAT : le schéma que l'app lit est-il toujours celui que l'API sert ?
 *
 * Aucun test ne le vérifiait, et tous les défauts trouvés pendant l'audit
 * étaient de cette famille :
 *   · `surface_pressure` lu là où il fallait `pressure_msl` ;
 *   · un code ONDE « 1b » testé alors qu'il n'existe pas, pendant que « 1f »,
 *     2ᵉ valeur la plus fréquente du jeu national, était ignoré ;
 *   · `analyse_pc` interrogé avec `size=1` sur une boîte entière.
 *
 * Ces fichiers sont les réponses RÉELLES des API, capturées le 31/07/2026 autour
 * de Blois et réduites à quelques enregistrements — valeurs jamais retouchées.
 * Ils gèlent le schéma : si l'app se met à lire un champ qui n'y est pas, le
 * test tombe. Ils ne détectent PAS un changement d'API en production ; ils
 * détectent qu'on lit autre chose que ce qui a été observé.
 */

const fixture = (n: string) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`./__fixtures__/${n}`, import.meta.url)), "utf8"),
  );

describe("Open-Meteo — contrat", () => {
  const j = fixture("open-meteo-blois.json");

  it("sert la pression au niveau de la mer, celle que l'app lit", () => {
    // `surface_pressure` varie avec l'altitude de la station : un pêcheur à
    // 300 m lisait ~30 hPa de moins et croyait à une dépression.
    expect(j.current).toHaveProperty("pressure_msl");
    expect(typeof j.current.pressure_msl).toBe("number");
    expect(j.hourly).toHaveProperty("pressure_msl");
  });

  it("sert tous les champs courants que l'app affiche", () => {
    for (const k of [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "precipitation",
      "cloud_cover",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "weather_code",
    ]) {
      expect(j.current, `current.${k}`).toHaveProperty(k);
    }
  });

  it("sert des séries horaires alignées sur le même axe de temps", () => {
    const n = j.hourly.time.length;
    expect(j.hourly.temperature_2m.length).toBe(n);
    expect(j.hourly.pressure_msl.length).toBe(n);
    expect(j.hourly.precipitation_probability.length).toBe(n);
  });

  it("se laisse lire par parseMeteo sans rien perdre", () => {
    const m = parseMeteo(j);

    expect(m.now.pressure).toBe(j.current.pressure_msl);
    expect(m.now.temp).toBe(j.current.temperature_2m);
  });
});

describe("Hub'Eau écoulement (ONDE) — contrat", () => {
  const j = fixture("hubeau-ecoulement-blois.json");

  it("porte le code et le libellé d'écoulement que l'app lit", () => {
    for (const d of j.data) {
      expect(d).toHaveProperty("code_ecoulement");
      expect(d).toHaveProperty("libelle_ecoulement");
    }
  });

  it("ne sert que des codes que l'app sait interpréter", () => {
    // Le vrai défaut n'était pas un code inconnu : c'était « 1b », inventé,
    // testé, et absent du jeu réel — pendant que « 1f » passait à la trappe.
    for (const d of j.data) {
      expect(ONDE_CODES as readonly string[], `code ${d.code_ecoulement}`).toContain(
        d.code_ecoulement,
      );
    }
  });

  it("contient « 1f », que l'app ignorait", () => {
    expect(j.data.map((d: { code_ecoulement: string }) => d.code_ecoulement)).toContain("1f");
  });

  it("rend un verdict pour chaque code réellement servi", () => {
    for (const d of j.data) {
      const e = ondeEtat(d.code_ecoulement, d.libelle_ecoulement);
      expect(e.mot.length, `code ${d.code_ecoulement}`).toBeGreaterThan(0);
      // « inconnu » serait le signe que le code servi n'est pas dans la table.
      expect(e.tone, `code ${d.code_ecoulement}`).not.toBe("inconnu");
    }
  });

  it("porte le rattachement au cours d'eau, contrairement à analyse_pc", () => {
    expect(j.data[0]).toHaveProperty("libelle_cours_eau");
  });
});

describe("Hub'Eau hydrométrie — contrat", () => {
  const j = fixture("hubeau-hydrometrie-obs.json");

  it("sert date_obs et resultat_obs, les deux seuls champs demandés", () => {
    for (const d of j.data) {
      expect(typeof d.date_obs).toBe("string");
      expect(typeof d.resultat_obs).toBe("number");
    }
  });

  it("annonce un compteur d'enveloppe", () => {
    expect(typeof j.count).toBe("number");
  });
});

describe("Hub'Eau thermie — contrat", () => {
  const j = fixture("hubeau-temperature-chronique.json");

  it("sert la date ET l'heure séparément, sans fuseau", () => {
    // C'est pour ça que l'app assemble « date + heure » et parse en heure
    // LOCALE : ajouter un « Z » décalerait la mesure de l'offset UTC.
    const d = j.data[0];
    expect(d.date_mesure_temp).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(d.heure_mesure_temp).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(typeof d.resultat).toBe("number");
  });
});

describe("Hub'Eau état piscicole — contrat", () => {
  const j = fixture("hubeau-etat-piscicole.json");

  it("sert le taxon et l'effectif que l'app agrège", () => {
    for (const d of j.data) {
      expect(d).toHaveProperty("nom_commun_taxon");
      expect(d).toHaveProperty("nom_latin_taxon");
      expect(typeof d.effectif_lot).toBe("number");
    }
  });

  describe("stations", () => {
    const s = fixture("hubeau-piscicole-stations-blois.json");

    it("ne publie PAS le cours d'eau, même demandé dans `fields`", () => {
      // La requête l'a réclamé — l'URL figée dans `first` le montre — et aucune
      // des 22 réponses ne le porte. C'est pourquoi `Station` n'a pas de champ
      // `cours` : il n'aurait jamais valu que "". C'est aussi pourquoi l'app a
      // cessé de le demander.
      expect(s.first).toContain("libelle_cours_eau");
      for (const d of s.data) expect(d).not.toHaveProperty("libelle_cours_eau");
    });

    it("rend des enregistrements sans code ni libellé, réduits à une position", () => {
      // 6 sur 22 dans la boîte de Blois. Le réseau les publie, l'app les écarte
      // (voir hubeau-stations.test.ts) : une station sans code ne peut rien dire
      // d'elle-même, et `speciesAtStation` n'aurait rien à interroger.
      const muettes = s.data.filter((d: { code_station: string | null }) => d.code_station === null);

      expect(muettes).toHaveLength(6);
      for (const d of muettes) {
        expect(d.libelle_station).toBeNull();
        expect(typeof d.latitude).toBe("number");
      }
    });
  });
});

describe("Sandre CoursEau1 — contrat", () => {
  const j = fixture("sandre-courseau1-props.json");

  it("porte le code Carthage et le nom que l'app rapproche de Hub'Eau", () => {
    for (const f of j.features) {
      expect(typeof f.properties.CdEntiteHydrographique).toBe("string");
      expect(typeof f.properties.NomEntiteHydrographique).toBe("string");
    }
  });

  it("porte la classe de Strahler, dont dépend l'épaisseur du trait", () => {
    expect(j.features[0].properties).toHaveProperty("Classe");
  });

  it("publie numberMatched sur cette couche", () => {
    // ObstEcoul, lui, ne le publie pas — d'où l'état « saturé » de
    // lib/troncature.ts. Les deux comportements sont réels.
    expect(typeof j.numberMatched).toBe("number");
  });
});

describe("Hub'Eau analyse_pc — contrat", () => {
  const j = fixture("hubeau-analyse-pc-blois.json");

  it("sert le résultat, la date et la position", () => {
    const d = j.data[0];
    expect(typeof d.resultat).toBe("number");
    expect(d.date_prelevement).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof d.latitude).toBe("number");
  });

  it("ne porte AUCUN rattachement au cours d'eau", () => {
    // Ce n'est pas un oubli de notre requête : les 67 champs de cette API ont
    // été listés le 31/07/2026, il n'y a ni libelle_cours_eau ni code_cours_eau.
    // Si un jour ce test tombe, c'est que le champ est apparu — et il faudra
    // s'en servir.
    const champs = Object.keys(j.data[0]);
    expect(champs.filter((c) => /cours_eau/.test(c))).toEqual([]);
  });

  it("trie bien par date décroissante, contrairement à ce que disait le code", () => {
    const dates = j.data.map((d: { date_prelevement: string }) => d.date_prelevement);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});
