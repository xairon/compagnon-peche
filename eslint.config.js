import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  { ignores: ["dist", "dev-dist", "public", "scripts", "*.config.*"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.serviceworker },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // The valuable classic hook rules stay strict. The new React-Compiler rules
      // in react-hooks v7 flag intentional patterns here (time-based useMemo,
      // setState in mount effects, GPS updates) — keep them as informative
      // warnings rather than build-blocking errors (the app doesn't use RC).
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/set-state-in-effect": "warn",
      // The codebase uses a few pragmatic `as any` casts (SpeechRecognition,
      // MapLibre) — keep as warnings, not errors.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../screens/*", "../screens", "**/screens/*"],
              message:
                "src/components/ ne doit pas importer depuis src/screens/ (violation des frontières de couches components/screens).",
            },
          ],
        },
      ],
    },
  },
  // Les fichiers de test sont exemptés : les tests a11y de src/components/
  // montent de vrais écrans (Carnet, Ecrevisses, Materiel…) — c'est leur
  // métier. La règle protège les imports de RUNTIME, pas les tests.
  // NB : ne PAS fusionner ce bloc avec le précédent via un pattern `!` dans
  // `files` — une négation dans `files` fait appliquer la config à tout le
  // dépôt (vérifié sur ESLint 9.39). Deux blocs, c'est le seul montage fiable.
  {
    files: ["src/components/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
);
