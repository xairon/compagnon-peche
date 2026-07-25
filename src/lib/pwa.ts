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
  return { needRefresh, installable, applyUpdate, promptInstall };
}
