// tests/e2e/experience.spec.ts — TASK-0013 最低 E2E（任务书 §17）。
// 流程：open → s01→s02 断言现代精确坐标消失 → s05 打开证据断言双冲突可见
//       → s08 断言解释与事实视觉区分 → canonical follow-up 断言 Patch 激活且历史保留。
// 注：本测试依赖本机 Playwright 浏览器可用；若因已记录的环境限制失败，如实报告。

import { test, expect } from "@playwright/test";

test("experience living vertical slice", async ({ page }) => {
  await page.goto("/experience/jinze-water-net");

  // —— s01：当前精确地理
  await expect(page.getByTestId("surface-modern-map")).toBeVisible();
  await expect(page.getByTestId("spatial-mode-label")).toContainText("现代精确坐标");
  await expect(page.getByTestId("unit-s01-u1")).toContainText("宋代石桥");

  // —— s01 → s02：时间后退，现代坐标淡出，关系历史空间出现
  await page.getByTestId("next-button").click();
  await expect(page.getByTestId("surface-timeline")).toBeVisible();
  await expect(page.getByTestId("spatial-mode-label")).toContainText("关系历史空间");
  await expect(page.getByTestId("surface-modern-map")).toHaveCount(0);

  // —— 走到 s05，打开证据，断言双冲突可见
  await page.getByTestId("next-button").click(); // s03
  await page.getByTestId("next-button").click(); // s04
  await page.getByTestId("next-button").click(); // s05
  await expect(page.getByTestId("surface-evidence-panel")).toBeVisible();
  await expect(page.getByTestId("conflict-T11-C1")).toContainText("普济桥方位");
  await expect(page.getByTestId("conflict-T11-C2")).toContainText("万安桥跨水道");
  // 走 Agent Action Layer 的「查看证据」也应可用（Evidence/Uncertainty Layer）
  await page.getByRole("button", { name: "查看证据" }).click();
  await expect(page.getByTestId("evidence-layer")).toBeVisible();

  // —— s08：Fact → Interpretation → Unknown，视觉分级不同
  await page.getByRole("button", { name: "收起证据" }).click();
  await page.getByTestId("next-button").click(); // s06
  await page.getByTestId("next-button").click(); // s07
  await page.getByTestId("next-button").click(); // s08
  await expect(page.getByTestId("surface-text-focus")).toBeVisible();
  const fact = page.getByTestId("unit-s08-u1");
  const interp = page.getByTestId("unit-s08-u1b");
  await expect(fact).toContainText("跨同一条有名的水道");
  await expect(interp).toContainText("解释框架");
  const factStyle = await fact.evaluate((el) => getComputedStyle(el).borderLeftStyle);
  const interpStyle = await interp.evaluate((el) => getComputedStyle(el).borderStyle);
  expect(factStyle).toBe("solid");
  expect(interpStyle).toContain("dashed");

  // —— canonical follow-up：Patch-not-Replace（无 reload、无重放、历史保留）
  const beforeUrl = page.url();
  await page.getByTestId("followup-button").click();
  await expect(page.getByTestId("patch-card")).toContainText("体验未重启");
  await expect(page.getByTestId("patch-card")).toContainText("research_lead");
  await expect(page.getByTestId("patch-pill")).toBeVisible();
  expect(page.url()).toBe(beforeUrl); // 无路由跳转
  // 场景进度未重置（仍在 8/8），叙事层仍在
  await expect(page.locator(".exp-progress")).toContainText("8 / 8");
});
