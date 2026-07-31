import type { PriseView } from "./prise";

/**
 * La phrase à annoncer quand le verdict de prise change.
 *
 * C'est la sortie la plus lourde de l'app — elle dit si on a le droit de garder
 * un poisson — et à l'écran elle n'existe que visuellement : une bannière
 * colorée, un cartouche, un titre, tous des `<div>`. Un lecteur d'écran n'en
 * reçoit rien au moment où le verdict tombe.
 *
 * Deux règles portent tout le fichier :
 *
 * 1. **La bannière d'abord.** C'est ce qui bloque la décision (« RELÂCHER »,
 *    « NE PAS RELÂCHER VIVANT »), lisible en moins de trois secondes à l'écran.
 *    Une annonce lit dans l'ordre : elle doit commencer par là, pas par le
 *    contexte.
 * 2. **Pas de capitales.** La bannière est en capitales par mise en forme, pas
 *    par contenu. Plusieurs synthèses vocales épellent un mot tout en capitales
 *    (« R, E, L, Â… ») ou changent d'intonation. Elle est donc remise en casse
 *    de phrase avant d'être annoncée — le texte lu est le même, la mise en
 *    forme reste à la feuille de style.
 *
 * Pur et sans dépendance au DOM : c'est la moitié qui pouvait vivre ici. La
 * région live qui la porte doit être posée dans `src/screens/Prise.tsx`.
 */
export function annonceVerdict(pv: PriseView | null): string {
  if (!pv) return "";

  const titre = (pv.title || "").trim();
  const banniere = pv.banner ? casseDePhrase(pv.banner.trim()) : "";

  if (!banniere) return titre;
  if (!titre) return banniere;
  // « RELÂCHER » puis « Relâcher — ne pas conserver » : la bannière est déjà
  // dans le titre, l'annoncer deux fois n'ajoute rien et retarde la suite.
  if (normalise(titre).startsWith(normalise(banniere))) return titre;

  return `${banniere} — ${titre}`;
}

/** « NE PAS RELÂCHER VIVANT » → « Ne pas relâcher vivant ». */
function casseDePhrase(s: string): string {
  if (s !== s.toLocaleUpperCase("fr-FR")) return s; // déjà en casse mixte : ne rien toucher
  const bas = s.toLocaleLowerCase("fr-FR");
  return bas.charAt(0).toLocaleUpperCase("fr-FR") + bas.slice(1);
}

function normalise(s: string): string {
  return s.toLocaleLowerCase("fr-FR");
}
