// tests/e2e/experience-recon-01.spec.ts — EXP-UI-RECON-01 R1–R5 E2E。
//
// 对照 Task Book §13 Acceptance Tests：
//   AT-01 默认 UI 无 transition recipe / 主角变量（R1）
//   AT-02 默认 UI 无内部 epistemic / 闸门枚举、AD-xx 控制语言（R2）
//   AT-03 默认冲突面无 eligible / ineligible 裁决标签；冲突事实诚实保留（R3 / K6）
//   AT-04 默认 Discovery 无伪公式（R3）
//   AT-05 默认地图无 6 位 raw GPS；坐标系诚实说明与几何保留（R4 / K7）
//   AT-06 ?inspector=1 仍可访问全部内部诊断信息（R5）
//   AT-07 五幕节奏 / 单主焦点 / 世界重组不退化（K1/K2/K3）
//   AT-08 Evidence-on-Demand 闸门能力保持，仅表达人话化（K6）
//   AT-09 Follow-up / Replan Patch-not-Replace 保持（K4）
//   AT-10 无 chat-first 回归；墨痕 Presence 保持（K5）
//
// 注：默认模式禁令约束「技术词汇载体」（徽章 / 状态条 / 调试条 / 地图子标签）；
//   冻结叙事原文中合法出现的人话词汇不做全文禁令。

import { test, expect, type Page } from "@playwright/test";

const cur = (page: Page, id: string) => page.locator(".exp-canvas__current").getByTestId(id);

/** 6 位小数 raw GPS 坐标对字面量（R4；形如 120.919639, 31.039508）。
 *  用「逗号分隔坐标对」形态避免 textContent 拼接造成的假阳性。 */
const GPS6 = /\d{2,3}\.\d{6},\s*\d{1,2}\.\d{6}/;

/** 徽章载体上禁止出现的内部标签（默认 Human UI，R2） */
const FORBIDDEN_BADGES = [
  "可用片段",
  "禁用片段",
  "受约束片段",
  "有据事实",
  "开放问题",
  "墨痕的解释框架",
  "有限事实",
];

/** 全文层面禁止的内部控制语言（默认 Human UI，R1–R3） */
const FORBIDDEN_TEXT = [
  "IMMERSIVE_SPATIAL",
  "主角=",
  "可用片段",
  "禁用片段",
  "受约束片段",
  "静默裁决：",
  "并列比较：",
  "Evidence(A)+",
  "AD-05",
];

async function clickNext(page: Page) {
  const next = page.getByTestId("next-button");
  await expect(next).toBeEnabled();
  await next.click();
  await page.waitForTimeout(150);
}

/**
 * 默认 Human UI 统一断言（R1–R4 + R5 一致性规则）。
 * 在每个场景调用一次：技术词汇不允许出现在任何场景的任何载体上。
 */
