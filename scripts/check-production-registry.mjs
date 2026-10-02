// scripts/check-production-registry.mjs
// 目的：让「哪些自动化被允许无人值守运行」成为**机器可读、可核对、且真的被读**的许可清单。
//
// 为什么需要这道守卫（本项目已付过的代价）：
//   `data/fixtures/source-providers.json` 声称 S1–S4 来源门禁，文档里三处写「取回必须遵守」，
//   但**全仓没有一行代码读它** —— 它什么也没挡住，实测 341 张外镇图照样入库。
//   本守卫用来防止生产注册表重蹈同一覆辙：注册表若不被读、或被读而不校验，同样只是意图。
//
// 检查项：
//   ① schema 与 schema_version 存在且正确
//   ② 每个条目具备 required_fields 全部字段（值非空；数组可为空但必须存在）
//   ③ unattended ∈ {allowed, forbidden}；forbidden 必须写明理由
//   ④ allowed 必须写明门禁如何落地（gates_enforced_by）——否则就是「写着有门、其实没有」
//   ⑤ write_scope 的表名必须真实存在于 supabase/migrations
//   ⑥ 队列里每个作业必须**恰好**命中一个条目（与 runner 使用同一 matchEntries）
import fs from "node:fs";
import path from "node:path";
import { buildJobs, matchEntries } from "../pipelines/legacy/unattended-jobs.mjs";

const REG = "specs/data-production/production-registry.json";
const MIG = "supabase/migrations";
const SCHEMA = "mohen.production-registry";

let failed = false;
const bad = (m) => { console.error("REGISTRY_ERROR " + m); failed = true; };
const isVoid = (v) =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

// ---------- ① 读文件与 schema ----------
if (!fs.existsSync(REG)) {
  console.error(`MISSING ${REG}`);
  process.exit(1);
}
let reg;
try {
  reg = JSON.parse(fs.readFileSync(REG, "utf8"));
} catch (e) {
  console.error(`REGISTRY_ERROR JSON 解析失败 ${REG}: ${(e && e.message) || e}`);
  process.exit(1);
}
if (reg.schema !== SCHEMA) bad(`schema 应为 "${SCHEMA}"，实际 "${reg.schema}"`);
if (typeof reg.schema_version !== "number") bad("schema_version 必须是数字（用于后续迁移判断）");
const entries = Array.isArray(reg.jobs) ? reg.jobs : [];
if (!entries.length) bad("jobs 为空");
const required = Array.isArray(reg.required_fields) ? reg.required_fields : [];
if (!required.length) bad("required_fields 为空（守卫依赖它做字段完整性校验）");

// ---------- ②③④ 逐条校验 ----------
const tableNames = new Set();
if (fs.existsSync(MIG)) {
  for (const f of fs.readdirSync(MIG).filter((x) => x.endsWith(".sql"))) {
    const sql = fs.readFileSync(path.join(MIG, f), "utf8");
    for (const m of sql.matchAll(/\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/gi)) {
      tableNames.add(m[1]);
    }
  }
}
const ids = new Set();
for (const e of entries) {
  const tag = e && e.id ? e.id : "(无 id)";
  if (!e || typeof e !== "object") { bad(`条目不是对象：${JSON.stringify(e)}`); continue; }
  if (ids.has(e.id)) bad(`id 重复：${e.id}`);
  ids.add(e.id);

  for (const k of required) {
    if (!(k in e)) bad(`${tag}: 缺字段 ${k}`);
    else if (k !== "narrative_gaps" && isVoid(e[k])) bad(`${tag}: 字段 ${k} 为空`);
  }

  if (!["allowed", "forbidden"].includes(e.unattended)) {
    bad(`${tag}: unattended 必须是 allowed 或 forbidden，实际 "${e.unattended}"`);
  }
  if (e.unattended === "forbidden" && isVoid(e.unattended_reason)) {
    bad(`${tag}: unattended=forbidden 必须写明 unattended_reason`);
  }
  if (e.unattended === "allowed" && isVoid(e.gates_enforced_by)) {
    bad(`${tag}: unattended=allowed 必须写明 gates_enforced_by —— 否则就是"写着有门、其实没有"`);
  }
  if (e.unattended === "allowed" && /未实现|\*\*未实现\*\*/.test(String(e.gates_enforced_by))) {
    bad(`${tag}: gates_enforced_by 自述"未实现"，却声明 unattended=allowed —— 二者矛盾`);
  }

  for (const t of Array.isArray(e.write_scope) ? e.write_scope : []) {
    if (!tableNames.has(t)) {
      bad(`${tag}: write_scope 里的 "${t}" 在 supabase/migrations 中找不到 create table —— 拼错或表不存在`);
    }
  }
}

// ---------- ⑥ 队列覆盖 ----------
const jobs = buildJobs();
const unresolved = [];
let allowed = 0, forbidden = 0;
for (const j of jobs) {
  const hits = matchEntries(entries, j.id);
  if (hits.length !== 1) { unresolved.push(`${j.id}(命中 ${hits.length})`); continue; }
  if (hits[0].unattended === "allowed") allowed++; else forbidden++;
}
if (unresolved.length) {
  console.error(`REGISTRY_ERROR ${unresolved.length} 个队列作业未被唯一声明：`);
  for (const u of unresolved.slice(0, 20)) console.error("     " + u);
  if (unresolved.length > 20) console.error(`     … 其余 ${unresolved.length - 20} 个省略`);
  failed = true;
}

console.log(
  `PRODUCTION_REGISTRY schema=v${reg.schema_version} entries=${entries.length} ` +
  `table_refs=${tableNames.size} queued=${jobs.length} runnable=${allowed} excluded=${forbidden} ` +
  `unresolved=${unresolved.length}`
);
process.exit(failed ? 1 : 0);
