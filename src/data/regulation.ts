import type { SourceEntry } from "../types";

/** National minimum legal sizes — Legifrance R436-18 (verified values). */
export const NATIONAL_SIZES: [string, string][] = [
  ["Brochet", "50 cm"],
  ["Sandre (2ᵉ cat.)", "40 cm"],
  ["Black-bass (2ᵉ cat.)", "30 cm"],
  ["Truites", "23 cm"],
  ["Ombre commun", "30 cm"],
  ["Huchon", "70 cm"],
  ["Écrevisses (pattes rouges…)", "9 cm"],
];

export type DeptId = "23" | "36" | "41";

export interface DeptInfo {
  id: DeptId;
  name: string;
  /** Chef-lieu coordinates, used as the reference point for the legal-hours
   *  ephemeris. Sunset moves by ~10 min across these three departments — enough
   *  to have an angler in the Creuse read "pêche autorisée" after the real
   *  closing time if everything is computed at Blois. */
  lat: number;
  lon: number;
  chefLieu: string;
  regText: string;
  url: string;
  fede: string;
}

export const DEPARTEMENTS: Record<DeptId, DeptInfo> = {
  "41": {
    id: "41",
    name: "Loir-et-Cher (41)",
    lat: 47.586,
    lon: 1.336,
    chefLieu: "Blois",
    regText:
      "Loir-et-Cher — 2ᵉ catégorie dominante (Loire, Cher, étangs de Sologne). Mailles relevées par l'arrêté : truite 25 cm, brochet 60 cm, sandre 50 cm. Vérifiez l'arrêté 2026.",
    url: "http://www.peche41.fr/606-tailles-reglementaires-et-nombre-de-captures.htm",
    fede: "Fédération de pêche 41",
  },
  "36": {
    id: "36",
    name: "Indre (36)",
    lat: 46.811,
    lon: 1.691,
    chefLieu: "Châteauroux",
    regText:
      "Indre — arrêté préfectoral n° 36-2025-12-12-00002 (pêche 2026). Brochet 60 cm, sandre 50 cm ; brochet no-kill 14/03–24/04. Vérifiez le texte en vigueur.",
    url: "https://www.peche36.fr/667-taille-minimale-de-capture.htm",
    fede: "Fédération de pêche 36",
  },
  "23": {
    id: "23",
    name: "Creuse (23)",
    lat: 46.170,
    lon: 1.874,
    chefLieu: "Guéret",
    regText:
      "Creuse — arrêté préfectoral n° 23-2025-12-19-00001 (pêche 2026). Truite 20 cm sur cours d'eau listés (Thaurion, Maulde, Creuse…) sinon 23 cm ; brochet 60 cm, sandre 50 cm. Vérifiez l'arrêté.",
    url: "https://fdpeche23.wixsite.com/peche23/reglementation",
    fede: "Fédération de pêche 23",
  },
};

