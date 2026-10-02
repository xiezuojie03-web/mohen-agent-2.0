// pipelines/legacy/port-relations.mjs
// NIGHT-BATCH-005 · 沪上经纬旧库 relations → 候选关系（不自动当事实）。
// 规则（T07 §1 + 用户授权"确定性+带来源"）：
//   * source_id / target_id 均可解析到已导入 entities → 建 candidate 关系 + 结构性 locator 证据（非 AI 叙述）
//   * 任一端不可解析 → 留 review_queue HOLD（RELATION_UNRESOLVED_ENTITY），默认不猜
//   * 旧 batch-003 的 334 条弱关联 HOLD（RELATION_WEAK_LINK_HELD）先清，再按解析结果重写
// 三道闸：MOHEN_WRITE_ENABLED!=true → DRY_RUN；MOHEN_ENV∈{dev,staging}

import fs from "node:fs";
import crypto from "node:crypto";
import { run, runMany, queryRows, queryValue } from "../../packages/data-access/src/index.mjs";

const LEGACY_SOURCE = "hushang_legacy";
const SEED_PATH = "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/seed.master.json";
const WRITE = process.env.MOHEN_WRITE_ENABLED === "true";
const ENV = process.env.MOHEN_ENV || "dev";
if (WRITE && !(ENV === "dev" || ENV === "staging")) { console.error("STOP env"); process.exit(2); }
const MODE = WRITE ? "WRITE" : "DRY_RUN";
const uuid = () => crypto.randomUUID();

const summary = { mode: MODE, started_at: new Date().toISOString(), counts: {}, verdict: "", errors: [] };

async function main() {
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));
  const relations = Array.isArray(seed.relations) ? seed.relations : [];
  console.log(`[${MODE}] relations=${relations.length}`);

  // legacy_id → entity_id
  const entRows = await queryRows(`select entity_id, legacy_id from entities where legacy_id is not null`);
  const entMap = new Map(entRows.map((r) => [r.legacy_id, r.entity_id]));
  // 已存在的关系 legacy_id
  const existRel = await queryRows(`select legacy_id from relations where legacy_id is not null`);
  const existRelSet = new Set(existRel.map((r) => r.legacy_id));
  // 旧 HOLD 清理目标
  const srcId = await queryValue(`select source_id from source_records where provider=:'p'`, { p: LEGACY_SOURCE });

  const relItems = [], evItems = [], relEvItems = [], holdItems = [];
  let resolvable = 0, unresolvable = 0, skipped = 0;

  for (const r of relations) {
    const s = r.source_id, t = r.target_id;
    const sid = entMap.get(s), tid = entMap.get(t);
    const lid = `${s}->${t}`;
    if (existRelSet.has(lid)) { skipped++; continue; }
    if (!sid || !tid) {
      unresolvable++;
      if (WRITE) holdItems.push({
        sql: `insert into review_queue (object_type,object_id,review_tier,reason_code,summary,status)
              values ('relation',:'oid','C','RELATION_UNRESOLVED_ENTITY',:'s','pending')`,
        params: { oid: lid, s: `沪上经纬关系端点不可解析：source=${s}→target=${t}（实体未导入），留待人工裁决。` },
      });
      continue;
    }
    resolvable++;
    if (!WRITE) continue;
    const rid = uuid();
    const pred = r.relation_type || "crossLink";
    relItems.push({
      sql: `insert into relations (relation_id,subject_id,predicate,object_id,confidence,status,legacy_id)
            values (:'rid'::uuid,:'sid'::uuid,:'pred',:'tid'::uuid,0.5,'candidate',:'lid')`,
      params: { rid, sid, pred, tid, lid },
    });
    // 结构性 locator 证据（非 AI 叙述；quote 仅机器目录引用）
    const eid = uuid();
    evItems.push({
      sql: `insert into evidence (evidence_id,source_id,evidence_type,locator,quote_text,extraction_method,confidence,verification_status)
            values (:'eid'::uuid,:'src'::uuid,'text',:'loc',:'q','legacy_crosslink',0.5,'candidate')`,
      params: { eid, src: srcId, loc: `legacy:${LEGACY_SOURCE}:relation:${lid}`, q: `沪上经纬 crossLink ${s} → ${t}（type=${pred}）` },
    });
    relEvItems.push({
      sql: `insert into relation_evidence (relation_id,evidence_id,support_type) values (:'rid'::uuid,:'eid'::uuid,'supports')`,
      params: { rid, eid },
    });
  }

  summary.counts = { relations_total: relations.length, resolvable, unresolvable, skipped_existing: skipped,
    relations_to_insert: relItems.length, evidence_to_insert: evItems.length, holds_to_insert: holdItems.length };

  if (!WRITE) {
    console.log(`[${MODE}] resolvable=${resolvable} unresolvable=${unresolvable} skipped=${skipped}`);
    summary.verdict = "DRY_RUN_OK";
    console.log("[DRY_RUN] 未写入。确认后翻 MOHEN_WRITE_ENABLED=true 实跑。");
    return;
  }

  let runId = null;
  try {
    runId = await queryValue(`insert into ingest_runs (pipeline_name,source_scope,input_count,status) values ('hushang-port-relations','hushang_legacy',${relations.length},'running') returning ingest_run_id`);
    // 清理 batch-003 的弱关联 HOLD（按 reason_code）
    await run(`delete from review_queue where reason_code='RELATION_WEAK_LINK_HELD'`);
    if (relItems.length) { await runMany(relItems); await runMany(evItems); await runMany(relEvItems); }
    if (holdItems.length) await runMany(holdItems);
    await run(`update ingest_runs set status='completed', finished_at=now(), candidate_count=${relItems.length}, pending_count=${holdItems.length} where ingest_run_id=:'rid'::uuid`, { rid: runId });
    summary.ingest_run_id = runId;
    summary.verdict = holdItems.length > 0 ? "PASS_WITH_HOLD" : "PASS";
  } catch (err) {
    summary.errors.push(String(err && err.message ? err.message : err));
    summary.verdict = "STOPPED";
    if (runId) try { await run(`update ingest_runs set status='failed', finished_at=now(), error_count=1 where ingest_run_id=:'rid'::uuid`, { rid: runId }); } catch {}
  }
  console.log("verdict=" + summary.verdict + " resolvable=" + resolvable + " unresolvable=" + unresolvable);
  if (summary.errors.length) console.log("errors=" + summary.errors.join(" | "));
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
