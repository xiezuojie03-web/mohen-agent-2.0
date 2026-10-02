// 清理：移除本轮重跑产生的**重复 evidence**（严格按 source_id + locator + 引文 比对）。
//
// 背景：retrieve-s1-jinze.mjs 不具备幂等性，重跑会对已存在的 locator 再插一份 evidence。
//       本轮（2026-09-29）新建 12 条，经查全部为 2026-09-22 既有行的重复。
//
// 原则：
//   - 只删「本轮新建 且 存在更早孪生行」的 evidence，绝不触碰历史既有行（含历史遗留重复，另行报告）。
//   - 先统计子表引用再删，避免外键失败；全过程打印计数，可核对。
import { queryRows, run as dbRun } from "../../packages/data-access/src/index.mjs";

const WINDOW = "90 minutes";

const ids = await queryRows(
  `select nw.evidence_id::text as id
     from evidence nw
    where nw.created_at > now() - interval '${WINDOW}'
      and exists (
        select 1 from evidence old
         where old.source_id = nw.source_id
           and old.locator is not distinct from nw.locator
           and coalesce(old.quote_text, '') = coalesce(nw.quote_text, '')
           and old.created_at <= now() - interval '${WINDOW}'
      )`
);

const before = await queryRows("select count(*)::text as n from evidence");
console.log("evidence_before = " + before[0].n);
console.log("DUPLICATES_TO_REMOVE = " + ids.length);

if (!ids.length) {
  console.log("NOTHING_TO_DO");
  process.exit(0);
}

const inList = ids.map((r) => `'${r.id}'`).join(",");

const ce = await queryRows(`select count(*)::text as n from claim_evidence where evidence_id in (${inList})`);
const ef = await queryRows(`select count(*)::text as n from evidence_fragments where evidence_id in (${inList})`);
console.log("child_refs: claim_evidence=" + ce[0].n + " evidence_fragments=" + ef[0].n);

if (Number(ce[0].n) > 0) await dbRun(`delete from claim_evidence where evidence_id in (${inList})`);
if (Number(ef[0].n) > 0) await dbRun(`delete from evidence_fragments where evidence_id in (${inList})`);
await dbRun(`delete from evidence where evidence_id in (${inList})`);

const after = await queryRows("select count(*)::text as n from evidence");
console.log("evidence_after = " + after[0].n);
console.log("REMOVED = " + (Number(before[0].n) - Number(after[0].n)));
