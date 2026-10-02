// N00 · 结构探针（只读）
// 目的：在写入任何数据前，确认目标表的真实列结构，避免臆造列名。
// 安全：只查 information_schema，不写入。
import { queryRows } from "../../packages/data-access/src/index.mjs";

const targets = [
  "ingest_runs",
  "source_records",
  "evidence",
  "evidence_fragments",
  "claims",
  "claim_evidence",
  "discovery_candidates",
  "cultural_meaning_candidates",
  "review_queue",
  "evidence_gate_audit",
  "entities",
  "historical_features",
];

for (const t of targets) {
  const cols = await queryRows(
    "select column_name, data_type, is_nullable, column_default " +
      "from information_schema.columns " +
      "where table_schema='public' and table_name='" + t + "' " +
      "order by ordinal_position"
  );
  console.log("=== " + t + " (" + cols.length + " cols) ===");
  console.log(cols.map((c) => c.column_name + ":" + c.data_type).join(", "));
  console.log("");
}
