import { defineConfig } from "vitest/config";
import path from "path";

// Separate config for the visual-regression suite. It drives a headless
// browser and expects a server at VISUAL_BASE_URL, so it is kept OUT of the
// fast default `npm test` run and invoked explicitly via `npm run test:visual`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/visual/**/*.visual.test.ts"],
    testTimeout: 90_000,
    hookTimeout: 60_000,
    fileParallelism: false, // one browser at a time — stable screenshots
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.js"),
    },
  },
});
