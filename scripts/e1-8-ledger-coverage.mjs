// scripts/e1-8-ledger-coverage.mjs — 152 动作验收账的「API 路由覆盖率」客观统计。
// 读取交付包 152 动作 CSV，对每条动作的 candidate_api_or_event 提取 HTTP 路径，
// 与实际存在的 apps/web/app/api/**/route.ts 交叉核对，输出「有真实 API 路由」的覆盖率。
// 这只是 152 动作验收的一个维度（后端路由）；UI 组件 + 逐项运行见五页 Playwright 冒烟。

import fs from "node:fs";
import path from "node:path";

const CSV = process.argv[2] || "D:/work Buddy/2026-08-23-23-12-38/墨痕_五图技术设计_U07_唯一工程设计交付候选_V4_全功能最终收口_20261028/05_测试回滚与工程验收/五图全功能_62模块152动作（122原加30补充）验收总账_V4.csv";
const API_ROOT = "apps/web/app/api";

// 收集所有已存在的 route 路径（相对 /api，去掉 route.ts；[id] → :param 归一化）
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

// 读 CSV（引号感知解析）
function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
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
const idx = (name) => header.indexOf(name);
const iApi = idx("candidate_api_or_event");
const iPage = idx("page");

const byPage = {};
let total = 0, withRoute = 0, noRoute = 0, isEvent = 0;

for (let i = 1; i < lines.length; i++) {
  const cells = parseCsvLine(lines[i]);
  const page = cells[iPage] ?? "?";
  const api = (cells[iApi] ?? "").trim();
  total++;
  if (!api || /^(ROUTER|LOCAL|EVENT)/.test(api)) {
    isEvent++;
    continue; // 本地导航/事件，不算 API 路由
  }
  const m = api.match(/(?:GET|POST|PUT|PATCH|DELETE)\s+(\/api\/[^\s]+)/);
  if (!m) { noRoute++; continue; }
  const routePath = norm(m[1]);
  const hit = existing.has(routePath);
  byPage[page] = byPage[page] || { total: 0, hit: 0 };
  byPage[page].total++;
  if (hit) { byPage[page].hit++; withRoute++; } else { noRoute++; }
}

console.log("=== 152 动作 · API 路由覆盖率（客观） ===");
console.log(`总动作 ${total}；本地导航/事件 ${isEvent}；HTTP 动作 ${total - isEvent}`);
console.log(`有真实 route 文件：${withRoute}；无：${noRoute}`);
console.log("\n按页面：");
for (const [p, v] of Object.entries(byPage)) {
  console.log(`  ${p}: ${v.hit}/${v.total} 有路由`);
}
