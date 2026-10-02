// N00 · 批次核验（只读）
// 目的：确认 S1 定向取回本轮真实入库的 Source / Evidence，供晨报引用，绝不写入。
import { queryRows } from "../../packages/data-access/src/index.mjs";

const prov = await queryRows(
  "select provider, count(*)::text as n from source_records group by provider order by count(*) desc"
);
console.log("--- providers ---");
for (const p of prov) console.log("  " + p.provider + " = " + p.n);

const recent = await queryRows(
  "select provider, title, source_uri, checksum from source_records " +
    "where retrieved_at > now() - interval '45 minutes' order by retrieved_at"
);
console.log("--- recent source_records (45min) = " + recent.length + " ---");
for (const r of recent) {
  console.log("  [" + r.provider + "] " + String(r.title || "").slice(0, 70));
  console.log("      uri=" + String(r.source_uri || "").slice(0, 100));
}

const ev = await queryRows(
  "select evidence_type, locator, quote_text from evidence " +
    "where created_at > now() - interval '45 minutes' order by created_at"
);
console.log("--- recent evidence (45min) = " + ev.length + " ---");
for (const e of ev) {
  console.log("  type=" + e.evidence_type + " | locator=" + String(e.locator || "").slice(0, 60));
}

const totals = await queryRows(
  "select " +
    "(select count(*)::text from source_records) as sources, " +
    "(select count(*)::text from evidence) as evidences, " +
    "(select count(*)::text from review_queue) as review"
);
console.log("--- totals now ---");
console.log("  source_records=" + totals[0].sources + " evidence=" + totals[0].evidences + " review_queue=" + totals[0].review);
