// scripts/apply-rls.mjs — 把 supabase/rls-draft/001 应用到目标库（默认本机开发库）
//
// 安全设计：
//   1. 执行前查 current_user 是否为 superuser 或目标表 owner；
//      若不是，RLS 启用后可能令该角色读写被拒，直接中止，避免锁死应用层。
//   2. 执行后验证 read_model 仍可读（消费层不因 RLS 中断）。
// 用法：node scripts/apply-rls.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { queryValue, run } from "../packages/data-access/src/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_PATH = path.resolve(__dirname, "..", "supabase", "rls-draft", "001_rls_strategy_draft.sql");

const currentUser = await queryValue("select current_user");
const isSuper = await queryValue("select rolsuper::text from pg_roles where rolname = current_user");
const tableOwner = await queryValue(
  "select tableowner from pg_tables where schemaname = 'read_model' and tablename = 'world_projections'"
);
console.log(`[RLS] current_user = ${currentUser} | superuser = ${isSuper} | world_projections owner = ${tableOwner}`);

if (isSuper !== "true" && tableOwner !== currentUser) {
  console.error("[RLS] 中止：当前连接角色既非 superuser 也非表 owner，启用 RLS 可能锁死应用层读写。");
  process.exit(1);
}

const before = await queryValue("select count(*) from read_model.world_projections");
console.log(`[RLS] 执行前 read_model.world_projections 行数 = ${before}`);

const sql = fs.readFileSync(SQL_PATH, "utf8");
await run(sql);
console.log("[RLS] 已执行 ENABLE ROW LEVEL SECURITY + CREATE POLICY");

const after = await queryValue("select count(*) from read_model.world_projections");
console.log(`[RLS] 执行后 read_model.world_projections 行数 = ${after}`);
console.log(after === before ? "[RLS] 验证通过：消费层仍可读。" : "[RLS] 警告：行数变化，请人工核对。");
