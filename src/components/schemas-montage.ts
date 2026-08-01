import type { ReactElement } from "react";
import { PaterNoster } from "./SchemaMontage";

/**
 * Quel montage a un schéma d'assemblage, et lequel.
 *
 * Registre séparé de `SchemaMontage.tsx` parce que ce n'est pas un composant :
 * un fichier qui exporte les deux perd le rafraîchissement à chaud (voir le
 * même partage entre `Media.tsx` et `media-helpers.ts`).
 *
 * Un id absent d'ici n'a pas de schéma : sa fiche montre sa séquence d'images,
 * ou à défaut son illustration unique.
 */
export const SCHEMAS: Record<string, () => ReactElement> = {
  paternoster: PaterNoster,
};
