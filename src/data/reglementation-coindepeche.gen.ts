// GÉNÉRÉ par scripts/scrape-coindepeche-reglementation.mjs — ne pas éditer à la main.
//
// Source : coindepeche.fr, consulté le 31/07/2026.
// 96 fiches départementales lues sur 96 annoncées par le sitemap.
//
// Ce ne sont PAS des arrêtés préfectoraux. Le site écrit lui-même, au bas de
// chaque fiche : « Ces informations sont données à titre indicatif pour la
// saison 2026. Consultez l'arrêté préfectoral de votre département. »
// Tout affichage de ces valeurs doit citer coindepeche.fr et cette date.

import type { RegDeptCdp } from "../lib/coindepeche";

/** Date de consultation, au format JJ/MM/AAAA, telle qu'elle doit être citée. */
export const CDP_CONSULTE_LE = "31/07/2026";

/** Nombre de fiches annoncées par le sitemap au moment de la collecte. Écart
 *  avec REG_COINDEPECHE.length = fiches non lues, et il faut le dire. */
export const CDP_FICHES_ANNONCEES = 96;

export const REG_COINDEPECHE: RegDeptCdp[] = [
  { code:"01", nom:"Ain", url:"https://www.coindepeche.fr/reglementation/01-ain", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"02", nom:"Aisne", url:"https://www.coindepeche.fr/reglementation/02-aisne", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
  ] },
  { code:"2A", nom:"Corse-du-Sud", url:"https://www.coindepeche.fr/reglementation/2a-corse-du-sud", especes:[
    { espece:"Truite", ouverture:"21 mars 2026", fermeture:"20 septembre 2026", tailleMin:"25 cm", quotaJour:"6", note:"Ouverture décalée en zone de montagne." },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"2B", nom:"Haute-Corse", url:"https://www.coindepeche.fr/reglementation/2b-haute-corse", especes:[
    { espece:"Truite", ouverture:"21 mars 2026", fermeture:"20 septembre 2026", tailleMin:"25 cm", quotaJour:"6", note:"Ouverture décalée en zone de montagne." },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"03", nom:"Allier", url:"https://www.coindepeche.fr/reglementation/03-allier", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"04", nom:"Alpes-de-Haute-Provence", url:"https://www.coindepeche.fr/reglementation/04-alpes-de-haute-provence", especes:[
    { espece:"Truite", ouverture:"21 mars 2026", fermeture:"20 septembre 2026", tailleMin:"25 cm", quotaJour:"6", note:"Ouverture décalée en zone de montagne." },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"05", nom:"Hautes-Alpes", url:"https://www.coindepeche.fr/reglementation/05-hautes-alpes", especes:[
    { espece:"Truite", ouverture:"21 mars 2026", fermeture:"20 septembre 2026", tailleMin:"25 cm", quotaJour:"6", note:"Ouverture décalée en zone de montagne." },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"06", nom:"Alpes-Maritimes", url:"https://www.coindepeche.fr/reglementation/06-alpes-maritimes", especes:[
    { espece:"Truite", ouverture:"21 mars 2026", fermeture:"20 septembre 2026", tailleMin:"25 cm", quotaJour:"6", note:"Ouverture décalée en zone de montagne." },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"07", nom:"Ardèche", url:"https://www.coindepeche.fr/reglementation/07-ardeche", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"08", nom:"Ardennes", url:"https://www.coindepeche.fr/reglementation/08-ardennes", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"09", nom:"Ariège", url:"https://www.coindepeche.fr/reglementation/09-ariege", especes:[
    { espece:"Truite", ouverture:"21 mars 2026", fermeture:"20 septembre 2026", tailleMin:"25 cm", quotaJour:"6", note:"Ouverture décalée en zone de montagne." },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"10", nom:"Aube", url:"https://www.coindepeche.fr/reglementation/10-aube", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"11", nom:"Aude", url:"https://www.coindepeche.fr/reglementation/11-aude", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"12", nom:"Aveyron", url:"https://www.coindepeche.fr/reglementation/12-aveyron", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"13", nom:"Bouches-du-Rhône", url:"https://www.coindepeche.fr/reglementation/13-bouches-du-rhone", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"14", nom:"Calvados", url:"https://www.coindepeche.fr/reglementation/14-calvados", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Saumon", ouverture:"15 avril 2026", fermeture:"31 juillet 2026", tailleMin:"50 cm", quotaJour:"1", note:"Quota annuel limité par arrêté préfectoral. Déclaration obligatoire." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"15", nom:"Cantal", url:"https://www.coindepeche.fr/reglementation/15-cantal", especes:[
    { espece:"Truite", ouverture:"21 mars 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"6", note:"Ouverture décalée en zone de montagne." },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"16", nom:"Charente", url:"https://www.coindepeche.fr/reglementation/16-charente", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"17", nom:"Charente-Maritime", url:"https://www.coindepeche.fr/reglementation/17-charente-maritime", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"18", nom:"Cher", url:"https://www.coindepeche.fr/reglementation/18-cher", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"19", nom:"Corrèze", url:"https://www.coindepeche.fr/reglementation/19-correze", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Saumon", ouverture:"1 avril 2026", fermeture:"31 juillet 2026", tailleMin:"50 cm", quotaJour:"1", note:"Quota annuel limité par arrêté préfectoral. Déclaration obligatoire." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"21", nom:"Côte-d'Or", url:"https://www.coindepeche.fr/reglementation/21-cote-dor", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"22", nom:"Côtes-d'Armor", url:"https://www.coindepeche.fr/reglementation/22-cotes-darmor", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Saumon", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"50 cm", quotaJour:"2", note:"Quota annuel limité par arrêté préfectoral. Déclaration obligatoire." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"23", nom:"Creuse", url:"https://www.coindepeche.fr/reglementation/23-creuse", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Saumon", ouverture:"1 avril 2026", fermeture:"31 juillet 2026", tailleMin:"50 cm", quotaJour:"1", note:"Quota annuel limité par arrêté préfectoral. Déclaration obligatoire." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"24", nom:"Dordogne", url:"https://www.coindepeche.fr/reglementation/24-dordogne", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Saumon", ouverture:"1 avril 2026", fermeture:"31 juillet 2026", tailleMin:"50 cm", quotaJour:"1", note:"Quota annuel limité par arrêté préfectoral. Déclaration obligatoire." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"25", nom:"Doubs", url:"https://www.coindepeche.fr/reglementation/25-doubs", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"26", nom:"Drôme", url:"https://www.coindepeche.fr/reglementation/26-drome", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"27", nom:"Eure", url:"https://www.coindepeche.fr/reglementation/27-eure", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"28", nom:"Eure-et-Loir", url:"https://www.coindepeche.fr/reglementation/28-eure-et-loir", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"29", nom:"Finistère", url:"https://www.coindepeche.fr/reglementation/29-finistere", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Saumon", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"50 cm", quotaJour:"2", note:"Quota annuel limité par arrêté préfectoral. Déclaration obligatoire." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"30", nom:"Gard", url:"https://www.coindepeche.fr/reglementation/30-gard", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"31", nom:"Haute-Garonne", url:"https://www.coindepeche.fr/reglementation/31-haute-garonne", especes:[
    { espece:"Truite", ouverture:"21 mars 2026", fermeture:"20 septembre 2026", tailleMin:"25 cm", quotaJour:"6", note:"Ouverture décalée en zone de montagne." },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"32", nom:"Gers", url:"https://www.coindepeche.fr/reglementation/32-gers", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"33", nom:"Gironde", url:"https://www.coindepeche.fr/reglementation/33-gironde", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"34", nom:"Hérault", url:"https://www.coindepeche.fr/reglementation/34-herault", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"35", nom:"Ille-et-Vilaine", url:"https://www.coindepeche.fr/reglementation/35-ille-et-vilaine", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Saumon", ouverture:"1 avril 2026", fermeture:"31 août 2026", tailleMin:"50 cm", quotaJour:"1", note:"Quota annuel limité par arrêté préfectoral. Déclaration obligatoire." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"36", nom:"Indre", url:"https://www.coindepeche.fr/reglementation/36-indre", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"37", nom:"Indre-et-Loire", url:"https://www.coindepeche.fr/reglementation/37-indre-et-loire", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"38", nom:"Isère", url:"https://www.coindepeche.fr/reglementation/38-isere", especes:[
    { espece:"Truite", ouverture:"21 mars 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"6", note:"Ouverture décalée en zone de montagne." },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"39", nom:"Jura", url:"https://www.coindepeche.fr/reglementation/39-jura", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"40", nom:"Landes", url:"https://www.coindepeche.fr/reglementation/40-landes", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"41", nom:"Loir-et-Cher", url:"https://www.coindepeche.fr/reglementation/41-loir-et-cher", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"42", nom:"Loire", url:"https://www.coindepeche.fr/reglementation/42-loire", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"43", nom:"Haute-Loire", url:"https://www.coindepeche.fr/reglementation/43-haute-loire", especes:[
    { espece:"Truite", ouverture:"21 mars 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"6", note:"Ouverture décalée en zone de montagne." },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Saumon", ouverture:"1 avril 2026", fermeture:"31 juillet 2026", tailleMin:"50 cm", quotaJour:"1", note:"Quota annuel limité par arrêté préfectoral. Déclaration obligatoire." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"44", nom:"Loire-Atlantique", url:"https://www.coindepeche.fr/reglementation/44-loire-atlantique", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Saumon", ouverture:"1 avril 2026", fermeture:"31 juillet 2026", tailleMin:"50 cm", quotaJour:"1", note:"Quota annuel limité par arrêté préfectoral. Déclaration obligatoire." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"45", nom:"Loiret", url:"https://www.coindepeche.fr/reglementation/45-loiret", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"46", nom:"Lot", url:"https://www.coindepeche.fr/reglementation/46-lot", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"47", nom:"Lot-et-Garonne", url:"https://www.coindepeche.fr/reglementation/47-lot-et-garonne", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"48", nom:"Lozère", url:"https://www.coindepeche.fr/reglementation/48-lozere", especes:[
    { espece:"Truite", ouverture:"21 mars 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"6", note:"Ouverture décalée en zone de montagne." },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Saumon", ouverture:"1 avril 2026", fermeture:"31 juillet 2026", tailleMin:"50 cm", quotaJour:"1", note:"Quota annuel limité par arrêté préfectoral. Déclaration obligatoire." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"49", nom:"Maine-et-Loire", url:"https://www.coindepeche.fr/reglementation/49-maine-et-loire", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Saumon", ouverture:"15 avril 2026", fermeture:"31 juillet 2026", tailleMin:"50 cm", quotaJour:"1", note:"Quota annuel limité par arrêté préfectoral. Déclaration obligatoire." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"50", nom:"Manche", url:"https://www.coindepeche.fr/reglementation/50-manche", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Saumon", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"50 cm", quotaJour:"2", note:"Quota annuel limité par arrêté préfectoral. Déclaration obligatoire." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"51", nom:"Marne", url:"https://www.coindepeche.fr/reglementation/51-marne", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"52", nom:"Haute-Marne", url:"https://www.coindepeche.fr/reglementation/52-haute-marne", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"53", nom:"Mayenne", url:"https://www.coindepeche.fr/reglementation/53-mayenne", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"54", nom:"Meurthe-et-Moselle", url:"https://www.coindepeche.fr/reglementation/54-meurthe-et-moselle", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"55", nom:"Meuse", url:"https://www.coindepeche.fr/reglementation/55-meuse", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"56", nom:"Morbihan", url:"https://www.coindepeche.fr/reglementation/56-morbihan", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Saumon", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"50 cm", quotaJour:"2", note:"Quota annuel limité par arrêté préfectoral. Déclaration obligatoire." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"57", nom:"Moselle", url:"https://www.coindepeche.fr/reglementation/57-moselle", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"58", nom:"Nièvre", url:"https://www.coindepeche.fr/reglementation/58-nievre", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"59", nom:"Nord", url:"https://www.coindepeche.fr/reglementation/59-nord", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
  ] },
  { code:"60", nom:"Oise", url:"https://www.coindepeche.fr/reglementation/60-oise", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"61", nom:"Orne", url:"https://www.coindepeche.fr/reglementation/61-orne", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Saumon", ouverture:"15 avril 2026", fermeture:"31 juillet 2026", tailleMin:"50 cm", quotaJour:"1", note:"Quota annuel limité par arrêté préfectoral. Déclaration obligatoire." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"62", nom:"Pas-de-Calais", url:"https://www.coindepeche.fr/reglementation/62-pas-de-calais", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
  ] },
  { code:"63", nom:"Puy-de-Dôme", url:"https://www.coindepeche.fr/reglementation/63-puy-de-dome", especes:[
    { espece:"Truite", ouverture:"21 mars 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"6", note:"Ouverture décalée en zone de montagne." },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Saumon", ouverture:"1 avril 2026", fermeture:"31 juillet 2026", tailleMin:"50 cm", quotaJour:"1", note:"Quota annuel limité par arrêté préfectoral. Déclaration obligatoire." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"64", nom:"Pyrénées-Atlantiques", url:"https://www.coindepeche.fr/reglementation/64-pyrenees-atlantiques", especes:[
    { espece:"Truite", ouverture:"21 mars 2026", fermeture:"20 septembre 2026", tailleMin:"25 cm", quotaJour:"6", note:"Ouverture décalée en zone de montagne." },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Saumon", ouverture:"21 mars 2026", fermeture:"31 juillet 2026", tailleMin:"50 cm", quotaJour:"1", note:"Quota annuel limité par arrêté préfectoral. Déclaration obligatoire." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"65", nom:"Hautes-Pyrénées", url:"https://www.coindepeche.fr/reglementation/65-hautes-pyrenees", especes:[
    { espece:"Truite", ouverture:"21 mars 2026", fermeture:"20 septembre 2026", tailleMin:"25 cm", quotaJour:"6", note:"Ouverture décalée en zone de montagne." },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"66", nom:"Pyrénées-Orientales", url:"https://www.coindepeche.fr/reglementation/66-pyrenees-orientales", especes:[
    { espece:"Truite", ouverture:"21 mars 2026", fermeture:"20 septembre 2026", tailleMin:"25 cm", quotaJour:"6", note:"Ouverture décalée en zone de montagne." },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"67", nom:"Bas-Rhin", url:"https://www.coindepeche.fr/reglementation/67-bas-rhin", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"68", nom:"Haut-Rhin", url:"https://www.coindepeche.fr/reglementation/68-haut-rhin", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"69", nom:"Rhône", url:"https://www.coindepeche.fr/reglementation/69-rhone", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"70", nom:"Haute-Saône", url:"https://www.coindepeche.fr/reglementation/70-haute-saone", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"71", nom:"Saône-et-Loire", url:"https://www.coindepeche.fr/reglementation/71-saone-et-loire", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"72", nom:"Sarthe", url:"https://www.coindepeche.fr/reglementation/72-sarthe", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"73", nom:"Savoie", url:"https://www.coindepeche.fr/reglementation/73-savoie", especes:[
    { espece:"Truite", ouverture:"21 mars 2026", fermeture:"20 septembre 2026", tailleMin:"25 cm", quotaJour:"6", note:"Ouverture décalée en zone de montagne." },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"74", nom:"Haute-Savoie", url:"https://www.coindepeche.fr/reglementation/74-haute-savoie", especes:[
    { espece:"Truite", ouverture:"21 mars 2026", fermeture:"20 septembre 2026", tailleMin:"25 cm", quotaJour:"6", note:"Ouverture décalée en zone de montagne." },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"75", nom:"Paris", url:"https://www.coindepeche.fr/reglementation/75-paris", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
  ] },
  { code:"76", nom:"Seine-Maritime", url:"https://www.coindepeche.fr/reglementation/76-seine-maritime", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"77", nom:"Seine-et-Marne", url:"https://www.coindepeche.fr/reglementation/77-seine-et-marne", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
  ] },
  { code:"78", nom:"Yvelines", url:"https://www.coindepeche.fr/reglementation/78-yvelines", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
  ] },
  { code:"79", nom:"Deux-Sèvres", url:"https://www.coindepeche.fr/reglementation/79-deux-sevres", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"80", nom:"Somme", url:"https://www.coindepeche.fr/reglementation/80-somme", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
  ] },
  { code:"81", nom:"Tarn", url:"https://www.coindepeche.fr/reglementation/81-tarn", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"82", nom:"Tarn-et-Garonne", url:"https://www.coindepeche.fr/reglementation/82-tarn-et-garonne", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"83", nom:"Var", url:"https://www.coindepeche.fr/reglementation/83-var", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"84", nom:"Vaucluse", url:"https://www.coindepeche.fr/reglementation/84-vaucluse", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"85", nom:"Vendée", url:"https://www.coindepeche.fr/reglementation/85-vendee", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"86", nom:"Vienne", url:"https://www.coindepeche.fr/reglementation/86-vienne", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Anguille", ouverture:"1 avril 2026", fermeture:"15 septembre 2026", tailleMin:"12 cm", quotaJour:null, note:"Anguille jaune uniquement. Civelle interdite. Quotas stricts par arrêté préfectoral." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"87", nom:"Haute-Vienne", url:"https://www.coindepeche.fr/reglementation/87-haute-vienne", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Saumon", ouverture:"1 avril 2026", fermeture:"31 juillet 2026", tailleMin:"50 cm", quotaJour:"1", note:"Quota annuel limité par arrêté préfectoral. Déclaration obligatoire." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"88", nom:"Vosges", url:"https://www.coindepeche.fr/reglementation/88-vosges", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"89", nom:"Yonne", url:"https://www.coindepeche.fr/reglementation/89-yonne", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"90", nom:"Territoire de Belfort", url:"https://www.coindepeche.fr/reglementation/90-territoire-de-belfort", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
    { espece:"Ombre commun", ouverture:"16 mai 2026", fermeture:"20 septembre 2026", tailleMin:"30 cm", quotaJour:"3", note:null },
    { espece:"Écrevisse", ouverture:"11 juillet 2026", fermeture:"20 septembre 2026", tailleMin:null, quotaJour:null, note:"Écrevisse à pattes blanches protégée. Seule l'écrevisse américaine peut être pêchée toute l'année." },
  ] },
  { code:"91", nom:"Essonne", url:"https://www.coindepeche.fr/reglementation/91-essonne", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
  ] },
  { code:"92", nom:"Hauts-de-Seine", url:"https://www.coindepeche.fr/reglementation/92-hauts-de-seine", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
  ] },
  { code:"93", nom:"Seine-Saint-Denis", url:"https://www.coindepeche.fr/reglementation/93-seine-saint-denis", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
  ] },
  { code:"94", nom:"Val-de-Marne", url:"https://www.coindepeche.fr/reglementation/94-val-de-marne", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
  ] },
  { code:"95", nom:"Val-d'Oise", url:"https://www.coindepeche.fr/reglementation/95-val-doise", especes:[
    { espece:"Truite", ouverture:"14 mars 2026", fermeture:"20 septembre 2026", tailleMin:"23 cm", quotaJour:"6", note:null },
    { espece:"Carnassier", ouverture:"25 avril 2026", fermeture:"31 janvier 2027", tailleMin:"50 cm", quotaJour:"3", note:"Brochet : 60 cm min. Sandre : 50 cm min. Black-bass : 30 cm min." },
  ] },
];
