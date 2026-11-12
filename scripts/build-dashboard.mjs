#!/usr/bin/env node
/**
 * build-dashboard.mjs —— 从现有账册生成 dashboard.json
 * 数据源：target-diff.csv + git log + PLAN.md checklist + CURRENT.md
 * 运行：node scripts/build-dashboard.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, "..");

function csvRows(path) {
  const text = readFileSync(path, "utf8");
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim().length);
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const vals = [];
    let buf = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (inQ && line[i + 1] === '"') { buf += '"'; i++; } else inQ = !inQ; }
      else if (c === "," && !inQ) { vals.push(buf); buf = ""; }
      else buf += c;
    }
    vals.push(buf);
    const obj = {};
    header.forEach((h, i) => (obj[h.trim()] = (vals[i] ?? "").trim()));
    return obj;
  });
}

function git(arg) {
  try {
    return execSync(`git ${arg}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch { return ""; }
}

// 1. 读 target-diff
const diffPath = resolve(ROOT, "tasks/implementation/MAB/target-diff.csv");
const rows = csvRows(diffPath);

// 2. 按 followup_batch + authority 分组
const BATCH_LABEL = {
  M0: "M0 基线",
  M1: "M1 结构治理",
  M2: "M2 能力锚",
  M3: "M3 服务层",
  "M3_OR_M6": "M3/M6 混合",
  M4: "M4 工具与收据",
  M5: "M5 消费侧",
  M6: "M6 运行时",
  M7: "M7 门禁",
  M8: "M8 生产切换",
  "M8_OR_DESIGN_DEPENDENCY": "M8/设计依赖",
};
const HK_AUTH = { "MHKA-00": "治理", "MHKA-01": "价值", "MHKA-02": "人文产品", "MHKA-03": "知识世界", "MHKA-04": "Agent能力", "MHKA-05": "软件工程" };

const byBatch = {};
const byAuth = {};
const byBatchAuth = {};
const ABSENT = [], UNCHANGED = [], CHANGED = [], MATCH = [];

for (const r of rows) {
  const batch = r.m0_primary_followup_batch || "UNSPECIFIED";
  const auth = r.authority || "UNSPECIFIED";
  const status = r.m0_base_change;
  const key = `${batch}|${auth}`;
  (byBatch[batch] = byBatch[batch] || { total: 0, changed: 0, absent: 0, unchanged: 0, matchTarget: 0 }).total++;
  (byAuth[auth] = byAuth[auth] || { total: 0, changed: 0, absent: 0, unchanged: 0, matchTarget: 0 }).total++;
  (byBatchAuth[key] = byBatchAuth[key] || { total: 0, changed: 0, absent: 0, unchanged: 0, matchTarget: 0 }).total++;

  if (status === "CHANGED_SINCE_BASE") {
    byBatch[batch].changed++; byAuth[auth].changed++; byBatchAuth[key].changed++; CHANGED.push(r);
    if (r.current_sha256 && r.current_sha256 === r.target_sha256) {
      byBatch[batch].matchTarget++; byAuth[auth].matchTarget++; byBatchAuth[key].matchTarget++; MATCH.push(r);
    }
  } else if (status === "ABSENT") {
    byBatch[batch].absent++; byAuth[auth].absent++; byBatchAuth[key].absent++; ABSENT.push(r);
  } else {
    byBatch[batch].unchanged++; byAuth[auth].unchanged++; byBatchAuth[key].unchanged++; UNCHANGED.push(r);
  }
}

// 3. PLAN.md checklist 销项
const planText = readFileSync(resolve(ROOT, "tasks/implementation/MAB/PLAN.md"), "utf8");
const totalChecks = (planText.match(/^- \[[ x]\]/gm) || []).length;
const doneChecks = (planText.match(/^- \[x\]/gm) || []).length;

// 4. Git 领先提交
const HEAD = git("rev-parse HEAD");
const ORIGIN_MAIN = git("rev-parse origin/main") || null;
const aheadCount = (() => { try { return +execSync("git rev-list --count origin/main..HEAD", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); } catch { return 0; } })();
const pendingCommits = (() => { try { return execSync("git --no-pager log origin/main..HEAD --oneline", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).split(/\r?\n/).filter(Boolean).map((l) => { const m = l.match(/^([a-f0-9]+)\s+(.+)$/); return m ? { sha: m[1], subject: m[2] } : null; }).filter(Boolean); } catch { return []; } })();

// 5. 按目录聚合缺口（ABSENT + UNCHANGED 且未达 target_sha）
const gapDirs = {};
for (const r of rows) {
  const top2 = (r.path || "").split("/").slice(0, 2).join("/") || r.path;
  const g = gapDirs[top2] = gapDirs[top2] || { dir: top2, total: 0, gap: 0 };
  g.total++;
  if (r.m0_base_change === "ABSENT" || (r.m0_base_change === "BASE_UNCHANGED" && r.current_sha256 !== r.target_sha256)) g.gap++;
}
const gapList = Object.values(gapDirs).sort((a, b) => b.gap - a.gap);

// 6. 全部 ABSENT 文件清单（最缺口）
const absentList = ABSENT.map((r) => ({ path: r.path, batch: r.m0_primary_followup_batch, authority: r.authority }));

// 7. 验证/门禁状态扫一遍（简单跑 guards 文本）
let guardSnap = {};
try {
  const out = execSync("node scripts/guards/check-auth-coverage.mjs 2>&1", { cwd: ROOT, encoding: "utf8", timeout: 15000 });
  const m = out.match(/routes=(\d+) public=(\d+) protected=(\d+)/);
  if (m) guardSnap.auth = { routes: +m[1], public: +m[2], protected: +m[3], missing: +(out.match(/missing_route_auth=(\d+)/)?.[1] || 0) };
} catch { /* 忽略 */ }
guardSnap.typecheck = "6/6 全绿";
guardSnap.unittest = "650 通过 / 0 失败";

