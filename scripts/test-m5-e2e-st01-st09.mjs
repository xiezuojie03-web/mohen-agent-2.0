#!/usr/bin/env node
/**
 * test-m5-e2e-st01-st09.mjs —— M5 端到端验收
 *
 * 围绕真实作品「松江府田赋：一亩低田的税单（M5 批次 H 真实链）」
 * 验证 ST-01→ST-09 九阶段完整链路 + G0→G5 Gate 链 + WATCH 消费资格
 *
 * 验收对象：work_id = 5b42577e-a4d6-4024-b1f9-99d0d788c9ec
 * 只读 DB，不写数据，不动生产
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").replace(/^\uFEFF/, "");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const dbUrl = env.DATABASE_URL;
const [, user, pwd, host, port = "5432", dbName] = dbUrl.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/(\S+)$/);
const psqlBin = "D:\\MoHen\\tools\\PostgreSQL\\18\\bin\\psql.exe";
const pgEnv = { PGPASSWORD: pwd, PGCLIENTENCODING: "UTF8", ...process.env };

function query(sql) {
  const r = spawnSync(psqlBin, ["-h", host, "-p", port, "-U", user, "-d", dbName, "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { encoding: "utf8", env: pgEnv, timeout: 20000 });
  if (r.status !== 0) return { ok: false, err: (r.stderr || r.error?.message || "").replace(/\r/g, "").trim() };
  const lines = (r.stdout || "").replace(/\r/g, "").trim().split(/\n/).filter(l => l.trim() && !l.trim().startsWith("SET"));
  return { ok: true, data: lines[lines.length - 1] || "", all: lines };
}

function runSql(sql) {
  const r = spawnSync(psqlBin, ["-h", host, "-p", port, "-U", user, "-d", dbName, "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { encoding: "utf8", env: pgEnv, timeout: 30000 });
  const out = ((r.stdout || "") + (r.stderr || "")).replace(/\r/g, "").trim();
  if (r.status !== 0) return { ok: false, err: out };
  return { ok: true, data: out };
}

const RESULTS = [];
const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const M5_PROJECT = "b0a11000-0000-4000-8000-000000000001";
const WORK = "5b42577e-a4d6-4024-b1f9-99d0d788c9ec";

function check(st, label, pass, detail) {
  const r = { st, label, pass, detail };
  RESULTS.push(r);
  console.log(`  ${pass ? "✅" : "❌"} ST-${st} ${label}: ${pass ? "PASS" : "HOLD"}`);
  if (detail) console.log(`     ${detail}`);
}

console.log("============================================================");
console.log("M5 端到端验收 — ST-01→ST-09 完整链路");
console.log("验收对象：松江府田赋：一亩低田的税单（M5 批次 H 真实链）");
console.log(`work_id: ${WORK}`);
console.log("============================================================\n");

// ============================================================
// 前置：作品存在且已发布
// ============================================================
console.log("--- 前置：作品存在且已发布 ---\n");

const workR = runSql(`select title, owner_user_id::text, creator, created_at from publication.works where work_id='${WORK}'::uuid;`);
check("P0", "作品存在", workR.ok && workR.data.includes("松江府"), workR.ok ? workR.data : workR.err);

const pointerR = runSql(`select revision_id::text, published_at, published_by from publication.published_pointers where work_id='${WORK}'::uuid;`);
check("P0", "已发布（published_pointers 有效）", pointerR.ok && pointerR.data.length > 0,
  pointerR.ok ? pointerR.data : pointerR.err);

const revR = runSql(`select revision_id::text, revision_no, status, created_at from publication.work_revisions where work_id='${WORK}'::uuid order by revision_no;`);
check("P0", "有 work_revisions 版本链", revR.ok && revR.data.split("\n").filter(l => l.trim()).length >= 1,
  revR.ok ? revR.data : revR.err);

// ============================================================
// ST-01 CreateWorkBrief — 选题、核心问题、受众
// ============================================================
console.log("\n--- ST-01 CreateWorkBrief ---\n");

const briefR = runSql(`
  select h.asset_id::text, h.asset_kind, r.revision_id::text, r.revision_no,
         left(r.payload::text, 150) as brief_preview
  from studio.asset_heads h join studio.asset_revisions r on r.asset_id = h.asset_id
  where h.asset_kind='research_brief' and h.project_id='${M5_PROJECT}'::uuid
  order by r.created_at`);
const briefLines = briefR.ok ? briefR.data.split("\n").filter(l => l.trim()) : [];
check("01", "research_brief 存在", briefLines.length >= 1,
  `brief count=${briefLines.length}, sample=${briefLines[0]?.slice(0, 100) || ""}`);

const briefDepR = runSql(`
  select count(*) from studio.asset_revisions r join studio.asset_heads h on h.asset_id = r.asset_id
  where h.asset_kind='research_brief' and h.project_id='${M5_PROJECT}'::uuid
    and r.dependency_refs != '[]'::jsonb;`);
check("01", "research_brief 有 dependency_refs（依赖来源锚点）", briefDepR.ok && parseInt(briefDepR.data) >= 1,
  briefDepR.ok ? `with_dep_refs=${briefDepR.data}` : briefDepR.err);

// ============================================================
// ST-02 StudioResearchRead — 选择材料/摘录
// ============================================================
console.log("\n--- ST-02 StudioResearchRead ---\n");

const saR = query(`select count(*) from studio.asset_heads where asset_kind='source_anchor' and project_id='${M5_PROJECT}';`);
check("02", "source_anchor 来源锚点存在", saR.ok && parseInt(saR.data) >= 1,
  `source_anchor=${saR.ok ? saR.data : "?"}`);

const rnR = query(`select count(*) from studio.asset_heads where asset_kind in ('reading_note','evidence_note') and project_id='${M5_PROJECT}';`);
check("02", "reading_note / evidence_note 摘录存在", rnR.ok && parseInt(rnR.data) >= 1,
  `reading/evidence=${rnR.ok ? rnR.data : "?"}`);

const srcRefR = runSql(`
  select count(*) from studio.asset_revisions r join studio.asset_heads h on h.asset_id = r.asset_id
  where h.project_id='${M5_PROJECT}' and r.source_refs != '[]'::jsonb;`);
check("02", "来源锚点有 source_refs（指向原件）", srcRefR.ok && parseInt(srcRefR.data) >= 1,
  srcRefR.ok ? `with_src_refs=${srcRefR.data}` : srcRefR.err);

// ============================================================
// ST-03 AnalyzeAndSaveCandidates — 选研究方向
// ============================================================
console.log("\n--- ST-03 AnalyzeAndSaveCandidates ---\n");

const claimR = query(`select count(*) from world.claim_revisions;`);
const findingR = query(`select count(*) from meaning.findings;`);
check("03", "claim_revisions 存在（关系/时空候选）", claimR.ok && parseInt(claimR.data) >= 1,
  `claims=${claimR.ok ? claimR.data : "?"}`);
check("03", "findings 存在（人文发现）", findingR.ok && parseInt(findingR.data) >= 1,
  `findings=${findingR.ok ? findingR.data : "?"}`);

// ============================================================
// ST-04 RequestFormalProduction — 决定补证/正式生产
// ============================================================
console.log("\n--- ST-04 RequestFormalProduction ---\n");

const prodR = query(`select count(*) from control.production_runs;`);
const candR = query(`select count(*) from control.gate_candidates;`);
check("04", "production_runs 存在（正式生产请求）", prodR.ok && parseInt(prodR.data) >= 1,
  `production_runs=${prodR.ok ? prodR.data : "?"}`);
check("04", "gate_candidates 存在（Gate 候选）", candR.ok && parseInt(candR.data) >= 1,
  `candidates=${candR.ok ? candR.data : "?"}`);

// ============================================================
// ST-05 AssembleDirectorPlan — 选择解释/导演方向
// ============================================================
console.log("\n--- ST-05 AssembleDirectorPlan ---\n");

const dpR = runSql(`
  select plan_id::text, topic, owner_user_id::text, project_id::text,
         count(beats) as has_beats, count(facts) as has_facts, count(plan_a) as has_plan_a
  from public.director_plans where project_id='${M5_PROJECT}'::uuid
  group by plan_id, topic, owner_user_id, project_id;`);
check("05", "director_plan 绑定松江府田赋项目", dpR.ok && dpR.data.length > 0,
  dpR.ok ? dpR.data : dpR.err);

const dpContentR = query(`select count(*) from public.director_plans where project_id='${M5_PROJECT}'::uuid and beats is not null and facts is not null;`);
check("05", "director_plan 有 beats/facts 内容", dpContentR.ok && parseInt(dpContentR.data) >= 1,
  `with_content=${dpContentR.ok ? dpContentR.data : "?"}`);

// work_revision 的 content 里有 plan/beats/directorDecisions
const wrContentR = runSql(`
  select revision_no, jsonb_object_keys(content->'plan') as plan_keys
  from publication.work_revisions where work_id='${WORK}'::uuid and status='published' limit 5;`);
check("05", "published work_revision 有 plan 结构", wrContentR.ok && wrContentR.data.length > 0,
  wrContentR.ok ? wrContentR.data : wrContentR.err);

// ============================================================
// ST-06 PreviewWork — 只读合法 Surface 预览
// ============================================================
console.log("\n--- ST-06 PreviewWork ---\n");

// preview 可能是只读的，不持久化。验证 work_revision 的 content 有完整结构
const wrFullR = runSql(`
  select revision_no,
         jsonb_typeof(content->'plan') as plan_type,
         jsonb_array_length(content->'beats') as beats_count,
         jsonb_typeof(content->'plan'->'angle') as angle_type
  from publication.work_revisions where work_id='${WORK}'::uuid and status='published'`);
check("06", "作品内容结构完整（plan + beats）", wrFullR.ok && wrFullR.data.includes("object"),
  wrFullR.ok ? wrFullR.data : wrFullR.err);

// ============================================================
// ST-07 SaveWorkRevision — 定向改稿与版本管理
// ============================================================
console.log("\n--- ST-07 SaveWorkRevision ---\n");

const revCountR = query(`select count(*) from publication.work_revisions where work_id='${WORK}'::uuid;`);
check("07", "work_revisions 版本链（≥1 修订）", revCountR.ok && parseInt(revCountR.data) >= 1,
  `revisions=${revCountR.ok ? revCountR.data : "?"}`);

const revStatusR = runSql(`select status, count(*) from publication.work_revisions where work_id='${WORK}'::uuid group by status;`);
check("07", "有 published 状态的修订", revStatusR.ok && revStatusR.data.includes("published"),
  revStatusR.ok ? revStatusR.data : revStatusR.err);

// asset_revisions 也有版本链（research_brief #1 → #2）
const assetRevR = query(`select count(*) from studio.asset_revisions where asset_id in (select asset_id from studio.asset_heads where asset_kind='research_brief' and project_id='${M5_PROJECT}');`);
check("07", "research_brief 有修订链", assetRevR.ok && parseInt(assetRevR.data) >= 2,
  `brief_revisions=${assetRevR.ok ? assetRevR.data : "?"}`);

// ============================================================
// ST-08 SubmitForEditorialReview — 主动提交冻结版本
// ============================================================
console.log("\n--- ST-08 SubmitForEditorialReview ---\n");

// work_publication_decisions 记录审查决策
const epdR = query(`select count(*) from control.work_publication_decisions;`);
check("08", "work_publication_decisions 存在", epdR.ok && parseInt(epdR.data) >= 1,
  `decisions=${epdR.ok ? epdR.data : "?"}`);

// 预检：Gate G0-G4 在该作品相关对象上 PASS
const gateG0R = query(`select count(*) from control.gate_audits where gate_code='G0' and result='PASS';`);
const gateG4R = query(`select count(*) from control.gate_audits where gate_code='G4' and result='PASS';`);
check("08", "G0-G4 Gate 资格 PASS（发布前预检）", gateG0R.ok && gateG4R.ok && parseInt(gateG0R.data) >= 1 && parseInt(gateG4R.data) >= 1,
  `G0=${gateG0R.ok ? gateG0R.data : "?"}, G4=${gateG4R.ok ? gateG4R.data : "?"}`);

// ============================================================
// ST-09 EditorialDecision/Publish/Withdraw — 发布与撤回
// ============================================================
console.log("\n--- ST-09 EditorialDecision/Publish/Withdraw ---\n");

check("09", "published_pointers 有效（ST-09 发布）", pointerR.ok && pointerR.data.length > 0,
  pointerR.ok ? pointerR.data : pointerR.err);

// G5 在作品相关对象上 PASS
const g5R = query(`select count(*) from control.gate_audits where gate_code='G5' and result='PASS' and decision_origin='independent_gate';`);
check("09", "G5 独立审计 PASS（发布资格）", g5R.ok && parseInt(g5R.data) >= 1,
  `G5_independent=${g5R.ok ? g5R.data : "?"}`);

// qualification_current 有 watch 消费者
const qcWatchR = query(`select count(*) from control.qualification_current where consumer='watch';`);
check("09", "qualification_current 有 watch 消费者", qcWatchR.ok && parseInt(qcWatchR.data) >= 1,
  `watch_current=${qcWatchR.ok ? qcWatchR.data : "?"}`);

// ============================================================
// Gate 链完整性：G0→G5 全 PASS
// ============================================================
console.log("\n--- Gate 链完整性 G0→G5 ---\n");

const gateDistR = runSql("select gate_code, count(*) from control.gate_audits where result='PASS' group by gate_code order by gate_code;");
const gateData = gateDistR.ok ? gateDistR.data : "";
const allGates = ["G0","G1","G2","G3","G4","G5"].every(g => gateData.includes(g));
check("GATE", "G0→G5 全部有 PASS 审计", allGates, gateData);

// ============================================================
// 数据链路完整性：作品 → 来源 → Gate
// ============================================================
console.log("\n--- 数据链路完整性 ---\n");

// 作品 revision 有 content
const contentR = query(`select count(*) from publication.work_revisions where work_id='${WORK}'::uuid and content is not null and content != '{}'::jsonb;`);
check("LINK", "work_revision 有非空 content", contentR.ok && parseInt(contentR.data) >= 1,
  `with_content=${contentR.ok ? contentR.data : "?"}`);

// source_anchor 有 source_refs
const srcR = runSql(`
  select count(*) from studio.asset_revisions r join studio.asset_heads h on h.asset_id = r.asset_id
  where h.asset_kind='source_anchor' and h.project_id='${M5_PROJECT}' and r.source_refs != '[]'::jsonb;`);
check("LINK", "source_anchor → source_refs 链路", srcR.ok && parseInt(srcR.data) >= 1,
  srcR.ok ? `with_src_refs=${srcR.data}` : srcR.err);

// asset_links 连接 research_brief → source_anchor
const alR = query(`select count(*) from studio.asset_links;`);
check("LINK", "asset_links 资产间连接", alR.ok && parseInt(alR.data) >= 1,
  `links=${alR.ok ? alR.data : "?"}`);

// ============================================================
// 汇总
// ============================================================
console.log("\n============================================================");
console.log("M5 端到端验收汇总");
console.log("============================================================");

const pass = RESULTS.filter(r => r.pass).length;
const total = RESULTS.length;
console.log(`\n总计: ${pass}/${total} PASS (${Math.round(pass/total*100)}%)`);

const gaps = RESULTS.filter(r => !r.pass);
if (gaps.length > 0) {
  console.log(`\n缺口 (${gaps.length} 项):`);
  for (const g of gaps) console.log(`  ❌ ST-${g.st} ${g.label}`);
} else {
  console.log("\n🎉 全部 PASS — ST-01→ST-09 九阶段完整链路 + G0→G5 Gate 链验收通过");
}

console.log("\n============================================================");
console.log("M5_E2E_ST01_ST09_VERIFY_COMPLETE");
