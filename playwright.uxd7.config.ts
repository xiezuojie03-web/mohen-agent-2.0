import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

// Dedicated UI verification: no live DB, no unrelated service reuse.
for (const base of [".", "apps/web"]) {
  for (const name of [".env", ".env.local", ".env.development", ".env.development.local"]) {
    if (existsSync(`${base}/${name}`)) throw new Error(`UXD7 browser verification requires a clean local environment: ${base}/${name}`);
  }
}
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["experience.spec.ts", "five-pages-ui-acceptance.spec.ts", "experience-recon-01.spec.ts"],
  timeout: 30_000,
  workers: 1,
  outputDir: process.env.MOHEN_TEST_OUTPUT_DIR || "test-results/uxd7",
  use: {
    baseURL: "http://127.0.0.1:3107",
    launchOptions: { executablePath: process.env.MOHEN_TEST_BROWSER || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined) },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm --filter @mohen/web exec next dev --hostname 127.0.0.1 --port 3107",
    url: "http://127.0.0.1:3107",
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DATABASE_URL: "", AUTH_SECRET: "" },
  },
});
