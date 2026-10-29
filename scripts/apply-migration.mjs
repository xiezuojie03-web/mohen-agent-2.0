// scripts/apply-migration.mjs — 把单个 migration SQL 应用到本机开发库
// 用法：node scripts/apply-migration.mjs supabase/migrations/<文件名>.sql
import fs from "node:fs";
import { run } from "../packages/data-access/src/index.mjs";

const rel = process.argv[2];
if (!rel) {
  console.error("用法：node scripts/apply-migration.mjs <migration 文件相对路径>");
  process.exit(1);
}
const sql = fs.readFileSync(rel, "utf8");
await run(sql);
console.log(`[migration] 已应用 ${rel}`);
