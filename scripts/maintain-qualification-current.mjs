// scripts/maintain-qualification-current.mjs
//
// control.qualification_current 是「当前有效资格」派生索引，不是不可变审计表
// （审计正本在 control.gate_audits，保留不动）。资格按 valid_until 自然过期后，
// 过期行不再授予任何资格（所有读者都要求 valid_until > now()），但滞留行会让
// 「无过期 PASS 仍被当作有效资格」的卫生检查（tools/verify-local-execution-env.mjs
// 第4项 no_formal_hold_bypass）永远无法通过。
//
// 本工具只做一件事：删除 valid_until <= now() 的自然过期行；任何未过期行、
// 审计表、候选表一律不碰。目标限定隔离库（loopback），拒绝任何非回环地址。
import { getConnection, getNodePgPool } from "../packages/data-access/src/index.mjs";

const dbUrl = String(process.env.DATABASE_URL || "");
if (!/^postgresql:\/\/[^@]*@(127\.0\.0\.1|localhost)(:\d+)?\//.test(dbUrl)) {
  console.error("MAINTAIN_REFUSED_NON_LOOPBACK_DATABASE");
  process.exit(1);
}
const pool = getNodePgPool();
const before = await pool.query("select count(*)::int as n from control.qualification_current where valid_until <= now()");
const removed = await pool.query(
  `delete from control.qualification_current where valid_until <= now() returning gate_code, gate_audit_id`);
const after = await pool.query("select count(*)::int as n from control.qualification_current");
console.log(JSON.stringify({
  action: "retire_naturally_expired_qualification_rows",
  expired_before: before.rows[0].n,
  removed: removed.rows.length,
  remaining_total: after.rows[0].n,
  removed_sample: removed.rows.slice(0, 5).map(r => `${r.gate_code}:${String(r.gate_audit_id).slice(0, 8)}`),
  note: "gate_audits 历史未动；仅清理派生 current 索引中的自然过期行",
}, null, 1));
await pool.end().catch(() => {});
