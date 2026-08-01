import type { BesoinId } from "../types";

/**
 * Au bord de l'eau on ne cherche pas « l'albright », on cherche « comment relier
 * ma tresse à mon fluoro ». Ces cinq entrées couvrent les 15 fiches sans reste ;
 * l'ordre est celui de la rangée de filtres, du geste le plus courant au plus rare.
 */
export const BESOINS: { id: BesoinId; label: string }[] = [
  { id: "attacher", label: "Attacher un hameçon" },
  { id: "relier", label: "Relier deux fils" },
  { id: "boucle-fixe", label: "Faire une boucle" },
  { id: "au-fond", label: "Pêcher au fond" },
  { id: "entre-deux-eaux", label: "Entre deux eaux" },
];
