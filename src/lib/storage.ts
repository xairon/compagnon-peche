// Device storage management: keep the notebook from being evicted, report usage,
// export a backup, and let the user wipe everything. All local, nothing leaves.

import { get, set, keys, clear } from "idb-keyval";
import type { Profile } from "../types";

// ── Persistence-failure notifier ───────────────────────────────────────────
// Writes to IndexedDB can fail silently (quota exceeded, private mode, storage
// disabled). The save helpers keep the app working in memory, but we must NOT
// let the UI imply a catch was safely stored. They report here; App shows a
// banner so the user knows to free space / export before losing data.
type PersistListener = (msg: string | null) => void;
let persistError: string | null = null;
const persistListeners = new Set<PersistListener>();

/** True for a browser quota-exceeded error, across engines. */
export function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.code === 22)
  );
}

/** A save helper failed — surface a human message (deduped) to any listener. */
export function reportPersistError(e: unknown): void {
  const msg = isQuotaError(e)
    ? "Espace de stockage saturé : vos dernières saisies ne sont pas enregistrées. Libérez de la place (photos) ou exportez une sauvegarde."
    : "Enregistrement local impossible : vos dernières saisies pourraient être perdues au rechargement.";
  if (msg === persistError) return;
  persistError = msg;
  persistListeners.forEach((l) => l(msg));
}

/** Reading stored data failed — persistence is suspended to avoid overwriting
 *  still-present-but-unreadable data. Distinct, actionable message. */
export function reportReadError(): void {
  const msg =
    "Impossible de lire vos données enregistrées. Par sécurité, l'enregistrement est suspendu (pour ne pas écraser des données existantes) — rechargez l'application ; si le souci persiste, exportez une sauvegarde.";
  if (msg === persistError) return;
  persistError = msg;
  persistListeners.forEach((l) => l(msg));
}

/** A save succeeded — clear any standing error (the problem may be transient). */
export function clearPersistError(): void {
  if (persistError === null) return;
  persistError = null;
  persistListeners.forEach((l) => l(null));
}

/** Subscribe to persistence-error changes; fires immediately with current state. */
export function onPersistError(l: PersistListener): () => void {
  persistListeners.add(l);
  l(persistError);
  return () => persistListeners.delete(l);
}

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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob | null> {
  try {
    return await (await fetch(dataUrl)).blob(); // data: URL, no network
  } catch {
    return null;
  }
}

/** Keys of every stored photo/avatar blob. */
async function photoKeys(): Promise<string[]> {
  const all = await keys();
  return all.filter(
    (k): k is string =>
      typeof k === "string" && (k.startsWith("photo:") || k.startsWith("profile-avatar")),
  );
}

/** Current schema version of the export bundle. Bump when the shape changes. */
export const EXPORT_SCHEMA = 2;

/** Download a full JSON backup — structured data AND photos (base64), so it can
 *  actually restore everything on a new device (see importData). */
export async function exportData(): Promise<void> {
  const [catches, spots, gear, bundles, profile, recipes] = await Promise.all([
    get("carnet:catches"),
    get("carnet:spots"),
    get("fish-gear"),
    get("fish-bundles"),
    get("carnet:profile"),
    get("carnet:recipes"),
  ]);
  // Photos as data URLs so the backup is self-contained and restorable.
  const photos: Record<string, string> = {};
  for (const k of await photoKeys()) {
    const b = await get<Blob>(k);
    if (b instanceof Blob) {
      try {
        photos[k] = await blobToDataUrl(b);
      } catch {
        /* skip a single unreadable blob rather than failing the whole export */
      }
    }
  }
  const data = {
    app: "compagnon-peche",
    schema: EXPORT_SCHEMA,
    exportedAtIso: new Date().toISOString(),
    note: "Sauvegarde locale complète (carnet, spots, matériel, profil, recettes ET photos). Restaurable via « Importer une sauvegarde ».",
    catches: catches ?? [],
    spots: spots ?? [],
    gear: gear ?? [],
    bundles: bundles ?? [],
    profile: profile ?? null,
    recipes: recipes ?? [],
    photos,
  };
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `carnet-peche-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); // some WebViews require the anchor in the DOM
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export interface ImportResult {
  catches: number;
  spots: number;
  gear: number;
  recipes: number;
  photos: number;
}

/** Restore a backup produced by exportData. Non-destructive MERGE: entries are
 *  added by unique id (existing ones are kept, never duplicated), the profile is
 *  filled only if empty, and missing photo blobs are restored. Returns counts of
 *  what was actually added. Throws on a file that isn't a valid backup. */
export async function importData(file: File): Promise<ImportResult> {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("Fichier illisible : ce n'est pas un JSON valide.");
  }
  if (!data || data.app !== "compagnon-peche") {
    throw new Error("Ce fichier n'est pas une sauvegarde Compagnon de pêche.");
  }

  const mergeById = async (key: string, idField: string, incoming: unknown): Promise<number> => {
    if (!Array.isArray(incoming) || incoming.length === 0) return 0;
    const cur = ((await get(key)) as Record<string, unknown>[]) ?? [];
    const seen = new Set(cur.map((x) => x?.[idField]));
    const added = incoming.filter(
      (x): x is Record<string, unknown> => !!x && !seen.has((x as Record<string, unknown>)[idField]),
    );
    if (added.length) await set(key, [...added, ...cur]);
    return added.length;
  };

  const catches = await mergeById("carnet:catches", "slot", data.catches);
  const spots = await mergeById("carnet:spots", "id", data.spots);
  const gear = await mergeById("fish-gear", "id", data.gear);
  const recipes = await mergeById("carnet:recipes", "id", data.recipes);
  await mergeById("fish-bundles", "id", data.bundles);

  // Profile: fill only if the current identity is empty (don't clobber).
  const curProfile = (await get("carnet:profile")) as Profile | undefined;
  const emptyProfile = !curProfile || (!curProfile.name && !curProfile.bio && !curProfile.region);
  if (data.profile && emptyProfile) await set("carnet:profile", data.profile);

  // Photos: restore any blob not already present.
  let photos = 0;
  const incomingPhotos = data.photos;
  if (incomingPhotos && typeof incomingPhotos === "object") {
    for (const [k, dataUrl] of Object.entries(incomingPhotos as Record<string, unknown>)) {
      if (typeof dataUrl !== "string") continue;
      if (await get(k)) continue; // keep an existing blob
      const b = await dataUrlToBlob(dataUrl);
      if (b) {
        await set(k, b);
        photos++;
      }
    }
  }
  return { catches, spots, gear, recipes, photos };
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
