// Identification overlay for the generated "base" species (those without a
// hand-curated `ident` in species.ts). Same shape as Species.ident. Rendered on
// the fiche when the species has no curated identification section.
//
// Morphological facts are sourced (FishBase, DORIS/FFESSM, INPN/MNHN); nothing is
// invented. Cryptic species (recently-split regional lineages) are described
// honestly as field-indistinguishable from their common relative.

import type { Confusion } from "../types";
import { IDENT_GEN } from "./identification.gen";

export interface IdentInfo {
  summary: string;
  traits: string[];
  conf: Confusion[];
}

const CRYPTIC = (common: string, extra: string): Confusion => ({
  n: common,
  how: `Indissociable de ${common.toLowerCase()} à l'œil sur le terrain — ${extra}`,
});

// Hand-written cryptic/regional lineages (agents can't add field keys that don't
// exist). Merged with the generated, sourced set (IDENT_GEN wins on any overlap).
const CRYPTIC_IDENT: Record<string, IdentInfo> = {
  // ── Espèces cryptiques (lignées régionales récemment séparées) ──────────────
  "goujon-occitan": {
    summary:
      "Goujon endémique du bassin de la Garonne, quasi identique au goujon commun ; petit cyprinidé fuselé de fond avec une paire de barbillons.",
    traits: [
      "Corps fuselé, museau arrondi, une paire de barbillons aux coins de la bouche",
      "Ligne de grosses taches sombres le long du flanc",
      "C'est surtout l'aire de répartition (Sud-Ouest) qui le distingue",
    ],
    conf: [CRYPTIC("Goujon", "distinction par la répartition (bassin Garonne) et la génétique.")],
  },
  "goujon-auvergne": {
    summary:
      "Goujon endémique du Massif central (haut bassin de la Loire/Allier), morphologiquement très proche du goujon commun.",
    traits: [
      "Corps fuselé de fond, une paire de barbillons",
      "Flancs à taches sombres alignées",
      "Distinction essentiellement géographique (Auvergne) et génétique",
    ],
    conf: [CRYPTIC("Goujon", "distinction par la répartition (Massif central) et la génétique.")],
  },
  "goujon-ukraine": {
    summary:
      "Goujon à nageoires claires (Romanogobio), corps plus élancé et museau plus long que le goujon commun ; en expansion par les canaux.",
    traits: [
      "Corps plus fin et allongé que le goujon commun",
      "Barbillons longs, atteignant le bord de l'œil",
      "Nageoires généralement plus claires (peu ou pas tachetées)",
    ],
    conf: [
      {
        n: "Goujon",
        how: "Romanogobio a un corps plus fin, des barbillons plus longs et des nageoires moins tachetées — distinction fine, à confirmer.",
      },
    ],
  },
  "chevesne-catalan": {
    summary:
      "Chevesne endémique du Roussillon/Catalogne, indissociable à l'œil du chevesne commun ; cyprinidé robuste à grosse tête et grande bouche.",
    traits: [
      "Corps épais cylindrique, grosse tête, large bouche",
      "Grosses écailles, nageoires souvent orangées",
      "Distinction essentiellement géographique (extrême Sud) et génétique",
    ],
    conf: [CRYPTIC("Chevesne", "distinction par la répartition (Roussillon) et la génétique.")],
  },
  "vairon-basque": {
    summary: "Vairon endémique du Sud-Ouest (bassin de l'Adour), quasi identique au vairon commun.",
    traits: ["Petit cyprinidé fuselé sans barbillons", "Bande et taches sombres sur le flanc", "Distinction géographique (Adour) et génétique"],
    conf: [CRYPTIC("Vairon", "distinction par la répartition (Sud-Ouest) et la génétique.")],
  },
  "vairon-de-garonne": {
    summary: "Vairon endémique du bassin de la Garonne, indissociable à l'œil du vairon commun.",
    traits: ["Petit cyprinidé fuselé sans barbillons", "Bande et taches sombres sur le flanc", "Distinction géographique (Garonne) et génétique"],
    conf: [CRYPTIC("Vairon", "distinction par la répartition (bassin Garonne) et la génétique.")],
  },
  "vairon-du-danube": {
    summary: "Vairon du complexe danubien, morphologiquement très proche du vairon commun.",
    traits: ["Petit cyprinidé fuselé sans barbillons", "Bande et taches sombres sur le flanc", "Distinction par la lignée/répartition et la génétique"],
    conf: [CRYPTIC("Vairon", "distinction par la lignée (bassin danubien) et la génétique.")],
  },
  "vairon-du-languedoc": {
    summary: "Vairon endémique du Languedoc/pourtour méditerranéen, quasi identique au vairon commun.",
    traits: ["Petit cyprinidé fuselé sans barbillons", "Bande et taches sombres sur le flanc", "Distinction géographique (Languedoc) et génétique"],
    conf: [CRYPTIC("Vairon", "distinction par la répartition (Languedoc) et la génétique.")],
  },
  "vandoise-du-bearn": {
    summary:
      "Vandoise endémique du Sud-Ouest (bassin de l'Adour), semblable à la vandoise commune ; cyprinidé élancé argenté. Espèce PROTÉGÉE — remise à l'eau.",
    traits: [
      "Corps élancé et argenté, petite bouche infère, museau arrondi",
      "Nageoires souvent jaunâtres/orangées",
      "Distinction essentiellement géographique (Adour) et génétique",
    ],
    conf: [CRYPTIC("Vandoise", "distinction par la répartition (Sud-Ouest) et la génétique. Protégée dans tous les cas.")],
  },
  "vandoise-rostree": {
    summary:
      "Vandoise endémique du Sud-Ouest (bassins Garonne/Adour), au museau un peu plus pointu ; proche de la vandoise commune. Espèce PROTÉGÉE — remise à l'eau.",
    traits: [
      "Corps fuselé argenté, museau légèrement rostré",
      "Petite bouche infère",
      "Distinction géographique (Sud-Ouest) et génétique",
    ],
    conf: [CRYPTIC("Vandoise", "distinction par la répartition et la génétique. Protégée dans tous les cas.")],
  },
};

// Merge: the generated sourced set overrides the hand-written cryptic set on any
// shared id (none overlap today, but keep gen authoritative).
export const IDENT: Record<string, IdentInfo> = { ...CRYPTIC_IDENT, ...IDENT_GEN };