// ── Réglementation DÉPARTEMENTALE (arrêtés préfectoraux 2026) ────────────────
// Valeurs réelles vérifiées (fédérations/préfectures) qui RAFFINENT le national.
export interface DeptReg {
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
    truiteMaille: "20 cm (cours listés : Thaurion, Maulde, Creuse, Beauze, Rozeille…) sinon 23 cm",
    brochetMaille: "60 cm",
    sandreMaille: "50 cm (2ᵉ cat.)",
    blackbassMaille: "30 cm (2ᵉ cat.)",
    salmonideQuota: "6 salmonidés/jour (ombre inclus) dont 3 truites fario max",
    carnassierQuota: "2ᵉ cat. : 3 carnassiers/jour dont 2 brochets ; 1ʳᵉ cat. : 2 brochets/jour",
    notes: [
      "Fenêtre brochet expérimentale sur les lacs de Vassivière et St-Marc : remise à l'eau des brochets < 60 cm ou > 80 cm.",
      "Écrevisses à pattes blanches/rouges protégées ; seules américaine/signal/Louisiane pêchables (transport vivant interdit).",
      "Pêche interdite sur le bassin du Cher (Tardes, Voueize et affluents).",
    ],
    source: "Arrêté préf. n° 23-2025-12-19-00001 (pêche 2026) · Fédération de pêche de la Creuse",
    url: "https://fdpeche23.wixsite.com/peche23/reglementation",
  },
  "36": {
    truiteMaille: "23 cm (truite/ombre)",
    brochetMaille: "60 cm (1ʳᵉ et 2ᵉ cat.)",
    sandreMaille: "50 cm (2ᵉ cat.)",
    blackbassMaille: "30 cm (2ᵉ cat.)",
    salmonideQuota: "6 salmonidés/jour dont 2 truites fario maximum",
    carnassierQuota: "3 carnassiers/jour dont 2 brochets maximum",
    notes: [
      "Brochet no-kill : tout brochet capturé du 14/03 au 24/04 doit être remis à l'eau.",
      "Sandre fermé du 26/01 au 24/04 en 2ᵉ catégorie (même fenêtre que le brochet).",
      "Black-bass : la fédération indique « no-kill » ; son document ne dit pas explicitement si cela vise les seules retenues d'Eguzon, Roche-au-Moine et Roche-Bat-l'Aigue ou toute la 2ᵉ catégorie. Dans le doute, relâchez.",
      "Truite arc-en-ciel : pêche autorisée toute l'année en 2ᵉ catégorie. L'app affiche la période de 1ʳᵉ catégorie, plus restrictive, car elle ne sait pas sur quelle catégorie d'eau vous êtes.",
      "Anguille jaune : ouverte du 1ᵉʳ avril au 31 août en 1ʳᵉ catégorie, interdite en 2ᵉ. Anguille argentée interdite partout.",
      "Saumon, truite de mer et alose interdits toute l'année.",
    ],
    source: "Arrêté préf. n° 36-2025-12-12-00002 (pêche 2026) · Fédération de pêche de l'Indre",
    url: "https://www.peche36.fr/667-taille-minimale-de-capture.htm",
  },
  "41": {
    // La valeur reste courte : elle s'affiche telle quelle dans le parcours et
    // sur la fiche. Le détail de l'incertitude vit dans `notes` ci-dessous, que
    // l'écran Réglementation déploie — un champ de valeur n'est pas un endroit
    // pour un paragraphe.
    truiteMaille: "25 cm (fario et arc-en-ciel) — à reconfirmer sur l'arrêté 2026",
    brochetMaille: "60 cm (1ʳᵉ et 2ᵉ cat.)",
    sandreMaille: "50 cm (2ᵉ cat.)",
    blackbassMaille: "30 cm (2ᵉ cat.)",
    salmonideQuota: "6 truites/jour",
    carnassierQuota: "2ᵉ cat. : 3 carnassiers/jour dont 2 brochets ; 1ʳᵉ cat. : 2 brochets/jour",
    notes: [
      "Maille truite : l'app retient 25 cm, la valeur la plus protectrice. Elle n'a pas pu être reconfirmée en juillet 2026 (site de la fédération inaccessible) et deux agrégateurs tiers indiquent 23 cm sans citer l'arrêté. Vérifiez l'arrêté préfectoral avant de conserver une truite entre 23 et 25 cm.",
      "Plafond global toutes catégories : 6 truites et 2 brochets max/jour/pêcheur.",
      "Interdiction de transporter les carpes vivantes de plus de 60 cm.",
      "Carpe de nuit au Plan d'eau de la Coudraie, sur réservation (peche41.fr).",
    ],
    source: "Synthèse de l'arrêté préfectoral annuel 2026 · Fédération de pêche du Loir-et-Cher",
    url: "http://www.peche41.fr/606-tailles-reglementaires-et-nombre-de-captures.htm",
  },
};

// True 1ʳᵉ-catégorie (trout-stream) salmonids that follow the departmental
// truite open/close dates. Deliberately EXCLUDES:
//  · omble-chevalier / coregone-lavaret / cristivomer — high-lake fish fished
//    year-round in 2ᵉ catégorie (season "toujours"); the 1ʳᵉ-cat closed season
//    does not apply, so applying it here contradicted their own national row.
//  · saumon-atlantique — protected migrator with its own regime; R436-21 excludes
//    "le saumon" from the salmonid keep-quota. It must not show a 6/jour quota.
const SALMONIDES_CAT1 = new Set([
  "truite-fario",
  "truite-arc-en-ciel",
  "omble-fontaine",
  "ombre",
  "huchon",
]);
const BROCHETS = new Set(["brochet", "brochet-aquitain"]);
const BLACKBASS = new Set(["black-bass", "black-bass-petite-bouche"]);

// The 1ʳᵉ-catégorie opening/closing dates are set by NATIONAL rule (identical
// for all three departments) — the same 2ᵉ-samedi-de-mars / 3ᵉ-dimanche-de-
// septembre rule that src/lib/season.ts already uses to decide whether a cat1
// species is in season. They used to be hard-coded strings here ("14 mars
// 2026") that silently went stale every year; computing them on demand fixes
// that for good. The tiny nth-weekday routine is duplicated rather than
// imported from src/lib/season.ts — src/data/* stays a lib-free data module,
// and src/data/maille.test.ts cross-checks the two never diverge.
function nthWeekdayOfMonth(year: number, month: number, dow: number, n: number): Date {
  const d = new Date(year, month, 1);
  let count = 0;
  for (;;) {
    if (d.getDay() === dow) {
      count++;
      if (count === n) return new Date(d);
    }
    d.setDate(d.getDate() + 1);
  }
}

