import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { coursDuPoint, REFERENTIEL_SANDRE, SEUIL_COURS_M } from "./cours-du-point";
import type { FeatureCollection } from "./sandre";

// Le chaînon qui manquait : savoir SUR QUEL cours d'eau se trouve le pêcheur.
//
// Vérifié le 31/07/2026 sur la boîte de Blois : le WFS Sandre publie
// CdCoursEau / CdEntiteHydrographique = "----0000" pour « la Loire », et
// Hub'Eau temperature/station comme qualite_rivieres/station_pc publient
// code_cours_eau = "----0000" pour la même. Même référentiel Carthage, même
// valeur : le rapprochement se fait par code, jamais par libellé.
//
// CE QUI A CHANGÉ : la fonction prenait une FeatureCollection et exigeait que
// la ZONE ENTIÈRE ne contienne qu'un cours d'eau. Sur la boîte réelle de 1 km
// autour de Blois il y en a trois — la Loire à 161 m, un ruisseau à 1051 m, les
// Mées à 1302 m — donc elle répondait « ambigu » là où la réponse est évidente.
// Les anciens tests passaient parce qu'ils fournissaient des features sans
// géométrie ; ils décrivaient une fonction inutilisable en vrai. Ils sont
// réécrits ici avec des géométries, et la question posée n'est plus « la zone
// est-elle homogène » mais « qu'est-ce qui passe à portée du point ».

const P_LAT = 47.586;
const P_LON = 1.336;
const KM_PAR_DEGRE = (Math.PI * 6371) / 180;

/** Un tronçon nord-sud passant à `m` mètres à l'est du point de référence. */
function tronconA(m: number, props: Record<string, unknown>) {
  const dLon = m / 1000 / (KM_PAR_DEGRE * Math.cos((P_LAT * Math.PI) / 180));
  return {
    type: "Feature" as const,
    geometry: {
      type: "LineString",
      coordinates: [
        [P_LON + dLon, P_LAT - 0.01],
        [P_LON + dLon, P_LAT + 0.01],
      ],
    },
    properties: props,
  };
}

const fc = (features: FeatureCollection["features"]): FeatureCollection => ({
  type: "FeatureCollection",
  features,
});

const LOIRE = { CdEntiteHydrographique: "----0000", NomEntiteHydrographique: "la Loire" };
const CISSE = { CdEntiteHydrographique: "K4--0150", NomEntiteHydrographique: "la Cisse" };

const CLE_LOIRE = `${REFERENTIEL_SANDRE}:----0000`;

