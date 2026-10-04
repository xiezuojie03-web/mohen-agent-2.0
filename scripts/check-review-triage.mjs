// scripts/check-review-triage.mjs
// 目的：把 M2 第四条（review_queue AUTO/HOLD/REJECT 三分，迁移 202610020009）
//       变成**可核对**的东西 —— 只读、不阻断写入（与 check-promotion-gate.mjs 同模式）。
//
// 为什么需要它（实测背景）：
//   · 断点 B-02：334 关系 + 1246 图片从未进 review_queue —— 协议 #5 的三分流
//     只存在于文档，库里没有任何东西强制它；
//   · 触发器拦的是**写入时**的形态；本守卫核对的是**库内持续成立**的不变量
//     （例如事后 UPDATE 是否留下"hold 已定案却无 reviewed_at"的痕迹）。
//
// 检查项：
//   ① 结构：triage_outcome / ingest_run_id 列、guard_review_queue_triage 触发器、
//      同 run 同对象唯一部分索引在真库存在（防迁移未应用）
//   ② 不变量：分诊行必带 reason_code；hold 行定案必须带 reviewed_at（人审痕迹）
//   ③ 覆盖：按 triage_outcome 计数（NULL＝出生于该机制之前的历史行，不算违规）
//   ④ 研究长尾解耦（2026-10-03 新增 · 主协议 §3.3 / R-DP-04）：
//      只有 Selected / Truth-Promotion / Narrative-Critical / Conflict-Critical 才创建分诊行；
//      **研究长尾不得 1:1 制造 review_queue** —— 否则等于用新机制重新制造人工债务。
//   DB 不可达 → WARN 并跳过（离线可跑）。
//
// 只读保证：本脚本**只执行 SELECT**，不含任何 INSERT/UPDATE/DDL。
import { queryRows, queryValue } from "../packages/data-access/src/index.mjs";

let failed = false;
const bad = (m) => { console.error("REVIEW_TRIAGE_ERROR " + m); failed = true; };

let dbNote = "";
const byTriage = [];
let researchNote = "";

try {
  // ① 结构
  const cols = await queryRows(
    `select column_name from information_schema.columns
      where table_schema='public' and table_name='review_queue'
        and column_name in ('triage_outcome','ingest_run_id')`
  );
  const colSet = new Set(cols.map((r) => r.column_name));
  for (const c of ["triage_outcome", "ingest_run_id"])
    if (!colSet.has(c)) bad(`review_queue.${c} 不存在（迁移 202610020009 未应用？）`);

  const trig = await queryRows(
    `select tgname from pg_trigger
      where tgname='review_queue_triage_guard' and not tgisinternal`
  );
  if (!trig.length) bad("触发器 review_queue_triage_guard 不存在（迁移 202610020009 未应用？）");

  const idx = await queryRows(
    `select indexname from pg_indexes
      where tablename='review_queue' and indexname='uq_review_queue_triage_per_run'`
  );
  if (!idx.length) bad("唯一部分索引 uq_review_queue_triage_per_run 不存在（分诊幂等无保障）");

  // ② 不变量（触发器之外的持续核对）
  const noReason = Number(await queryValue(
    `select count(*)::int from review_queue
      where triage_outcome is not null and reason_code is null`
  ));
  if (noReason > 0) bad(`分诊行缺 reason_code：${noReason} 行（AUTO/HOLD/REJECT 都是判断，判断必须可解释）`);

  const holdNoReview = Number(await queryValue(
    `select count(*)::int from review_queue
      where triage_outcome='hold' and status <> 'pending' and reviewed_at is null`
  ));
  if (holdNoReview > 0) bad(`hold 行已定案（status<>'pending'）却无 reviewed_at 人审痕迹：${holdNoReview} 行`);

  // ③ 覆盖
  const rows = await queryRows(
    `select coalesce(triage_outcome,'(未分诊·历史行)') as k, count(*)::int as c
       from review_queue group by 1 order by 1`
  );
  for (const r of rows) byTriage.push(`${r.k}=${r.c}`);

  // ④ 研究长尾与 Human Review 解耦
  const hasResearch = Number(
    (await queryRows(
      `select count(*)::int as c from information_schema.tables
        where table_schema='public' and table_name='research_association_candidate'`
    ))[0]?.c || 0
  );
  if (hasResearch > 0) {
    const total = Number(await queryValue(`select count(*)::int from research_association_candidate`));
    const flagged = Number(await queryValue(
      `select count(*)::int from research_association_candidate
        where disposition in ('selected','truth_promotion','narrative_critical','conflict_critical')`
    ));
    const rq = Number(await queryValue(
      `select count(*)::int from review_queue where object_type = 'research_association_candidate'`
    ));
    researchNote = `研究候选=${total} 精选=${flagged} 分诊行=${rq}`;
    // 长尾不得制造分诊行：研究候选里的长尾数应当「不产生」对应 review_queue 行。
    if (rq > flagged) {
      bad(`研究长尾制造了 ${rq - flagged} 条多余 review_queue 行（只有 Selected / Truth-Promotion / Narrative-Critical / Conflict-Critical 才可分诊）`);
    }
  } else {
    researchNote = "研究表未建（跳过研究长尾核对）";
  }
} catch (e) {
  dbNote = "WARN DB 不可达，跳过核对（离线环境可接受）：" + String((e && e.message) || e).slice(0, 140);
}

if (dbNote) console.error(dbNote);
console.log(`REVIEW_TRIAGE checked=structure+invariants+research-longtail db_checked=${dbNote ? 0 : 1}`);
console.log(`  · 分诊分布：${byTriage.join("  ") || "（库中无行）"}`);
if (researchNote) console.log(`  · 研究长尾解耦：${researchNote}`);
console.log("  · 历史行（triage=NULL）不算违规：它们出生于三分机制之前（迁移不回填，冻结不触碰）");
process.exit(failed ? 1 : 0);
