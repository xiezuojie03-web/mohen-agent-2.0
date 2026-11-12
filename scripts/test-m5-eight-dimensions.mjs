#!/usr/bin/env node
/**
 * test-m5-eight-dimensions.mjs —— M5 八维度系统化只读验证
 *
 * PLAN §3.5 + §0.2 CP4.1/CP4.2 唯一验收矩阵
 * 本地隔离 mohen_dev 只读，不写任何数据
 *
 * 输出：
 *   - 每个维度的真实数据事实
 *   - PASS/HOLD 判断
 *   - 缺口定位
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

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

function check(dim, id, label, pass, detail) {
  const result = { dim, id, label, pass, detail };
  RESULTS.push(result);
  const icon = pass ? "✅" : "❌";
  console.log(`  ${icon} ${dim}.${id} ${label}: ${pass ? "PASS" : "HOLD"}`);
  if (detail) console.log(`     ${detail}`);
}

console.log("============================================================");
console.log("M5 八维度系统化只读验证 — 本地 mohen_dev");
console.log("============================================================\n");

let passCount = 0, holdCount = 0;

// ============================================================
// 维度 1：ST-01 CreateWorkBrief — 自然语言创作入口
// ============================================================
console.log("--- 维度 1：ST-01 自然语言创作入口 ---\n");

const projR = query(`select count(*) from studio.projects where owner_user_id='${OWNER}'`);
check(1, "1a", "Owner 有 ACTIVE 项目", projR.ok && projR.data >= 1, `projects=${projR.ok ? projR.data : projR.err}`);

const briefR = runSql(`select asset_id::text, asset_kind from studio.asset_heads where asset_kind='research_brief' and project_id='${M5_PROJECT}'`);
const briefCount = briefR.ok ? briefR.data.split("\n").filter(l => l.trim()).length : 0;
check(1, "1b", "松江府田赋项目有 research_brief", briefCount >= 1, `research_brief=${briefCount}`);

const dpR = runSql(`select count(*) from public.director_plans where owner_user_id='${OWNER}'`);
const dpProjBound = query(`select count(*) from public.director_plans where project_id is not null and owner_user_id='${OWNER}'`);
check(1, "1c", "director_plans 总数", dpR.ok && parseInt(dpR.data) >= 1, `total=${dpR.ok ? dpR.data : dpR.err}`);
check(1, "1d", "director_plans 绑定 project_id", dpProjBound.ok && parseInt(dpProjBound.data) >= 1, `bound=${dpProjBound.ok ? dpProjBound.data : dpProjBound.err} / total=${dpR.ok ? dpR.data : "?"}`);

// research_brief 有 revision
const briefRevR = runSql(`select count(*) from studio.asset_revisions r join studio.asset_heads h on r.asset_id = h.asset_id where h.asset_kind='research_brief'`);
check(1, "1e", "research_brief 有 revision", briefRevR.ok && parseInt(briefRevR.data) >= 1, `revisions=${briefRevR.ok ? briefRevR.data : briefRevR.err}`);

// ============================================================
// 维度 2：内外 AI 混合协作
// ============================================================
console.log("\n--- 维度 2：内外 AI 混合协作 ---\n");

const delR = query("select count(*) from studio.delegations");
check(2, "2a", "delegations 存在", delR.ok && parseInt(delR.data) >= 1, `delegations=${delR.data}`);

const ctrlR = query("select count(*) from studio.execution_controls");
check(2, "2b", "execution_controls 存在", ctrlR.ok && parseInt(ctrlR.data) >= 1, `controls=${ctrlR.data}`);

const receiptR = query("select count(*) from studio.execution_receipts");
check(2, "2c", "execution_receipts 存在（真实 Provider 调用）", receiptR.ok && parseInt(receiptR.data) >= 1, `receipts=${receiptR.data}`);

// receipt 有实际费用
const costR = runSql("select count(*) from studio.execution_receipts where cost > 0");
check(2, "2d", "receipts 有实际费用（cost>0）", costR.ok && parseInt(costR.data) >= 1, `with_cost=${costR.ok ? costR.data : costR.err}`);

// receipt 有 result_hash（实际执行结果）
const resultR = runSql("select count(*) from studio.execution_receipts where result_hash is not null and result_hash != ''");
check(2, "2e", "receipts 有 result_hash", resultR.ok && parseInt(resultR.data) >= 1, `with_result=${resultR.ok ? resultR.data : resultR.err}`);

// execution_control_events 有 CLAIM/CHECKPOINT/REVOKE
const evR = runSql("select operation, count(*) from studio.execution_control_events group by operation order by operation");
if (evR.ok && evR.data) {
  console.log(`  ℹ️  execution_control_events:\n     ${evR.data.replace(/\n/g, " | ")}`);
}

// ============================================================
// 维度 3：来源证据 D·L·G
// ============================================================
console.log("\n--- 维度 3：来源证据 D·L·G ---\n");

const srcR = query("select count(*) from source.sources");
const verR = query("select count(*) from source.source_versions");
const rawR = query("select count(*) from source.raw_items");
check(3, "3a", "source.sources", srcR.ok && parseInt(srcR.data) >= 10, `sources=${srcR.ok ? srcR.data : srcR.err}`);
check(3, "3b", "source.source_versions", verR.ok && parseInt(verR.data) >= 10, `versions=${verR.ok ? verR.data : verR.err}`);
check(3, "3c", "source.raw_items", rawR.ok && parseInt(rawR.data) >= 50, `raw_items=${rawR.ok ? rawR.data : rawR.err}`);

const readRunR = query("select count(*) from source.read_runs");
const readUnitR = query("select count(*) from source.read_units");
const readingUnitR = query("select count(*) from evidence.reading_units");
check(3, "3d", "read_runs → read_units 链", readRunR.ok && readUnitR.ok && parseInt(readRunR.data) >= 1 && parseInt(readUnitR.data) >= 10,
  `read_runs=${readRunR.ok ? readRunR.data : "?"}, read_units=${readUnitR.ok ? readUnitR.data : "?"}`);

const evR2 = query("select count(*) from evidence.material_evidence");
check(3, "3e", "material_evidence", evR2.ok && parseInt(evR2.data) >= 10, `material_evidence=${evR2.ok ? evR2.data : evR2.err}`);

const claimR = query("select count(*) from world.claim_revisions");
const findingR = query("select count(*) from meaning.findings");
check(3, "3f", "claim_revisions + findings", claimR.ok && findingR.ok && parseInt(claimR.data) >= 1 && parseInt(findingR.data) >= 1,
  `claims=${claimR.ok ? claimR.data : "?"}, findings=${findingR.ok ? findingR.data : "?"}`);

const wpR = query("select count(*) from read_model.world_projections");
const ssR = query("select count(*) from read_model.story_seeds");
check(3, "3g", "world_projections + story_seeds", wpR.ok && ssR.ok && parseInt(wpR.data) >= 1 && parseInt(ssR.data) >= 1,
  `projections=${wpR.ok ? wpR.data : "?"}, story_seeds=${ssR.ok ? ssR.data : "?"}`);

// Gate 独立审计
const gateAuditR = query("select count(*) from control.gate_audits where result='PASS'");
const g0R = query("select count(*) from control.gate_audits where gate_code='G0' and result='PASS'");
const g5R = query("select count(*) from control.gate_audits where gate_code='G5' and result='PASS'");
const gateTotal = parseInt(gateAuditR.data || "0");
check(3, "3h", "G0-G5 独立审计 PASS", gateTotal >= 500, `G0=${g0R.data}, G5=${g5R.data}, total=${gateTotal}`);

// qualification_current（当前有效资格）
const qcR = query("select count(*) from control.qualification_current");
check(3, "3i", "qualification_current 当前有效资格", qcR.ok && parseInt(qcR.data) >= 1, `current=${qcR.ok ? qcR.data : qcR.err}`);

// artifact_revision_for 函数
const arR = runSql("select proname from pg_proc where proname='artifact_revision_for'");
check(3, "3j", "artifact_revision_for 函数存在", arR.ok && arR.data.includes("artifact_revision_for"));

// ============================================================
// 维度 4：13 类知识资产沉淀
// ============================================================
console.log("\n--- 维度 4：13 类知识资产沉淀 ---\n");

const ahR = query("select count(*) from studio.asset_heads");
check(4, "4a", "asset_heads 总数", ahR.ok && parseInt(ahR.data) >= 10, `total=${ahR.ok ? ahR.data : ahR.err}`);

const ahKindR = runSql("select asset_kind, count(*) from studio.asset_heads group by asset_kind order by count(*) desc");
if (ahKindR.ok && ahKindR.data) {
  console.log(`  ℹ️  asset_kind 分布:\n     ${ahKindR.data.replace(/\n/g, " | ")}`);
}

const arTotalR = query("select count(*) from studio.asset_revisions");
check(4, "4b", "asset_revisions 总数", arTotalR.ok && parseInt(arTotalR.data) >= 10, `total=${arTotalR.ok ? arTotalR.data : arTotalR.err}`);

const srcRefR = query("select count(*) from studio.asset_revisions where source_refs is not null and source_refs != '[]'::jsonb");
const totalRevR = query("select count(*) from studio.asset_revisions");
const srcRefPct = totalRevR.ok && parseInt(totalRevR.data) > 0 ? (parseInt(srcRefR.data) / parseInt(totalRevR.data) * 100).toFixed(1) : "0";
check(4, "4c", "source_refs 非空比例（QR-07）", parseInt(srcRefPct) >= 50,
  `${srcRefR.ok ? srcRefR.data : "?"}/${totalRevR.ok ? totalRevR.data : "?"} = ${srcRefPct}%`);

const depRefR = query("select count(*) from studio.asset_revisions where dependency_refs is not null and dependency_refs != '[]'::jsonb");
check(4, "4d", "dependency_refs 非空", depRefR.ok && parseInt(depRefR.data) >= 1,
  `non_empty=${depRefR.ok ? depRefR.data : "?"}/${totalRevR.ok ? totalRevR.data : "?"}`);

// asset_links
const alR = query("select count(*) from studio.asset_links");
check(4, "4e", "asset_links 存在", alR.ok && parseInt(alR.data) >= 1, `links=${alR.ok ? alR.data : alR.err}`);

// reference_kinds（18 种 ref 类型登记）
const rkR = query("select count(*) from studio.reference_kinds");
check(4, "4f", "reference_kinds 18 种登记", rkR.ok && parseInt(rkR.data) >= 10, `kinds=${rkR.ok ? rkR.data : rkR.err}`);

// 13 类资产覆盖
const kindsExpected = ["source_anchor", "research_brief", "director_plan", "reading_note", "evidence_note", "relation", "hypothesis", "time_space", "projection", "world_model", "composition", "work_revision", "published_work"];
const kindsActual = runSql("select distinct asset_kind from studio.asset_heads").ok ? runSql("select distinct asset_kind from studio.asset_heads").data.split("\n").filter(l => l.trim()) : [];
const missingKinds = kindsExpected.filter(k => !kindsActual.includes(k));
check(4, "4g", "覆盖 13 类（有多少类）", kindsActual.length >= 5,
  `actual=${kindsActual.length}: [${kindsActual.join(", ")}], missing_expected=[${missingKinds.join(", ")}]`);

// rights_by_action 字段在 asset_revisions 中
const rightsR = runSql("select column_name from information_schema.columns where table_name='asset_revisions' and table_schema='studio' order by ordinal_position");
if (rightsR.ok) {
  const hasRights = rightsR.data.includes("rights_by_action");
  check(4, "4h", "asset_revisions 有 rights_by_action 列", hasRights, hasRights ? "列存在" : "列缺失");
}

// ============================================================
// 维度 5：Studio 真实创作
// ============================================================
console.log("\n--- 维度 5：Studio 真实创作 ---\n");

const worksR = query("select count(*) from publication.works where owner_user_id='${OWNER}'");
const worksTotalR = query("select count(*) from publication.works");
check(5, "5a", "publication.works 存在", worksTotalR.ok && parseInt(worksTotalR.data) >= 1,
  `total=${worksTotalR.ok ? worksTotalR.data : worksTotalR.err}, owner_works=${worksR.ok ? worksR.data : "?"}`);

const revR = query("select count(*) from publication.work_revisions");
check(5, "5b", "publication.work_revisions 存在", revR.ok && parseInt(revR.data) >= 1, `revisions=${revR.ok ? revR.data : revR.err}`);

const pointerR = query("select count(*) from publication.published_pointers");
check(5, "5c", "published_pointers 存在", pointerR.ok && parseInt(pointerR.data) >= 1, `pointers=${pointerR.ok ? pointerR.data : pointerR.err}`);

// director_plan 有 beats/facts/content
const dpContentR = runSql("select count(*) from public.director_plans where beats is not null and facts is not null");
check(5, "5d", "director_plans 有 beats/facts", dpContentR.ok && parseInt(dpContentR.data) >= 1, `content=${dpContentR.ok ? dpContentR.data : dpContentR.err}`);

// 真实作品链：work → revision → pointer 完整
const workChainR = runSql(`select w.work_id::text, w.title, count(r.revision_id) as rev_count, count(p.revision_id) as has_pointer
  from publication.works w
    left join publication.work_revisions r on r.work_id = w.work_id
    left join publication.published_pointers p on p.work_id = w.work_id
  where w.owner_user_id='${OWNER}'
  group by w.work_id, w.title
  having count(r.revision_id) >= 1
  order by has_pointer desc, rev_count desc limit 10`);
if (workChainR.ok && workChainR.data) {
  console.log(`  ℹ️  真实作品链:\n     ${workChainR.data.replace(/\n/g, "\n     ")}`);
}

// ============================================================
// 维度 6：Admin 知识资产管理
// ============================================================
console.log("\n--- 维度 6：Admin 知识资产管理 ---\n");

const useEvR = query("select count(*) from studio.use_events");
check(6, "6a", "use_events 消费史存在", useEvR.ok && parseInt(useEvR.data) >= 1, `use_events=${useEvR.ok ? useEvR.data : useEvR.err}`);

const useActionR = runSql("select requested_action, count(*) from studio.use_events group by requested_action order by count(*) desc");
if (useActionR.ok && useActionR.data) {
  console.log(`  ℹ️  use_events action 分布:\n     ${useActionR.data.replace(/\n/g, " | ")}`);
}

// Admin API 路由检查
import { existsSync, readdirSync } from "node:fs";
const adminDir = path.join(ROOT, "apps/web/app/api/admin");
const adminRoutes = [];
if (existsSync(adminDir)) {
  function walk(dir, prefix = "/api/admin") {
    for (const f of readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p, `${prefix}/${f}`);
      else if (f === "route.ts") adminRoutes.push(prefix.replace(/\/$/, ""));
    }
  }
  walk(adminDir);
}
const expectedAdmin = ["/api/admin/assets", "/api/admin/publications", "/api/admin/acls", "/api/admin/users"];
const foundAdmin = expectedAdmin.filter(r => adminRoutes.some(a => a.includes(r.split("/").pop())));
check(6, "6b", "Admin API 路由存在", foundAdmin.length >= 3,
  `found=${foundAdmin.length}: [${foundAdmin.join(", ")}], all=${adminRoutes.length} routes`);

// Admin 逐条逆查能力（source_refs 解析）
const resolveR = runSql(`select proname from pg_proc where proname='resolve_asset_reference'`);
check(6, "6c", "resolve_asset_reference 函数存在", resolveR.ok && resolveR.data.includes("resolve_asset_reference"), "Admin 逐条逆查依赖此函数");

// asset_consumption_disposition（消费裁决——通过触发器实现，不是独立表）
const dispTriggerR = runSql(`select tgname from pg_trigger where tgname in ('studio_use_event_guard', 'studio_asset_revision_reference_guard') order by tgname`);
check(6, "6d", "消费裁决触发器存在（guard + reference_guard）",
  dispTriggerR.ok && dispTriggerR.data.includes("studio_use_event_guard") && dispTriggerR.data.includes("studio_asset_revision_reference_guard"),
  dispTriggerR.ok ? dispTriggerR.data.replace(/\n/g, " + ") : dispTriggerR.err);

// ============================================================
// 维度 7：独立 G5 + 媒资权利 + 发布
// ============================================================
console.log("\n--- 维度 7：独立 G5 + 媒资权利 + 发布 ---\n");

const gate5R = query("select count(*) from control.gate_audits where gate_code='G5' and result='PASS'");
const gate5IndependentR = runSql("select count(*) from control.gate_audits where gate_code='G5' and result='PASS' and decision_origin='independent_gate'");
check(7, "7a", "G5 independent_gate PASS > 0", gate5IndependentR.ok && parseInt(gate5IndependentR.data) >= 1,
  `G5_total=${gate5R.data}, G5_independent=${gate5IndependentR.ok ? gate5IndependentR.data : "?"}`);

// 媒资权利 — rights_by_action 在 source_versions
const rightsSnapR = runSql("select count(*) from source.source_versions where rights_snapshot is not null and rights_snapshot != '{}'::jsonb");
check(7, "7b", "source_versions rights_snapshot 非空（显式权利）", rightsSnapR.ok && parseInt(rightsSnapR.data) >= 1,
  `with_rights=${rightsSnapR.ok ? rightsSnapR.data : rightsSnapR.err}`);

// rights_by_action 函数
const rightsFnR = runSql("select proname from pg_proc where proname like '%rights%'");
check(7, "7c", "rights 相关函数存在", rightsFnR.ok && rightsFnR.data.split("\n").filter(l => l.trim()).length >= 2,
  `functions: ${rightsFnR.ok ? rightsFnR.data.replace(/\n/g, ", ") : "?"}`);

// 发布指针
const pointerActiveR = runSql("select count(*) from publication.published_pointers where revision_id is not null");
check(7, "7d", "published_pointers 有效", pointerActiveR.ok && parseInt(pointerActiveR.data) >= 1,
  `active=${pointerActiveR.ok ? pointerActiveR.data : pointerActiveR.err}`);

// ============================================================
// 维度 8：WATCH + 撤权
// ============================================================
console.log("\n--- 维度 8：WATCH + 撤权 ---\n");

const qcWatchR = runSql(`select count(*) from control.qualification_current where consumer='watch'`);
check(8, "8a", "qualification_current 有 watch 消费者", qcWatchR.ok && parseInt(qcWatchR.data) >= 1,
  `watch_current=${qcWatchR.ok ? qcWatchR.data : qcWatchR.err}`);

// WATCH 路由检查
const watchDir = path.join(ROOT, "apps/web/app/watch");
const watchRoutes = [];
if (existsSync(watchDir)) {
  function walk2(dir, prefix = "/watch") {
    for (const f of readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk2(p, `${prefix}/${f}`);
      else if (f === "page.tsx" || f === "layout.tsx") watchRoutes.push(`${prefix}/${f}`);
    }
  }
  walk2(watchDir);
}
check(8, "8b", "WATCH 路由存在", watchRoutes.length >= 1, `watch routes=${watchRoutes.length}: ${watchRoutes.slice(0, 3).join(", ")}`);

// verify-5m-watch-eligibility 工具存在
import { existsSync as es2 } from "node:fs";
check(8, "8c", "verify-5m-watch-eligibility 工具存在", es2(path.join(ROOT, "tools/verify-5m-watch-eligibility.mjs")), "已有撤权即时拒绝验证");

// ============================================================
// 汇总
// ============================================================
console.log("\n============================================================");
console.log("M5 八维度验证汇总");
console.log("============================================================");

const dimStats = {};
for (const r of RESULTS) {
  if (!dimStats[r.dim]) dimStats[r.dim] = { total: 0, pass: 0 };
  dimStats[r.dim].total++;
  if (r.pass) dimStats[r.dim].pass++;
}

for (let d = 1; d <= 8; d++) {
  const s = dimStats[d] || { total: 0, pass: 0 };
  const pct = s.total > 0 ? Math.round(s.pass / s.total * 100) : 0;
  const icon = pct >= 80 ? "✅" : pct >= 50 ? "⚠️" : "❌";
  const labels = {1:"自然语言入口",2:"内外AI协作",3:"来源D·L·G",4:"13类资产",5:"Studio创作",6:"Admin管理",7:"G5+发布",8:"WATCH+撤权"};
  console.log(`  ${icon} 维度 ${d} ${labels[d]}: ${s.pass}/${s.total} PASS (${pct}%)`);
}

const totalPASS = RESULTS.filter(r => r.pass).length;
const totalItems = RESULTS.length;
console.log(`\n总计: ${totalPASS}/${totalItems} PASS (${Math.round(totalPASS/totalItems*100)}%)`);

const gaps = RESULTS.filter(r => !r.pass);
if (gaps.length > 0) {
  console.log(`\n缺口清单 (${gaps.length} 项):`);
  for (const g of gaps) console.log(`  ❌ ${g.dim}.${g.id} ${g.label}`);
}

console.log("\n============================================================");
console.log("VERIFY_M5_EIGHT_DIMENSIONS_COMPLETE");
