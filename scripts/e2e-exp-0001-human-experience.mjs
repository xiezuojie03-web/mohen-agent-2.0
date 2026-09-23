// scripts/e2e-exp-0001-human-experience.mjs — EXP-0001 Human Experience Translation Slice 浏览器验收。
//
// 针对已运行的 clean runtime（next dev -p 3001）走查任务书 §11 / §13 / §14 / §15：
//   普通模式（默认）：四意图均通过 IntentGuide + Canvas/Surface 收口；
//     · replan-card（Inspector）**不可见** —— 硬测试「inspector 消失，墨痕仍在」（§5）。
//     · intent-guide 可见且四意图收口句可区分；主角 Surface 因意图切换。
//     · D 不显示「坐标失权威」提示（本就在 present）；无冻结 patch 结果卡冒充。
//   DEV 模式（?inspector=1）：replan-card 内部 runtime label 仍可见（runtime contract 保留给评审）。
//
// 截图落到 data/exports/exp-0001-captures/：每个意图一张最终态（共 4 张，普通模式）。
// 断言失败以非零退出；不虚报。
//
// 前置（由执行方负责，本脚本不启动 dev server）：
//   1) 停旧 dev；2) rm -rf apps/web/.next；3) 单一 next dev -p 3001；4) 浏览器可达 http://127.0.0.1:3001

