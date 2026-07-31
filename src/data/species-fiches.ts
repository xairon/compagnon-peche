import type { Species } from "../types";
import { SPECIES } from "./species";
import { withFiche } from "./fiches";

/**
 * Le catalogue enrichi de ses sections descriptives.
 *
 * SEUL module qui importe `data/fiches/**` de façon statique — et c'est ce qui
 * sauve les garde-fous. Les tests de cohérence (fiches.test.ts,
 * edibility-health.test.ts, accueil-carrousel.test.ts) l'importent tel quel et
 * voient donc exactement ce que l'écran Fiche affiche ; l'app, elle, y accède
 * par `import()`. Un seul chemin de données, deux façons d'y arriver.
 *
 * Si un jour ce fichier est importé statiquement ailleurs, les 182 ko
 * reviennent dans le chargement initial sans que rien ne le signale — le test
 * `species-fiches.test.ts` garde ce point.
 */
export const SPECIES_FICHES: Species[] = SPECIES.map(withFiche);
