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
    coverage: {
      // Sans `include`, v8 n'instrumente QUE les fichiers qu'un test a déjà
      // importés. Le chiffre affiché répondait donc à « les fichiers testés
      // sont-ils bien testés ? » — jamais à « quelle part de l'app est
      // testée ? ». Mesuré le 31/07/2026 : 82,04 % annoncés sur 74 fichiers
      // instrumentés, alors que src/ en compte 165 (hors tests). Les 91 autres,
      // jamais importés, ne pesaient rien dans la moyenne — dont dix-huit écrans
      // entiers (Materiel, Stockage, Statistiques, Reglement…) à 0 %.
      // Une fois `include` posé, le même dépôt mesure 47,12 %.
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        // Décors de test : des réponses d'API figées, pas du code de l'app.
        "src/lib/__fixtures__/**",
        // Point d'entrée : `createRoot(...).render(...)` au chargement du
        // module. L'importer pour le mesurer monterait l'app entière.
        "src/main.tsx",
        "src/test-setup.ts",
        "src/vite-env.d.ts",
        // Déclarations de types : effacées à la compilation, rien à exécuter.
        "src/types.ts",
        "src/store-context.ts",
      ],
      // Seuils posés sous le MESURÉ du jour, pas sur un idéal. Un seuil qu'on
      // désactive le lendemain ne protège rien : celui-ci doit tenir tant que
      // personne ne retire de test, et céder dès que quelqu'un en retire un.
      //
      // ILS SE REMESURENT AVEC CHAQUE LOT DE TESTS, sinon ils cessent de faire
      // ce travail sans le dire. Posés à 48/40/38/48 sur le mesuré du
      // 31/07/2026 (49,72 %), ils ont été retrouvés le 03/08/2026 face à un
      // dépôt à 69 % : 20 points de mou, de quoi supprimer un tiers de la suite
      // sans que la CI bronche. La marge doit rester d'environ 1,5 point.
      //
      // Mesuré le 03/08/2026, après ce lot (1900 tests) :
      //   instructions 69,06 %  ·  branches 62,22 %
      //   fonctions    60,05 %  ·  lignes   70,60 %
      //
      // La marge absorbe ce qu'un remaniement honnête déplace (un fichier
      // scindé, une branche morte retirée) sans absorber une perte réelle : le
      // plus petit des fichiers de test du dépôt pèse à lui seul plus que ça.
      //
      // Ils ne sont PAS un objectif. 69 % veut dire qu'un tiers de l'app n'est
      // toujours pas exercé — `screens/Carte.tsx` à 0 % sur 1 306 lignes en
      // tête. Monter les seuils sans écrire les tests d'abord ne ferait que
      // casser le build.
      //
      // Mesuré le 04/08/2026 après le lot « audit 04/08 » (1911 tests) :
      //   instructions 67,98 %  ·  branches 61,86 %
      //   fonctions    58,64 %  ·  lignes   69,82 %
      // Le lot a ajouté ~50 lignes non testées à Carte.tsx (zéro test de rendu,
      // limite connue) : les seuils redescendent d'environ 1,5 point, comme la
      // doctrine du fichier le demande, pour garder la marge qui permet un
      // remaniement honnête sans absorber une perte réelle.
      thresholds: {
        statements: 66.5,
        branches: 60.4,
        functions: 57.1,
        lines: 68.3,
      },
    },
  },
});
