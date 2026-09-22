// scripts/e2e-experience-capture.mjs — TASK-0013 E2E + 人工验收截图（一次性脚本）。
// 对已运行的 http://127.0.0.1:3000 执行任务书 §17 最低 E2E 流程，
// 并产出 5 个 Human Visual Acceptance 状态截图到 data/exports/task-0013-captures/。
// 断言失败会以非零退出；输出 PASS/FAIL 明细，不虚报。

import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const OUT = path.join(process.cwd(), "data", "exports", "task-0013-captures");
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function record(step, ok, note = "") {
  results.push({ step, ok, note });
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}${note ? " — " + note : ""}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const shot = (name) => page.screenshot({ path: path.join(OUT, name), fullPage: false });

try {
  // —— s01：当前精确地理
  await page.goto(BASE + "/experience/jinze-water-net", { waitUntil: "networkidle" });
  await page.getByTestId("surface-modern-map").waitFor({ timeout: 15000 });
  await page.waitForTimeout(1200); // 等入场动画播完再截（避免拍到 opacity=0 瞬间）
  record("s01 modern_map 可见", true);
  record("s01 空间模式标签=现代精确坐标", (await page.getByTestId("spatial-mode-label").innerText()).includes("现代精确坐标"));
  await shot("01-s01-modern-exact.png");

  // —— s01→s02：坐标淡出，关系空间出现
  await page.getByTestId("next-button").click();
  await page.getByTestId("surface-timeline").waitFor({ timeout: 10000 });
  // 退场层正在播放（coords-out）时截图，捕捉「坐标消失」瞬间
  await page.waitForTimeout(350);
  await shot("02-s02-coords-fading.png");
  await page.waitForTimeout(900);
  record("s02 timeline 表面可见", await page.getByTestId("surface-timeline").isVisible());
  record("s02 空间模式=关系历史空间（无坐标）", (await page.getByTestId("spatial-mode-label").innerText()).includes("关系历史空间"));
  record("s02 现代地图已退场", (await page.getByTestId("surface-modern-map").count()) === 0);
  await shot("03-s02-relational.png");

  // —— s05：Evidence Reveal（双冲突并列）
  for (let i = 0; i < 3; i++) await page.getByTestId("next-button").click();
  await page.getByTestId("surface-evidence-panel").waitFor({ timeout: 10000 });
  const c1 = await page.getByTestId("conflict-T11-C1").innerText();
  const c2 = await page.getByTestId("conflict-T11-C2").innerText();
  record("s05 T11-C1 冲突卡可见", c1.includes("普济桥方位"));
  record("s05 T11-C2 冲突卡可见", c2.includes("万安桥跨水道"));
  record("s05 冲突未裁决", c1.includes("未裁决") && c2.includes("未裁决"));
  // Agent Action Layer 的「查看证据」滑出 Evidence Layer
  await page.getByRole("button", { name: "查看证据" }).click();
  await page.getByTestId("evidence-layer").waitFor({ timeout: 5000 });
  record("s05 Evidence Layer 滑出", true);
  await shot("04-s05-evidence-reveal.png");
  await page.getByRole("button", { name: "收起证据" }).click();

  // —— s08：Fact → Interpretation → Unknown
  for (let i = 0; i < 3; i++) await page.getByTestId("next-button").click();
  await page.getByTestId("surface-text-focus").waitFor({ timeout: 10000 });
  const factStyle = await page.getByTestId("unit-s08-u1").evaluate((el) => getComputedStyle(el).borderLeftStyle);
  const interpStyle = await page.getByTestId("unit-s08-u1b").evaluate((el) => getComputedStyle(el).borderStyle);
  const interpColor = await page.getByTestId("unit-s08-u1b").evaluate((el) => getComputedStyle(el).color);
  const factColor = await page.getByTestId("unit-s08-u1").evaluate((el) => getComputedStyle(el).color);
  record("s08 FACT 单元实线边框", factStyle === "solid");
  record("s08 INTERPRETATION 虚线边框", interpStyle.includes("dashed"));
  record("s08 解释与事实视觉不同", factStyle !== interpStyle || interpColor !== factColor);
  await shot("05-s08-fact-interpretation-unknown.png");

  // —— canonical follow-up：Patch-not-Replace
  const urlBefore = page.url();
  await page.getByTestId("followup-button").click();
  await page.getByTestId("patch-card").waitFor({ timeout: 5000 });
  record("Patch 卡出现（体验未重启）", (await page.getByTestId("patch-card").innerText()).includes("体验未重启"));
  record("Patch 展示 research_lead（不编造答案）", (await page.getByTestId("patch-card").innerText()).includes("research_lead"));
  record("Patch pill 常驻", await page.getByTestId("patch-pill").isVisible());
  record("无路由跳转", page.url() === urlBefore);
  record("场景进度未重置（8/8）", (await page.locator(".exp-progress").innerText()).includes("8 / 8"));
  record("叙事层内容保留", (await page.getByTestId("narrative-layer").innerText()).includes("跨同一条有名的水道"));
  await shot("06-followup-patch.png");
} catch (e) {
  record("EXCEPTION", false, String(e).split("\n")[0]);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n==== E2E RESULT: ${results.length - failed.length}/${results.length} PASS ====`);
process.exit(failed.length ? 1 : 0);
