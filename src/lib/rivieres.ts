import { distKm, boxAroundKm } from "./geo";
import { fetchT } from "./net";
import { lireJsonBorne, octetsMaxPour } from "./net-bornes";
import { cleCours, DIST_MAX_MEME_COURS } from "./station";

/**
 * Quelles rivières le pêcheur peut désigner ici — et comment on sait que deux
 * codes venus de deux réseaux Hub'Eau désignent bien LA MÊME.
 *
 * POURQUOI CET ÉCRAN EXISTE. Jusqu'ici les conditions de l'eau étaient
 * entièrement automatiques : la station la plus proche répondait, quelle que
 * soit sa rivière, et le pêcheur n'avait aucun moyen de contredire l'app. C'est
 * le défaut fondateur de l'audit — une mesure du Cher affichée comme la
 * température de la Loire. `choisirStation(…, coursRef)` savait déjà privilégier
 * un cours d'eau de référence ; il manquait quelqu'un pour le nommer.
 *
 * CE QUE ÇA COÛTE, mesuré le 01/08/2026 autour de Blois (47,586 / 1,336), boîte
 * de 30 km, `fields` réduits au strict nécessaire :
 *
 *   qualite_rivieres/station_pc          114 stations   19 162 o
 *   hydrometrie/referentiel/stations      17 stations    3 383 o
 *   ─────────────────────────────────────────────────── 2 requêtes, 22,5 ko
 *
 * → 51 cours d'eau distincts, dont 6 à moins de 10 km. C'est demandé À
 * L'OUVERTURE DU SÉLECTEUR, jamais au chargement de l'Accueil : le tableau de
 * bord s'ouvre à chaque session, le sélecteur non.
 *
 * POURQUOI CES DEUX RÉSEAUX-LÀ. Ce sont les deux qui publient à la fois un
 * rattachement au cours d'eau et des coordonnées, et ils couvrent les trois
 * tuiles d'eau : l'hydrométrie donne le débit, la physico-chimie la température
 * (le réseau thermie dédié n'a QU'UNE station dans toute la boîte de Blois, et
 * elle est sur la Loire, déjà listée). ONDE n'y est pas non plus : cette tuile
 * annonce explicitement les PETITS cours d'eau du secteur, pas la rivière du
 * pêcheur, et elle nomme son propre ruisseau.
 */

/**
 * Rayon de la boîte demandée, en kilomètres.
 *
 * Il faut au moins la portée « même cours d'eau » : c'est celle qu'accorde
 * `choisirStation` à une station de la bonne rivière, et proposer une rivière
 * dont aucune station ne serait ensuite téléchargée serait une promesse creuse.
 * `DIST_MAX_MEME_COURS.hydro` vaut 40 km, mais 40 km coûtait 55,5 ko et rendait
 * 92 cours d'eau (mesuré) : 30 km couvre la température et la qualité en
 * entier, ramène la liste à 51 et la charge à 22,5 ko. Une station hydro de la
 * bonne rivière entre 30 et 40 km est donc hors liste — assumé, et écrit ici.
 */
export const PORTEE_RIVIERES_KM = 30;

/** Ce qu'une station dit de son cours d'eau, avant regroupement. */
export interface StationRiviere {
  /** Clé de cours d'eau préfixée par son référentiel (voir station.cleCours). */
  cle: string;
  /** Libellé publié par la source, ou "" quand elle n'en publie pas. */
  nom: string;
  /** Kilomètres depuis le point demandé. */
  dist: number;
}

/** Une rivière proposable au pêcheur. */
export interface Riviere {
  /** Libellé publié, tel quel. Jamais forgé. */
  nom: string;
  /** Toutes les clés qui la désignent, une par référentiel où elle a été vue. */
  cles: string[];
  /** Kilomètres jusqu'à la station connue la plus proche qui la désigne. */
  dist: number;
}

/** Le code nu, sans son préfixe de référentiel. */
function code(cle: string): string {
  const i = cle.indexOf(":");
  return i < 0 ? cle : cle.slice(i + 1);
}

/** Le référentiel seul. */
function referentiel(cle: string): string {
  const i = cle.indexOf(":");
  return i < 0 ? "?" : cle.slice(0, i);
}

/** Forme comparable d'un libellé : la casse et les espaces ne sont pas de
 *  l'information. Les accents, si — les deux réseaux publient les mêmes. */
