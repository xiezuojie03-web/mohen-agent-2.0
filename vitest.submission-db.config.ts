import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@mohen/data-access": path.resolve(__dirname, "packages/data-access/src/index.mjs") } },
  test: {
    include: ["tests/integration/submission-revisions.integration.ts"],
    setupFiles: ["tests/setup/db-guard.ts"],
    fileParallelism: false,
  },
});
