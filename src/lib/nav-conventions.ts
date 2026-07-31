// Conventions de navigation : une seule table qui dit, pour chaque écran, son
// chemin d'URL, le contexte qu'il réclame, et l'écran au-dessus de lui.
//
// Pourquoi une table. Avant ce lot, le contexte de navigation était posé et
// effacé au cas par cas : `nav()` n'effaçait qu'un champ sur huit, deux étaient
// effacés par l'écran qui les consomme (`focusSpot` dans Carte, `gearFocusId`
// dans Materiel), et cinq n'étaient jamais effacés du tout. Résultat : l'écran
// d'arrivée héritait d'identifiants dont il n'avait jamais entendu parler, et
// personne ne pouvait dire, en lisant le code, ce qu'un écran était censé
// trouver dans le store. La table répond aux deux questions au même endroit.
//
// Pourquoi le hash. `vite.config.ts` déclare `base: "./"` : l'app est servie
// depuis un sous-chemin sur GitHub Pages, qui ne sait pas réécrire les chemins
// inconnus vers index.html (elle répondrait 404 sur `/depot/espece/sandre`).
// Le hash traverse ça sans configuration serveur et reste valide quel que soit
// le sous-chemin — c'est ce qui rend un lien collable entre pêcheurs.
import type { Screen, Tab } from "../store";

/**
 * Les quatre destinations de la barre du bas. La liste vit ici et non dans le
 * store parce que c'est une propriété de la table des routes : c'est elle qui
 * décide où s'arrête la remontée de `ongletDe`.
 */
export const TABS: readonly Tab[] = ["accueil", "especes", "carte", "carnet"];

/**
 * Le vocabulaire des étapes du parcours « Ma prise », défini ICI parce que
 * c'est un mot d'URL avant d'être un état : `#/prise/sandre/maille`. Le type
 * `PriseStep` du store en découle, et non l'inverse — sinon la validation d'un
 * lien devrait importer le store, qui importe déjà ce module.
 */
export const PRISE_ETAPES = ["statut", "maille", "quota", "choix", "kill", "release"] as const;

/**
 * Les champs de l'état qui désignent QUOI l'écran doit ouvrir. Onze, contre
 * vingt-sept écrans : la plupart des écrans n'en réclament aucun.
 *
 * Ne sont PAS du contexte de navigation, délibérément : `ans` (réponses de
 * l'identifieur), `q` / `filter` (recherche en cours), `carnetSeg` (onglet
 * interne du carnet), `prisePlace` (le spot d'où le parcours a été lancé, qui
 * ne dit rien de l'endroit affiché). Ils survivent aux navigations.
 */
export const CTX_CHAMPS = [
  "spId",
  "recipeId",
  "knotId",
  "techId",
  "catchSlot",
  "focusSpot",
  "gearFocusId",
  "bilanSession",
  "cookStep",
  "priseSp",
  "priseStep",
] as const;

export type CtxChamp = (typeof CTX_CHAMPS)[number];
export type PriseEtape = (typeof PRISE_ETAPES)[number];

/** Le contexte de navigation complet, tel qu'il vit dans l'état du store. */
export type Ctx = {
  [K in Exclude<CtxChamp, "cookStep" | "priseStep">]: string | null;
} & { cookStep: number; priseStep: PriseEtape | null };

/** L'état « rien d'ouvert » — aussi la valeur de remise à zéro. */
export const CTX_DEFAUT: Ctx = {
  spId: null,
  recipeId: null,
  knotId: null,
  techId: null,
  catchSlot: null,
  focusSpot: null,
  gearFocusId: null,
  bilanSession: null,
  cookStep: 0,
  priseSp: null,
  priseStep: null,
};

/**
 * Identifiants sans lesquels l'écran existe quand même : ils ne font que
 * désigner quoi ouvrir en arrivant. `#/carte` est un lien valide ; `#/espece`
 * ne l'est pas, il n'afficherait qu'une fiche vide.
 *
 * Ce sont aussi, ce n'est pas un hasard, des identifiants LOCAUX à l'appareil
 * (un spot, une carte matériel dépliée, une séance d'écrevisses) : un lien qui
 * les porte a du sens au rechargement, pas d'un téléphone à l'autre. Les
 * identifiants obligatoires, eux, sont globaux (espèce, recette, nœud,
 * technique) — sauf `catchSlot`, prise personnelle, gardée obligatoire parce
 * qu'un écran de prise sans prise n'a rien à montrer.
 */
