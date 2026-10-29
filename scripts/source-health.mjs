// scripts/source-health.mjs — K1 来源健康检查（2026-10-29）
//
// 读取 sources/registry.json，对 V1 的 API 来源做一次可达性探测（只读、不带业务参数），
// 记录状态/延迟到 sources/health/latest.json，供"资料台"和上线前巡检使用。
// 不含任何密钥；manual 来源标记为 manual，degraded 来源标记 deferred。
//
// 用法：node scripts/source-health.mjs [--strict]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REG = JSON.parse(fs.readFileSync(path.join(ROOT, "sources", "registry.json"), "utf8"));
const STRICT = process.argv.includes("--strict");
const OUT_DIR = path.join(ROOT, "sources", "health");
const UA = "MoHenSourceHealth/0.1 (contact: owner)";

async function probe(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "user-agent": UA, accept: "application/json,text/html;q=0.9,*/*;q=0.8" },
    });
    return {
      status: res.status,
      ms: Date.now() - t0,
      ok: res.status >= 200 && res.status < 400,
      blocked: res.status === 401 || res.status === 403,
    };
  } catch (e) {
    return { status: 0, ms: Date.now() - t0, ok: false, error: e?.name || "fetch_error" };
  } finally {
    clearTimeout(timer);
  }
}

const rows = [];
for (const s of REG.sources) {
  if (!s.v1) {
    rows.push({ id: s.id, name: s.name, mode: s.access, status: "deferred", ms: null, ok: null });
    continue;
  }
  if (s.access !== "api" || !s.health_url) {
    rows.push({ id: s.id, name: s.name, mode: s.access, status: "manual", ms: null, ok: true });
    continue;
  }
  const r = await probe(s.health_url);
  rows.push({ id: s.id, name: s.name, mode: "api", status: r.status, ms: r.ms, ok: r.ok, error: r.error });
}

const now = new Date().toISOString();
const result = { checked_at: now, registry_updated_at: REG.updated_at, rows };
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "latest.json"), JSON.stringify(result, null, 2), "utf8");

console.log("=== 来源健康检查 ===");
for (const r of rows) {
  const stat =
    r.ok === null
      ? r.status
      : `${r.status} ${r.ok ? "OK" : r.blocked ? "BLOCKED(需换UA/端点)" : "DOWN"} ${r.ms}ms`;
  console.log(`${r.id.padEnd(24)} ${r.mode.padEnd(7)} ${stat}`);
}
console.log(`report=sources/health/latest.json`);

const down = rows.filter((r) => r.ok === false);
if (STRICT && down.length) {
  console.error(`\n${down.length} 个 V1 API 来源不可达：${down.map((r) => r.id).join(", ")}`);
  process.exit(1);
}
