// scripts/e2e-multi-intent-capture.mjs — TASK-0017 Multi-Intent Evidence-Aware Exploration Loop 浏览器验收。
//
// 针对已运行的 clean runtime（next dev -p 3001）走查任务书 §11 / §10-20 真浏览器链路：
//   同一 Experience 内，四类 canonical 追问各自触发不同的 EvidenceDecision / Replan / Surface，
//   且均 Patch-not-Replace、无整页 reload、pageerror=0。
//
// 截图落到 data/exports/task-0017-captures/：每个 intent 一张最终状态（共 4 张）+ 可选总览。
// 断言失败以非零退出；不虚报。
//
// 前置（由执行方负责，本脚本不启动 dev server）：
//   1) 停旧 dev；2) rm -rf apps/web/.next；3) 单一 next dev -p 3001；4) 浏览器可达 http://127.0.0.1:3001

import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3001";
const OUT = path.join(process.cwd(), "data", "exports", "task-0017-captures");
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function record(step, ok, note = "") {
  results.push({ step, ok, note });
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}${note ? " — " + note : ""}`);
}

// 四类 canonical 问句（与测试/运行时一致）
const INTENTS = [
  {
    key: "A",
    q: "那颐浩寺和普济桥以前真的有关系吗？",
    kind: "verify_historical_relation",
    surface: "surface-relational-space",
    intentSection: "replan-verify-relation",
    authority: "lost",
    routeVerified: "no",
  },
  {
    key: "B",
    q: "你凭什么这么判断？",
    kind: "inspect_evidence",
    surface: "surface-evidence-reveal",
    intentSection: "replan-evidence-inspect",
    authority: "kept",
    routeVerified: "no",
    extraVisible: ["evidence-inspection"], // B 主表达为证据揭示块
  },
  {
    key: "C",
    q: "它们后来发生了什么变化？",
    kind: "explore_temporal_change",
    surface: "surface-timeline",
    intentSection: "replan-temporal",
    authority: "lost",
    routeVerified: "no",
  },
  {
    key: "D",
    q: "那我现在去现场可以看什么？",
    kind: "propose_present_action",
    surface: "surface-current-map",
    intentSection: "replan-present-proposal",
    authority: "kept",
    routeVerified: "no",
  },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const pageErrors = [];
const consoleErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).split("\n")[0]));
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

const cur = (id) => page.locator(".exp-canvas__current").getByTestId(id);

// 走到 s08（追问入口：beat-05 / 下一问场景）
async function walkToFollowup() {
  await page.goto(BASE + "/experience/jinze-water-net", { waitUntil: "networkidle" });
  await cur("surface-current-map").waitFor({ timeout: 20000 });
  await page.waitForTimeout(1100);
  await page.addStyleTag({ content: "nextjs-portal{display:none !important}" });
  // no-reload 探针
  await page.evaluate(() => { window.__patch_marker = "set-at-load-" + Date.now(); });
  for (let i = 0; i < 8; i++) {
    if ((await page.getByRole("button", { name: /追问/ }).count()) > 0) return true;
    await page.getByTestId("next-button").click();
    await page.waitForTimeout(520);
  }
  return (await page.getByRole("button", { name: /追问/ }).count()) > 0;
}

try {
  for (const it of INTENTS) {
    const onFollowup = await walkToFollowup();
    record(`[${it.key}] 进入追问入口（追问按钮可见）`, onFollowup);

    // 点击该意图对应的「追问：...」按钮（按钮可读名含「追问：」前缀，用子串匹配）
    await page.getByRole("button", { name: it.q }).click();
    await page.getByTestId("replan-card").waitFor({ timeout: 12000 });
    await page.waitForTimeout(640);

    // R-INTENT：data-intent 与意图一致（同 runtime，不同判定）
    const intentAttr = await page.getByTestId("replan-card").getAttribute("data-intent");
    record(`[${it.key}] data-intent = ${it.kind}`, intentAttr === it.kind, String(intentAttr));

    // R-SURFACE：主角切到该意图目标 surface
    record(`[${it.key}] 主角切到 ${it.surface}（可见）`, (await cur(it.surface).count()) > 0);

    // 意图分流区块可见（证明不是同一模板换皮）
    record(`[${it.key}] 意图分流区块 ${it.intentSection} 可见`,
      (await page.getByTestId(it.intentSection).count()) > 0);

    // epistemic 诚实：当前坐标权威 / 路线验证标记
    const authority = await page.getByTestId("replan-card").getAttribute("data-current-coords-authority");
    record(`[${it.key}] data-current-coords-authority = ${it.authority}`, authority === it.authority, String(authority));
    const route = await page.getByTestId("replan-card").getAttribute("data-route-verified");
    record(`[${it.key}] data-route-verified = ${it.routeVerified}（非已验证导航）`, route === it.routeVerified, String(route));

    // B 专属：证据揭示块作为主表达可见
    if (it.extraVisible) {
      for (const ev of it.extraVisible) {
        record(`[${it.key}] ${ev} 可见（证据主表达）`, (await page.getByTestId(ev).count()) > 0);
      }
    }

    // D 专属：不得出现「坐标失去历史权威」提示（我们本就在 present）
    if (it.kind === "propose_present_action") {
      const lostVisible = (await page.getByTestId("coordinate-authority-lost").count()) > 0;
      record(`[${it.key}] present 意图不显示坐标失权威提示`, !lostVisible);
    }

    // R-PERSIST：无整页 reload（no-reload 探针仍在）
    const marker = await page.evaluate(() => window.__patch_marker ?? null);
    record(`[${it.key}] 体验未重启（无整页重载）`, !!marker);

    // 冻结 patch 结果卡让位（不冒充 runtime 输出）
    record(`[${it.key}] 冻结 patch 结果卡让位（不冒充 runtime）`,
      (await page.getByTestId("patch-card").count()) === 0);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(160);
    await page.screenshot({ path: path.join(OUT, `0${it.key === "A" ? 1 : it.key === "B" ? 2 : it.key === "C" ? 3 : 4}-${it.kind}.png`), fullPage: false });

    // 回到今天（清洁退出，避免影响下一轮 walkToFollowup 的干净状态）
    if ((await page.getByTestId("replan-return-present").count()) > 0) {
      await page.getByTestId("replan-return-present").click();
      await page.waitForTimeout(520);
    }
  }
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
console.log(`\n==== TASK-0017 MULTI-INTENT E2E: ${results.length - failed.length}/${results.length} PASS ====`);
console.log(`captures: ${OUT}`);
console.log(`pageErrors=${pageErrors.length} consoleErrors=${consoleErrors.length}`);
process.exit(failed.length ? 1 : 0);
