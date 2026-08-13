/**
 * Validation des mesures d'une prise (taille / poids).
 *
 * BUG-01 / BUG-02 du rapport QA 2026-08-11 (docs/qa/2026-08-11-qa-carnet.md) :
 * le formulaire acceptait les tailles négatives et les valeurs extrêmes
 * (999999), corrompant les statistiques (record affiché à 999999 cm).
 *
 * Règles :
 *  - taille : entier de 1 à MAX_TAILLE_CM. 300 cm ne rejette aucune prise réelle
 *    plausible (record du monde du silure : 2,85 m) tout en écartant les
 *    valeurs aberrantes.
 *  - poids : décimal (virgule française acceptée), strictement positif,
 *    plafonné à MAX_POIDS_KG (150 kg — record du monde du silure : ~130 kg).
 *  - champ vide = mesure absente (pas d'erreur : la taille et le poids restent
 *    facultatifs au bord de l'eau).
 */

export const MAX_TAILLE_CM = 300;
export const MAX_POIDS_KG = 150;

export type MesureResult<T> = { value: T | null; erreur: string | null };

const ERREUR_TAILLE = `La taille doit être un nombre entier entre 1 et ${MAX_TAILLE_CM} cm.`;
const ERREUR_POIDS = `Le poids doit être un nombre entre 0 et ${MAX_POIDS_KG} kg (ex. 1,8).`;

export function parseTaille(texte: string): MesureResult<number> {
  const t = texte.trim();
  if (t === "") return { value: null, erreur: null };
  if (!/^\d{1,3}$/.test(t)) return { value: null, erreur: ERREUR_TAILLE };
  const cm = parseInt(t, 10);
  if (cm < 1 || cm > MAX_TAILLE_CM) return { value: null, erreur: ERREUR_TAILLE };
  return { value: cm, erreur: null };
}

export function parsePoids(texte: string): MesureResult<number> {
  const t = texte.trim().replace(",", ".");
  if (t === "") return { value: null, erreur: null };
  if (!/^\d+(\.\d+)?$/.test(t)) return { value: null, erreur: ERREUR_POIDS };
  const kg = parseFloat(t);
  if (!(kg > 0) || kg > MAX_POIDS_KG) return { value: null, erreur: ERREUR_POIDS };
  return { value: kg, erreur: null };
}

/**
 * Taille prise en compte pour le « Record (cm) » du carnet : ignore les valeurs
 * hors bornes (données corrompues saisies avant la validation, ex. 999999).
 */
export function tailleRecordValide(cm: number): boolean {
  return cm >= 1 && cm <= MAX_TAILLE_CM;
}
