import { useEffect, useRef } from "react";

/**
 * Ferme une feuille / un dialogue quand Échap est pressée.
 *
 * Pourquoi un hook plutôt qu'un `onKeyDown` sur la feuille : la touche n'atteint
 * l'élément que s'il a le focus, et une feuille qui vient de s'ouvrir ne l'a
 * pas — l'écouteur doit vivre sur `document`.
 *
 * `fermer` est gardée dans une ref : sans elle, une fonction recréée à chaque
 * rendu (le cas courant, `() => setOptions(null)`) désabonnerait et
 * réabonnerait l'écouteur à chaque frappe. Ici l'abonnement ne dépend que de
 * `actif`, et la dernière fermeture fournie est toujours celle qu'on appelle.
 */
export function useFermetureEchap(actif: boolean, fermer: () => void): void {
  const ref = useRef(fermer);
  // Écrite dans un effet, pas pendant le rendu : `react-hooks/refs` interdit le
  // second, et un rendu concurrent abandonné ne doit pas laisser derrière lui
  // une fermeture qui n'a jamais été validée.
  useEffect(() => {
    ref.current = fermer;
  });

  useEffect(() => {
    if (!actif) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ref.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [actif]);
}
