// 修复工具 · 把本机调试期间产生的污染 / 孤儿 ingest_run 标记为 failed。
//
// 背景（可追溯）：
//  1) ingest 曾因 queryRows(--csv) 把 psql 的 "INSERT 0 0" 命令标签解析成一行伪数据，
//     导致 source_id = "INSERT 0 0" 被写入 run 的 metadata_json.source_record_id（2 条）；
//  2) 首次修复前 ingest 撞唯一约束崩溃，留下 1 条 status='running' 且 finished_at 为空的孤儿 run。
//
// 处置原则（数据生产协议 §7 No destructive cleanup）：**不删除、不覆盖**，只标记 failed 并附说明，保留审计链。
import { queryRows, run as dbRun } from "../../packages/data-access/src/index.mjs";

const bad = await queryRows(
  `select ingest_run_id, status, started_at
     from ingest_runs
    where metadata_json->>'source_record_id' = 'INSERT 0 0'
       or (status = 'running' and finished_at is null)
    order by started_at`
);

console.log("POLLUTED_RUNS=" + bad.length);
for (const r of bad) console.log("  " + r.ingest_run_id + "  status=" + r.status + "  started=" + r.started_at);

for (const r of bad) {
  await dbRun(
    `update ingest_runs
        set status = 'failed',
            finished_at = now(),
            metadata_json = metadata_json || :'m'::jsonb
      where ingest_run_id = :'id'::uuid`,
    {
      id: r.ingest_run_id,
      m: JSON.stringify({
        repair_note:
          "幂等修复前由本机调试产生的非法 source_record_id 或孤儿 run；标记 failed 保留审计，不删除",
        repaired_by: "tools/production/repair-polluted-runs.mjs",
      }),
    }
  );
}

console.log("REPAIRED=" + bad.length);
