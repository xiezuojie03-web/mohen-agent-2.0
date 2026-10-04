// scripts/db-apply-migration.mjs — 应用**单个** migration 文件到 DATABASE_URL 指定的库。
//
// 为什么需要它（既有脚本的缺口）：
//   `scripts/db-apply.ps1` 是「顺序应用全部 migration」的入口，但历史迁移 `008_cultural_world_objects.sql`
//   不是幂等的（create table 无 if not exists），在已建库上全量重跑会**第一条就失败**（关系已存在），
//   导致后续任何新迁移都无法单独应用。本脚本只应用指定文件，用于「新增迁移上线」这一高频动作。
//
// 前提：被应用的迁移自身必须幂等（if not exists / drop-create / create or replace）——
//       001–007 与 009–010 均满足；008 不满足，故不要用它跑 008。
//
// 用法：node scripts/db-apply-migration.mjs supabase/migrations/<file>.sql
//
// 安全：连接信息来自 .env.local（gitignored）；密码仅进入进程内 PGPASSWORD，不回显、不落盘。
import fs from "node:fs";
import path from "node:path";
import { run, getConnection, PROJECT_ROOT } from "../packages/data-access/src/index.mjs";

const arg = process.argv[2];
if (!arg) {
  console.error("用法：node scripts/db-apply-migration.mjs supabase/migrations/<file>.sql");
  process.exit(2);
}
const p = path.isAbsolute(arg) ? arg : path.join(PROJECT_ROOT, arg);
if (!fs.existsSync(p)) {
  console.error(`找不到迁移文件：${p}`);
  process.exit(1);
}

const conn = getConnection();
console.log(`APPLY ${path.relative(PROJECT_ROOT, p)} -> ${conn.user}@${conn.host}:${conn.port}/${conn.db}（密码不显示）`);
await run(fs.readFileSync(p, "utf8"));
console.log("APPLY OK");
