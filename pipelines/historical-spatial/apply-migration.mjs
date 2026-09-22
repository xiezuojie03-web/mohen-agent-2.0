// pipelines/historical-spatial/apply-migration.mjs
//
// 只读安全的最小 migration 应用器：把一个 .sql 文件按原样送进本机 PG。
//
// 为什么需要它：`scripts/db-apply.ps1` 会**顺序重跑全部** migration（001 起用裸
// `create type` / `create table`，不可重复执行），因此只适合空库 bootstrap。
// TASK-0010 需要在已有库上单独追加 007，且必须复用 packages/data-access 的凭据路径
// （密码只进 PGPASSWORD，不落盘、不进日志）。
//
// 用法：node pipelines/historical-spatial/apply-migration.mjs supabase/migrations/xxx.sql

import fs from "node:fs";
import path from "node:path";
import { run, queryRows, PROJECT_ROOT } from "../../packages/data-access/src/index.mjs";

const rel = process.argv[2];
if (!rel) {
  console.error("usage: node pipelines/historical-spatial/apply-migration.mjs <file.sql>");
  process.exit(2);
}
const file = path.isAbsolute(rel) ? rel : path.resolve(PROJECT_ROOT, rel);
if (!fs.existsSync(file)) {
  console.error("migration file not found: " + file);
  process.exit(2);
}

const sql = fs.readFileSync(file, "utf8");
await run(sql);

const names = [
  "historical_spatial_slices",
  "historical_features",
  "historical_feature_anchors",
  "historical_change_records",
  "historical_spatial_relations",
];
const tables = await queryRows(
  "select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name"
);
const have = new Set(tables.map((t) => t.table_name));
const enums = await queryRows(
  "select t.typname from pg_type t join pg_enum e on e.enumtypid=t.oid group by t.typname order by t.typname"
);

process.stdout.write(
  JSON.stringify(
    {
      applied: path.relative(PROJECT_ROOT, file).replace(/\\/g, "/"),
      bytes: sql.length,
      tables_present: names.filter((n) => have.has(n)),
      tables_missing: names.filter((n) => !have.has(n)),
      enums_present: enums.map((e) => e.typname),
    },
    null,
    2
  ) + "\n"
);
