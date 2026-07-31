/**
 * Identité de l'éditeur et de l'hébergeur — le volet des mentions légales que
 * l'app ne portait nulle part.
 *
 * ── Sur les marqueurs « à compléter » ──────────────────────────────────────
 * L'agent qui a écrit ce fichier ne connaît ni l'éditeur de l'app, ni son
 * statut. Inventer un nom aurait produit des mentions FAUSSES, c'est-à-dire
 * pires que creuses : une mention légale mensongère engage plus qu'une mention
 * absente. Ces champs portent donc `A_COMPLETER`, et deux garde-fous les
 * rendent impossibles à oublier :
 *   1. l'écran Mentions affiche lui-même, en clair, la liste de ce qui manque ;
 *   2. `Mentions.test.tsx` fait échouer la suite tant que le marqueur subsiste
 *      sur une version 1.x — et `.github/workflows/deploy.yml` lance `npm test`
 *      AVANT de publier sur Pages, donc la barrière bloque réellement la mise
 *      en ligne, elle n'est pas décorative.
 * Remplir les deux constantes marquées ci-dessous lève les deux garde-fous.
 */

import { CONTACT } from "../lib/diagnostic";

/** Marqueur d'un champ que seul le propriétaire de l'app peut renseigner. */
export const A_COMPLETER = "à compléter";

export interface Identite {
  /** Nom, pseudonyme ou raison sociale de l'éditeur du service. */
  editeur: string;
  /** Particulier, association, société… — les obligations n'y sont pas les mêmes. */
  statut: string;
  /** Moyen de contact publié, sous forme d'URL. */
  contact: string;
  /** Dénomination de l'hébergeur. */
  hebergeur: string;
  /** Adresse postale de l'hébergeur. */
  hebergeurAdresse: string;
  /** URL publique du service. */
  siteUrl: string;
}

export const IDENTITE: Identite = {
  // ▼▼ À RENSEIGNER PAR LE PROPRIÉTAIRE DE L'APP ▼▼
  editeur: A_COMPLETER,
  statut: A_COMPLETER,
  // ▲▲ tant que ces deux lignes portent le marqueur, `npm test` échoue ▲▲

  // Établi, pas supposé : le canal de correction publié par l'app existe déjà
  // (src/lib/diagnostic.ts) et c'est le seul contact qu'elle expose aujourd'hui.
  // Le remplacer par un `mailto:` reste possible — mais publier une adresse
  // personnelle dans une app cliente la livre à tous les moissonneurs.
  contact: CONTACT,

  // Établi à la source le 31/07/2026 :
  //  · l'hébergeur est GitHub Pages — c'est ce que déploie
  //    .github/workflows/deploy.yml (actions/deploy-pages), pas une hypothèse ;
  //  · « GitHub, Inc. » est la dénomination donnée par les conditions
  //    d'utilisation de GitHub (docs.github.com, section A.7) ;
  //  · l'adresse est celle publiée par la déclaration de confidentialité de
  //    GitHub, section « Contact us » (docs.github.com).
  hebergeur: "GitHub, Inc. — GitHub Pages",
  hebergeurAdresse: "88 Colin P. Kelly Jr. St., San Francisco, CA 94107, États-Unis",

  // Vérifiée le 31/07/2026 : l'URL répond 200, manifeste compris.
  siteUrl: "https://xairon.github.io/compagnon-peche/",
};

const LIBELLES: Record<keyof Identite, string> = {
  editeur: "l'éditeur",
  statut: "le statut de l'éditeur",
  contact: "le contact",
  hebergeur: "l'hébergeur",
  hebergeurAdresse: "l'adresse de l'hébergeur",
  siteUrl: "l'adresse du service",
};

/**
 * Les champs restés au marqueur, en clair.
 *
 * Un champ VIDE compte comme non renseigné : sinon il suffirait d'effacer
 * « à compléter » pour faire taire la barrière sans rien avoir rempli.
 */
export function champsACompleter(id: Identite): string[] {
  return (Object.keys(LIBELLES) as (keyof Identite)[])
    .filter((k) => id[k].trim() === "" || id[k].trim() === A_COMPLETER)
    .map((k) => LIBELLES[k]);
}