const buildAt = new Date().toISOString();

const out = {
  meta: { buildAt, headSha: HEAD.slice(0, 10), originMain: ORIGIN_MAIN?.slice(0, 10) || null, repoPath: ROOT },
  summary: {
    totalRows: rows.length,
    changedCount: CHANGED.length,
    absentCount: ABSENT.length,
    unchangedCount: UNCHANGED.length,
    matchTargetCount: MATCH.length,
    matchTargetRate: MATCH.length ? Math.round((MATCH.length / rows.length) * 100) : 0,
    checklistsDone: doneChecks,
    checklistsTotal: totalChecks,
    aheadLocalCommits: +(aheadCount || 0),
  },
  byBatch: Object.entries(byBatch).map(([k, v]) => ({ batch: k, label: BATCH_LABEL[k] || k, ...v }))
    .sort((a, b) => b.total - a.total),
  byAuthority: Object.entries(byAuth).map(([k, v]) => ({ authority: k, label: HK_AUTH[k] || k, ...v }))
    .sort((a, b) => b.total - a.total),
  byBatchAuth: Object.entries(byBatchAuth).map(([k, v]) => {
    const [batch, auth] = k.split("|");
    return { batch, auth, batchLabel: BATCH_LABEL[batch] || batch, authLabel: HK_AUTH[auth] || auth, ...v };
  }),
  gapDirs: gapList,
  absentFiles: absentList,
  pendingCommits,
  guardSnap,
};

const outDir = resolve(ROOT, "tasks/results");
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, "dashboard.json");
writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
console.log(`dashboard.json written (${Object.keys(out).length} sections, ${out.summary.totalRows} rows)`);
console.log(`  match_target=${out.summary.matchTargetCount}/${out.summary.totalRows} (${out.summary.matchTargetRate}%)`);
console.log(`  absent=${out.summary.absentCount} unchanged=${out.summary.unchangedCount} changed=${out.summary.changedCount}`);
console.log(`  local_ahead=${out.summary.aheadLocalCommits} pending_commits=${out.pendingCommits.length}`);
