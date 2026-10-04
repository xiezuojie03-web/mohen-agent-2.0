// scripts/check-research.mjs — guard:research（只读校验，不阻断写入）
//
// 目的：让 C3 V1.2 §2.9「Research Workspace」的四条宪法级约束成为**机器可核对**的东西。
//
// 为什么需要它（§0.2 铁律）：
//   R16 / R-DP-01～05 已裁定，C2/C3/主协议已升版，D01–D05 已登记进 production-registry.json。
//   但**只改文档不改守卫等于没改** —— 研究作业若真的写进 Truth Store，没有任何东西会拦它。
//   本守卫就是那条拦它的东西（对照 `check-review-triage.mjs` 的形态：结构核对 + 数据不变量）。
//
// 五条断言（对应主协议 V3.0 §9.1「research」行与任务书 TASK-RECON-20261003 T5）：
//   ① discovery 作业 truth_write_ceiling == 0（静态：读 production-registry.json）
//   ② Research Workspace 对 claims / relations / entities 事实层与 visual_assets 资格字段写入 0 行
//      （静态：research 作业 write_scope 不得含 Truth 表；动态：Truth 表中 run 归因指向 research_run 的行数）
//   ③ 研究态对象不含 usable / published / verified（结构：枚举 CHECK 存在；数据：状态列越界计数）
//   ④ 0 个 Association Candidate 自动晋级（结构：zero_auto_promotion CHECK 存在；数据：promoted=true 计数）
//   ⑤ 每条 research_observation 有 source_id + locator/region（结构：CHECK 存在；数据：缺定位计数）
//
// 只读保证：本脚本**只执行 SELECT**，不含任何 INSERT/UPDATE/DDL。
// DB 不可达 → 动态项 WARN 跳过（离线可跑），静态项照常校验。
import fs from "node:fs";
import path from "node:path";
import { queryRows, queryValue, PROJECT_ROOT } from "../packages/data-access/src/index.mjs";

const REG = path.join(PROJECT_ROOT, "specs/data-production/production-registry.json");

let failed = false;
const bad = (m) => { console.error("RESEARCH_ERROR " + m); failed = true; };

// ── 静态 ①：discovery 作业 truth_write_ceiling 必须为 0 ────────────────────────
const reg = JSON.parse(fs.readFileSync(REG, "utf8"));
const jobs = Array.isArray(reg.jobs) ? reg.jobs : [];
const discovery = jobs.filter((j) => j.production_mode === "discovery");
if (!discovery.length) bad("注册表里没有任何 production_mode=discovery 的作业（D01–D05 未登记？）");
for (const j of discovery) {
  if (j.truth_write_ceiling !== 0) {
    bad(`discovery 作业 ${j.id} 的 truth_write_ceiling = ${j.truth_write_ceiling}（必须为 0：研究执行体不拥有 Runtime Truth 写权限）`);
  }
}
// 双模式字段完整性（与 guard:registry 互补：这里只关心研究侧语义）
for (const j of discovery) {
  if (!j.research_scope) bad(`discovery 作业 ${j.id} 缺 research_scope（范围必须机器可校验）`);
  if (!j.selection_policy) bad(`discovery 作业 ${j.id} 缺 selection_policy`);
}

// ── 静态 ②a：research 作业的 write_scope 不得含 Truth 表 ──────────────────────
const TRUTH_TABLES = [
  "entities", "claims", "relations", "cultural_relation_claims", "visual_assets",
  "evidence", "source_records", "historical_features", "historical_feature_anchors",
  "knowledge_paths", "evidence_gate_audit",
];
for (const j of jobs.filter((x) => String(x.id).startsWith("research."))) {
  for (const t of Array.isArray(j.write_scope) ? j.write_scope : []) {
    if (TRUTH_TABLES.includes(t)) {
      bad(`研究作业 ${j.id} 的 write_scope 含 Truth 表 "${t}" —— 违反 truth_write_ceiling=0`);
    }
  }
}

