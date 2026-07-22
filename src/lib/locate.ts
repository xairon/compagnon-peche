// Geolocation with clear, user-facing states (granted / denied / unavailable /
// timeout / unsupported) — used by the catch editor and the map.

export type LocateError = "unsupported" | "denied" | "unavailable" | "timeout";

export function locate(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject("unsupported" as LocateError);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => reject((e.code === 1 ? "denied" : e.code === 3 ? "timeout" : "unavailable") as LocateError),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

export function locateMessage(err: unknown): string {
  switch (err) {
    case "denied":
      return "Localisation refusée. Autorisez l'accès à la position dans les réglages du navigateur.";
    case "unavailable":
      return "Position indisponible (GPS ou signal).";
    case "timeout":
      return "Localisation trop longue — réessayez.";
    default:
      return "Géolocalisation indisponible sur cet appareil.";
  }
}
