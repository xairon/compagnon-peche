// L'écran Carte est le plus lourd de l'app : le moteur MapLibre (~970 Ko) plus
// l'écran lui-même (~340 Ko), mesurés sur le build du 04/08/2026. Sans rien
// faire, le lazy() de App.tsx déclenchait ce téléchargement au premier clic sur
// l'onglet Carte — 2 à 4 s de plus sur un réseau mobile.
//
// On le précharge pendant l'inactivité qui suit le premier rendu : le chunk est
// téléchargé (et mis en cache par le service worker) avant que l'utilisateur
// n'en ait besoin. L'import ne fait que charger le module — la carte ne
// s'instancie que quand l'écran Carte est réellement monté, donc rien ne
// s'exécute au démarrage.
//
// C'est un confort, pas une dépendance : si le préchargement échoue (réseau
// coupé au démarrage), l'écran se chargera normalement au clic.

type Loader = () => Promise<unknown>;

// La liste est passée en paramètre pour que le test vérifie le comportement
// sans charger le vrai module (maplibre-gl pèse ~1 Mo).
const HEAVY: Loader[] = [() => import("../screens/Carte")];

export function prefetchHeavyScreens(loaders: Loader[] = HEAVY): void {
  // requestIdleCallback n'existe pas sur Safari/iOS : le repli n'est pas un
  // simple retard, c'est un vrai délai — le démarrage reste prioritaire.
  const ric = (globalThis as { requestIdleCallback?: (cb: () => void) => void })
    .requestIdleCallback;
  const run = () => {
    for (const load of loaders) {
      load().catch(() => {});
    }
  };
  if (ric) ric(run);
  else setTimeout(run, 2000);
}
