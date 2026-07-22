/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Chrome install-prompt event (not in the DOM lib types).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
