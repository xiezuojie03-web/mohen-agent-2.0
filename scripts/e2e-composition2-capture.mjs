// scripts/e2e-composition2-capture.mjs — TASK-0014 E2E + 人工视觉验收截图。
//
// 对已运行的 http://127.0.0.1:3000 执行任务书 §16 的 9 项 Human Visual Acceptance 流程，
// 截图落到 data/exports/task-0014-captures/。
// 断言失败以非零退出；输出 PASS/FAIL 明细，不虚报。

import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const OUT = path.join(process.cwd(), "data", "exports", "task-0014-captures");
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function record(step, ok, note = "") {
  results.push({ step, ok, note });
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}${note ? " — " + note : ""}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const shot = async (name) => {
  // 点击行动按钮后浏览器会把按钮滚进视口；截图前回到顶部，保证画面完整
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
};
/** 只取「当前画布」里的 Surface：退场层（fading）可能还残留同名 Surface，避免 strict mode 冲突 */
const cur = (id) => page.locator(".exp-canvas__current").getByTestId(id);
const next = async () => {
  await page.getByTestId("next-button").click();
  await page.waitForTimeout(450);
};

try {
  // —— 1. Beat01 Hook / Current Space
  await page.goto(BASE + "/experience/jinze-water-net", { waitUntil: "networkidle" });
  await cur("surface-current-map").waitFor({ timeout: 15000 });
  await page.waitForTimeout(1200); // 等入场动画播完（避免拍到 opacity=0 空帧）
  record("1 Beat01 primary = CurrentMapSurface", await cur("surface-current-map").isVisible());
  record("1 Beat01 空间模式 = 现代精确坐标", (await page.getByTestId("spatial-mode-label").innerText()).includes("现代精确坐标"));
  record("1 Beat01 问题由 QuestionSurface 呈现（非文字块重复）", (await page.locator(".exp-secondary").getByTestId("surface-question").count()) === 1 && (await page.locator(".exp-narrative .unit").count()) === 0);
  await shot("01-beat01-hook-current-space.png");

  // —— 2. Beat02 坐标退出后的 Time / Space Shift
  await next();
  await cur("surface-relational-space").waitFor({ timeout: 10000 });
  await page.waitForTimeout(420); // 退场层仍在播放：捕捉「坐标淡出」
  const fading = await page.locator(".exp-canvas__fading--coords-out").count();
  record("2 坐标退场层存在（coords-out）", fading > 0);
  record("2 Beat02 primary = RelationalSpaceSurface", await cur("surface-relational-space").isVisible());
  record("2 现代地图已退出主画布", (await cur("surface-current-map").count()) === 0);
  await shot("02-beat02-time-space-shift.png");

  // —— 3. Beat03 Bridge–Water–Bridge + Temple without false connection
  await next(); // s03
  await page.getByRole("button", { name: "把寺也放进来" }).click();
  await page.getByRole("button", { name: "寺与桥有关系吗" }).click();
  await page.waitForTimeout(400);
  record("3 寺已放入关系空间", (await cur("surface-relational-space").innerText()).includes("颐浩寺"));
  record("3 寺↔桥没有 evidenced 线（absent 表达）", (await page.locator(".exp-canvas__current").getByTestId("absent-relation").count()) === 1);
  record("3 缺证据回应不编造", (await page.getByTestId("temple-bridge-non-answer").innerText()).includes("没有找到"));
  await shot("03-beat03-bridge-water-temple.png");

  // —— 8. Approximate Area（寺的位置有多确定 → 近似区域，不得变精确点）
  await page.getByRole("button", { name: "寺的位置有多确定？" }).click();
  await cur("surface-approximate-area").waitFor({ timeout: 8000 });
  record("8 ApproximateAreaSurface 可切换", await cur("surface-approximate-area").isVisible());
  record("8 无中心精确 marker", (await cur("surface-approximate-area").innerText()).includes("没有中心精确 marker"));
  await shot("08-approximate-area.png");

  // —— 4. Beat04 一次 progressive conflict reveal
  await next(); // s04
  await next(); // s05
  await cur("surface-conflict-compare").waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: "看第一组分歧" }).click();
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: "看第二组分歧" }).click();
  await page.waitForTimeout(350);
  const c1 = await page.getByTestId("conflict-T11-C1").innerText();
  const c2 = await page.getByTestId("conflict-T11-C2").innerText();
  record("4 T11-C1 / T11-C2 并列可见", c1.length > 0 && c2.length > 0);
  record("4 冲突未裁决（不替用户选边）", c1.includes("未裁决") && c2.includes("未裁决"));
  await shot("04-beat04-conflict-reveal.png");

  // —— 9. Historical Map Native（若实现）
  await page.getByRole("button", { name: "看史料原页" }).click();
  await cur("surface-historical-map-native").waitFor({ timeout: 8000 });
  const hm = await cur("surface-historical-map-native").innerText();
  record("9 HistoricalMapNative 原型可见", hm.includes("不做现代配准"));
  record("9 明示无合格史料图像（不伪造）", hm.includes("本机无合格史料图像"));
  record("9 HR-MAP-01 保持 PARTIAL_CONFIRM", hm.includes("PARTIAL_CONFIRM"));
  await shot("09-historical-map-native.png");

  // —— 5. Beat04 Yihaosi temporal change
  await next(); // s06
  await cur("surface-timeline").waitFor({ timeout: 10000 });
  const tl = await cur("surface-timeline").innerText();
  record("5 s06 primary = TimelineSurface", await cur("surface-timeline").isVisible());
  record("5 毁损 / 原址重建 视觉区分", tl.includes("毁") && tl.includes("原址重建"));
  await shot("05-beat04-temporal-change.png");

  // —— 6. Beat05 Return + Discovery / next question
  await next(); // s07
  record("6 s07 primary 回到 CurrentMapSurface", await cur("surface-current-map").isVisible());
  await next(); // s08
  await cur("surface-discovery").waitFor({ timeout: 10000 });
  const disc = await page.getByTestId("primary-discovery").innerText();
  record("6 s08 primary = DiscoverySurface", await cur("surface-discovery").isVisible());
  record("6 主发现以解释框架身份呈现", disc.includes("墨痕的解释") && disc.includes("尚未证实"));
  await shot("06-beat05-return-discovery.png");

  // —— 7. Follow-up Patch（Patch-not-Replace）
  const urlBefore = page.url();
  await page.getByRole("button", { name: /追问/ }).click();
  await page.getByTestId("patch-card").waitFor({ timeout: 6000 });
  const patch = await page.getByTestId("patch-card").innerText();
  record("7 Patch 卡出现且体验未重启", patch.includes("体验未重启"));
  record("7 Patch 不编造答案（research_lead）", patch.includes("research_lead"));
  record("7 无路由跳转", page.url() === urlBefore);
  record("7 进度未重置（8/8）", (await page.locator(".exp-progress").innerText()).includes("8/8"));
  await shot("07-followup-patch.png");
} catch (e) {
  record("EXCEPTION", false, String(e).split("\n")[0]);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n==== E2E RESULT: ${results.length - failed.length}/${results.length} PASS ====`);
console.log(`captures: ${OUT}`);
process.exit(failed.length ? 1 : 0);
