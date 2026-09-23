// scripts/e2e-replan-loop-capture.mjs — TASK-0016 Evidence-Aware Replan Loop 浏览器验收。
//
// 针对已运行的 clean runtime（next dev -p 3001）走查任务书 §11 真浏览器链路：
//   Return to Present → canonical follow-up → Relational Historical（证据限制可见）→ return Present。
//
// 截图落到 data/exports/task-0016-captures/：
//   01-followup-before.png      追问前（s08 下一问/追问入口可见）
//   02-replan-relational.png    Replan 后：relational_space + 证据限制 ReplanCard 可见
//   03-replan-return-present.png Replan 后返回 Present（s07 今天），体验未重启
// 断言失败以非零退出；不虚报。

import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3001";
const OUT = path.join(process.cwd(), "data", "exports", "task-0016-captures");
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function record(step, ok, note = "") {
  results.push({ step, ok, note });
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}${note ? " — " + note : ""}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const pageErrors = [];
const consoleErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).split("\n")[0]));
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

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
  // —— 入场 ——
  await page.goto(BASE + "/experience/jinze-water-net", { waitUntil: "networkidle" });
  await cur("surface-current-map").waitFor({ timeout: 20000 });
  await page.waitForTimeout(1300); // 等入场动画

  // 隐藏 Next.js dev-mode 开发指示器（<nextjs-portal>，dev-only 固定层）。
  // 它固定在视口左下角，会拦截底部导航（上一步）的真实用户点击 —— 经 elementFromPoint 核实。
  // 生产 build 不含该元素；本轮按裁决 #3 不跑 build，故仅在 dev 走查中显式抑制该 overlay。
  await page.addStyleTag({ content: "nextjs-portal{display:none !important}" });

  // 打 no-reload 探针：若后续发生整页重载，该标记会被清除
  await page.evaluate(() => { window.__patch_marker = "set-at-load-" + Date.now(); });

  // —— Return to Present（s07「回到今天」）→ 追问入口出现（§2/§7：用户在回到今天后追问）——
  let onFollowup = false;
  for (let i = 0; i < 8; i++) {
    const btn = page.getByRole("button", { name: /追问/ });
    if ((await btn.count()) > 0) { onFollowup = true; break; }
    await next();
  }
  record("在「回到今天」后追问入口出现（追问按钮可见）", onFollowup);
  record("追问前处于 Present（surface-current-map 可见）", (await cur("surface-current-map").count()) > 0);
  // 追问前：ReplanCard 不应存在（证明是点击后才触发 runtime，非预先渲染）
  record("追问前 ReplanCard 不存在", (await page.getByTestId("replan-card").count()) === 0);
  await shot("01-followup-before.png");

  // —— canonical follow-up：点击「追问：那颐浩寺和普济桥以前真的有关系吗？」——
  await page.getByRole("button", { name: /追问/ }).first().click();
  await page.getByTestId("replan-card").waitFor({ timeout: 12000 });
  await page.waitForTimeout(600);

  // R-FOLLOWUP：runtime 真的跑了判定（verdict=insufficient_for_confirmation, epistemic=E2）
  const verdict = await page.getByTestId("replan-card").getAttribute("data-verdict");
  const epistemic = await page.getByTestId("replan-card").getAttribute("data-epistemic-class");
  // 冻结的 patch 结果卡必须让位：不得以「读取 followup-patch.json 的结果」冒充 runtime 输出（裁决 #2）
  record("Replan 期间冻结 patch 结果卡让位（不冒充 runtime 输出）", (await page.getByTestId("patch-card").count()) === 0);
  record("追问后 EvidenceDecision 运行：verdict=insufficient_for_confirmation", verdict === "insufficient_for_confirmation", String(verdict));
  record("追问后 E2 不升 E1：data-epistemic-class=E2", epistemic === "E2", String(epistemic));
  record("追问后 current coords 失去历史权威：data-current-coords-authority=lost",
    (await page.getByTestId("replan-card").getAttribute("data-current-coords-authority")) === "lost");

  // R-SURFACE：Evidence-aware Surface Selection 把主角切到 relational_space
  record("Replan 后主角切到 relational_space（surface-relational-space 可见）",
    (await cur("surface-relational-space").count()) > 0);
  // R-UNCERTAINTY：不确定 / 证据限制文案可见
  const replanText = await page.getByTestId("replan-verdict").innerText();
  record("证据限制文案可见（现有证据不足以确认 / 不把 E2 升为 E1）",
    /不足以确认/.test(replanText) && /E2/.test(replanText), replanText.slice(0, 40));
  record("寺桥关系不渲染为已确认（replan-plan 含 relationEpistemicClass=E2）",
    (await page.getByTestId("replan-plan").innerText()).includes("E2"));
  await shot("02-replan-relational.png");

  // —— return to present：Replan 视角出口「回到今天」——
  await page.getByTestId("replan-return-present").click();
  await page.waitForTimeout(620);
  record("返回 Present：surface-current-map 重新可见", (await cur("surface-current-map").count()) > 0);
  record("返回 Present：回到 GEOGRAPHIC_EXACT 当下场景", (await page.getByTestId("spatial-mode-label").innerText()).includes("精确"));

  // R-PERSIST：Patch-not-Replace 保持（无整页 reload、replan 痕迹仍在）
  patchMarker = await page.evaluate(() => window.__patch_marker ?? null);
  record("返回 Present 后体验未重启（无整页重载）", !!patchMarker);
  record("返回 Present 后 ReplanCard 仍在（Patch-not-Replace 保留痕迹）",
    (await page.getByTestId("replan-card").count()) > 0);
  await shot("03-replan-return-present.png");
} catch (e) {
  record("EXCEPTION", false, String(e).split("\n").slice(0, 6).join(" | "));
} finally {
  record("无 uncaught runtime exception（pageerror=0）", pageErrors.length === 0,
    pageErrors.length ? pageErrors.join(" | ") : "0");
  if (consoleErrors.length) {
    console.log("INFO console.error 明细（透明核对，非直接判失败除非体验失效级）：");
    for (const c of consoleErrors.slice(0, 20)) console.log("   • " + c.slice(0, 200));
  }
  record("console.error 条数（透明记录）", true, String(consoleErrors.length));
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n==== TASK-0016 REPLAN LOOP E2E: ${results.length - failed.length}/${results.length} PASS ====`);
console.log(`captures: ${OUT}`);
console.log(`pageErrors=${pageErrors.length} consoleErrors=${consoleErrors.length}`);
process.exit(failed.length ? 1 : 0);
