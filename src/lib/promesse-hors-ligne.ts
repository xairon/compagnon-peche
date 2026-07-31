import type { EtatReserve } from "./reserve-hors-ligne";

/**
 * Ce que l'app a le droit de promettre quand elle est hors-ligne.
 *
 * Le précache est passé de 250 entrées / 7860 Kio à 29 / 2737 Kio : le noyau
 * s'installe seul, les 221 illustrations arrivent ensuite en réserve. C'est un
 * vrai gain — un install interrompu en 4G laissait auparavant une app qui
 * promettait le hors-ligne devant des écrans vides.
 *
 * Mais la phrase affichée n'avait pas bougé : « Hors-ligne — toutes les fiches
 * restent disponibles », sans condition. Elle était vraie par accident, parce
 * que sans précache complet l'app ne démarrait pas du tout. Elle ne l'est plus
 * pendant que la réserve se remplit — et promettre une capacité qu'on n'a pas
 * encore est exactement le défaut que tout ce dépôt traque.
 *
 * Ce qui reste vrai dans TOUS les cas, et qu'il faut donc dire plutôt que de
 * laisser croire à une panne : le texte des fiches et les données
 * réglementaires sont dans le noyau. Seules les photos peuvent manquer.
 */
export interface PromesseHorsLigne {
  /** Vrai quand il n'y a plus rien à attendre. */
  complet: boolean;
  texte: string;
}

export function promesseHorsLigne(r: EtatReserve): PromesseHorsLigne {
  // Rien à télécharger : annoncer « 0 sur 0 » ferait croire à un
  // téléchargement en panne.
  if (r.total === 0 || r.complete) {
    return { complet: true, texte: "Hors-ligne — toutes les fiches restent disponibles" };
  }
  const socle = "Hors-ligne — fiches, règles et réglementation disponibles";
  // Un téléchargement arrêté sur des échecs ne reprendra pas tout seul : le
  // présenter « en cours » ferait attendre pour rien.
  const suite = r.enCours
    ? `photos en cours de téléchargement (${r.presents} sur ${r.total})`
    : `photos incomplètes (${r.presents} sur ${r.total})`;
  return { complet: false, texte: `${socle} · ${suite}` };
}
