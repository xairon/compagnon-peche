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
    // Only the real sources. Agent worktrees under .claude/ are full copies of
    // the repo: without this, vitest ran every suite twice, the count drifted
    // between runs (372 then 374, unexplained for a while), and the extra load
    // pushed slower tests past their timeout — failures that looked like
    // regressions but were pure contention.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", ".claude/**", "coverage/**"],
  },
});
