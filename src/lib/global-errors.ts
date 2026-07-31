import { reportRuntimeError } from "./storage";

// Everything an ErrorBoundary cannot see.
//
// A boundary catches errors thrown while React renders — and nothing else. An
// exception in an event handler, a rejected promise in a save path, anything
// inside a setTimeout: all of it went to the console and no further. The user
// saw a button that did nothing and concluded their catch had been recorded.
//
// Nothing is transmitted. The report link in ErrorBoundary and Sources lets the
// user send a diagnostic if they choose to; the app never does it for them.

/** Human-readable one-liner from whatever was thrown. */
function detailDe(v: unknown): string {
  if (v instanceof Error) return v.message;
  if (typeof v === "string") return v;
  return "erreur inattendue";
}

/**
 * Route uncaught errors and unhandled rejections to the existing banner.
 * Returns an uninstaller — used by tests, and by anything that ever needs to
 * take the handlers back off.
 */
export function installGlobalErrorHandlers(): () => void {
  const onRejection = (e: Event) => {
    const reason = (e as PromiseRejectionEvent).reason;
    console.error("Rejet non géré :", reason);
    reportRuntimeError(detailDe(reason));
  };
  const onError = (e: Event) => {
    const err = (e as ErrorEvent).error ?? (e as ErrorEvent).message;
    console.error("Erreur non capturée :", err);
    reportRuntimeError(detailDe(err));
  };

  window.addEventListener("unhandledrejection", onRejection);
  window.addEventListener("error", onError);
  return () => {
    window.removeEventListener("unhandledrejection", onRejection);
    window.removeEventListener("error", onError);
  };
}
