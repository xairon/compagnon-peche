// PWA lifecycle: service-worker update prompt + "install app" prompt, plus the
// offline-readiness state (see lib/reserve-hors-ligne.ts).
// A tiny observable store so the App can render a toast / install button.

import { useEffect, useReducer } from "react";
import { registerSW } from "virtual:pwa-register";
import {
  doitPreparer,
  etatReserve,
  preparerReserve,
  onReserve,
  type EtatReserve,
} from "./reserve-hors-ligne";
import {
  doitVerifier,
  lireDossier,
  majVisible,
  oublierMaj,
  reportPossible,
  reporterMaj,
  signalerMaj,
  ECART_MIN_VERIFICATION_MS,
  type DossierMaj,
} from "./maj-sw";
import { COMMIT } from "./build";

type Listener = () => void;
const listeners = new Set<Listener>();
let needRefresh = false;
let installable = false;
let deferred: BeforeInstallPromptEvent | null = null;
let updateSW: (reload?: boolean) => Promise<void> = async () => {};
let reserve: EtatReserve = { total: 0, presents: 0, echecs: 0, enCours: false, complete: false };
let dossierMaj: DossierMaj | null = null;
let minuterieReport: ReturnType<typeof setTimeout> | null = null;

const emit = () => listeners.forEach((l) => l());

/** Recalcule la visibilité du bandeau depuis le dossier, et arme le retour
 *  automatique à l'échéance du report — sans quoi « plus tard » vaudrait
 *  « jamais » pour qui ne recharge pas la page. */
function relireMaj(): void {
  dossierMaj = lireDossier(COMMIT);
  const visible = majVisible(dossierMaj, Date.now());
  if (minuterieReport) clearTimeout(minuterieReport);
  minuterieReport = null;
  if (dossierMaj && !visible) {
    const reste = dossierMaj.jusqua - Date.now();
    // setTimeout sature au-delà de ~24,8 jours ; le report vaut un jour, mais
    // la borne évite qu'une valeur aberrante déclenche un rappel immédiat.
    if (reste > 0 && reste < 2_147_483_647) minuterieReport = setTimeout(relireMaj, reste);
  }
  if (visible !== needRefresh) {
    needRefresh = visible;
    emit();
  }
}

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
function preparerHorsLigne(force = false): void {
  const lancer = () => {
    const ok = doitPreparer({
      enLigne: navigator.onLine !== false,
      controleParSW: !!navigator.serviceWorker?.controller,
      force,
    });
    if (!ok) return;
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

  // Un dossier peut déjà exister d'une session précédente : le bandeau doit
  // être là avant même que le service worker ait resignalé quoi que ce soit.
  relireMaj();

  updateSW = registerSW({
    onNeedRefresh() {
      signalerMaj(Date.now(), COMMIT);
      relireMaj();
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      let dernier = 0;
      const verifier = () => {
        const t = Date.now();
        if (!doitVerifier(dernier, t)) return;
        dernier = t;
        registration.update().catch(() => {});
      };
      // Une PWA Android installée n'est presque jamais démarrée à froid : sans
      // ces trois déclencheurs, elle n'apprend l'existence d'une nouvelle
      // version qu'au prochain redémarrage du téléphone.
      setInterval(verifier, ECART_MIN_VERIFICATION_MS);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") verifier();
      });
      window.addEventListener("online", verifier);
    },
    onOfflineReady() {
      // Le noyau est en cache : l'app démarre désormais sans réseau. Ce n'est
      // pas pour autant « hors-ligne prêt » — les illustrations manquent
      // encore. C'est `reserve` qui porte cette nuance, et rien d'autre ne doit
      // la remplacer par une promesse ronde.
      //
      // `force` : c'est le seul moment où l'on SAIT que le précache vient
      // d'aboutir, le contrôleur pouvant encore manquer d'un battement de cil.
      preparerHorsLigne(true);
    },
  });

  // Visite suivante : le service worker est déjà là, `onOfflineReady` ne
  // refire pas. Sans ceci, une réserve laissée à moitié par une coupure ne
  // serait jamais reprise.
  preparerHorsLigne();
  // Et à chaque retour du réseau, pour la même raison.
  // Enveloppé, jamais passé directement : `addEventListener` remettrait l'objet
  // Event en premier argument, et `force` serait vrai à chaque retour de réseau.
  window.addEventListener("online", () => preparerHorsLigne());

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
  oublierMaj();
  Promise.resolve(updateSW(true)).catch(() => {});
}

/**
 * « Plus tard » : masque le bandeau pour une journée, trois fois au plus.
 * Renvoie `false` quand le report n'est plus accordé — l'écran doit alors dire
 * pourquoi plutôt que de faire semblant d'obéir. La mise à jour ne s'applique
 * jamais d'elle-même : la borne pousse, elle ne décide pas à la place.
 */
export function reportUpdate(): boolean {
  const ok = reporterMaj(Date.now()) !== null;
  relireMaj();
  return ok;
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
  return {
    needRefresh,
    installable,
    reserve,
    // Le dossier brut, pas une durée : l'heure se lit avec `useNow()` côté
    // rendu (voir lib/now.ts), et `joursDAttente(maj, now)` en tire « elle
    // attend depuis 8 jours » sans l'inventer. `majReportable` dit s'il reste
    // un report à accorder, donc s'il faut encore afficher « Plus tard ».
    maj: dossierMaj,
    majReportable: reportPossible(dossierMaj),
    applyUpdate,
    reportUpdate,
    promptInstall,
  };
}
