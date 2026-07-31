import type { CarteDePeche } from "./carte-peche";

/** Le sous-ensemble du profil qui décrit la carte de pêche. Volontairement
 *  structurel plutôt qu'un import de `Profile` : cette fonction est pure et
 *  n'a pas besoin du reste. */
export interface ProfilCarte {
  /** Ancien champ : l'année civile, seule information que portaient les profils
   *  avant l'ajout du type de carte. */
  carteAnnee?: number;
  carte?: CarteDePeche;
}

/**
 * La carte décrite par un profil, ancienne forme comprise.
 *
 * Une année nue ne peut être qu'une annuelle : c'est la seule chose que l'app
 * savait enregistrer avant, et c'est ce que les écrans en faisaient déjà. La
 * lire autrement inventerait une information ; ne pas la lire ferait
 * disparaître le rappel d'échéance de pêcheurs qui l'avaient.
 */
export function carteDuProfil(p: ProfilCarte): CarteDePeche | undefined {
  if (p.carte) return p.carte;
  if (p.carteAnnee) return { type: "annuelle", annee: p.carteAnnee };
  return undefined;
}
