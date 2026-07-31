// Carte de pêche — pur, sans horloge. Chaque fonction reçoit `now` en
// paramètre et ne lit jamais l'heure système, même convention que
// src/lib/ecrevisses.ts : c'est ce qui rend tout ceci testable sans truquer
// l'horloge.
//
// L'app ne connaissait qu'une carte annuelle. La FNPF en vend aussi à la
// journée et à la semaine : dire à un pêcheur muni d'une journalière qu'il est
// « en règle jusqu'au 31 décembre » est une fausse assurance sur exactement le
// document qu'un garde lui demandera.
//
// Aucun tarif n'est embarqué ici, délibérément — voir RECIPROCITES plus bas.

/** Absente = rien de renseigné (pas forcément une infraction : moins de 12 ans,
 *  ou le pêcheur n'a simplement pas rempli le champ).
 *  Pas-encore-valide = la carte existe mais sa période n'a pas commencé ; les
 *  cartes de l'année N+1 sont en vente dès novembre.
 *  Seul « perimee » est un problème légal franc. */
export type FishingCardStatus =
  | "absente"
  | "pas-encore-valide"
  | "valide"
  | "expire-bientot"
  | "perimee";

/** Types vendus par la FNPF. Les quatre premiers courent sur l'année civile ;
 *  les deux derniers sur une fenêtre glissante à partir du jour d'achat. */
export type TypeCarte =
  | "annuelle"
  | "interfederale"
  | "mineure"
  | "decouverte"
  | "hebdomadaire"
  | "journaliere";

export const TYPES_ANNUELS: TypeCarte[] = ["annuelle", "interfederale", "mineure", "decouverte"];

/** Durée en jours calendaires, premier jour compris. */
export const DUREE_JOURS: Record<"journaliere" | "hebdomadaire", number> = {
  journaliere: 1,
  hebdomadaire: 7,
};

/** Réseau de réciprocité, tel que le pêcheur le DÉCLARE. L'app ne le déduit pas
 *  de son département : elle n'a pas de table département → réseau digne de
 *  confiance. « inconnue » est un état à part entière, pas un défaut à remplir. */
export type Reciprocite = "EHGO" | "CHI" | "URNE" | "interfederale" | "aucune" | "inconnue";

export const RECIPROCITES: Reciprocite[] = [
  "EHGO",
  "CHI",
  "URNE",
  "interfederale",
  "aucune",
  "inconnue",
];

export interface CarteDePeche {
  type: TypeCarte;
  /** Année civile, pour les types annuels. */
  annee?: number;
  /** Premier jour de validité, « AAAA-MM-JJ », pour journalière et hebdomadaire. */
  debut?: string;
  reciprocite?: Reciprocite;
}

/** Fenêtre d'alerte, en jours avant la fin de validité. Un mois pour une
 *  annuelle (la FNPF ouvre les ventes N+1 mi-novembre, le rappel est donc
 *  actionnable dès qu'il apparaît) ; un jour pour une hebdomadaire ; le jour
 *  même pour une journalière, qui n'a que celui-là. */
export const SEUIL_ALERTE_J: Record<TypeCarte, number> = {
  annuelle: 30,
  interfederale: 30,
  mineure: 30,
  decouverte: 30,
  hebdomadaire: 1,
  journaliere: 0,
};

/** Conservé pour l'ancien appel à un an nu. */
export const CARD_WARNING_DAYS = SEUIL_ALERTE_J.annuelle;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** « AAAA-MM-JJ » → minuit local. Renvoie null sur tout le reste : une date
 *  qu'on n'a pas su lire n'est pas le 1ᵉʳ janvier 1970. */
