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
 *
 * The third include is the Edge Functions' own pure logic. Those run on Deno
 * and are deployed rather than built, so nothing else here sees them — but the
 * parts of a payment protocol worth testing are plain functions over strings,
 * and they are worth testing.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts", "mobile/app/src/**/*.test.ts", "supabase/functions/**/*.test.ts"],
    environment: "node",
  },
});