export const CTX_FACULTATIFS: readonly CtxChamp[] = [
  "focusSpot",
  "gearFocusId",
  "bilanSession",
  "cookStep",
  "priseSp",
  "priseStep",
];

export interface Route {
  /** Segment d'URL après « #/ ». Vide pour l'accueil. */
  path: string;
  /** Champs de contexte que l'écran réclame, dans l'ordre des segments d'URL. */
  ctx?: readonly CtxChamp[];
  /** Où remonte le « ‹ » quand rien ne précède dans l'historique. */
  parent?: Screen;
}

export const ROUTES: Record<Screen, Route> = {
  accueil: { path: "" },
  especes: { path: "especes" },
  identify: { path: "identifier", parent: "especes" },
  fiche: { path: "espece", ctx: ["spId"], parent: "especes" },
  // Le parcours de décision est une SUITE d'endroits, pas un endroit unique :
  // chacune de ses cinq questions mérite son entrée d'historique, pour que le
  // geste retour d'Android recule d'une question au lieu de sortir du parcours
  // — c'était le dernier écran où ce geste et le « ‹ » de l'app divergeaient.
  //
  // Pourquoi pas le même verdict que la cuisine, qui est UN endroit dont
  // l'étape n'est qu'une correction (`replace`) : là-bas l'étape est une
  // position de lecture, jusqu'à vingt, et sortir coûterait vingt gestes. Ici
  // il y en a cinq au plus, et chacune est une RÉPONSE du pêcheur — reculer
  // dessus, c'est défaire une décision, ce qu'un geste retour est censé faire.
  //
  // L'espèce voyage avec l'étape parce qu'une étape sans son poisson n'a
  // aucune carte à afficher (`priseView` rend `null`) — même raison que
  // `catchSlot`, sauf qu'ici les deux sont facultatifs : `#/prise` seul est le
  // choix d'espèce, et c'est un lien valide.
  prise: { path: "prise", ctx: ["priseSp", "priseStep"] },
  carnet: { path: "carnet" },
  outils: { path: "outils" },
  noeuds: { path: "noeuds", parent: "outils" },
  knot: { path: "noeud", ctx: ["knotId"], parent: "noeuds" },
  recette: { path: "recette", ctx: ["recipeId"], parent: "carnet" },
  reglement: { path: "reglementation" },
  sources: { path: "sources", parent: "outils" },
  "mentions-legales": { path: "mentions-legales", parent: "outils" },
  credits: { path: "credits", parent: "outils" },
  guides: { path: "guides", parent: "outils" },
  // La règle graduée trace la maille d'UN poisson : celui que le parcours tient
  // en main. Sans ce champ réclamé, `nav("regle")` depuis l'étape « maille »
  // effacerait l'espèce et la règle mesurerait celle d'un autre.
  regle: { path: "regle", ctx: ["priseSp"] },
  // Le seul écran à deux champs : la recette guidée ET l'étape en cours, pour
  // qu'un rechargement en pleine cuisine (les mains sales, l'écran qui s'éteint)
  // reprenne à l'étape 7 et pas au début.
  cuisine: { path: "cuisine", ctx: ["recipeId", "cookStep"], parent: "recette" },
  carte: { path: "carte", ctx: ["focusSpot"] },
  materiel: { path: "materiel", parent: "outils" },
  "guide-materiel": { path: "guide-materiel", ctx: ["gearFocusId"], parent: "materiel" },
  technique: { path: "technique", ctx: ["techId"], parent: "carnet" },
  statistiques: { path: "statistiques", parent: "carnet" },
  // « prise » est déjà pris par le parcours de décision : une prise déjà
  // enregistrée est une « capture ».
  "prise-detail": { path: "capture", ctx: ["catchSlot"], parent: "carnet" },
  "outils-terrain": { path: "outils-terrain", parent: "outils" },
  stockage: { path: "stockage", parent: "outils" },
  ecrevisses: { path: "ecrevisses", ctx: ["bilanSession"], parent: "carnet" },
  "ecrevisses-ident": { path: "ecrevisses-identifier", parent: "ecrevisses" },
};

const PAR_CHEMIN = new Map<string, Screen>(
  (Object.keys(ROUTES) as Screen[]).map((e) => [ROUTES[e].path, e]),
);

/**
 * Le patch qui remet à zéro tout le contexte que `cible` ne réclame pas.
 * Les champs réclamés sont ABSENTS du patch (et non pas recopiés) : l'appelant
 * de `nav()` les fournit lui-même, et un champ absent ne peut pas écraser une
 * valeur passée explicitement.
 */
