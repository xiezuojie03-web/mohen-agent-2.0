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
//   ⑦ 双模式字段（2026-10-03 · 主协议 §5.1 / R-DP-01～02）：
//      · production_mode ∈ {directed, discovery}、truth_write_ceiling 为数字（必填）；
//      · discovery 的 truth_write_ceiling 必须为 0（研究执行体不拥有 Runtime Truth 写权限）；
//      · discovery 缺 research_scope / selection_policy → **整轮不启动**。
//      ⑥⑦ 两类冲突是「声明本身不自洽」，不是「少写一个字段」——因此以 REGISTRY_FATAL 报出，
//      语义等价于主协议 §5.2「未声明作业整轮不启动」：不做半截，不带着坏声明开跑。
import fs from "node:fs";
import path from "node:path";
import { buildJobs, matchEntries } from "../pipelines/legacy/unattended-jobs.mjs";

const REG = "specs/data-production/production-registry.json";
const MIG = "supabase/migrations";
const SCHEMA = "mohen.production-registry";

let failed = false;
const bad = (m) => { console.error("REGISTRY_ERROR " + m); failed = true; };
// 整轮不启动：声明自相矛盾时，任何基于此注册表的作业批次都不得开跑。
let fatal = false;
const stop = (m) => { console.error("REGISTRY_FATAL " + m); failed = true; fatal = true; };
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
// ---------- ⑧ Skill 实体化三向绑定（C2 §2.1 / C0 §11 R26 · 2026-10-04） ----------
// 已知技能集合 = skills/ 下有 SKILL.md 的目录 ∪ C2 §3.1 声明的 CANDIDATE 技能。
const C2_CANDIDATE_SKILLS = ["mohen-spatial-grounding", "mohen-research-intake", "mohen-association-discovery", "mohen-humanistic-selection"];
const knownSkills = new Set(C2_CANDIDATE_SKILLS);
if (fs.existsSync("skills")) {
  for (const d of fs.readdirSync("skills")) {
    if (fs.existsSync(path.join("skills", d, "SKILL.md"))) knownSkills.add(d);
  }
}
const skillEntries = new Map(); // skill -> Set(entry)，用于「每个技能唯一权威 entry」校验

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

  // ---------- ⑦ 双模式字段与冲突 ----------
  if (!["directed", "discovery"].includes(e.production_mode)) {
    stop(`${tag}: production_mode 必须是 directed 或 discovery，实际 "${e.production_mode}"`);
  }
  if (typeof e.truth_write_ceiling !== "number") {
    stop(`${tag}: truth_write_ceiling 必须是数字（0 = 无 Runtime Truth 写权限）`);
  } else if (e.production_mode === "discovery") {
    if (e.truth_write_ceiling !== 0) {
      stop(`${tag}: discovery 模式的 truth_write_ceiling = ${e.truth_write_ceiling}，必须为 0 —— 研究执行体不得拥有 Truth 写权限`);
    }
    if (isVoid(e.research_scope)) stop(`${tag}: discovery 模式缺 research_scope（范围必须机器可校验）`);
    if (isVoid(e.selection_policy)) stop(`${tag}: discovery 模式缺 selection_policy`);
  }

  // ---------- ⑧ implementation 三向绑定（C2 §2.1：技能 ↔ 入口 ↔ 作业） ----------
  const impl = e.implementation;
  if (!impl || typeof impl !== "object" || Array.isArray(impl)) {
    bad(`${tag}: implementation 必须是对象 { skill, entry }（C2 §2.1 实体化判定）`);
  } else {
    if (isVoid(impl.skill)) bad(`${tag}: implementation.skill 为空 —— 作业必须归属一个技能`);
    if (isVoid(impl.entry)) bad(`${tag}: implementation.entry 为空 —— 作业必须绑定唯一权威入口脚本`);
    if (!isVoid(impl.skill) && !knownSkills.has(impl.skill)) {
      bad(`${tag}: implementation.skill "${impl.skill}" 不在已知技能集合（skills/ 目录或 C2 §3.1 候选）`);
    }
    if (!isVoid(impl.entry) && !fs.existsSync(impl.entry)) {
      bad(`${tag}: implementation.entry 指向不存在的脚本：${impl.entry}`);
    }
    if (!isVoid(impl.skill) && !isVoid(impl.entry)) {
      if (!skillEntries.has(impl.skill)) skillEntries.set(impl.skill, new Set());
      skillEntries.get(impl.skill).add(impl.entry);
    }
  }
}

// ---------- ⑧ 续：每个技能唯一权威 entry（C2 §2.1「禁止平行重复实现」） ----------
for (const [s, set] of skillEntries) {
  if (set.size > 1) {
    bad(`技能 "${s}" 声明了多个权威 entry（${[...set].join(" / ")}）—— 违反 C2 §2.1「每个数据生产能力有且只有一个权威实现」`);
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
if (fatal) console.error("REGISTRY_FATAL 声明自相矛盾 → **整轮不启动**（主协议 §5.2：未声明/矛盾声明不做半截）");
process.exit(failed ? 1 : 0);
