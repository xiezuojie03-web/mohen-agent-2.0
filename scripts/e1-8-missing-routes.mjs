// scripts/e1-8-missing-routes.mjs — 列出 152 动作账里缺失的 HTTP 候选路由（供补缺施工）
import fs from "node:fs";
import path from "node:path";

const CSV = process.argv[2] || "D:/work Buddy/2026-08-23-23-12-38/墨痕_五图技术设计_U07_唯一工程设计交付候选_V4_全功能最终收口_20261028/05_测试回滚与工程验收/五图全功能_62模块152动作（122原加30补充）验收总账_V4.csv";
const API_ROOT = "apps/web/app/api";

const norm = (p) => p.replace(/\[[^\]]+\]/g, ":param").replace(/\/:[^/]+/g, "/:param");
const existing = new Set();
function walk(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(p, r);
    else if (e.name === "route.ts") existing.add(norm("/api/" + rel));
  }
}
walk(API_ROOT, "");

function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false; }
      else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { cells.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

const text = fs.readFileSync(CSV, "utf8").replace(/^\uFEFF/, "");
const lines = text.split(/\r?\n/).filter((l) => l.trim());
const header = parseCsvLine(lines[0]);
const idx = (n) => header.indexOf(n);
const iApi = idx("candidate_api_or_event"), iPage = idx("page"), iAction = idx("action_id"), iActionName = idx("action");

const missing = [];
for (let i = 1; i < lines.length; i++) {
  const c = parseCsvLine(lines[i]);
  const api = (c[iApi] ?? "").trim();
  if (!api || /^(ROUTER|LOCAL|EVENT)/.test(api)) continue;
  const m = api.match(/(?:GET|POST|PUT|PATCH|DELETE)\s+(\/api\/[^\s]+)/);
  if (!m) continue;
  if (!existing.has(norm(m[1]))) {
    missing.push({ page: c[iPage], action: c[iAction], name: c[iActionName], api });
  }
}

console.log(`缺失路由 ${missing.length} 个：\n`);
const byPage = {};
for (const r of missing) (byPage[r.page] = byPage[r.page] || []).push(r);
for (const [p, arr] of Object.entries(byPage)) {
  console.log(`# ${p}（${arr.length}）`);
  for (const r of arr) console.log(`  ${r.api}  // ${r.action} ${r.name}`);
}
