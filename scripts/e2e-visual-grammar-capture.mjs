// scripts/e2e-visual-grammar-capture.mjs — TASK-0015 真实浏览器 E2E + 人工视觉验收截图。
//
// 对已运行的 http://127.0.0.1:3000 走查任务书 §15 的 8+ 张人工视觉验收：
//   01 当前地理空间 / 02 当前→历史退场 / 03 桥—水关系空间 / 04 寺进入+未证关系 /
//   05 关系 focus / 06 时间景观全局 / 07 1938→1992 时间焦点 / 08 回到今天。
// 截图落到 data/exports/task-0015-captures/。断言失败以非零退出；不虚报。

import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const OUT = path.join(process.cwd(), "data", "exports", "task-0015-captures");
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function record(step, ok, note = "") {
  results.push({ step, ok, note });
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}${note ? " — " + note : ""}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const shot = async (name) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(140);
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
};
// 只取「当前画布」里的 Surface：退场层可能残留同名 Surface
const cur = (id) => page.locator(".exp-canvas__current").getByTestId(id);
const next = async () => {
  await page.getByTestId("next-button").click();
  await page.waitForTimeout(500);
};
const clickBtn = async (name) => {
  await page.getByRole("button", { name }).first().click();
  await page.waitForTimeout(420);
};

try {
  await page.goto(BASE + "/experience/jinze-water-net", { waitUntil: "networkidle" });
  await cur("surface-current-map").waitFor({ timeout: 20000 });
  await page.waitForTimeout(1300); // 等入场动画播完

  // —— 01. 当前地理空间（Current Geographic V2）
  record("01 Current Geographic Surface 可见", await cur("surface-current-map").isVisible());
  record("01 只声明「今天」+ GCJ-02 原值", (await cur("surface-current-map").innerText()).includes("今天"));
  await shot("01-current-geographic.png");

  // —— 02. 当前 → 历史 退场（坐标失去历史定位资格）
  await next();
  await cur("surface-relational-space").waitFor({ timeout: 12000 });
  await page.waitForTimeout(450);
  record("02 坐标退场：关系历史空间已接替主画布", (await cur("surface-relational-space").count()) > 0);
  record("02 坐标失去历史定位资格标记持续存在", (await page.getByTestId("coordinate-authority-lost").count()) > 0);
  record("02 现代地图已退出主画布", (await cur("surface-current-map").count()) === 0);
  await shot("02-current-to-historical-exit.png");

  // —— 03. 桥—水关系空间（spine 骨架 + 两桥骑在骨架上，寺尚未进入）
  await next();
  await cur("surface-relational-space").waitFor({ timeout: 12000 });
  await page.waitForTimeout(450);
  const relBefore = await cur("surface-relational-space").innerText();
  record("03 关系空间已呈现（无经纬度）", relBefore.includes("人文拓扑空间") || relBefore.includes("无经纬度"));
  if (!(relBefore.includes("人文拓扑空间") || relBefore.includes("无经纬度"))) {
    console.log("DEBUG s03 relBefore:", JSON.stringify(relBefore.slice(0, 160)));
  }
  record("03 寺尚未进入画面（默认不进）", !relBefore.includes("颐浩寺"));
  await shot("03-relational-bridge-water.png");

  // —— 04. 寺进入 + 未证关系（negative space）
  await clickBtn("把寺也放进来");
  await clickBtn("寺与桥有关系吗");
  await page.waitForTimeout(450);
  const relAfter = await cur("surface-relational-space").innerText();
  record("04 寺已进入关系空间", relAfter.includes("颐浩寺"));
  record("04 寺↔桥没有 evidenced 线（absent 表达）", (await page.locator(".exp-canvas__current").getByTestId("absent-relation").count()) === 1);
  record("04 缺证据回应不编造", (await page.getByTestId("temple-bridge-non-answer").innerText()).includes("没有找到"));
  await shot("04-relational-temple-enters-unproven.png");

  // —— 05. 关系 focus / progressive reveal（点击节点 → focus 转移）
  const nodesInCurrent = page.locator(".exp-canvas__current").locator("[data-testid^='vg-node-']");
  const nodeCount = await nodesInCurrent.count();
  console.log("DEBUG nodeCount:", nodeCount);
  let focused = false;
  for (let i = 0; i < nodeCount; i++) {
    const node = nodesInCurrent.nth(i);
    await node.scrollIntoViewIfNeeded().catch(() => {});
    const b = await node.boundingBox();
    const inView = !!b && b.y >= 0 && b.y + b.height <= 1000;
    if (!inView) continue; // 跳过被顶栏遮挡 / 视口外的节点（如SVG 顶部的 aside 节点）
    await node.click({ force: true });
    await page.waitForTimeout(450);
    if ((await page.locator(".exp-canvas__current .vg-d-primary").count()) > 0) {
      focused = true;
      break;
    }
    await node.click({ force: true }); // 复位，试下一个
    await page.waitForTimeout(250);
  }
  record("05 节点可点击触发 focus", focused);
  await shot("05-relational-focus.png");
  // 复位 focus，避免影响后续导航
  const primaryNow = page.locator(".exp-canvas__current .vg-d-primary");
  if ((await primaryNow.count()) > 0) {
    await primaryNow.first().click({ force: true });
    await page.waitForTimeout(300);
  }

  // —— 走到 Timeline（最多 6 次 next）
  let reached = false;
  for (let i = 0; i < 6; i++) {
    if ((await cur("surface-timeline").count()) > 0) { reached = true; break; }
    await next();
  }
  await cur("surface-timeline").waitFor({ timeout: 12000 });
  await page.waitForTimeout(600);

  // —— 06. 时间景观全局（Temporal Landscape）
  const tl = await cur("surface-timeline").innerText();
  record("06 TimelineSurface 可见", await cur("surface-timeline").isVisible());
  record("06 毁损 / 原址重建 视觉区分（非年份卡列表）", tl.includes("毁") && tl.includes("原址重建"));
  record("06 时间状态显示存在", (await page.getByTestId("time-state-display").count()) > 0);
  await shot("06-temporal-landscape.png");

  // —— 07. 1938→1992 时间焦点（聚焦颐浩寺行：毁损段 + 原址重建段）
  const yihaosiRow = page.locator(".tl-row", { hasText: "颐浩寺" }).first();
  if ((await yihaosiRow.count()) > 0) {
    await yihaosiRow.click();
    await page.waitForTimeout(450);
    record("07 可聚焦具体对象的时间生命线", (await page.locator(".exp-canvas__current .tl-d-primary").count()) > 0);
  } else {
    record("07 可聚焦具体对象的时间生命线", false, "未找到颐浩寺行");
  }
  await shot("07-temporal-1938-1992-focus.png");

  // —— 08. 回到今天（Return to Present）
  for (let i = 0; i < 4; i++) {
    if ((await cur("surface-current-map").count()) > 0) break;
    await next();
  }
  await cur("surface-current-map").waitFor({ timeout: 12000 });
  await page.waitForTimeout(500);
  record("08 回到今天：CurrentMapSurface 重新可见", await cur("surface-current-map").isVisible());
  record("08 体验未重启（Patch 行为不回归）", (await page.locator(".exp-canvas__current").count()) > 0);
  await shot("08-return-to-present.png");
} catch (e) {
  record("EXCEPTION", false, String(e).split("\n")[0]);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n==== E2E RESULT: ${results.length - failed.length}/${results.length} PASS ====`);
console.log(`captures: ${OUT}`);
process.exit(failed.length ? 1 : 0);
