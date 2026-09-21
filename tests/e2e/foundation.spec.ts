import { test, expect } from "@playwright/test";
test("foundation health surface", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("MOHEN AGENT 2.0 · FOUNDATION")).toBeVisible();
  await expect(page.getByText("Foundation ready")).toBeVisible();
});
