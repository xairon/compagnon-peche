// Catch & avatar photos live as blobs in IndexedDB (keyed separately from the
// catches array, which stays light). Nothing is ever uploaded — 100% on-device.

import { get, set, del } from "idb-keyval";
import { useEffect, useState } from "react";
import { reportPersistError, clearPersistError } from "./storage";

export async function savePhoto(key: string, blob: Blob): Promise<void> {
  try {
    await set(key, blob);
    clearPersistError();
  } catch (e) {
    // Photos are the likeliest to blow the quota — never fail silently.
    reportPersistError(e);
  }
}

export async function loadPhoto(key: string): Promise<Blob | undefined> {
  try {
    return await get<Blob>(key);
  } catch {
    return undefined;
  }
}

export async function deletePhoto(key: string): Promise<void> {
  try {
    await del(key);
  } catch {
    /* ignore */
  }
}

/** Resolve a stored photo key to an object URL, revoking it on cleanup. */
export function usePhotoUrl(key: string | undefined | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked = false;
    let current: string | null = null;
    if (!key) {
      setUrl(null);
      return;
    }
    loadPhoto(key).then((blob) => {
      if (revoked) return;
      if (blob) {
        current = URL.createObjectURL(blob);
        setUrl(current);
      } else {
        setUrl(null);
      }
    });
    return () => {
      revoked = true;
      if (current) URL.revokeObjectURL(current);
    };
  }, [key]);
  return url;
}

/**
 * Downscale/compress a picked image to keep IndexedDB light (max edge `max` px,
 * JPEG quality 0.82). Falls back to the original file if the canvas path fails.
 */
export async function downscaleImage(file: File, max = 1280): Promise<Blob> {
  try {
    // imageOrientation "from-image" applies the EXIF rotation so portrait phone
    // photos aren't stored sideways.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}