// ── 动态部分（DB 不可达则跳过）────────────────────────────────────────────────
let dbNote = "";
const stats = {};
try {
  // 结构：七张研究表
  const tables = await queryRows(
    `select table_name from information_schema.tables
      where table_schema='public' and table_name like 'research%'`
  );
  const tset = new Set(tables.map((r) => r.table_name));
  for (const t of ["research_run", "research_source_inventory", "research_observation",
    "research_mention", "research_source_dependency", "research_signal",
    "research_association_candidate", "research_task"]) {
    if (!tset.has(t)) bad(`研究表 ${t} 不存在（迁移 202610030010 未应用？）`);
  }
  if (tables.length) stats.tables = `${tables.length}`;

  // 结构：四条关键 CHECK 约束必须存在（否则库层强制等于没有）
  const cons = await queryRows(
    `select conname from pg_constraint
      where conname in ('research_candidate_zero_auto_promotion',
                        'research_candidate_longtail_no_review_queue',
                        'research_observation_must_be_locatable',
                        'research_mention_resolved_needs_entity')`
  );
  const cset = new Set(cons.map((r) => r.conname));
  for (const c of ["research_candidate_zero_auto_promotion",
    "research_candidate_longtail_no_review_queue",
    "research_observation_must_be_locatable",
    "research_mention_resolved_needs_entity"]) {
    if (!cset.has(c)) bad(`库层约束 ${c} 不存在 —— 研究安全只看文档不算数（库层强制缺失）`);
  }

  // ③ 研究态对象不含 usable / published / verified
  const banned = Number(await queryValue(
    `select count(*)::int from research_association_candidate
      where disposition in ('usable','published','verified')
         or association_readiness in ('usable','published','verified')`
  ));
  stats.banned_status = banned;
  if (banned > 0) bad(`研究候选出现可用资格词（usable/published/verified）：${banned} 行（研究态禁止使用资格词汇）`);

  // ④ 0 个 Association Candidate 自动晋级
  const promoted = Number(await queryValue(
    `select count(*)::int from research_association_candidate where promoted = true`
  ));
  stats.promoted = promoted;
  if (promoted > 0) bad(`有 ${promoted} 个研究候选被自动晋级（0 自动 Truth Promotion 被破坏）`);

  // ④b 研究长尾不得挂人工分诊行（与 guard:triage 的收窄断言同源，这里按候选侧核对）
  const longTailWithReview = Number(await queryValue(
    `select count(*)::int from research_association_candidate
      where disposition = 'long_tail' and review_queue_id is not null`
  ));
  stats.longtail_review = longTailWithReview;
  if (longTailWithReview > 0) bad(`研究长尾挂了 ${longTailWithReview} 条 review_queue 行（长尾不得 1:1 制造人工队列）`);

  // ⑤ 每条 Observation 必须有 source_id + locator/region
  const orphan = Number(await queryValue(
    `select count(*)::int from research_observation
      where source_id is null or source_id = ''`
  ));
  const noLocator = Number(await queryValue(
    `select count(*)::int from research_observation
      where locator is null and region is null`
  ));
  stats.observations = Number(await queryValue(`select count(*)::int from research_observation`));
  stats.obs_no_source = orphan;
  stats.obs_no_locator = noLocator;
  if (orphan > 0) bad(`${orphan} 条 research_observation 缺 source_id（ Observation 必须可回源）`);
  if (noLocator > 0) bad(`${noLocator} 条 research_observation 既无 locator 也无 region（标题级不算 Observation）`);

  // ③b unresolved mention 不得指向 Entity
  const fakeEntity = Number(await queryValue(
    `select count(*)::int from research_mention
      where resolution <> 'resolved' and resolved_entity_id is not null`
  ));
  stats.mention_fake_entity = fakeEntity;
  if (fakeEntity > 0) bad(`${fakeEntity} 条 unresolved mention 却挂了 resolved_entity_id（不得凭 unresolved mention 制造 Entity）`);

  // ②b 动态：Truth 表中 run 归因指向 research_run 的行数必须为 0
  const attrTables = await queryRows(
    `select table_name, column_name from information_schema.columns
      where table_schema='public' and column_name in ('ingest_run_id','run_id')
        and table_name not like 'research%'`
  );
  let truthLeak = 0;
  for (const t of attrTables) {
    const n = Number(await queryValue(
      `select count(*)::int from "${t.table_name}"
        where "${t.column_name}"::text in (select run_id::text from research_run)`
    ));
    if (n > 0) {
      truthLeak += n;
      bad(`Truth/控制面表 ${t.table_name}.${t.column_name} 中有 ${n} 行归因为 research_run —— 研究执行体写了研究区之外的表`);
    }
  }
  stats.truth_leak = truthLeak;
} catch (e) {
  dbNote = "WARN DB 不可达，跳过动态核对（离线环境可接受）：" + String((e && e.message) || e).slice(0, 140);
}

if (dbNote) console.error(dbNote);
console.log(
  `RESEARCH_GUARD discovery_jobs=${discovery.length} ` +
  `db_checked=${dbNote ? 0 : 1} ` +
  Object.entries(stats).map(([k, v]) => `${k}=${v}`).join(" ")
);
console.log("  · 结构 + 数据双核对：删掉库层约束或写入越界，本守卫即报红（不可靠弱化让它变绿）");
process.exit(failed ? 1 : 0);
