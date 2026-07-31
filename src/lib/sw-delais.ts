import { DELAIS_MS, type SourceReseau } from "./net-bornes";

/**
 * Délais réseau du service worker, par source.
 *
 * Deux budgets décrivaient la même attente sans se parler : celui de `fetchT`
 * dans l'app, et le `networkTimeoutSeconds` du service worker dans
 * vite.config.ts. Quand le second est plus court, il coupe le réseau et sert le
 * cache — VIDE à la première visite. C'est ce qui faisait que la couche
 * hydrographie n'apparaissait jamais au premier lancement : 6 s de service
 * worker pour une classe de CoursEau de 973 ko.
 *
 * La règle : le service worker ne coupe jamais avant l'app. Un test compare les
 * deux tables et échoue si l'un des deux budgets bouge seul.
 *
 * Ce fichier est importé par vite.config.ts — il doit rester dans
 * tsconfig.node.json, comme lib/csp.ts, sinon le build casse.
 */
export const SW_DELAIS_S: Record<SourceReseau, number> = {
  sandre: DELAIS_MS.sandre / 1000, // 973 ko par classe
  gbif: DELAIS_MS.gbif / 1000, // 537 ko pour 300 occurrences
  hubeau: DELAIS_MS.hubeau / 1000,
  meteo: DELAIS_MS.meteo / 1000,
  overpass: DELAIS_MS.overpass / 1000, // le serveur travaille jusqu'à 25 s
  ign: DELAIS_MS.ign / 1000,
  autre: DELAIS_MS.autre / 1000,
};
