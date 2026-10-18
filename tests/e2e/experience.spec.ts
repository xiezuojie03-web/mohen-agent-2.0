// tests/e2e/experience.spec.ts — TASK-0014 最低 E2E（任务书 §15 末条 / §16）。
//
// 覆盖五 Beat + Approximate Area + Historical Map Native + Follow-up Patch。
// 与 scripts/e2e-composition2-capture.mjs（真实浏览器 25 断言 + 9 截图）保持同义断言。
// 注：依赖本机 Playwright 浏览器与 BaseURL；若因已记录的环境限制（`pnpm dev` webServer 超时）失败，如实报告。

import { test, expect } from "@playwright/test";

/** 只取「当前画布」里的 Surface：退场层可能残留同名 Surface */
const cur = (page: import("@playwright/test").Page, id: string) =>
  page.locator(".exp-canvas__current").getByTestId(id);

test("experience composition 2.0 — five beats + surface eligibility", async ({ page }) => {
  await page.goto("/experience/jinze-water-net");

  // —— Beat01 Hook / 大幅真实照片（D1：先看照片建立现场感）
  await expect(cur(page, "surface-present-day-photo")).toBeVisible();
  await expect(page.getByTestId("spatial-mode-label")).toContainText("现代精确坐标");
  await expect(page.locator(".exp-secondary").getByTestId("surface-question")).toBeVisible();

  // —— Beat02 Time / Space Shift：现代坐标退出 → 关系历史空间
  await page.getByTestId("next-button").click();
  await expect(cur(page, "surface-relational-space")).toBeVisible();
  await expect(page.getByTestId("spatial-mode-label")).toContainText("关系历史空间");
  await expect(cur(page, "surface-current-map")).toHaveCount(0);

  // —— Beat03 Relationship Discovery：真实产出关系空间（T4）；寺桥无关系 → 答案诚实保留
  await page.getByTestId("next-button").click();
  await expect(cur(page, "surface-relational-space")).toBeVisible();
  await page.getByRole("button", { name: "寺与桥有关系吗" }).click();
  await expect(page.getByTestId("temple-bridge-non-answer")).toContainText("没有找到");

  // —— Approximate Area：近似区域不得退化成精确点
  await page.getByRole("button", { name: "寺的位置有多确定？" }).click();
  await expect(cur(page, "surface-approximate-area")).toBeVisible();
  await expect(cur(page, "surface-approximate-area")).toContainText("没有中心精确 marker");

  // —— Beat04 Evidence & Change：progressive conflict reveal，未裁决
  await page.getByTestId("next-button").click(); // s04
  await page.getByTestId("next-button").click(); // s05
  await expect(cur(page, "surface-conflict-compare")).toBeVisible();
  await page.getByRole("button", { name: "看第一组分歧" }).click();
  await page.getByRole("button", { name: "看第二组分歧" }).click();
  await expect(page.getByTestId("conflict-T11-C1")).toContainText("未裁决");
  await expect(page.getByTestId("conflict-T11-C2")).toContainText("未裁决");

  // —— Historical Map Native prototype：不暗示现代配准
  await page.getByRole("button", { name: "看史料原页" }).click();
  await expect(cur(page, "surface-historical-map-native")).toContainText("不做现代配准");
  await expect(cur(page, "surface-historical-map-native")).toContainText("PARTIAL_CONFIRM");
  await page.getByRole("button", { name: "收起" }).click();

  // —— Beat04 temporal focus：时间成为主角（V1.4 真实优先：P03 时间投影；
  //    库不可用时回落冻结时间景观。两分支共用「时间景观」caption，真实内容
  //    由 SAMPLE-TRIAL-14 自检专项断言，e2e 只保结构契约）
  await page.getByTestId("next-button").click(); // s06
  await expect(cur(page, "surface-timeline")).toBeVisible();
  await expect(cur(page, "surface-timeline")).toContainText("时间景观");

  // —— Beat05 Return & Next Question：回到今天 → 解释框架（不是事实）
  await page.getByTestId("next-button").click(); // s07
  await expect(cur(page, "surface-current-map")).toBeVisible();
  await page.getByTestId("next-button").click(); // s08
  await expect(cur(page, "surface-discovery")).toBeVisible();
  await expect(page.getByTestId("primary-discovery")).toContainText("墨痕的解释");

  // —— Follow-up：Patch-not-Replace（无 reload、无重放、历史保留）
  // EXP-UI-RECON-01 测试维护：TASK-0017 起 s08 有 4 个追问按钮（→ .first()）；
  // TASK-0016 起 canonical follow-up 走真实 Replan Runtime，冻结 patch 结果卡让位
  // （仅在非 replan 路径渲染；replan-card 仅 ?inspector=1），故断言对齐 patch-pill 契约。
  const beforeUrl = page.url();
  await page.getByRole("button", { name: /追问/ }).first().click();
  await expect(page.getByTestId("patch-pill")).toBeVisible();
  expect(page.url()).toBe(beforeUrl);
  await expect(page.locator(".exp-progress")).toContainText("8/8");
});
