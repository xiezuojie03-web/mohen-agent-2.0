import { test, expect } from "@playwright/test";

// E1-8 前端逐控件交互验收：真实点击/输入，验证「控件 → 服务 → 结果」闭环。
// 涉及 LLM/外部检索的用例用较长超时，属真实链路（非 mock）。

test.describe("Studio 创作交互", () => {
  test("自然语言委托 → 墨痕回应", async ({ page }) => {
    test.setTimeout(120000);
    await page.goto("/studio");
    await page.getByLabel("向墨痕委托或提问").fill("万安桥和普济桥是什么关系");
    await page.locator(".studio__send").click();
    await expect(page.locator(".studio__msg--mohen").first()).toBeVisible({ timeout: 90000 });
    await expect(page.locator(".studio__msg--mohen").first()).not.toBeEmpty();
  });

  test("示例按钮一键提问", async ({ page }) => {
    test.setTimeout(120000);
    await page.goto("/studio");
    await page.getByRole("button", { name: /万安桥和普济桥/ }).first().click();
    await expect(page.locator(".studio__msg--mohen").first()).toBeVisible({ timeout: 90000 });
  });

  test("生成导演方案 A/B（真实 LLM）", async ({ page }) => {
    test.setTimeout(180000);
    await page.goto("/studio");
    // 先发起一次创作委托，让「生成方案」有 brief 可用
    await page.getByRole("button", { name: /金泽古桥与寺院/ }).first().click();
    await expect(page.locator(".studio__msg--mohen").first()).toBeVisible({ timeout: 90000 });
    // 点「生成方案」
    await page.getByRole("button", { name: /生成方案/ }).click();
    await expect(page.locator(".studio__plan--a")).toBeVisible({ timeout: 150000 });
    await expect(page.locator(".studio__plan--b")).toBeVisible();
    await expect(page.locator(".studio__plan--a .studio__plan-note")).not.toBeEmpty();
  });
});

test.describe("EXP 探索交互", () => {
  test("四视图切换（关系/时间/空间/故事）", async ({ page }) => {
    await page.goto("/explore");
    const cases: Array<[string, string]> = [
      ["关系", "关系视图"],
      ["时间", "时间视图"],
      ["空间", "空间视图"],
      ["故事", "故事视图"],
    ];
    for (const [label, heading] of cases) {
      await page.locator(".explore__viewtab", { hasText: label }).click();
      await expect(page.locator(".explore__canvas h3")).toHaveText(heading);
    }
  });
});
