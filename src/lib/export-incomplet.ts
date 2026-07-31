// Ce que l'écran Stockage dit à l'utilisateur quand un export est parti amputé.
//
// `exportData` (lib/storage.ts) sait désormais survivre à une base illisible :
// il écrit ce qu'il a pu lire et rend `{ complet, lecturesEchouees }`. Reste à
// le dire — avec les mots de l'utilisateur, pas les noms de magasins.

import type { StoreName } from "./stores";

/** Typée sur STORES : ajouter un magasin sans lui donner de libellé ne compile
 *  pas. `photos` n'est pas dans STORES — exportData l'ajoute à part, quand
 *  l'énumération des clés de blobs échoue. */
const LIBELLES: Record<StoreName | "photos", string> = {
  catches: "les prises",
  spots: "les spots",
  gear: "le matériel",
  bundles: "les ensembles de matériel",
  profile: "le profil",
  recipes: "les recettes",
  crayfish: "les séances écrevisses",
  photos: "les photos",
};

/** Nom de magasin → ce que l'utilisateur appelle cette donnée. Réexposée en
 *  clé libre : `lecturesEchouees` est un `string[]`, et un nom venu d'une
 *  version plus récente du fichier ne doit pas planter la lecture. */
export const LIBELLE_MAGASIN: Record<string, string | undefined> = LIBELLES;

/** Phrase à afficher pour un export dont `complet` est faux.
 *
 *  Un nom sans libellé est repris tel quel plutôt qu'omis : afficher moins que
 *  ce qui manque est exactement l'erreur que ce message corrige. */
export function messageExportIncomplet(lecturesEchouees: string[]): string {
  const noms = lecturesEchouees.map((n) => LIBELLE_MAGASIN[n] ?? n);
  const liste =
    noms.length > 1 ? `${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]}` : noms[0];
  return (
    `Sauvegarde incomplète : l'appareil n'a pas rendu ${liste}. ` +
    `Le fichier téléchargé porte la mention « INCOMPLET » et contient le reste — ` +
    `il ne remplace pas une sauvegarde entière. Rechargez l'application, puis réexportez.`
  );
}
