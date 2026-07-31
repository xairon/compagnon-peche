// Réserve d'identification pour les espèces « base » qui n'auraient pas de
// section `ident` propre. Elle est VIDE, et c'est intentionnel.
//
// Historique : ce module portait 58 entrées (10 lignées cryptiques écrites à la
// main + 48 générées et sourcées DORIS/FFESSM, INPN/MNHN, OFB, FishBase), soit
// 42 838 octets embarqués dans le chunk principal. Les 58 visaient toutes des
// espèces qui ont DÉJÀ leur propre `ident` : `Fiche.tsx` fait
// `sp.ident || IDENT[sp.id]` et la branche de droite n'était jamais atteinte —
// depuis que les 104 fiches base couvrent tout le catalogue, aucune des 129
// espèces n'arrive sans identification. Ce n'était donc plus une réserve mais un
// second corpus concurrent, invisible, et jamais confronté au premier : c'est là
// que s'était logée l'inversion du critère toxostome/hotu, et il contenait deux
// affirmations de droit (« Espèce PROTÉGÉE — remise à l'eau ») que les gardes de
// fiches.test.ts interdisent aux fiches et n'inspectaient pas ici.
//
// La garde qui autorise ce vide est fiches.test.ts, « aucune espèce ne dépend de
// la réserve d'identification » : si une régénération de species-base.ts
// réintroduit une espèce sans fiche, ce test échoue AVANT que l'écran n'affiche
// une fiche sans section Identification.
//
// Le module et son export subsistent parce que `src/screens/Fiche.tsx:19` les
// importe encore. Retirer cet import, puis ce fichier, appartient au lot qui
// possède les écrans.

import type { Confusion } from "../types";

export interface IdentInfo {
  summary: string;
  traits: string[];
  conf: Confusion[];
}

export const IDENT: Record<string, IdentInfo> = {};
