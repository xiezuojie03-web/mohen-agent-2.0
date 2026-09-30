// N00 · 连接探针（只读）
// 目的：确认 Truth Store（PostgreSQL）可达，并盘点现有表与规模，为夜间批次提供基线。
// 安全：本脚本**只执行 SELECT**，不含任何 INSERT/UPDATE/DDL。
import { queryRows, queryValue } from "../../packages/data-access/src/index.mjs";

const db = await queryValue("select current_database()");
const usr = await queryValue("select current_user");
console.log("CONNECTED db=" + db + " user=" + usr);

const tables = await queryRows(
  "select table_name from information_schema.tables where table_schema='public' order by table_name"
);
console.log("TABLE_COUNT=" + tables.length);
console.log("TABLES=" + tables.map((t) => t.table_name).join(","));

const targets = [
  "source_records",
  "evidence",
  "entities",
  "historical_features",
  "historical_feature_anchors",
  "relations",
  "historical_spatial_relations",
  "historical_change_records",
  "cultural_events",
  "cultural_relation_claims",
  "cultural_present_connections",
  "visual_assets",
  "visual_entity_links",
];

console.log("--- ROW COUNTS ---");
for (const t of targets) {
  if (!tables.some((x) => x.table_name === t)) {
    console.log("COUNT " + t + " = TABLE_MISSING");
    continue;
  }
  const c = await queryValue("select count(*) from public." + t);
  console.log("COUNT " + t + " = " + c);
}
