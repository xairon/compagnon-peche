// PWA lifecycle: service-worker update prompt + "install app" prompt.
// A tiny observable store so the App can render a toast / install button.

import { useEffect, useReducer } from "react";
import { registerSW } from "virtual:pwa-register";

type Listener = () => void;
const listeners = new Set<Listener>();
let needRefresh = false;
let installable = false;
let deferred: BeforeInstallPromptEvent | null = null;
let updateSW: (reload?: boolean) => Promise<void> = async () => {};

const emit = () => listeners.forEach((l) => l());

export function initPwa() {
  updateSW = registerSW({
    onNeedRefresh() {
      needRefresh = true;
      emit();
    },
    onOfflineReady() {
      /* first install cached — nothing to show */
    },
  });

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
  // updateSW(true) asks the waiting SW to skipWaiting and reloads on the
  // `controllerchange` event. On some Android / installed-PWA setups that event
  // doesn't fire, so the button appears to "do nothing". Belt-and-suspenders:
  // reload on controllerchange AND on a short fallback timer (by then the new SW
  // has usually activated, so the reload picks up the new version).
  let done = false;
  const reload = () => {
    if (done) return;
    done = true;
    window.location.reload();
  };
  try {
    navigator.serviceWorker?.addEventListener("controllerchange", reload, { once: true });
  } catch {
    /* SW API unavailable — the fallback timer still reloads */
  }
  Promise.resolve(updateSW(true)).catch(() => {});
  setTimeout(reload, 1500);
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
  return { needRefresh, installable, applyUpdate, promptInstall };
}
