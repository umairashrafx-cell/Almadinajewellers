import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..", "..");

/**
 * What the app cannot work without, and is only ever told at build time.
 *
 * Vite swaps these in when it builds; a name it cannot find becomes
 * `undefined`, silently. That is how releases 9 and 10 went out: they were
 * built in fresh git worktrees, which do not have the gitignored .env, so the
 * app shipped with no database address at all. Every request failed, and
 * every screen fell back to what the phone had kept, saying "Kept on this
 * phone… Connect to check" on a phone with full signal.
 *
 * So a production build without them now stops, here, with the reason.
 */
const REQUIRED = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const;

/**
 * The app's own screens, built into mobile/www for Capacitor to bundle.
 *
 * Small on purpose. It is the rate board, the calculator and the saved pieces —
 * the three things somebody opens the app for and the three that are worth
 * having when the signal goes — and everything else is the live website, a tap
 * away in the same WebView.
 *
 * It builds against the website's own source through the same `@` alias the
 * site uses, so the arithmetic, the components and the design tokens are the
 * ones already in src/. Nothing here re-implements a rate.
 */
export default defineConfig(({ command, mode }) => {
  if (command === "build") {
    const env = loadEnv(mode, repo, "VITE_");
    const missing = REQUIRED.filter((name) => !env[name]);
    if (missing.length > 0) {
      throw new Error(
        `Refusing to build the app without ${missing.join(" and ")}. ` +
          `They come from the .env at the repository root (${repo}), which is gitignored: ` +
          `a fresh git worktree does not have one. Copy it in from the main checkout and build again.`,
      );
    }
  }

  return {
    root: here,

    /*
     * The website's .env, not a second copy. The app reads the same database
     * with the same publishable key, and the key never has to be written down
     * twice — or committed, since that file is not in the repository.
     */
    envDir: repo,

    plugins: [react(), tailwindcss()],

    /*
     * Tells the shared catalogue code it is running in the app's own screens.
     *
     * The website shows sold pieces labelled SOLD; these screens were never
     * taught to, so src/lib/catalogue.ts does not ask the database for them when
     * this is set. The shop's website, opened inside the app, is the website's
     * own build and is not affected.
     */
    define: { __APP_SHELL__: "true" },

    resolve: {
      alias: { "@": resolve(repo, "src") },
      // One React, however the shared components reach it.
      dedupe: ["react", "react-dom"],
    },

    build: {
      outDir: resolve(here, "..", "www"),
      emptyOutDir: true,
      // Everything is served from the APK, so there is nothing to gain by
      // splitting it and a cold start to lose.
      chunkSizeWarningLimit: 2000,
    },
  };
});
