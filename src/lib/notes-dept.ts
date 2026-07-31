import type { Species } from "../types";

export interface DeptNotesResult {
  /** Notes du département qui nomment cette espèce. */
  espece: string[];
  /** Toutes les autres — affichées elles aussi, jamais coupées. */
  autres: string[];
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
 * L'invariant, et la seule chose qui compte vraiment ici : espece + autres
 * contient TOUJOURS l'intégralité des notes reçues. Le rattachement ne fait que
 * décider de l'ordre et du bloc. Se tromper de poisson n'a donc aucune
 * conséquence réglementaire — la note est affichée dans les deux cas — alors
 * qu'en couper une en avait une.
 */
export function deptNotes(notes: string[], sp: Species): DeptNotesResult {
  const termes = termesEspece(sp);
  const espece: string[] = [];
  const autres: string[] = [];
  for (const n of notes) {
    const t = normalise(n);
    (termes.some((m) => m.test(t)) ? espece : autres).push(n);
  }
  return { espece, autres };
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
  const mots = normalise(sp.name)
    .split(" ")
    .filter((w) => w.length >= 5 && !MOTS_VIDES.has(w));
  return [...new Set(mots)].map((w) => new RegExp(`(^| )${w}(e?s)?( |$)`));
}
