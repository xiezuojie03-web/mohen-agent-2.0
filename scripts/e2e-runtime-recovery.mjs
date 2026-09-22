// scripts/e2e-runtime-recovery.mjs — TASK-0015-FIX Runtime Delivery Recovery 验收。
//
// 针对已运行的 clean runtime（next dev -p 3001）走查任务书新增 Runtime Acceptance Gate：
//   R1  GET 真实加载无 Runtime Error（由调用方 curl + 本脚本 surface 可见共同证明）
//   R2  浏览器 console 不出现导致体验失效的 uncaught runtime exception
//   R3  从 Beat1（CurrentMap）→ 至少一个 relational historical scene 可交互进入
//   R4  可进入 Temporal Landscape（TimelineSurface）
//   R5  可 Return to Present，体验不重启，Patch-not-Replace 保持
//   R8  生成 01/02/03/04 四张截图（来自本次 clean runtime）
// （R6 = 另起一次 clean restart 重跑 R1；R7 = unit/typecheck/build/核心E2E 无回归，由脚本外部跑）
//
// 截图落到 data/exports/task-0015-fix-captures/。断言失败以非零退出；不虚报。

import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3001";
const OUT = path.join(process.cwd(), "data", "exports", "task-0015-fix-captures");
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function record(step, ok, note = "") {
  results.push({ step, ok, note });
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}${note ? " — " + note : ""}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

// —— R2 监听：uncaught exception（pageerror）与 console error ——
const pageErrors = [];
const consoleErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).split("\n")[0]));
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

// 只取「当前画布」里的 Surface：退场层可能残留同名 Surface
const cur = (id) => page.locator(".exp-canvas__current").getByTestId(id);
const next = async () => {
  await page.getByTestId("next-button").click();
  await page.waitForTimeout(520);
};
const shot = async (name) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(160);
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
};

let patchMarker = null;

try {
  // —— R1 / 入场 ——
  await page.goto(BASE + "/experience/jinze-water-net", { waitUntil: "networkidle" });
  await cur("surface-current-map").waitFor({ timeout: 20000 });
  await page.waitForTimeout(1300); // 等入场动画播完

  // 打 Patch-not-Replace 探针：若后续发生整页重载，该标记会被清除
  await page.evaluate(() => { window.__patch_marker = "set-at-load-" + Date.now(); });
  record("R1 Beat1 CurrentMapSurface 真实加载可见", await cur("surface-current-map").isVisible());
  record("R1 当前画布只声明「今天」(GCJ-02 原值)", (await cur("surface-current-map").innerText()).includes("今天"));
  await shot("01-clean-runtime-entry.png");

  // —— R3：Beat1 → relational historical scene（surface-relational-space）——
  await next();
  await cur("surface-relational-space").waitFor({ timeout: 12000 });
  await page.waitForTimeout(500);
  const relVisible = (await cur("surface-relational-space").count()) > 0;
  record("R3 进入 relational historical scene（surface-relational-space 可见）", relVisible);
  record("R3 坐标失去历史定位资格标记存在", (await page.getByTestId("coordinate-authority-lost").count()) > 0);
  record("R3 现代地图已退出主画布（Patch 切换，非叠加）", (await cur("surface-current-map").count()) === 0);
  await shot("02-relational-runtime.png");

  // —— R4：进入 Temporal Landscape（surface-timeline）——
  let reachedTl = false;
  for (let i = 0; i < 7; i++) {
    if ((await cur("surface-timeline").count()) > 0) { reachedTl = true; break; }
    await next();
  }
  if (reachedTl) {
    await cur("surface-timeline").waitFor({ timeout: 12000 });
    await page.waitForTimeout(650);
  }
  record("R4 进入 Temporal Landscape（surface-timeline 可见）", reachedTl);
  if (reachedTl) {
    const tl = await cur("surface-timeline").innerText();
    record("R4 时间景观含毁损/原址重建视觉区分", tl.includes("毁") && tl.includes("原址重建"));
    record("R4 时间状态显示存在", (await page.getByTestId("time-state-display").count()) > 0);
  }
  await shot("03-temporal-runtime.png");

  // —— R5：Return to Present（surface-current-map 重新可见，且不重启）——
  let returned = false;
  for (let i = 0; i < 6; i++) {
    if ((await cur("surface-current-map").count()) > 0) { returned = true; break; }
    await next();
  }
  if (returned) {
    await cur("surface-current-map").waitFor({ timeout: 12000 });
    await page.waitForTimeout(550);
  }
  record("R5 回到今天：CurrentMapSurface 重新可见", returned);
  patchMarker = await page.evaluate(() => window.__patch_marker ?? null);
  record("R5 体验未重启、Patch-not-Replace 保持（无整页重载）", !!patchMarker);
  record("R5 当前画布仍存在（Patch 行为不回归）", (await page.locator(".exp-canvas__current").count()) > 0);
  await shot("04-return-runtime.png");
} catch (e) {
  record("EXCEPTION", false, String(e).split("\n")[0]);
} finally {
  // —— R2 结算 ——
  record("R2 无 uncaught runtime exception（pageerror=0）", pageErrors.length === 0, pageErrors.length ? pageErrors.join(" | ") : "0");
  if (consoleErrors.length) {
    console.log("INFO console.error 明细（供透明核对，不直接判失败除非属体验失效级）：");
    for (const c of consoleErrors.slice(0, 20)) console.log("   • " + c.slice(0, 200));
  }
  record("R2 console.error 条数（透明记录）", true, String(consoleErrors.length));
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n==== RUNTIME RECOVERY E2E: ${results.length - failed.length}/${results.length} PASS ====`);
console.log(`captures: ${OUT}`);
console.log(`pageErrors=${pageErrors.length} consoleErrors=${consoleErrors.length}`);
process.exit(failed.length ? 1 : 0);
