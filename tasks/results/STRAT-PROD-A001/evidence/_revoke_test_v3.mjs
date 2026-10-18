// D6 / E4 撤权负例（第三次重启）：临时撤销 run 5176ade3 的 G5，验证前端不复活旧内容，随后恢复。
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const RUN = "5176ade3-2892-4179-96d0-c27184b42ebd";
const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
if (!url) throw new Error("DATABASE_URL 未找到");
const PSQL = "D:\\MoHen\\tools\\PostgreSQL\\18\\bin\\psql.exe";
const sql = (q) => execFileSync(PSQL, [url, "-q", "-c", q], { encoding: "utf8" });

const mode = process.argv[2] ?? "check";
const OUT = path.resolve("tasks/results/STRAT-PROD-A001/evidence/p4v3");

if (mode === "revoke") {
  sql(`update control.gate_audits set current_valid=false where gate_code='G5' and current_valid=true and run_id='${RUN}';`);
  console.log("revoked");
} else if (mode === "restore") {
  sql(`update control.gate_audits set current_valid=true where gate_code='G5' and run_id='${RUN}';`);
  console.log("restored");
}

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/experience/lvzhiqiu", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const hasStage = await page.locator('[data-testid="green-hill-stage"]').count();
const hasPhotos = await page.locator('[data-testid="stage-photos"]').count();
const unavailable = await page.locator('[data-testid="a001-unavailable"]').count();
const body = (await page.locator("main").innerText()).slice(0, 200);
const name = mode === "revoke" ? "14-revoked-no-content" : mode === "restore" ? "15-restored-content" : "16-state-check";
await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
console.log(JSON.stringify({ mode, hasStage, hasPhotos, unavailable, body }, null, 1));
await browser.close();