function jourISO(s: string | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

const estAnnuel = (t: TypeCarte) => TYPES_ANNUELS.includes(t);

/** Premier jour de validité, ou null si la carte n'en porte pas assez pour le
 *  savoir. */
export function debutValidite(c: CarteDePeche): Date | null {
  if (estAnnuel(c.type)) return c.annee ? new Date(c.annee, 0, 1) : null;
  return jourISO(c.debut);
}

/** Dernier jour de validité (la carte vaut pour toute cette journée), ou null. */
export function finValidite(c: CarteDePeche): Date | null {
  if (estAnnuel(c.type)) return c.annee ? new Date(c.annee, 11, 31) : null;
  const d = jourISO(c.debut);
  if (!d) return null;
  const duree = DUREE_JOURS[c.type as "journaliere" | "hebdomadaire"];
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + duree - 1);
}

/** Jours calendaires restants (0 le dernier jour valable, négatif ensuite),
 *  ou null quand la carte ne permet pas de le calculer. */
export function joursRestants(c: CarteDePeche, now: Date): number | null {
  const fin = finValidite(c);
  if (!fin) return null;
  return Math.round((startOfDay(fin).getTime() - startOfDay(now).getTime()) / 86_400_000);
}

/** Où en est la carte à `now`. */
export function statutCarte(c: CarteDePeche | undefined, now: Date): FishingCardStatus {
  if (!c) return "absente";
  const debut = debutValidite(c);
  const fin = finValidite(c);
  if (!debut || !fin) return "absente";
  const jour = startOfDay(now).getTime();
  if (jour < startOfDay(debut).getTime()) return "pas-encore-valide";
  const restants = Math.round((startOfDay(fin).getTime() - jour) / 86_400_000);
  if (restants < 0) return "perimee";
  return restants <= SEUIL_ALERTE_J[c.type] ? "expire-bientot" : "valide";
}

/** Ce que l'app peut honnêtement dire d'un réseau de réciprocité.
 *
 *  Aucune de ces phrases ne donne de nombre de départements : les deux pages de
 *  coindepeche.fr consultées le 31/07/2026 se contredisent (EHGO 37 / CHI 39 /
 *  URNE 14 sur la page tarifs, EHGO 35 / CHI 32 / URNE 24 dans le guide). Un
 *  test échoue si un chiffre réapparaît ici. La liste faisant foi est celle de
 *  la fédération départementale et de cartedepeche.fr. */
export function phraseReciprocite(r: Reciprocite): string {
  switch (r) {
    case "EHGO":
      return "Entente Halieutique du Grand Ouest — votre carte ouvre les parcours réciprocitaires des fédérations membres. La liste à jour est celle de votre fédération.";
    case "CHI":
      return "Club Halieutique Interdépartemental — votre carte ouvre les parcours réciprocitaires des fédérations membres. La liste à jour est celle de votre fédération.";
    case "URNE":
      return "Union Réciprocitaire du Nord-Est — votre carte ouvre les parcours réciprocitaires des fédérations membres. La liste à jour est celle de votre fédération.";
    case "interfederale":
      return "Carte interfédérale — elle réunit EHGO, CHI et URNE. Reste hors réciprocité ce que chaque fédération en exclut : vérifiez le parcours avant de vous y installer.";
    case "aucune":
      return "Sans réciprocité : votre carte vaut uniquement sur les lots de l'AAPPMA qui l'a délivrée. Ailleurs, il faut une autre carte.";
    case "inconnue":
      return "Réciprocité non renseignée — l'app ne la devine pas depuis votre département. Vérifiez sur votre carte ou auprès de votre fédération avant de pêcher ailleurs.";
  }
}

// ── Ancienne interface, conservée ───────────────────────────────────────────
// Les profils enregistrés avant l'ajout du type ne portent qu'une année. Les
// lire comme une carte annuelle est la seule lecture possible, et c'est ce que
// faisaient les écrans jusqu'ici.

/** Jours calendaires jusqu'au 31 décembre de `carteAnnee`. */
export function daysUntilCardExpiry(carteAnnee: number, now: Date): number {
  return joursRestants({ type: "annuelle", annee: carteAnnee }, now)!;
}

/** Statut d'une carte annuelle décrite par sa seule année. */
export function fishingCardStatus(
  carteAnnee: number | undefined,
  now: Date,
): FishingCardStatus {
  return statutCarte(carteAnnee ? { type: "annuelle", annee: carteAnnee } : undefined, now);
}
