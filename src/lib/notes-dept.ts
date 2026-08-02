import type { Species } from "../types";
import { SPECIES } from "../data/species";
import { ECREVISSES } from "../data/ecrevisses";

export interface DeptNotesResult {
  /** Notes du département qui nomment cette espèce. */
  espece: string[];
  /** Notes qui nomment une AUTRE créature du catalogue — poisson ou écrevisse. */
  autresEspeces: string[];
  /** Notes qui ne nomment aucune créature : elles valent pour tout le monde. */
  generales: string[];
}

/**
 * Répartit les notes d'un arrêté départemental entre « concerne cette espèce »
 * et « le reste du département ».
 *
 * Ce module existe parce que la fiche espèce affichait `dr.notes.slice(0, 2)`.
 * Sur les données réelles : 13 notes pour les trois départements couverts, dont
 * 7 jamais affichées (1/3 dans la Creuse, 4/6 dans l'Indre, 2/4 dans le
 * Loir-et-Cher). La note black-bass de l'Indre est à l'indice 2 — elle dit
 * « Dans le doute, relâchez », et personne ne l'a jamais lue.
 *
 * L'INVARIANT : espece + autresEspeces + generales contient TOUJOURS
 * l'intégralité des notes reçues. Cette fonction ne masque rien — elle range.
 *
 * Il a d'abord servi à autoriser les erreurs : tant que tout était affiché, se
 * tromper de poisson n'avait aucune conséquence réglementaire. La fiche ne
 * montre plus `autresEspeces` (une note sandre n'a rien à faire sur une fiche
 * gardon), donc l'argument ne tient plus tel quel — et l'invariant compte
 * désormais davantage, pas moins : il garantit que le tri seul décide, et que la
 * décision de cacher vit à un seul endroit, dans l'écran, pas ici.
 *
 * Ce qui rend le masquage acceptable est la DISSYMÉTRIE des défaillances : une
 * note dont la créature n'est pas reconnue tombe dans `generales` et s'affiche
 * partout — bruyante, jamais silencieuse. Rien ne peut être masqué sans avoir
 * été rattaché à une créature connue du catalogue.
 */
export function deptNotes(notes: string[], sp: Species): DeptNotesResult {
  const termes = termesEspece(sp);
  const espece: string[] = [];
  const autresEspeces: string[] = [];
  const generales: string[] = [];
  for (const n of notes) {
    const t = normalise(n);
    if (termes.some((m) => m.test(t))) espece.push(n);
    else if (TERMES_CREATURES.some((m) => m.test(t))) autresEspeces.push(n);
    else generales.push(n);
  }
  return { espece, autresEspeces, generales };
}

/**
 * Les notes de l'arrêté qui nomment une écrevisse.
 *
 * Elles quittent les fiches poisson par `autresEspeces` et n'ont aucune autre
 * fiche où atterrir : le catalogue écrevisses est séparé. Sans ce point de
 * sortie vers l'écran Écrevisses, l'interdiction de pêche des écrevisses à
 * pattes blanches disparaîtrait purement et simplement de l'application.
 */
export function notesEcrevisses(notes: string[]): string[] {
  return notes.filter((n) => {
    const t = normalise(n);
    return TERMES_ECREVISSES.some((m) => m.test(t));
  });
}

/** Minuscules, sans accents, séparateurs uniformisés : « Black-bass » et
 *  « black bass » doivent se reconnaître. */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // marques diacritiques décomposées par NFD
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Qualificatifs qui reviennent dans les noms d'espèces sans rien désigner : les
 * laisser accrocherait n'importe quelle note. Chacun de ceux-ci a été retiré
 * après avoir produit un rattachement faux sur les données réelles :
 *
 *  · « poisson » — « Poisson-chat » captait « poisson mort manié » ;
 *  · « rouge »   — « Carassin doré (poisson rouge) » captait la note sur les
 *                  écrevisses « à pattes blanches, rouges et grêles » ;
 *  · « argentée »— « Carpe argentée » captait « Anguille argentée interdite » ;
 *  · « roche »   — « Crapet de roche » captait la note black-bass, qui cite les
 *                  retenues de Roche-au-Moine et Roche-Bat-l'Aigue.
 *
 * Une couleur ou un lieu n'identifie pas une espèce dans un texte d'arrêté.
 */
const MOTS_VIDES = new Set([
  "poisson",
  "poissons",
  "commun",
  "commune",
  "communs",
  "communes",
  "europeen",
  "europeenne",
  "atlantique",
  "mediterraneen",
  "mediterraneenne",
  "feinte",
  "grande",
  "grand",
  "petite",
  "petit",
  "fluviatile",
  "glane",
  "soleil",
  // Couleurs et qualificatifs de robe.
  "rouge",
  "rouges",
  "blanche",
  "blanches",
  "noire",
  "noires",
  "dore",
  "doree",
  "argente",
  "argentee",
  "argentees",
  // Lieux qui apparaissent dans les noms d'espèces comme dans les arrêtés.
  "roche",
  "roches",
]);

/**
 * Les mots du nom de l'espèce assez distinctifs pour la reconnaître dans une
 * phrase d'arrêté : au moins 5 lettres, hors qualificatifs. Un arrêté écrit
 * « la maille truite », pas « la maille truite fario » — c'est le mot-tête qui
 * porte l'identification, pas le nom complet.
 *
 * Le mot doit apparaître entier (au pluriel ou au féminin près) : « brochetons »
 * n'est pas « brochet ».
 */
function termesEspece(sp: Species): RegExp[] {
  return termesDeNoms([sp.name]);
}

/** Les mots distinctifs d'un ensemble de noms, dédoublonnés puis compilés. */
function termesDeNoms(noms: readonly string[]): RegExp[] {
  const mots = new Set<string>();
  for (const nom of noms) {
    for (const w of normalise(nom).split(" ")) {
      if (w.length >= 5 && !MOTS_VIDES.has(w)) mots.add(w);
    }
  }
  return [...mots].map((w) => new RegExp(`(^| )${w}(e?s)?( |$)`));
}

/**
 * Le vocabulaire des écrevisses, et celui de TOUTES les créatures du catalogue.
 *
 * Les deux catalogues sont séparés dans l'app, et c'est ce qui a produit le seul
 * faux positif du classement : « Écrevisses à pattes blanches, rouges et grêles :
 * pêche fermée toute l'année » ne nomme aucun poisson. Interrogé sur les 129
 * fiches poisson seules, ce texte passait pour une règle générale — il se serait
 * affiché sur chacune d'elles.
 *
 * Construits une fois au chargement : `deptNotes` est appelée à chaque rendu de
 * fiche, recompiler deux cents expressions à chaque fois serait absurde.
 */
const TERMES_ECREVISSES = termesDeNoms(ECREVISSES.map((e) => e.name));
const TERMES_CREATURES = [...termesDeNoms(SPECIES.map((s) => s.name)), ...TERMES_ECREVISSES];