export function contexteNettoye(cible: Screen): Partial<Ctx> {
  const reclames = new Set<CtxChamp>(ROUTES[cible].ctx ?? []);
  const patch: Record<string, unknown> = {};
  for (const champ of CTX_CHAMPS) {
    if (!reclames.has(champ)) patch[champ] = CTX_DEFAUT[champ];
  }
  return patch as Partial<Ctx>;
}

/** L'écran au-dessus. L'accueil est son propre parent : c'est là que ça s'arrête. */
export function ecranParent(e: Screen): Screen {
  return ROUTES[e].parent ?? "accueil";
}

/**
 * L'onglet de la barre du bas qui doit s'allumer pour cet écran, en remontant
 * la chaîne des parents jusqu'à en trouver un.
 *
 * Utilisé pour les LIENS PROFONDS et pour le repli du « ‹ », c'est-à-dire quand
 * il n'y a pas d'origine à préserver. Une navigation ordinaire, elle, garde
 * l'onglet d'où l'on vient : ouvrir une recette depuis une fiche espèce laisse
 * « Espèces » allumé, parce que c'est de là qu'on est parti et que c'est là que
 * le retour ramène.
 */
export function ongletDe(e: Screen): Tab {
  let cur = e;
  // Garde-fou : la chaîne des parents la plus longue mesure trois pas
  // (ecrevisses-ident → ecrevisses → carnet), le test vérifie qu'aucune ne
  // boucle. Ce plafond n'est là que pour qu'une table mal éditée ne fige pas
  // le rendu.
  for (let i = 0; i <= Object.keys(ROUTES).length; i++) {
    if ((TABS as readonly string[]).includes(cur)) return cur as Tab;
    const p = ecranParent(cur);
    if (p === cur) break;
    cur = p;
  }
  return "accueil";
}

/** `#/espece/sandre`. Toujours relatif : voir la note sur `base: "./"` en tête. */
export function versUrl(ecran: Screen, ctx: Ctx): string {
  const r = ROUTES[ecran];
  const segments = (r.ctx ?? []).map((c) => String(ctx[c] ?? ""));
  // Un identifiant facultatif resté à sa valeur par défaut ne s'écrit pas :
  // `#/carte`, pas `#/carte/`. On ne coupe qu'à la FIN, sinon le second segment
  // de la cuisine remonterait à la place du premier.
  while (segments.length > 0) {
    const dernier = (r.ctx ?? [])[segments.length - 1];
    const v = ctx[dernier];
    if (v === CTX_DEFAUT[dernier] || v === null || v === "") segments.pop();
    else break;
  }
  const chemin = [r.path, ...segments.map(encodeURIComponent)].filter((s) => s !== "").join("/");
  return "#/" + chemin;
}

/**
 * L'inverse. `null` quand l'URL ne désigne aucun écran connu, ou qu'il lui
 * manque un identifiant obligatoire : mieux vaut retomber sur l'accueil que
 * d'ouvrir un écran vide dont on ne sait pas sortir.
 */
export function depuisUrl(url: string): { screen: Screen; ctx: Ctx } | null {
  const brut = url.startsWith("#") ? url.slice(1) : url;
  const segments = brut.split("/").filter((s) => s !== "");
  if (segments.length === 0) return { screen: "accueil", ctx: { ...CTX_DEFAUT } };

  const ecran = PAR_CHEMIN.get(decodeURIComponent(segments[0]));
  if (!ecran) return null;

  const champs = ROUTES[ecran].ctx ?? [];
  const valeurs = segments.slice(1);
  if (valeurs.length > champs.length) return null;

  const ctx: Ctx = { ...CTX_DEFAUT };
  for (let i = 0; i < champs.length; i++) {
    const champ = champs[i];
    const brute = valeurs[i];
    if (brute === undefined) {
      // Absent : toléré seulement si le champ est facultatif.
      if (!CTX_FACULTATIFS.includes(champ)) return null;
      continue;
    }
    if (champ === "cookStep") {
      const n = Number(decodeURIComponent(brute));
      ctx.cookStep = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
    } else if (champ === "priseStep") {
      // Une étape inventée n'a pas de carte : ni décision, ni choix d'espèce.
      // On refuse l'URL entière plutôt que d'ouvrir le parcours au milieu de
      // rien — l'appelant retombe sur l'accueil.
      const e = decodeURIComponent(brute) as PriseEtape;
      if (!PRISE_ETAPES.includes(e)) return null;
      ctx.priseStep = e;
    } else {
      ctx[champ] = decodeURIComponent(brute);
    }
  }
  return { screen: ecran, ctx };
}
