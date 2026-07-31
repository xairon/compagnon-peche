/**
 * Sous quelle licence l'app réutilise chaque source, et ce qu'elle doit citer.
 *
 * ODbL et CC BY font de l'attribution une CONDITION de la redistribution, pas
 * une politesse : l'app affichait ses données sans créditer OpenStreetMap,
 * Open-Meteo ni Eaufrance. Un test lie cette liste aux hôtes réellement appelés
 * (pris dans la CSP) : ajouter une source sans la créditer casse la CI.
 *
 * Trois états, parce qu'il y en a trois :
 *   verifiee      — licence et version relevées à la source, à la date indiquée
 *   sans-version  — la source nomme sa licence mais ne publie pas de version
 *   non-verifiee  — pas trouvé ; on le dit plutôt que de recopier une hypothèse
 */

export type EtatLicence = "verifiee" | "sans-version" | "non-verifiee";

export interface LicenceDonnees {
  /** Nom affiché de la source. */
  source: string;
  /** Hôtes correspondants, tels qu'ils apparaissent dans la CSP. */
  hotes: string[];
  licence: string;
  /** Lien vers le TEXTE de la licence — l'exigence de CC BY et d'ODbL. */
  url: string;
  etat: EtatLicence;
  /** Date de vérification à la source, JJ/MM/AAAA. */
  verifieLe: string;
  /** Mention à afficher, telle que la licence la demande. */
  mention: string;
  /** Vrai quand la licence varie d'un enregistrement à l'autre (GBIF). */
  parEnregistrement?: boolean;
  /** Ce qui n'a pas pu être établi, quand c'est le cas. */
  reserve?: string;
}

