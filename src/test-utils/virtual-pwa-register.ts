/**
 * Stub de `virtual:pwa-register` pour vitest.
 *
 * vite-plugin-pwa n'enregistre ce module virtuel que dans le serveur de dev et
 * le build — vitest (config séparée, volontairement sans le plugin) ne sait pas
 * le résoudre. L'alias est déclaré dans vitest.config.ts ; ce stub ne fait
 * rien, car `initPwa()` (main.tsx) n'est pas appelé par les tests.
 */
export function registerSW(): () => Promise<void> {
  return async () => {};
}
