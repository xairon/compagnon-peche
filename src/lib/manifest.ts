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
