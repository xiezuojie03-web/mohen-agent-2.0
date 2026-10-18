// 生成 manifest.sha256（交付包 + 关键源码 + 证据文件）
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RESULT_DIR = "tasks/results/STRAT-PROD-A001";

const targets = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (!e.name.endsWith("manifest.sha256") && !e.name.startsWith("_manifest")) targets.push(p);
  }
}

walk(path.join(ROOT, RESULT_DIR));
for (const f of [
  "apps/web/app/experience/lvzhiqiu/page.tsx",
  "apps/web/app/experience/lvzhiqiu/A001Experience.tsx",
  "apps/web/app/experience/lvzhiqiu/GreenHillStage.tsx",
  "apps/web/app/experience/lvzhiqiu/MohenAsk.tsx",
  "apps/web/app/experience/lvzhiqiu/a001.css",
  "apps/web/lib/a001-experience-data.ts",
  "apps/web/lib/mohen-agent/retrieve.ts",
  "apps/web/lib/read-model-bridge.ts",
  "apps/web/app/api/mohen/ask/route.ts",
  "packages/agent-runtime/src/understand.ts",
  "packages/agent-runtime/src/select.ts",
  "pipelines/data-production/adapters/layer1-adapters.mjs",
  "pipelines/data-production/adapters/topic-a001.mjs",
]) targets.push(path.join(ROOT, f));

const lines = [];
for (const t of targets.sort()) {
  if (!fs.existsSync(t)) continue;
  const rel = path.relative(ROOT, t).replace(/\\/g, "/");
  const hash = crypto.createHash("sha256").update(fs.readFileSync(t)).digest("hex");
  lines.push(`${hash}  ${rel}`);
}
fs.writeFileSync(path.join(ROOT, RESULT_DIR, "manifest.sha256"), lines.join("\n") + "\n");
console.log(`files=${lines.length}`);