export const LICENCES_DONNEES: LicenceDonnees[] = [
  {
    source: "OpenStreetMap (via Overpass)",
    hotes: ["overpass-api.de", "basemaps.cartocdn.com"],
    licence: "ODbL 1.0",
    url: "https://opendatacommons.org/licenses/odbl/1-0/",
    etat: "verifiee",
    verifieLe: "31/07/2026",
    mention: "© les contributeurs OpenStreetMap",
  },
  {
    source: "Open-Meteo",
    hotes: ["api.open-meteo.com"],
    licence: "CC BY 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
    etat: "verifiee",
    verifieLe: "31/07/2026",
    mention:
      "Météo : Open-Meteo, à partir des modèles des services météorologiques nationaux (Météo-France, DWD, ECMWF…).",
  },
  {
    source: "Sandre / Eaufrance",
    hotes: ["services.sandre.eaufrance.fr"],
    // Le site écrit textuellement « Sauf mention contraire, tous les contenus
    // de ce site sont sous licence etalab-2.0 ».
    licence: "Licence Ouverte / Open Licence 2.0 (Etalab)",
    url: "https://github.com/etalab/licence-ouverte/blob/master/LO.md",
    etat: "verifiee",
    verifieLe: "31/07/2026",
    mention: "Réseau hydrographique et ouvrages : Sandre (Eaufrance).",
  },
  {
    source: "Hub'Eau (OFB)",
    hotes: ["hubeau.eaufrance.fr"],
    // Les conditions générales renvoient à « la licence ouverte Etalab » et
    // demandent de citer l'auteur des jeux de données, SANS numéro de version.
    // Écrire « 2.0 » ici serait ajouter une précision que la source ne donne pas.
    licence: "Licence Ouverte Etalab",
    url: "https://www.etalab.gouv.fr/licence-ouverte-open-licence",
    etat: "sans-version",
    verifieLe: "31/07/2026",
    mention:
      "Hydrométrie, thermie, physico-chimie, écoulement et pêches scientifiques : Hub'Eau (OFB / Eaufrance).",
    reserve:
      "Les conditions générales de Hub'Eau nomment la licence ouverte Etalab sans en publier la version.",
  },
  {
    source: "GBIF",
    hotes: ["api.gbif.org"],
    licence: "variable — chaque occurrence porte la sienne",
    url: "https://www.gbif.org/terms",
    etat: "verifiee",
    verifieLe: "31/07/2026",
    parEnregistrement: true,
    mention:
      "Occurrences : GBIF. Chaque observation porte la licence de son jeu de données ; elle est affichée avec l'observation.",
    reserve:
      "Échantillon mesuré autour de Blois : 300 occurrences, 6 jeux de données, CC BY 4.0 — et du CC BY-NC 4.0 dans la même zone hors de nos taxons. NC n'autorise pas les mêmes usages que BY.",
  },
  {
    source: "IGN Géoplateforme",
    hotes: ["data.geopf.fr"],
    // Établie le 31/07/2026, en deux temps, parce que la source distingue les
    // deux : le SERVICE de diffusion ne porte aucune licence — les CGU de
    // cartes.gouv.fr (où geoservices.ign.fr/cgu-licences redirige désormais,
    // 301) écrivent « L'accès à une API ne confère aucun droit de propriété
    // intellectuelle sur l'API et sur les données mises à disposition via
    // l'API » et renvoient à « la licence choisie et renseignée par le
    // Fournisseur de données ». Ce sont donc les JEUX DE DONNÉES qui portent la
    // licence, et les fiches data.gouv.fr de PLAN IGN et de BD ORTHO® — les
    // deux fonds que la carte affiche — écrivent l'une et l'autre
    // « Licence Ouverte / Open Licence version 2.0 ».
    licence: "Licence Ouverte / Open Licence 2.0 (Etalab)",
    url: "https://www.etalab.gouv.fr/wp-content/uploads/2017/04/ETALAB-Licence-Ouverte-v2.0.pdf",
    etat: "verifiee",
    verifieLe: "31/07/2026",
    mention: "Fonds cartographiques : © IGN-F / Géoplateforme (Plan IGN, BD ORTHO®).",
    reserve:
      "Licence relevée sur les jeux de données (PLAN IGN et BD ORTHO®, fiches data.gouv.fr), pas sur le service de diffusion : les CGU de cartes.gouv.fr n'en posent aucune sur l'API elle-même. Aucune formule d'attribution imposée n'a été trouvée publiée par l'IGN ; « © IGN-F » est la mention que l'app affiche de son propre chef.",
  },
  {
    source: "DDT / GéoIDE (couches réglementaires)",
    hotes: ["ogc.geo-ide.developpement-durable.gouv.fr"],
    // GéoIDE ne publie PAS de licence de plateforme, et le dit lui-même dans
    // ses mentions légales : « La licence ouverte Etalab est applicable à de
    // nombreuses données publiées sur Géo-IDE. Elle est alors mentionnée
    // explicitement dans les fiches de métadonnées correspondantes. »
    // « De nombreuses », pas « toutes » : la licence se relève couche par
    // couche. Celle du Loir-et-Cher — le département principal de l'app — a été
    // ouverte le 31/07/2026 (CSW GetRecordById, fiche de N_CAT_PISCICOLE_L_041) :
    // « Licence Ouverte / Open Licence Version 2.0 », avec pour condition
    // « Utilisation libre sous réserve de mentionner les sources et la date de
    // sa dernière mise à jour ».
    licence: "Licence Ouverte / Open Licence 2.0 (Etalab)",
    url: "https://www.etalab.gouv.fr/wp-content/uploads/2017/04/ETALAB-Licence-Ouverte-v2.0.pdf",
    etat: "verifiee",
    verifieLe: "31/07/2026",
    mention: "Catégories piscicoles et réserves : services WMS des DDT (GéoIDE).",
    reserve:
      "Relevé sur une couche sur les dix que l'app appelle : la catégorie piscicole du Loir-et-Cher (fiche de métadonnées INSPIRE, 31/07/2026). GéoIDE ne publie aucune licence de plateforme et renvoie à chaque fiche ; les neuf autres couches n'ont pas été ouvertes. La formule d'attribution est fixée par chaque DDT et diffère de l'une à l'autre — celle du 41 exige la source ET la date de dernière mise à jour, que la carte n'affiche pas encore.",
  },
  {
    source: "Géopêche",
    hotes: ["map.geopeche.com"],
    licence: "non établie",
    url: "https://www.geopeche.com/",
    etat: "non-verifiee",
    verifieLe: "",
    // La mention disait « fournie par la FNPF ». La source dit autre chose :
    // geopeche.com/contact.php nomme « GEOPECHE - CREALEAD, 55, rue Saint
    // Cléophas, 34070 MONTPELLIER ». La FNPF n'y apparaît pas comme éditeur.
    // Attribuer un service à une fédération qui ne le publie pas est
    // exactement l'erreur que cette liste existe pour empêcher.
    mention:
      "Carte « Officielle » : Géopêche (GEOPECHE — CREALEAD, Montpellier), affichée en cadre externe.",
    reserve:
      "Aucune licence publiée : /mentions-legales et /cgu répondent 404 le 31/07/2026, et la seule déclaration du site est « COPYRIGHT © GEOPECHE 2016-2026 — Tous droits d'usage et de reproduction réservés », c'est-à-dire l'inverse d'une licence ouverte. Rien n'est publié non plus sur l'affichage en cadre externe. L'app n'en réutilise aucune donnée.",
  },
];
