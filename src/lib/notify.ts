// Local notifications for the crayfish session.
//
// Hard platform limit, stated plainly: the Notification Triggers API
// (TimestampTrigger), which would let us schedule a notification ahead of time,
// never shipped — it still needs a Chrome flag. Without a push server (excluded:
// it would break the "100% offline, nothing is transmitted" promise), a PWA
// cannot alert once Android has frozen the page. So notifications fire while the
// app is alive, and the screen catches up from the timestamps on every return.

export function notifySupported(): boolean {
  return typeof Notification !== "undefined" && "serviceWorker" in navigator;
}

export function notifyPermission(): NotificationPermission | "unsupported" {
  if (!notifySupported()) return "unsupported";
  return Notification.permission;
}

/** Ask once, at the start of the first session — never at app launch. */
export async function askNotifyPermission(): Promise<boolean> {
  if (!notifySupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/** Notify that a balance is due. `tag` makes a balance's notifications replace
 *  each other instead of stacking. Falls back to vibration alone. */
export async function notifyBalance(
  n: number,
  label: string | undefined,
  lateSec: number,
  tag: string,
): Promise<void> {
  navigator.vibrate?.([200, 120, 200]);
  if (!notifySupported() || Notification.permission !== "granted") return;
  const late = Math.max(0, Math.round(lateSec / 60));
  const body = late > 0 ? `À relever depuis ${late} min` : "À relever maintenant";
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(`Balance ${n}${label ? " · " + label : ""}`, {
      body,
      tag,
      renotify: true,
      requireInteraction: true,
      badge: "./icon-192.png",
      icon: "./icon-192.png",
    } as NotificationOptions);
  } catch {
    /* vibration already fired — nothing more we can do */
  }
}
