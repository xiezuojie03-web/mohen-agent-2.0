import { test, expect } from "@playwright/test";

// E1-8 五页 UI 冒烟验收：加载 F01-F05 五页，验证全局导航 + 各页主组件渲染。
// 逐项 PASS/FAIL 由运行结果给出；152 动作全量逐交互验收在 UI 组件补齐后另行细化。

test("F01 首页：全局导航 + 品牌/入口渲染", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/墨痕/);
  // 全局导航五入口
  for (const href of ["/studio", "/watch", "/explore", "/admin"]) {
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
  }
});

test("F02 Studio：创作工作台渲染", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.locator("body")).toContainText(/创作|委托|研究|导演/);
});

test("F03 WATCH：观看页渲染（含空态）", async ({ page }) => {
  await page.goto("/watch");
  await expect(page.locator("body")).toContainText(/作品|观看|暂无/);
});

test("F04 EXP：探索工作台渲染", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.locator("body")).toContainText(/探索|关系|时间|空间|证据/);
});

test("F05 Admin：运营工作台渲染", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.locator("body")).toContainText(/运营|审核|发布|资产|知识/);
});
