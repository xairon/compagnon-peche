import type { SourceEntry } from "../types";

/** National minimum legal sizes — Legifrance R436-18 (verified values). */
export const NATIONAL_SIZES: [string, string][] = [
  ["Brochet", "50 cm"],
  ["Sandre (2ᵉ cat.)", "40 cm"],
  ["Black-bass", "30 cm"],
  ["Truites", "23 cm"],
  ["Ombre commun", "30 cm"],
  ["Huchon", "70 cm"],
  ["Écrevisses (pattes rouges…)", "9 cm"],
];

export type DeptId = "36" | "41";

export interface DeptInfo {
  id: DeptId;
  name: string;
  regText: string;
  url: string;
  fede: string;
}

export const DEPARTEMENTS: Record<DeptId, DeptInfo> = {
  "41": {
    id: "41",
    name: "Loir-et-Cher (41)",
    regText:
      "Loir-et-Cher — 2ᵉ catégorie dominante (Loire, Cher, étangs de Sologne). L'arrêté annuel peut relever certaines mailles (brochet notamment) et fixer les parcours et réserves : la valeur exacte est à vérifier sur l'arrêté 2026.",
    url: "https://www.peche41.fr/603-reglementation.htm",
    fede: "Fédération de pêche 41",
  },
  "36": {
    id: "36",
    name: "Indre (36)",
    regText:
      "Indre — arrêté préfectoral n° 36-2025-12-12-00002 (pêche 2026). Spécificités locales : mailles, réserves et parcours fixés par l'arrêté ; vérifiez le texte en vigueur.",
    url: "https://www.peche36.fr/322-reglementation.htm",
    fede: "Fédération de pêche 36",
  },
};

export const SOURCES: SourceEntry[] = [
  {
    t: "Legifrance — Code de l'environnement",
    d: "R436-18 (tailles minimales), R436-21 (quota carnassiers), R432-5 (espèces susceptibles de déséquilibres biologiques). Source faisant foi.",
  },
  {
    t: "service-public.gouv.fr — fiche F2117",
    d: "Périodes d'ouverture par catégorie et horaires légaux.",
  },
  {
    t: "ANSES — « Poissons, conseils de consommation »",
    d: "Recommandations de fréquence pour les espèces bioaccumulatrices (PCB, dioxines, méthylmercure).",
  },
  {
    t: "Arrêtés préfectoraux 36 & 41",
    d: "Indre : arrêté n° 36-2025-12-12-00002 (pêche 2026). Loir-et-Cher : arrêté annuel via préfecture / peche41.fr. À revérifier chaque année.",
  },
  {
    t: "Fédérations départementales",
    d: "peche36.fr · peche41.fr — repères pédagogiques, non normatifs.",
  },
  {
    t: "Taxonomie & biologie",
    d: "TAXREF (MNHN), GBIF, Atlas des poissons d'eau douce de France (Keith et al., 2011).",
  },
  {
    t: "Photos",
    d: "À embarquer sous licence libre (Wikimedia Commons — CC0 / CC-BY / CC-BY-SA), crédit et licence stockés image par image.",
  },
];