async function assertHumanMode(page: Page) {
  // AT-01：transition-hint 默认不渲染
  expect(await page.getByTestId("transition-hint").count()).toBe(0);

  // AT-02：徽章不出现内部 epistemic / 闸门词汇
  const badges = await page.locator(".unit__badge").allTextContents();
  for (const b of badges) {
    for (const f of FORBIDDEN_BADGES) {
      expect(b, `徽章泄露内部词汇: "${b}"`).not.toContain(f);
    }
  }

  // AT-02 / AT-03 / AT-04：全文无内部裁决 / 伪公式 / 控制编号 / 调试条文本
  const body = (await page.locator(".exp").textContent()) ?? "";
  for (const f of FORBIDDEN_TEXT) {
    expect(body, `默认 UI 泄露内部语言: "${f}"`).not.toContain(f);
  }
  // AT-02：内部编号 / epistemic 枚举的正则级全文检查（AD-xx / Uxx： / E1-E3 / 括号内裸标记 / HR-xx / 谓词键）
  expect(body, "默认 UI 泄露 AD-xx 控制编号").not.toMatch(/AD-\d+/);
  expect(body, "默认 UI 泄露 U-xx/HR-xx 控制编号").not.toMatch(/U\d+：|[（(]\s*U\d+\s*[）)]|U\d+\s*[（(]|[（(]\s*HR-\d+\s*[）)]/);
  expect(body, "默认 UI 泄露 epistemic 枚举").not.toMatch(/[^\u4e00-\u9fa5]E[123](?![0-9A-Za-z%])/);
  expect(body, "默认 UI 泄露关系谓词枚举键").not.toMatch(/former_site_of|named_after|spans_waterway|temple_bridge_association/);

  // AT-05：无 6 位 raw GPS 字面量
  expect(body, "默认 UI 泄露 6 位 raw GPS").not.toMatch(GPS6);

  // R2：片段闸门（若该场景渲染）——人话徽章 + 内部前缀剥离
  const frag = page.locator(".evidence-frag-gates");
  if ((await frag.count()) > 0) {
    const t = (await frag.first().textContent()) ?? "";
    expect(t).toContain("暂不采用（依据不足）");
    expect(t).not.toContain("禁用片段");
    expect(t).not.toContain("AD-05");
  }

  // R2：开放问题徽章人话化（若该场景渲染；段落标题「今日开放问题」是合法人话，不做全文禁令）
  const oq = page.locator(".evidence-open-questions");
  if ((await oq.count()) > 0) {
    const t = (await oq.first().textContent()) ?? "";
    expect(t).toContain("待确认");
    expect(t).not.toMatch(/U\d+：/);
  }
}

// ---------------------------------------------------------------------------

test.describe("EXP-UI-RECON-01 · default Human UI", () => {
  test("R1–R4：无内部技术语言；KEEP（五幕 / 世界重组 / Patch / Presence）不退化", async ({ page }) => {
    await page.goto("/experience/jinze-water-net");
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });

    // —— s01 首屏：地图（AT-01 / AT-05 / K7 坐标诚实分离保留）
    await expect(cur(page, "surface-current-map")).toBeVisible();
    await expect(page.locator(".surf-map--v2")).toContainText("本图坐标系 GCJ-02（原值，零换算）");
    await assertHumanMode(page);
    // K1：五幕以节奏表达（进度条），非五个面板
    await expect(page.locator(".exp-progress")).toContainText("Beat 1/5 · 1/8");

    // —— s02 时间/空间转换：世界重组（K3），不是文字解释
    await clickNext(page);
    await expect(cur(page, "surface-relational-space")).toBeVisible();
    await assertHumanMode(page);

    // —— s03 关系发现
    await clickNext(page);
    await expect(cur(page, "surface-relational-space")).toBeVisible();
    await assertHumanMode(page);

    // —— s05 证据与冲突：AT-03 / K6（冲突诚实保留，裁决标签人话化）
    await clickNext(page);
    await clickNext(page);
    await expect(cur(page, "surface-conflict-compare")).toBeVisible();
    await page.getByRole("button", { name: "看第一组分歧" }).click();
    await page.getByRole("button", { name: "看第二组分歧" }).click();
    await expect(page.getByTestId("conflict-T11-C1")).toContainText("未裁决");
    await expect(page.getByTestId("conflict-T11-C2")).toContainText("未裁决");
    await expect(page.locator(".conflict-status")).toContainText("两种资料并存");
    await assertHumanMode(page);

    // —— s06 时间轴
    await clickNext(page);
    await expect(cur(page, "surface-timeline")).toBeVisible();
    await assertHumanMode(page);

    // —— s07 回到今天：世界切回当下地图（P1「重新看见今天」，与既有 E2E 同一 KEEP 断言）
    await clickNext(page);
    await expect(cur(page, "surface-current-map")).toBeVisible();
    await assertHumanMode(page);

    // —— s08 发现：AT-04 伪公式 → 人话；解释仍是解释（不升格为事实）
    await clickNext(page);
    await expect(cur(page, "surface-discovery")).toBeVisible();
    await expect(page.locator(".discovery-rule")).toContainText("三条证据各自成立");
    await expect(page.getByTestId("primary-discovery")).toContainText("墨痕的解释");
    await assertHumanMode(page);

    // —— AT-09 Patch-not-Replace：追问 → 世界重组，无 reload、进度不重置
    const beforeUrl = page.url();
    await page.getByRole("button", { name: /追问/ }).first().click();
    await expect(page.getByTestId("patch-pill")).toBeVisible();
    await expect(page.locator(".exp-progress")).toContainText("8/8");
    expect(page.url()).toBe(beforeUrl);
    // 默认模式不渲染内部 runtime replan-card（R5 一致性）
    await expect(page.getByTestId("replan-card")).toHaveCount(0);
    await assertHumanMode(page);

    // —— AT-10 Agent-native presence：无 chat input；墨痕在场
    expect(await page.locator("input[type=text], textarea").count()).toBe(0);
    await expect(page.getByTestId("agent-prompt").first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe("EXP-UI-RECON-01 · inspector mode", () => {
  test("R5：?inspector=1 保留全部内部诊断信息（能力不删除，仅门控）", async ({ page }) => {
    await page.goto("/experience/jinze-water-net?inspector=1");
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });

    // AT-01 / AT-06：transition-hint（recipe · 主角）回到 Inspector
    await expect(page.getByTestId("transition-hint")).toBeVisible();
    await expect(page.getByTestId("transition-hint")).toContainText("IMMERSIVE_SPATIAL");
    await expect(page.getByTestId("transition-hint")).toContainText("主角=");

    // AT-05 / AT-06：6 位 raw GPS 在 Inspector 可见；几何与坐标系说明仍在
    await expect(cur(page, "surface-current-map")).toBeVisible();
    const mapText = (await page.locator(".surf-map--v2").textContent()) ?? "";
    expect(mapText).toMatch(GPS6);
    await expect(page.locator(".surf-map--v2")).toContainText("本图坐标系 GCJ-02（原值，零换算）");

    // —— s05：内部裁决标签 / 内部闸门徽章 / AD 前缀全部保留
    await clickNext(page);
    await clickNext(page);
    await clickNext(page);
    await clickNext(page);
    await expect(cur(page, "surface-conflict-compare")).toBeVisible();
    await expect(page.locator(".conflict-status")).toContainText("静默裁决：ineligible");
    await expect(page.locator(".conflict-status")).toContainText("并列比较：eligible");
    const frag = page.locator(".evidence-frag-gates");
    if ((await frag.count()) > 0) {
      const t = (await frag.first().textContent()) ?? "";
      expect(t).toContain("禁用片段");
      expect(t).toContain("AD-05");
    }

    // —— s08：伪公式在 Inspector 保留
    await clickNext(page);
    await clickNext(page);
    await clickNext(page);
    await expect(cur(page, "surface-discovery")).toBeVisible();
    await expect(page.locator(".discovery-rule code")).toContainText("Evidence(A)+");

    // AT-06：内部 runtime replan-card 在 Inspector 可见
    await page.getByRole("button", { name: /追问/ }).first().click();
    await expect(page.getByTestId("replan-card")).toBeVisible();
    await expect(page.getByTestId("transition-hint")).toBeVisible();
  });
});
