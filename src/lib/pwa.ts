// PWA lifecycle: service-worker update prompt + "install app" prompt, plus the
// offline-readiness state (see lib/reserve-hors-ligne.ts).
// A tiny observable store so the App can render a toast / install button.

import { useEffect, useReducer } from "react";
import { registerSW } from "virtual:pwa-register";
import {
  etatReserve,
  preparerReserve,
  onReserve,
  type EtatReserve,
} from "./reserve-hors-ligne";

type Listener = () => void;
const listeners = new Set<Listener>();
let needRefresh = false;
let installable = false;
let deferred: BeforeInstallPromptEvent | null = null;
let updateSW: (reload?: boolean) => Promise<void> = async () => {};
let reserve: EtatReserve = { total: 0, presents: 0, echecs: 0, enCours: false, complete: false };

const emit = () => listeners.forEach((l) => l());

/**
 * Remplit la réserve hors-ligne, une fois le noyau en place.
 *
 * Ce ne sont pas des octets en plus : ce sont les mêmes 5 132 Kio que le
 * précache téléchargeait avant, déplacés DERRIÈRE l'activation du service
 * worker au lieu de la retenir en otage. La différence est qu'entre-temps
 * l'app fonctionne, et qu'on peut dire où elle en est.
 *
 * Déclenché en tâche de fond : la préparation ne doit pas disputer le lien à
 * l'écran que l'utilisateur est en train de regarder.
 */
function preparerHorsLigne(): void {
  const lancer = () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    etatReserve()
      .then((e) => (e.complete ? e : preparerReserve()))
      .catch(() => {});
  };
  // requestIdleCallback n'existe pas sur Safari/iOS : le repli n'est pas un
  // détail, c'est la plateforme où l'app est le plus souvent installée.
  const ric = (globalThis as { requestIdleCallback?: (cb: () => void) => void })
    .requestIdleCallback;
  if (ric) ric(lancer);
  else setTimeout(lancer, 2000);
}

export function initPwa() {
  onReserve((e) => {
    reserve = e;
    emit();
  });

  updateSW = registerSW({
    onNeedRefresh() {
      needRefresh = true;
      emit();
    },
    onOfflineReady() {
      // Le noyau est en cache : l'app démarre désormais sans réseau. Ce n'est
      // pas pour autant « hors-ligne prêt » — les illustrations manquent
      // encore. C'est `reserve` qui porte cette nuance, et rien d'autre ne doit
      // la remplacer par une promesse ronde.
      preparerHorsLigne();
    },
  });

  // Visite suivante : le service worker est déjà là, `onOfflineReady` ne
  // refire pas. Sans ceci, une réserve laissée à moitié par une coupure ne
  // serait jamais reprise.
  preparerHorsLigne();
  // Et à chaque retour du réseau, pour la même raison.
  window.addEventListener("online", preparerHorsLigne);

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    installable = true;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installable = false;
    deferred = null;
    emit();
  });
}

export function applyUpdate() {
  // Tell the waiting worker to skipWaiting. With `clientsClaim` set (see
  // vite.config), it then claims this page, `controllerchange` fires, and the
  // plugin's own `controlling` handler reloads once the new worker is actually in
  // control. No blind timer: a fixed-delay reload used to fire before the new
  // worker took control, so the update never stuck and the prompt looped.
  Promise.resolve(updateSW(true)).catch(() => {});
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const res = await deferred.userChoice;
  deferred = null;
  installable = false;
  emit();
  return res.outcome === "accepted";
}

/** Subscribe React to the PWA state. */
export function usePwa() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
    };
  }, []);
  return { needRefresh, installable, reserve, applyUpdate, promptInstall };
}
