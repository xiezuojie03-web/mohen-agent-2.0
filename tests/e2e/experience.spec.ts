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

// UXD7 presentation tests: actual /explore component, empty safe DB fallback.
// These do not claim live qualification, Agent or full semantic-history acceptance.
test.describe("UXD7 EXP presentation", () => {
  test("independent panels and full canvas preserve the stage", async ({ page }) => {
    await page.goto("/explore");
    const stage = page.getByRole("region", { name: "视觉舞台" });
    const narrative = page.getByRole("complementary", { name: "墨痕叙事" });
    const evidence = page.getByRole("complementary", { name: "辅助证据" });
    await expect(stage).toBeVisible();
    await page.getByLabel("墨痕呈现").selectOption("OPEN");
    await page.getByLabel("证据呈现").selectOption("OPEN");
    await expect(narrative).toBeVisible();
    await expect(evidence).toBeVisible();
    const before = (await stage.boundingBox())!.width;
    await page.getByLabel("墨痕呈现").selectOption("HIDDEN");
    await expect(narrative).toBeHidden();
    await expect(evidence).toBeVisible();
    await page.getByLabel("证据呈现").selectOption("CLOSED");
    await expect(evidence).toBeHidden();
    expect((await stage.boundingBox())!.width).toBeGreaterThan(before + 100);
    await page.getByLabel("墨痕呈现").selectOption("HINT");
    await expect(page.getByRole("button", { name: "展开墨痕" })).toBeVisible();
  });

  test("all independent visibility combinations keep the stage available", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/explore");
    for (const n of ["HIDDEN", "HINT", "OPEN"]) {
      for (const e of ["CLOSED", "PEEK", "OPEN", "DETAIL"]) {
        await page.getByLabel("墨痕呈现").selectOption(n);
        await page.getByLabel("证据呈现").selectOption(e);
        await expect(page.getByLabel("墨痕呈现")).toHaveValue(n);
        await expect(page.getByLabel("证据呈现")).toHaveValue(e);
        await expect(page.getByRole("region", { name: "视觉舞台" })).toBeVisible();
      }
    }
  });

  for (const width of [1920, 1680, 1440, 1280, 1199, 1024, 768, 650, 390]) {
    test(`viewport ${width}: stage, recoverable panels and no page overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/explore");
      await expect(page.getByRole("region", { name: "视觉舞台" })).toBeVisible();
      await page.getByLabel("墨痕呈现").selectOption("OPEN");
      await page.getByLabel("证据呈现").selectOption("OPEN");
      if (width < 1280) {
        await expect(page.getByRole("complementary", { name: "辅助证据" })).toBeVisible();
        await expect(page.getByLabel("墨痕呈现")).toHaveValue("OPEN");
        await page.getByRole("button", { name: "查看墨痕" }).click();
        await expect(page.getByRole("complementary", { name: "墨痕叙事" })).toBeVisible();
        await expect(page.getByLabel("证据呈现")).toHaveValue("OPEN");
        await page.keyboard.press("Escape");
        await expect(page.getByRole("complementary", { name: "墨痕叙事" })).toBeHidden();
        await expect(page.getByRole("button", { name: "查看墨痕" })).toBeFocused();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
});

test("UXD7 EXP composition keeps expressions together and reports sparse space honestly", async ({ page }) => {
  await page.goto("/explore");
  const stage = page.getByRole("region", { name: "视觉舞台" });
  await page.getByRole("checkbox", { name: "时间" }).check();
  await page.getByRole("checkbox", { name: "空间" }).check();
  await expect(stage.getByRole("heading", { name: "关系观察" })).toBeVisible();
  await expect(stage.getByRole("heading", { name: "时间观察" })).toBeVisible();
  await expect(stage.getByRole("heading", { name: "空间观察" })).toBeVisible();
  await expect(stage).toContainText("缺少可用的空间定位");
  await expect(stage.locator("[data-precise-marker]")).toHaveCount(0);
});

test("UXD7 EXP failed follow-up preserves discovery and layout", async ({ page }) => {
  await page.route("**/api/explore/sessions", route => route.fulfill({ json: { ok: true, session_id: "test-session" } }));
  let calls = 0;
  await page.route("**/api/explore/sessions/test-session/query", route => {
    calls++;
    return calls === 1
      ? route.fulfill({ json: { ok: true, decision: { mohenLine: "夹具发现：先比较两处地点。", materials: [], gaps: [] } } })
      : route.fulfill({ status: 503, json: { ok: false, reason: "dependency_unavailable" } });
  });
  await page.goto("/explore");
  await page.getByLabel("向墨痕提问").fill("第一次问题");
  await page.getByRole("button", { name: "探索", exact: true }).click();
  await expect(page.getByText("夹具发现：先比较两处地点。")).toBeVisible();
  await page.getByLabel("证据呈现").selectOption("PEEK");
  await page.getByLabel("向墨痕提问").fill("第二次问题");
  await page.getByRole("button", { name: "探索", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "墨痕叙事" }).getByRole("alert")).toContainText("上一次发现已保留");
  await expect(page.getByText("夹具发现：先比较两处地点。")).toBeVisible();
  await expect(page.getByLabel("证据呈现")).toHaveValue("PEEK");
});

test("UXD7 EXP session denial does not send a query with a missing session", async ({ page }) => {
  let downstream = 0;
  await page.route("**/api/explore/sessions/*/query", route => { downstream++; return route.fulfill({ json: {} }); });
  await page.route("**/api/explore/sessions", route => route.fulfill({ status: 401, json: { ok: false, reason: "login_required" } }));
  await page.goto("/explore");
  await page.getByLabel("向墨痕提问").fill("一个问题");
  await page.getByRole("button", { name: "探索", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "墨痕叙事" }).getByRole("alert")).toContainText("登录");
  expect(downstream).toBe(0);
});

test("UXD7 EXP presentation preferences survive expression changes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/explore");
  await page.getByText("调整布局", { exact: true }).click();
  await page.getByLabel("墨痕停靠").selectOption("float");
  await page.getByLabel("墨痕宽度").fill("320");
  await page.getByLabel("墨痕距顶部").fill("40");
  await page.getByRole("checkbox", { name: "时间" }).check();
  await expect(page.getByLabel("墨痕停靠")).toHaveValue("float");
  await expect(page.getByLabel("墨痕宽度")).toHaveValue("320");
  await expect(page.getByLabel("墨痕距顶部")).toHaveValue("40");
  const panel = page.getByRole("complementary", { name: "墨痕叙事" });
  expect(Math.round((await panel.boundingBox())!.width)).toBe(320);
  await page.getByLabel("墨痕呈现").selectOption("HIDDEN");
  await page.getByLabel("墨痕呈现").selectOption("OPEN");
  await expect(page.getByLabel("墨痕宽度")).toHaveValue("320");
});

for (const deniedStatus of [401, 403, 410, 423]) {
  test(`UXD7 EXP graph denial ${deniedStatus} clears stale discovery`, async ({ page }) => {
    await page.route("**/api/explore/sessions", route => route.fulfill({ json: { ok: true, session_id: "test-session" } }));
    await page.route("**/api/explore/sessions/test-session/query", route => route.fulfill({ json: { ok: true, decision: { mohenLine: "夹具旧发现", materials: [], gaps: [] } } }));
    let graphs = 0;
    await page.route("**/api/explore/sessions/test-session/insight-views", route => ++graphs === 1
      ? route.fulfill({ json: { ok: true, graph: { nodes: [{ id: "old", label: "旧图节点", type: "other" }], edges: [] } } })
      : route.fulfill({ status: deniedStatus, json: { ok: false, reason: "forbidden" } }));
    await page.goto("/explore");
    await page.getByLabel("向墨痕提问").fill("原问题");
    await page.getByRole("button", { name: "探索", exact: true }).click();
    await expect(page.getByText("夹具旧发现", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "生成关系图", exact: true }).click();
    await expect(page.getByText("旧图节点", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "生成关系图", exact: true }).click();
    await expect(page.getByRole("complementary", { name: "墨痕叙事" }).getByRole("alert")).toContainText("不可访问");
    await expect(page.getByText("旧图节点", { exact: true })).toHaveCount(0);
    await expect(page.getByText("夹具旧发现", { exact: true })).toHaveCount(0);
  });
}

test("UXD7 EXP late graph cannot replace the next question's result", async ({ page }) => {
  await page.route("**/api/explore/sessions", route => route.fulfill({ json: { ok: true, session_id: "test-session" } }));
  await page.route("**/api/explore/sessions/test-session/query", route => route.fulfill({ json: { ok: true, decision: { mohenLine: `回答：${route.request().postDataJSON().question}`, materials: [], gaps: [] } } }));
  let releaseGraph!: () => void;
  const delayed = new Promise<void>(resolve => { releaseGraph = resolve; });
  let graphStarted!: () => void;
  const started = new Promise<void>(resolve => { graphStarted = resolve; });
  await page.route("**/api/explore/sessions/test-session/insight-views", async route => {
    graphStarted(); await delayed;
    await route.fulfill({ json: { ok: true, graph: { nodes: [{ id: "old", label: "旧问题迟到图", type: "other" }], edges: [] } } });
  });
  await page.goto("/explore");
  await page.getByLabel("向墨痕提问").fill("A");
  await page.getByRole("button", { name: "探索", exact: true }).click();
  await expect(page.getByText("回答：A", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "生成关系图", exact: true }).click();
  await started;
  await page.getByLabel("向墨痕提问").fill("B");
  await page.getByRole("button", { name: "探索", exact: true }).click();
  await expect(page.getByText("回答：B", { exact: true })).toBeVisible();
  const received = page.waitForResponse(response => response.url().endsWith("/insight-views"));
  releaseGraph(); await received;
  await expect(page.getByRole("button", { name: "生成关系图", exact: true })).toBeEnabled();
  await expect(page.getByText("旧问题迟到图", { exact: true })).toHaveCount(0);
});
