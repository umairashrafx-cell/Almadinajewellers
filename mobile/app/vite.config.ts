import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..", "..");

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
export default defineConfig({
  root: here,

  /*
   * The website's .env, not a second copy. The app reads the same database
   * with the same publishable key, and the key never has to be written down
   * twice — or committed, since that file is not in the repository.
   */
  envDir: repo,

  plugins: [react(), tailwindcss()],

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
});
