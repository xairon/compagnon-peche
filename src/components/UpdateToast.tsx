import { joursDAttente, type DossierMaj } from "../lib/maj-sw";
import { useNow } from "../lib/now";

/**
 * Le bandeau de mise à jour — le seul endroit où le report se décide.
 *
 * `lib/maj-sw.ts` pose la règle (trois reports de vingt-quatre heures, puis
 * plus rien) et `lib/pwa.ts` la branche, mais l'écran n'offrait que « Mettre à
 * jour ». Sans « Plus tard », le report existait sans que personne puisse
 * l'exercer : on refusait la mise à jour en laissant le bandeau couvrir
 * l'écran, au bord de l'eau, indéfiniment et sans que rien ne le compte.
 *
 * Les deux états disent des choses différentes. Tant qu'un report reste, le
 * bandeau annonce et s'efface. Une fois épuisé, il explique pourquoi il
 * insiste, avec le nombre de jours que `joursDAttente` calcule — pas une
 * formule d'ambiance : cette app affiche des tailles légales, des périodes
 * d'ouverture et des espèces qu'il est interdit de remettre à l'eau vivantes,
 * et « depuis 8 jours » est vérifiable là où « depuis un moment » ne l'est pas.
 *
 * Ce qu'il ne fait jamais : appliquer la mise à jour de lui-même. Le brouillon
 * de prise n'est pas persisté (`brouillon-prise-non-persiste`), donc un
 * rechargement décidé par l'app effacerait une saisie en cours. La borne
 * pousse, elle ne décide pas à la place.
 *
 * L'heure vient de `useNow()`, jamais de `Date.now()` en plein rendu.
 */
export function UpdateToast({
  maj,
  reportable,
  onApply,
  onReport,
}: {
  maj: DossierMaj | null;
  reportable: boolean;
  onApply: () => void;
  onReport: () => void;
}) {
  const now = useNow();
  const jours = joursDAttente(maj, now);
  // Trois reports occupent trois jours : arriver à la limite le jour même
  // suppose une horloge revenue en arrière ou un dossier trafiqué. La durée
  // n'est alors plus digne de foi, le nombre de reports l'est encore — et
  // « attend depuis 0 jours » serait la durée inventée qu'on cherche à éviter.
  const attente =
    jours >= 1
      ? `attend depuis ${jours} jour${jours > 1 ? "s" : ""}`
      : `a déjà été reportée ${maj?.reports ?? 0} fois`;
  return (
    <div className="update-toast" role="status">
      {reportable ? (
        <span>Nouvelle version disponible</span>
      ) : (
        <span>Cette version corrige l'app et {attente}.</span>
      )}
      {reportable && (
        <button className="toast-2nd" onClick={onReport}>
          Plus tard
        </button>
      )}
      <button onClick={onApply}>Mettre à jour</button>
    </div>
  );
}
