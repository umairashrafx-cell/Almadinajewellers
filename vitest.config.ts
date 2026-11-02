import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Tests run against the modules themselves, not the app.
 *
 * The app's own Vite config comes from `@lovable.dev/vite-tanstack-config`,
 * which warns that adding plugins by hand breaks the build. Nothing here
 * touches it: this config exists only so the test runner can resolve the same
 * `@/` paths the source uses, and it is deliberately the smallest thing that
 * does that.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
