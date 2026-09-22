// scripts/audit-readonly-invariants.mjs — 只读不变量快照（不写库、不迁移）。
//
// 用途：任何「体验/前端/表现层」任务在报告里声明
//   published 不变 / orphan audit 不增加 / 无 DB 写入
// 时，用它取证：一条 SELECT 都不写，输出与 TASK-0013 同口径的计数。
//
// 用法：node scripts/audit-readonly-invariants.mjs

import { queryRows } from "../packages/data-access/src/index.mjs";

const one = async (sql) => {
  const rows = await queryRows(sql);
  return rows[0] ? Object.values(rows[0])[0] : null;
};

const snap = {
  source_records: await one("select count(*)::text c from source_records"),
  evidence: await one("select count(*)::text c from evidence"),
  evidence_gate_audit: await one("select count(*)::text c from evidence_gate_audit"),
  claims: await one("select count(*)::text c from claims"),
  claims_published: await one(
    "select count(*)::text c from claims where status::text in ('verified','published')"
  ),
  relations: await one("select count(*)::text c from relations"),
  orphan_relation_audit: await one(
    `select count(*)::text c from evidence_gate_audit a
      where a.object_type='relation'
        and not exists (select 1 from relations r where r.relation_id::text=a.object_id)`
  ),
};

console.log(JSON.stringify(snap, null, 1));
