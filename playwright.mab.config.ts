import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'tests/e2e',testMatch:['mab-notebook.spec.ts','mab-m5-feedback-consent.spec.ts','mab-m4-plan.spec.ts','mab-m5-public-consumers.spec.ts','mab-m5-private-revisions.spec.ts','private-original-http.spec.ts','mab-m1-session-revocation.spec.ts'],workers:1,fullyParallel:false,timeout:90_000,
  outputDir:'test-results/mab-http',reporter:[['list']],
  use:{baseURL:process.env.MOHEN_E2E_BASE_URL??'http://127.0.0.1:3008',headless:true,
    launchOptions:process.env.MOHEN_TEST_CHROMIUM?{executablePath:process.env.MOHEN_TEST_CHROMIUM}:undefined,
    screenshot:'only-on-failure'},
});
