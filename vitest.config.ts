import { defineConfig } from "vitest/config";

// Test config kept out of vite.config.ts on purpose: adding a `test` block there
// forces Vite's plugin types through vitest's bundled copy of them, and the two
// versions disagree — the build stopped type-checking. Vitest reads this file
// instead, and the production build keeps a config that only knows about Vite.
//
// Logic tests run in plain node (vitest's default). Screen tests opt into jsdom
// with a `// @vitest-environment jsdom` docblock, so the fast majority stays fast.
export default defineConfig({
  test: {
    setupFiles: ["./src/test-setup.ts"],
  },
});
