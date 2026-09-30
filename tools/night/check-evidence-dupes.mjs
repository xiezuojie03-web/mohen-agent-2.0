// N00 · 重复证据核查（只读）
// 背景：S1 取回器重跑报 source_records_inserted=20，但 source_records 总数未变（212），
//       而 evidence 由 185 → 197。怀疑本次重跑对已存在 locator 又插了一份 evidence。
// 安全：只查询，不修改。
import { queryRows } from "../../packages/data-access/src/index.mjs";

const dup = await queryRows(
  `select locator, count(*)::text as n,
          min(created_at)::text as first_created,
          max(created_at)::text as last_created
     from evidence
    group by locator
   having count(*) > 1
    order by count(*) desc
    limit 25`
);
console.log("--- locator 重复组 = " + dup.length + " ---");
for (const d of dup) {
  console.log("  n=" + d.n + "  first=" + d.first_created + "  last=" + d.last_created);
  console.log("     " + String(d.locator || "").slice(0, 110));
}

const recentDup = await queryRows(
  `select count(*)::text as n
     from evidence nw
    where nw.created_at > now() - interval '60 minutes'
      and exists (
        select 1 from evidence old
         where old.locator is not distinct from nw.locator
           and old.created_at <= now() - interval '60 minutes'
      )`
);
console.log("--- 本轮(60min)新建但 locator 早已存在的 evidence 数 = " + recentDup[0].n + " ---");

const recentTotal = await queryRows(
  `select count(*)::text as n from evidence where created_at > now() - interval '60 minutes'`
);
console.log("--- 本轮(60min)新建 evidence 总数 = " + recentTotal[0].n + " ---");
