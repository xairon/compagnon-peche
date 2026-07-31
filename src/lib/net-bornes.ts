/**
 * Délais et volumes, par source.
 *
 * `net.ts` accordait 12 000 ms à tout le monde : le même budget à un appel
 * météo de 2 ko et à une couche hydrographique de 973 ko, et 12 s à Overpass
 * dont le serveur, lui, travaille jusqu'à 25 s — abandonner avant qu'il ait
 * fini jette une réponse en cours de production.
 *
 * Tailles et temps mesurés le 31/07/2026, sur connexion fixe :
 *
 *   Sandre CoursEau1  972 708 o   0,96 s
 *   Sandre CoursEau4  190 962 o   0,69 s
 *   GBIF (300 occ.)   537 206 o   0,59 s
 *   Hub'Eau hydro      11 092 o   0,11 s
 *   Open-Meteo          1 992 o   0,15 s
 *
 * Les délais ci-dessous ne se déduisent PAS de ces temps : au bord de l'eau la
 * liaison n'est pas celle-là. Ils se déduisent de la TAILLE, à un débit mobile
 * supposé de ~1 Mbit/s (soit ~8 s pour 973 ko de pur transfert), plus une marge
 * de latence. Ce débit est une hypothèse, pas une mesure — et c'est ce qui rend
 * ces nombres discutables, donc discutés ici plutôt que posés en dur ailleurs.
 */

export type SourceReseau = "sandre" | "gbif" | "hubeau" | "meteo" | "overpass" | "ign" | "autre";

export const DELAIS_MS: Record<SourceReseau, number> = {
  // ~1 Mo par classe, jusqu'à cinq classes en parallèle sur le même tuyau.
  sandre: 25_000,
  // ~540 ko mesurés pour 300 occurrences.
  gbif: 20_000,
  // Réponses courtes, mais l'API peut être lente ; 12 s reste large.
  hubeau: 12_000,
  // 2 ko. Attendre 12 s pour ça bloque l'Accueil sans raison.
  meteo: 8_000,
  // Le serveur Overpass est réglé à 25 s : le client doit lui laisser finir.
  overpass: 30_000,
  // Tuiles, servies unité par unité.
  ign: 12_000,
  autre: 12_000,
};

/**
 * Taille maximale d'un corps lu en mémoire, par source.
 *
 * Sans borne, une réponse anormale — source en vrac, portail captif renvoyant
 * une page volumineuse, redirection vers une erreur — est chargée entièrement
 * dans la mémoire d'un téléphone. Les bornes sont posées AU-DESSUS de ce que la
 * source rend réellement : une borne trop basse couperait une réponse valide,
 * ce qui serait pire que pas de borne du tout.
 */
export const OCTETS_MAX: Record<SourceReseau, number> = {
  sandre: 4_000_000, // 973 ko mesurés pour une classe, ×4 de marge
  gbif: 3_000_000, // 537 ko mesurés
  hubeau: 2_000_000,
  meteo: 500_000, // 2 ko mesurés
  overpass: 4_000_000,
  ign: 2_000_000,
  autre: 2_000_000,
};

export function delaiPour(source: SourceReseau): number {
  return DELAIS_MS[source] ?? DELAIS_MS.autre;
}

export function octetsMaxPour(source: SourceReseau): number {
  return OCTETS_MAX[source] ?? OCTETS_MAX.autre;
}

/** Le corps dépassait la borne. Distinct d'une absence de données : un écran
 *  qui confondrait les deux afficherait « aucune station » sur une source qui a
 *  bel et bien répondu. */
export class CorpsTropGrand extends Error {
  constructor(readonly borne: number) {
    super(
      `Réponse trop volumineuse (au-delà de ${Math.round(borne / 1000)} ko) — la source a répondu, mais l'application a arrêté la lecture.`,
    );
    this.name = "CorpsTropGrand";
  }
}

/**
 * Lit le JSON d'une réponse sans dépasser `maxOctets`.
 *
 * Lit par morceaux et s'arrête dès le dépassement, plutôt que d'appeler
 * `.json()` qui charge tout avant de pouvoir juger.
 */
export async function lireJsonBorne(res: Response, maxOctets: number): Promise<unknown> {
  const corps = res.body;
  // Certains environnements (et les réponses synthétiques) n'exposent pas de
  // flux. On retombe alors sur une lecture complète, en vérifiant après coup —
  // moins bien, mais pas moins juste.
  if (!corps) {
    const t = await res.text();
    if (t.length > maxOctets) throw new CorpsTropGrand(maxOctets);
    return JSON.parse(t);
  }
  const lecteur = corps.getReader();
  const morceaux: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxOctets) {
      await lecteur.cancel();
      throw new CorpsTropGrand(maxOctets);
    }
    morceaux.push(value);
  }
  const tout = new Uint8Array(total);
  let i = 0;
  for (const m of morceaux) {
    tout.set(m, i);
    i += m.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(tout));
}
