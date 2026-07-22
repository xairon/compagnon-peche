// Device storage management: keep the notebook from being evicted, report usage,
// export a backup, and let the user wipe everything. All local, nothing leaves.

import { get, keys, clear } from "idb-keyval";

/** Ask the browser to make storage persistent (won't be auto-evicted under pressure). */
export async function requestPersist(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted?.()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* not supported */
  }
  return false;
}

export async function isPersisted(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}

export interface StorageInfo {
  usage: number; // bytes
  quota: number; // bytes
  photos: number; // count of stored photo blobs
  persisted: boolean;
}

export async function storageInfo(): Promise<StorageInfo> {
  let usage = 0;
  let quota = 0;
  try {
    const est = await navigator.storage?.estimate?.();
    usage = est?.usage ?? 0;
    quota = est?.quota ?? 0;
  } catch {
    /* ignore */
  }
  let photos = 0;
  try {
    const all = await keys();
    photos = all.filter(
      (k) => typeof k === "string" && (k.startsWith("photo:") || k.startsWith("profile-avatar")),
    ).length;
  } catch {
    /* ignore */
  }
  return { usage, quota, photos, persisted: await isPersisted() };
}

/** Download a JSON backup of the structured data (photos stay on the device). */
export async function exportData(): Promise<void> {
  const [catches, spots, gear, bundles, profile] = await Promise.all([
    get("carnet:catches"),
    get("carnet:spots"),
    get("fish-gear"),
    get("fish-bundles"),
    get("carnet:profile"),
  ]);
  const data = {
    app: "compagnon-peche",
    exportedAtIso: new Date().toISOString(),
    note: "Sauvegarde locale. Les photos ne sont pas incluses (blobs volumineux, restent sur l'appareil).",
    catches: catches ?? [],
    spots: spots ?? [],
    gear: gear ?? [],
    bundles: bundles ?? [],
    profile: profile ?? null,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `carnet-peche-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); // some WebViews require the anchor in the DOM
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Wipe ALL local data (catches, spots, gear, profile, photos). Irreversible.
 *  Keeps the app-entered state (onboarding already done) so the user lands back
 *  in an empty app, not on the welcome screen. */
export async function wipeAll(): Promise<void> {
  try {
    await clear();
  } catch {
    /* ignore */
  }
  try {
    localStorage.clear();
    localStorage.setItem("onboarded", "1");
  } catch {
    /* ignore */
  }
}

export function fmtBytes(n: number): string {
  if (!n) return "0 Mo";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}
