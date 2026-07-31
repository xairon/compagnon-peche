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
    licence: "non établie",
    url: "https://geoservices.ign.fr/",
    etat: "non-verifiee",
    verifieLe: "",
    mention: "Fonds cartographiques : © IGN-F / Géoplateforme.",
    reserve:
      "La page des services de diffusion redirige vers cartes.gouv.fr et la licence applicable aux tuiles n'a pas été établie le 31/07/2026. La mention © IGN-F est affichée sur la carte ; la licence reste à vérifier.",
  },
  {
    source: "DDT / GéoIDE (couches réglementaires)",
    hotes: ["ogc.geo-ide.developpement-durable.gouv.fr"],
    licence: "non établie",
    url: "https://www.geo-ide.developpement-durable.gouv.fr/",
    etat: "non-verifiee",
    verifieLe: "",
    mention: "Catégories piscicoles et réserves : services WMS des DDT (GéoIDE).",
    reserve: "Licence de réutilisation non relevée le 31/07/2026.",
  },
  {
    source: "Géopêche (FNPF)",
    hotes: ["map.geopeche.com"],
    licence: "non établie",
    url: "https://www.geopeche.com/",
    etat: "non-verifiee",
    verifieLe: "",
    mention: "Carte « Officielle » : Géopêche, fournie par la FNPF, affichée en cadre externe.",
    reserve:
      "Affichée en iframe sans réutilisation des données ; aucune licence n'a été relevée le 31/07/2026.",
  },
];