describe("coursDuPoint", () => {
  it("nomme le cours d'eau qui passe à portée du point", () => {
    const c = coursDuPoint(fc([tronconA(120, LOIRE)]), P_LAT, P_LON);

    expect(c?.nom).toBe("Loire");
    expect(c?.code).toBe(CLE_LOIRE);
  });

  it("ignore un cours d'eau hors de portée au lieu de le dire ambigu", () => {
    // LE défaut visé. La Cisse est dans la boîte, mais à 1,2 km : elle n'est
    // pas ce que le pêcheur a sous les yeux.
    const c = coursDuPoint(fc([tronconA(120, LOIRE), tronconA(1200, CISSE)]), P_LAT, P_LON);

    expect(c?.code).toBe(CLE_LOIRE);
  });

  it("accepte plusieurs tronçons du MÊME cours d'eau à portée", () => {
    // CoursEau et TronconHydrographique découpent tous deux un fleuve : trois
    // entrées « la Loire » ne sont pas une ambiguïté.
    const c = coursDuPoint(
      fc([tronconA(80, LOIRE), tronconA(120, LOIRE), tronconA(200, LOIRE)]),
      P_LAT,
      P_LON,
    );

    expect(c?.code).toBe(CLE_LOIRE);
  });

  it("n'en choisit aucun quand deux cours d'eau sont à portée — un confluent n'est pas une réponse", () => {
    // Règle conservée : entre la Loire et la Cisse au confluent, l'app ne sait
    // pas laquelle est sous les yeux du pêcheur, et prétendre le contraire
    // rejouerait le défaut que tout l'audit traque.
    const c = coursDuPoint(fc([tronconA(120, LOIRE), tronconA(180, CISSE)]), P_LAT, P_LON);

    expect(c).toBeNull();
  });

  it("ne répond rien quand rien ne passe à portée", () => {
    expect(coursDuPoint(fc([tronconA(1200, LOIRE)]), P_LAT, P_LON)).toBeNull();
    expect(coursDuPoint(fc([]), P_LAT, P_LON)).toBeNull();
    expect(coursDuPoint(null, P_LAT, P_LON)).toBeNull();
  });

  it("ignore un tronçon sans code plutôt que de lui en inventer un", () => {
    const c = coursDuPoint(
      fc([tronconA(120, LOIRE), tronconA(100, { NomEntiteHydrographique: "sans code" })]),
      P_LAT,
      P_LON,
    );

    expect(c?.code).toBe(CLE_LOIRE);
  });

  it("ignore un tronçon dont la géométrie ne situe rien — illisible n'est pas « loin »", () => {
    // Le compter comme hors de portée ferait dire à la source qu'elle a
    // répondu « ailleurs » là où elle n'a rien dit. Le compter comme à portée
    // fabriquerait un confluent. On l'écarte, et on le documente.
    const sansGeom = { type: "Feature" as const, geometry: null, properties: CISSE };
    const c = coursDuPoint(fc([tronconA(120, LOIRE), sansGeom]), P_LAT, P_LON);

    expect(c?.code).toBe(CLE_LOIRE);
  });

  it("lit le code des DEUX couches Sandre, qui ne le nomment pas pareil", () => {
    // CoursEau1..5 : CdEntiteHydrographique. sa:TronconHydrographique :
    // CdCoursEau. Vérifié le 31/07/2026 sur les deux réponses réelles.
    const c = coursDuPoint(fc([tronconA(120, { CdCoursEau: "----0000" })]), P_LAT, P_LON);

    expect(c?.code).toBe(CLE_LOIRE);
  });

  it("laisse le nom vide quand la couche n'en publie pas, au lieu d'en forger un", () => {
    // sa:TronconHydrographique ne porte aucun libellé : ses quatre champs sont
    // CdTronconHydrographique, PkAval, PkAmont, CdCoursEau. « Cours d'eau »
    // affiché à cet endroit ressemblerait à un nom.
    const c = coursDuPoint(fc([tronconA(120, { CdCoursEau: "----0000" })]), P_LAT, P_LON);

    expect(c?.nom).toBe("");
  });

  it("laisse choisir le seuil, parce que c'en est un et pas une mesure", () => {
    const loin = fc([tronconA(500, LOIRE)]);

    expect(coursDuPoint(loin, P_LAT, P_LON)).toBeNull();
    expect(coursDuPoint(loin, P_LAT, P_LON, 600)?.code).toBe(CLE_LOIRE);
  });

  it("déclare le référentiel du Sandre comme celui de Hub'Eau, et pas « inconnu »", () => {
    // Sans cette déclaration, cleCours() préfixerait "?" et le code ne
    // s'apparierait jamais à celui de temperature/station — le critère du cours
    // d'eau ne se déclencherait tout simplement pas.
    expect(REFERENTIEL_SANDRE).toBe("CoursEau_Carthage2017");
  });

  it("tranche le cas réel de Blois, que l'ancienne règle déclarait ambigu", () => {
    // Réponse RÉELLE de sa:TronconHydrographique, boîte de 1 km autour de
    // 47,586 / 1,336, capturée le 31/07/2026 : trois tronçons, trois cours
    // d'eau. L'ancienne règle (« la zone ne doit en contenir qu'un ») rendait
    // null. La Loire passe à 161 m, les deux autres à plus d'un kilomètre.
    const reel = JSON.parse(
      readFileSync(
        fileURLToPath(new URL("./__fixtures__/sandre-troncon-blois.json", import.meta.url)),
        "utf8",
      ),
    ) as FeatureCollection;

    expect(reel.features).toHaveLength(3);
    expect(coursDuPoint(reel, P_LAT, P_LON)?.code).toBe(CLE_LOIRE);
  });

  it("garde un seuil plus large que la demi-largeur d'un grand fleuve", () => {
    // 161 m mesurés entre le point de Blois et l'axe de la Loire : le Sandre
    // publie un AXE, pas une berge, et la Loire fait là ~250 m de large. Un
    // seuil de 200 m aurait écarté la bonne rivière.
    expect(SEUIL_COURS_M).toBeGreaterThan(161);
  });
});