import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3001";
const OUT = path.join(process.cwd(), "data", "exports", "exp-0001-captures");
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function record(step, ok, note = "") {
  results.push({ step, ok, note });
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}${note ? " — " + note : ""}`);
}

// 四类 canonical 问句（与运行时/单测一致）
const INTENTS = [
  {
    key: "A",
    q: "那颐浩寺和普济桥以前真的有关系吗？",
    kind: "verify_historical_relation",
    surface: "surface-relational-space",
    guideIncludes: "现在还不能确定它们历史上有关系",
    authorityLost: true,
  },
  {
    key: "B",
    q: "你凭什么这么判断？",
    kind: "inspect_evidence",
    surface: "surface-evidence-reveal",
    guideIncludes: "依据和缺口都摊开给你看",
    authorityLost: false,
    extraVisible: ["evidence-inspection"],
  },
  {
    key: "C",
    q: "它们后来发生了什么变化？",
    kind: "explore_temporal_change",
    surface: "surface-timeline",
    guideIncludes: "没有沿着同一条时间线走到今天",
    authorityLost: true,
  },
  {
    key: "D",
    q: "那我现在去现场可以看什么？",
    kind: "propose_present_action",
    surface: "surface-current-map",
    guideIncludes: "带着下面的问题，去现场重新看一次",
    authorityLost: false,
    observeItems: 2,
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

// 走到 s08（追问入口）。dev=是否带 ?inspector=1
async function walkToFollowup(dev) {
  const qs = dev ? "?inspector=1" : "";
  await page.goto(BASE + "/experience/jinze-water-net" + qs, { waitUntil: "networkidle" });
  await cur("surface-current-map").waitFor({ timeout: 20000 });
  await page.waitForTimeout(1100);
  await page.addStyleTag({ content: "nextjs-portal{display:none !important}" });
  await page.evaluate(() => { window.__patch_marker = "set-at-load-" + Date.now(); });
  for (let i = 0; i < 8; i++) {
    if ((await page.getByRole("button", { name: /追问/ }).count()) > 0) return true;
    await page.getByTestId("next-button").click();
    await page.waitForTimeout(520);
  }
  return (await page.getByRole("button", { name: /追问/ }).count()) > 0;
}

try {
  // ===== 普通模式：Inspector 隐藏，IntentGuide 收口 =====
  for (const it of INTENTS) {
    const onFollowup = await walkToFollowup(false);
    record(`[${it.key}] 进入追问入口（追问按钮可见）`, onFollowup);

    await page.getByRole("button", { name: it.q }).click();
    await page.getByTestId("intent-guide").waitFor({ timeout: 12000 });
    await page.waitForTimeout(640);

    // 硬测试：Inspector 在普通模式不可见（墨痕不依赖 Inspector 存在）
    const inspectorVisible = (await page.getByTestId("replan-card").count()) > 0;
    record(`[${it.key}] 普通模式 Inspector(replan-card) 隐藏（硬测试）`, !inspectorVisible);

    // IntentGuide 可见且收口句正确（可秒懂）
    const lead = (await page.getByTestId("intent-guide-lead").textContent()) ?? "";
    record(`[${it.key}] intent-guide 收口句匹配「${it.guideIncludes}」`, lead.includes(it.guideIncludes), lead.slice(0, 40));

    // 主角 Surface 因意图切换
    record(`[${it.key}] 主角切到 ${it.surface}（可见）`, (await cur(it.surface).count()) > 0);

    // 身份提示（思考方式切换，gap #5）
    record(`[${it.key}] 思考方式身份提示可见`, (await page.getByTestId("intent-guide-identity").count()) > 0);

    // B 主表达：证据揭示块
    if (it.extraVisible) {
      for (const ev of it.extraVisible) {
        record(`[${it.key}] ${ev} 可见（证据主表达）`, (await page.getByTestId(ev).count()) > 0);
      }
    }
    // D 主表达：2–3 个现场观察问题
    if (it.observeItems) {
      const n = await page.getByTestId("intent-guide-observe-item").count();
      record(`[${it.key}] 现场观察问题 2–3 个（实际 ${n}）`, n >= 2 && n <= 3, String(n));
    }

    // D 不显示坐标失权威（本就在 present）
    if (it.kind === "propose_present_action") {
      const lostVisible = (await page.getByTestId("coordinate-authority-lost").count()) > 0;
      record(`[${it.key}] present 意图不显示坐标失权威提示`, !lostVisible);
    } else if (it.authorityLost) {
      record(`[${it.key}] 非 present 意图显示坐标失权威提示`, (await page.getByTestId("coordinate-authority-lost").count()) > 0);
    }

    // 无整页 reload
    const marker = await page.evaluate(() => window.__patch_marker ?? null);
    record(`[${it.key}] 体验未重启（无整页重载）`, !!marker);

    // 冻结 patch 结果卡让位
    record(`[${it.key}] 冻结 patch 结果卡让位（不冒充 runtime）`, (await page.getByTestId("patch-card").count()) === 0);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(160);
    await page.screenshot({ path: path.join(OUT, `${it.key}-${it.kind}.png`), fullPage: false });

    if ((await page.getByTestId("intent-guide-return").count()) > 0) {
      await page.getByTestId("intent-guide-return").click();
      await page.waitForTimeout(520);
    }
  }

  // ===== DEV 模式：Inspector 内部 runtime label 仍可见（runtime contract 保留）=====
  for (const it of INTENTS) {
    const onFollowup = await walkToFollowup(true);
    record(`[DEV ${it.key}] 进入追问入口`, onFollowup);
    await page.getByRole("button", { name: it.q }).click();
    await page.getByTestId("replan-card").waitFor({ timeout: 12000 });
    await page.waitForTimeout(520);
    const intentAttr = await page.getByTestId("replan-card").getAttribute("data-intent");
    record(`[DEV ${it.key}] replan-card 可见且 data-intent=${it.kind}`, intentAttr === it.kind, String(intentAttr));
    // DEV 模式下 IntentGuide 也应在（两者共存：开发者看内部，用户看收口）
    record(`[DEV ${it.key}] IntentGuide 仍可见`, (await page.getByTestId("intent-guide").count()) > 0);
    if ((await page.getByTestId("replan-return-present").count()) > 0) {
      await page.getByTestId("replan-return-present").click();
      await page.waitForTimeout(520);
    }
  }
} catch (e) {
  record("EXCEPTION", false, String(e).split("\n").slice(0, 6).join(" | "));
} finally {
  record("无 uncaught runtime exception（pageerror=0）", pageErrors.length === 0, pageErrors.length ? pageErrors.join(" | ") : "0");
  if (consoleErrors.length) {
    console.log("INFO console.error 明细（透明核对，非直接判失败除非体验失效级）：");
    for (const c of consoleErrors.slice(0, 20)) console.log("   • " + c.slice(0, 200));
  }
  record("console.error 条数（透明记录）", true, String(consoleErrors.length));
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n==== EXP-0001 HUMAN EXPERIENCE E2E: ${results.length - failed.length}/${results.length} PASS ====`);
console.log(`captures: ${OUT}`);
console.log(`pageErrors=${pageErrors.length} consoleErrors=${consoleErrors.length}`);
process.exit(failed.length ? 1 : 0);