function normaliser(nom: string): string {
  return nom.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Assemble un lot d'entrées en une rivière, ou null si aucune ne la nomme. */
function assembler(lot: StationRiviere[]): Riviere | null {
  const nom = lot.map((e) => e.nom.trim()).find((n) => n !== "");
  // Sans libellé, la rivière ne peut pas être proposée : écrire « Cours d'eau »
  // à sa place lui inventerait un nom, et le pêcheur choisirait à l'aveugle.
  // Il en existe — la boîte de 30 km à Blois en contient un à 9,7 km.
  if (!nom) return null;
  return {
    nom,
    cles: [...new Set(lot.map((e) => e.cle))],
    dist: Math.min(...lot.map((e) => e.dist)),
  };
}

/**
 * Regroupe les entrées de plusieurs réseaux en rivières, la plus proche d'abord.
 *
 * LA RÈGLE : même code ⇒ même rivière, SAUF si deux libellés non vides se
 * contredisent. Elle traverse donc les référentiels, ce que `cleCours` interdit
 * de faire à l'aveugle — d'où la mesure qui l'autorise, faite le 01/08/2026 sur
 * les codes présents DANS LES DEUX réseaux (CEA côté hydrométrie,
 * CoursEau_Carthage2017 côté physico-chimie) :
 *
 *   Blois, boîte de 40 km      19 codes communs, 19 libellés identiques
 *   Blois, boîte de 20 km       4 codes communs,  4 libellés identiques
 *   Châteauroux, boîte de 20 km 7 codes communs,  7 libellés identiques
 *   ─────────────────────────────────────────────────────────────────────
 *                              30 codes communs, 30 identiques, 0 désaccord
 *
 * Ce n'est pas « rapprocher deux sources par leur libellé », ce que le dépôt
 * refuse ailleurs : c'est exiger DEUX identifiants concordants, le code et le
 * nom. Il faudrait deux rivières différentes portant le même code ET le même
 * nom pour tromper la règle.
 *
 * Un libellé absent ne contredit rien — « un champ vide n'est pas un non ». Le
 * cas est réel : station_pc publie `K4814100` sans `nom_cours_eau`, quand
 * l'hydrométrie publie « La Masse » pour le même code. Les séparer priverait de
 * température le pêcheur qui choisit la Masse.
 *
 * Deux libellés qui se contredisent, en revanche, ÉCLATENT le code par
 * référentiel : aucun cas mesuré, mais fusionner au jugé referait exactement le
 * défaut que cet écran corrige.
 */
export function grouperRivieres(entrees: StationRiviere[]): Riviere[] {
  const parCode = new Map<string, StationRiviere[]>();
  for (const e of entrees) {
    if (!Number.isFinite(e.dist) || !e.cle) continue;
    const c = code(e.cle);
    const lot = parCode.get(c);
    if (lot) lot.push(e);
    else parCode.set(c, [e]);
  }

  const out: Riviere[] = [];
  for (const lot of parCode.values()) {
    const noms = new Set(lot.map((e) => normaliser(e.nom)).filter((n) => n !== ""));
    if (noms.size <= 1) {
      const r = assembler(lot);
      if (r) out.push(r);
      continue;
    }
    // Désaccord : le code ne suffit plus à identifier une rivière d'un
    // référentiel à l'autre. Chacun garde la sienne.
    const parRef = new Map<string, StationRiviere[]>();
    for (const e of lot) {
      const k = referentiel(e.cle);
      const l = parRef.get(k);
      if (l) l.push(e);
      else parRef.set(k, [e]);
    }
    for (const l of parRef.values()) {
      const r = assembler(l);
      if (r) out.push(r);
    }
  }
  // La plus proche d'abord ; à égalité, l'ordre alphabétique, pour que deux
  // ouvertures du sélecteur ne renvoient pas deux listes différentes.
  return out.sort((a, b) => a.dist - b.dist || a.nom.localeCompare(b.nom, "fr"));
}

/**
 * Ne garde que les candidats rattachés à la rivière choisie.
 *
 * STRICT, ET C'EST VOULU. Ailleurs dans l'app, une station sans rattachement
 * publié reste dans le lot ordinaire : ne pas savoir n'est pas être ailleurs
 * (voir station.Candidat). Ici le pêcheur a NOMMÉ sa rivière. Afficher sous ce
 * nom une station dont le cours d'eau est inconnu, ce serait affirmer ce qu'on
 * ne sait pas — et c'est précisément ce que ce choix existe pour empêcher.
 *
 * Filtrer AVANT `choisirStation` et non lui passer `coursRef` : le repli de
 * `choisirStation` rend la station la plus proche toutes rivières confondues
 * quand la bonne rivière n'a rien à portée. C'est le bon comportement quand
 * l'app devine ; c'en est un mauvais quand le pêcheur a désigné.
 */
export function surLaRiviere<T extends { coursCode?: string }>(
  cands: T[],
  cles: string[],
): T[] {
  const jeu = new Set(cles.filter((c) => c));
  if (!jeu.size) return [];
  return cands.filter((c) => !!c.coursCode && jeu.has(c.coursCode));
}

const QUALITE = "https://hubeau.eaufrance.fr/api/v2/qualite_rivieres";
const HYDRO = "https://hubeau.eaufrance.fr/api/v2/hydrometrie";

/** Enveloppe Hub'Eau — voir hubeau.ts, même raison pour le `any` localisé. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Charge = { data?: any[] };

/** L'URL des stations physico-chimiques d'une boîte, réduites au rattachement. */
export function urlStationsPc(bbox: string): string {
  return (
    `${QUALITE}/station_pc?bbox=${bbox}&size=200` +
    `&fields=code_cours_eau,nom_cours_eau,uri_cours_eau,latitude,longitude`
  );
}

/** L'URL des stations hydrométriques en service d'une boîte, idem. */
export function urlStationsHydro(bbox: string): string {
  return (
    `${HYDRO}/referentiel/stations?bbox=${bbox}&en_service=true&size=200&format=json` +
    `&fields=code_cours_eau,libelle_cours_eau,uri_cours_eau,latitude_station,longitude_station`
  );
}

/** La boîte demandée aux deux réseaux, arrondie comme le reste de hubeau.ts. */
export function bboxRivieres(lat: number, lon: number): string {
  const { w, s, e, n } = boxAroundKm(lat, lon, PORTEE_RIVIERES_KM);
  return `${w.toFixed(4)},${s.toFixed(4)},${e.toFixed(4)},${n.toFixed(4)}`;
}

/**
 * Les rivières proposables autour d'un point, la plus proche d'abord.
 *
 * NE LÈVE JAMAIS. Une source qui tombe retire ses rivières de la liste, elle ne
 * vide pas le sélecteur : le pêcheur hors-ligne doit encore pouvoir garder la
 * rivière qu'il avait déjà choisie, et celui dont l'hydrométrie ne répond pas
 * doit encore pouvoir en choisir une avec ce que la physico-chimie sait.
 * Les deux sources muettes rendent `[]`, à l'écran d'en tirer les conséquences.
 */
export async function chargerRivieres(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<Riviere[]> {
  const bbox = bboxRivieres(lat, lon);
  const lire = async (url: string): Promise<Charge | null> => {
    try {
      const r = await fetchT(url, { signal, source: "hubeau" });
      if (!r.ok && r.status !== 206) return null;
      return (await lireJsonBorne(r, octetsMaxPour("hubeau"))) as Charge;
    } catch {
      return null;
    }
  };
  // En parallèle : les deux réponses sont indépendantes, et le sélecteur attend.
  const [pc, hy] = await Promise.all([lire(urlStationsPc(bbox)), lire(urlStationsHydro(bbox))]);

  const entrees: StationRiviere[] = [];
  const ajouter = (
    d: Record<string, unknown>,
    champNom: string,
    champLat: string,
    champLon: string,
  ) => {
    const cle = cleCours(d.code_cours_eau as string, d.uri_cours_eau as string);
    if (!cle) return;
    const la = Number(d[champLat]);
    const lo = Number(d[champLon]);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return;
    entrees.push({ cle, nom: String(d[champNom] || ""), dist: distKm(lat, lon, la, lo) });
  };
  for (const d of pc?.data || []) ajouter(d, "nom_cours_eau", "latitude", "longitude");
  for (const d of hy?.data || [])
    ajouter(d, "libelle_cours_eau", "latitude_station", "longitude_station");

  return grouperRivieres(entrees);
}

/** Ce que la portée « même cours d'eau » accorde, rappelé ici pour que le
 *  rapport entre la boîte du sélecteur et celle des mesures reste lisible. */
export const PORTEE_MEME_COURS = DIST_MAX_MEME_COURS;