const MOIS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function formatFrDate(d: Date): string {
  return `${d.getDate()} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

/** 1ʳᵉ-catégorie opening/closing dates for a given year — 2ᵉ samedi de mars →
 *  3ᵉ dimanche de septembre. Computed on demand (never hard-code a year). */
export function cat1Season(year: number): { open: Date; close: Date } {
  return {
    open: nthWeekdayOfMonth(year, 2, 6, 2), // 2nd Saturday of March
    close: nthWeekdayOfMonth(year, 8, 0, 3), // 3rd Sunday of September
  };
}

export function cat1OuvertureLabel(year: number): string {
  return formatFrDate(cat1Season(year).open);
}

export function cat1FermetureLabel(year: number): string {
  return formatFrDate(cat1Season(year).close);
}

/** Department-specific regulation rows relevant to a given species, or null when
 *  the department has no known specificity for it (→ national baseline applies).
 *  `year` defaults to the current year so callers rarely need to pass it. */
export function localRegRows(
  dept: DeptId,
  spId: string,
  year: number = new Date().getFullYear(),
): [string, string][] {
  const d = DEPT_REG[dept];
  const rows: [string, string][] = [];
  if (SALMONIDES_CAT1.has(spId)) {
    rows.push(["Ouverture (1ʳᵉ cat.)", cat1OuvertureLabel(year)]);
    rows.push(["Fermeture (1ʳᵉ cat.)", cat1FermetureLabel(year)]);
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
  // Les migrateurs interdits n'entraient dans aucun groupe ci-dessus, donc leur
  // fiche affichait « pas de spécificité départementale » — faux : l'arrêté les
  // interdit explicitement. Une interdiction est la spécificité la plus utile à
  // remonter.
  if (spId === "anguille") {
    rows.push(["Anguille jaune", "1ʳᵉ cat. : 1ᵉʳ avril → 31 août. 2ᵉ cat. : pêche interdite."]);
    rows.push(["Anguille argentée", "Pêche interdite."]);
  }
  if (spId === "saumon-atlantique") {
    rows.push(["Saumon & truite de mer", "Pêche interdite toute l'année."]);
  }
  if (spId === "grande-alose" || spId === "alose-feinte-atlantique" || spId === "alose-feinte-mediterraneenne") {
    rows.push(["Alose", "Pêche interdite toute l'année."]);
  }
  return rows;
}

/** Largest size in centimetres stated in a free-text rule, or null when it
 *  states none. An arrêté may carry an exception ("20 cm on the listed rivers,
 *  otherwise 23 cm"): the LARGEST is the only safe one to headline, because
 *  announcing the smaller would have the angler keep an undersized fish
 *  everywhere else, while the reverse merely releases a legal one. Requires the
 *  "cm" unit, so a quota ("3 carnassiers dont 2 brochets") is never mistaken
 *  for a size. */
export function strictestCm(text: string): number | null {
  const found = (text || "").match(/(\d+(?:[.,]\d+)?)\s*cm/gi);
  if (!found) return null;
  const sizes = found.map((m) => parseFloat(m.replace(",", ".")));
  return sizes.length ? Math.max(...sizes) : null;
}

/** The minimum legal size the préfectoral arrêté sets for a species in a
 *  department, or null when it sets none (→ the national floor applies). The
 *  arrêté can only be stricter than the national baseline, so when it exists it
 *  is the one that binds the angler. */
export function localMaille(dept: DeptId, spId: string): { text: string; cm: number } | null {
  const d = DEPT_REG[dept];
  let text: string | null = null;
  if (spId === "truite-fario" || spId === "truite-arc-en-ciel") text = d.truiteMaille;
  else if (BROCHETS.has(spId)) text = d.brochetMaille;
  else if (spId === "sandre") text = d.sandreMaille;
  else if (BLACKBASS.has(spId)) text = d.blackbassMaille;
  if (!text) return null;
  const cm = strictestCm(text);
  return cm === null ? null : { text, cm };
}

/** The daily quota the préfectoral arrêté sets for a species in a department, or
 *  null when it sets none (→ the national quota applies). Mirrors localMaille:
 *  same species groupings already used by localRegRows for the "Quota
 *  salmonidés" / "Quota carnassiers" département rows, so this can never
 *  disagree with what the fiche espèce already shows. */
export function localQuota(dept: DeptId, spId: string): string | null {
  const d = DEPT_REG[dept];
  if (SALMONIDES_CAT1.has(spId)) return d.salmonideQuota;
  if (BROCHETS.has(spId) || spId === "sandre" || BLACKBASS.has(spId)) return d.carnassierQuota;
  return null;
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
