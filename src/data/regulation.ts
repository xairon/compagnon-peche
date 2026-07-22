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

export type DeptId = "23" | "36" | "41";

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
      "Loir-et-Cher — 2ᵉ catégorie dominante (Loire, Cher, étangs de Sologne). Mailles relevées par l'arrêté : truite 25 cm, brochet 60 cm, sandre 50 cm. Vérifiez l'arrêté 2026.",
    url: "http://www.peche41.fr/606-tailles-reglementaires-et-nombre-de-captures.htm",
    fede: "Fédération de pêche 41",
  },
  "36": {
    id: "36",
    name: "Indre (36)",
    regText:
      "Indre — arrêté préfectoral n° 36-2025-12-12-00002 (pêche 2026). Brochet 60 cm, sandre 50 cm ; brochet no-kill 14/03–24/04. Vérifiez le texte en vigueur.",
    url: "https://www.peche36.fr/667-taille-minimale-de-capture.htm",
    fede: "Fédération de pêche 36",
  },
  "23": {
    id: "23",
    name: "Creuse (23)",
    regText:
      "Creuse — arrêté préfectoral n° 23-2025-12-19-00001 (pêche 2026). Truite 20 cm sur cours d'eau listés (Thaurion, Maulde, Creuse…) sinon 23 cm ; brochet 60 cm, sandre 50 cm. Vérifiez l'arrêté.",
    url: "https://fdpeche23.wixsite.com/peche23/reglementation",
    fede: "Fédération de pêche 23",
  },
};

// ── Réglementation DÉPARTEMENTALE (arrêtés préfectoraux 2026) ────────────────
// Valeurs réelles vérifiées (fédérations/préfectures) qui RAFFINENT le national.
export interface DeptReg {
  cat1Ouverture: string;
  cat1Fermeture: string;
  truiteMaille: string;
  brochetMaille: string;
  sandreMaille: string;
  blackbassMaille: string;
  salmonideQuota: string;
  carnassierQuota: string;
  notes: string[];
  source: string;
  url: string;
}

export const DEPT_REG: Record<DeptId, DeptReg> = {
  "23": {
    cat1Ouverture: "14 mars 2026",
    cat1Fermeture: "20 septembre 2026",
    truiteMaille: "20 cm (cours listés : Thaurion, Maulde, Creuse, Beauze, Rozeille…) sinon 23 cm",
    brochetMaille: "60 cm",
    sandreMaille: "50 cm (2ᵉ cat.)",
    blackbassMaille: "30 cm (2ᵉ cat.)",
    salmonideQuota: "6 salmonidés/jour (ombre inclus) dont 3 truites fario max",
    carnassierQuota: "3 carnassiers/jour dont 2 brochets max",
    notes: [
      "Fenêtre brochet expérimentale sur les lacs de Vassivière et St-Marc : remise à l'eau des brochets < 60 cm ou > 80 cm.",
      "Écrevisses à pattes blanches/rouges protégées ; seules américaine/signal/Louisiane pêchables (transport vivant interdit).",
      "Pêche interdite sur le bassin du Cher (Tardes, Voueize et affluents).",
    ],
    source: "Arrêté préf. n° 23-2025-12-19-00001 (pêche 2026) · Fédération de pêche de la Creuse",
    url: "https://fdpeche23.wixsite.com/peche23/reglementation",
  },
  "36": {
    cat1Ouverture: "14 mars 2026",
    cat1Fermeture: "20 septembre 2026",
    truiteMaille: "23 cm (truite/ombre)",
    brochetMaille: "60 cm (1ʳᵉ et 2ᵉ cat.)",
    sandreMaille: "50 cm (2ᵉ cat.)",
    blackbassMaille: "30 cm (2ᵉ cat.)",
    salmonideQuota: "6 salmonidés/jour dont 2 truites fario max",
    carnassierQuota: "3 carnassiers/jour dont 2 brochets max",
    notes: [
      "Brochet no-kill : tout brochet capturé du 14/03 au 24/04 doit être remis à l'eau.",
      "Black-bass no-kill sur les retenues d'Eguzon, Roche-au-Moine et Roche-Bat-l'Aigue.",
      "Saumon, truite de mer et alose interdits toute l'année ; anguille argentée interdite.",
    ],
    source: "Arrêté préf. n° 36-2025-12-12-00002 (pêche 2026) · Fédération de pêche de l'Indre",
    url: "https://www.peche36.fr/667-taille-minimale-de-capture.htm",
  },
  "41": {
    cat1Ouverture: "14 mars 2026",
    cat1Fermeture: "20 septembre 2026",
    truiteMaille: "25 cm (fario et arc-en-ciel) — relevée au-dessus du national",
    brochetMaille: "60 cm (1ʳᵉ et 2ᵉ cat.)",
    sandreMaille: "50 cm (2ᵉ cat.)",
    blackbassMaille: "30 cm (2ᵉ cat.)",
    salmonideQuota: "6 truites/jour",
    carnassierQuota: "2ᵉ cat. : 3 carnassiers/jour dont 2 brochets ; 1ʳᵉ cat. : 2 brochets/jour",
    notes: [
      "Plafond global toutes catégories : 6 truites et 2 brochets max/jour/pêcheur.",
      "Interdiction de transporter les carpes vivantes de plus de 60 cm.",
      "Carpe de nuit au Plan d'eau de la Coudraie, sur réservation (peche41.fr).",
    ],
    source: "Synthèse de l'arrêté préfectoral annuel 2026 · Fédération de pêche du Loir-et-Cher",
    url: "http://www.peche41.fr/606-tailles-reglementaires-et-nombre-de-captures.htm",
  },
};

const SALMONIDES_CAT1 = new Set([
  "truite-fario",
  "truite-arc-en-ciel",
  "omble-fontaine",
  "omble-chevalier",
  "ombre",
  "coregone-lavaret",
  "cristivomer",
  "huchon",
  "saumon-atlantique",
]);
const BROCHETS = new Set(["brochet", "brochet-aquitain"]);
const BLACKBASS = new Set(["black-bass", "black-bass-petite-bouche"]);

/** Department-specific regulation rows relevant to a given species, or null when
 *  the department has no known specificity for it (→ national baseline applies). */
export function localRegRows(dept: DeptId, spId: string): [string, string][] {
  const d = DEPT_REG[dept];
  const rows: [string, string][] = [];
  if (SALMONIDES_CAT1.has(spId)) {
    rows.push(["Ouverture (1ʳᵉ cat.)", d.cat1Ouverture]);
    rows.push(["Fermeture (1ʳᵉ cat.)", d.cat1Fermeture]);
    if (spId === "truite-fario" || spId === "truite-arc-en-ciel") rows.push(["Maille truite", d.truiteMaille]);
    rows.push(["Quota salmonidés", d.salmonideQuota]);
  }
  if (BROCHETS.has(spId)) {
    rows.push(["Maille brochet", d.brochetMaille]);
    rows.push(["Quota carnassiers", d.carnassierQuota]);
  }
  if (spId === "sandre") {
    rows.push(["Maille sandre", d.sandreMaille]);
    rows.push(["Quota carnassiers", d.carnassierQuota]);
  }
  if (BLACKBASS.has(spId)) {
    rows.push(["Maille black-bass", d.blackbassMaille]);
    rows.push(["Quota carnassiers", d.carnassierQuota]);
  }
  return rows;
}

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
