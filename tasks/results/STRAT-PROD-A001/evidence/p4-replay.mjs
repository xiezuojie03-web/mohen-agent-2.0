// P4 实屏复测：正例/负例/返证/返回/窄屏 + 录屏（临时工具，非产品代码）
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("tasks/results/STRAT-PROD-A001/evidence/p4");
fs.mkdirSync(OUT, { recursive: true });
const URL = "http://localhost:3000/experience/lvzhiqiu";
const CHANNEL = process.env.MOHEN_BROWSER_CHANNEL || "msedge";

const report = { shots: [], checks: [], errors: [] };

async function shot(page, name, note) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  report.shots.push({ name, note, file: path.relative(process.cwd(), file) });
}

const browser = await chromium.launch({ channel: CHANNEL });

/** 提问并截图；失败不中断（把现场留下，而不是让整个复测崩掉） */
async function ask(page, question, name, note) {
  await page.waitForSelector('[data-testid="a001-ask-input"]');
  await page.fill('[data-testid="a001-ask-input"]', question);
  const disabled = await page.getAttribute('[data-testid="a001-ask-submit"]', "disabled");
  report.checks.push({ ask: question, submitDisabled: disabled });
  await page.click('[data-testid="a001-ask-submit"]');
  try {
    await page.waitForSelector('[data-testid="a001-ask-answer"]', { timeout: 45000 });
  } catch {
    report.checks.push({ askFailed: question, panel: (await page.locator(".a001-ask").innerText()).slice(0, 300) });
  }
  await page.waitForTimeout(1200);
  await shot(page, name, note);
  const line = await page.locator('[data-testid="a001-ask-line"]').count()
    ? await page.textContent('[data-testid="a001-ask-line"]')
    : null;
  const gaps = await page.$$eval('[data-testid="a001-ask-gaps"] li', (els) => els.map((e) => e.textContent?.trim()));
  return { line, gaps };
}
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  recordVideo: { dir: path.join(OUT, "video"), size: { width: 1440, height: 900 } },
});
const page = await ctx.newPage();
page.on("pageerror", (e) => report.errors.push(String(e)));
page.on("response", (r) => {
  if (r.url().includes("/api/mohen/ask")) report.checks.push({ ask: r.status() });
});

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="green-hill-stage"]');
await shot(page, "01-today", "U1 今天：体量剖面 + 今日联系");

// 舞台热点 → 证据抽屉（U4 返证）
await page.click('[data-testid="stage-hotspot-ramp"]');
await page.waitForSelector('[data-testid="a001-drawer"]');
const rampEvidence = await page.$$eval('[data-testid="a001-evidence-item"] blockquote', (els) =>
  els.map((e) => e.textContent?.trim())
);
const sourceMeta = await page.$$eval('[data-testid="a001-evidence-item"] .a001-evidence__meta', (els) =>
  els.map((e) => e.textContent?.trim())
);
const hasSourceLink = await page.locator('[data-testid="a001-evidence-link"]').count();
await shot(page, "02-evidence-drawer", "U4 点热点即见材料原句 + 出处 + 原页面链接");
report.checks.push({ rampEvidenceCount: rampEvidence.length, sourceMeta: sourceMeta.slice(0, 3), hasSourceLink });

// 原页面链接可打开（真实外链）
if (hasSourceLink > 0) {
  const href = await page.locator('[data-testid="a001-evidence-link"]').first().getAttribute("href");
  report.checks.push({ firstSourceHref: href });
}
await page.click('[data-testid="a001-drawer-close"]');

// U2 回看：1995 前身
await page.click('[data-testid="a001-mode-then"]');
await page.waitForSelector('[data-testid="stage-body-then"]');
await shot(page, "03-then", "U2 回看：1995 体量示意 + 安浦路规划横切");
await page.click('[data-testid="stage-hotspot-anpu"]');
await page.waitForSelector('[data-testid="a001-drawer"]');
await shot(page, "04-then-anpu-evidence", "U4 安浦路那条记录的原句");
await page.click('[data-testid="a001-drawer-close"]');

// U3 理解：判断 + 负例
await page.click('[data-testid="a001-step-understand"]');
await page.waitForSelector('[data-testid="a001-claim"]');
const claims = await page.$$eval('[data-testid="a001-claim"] .a001-claim__text', (els) =>
  els.map((e) => e.textContent?.trim())
);
const negative = await page.textContent('[data-testid="a001-negative-example"]');
await shot(page, "05-understand", "U3 理解：可证判断 + 一个还不能认定的问题");
report.checks.push({ claimCount: claims.length, claims: claims.slice(0, 3), negative: negative?.slice(0, 120) });

// 判断 → 依据
await page.locator('[data-testid="a001-claim-evidence"]').first().click();
await page.waitForSelector('[data-testid="a001-drawer"]');
await shot(page, "06-claim-evidence", "U4 每条判断的依据原句");
await page.click('[data-testid="a001-drawer-close"]');

// U4 返证全景
await page.click('[data-testid="a001-step-evidence"]');
await page.waitForSelector('[data-testid="a001-evidence-list"]');
const evCount = await page.locator('[data-testid="a001-evidence-item"]').count();
await shot(page, "07-evidence-all", "U4 全部已发布原句按来源分组");
report.checks.push({ evidenceItemCount: evCount });

// U5 负例追问：身份同一
await page.click('[data-testid="a001-step-ask"]');
await page.waitForSelector('[data-testid="a001-ask-input"]');
const neg = await ask(page, "烟草仓库和怡和冷库是同一栋楼吗？", "08-ask-negative-identity", "U5 负例：身份同一不认定 + 边界说明");
report.checks.push({ negAnswer: neg.line, negGaps: neg.gaps });

// U5 正例追问：今天怎么上去（真实今日联系）
const pos = await ask(page, "今天怎么上去？", "09-ask-positive-access", "U5 正例：今天怎么进入（材料明载）");
report.checks.push({ posAnswer: pos.line });

// U5 因果负例
const causal = await ask(page, "这处改造是滨江贯通工程造成的吗？", "10-ask-negative-causal", "U5 负例：共现≠因果");
report.checks.push({ causalAnswer: causal.line, causalGaps: causal.gaps });

// 返回原观察点
const hasReturn = await page.locator('[data-testid="a001-return"]').count();
if (hasReturn) {
  await page.click('[data-testid="a001-return"]');
  await page.waitForTimeout(500);
  await shot(page, "11-return-to-focus", "U5 追问后回到原观察点");
}
report.checks.push({ hasReturnButton: hasReturn });

// 窄屏
const mobile = await browser.newContext({ viewport: { width: 414, height: 900 }, isMobile: true, hasTouch: true });
const mp = await mobile.newPage();
await mp.goto(URL, { waitUntil: "networkidle" });
await mp.waitForSelector('[data-testid="green-hill-stage"]');
await shot(mp, "12-mobile-today", "E5 窄屏：舞台在上、墨痕在下，不遮挡");
await mp.click('[data-testid="a001-step-understand"]');
await mp.waitForSelector('[data-testid="a001-claim"]');
await shot(mp, "13-mobile-understand", "E5 窄屏理解步骤");

await ctx.close();
await mobile.close();
await browser.close();

fs.writeFileSync(path.join(OUT, "p4-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ shots: report.shots.length, checks: report.checks, errors: report.errors }, null, 1));
