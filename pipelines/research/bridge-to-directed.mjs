// pipelines/research/bridge-to-directed.mjs — research_task / 候选 → N01–N06 桥接 + 人工确认闸
//
// 定位：Research Workspace 内的桥接暂存（research_bridge_draft）。本脚本**绝不**向 L0–L7 真值层写任何行。
// 三道子命令：
//   --plan           读取 research_association_candidate，按 disposition 编译 N 作业草稿（human_confirmed=false）
//   --confirm-all    人工复核后开闸：把草稿 human_confirmed 置 true（人工确认闸）
//   --emit-njobs     仅对 human_confirmed=true 的草稿，输出 N 作业交接 JSON（供 unattended-runner 消费）；不写真值
//
// 人工确认闸硬约束：research_bridge_draft.br_brid_no_execute_before_confirm 保证 executed_at 非空前必须已确认。
import fs from "node:fs";
import path from "node:path";
import { run, queryRows } from "../../packages/data-access/src/index.mjs";

const args = process.argv.slice(2);
const has = (k) => args.includes("--" + k);
const ONLY_DISP = args.includes("--only-disposition") ? args[args.indexOf("--only-disposition") + 1] : null;
const RUN_FILTER = args.includes("--run") ? args[args.indexOf("--run") + 1] : null;

function proposedJob(disposition) {
  // truth_promotion：已判定可晋级 → 直接做关系编织/对齐（N05）
  // 其余长尾：先补证抽取（N04），再决定是否晋级
  return disposition === "truth_promotion" ? "N05" : "N04";
}

async function plan() {
  let where = ONLY_DISP ? `WHERE disposition = '${ONLY_DISP}'` : "WHERE 1=1";
  if (RUN_FILTER) where += ` AND run_id = '${RUN_FILTER}'`;
  const cands = await queryRows(`select candidate_id, subject_ref, object_ref, avs_score, disposition, why_interesting, missing_evidence
    from research_association_candidate ${where} order by avs_score desc`);
  let n04 = 0, n05 = 0;
  for (const c of cands) {
    const job = proposedJob(c.disposition);
    job === "N05" ? n05++ : n04++;
    const scope = JSON.stringify({
      subject_ref: c.subject_ref, object_ref: c.object_ref,
      kind: "directed_research", max_sources: 8,
      note: "由 Discovery 候选桥接生成；须 N 作业定向补证后，经 G0–G6 才可有条件晋级",
    });
    await run(
      `insert into research_bridge_draft (candidate_id, subject_ref, object_ref, avs_score, disposition, proposed_job, narrative_gap, research_scope, priority, human_confirmed)
       values (:'cid', :'s', :'o', :'avs', :'disp', :'job', :'gap', :'scope'::jsonb, :'pri', false)
       on conflict (candidate_id) do update set proposed_job=excluded.proposed_job, narrative_gap=excluded.narrative_gap, research_scope=excluded.research_scope, human_confirmed=false, confirmed_at=null, executed_at=null`,
      {
        cid: c.candidate_id, s: c.subject_ref, o: c.object_ref, avs: c.avs_score, disp: c.disposition,
        job, gap: (c.why_interesting || "").slice(0, 200), scope, pri: c.avs_score >= 70 ? 3 : 5,
      }
    );
  }
  console.log(`PLAN drafts=${cands.length} N04=${n04} N05=${n05} (human_confirmed=false，待人工复核开闸)`);
}

async function confirmAll() {
  const r = await run(`update research_bridge_draft set human_confirmed=true, confirmed_by='human-review', confirmed_at=now() where human_confirmed=false`);
  console.log(`CONFIRM_ALL opened gate for pending drafts`);
}

async function emitNjobs() {
  const drafts = await queryRows(`select draft_id, candidate_id, subject_ref, object_ref, proposed_job, avs_score, research_scope
    from research_bridge_draft where human_confirmed=true order by avs_score desc`);
  const njobs = drafts.map((d) => ({
    draft_id: d.draft_id,
    run_via: d.proposed_job === "N05" ? "unattended.relation-weave" : "unattended.candidate-extraction",
    subject_ref: d.subject_ref, object_ref: d.object_ref, avs_score: d.avs_score,
    research_scope: d.research_scope, gate: "G0-G6 必须全过才可有条件 PROMOTE；否则 HOLD",
  }));
  const out = path.join("tasks/results", "BRIDGE-20261004-njobs.json");
  fs.writeFileSync(out, JSON.stringify({ count: njobs.length, jobs: njobs }, null, 2));
  console.log(`EMIT_NJOBS confirmed=${njobs.length} -> ${out}（仅供 unattended-runner 消费；本脚本不写真值层）`);
}

async function stats() {
  const rows = await queryRows(`select proposed_job, human_confirmed, count(*) c from research_bridge_draft group by proposed_job, human_confirmed order by proposed_job, human_confirmed`);
  console.log("BRIDGE DRAFT STATS:");
  for (const r of rows) console.log(`  ${r.proposed_job} human_confirmed=${r.human_confirmed} = ${r.c}`);
}

async function main() {
  if (has("plan")) await plan();
  else if (has("confirm-all")) await confirmAll();
  else if (has("emit-njobs")) await emitNjobs();
  else if (has("stats")) await stats();
  else { console.log("usage: --plan [--only-disposition truth_promotion] | --confirm-all | --emit-njobs | --stats"); }
}
main().catch((e) => { console.error(e); process.exit(1); });
