#!/usr/bin/env node
/**
 * P1 数据库结构盘点（只读）
 * 专项：MOHEN-ENGINEERING-DATA-UNIFICATION-01
 * 用途：对本地 mohen_dev 与云端 mohen-cloud 提取完整数据库结构清单（catalog 只读查询）。
 * 输出：DATABASE_SCHEMA_LOCAL.json / DATABASE_SCHEMA_CLOUD.json（与脚本同目录）
 * 安全：仅执行 SELECT / catalog 查询，不写入任何数据。
 */
import { Client } from './node_modules-pg-shim.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const EXCLUDE_SCHEMAS = ['pg_catalog', 'information_schema', 'pg_toast', '_analytics', 'supabase_functions', 'supabase_security', 'graphql', 'graphql_public', 'net', 'pgsodium', 'vault', 'realtime', 'cron', 'auth', 'storage', 'extensions', 'supabase_migrations'];
const BUSINESS_SCHEMAS = ['public', 'studio', 'source', 'evidence', 'world', 'meaning', 'read_model', 'control', 'publication'];

function localUrl() {
  const env = readFileSync('.env.local', 'utf8');
  const m = env.match(/^DATABASE_URL=(.+)$/m);
  return m[1].trim().replace(/^['"]|['"]$/g, '');
}
function cloudUrl() {
  return readFileSync('.secrets/supabase-db-url.txt', 'utf8').trim();
}

async function inventory(client, label) {
  const q = async (sql, params) => (await client.query(sql, params)).rows;
  const out = { label, extracted_at: new Date().toISOString(), server: {}, objects: {} };

  out.server = (await q(`select current_database() as db, current_setting('server_version') as version, current_user as connected_as`))[0];

  // 1. 业务 schema（含 storage/auth/migrations 特殊 schema 单独记录）
  out.objects.schemas = (await q(`
    select nspname as name
    from pg_namespace
    where nspname not in (${[...EXCLUDE_SCHEMAS, 'pg_toast_temp_1', 'pg_temp_1'].map(s => `'${s}'`).join(',')})
    order by nspname`)).map(r => r.name);

  // 2. 表 + 列
  out.objects.columns = await q(`
    select n.nspname as schema, c.relname as table, a.attname as column,
           format_type(a.atttypid, a.atttypmod) as type, a.attnotnull as not_null,
           pg_get_expr(d.adbin, d.adrelid) as default_expr,
           a.attnum as ordinal
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
    where c.relkind in ('r','p')
      and n.nspname = any($1::text[])
    order by n.nspname, c.relname, a.attnum`, [out.objects.schemas]);

  out.objects.tables = await q(`
    select n.nspname as schema, c.relname as table, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r','p') and n.nspname = any($1::text[])
    order by 1,2`, [out.objects.schemas]);

  // 3. 约束（PK/FK/UNIQUE/CHECK）
  out.objects.constraints = await q(`
    select n.nspname as schema, cl.relname as table, con.conname as name,
           case con.contype when 'p' then 'PRIMARY KEY' when 'f' then 'FOREIGN KEY' when 'u' then 'UNIQUE' when 'c' then 'CHECK' when 'x' then 'EXCLUDE' else con.contype::text end as type,
           pg_get_constraintdef(con.oid) as definition
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid
    join pg_namespace n on n.oid = cl.relnamespace
    where n.nspname = any($1::text[])
    order by 1,2,3`, [out.objects.schemas]);

  // 4. 索引
  out.objects.indexes = await q(`
    select n.nspname as schema, t.relname as table, i.relname as name,
           pg_get_indexdef(i.oid) as definition
    from pg_index x
    join pg_class i on i.oid = x.indexrelid
    join pg_class t on t.oid = x.indrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = any($1::text[])
    order by 1,2,3`, [out.objects.schemas]);

  // 5. RLS 策略
  out.objects.policies = await q(`
    select schemaname as schema, tablename as table, policyname as name,
           cmd as command, roles, qual, with_check
    from pg_policies
    where schemaname = any($1::text[])
    order by 1,2,3`, [out.objects.schemas]);

  // 6. 触发器
  out.objects.triggers = await q(`
    select n.nspname as schema, c.relname as table, t.tgname as name,
           pg_get_triggerdef(t.oid) as definition
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal and n.nspname = any($1::text[])
    order by 1,2,3`, [out.objects.schemas]);

  // 7. 函数（业务 schema 内）
  out.objects.functions = await q(`
    select n.nspname as schema, p.proname as name,
           pg_get_function_identity_arguments(p.oid) as args,
           pg_get_function_result(p.oid) as returns,
           case p.prokind when 'f' then 'function' when 'p' then 'procedure' when 'a' then 'aggregate' when 'w' then 'window' end as kind,
           l.lanname as language
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_language l on l.oid = p.prolang
    where n.nspname = any($1::text[])
    order by 1,2`, [out.objects.schemas]);

  // 8. 视图
  out.objects.views = await q(`
    select n.nspname as schema, c.relname as name,
           case c.relkind when 'v' then 'view' when 'm' then 'matview' end as kind,
           pg_get_viewdef(c.oid) as definition
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('v','m') and n.nspname = any($1::text[])
    order by 1,2`, [out.objects.schemas]);

  // 9. 序列
  out.objects.sequences = await q(`
    select n.nspname as schema, c.relname as name
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'S' and n.nspname = any($1::text[])
    order by 1,2`, [out.objects.schemas]);

  // 10. 枚举
  out.objects.enums = await q(`
    select n.nspname as schema, t.typname as name,
           array_agg(e.enumlabel order by e.enumsortorder) as labels
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = any($1::text[])
    group by 1,2 order by 1,2`, [out.objects.schemas]);

  // 11. 扩展
  out.objects.extensions = await q(`select extname as name, extversion as version from pg_extension order by 1`);

  // 12. 迁移版本
  try {
    out.migrations = (await q(`select version from supabase_migrations.schema_migrations order by version`)).map(r => r.version);
  } catch { out.migrations = ['SCHEMA_MIGRATIONS_TABLE_NOT_FOUND']; }

  // 13. Storage 桶（Supabase）
  try {
    out.storage_buckets = await q(`select id, name, public, file_size_limit, allowed_mime_types from storage.buckets order by name`);
    out.storage_policies = await q(`select schemaname, tablename, policyname, cmd, roles, qual, with_check from pg_policies where schemaname='storage' order by tablename, policyname`);
  } catch (e) { out.storage_buckets = [{ error: e.message }]; }

  // 14. 角色
  out.objects.roles = await q(`
    select rolname as name, rolsuper, rolbypassrls, rolcanlogin,
           (select array_agg(m.rolname) from pg_auth_members am join pg_roles m on m.oid = am.roleid where am.member = r.oid) as memberships
    from pg_roles r
    where rolname not like 'pg\\_%' and rolname != 'postgres'
    order by 1`);

  // 15. 角色对业务 schema 的表级授权
  out.objects.table_grants = await q(`
    select table_schema, table_name, grantee, privilege_type
    from information_schema.role_table_grants
    where table_schema = any($1::text[]) and grantee not in ('postgres','PUBLIC')
    order by 1,2,3,4`, [out.objects.schemas]);

  // 16. 行计数（仅业务表，用于 P2 前置参考，count 逐表）
  out.row_counts = {};
  for (const s of out.objects.tables) {
    const key = `${s.schema}.${s.table}`;
    try { out.row_counts[key] = (await q(`select count(*)::int as c from "${s.schema}"."${s.table}"`))[0].c; }
    catch (e) { out.row_counts[key] = `ERR:${e.message}`; }
  }
  return out;
}

async function main() {
  const target = process.argv[2];
  const url = target === 'cloud' ? cloudUrl() : localUrl();
  const client = new Client({ connectionString: url, ssl: target === 'cloud' ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  const result = await inventory(client, target);
  await client.end();
  const file = `tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/DATABASE_SCHEMA_${target === 'cloud' ? 'CLOUD' : 'LOCAL'}.json`;
  writeFileSync(file, JSON.stringify(result, null, 1), 'utf8');
  console.log(`[${target}] schemas=${result.objects.schemas.length} tables=${result.objects.tables.length} columns=${result.objects.columns.length} constraints=${result.objects.constraints.length} policies=${result.objects.policies.length} triggers=${result.objects.triggers.length} functions=${result.objects.functions.length} migrations=${Array.isArray(result.migrations) ? result.migrations.length : result.migrations} -> ${file}`);
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
