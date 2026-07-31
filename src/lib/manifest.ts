/**
 * Le manifeste de la PWA.
 *
 * Sorti de vite.config.ts pour la même raison que la CSP (src/lib/csp.ts) et
 * que les délais du service worker (src/lib/sw-delais.ts) : ce qui vit dans la
 * config n'est vérifié par rien. Une icône annoncée et absente, un `id` qui
 * change, une capture d'écran fantôme — tout cela est invisible en dev (le
 * manifeste n'est produit qu'au build) et ne se voit qu'à l'installation, chez
 * l'utilisateur. `manifest.test.ts` confronte donc chaque chemin déclaré ici au
 * contenu réel de public/.
 */

export interface IconeManifest {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

export interface CaptureManifest {
  src: string;
  sizes: string;
  type: string;
  form_factor?: "narrow" | "wide";
  label?: string;
}

/**
 * Un raccourci du menu contextuel de l'icône installée (appui long).
 *
 * `ecran` n'est PAS une clé du manifeste web : c'est ce dont `url` est dérivée,
 * gardé pour qu'un renommage de route fasse tomber un test au lieu de produire
 * un raccourci mort. Il est retiré avant d'écrire le manifeste.
 */
export interface RaccourciManifest {
  ecran: string;
  name: string;
  short_name: string;
  description?: string;
  url: string;
  icons?: IconeManifest[];
}

export interface Manifest {
  id: string;
  name: string;
  short_name: string;
  description: string;
  lang: string;
  theme_color: string;
  background_color: string;
  display: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  orientation: "portrait" | "landscape" | "any";
  start_url: string;
  scope: string;
  icons: IconeManifest[];
  screenshots?: CaptureManifest[];
  shortcuts?: RaccourciManifest[];
}

export const MANIFEST: Manifest = {
  // L'identité de l'app installée. Sans `id`, elle est DÉDUITE de `start_url` :
  // le jour où celle-ci change, le navigateur voit une app différente,
  // l'installe à côté de l'ancienne avec son propre stockage, et le carnet de
  // prises de l'utilisateur disparaît de sa vue sans avoir été effacé. « ./ »
  // fige cette identité indépendamment du chemin de déploiement.
  id: "./",
  name: "Compagnon de pêche",
  short_name: "Pêche",
  description:
    "Fiches espèces, réglementation, cuisine et gestes de pêche en eau douce — hors-ligne.",
  lang: "fr",
  theme_color: "#16281E",
  background_color: "#FBFAF7",
  display: "standalone",
  orientation: "portrait",
  start_url: "./",
  scope: "./",
  icons: [
    { src: "favicon.svg", sizes: "any", type: "image/svg+xml" },
    { src: "icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],

  // `screenshots` : volontairement absent. La clé enrichit la fenêtre
  // d'installation de Chrome, mais elle exige de VRAIES captures de l'app ;
  // une capture déclarée et manquante casse cette fenêtre au lieu de
  // l'enrichir. Aucune n'a été produite ici, donc aucune n'est annoncée — le
  // test ci-contre vérifie que toute capture ajoutée un jour existe bien dans
  // public/. Les préférer en .jpg : globPatterns du service worker précache
  // png/svg/webp, et des captures jamais affichées dans l'app n'ont rien à
  // faire dans les 7,6 Mo du premier install.
};

/**
 * Raccourcis de l'icône installée (appui long sur Android).
 *
 * Absents jusqu'ici, et pour une bonne raison : ils exigent des liens profonds,
 * et `grep pushState|popstate` rendait 0. Quatre entrées de menu qui auraient
 * toutes atterri sur l'Accueil auraient été un mensonge d'interface. Le lot
 * navigation a livré les liens profonds des 27 écrans ; ils deviennent donc
 * possibles ET honnêtes, ce qui n'est pas la même chose.
 *
 * Les URL sont DÉRIVÉES de la table de routes (`versUrl`), jamais recopiées :
 * un renommage de route ferait sinon un raccourci mort, sans rien casser
 * ailleurs. Elles restent relatives (`./#/…`) parce que `base: "./"` — l'app
 * n'est pas servie à la racine sur GitHub Pages.
 *
 * Aucune icône propre : comme pour les captures d'écran, une icône annoncée et
 * absente dégrade le menu au lieu de l'enrichir. Le navigateur retombe sur
 * l'icône de l'app, ce qui est le comportement voulu.
 */
export const RACCOURCIS: RaccourciManifest[] = [
  {
    ecran: "prise",
    name: "Noter une prise",
    short_name: "Prise",
    description: "Le geste central : espèce, taille, verdict maille et quota.",
    url: "./#/prise",
  },
  {
    ecran: "carte",
    name: "Ouvrir la carte",
    short_name: "Carte",
    description: "Cours d'eau, stations, parcours et réserves autour de vous.",
    url: "./#/carte",
  },
  {
    ecran: "carnet",
    name: "Mon carnet",
    short_name: "Carnet",
    description: "Prises enregistrées, spots et statistiques.",
    url: "./#/carnet",
  },
  {
    ecran: "reglement",
    name: "Réglementation",
    short_name: "Règles",
    description: "Tailles, quotas et périodes du département actif.",
    url: "./#/reglementation",
  },
];

MANIFEST.shortcuts = RACCOURCIS;

/**
 * Le manifeste tel qu'il doit être ÉCRIT dans le fichier livré.
 *
 * `ecran` sert à dériver et à vérifier l'URL d'un raccourci (voir
 * manifest-raccourcis.test.ts) ; ce n'est pas une clé du standard Web App
 * Manifest. Elle est donc retirée ici, au seul endroit qui produit le fichier.
 */
export function manifestPublie(): Manifest {
  return {
    ...MANIFEST,
    shortcuts: MANIFEST.shortcuts?.map(({ ecran: _ecran, ...reste }) => reste as RaccourciManifest),
  };
}
