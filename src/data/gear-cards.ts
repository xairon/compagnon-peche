/** Une fiche enrichie du guide matériel — leurres, appâts ou fils. Les
 *  hameçons (tailles) restent en tableau `GuideEntry[]` dans gear.ts : ce
 *  sont des plages de taille, pas des types distincts, la table est déjà la
 *  bonne représentation. */
export interface GuideCard {
  id: string;
  name: string;
  summary: string; // ce que c'est
  usage: string; // comment/quand l'utiliser (animation, montage, saison)
  species?: string; // espèces ciblées, si pertinent
}

export const GEAR_CARDS: Record<"leurre" | "appat" | "fil", GuideCard[]> = {
  leurre: [],
  appat: [],
  fil: [],
};
