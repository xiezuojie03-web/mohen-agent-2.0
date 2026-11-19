#!/usr/bin/env node
/**
 * P2 双端业务数据完整盘点（只读）
 * 专项：MOHEN-ENGINEERING-DATA-UNIFICATION-01
 * 用途：逐表提取主键集合与整行摘要（md5），双端比对生成分类清单。
 * 输出：LOCAL_CLOUD_DATABASE_INVENTORY.json / LOCAL_CLOUD_DATABASE_DIFF.json
 * 安全：仅 SELECT，不写入任何数据。
 */
import { Client } from './node_modules-pg-shim.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const dir = 'tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/';
const IGNORE_SCHEMAS = new Set(['pg_temp_38', 'pg_temp_43', 'pg_temp_92', 'pg_toast_temp_38', 'pg_toast_temp_43', 'pg_toast_temp_92', 'pgbouncer', 'mab_backup']);

function localUrl() {
  return readFileSync('.env.local', 'utf8').match(/^DATABASE_URL=(.+)$/m)[1].trim().replace(/^['"]|['"]$/g, '');
}
function cloudUrl() { return readFileSync('.secrets/supabase-db-url.txt', 'utf8').trim(); }

async function extract(client, side) {
  const q = async (sql, params) => (await client.query(sql, params)).rows;
  const tables = (await q(`
    select n.nspname as schema, c.relname as table
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r','p') and n.nspname not in ('pg_catalog','information_schema','pg_toast','_analytics','supabase_functions','supabase_security','graphql','graphql_public','net','pgsodium','vault','realtime','cron','auth','storage','extensions','supabase_migrations')
    order by 1,2`)).filter(t => !IGNORE_SCHEMAS.has(t.schema));

  const result = {};
  for (const t of tables) {
    const full = `${t.schema}.${t.table}`;
    // 主键列
    const pk = (await q(`
      select a.attname from pg_index x
      join pg_class c on c.oid = x.indrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attnum = any(x.indkey)
      where x.indisprimary and n.nspname=$1 and c.relname=$2
      order by a.attnum`, [t.schema, t.table])).map(r => r.attname);
    if (pk.length === 0) { result[full] = { error: 'NO_PRIMARY_KEY' }; continue; }
    const cols = (await q(`
      select a.attname from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname=$1 and c.relname=$2 and a.attnum>0 and not a.attisdropped
      order by a.attnum`, [t.schema, t.table])).map(r => r.attname);
    // 提取 PK + 整行摘要（排除 volatile 列：无）
    try {
      const rows = await q(`
        select ${pk.map(c => `"${c}"::text`).join(` || '|' || `)} as pk_val, md5(to_jsonb(t)::text) as row_digest
        from "${t.schema}"."${t.table}" t`);
      result[full] = {
        pk_columns: pk,
        columns: cols,
        count: rows.length,
        rows: rows.map(r => ({ pk: [r.pk_val], digest: r.row_digest })),
      };
    } catch (e) {
      result[full] = { error: `EXTRACT_FAIL:${e.message}` };
    }
  }
  return result;
}

function classify(localData, cloudData) {
  const inventory = {};
  const diff = {};
  for (const full of new Set([...Object.keys(localData), ...Object.keys(cloudData)])) {
    const L = localData[full], C = cloudData[full];
    const inv = {
      pk_columns: L?.pk_columns || C?.pk_columns,
      column_count: L?.columns?.length ?? C?.columns?.length,
      local_rows: L?.count ?? (L?.error ? `ERR` : 0),
      cloud_rows: C?.count ?? (C?.error ? `ERR` : 0),
    };
    if (!L || L.error || !C || C.error) {
      inv.classification = !L ? 'CLOUD_ONLY_TABLE' : !C ? 'LOCAL_ONLY_TABLE' : 'EXTRACT_ERROR';
      if (L?.error) inv.local_error = L.error;
      if (C?.error) inv.cloud_error = C.error;
      if (L?.count) inv.local_rows_present = true;
      inventory[full] = inv;
      continue;
    }
    const lmap = new Map(L.rows.map(r => [r.pk.join('|'), r.digest]));
    const cmap = new Map(C.rows.map(r => [r.pk.join('|'), r.digest]));
    const localOnly = [], cloudOnly = [], sameIdDiffContent = [];
    let identical = 0;
    for (const [pk, d] of lmap) {
      if (!cmap.has(pk)) localOnly.push(pk);
      else if (cmap.get(pk) !== d) sameIdDiffContent.push(pk);
      else identical++;
    }
    for (const pk of cmap.keys()) if (!lmap.has(pk)) cloudOnly.push(pk);
    inv.identical = identical;
    inv.local_only_pks = localOnly.length;
    inv.cloud_only_pks = cloudOnly.length;
    inv.same_id_different_content = sameIdDiffContent.length;
    inventory[full] = inv;
    if (localOnly.length || cloudOnly.length || sameIdDiffContent.length || identical !== lmap.size || identical !== cmap.size) {
      diff[full] = {
        local_only_pks: localOnly.slice(0, 2000),
        cloud_only_pks: cloudOnly.slice(0, 2000),
        same_id_different_content_pks: sameIdDiffContent.slice(0, 500),
      };
    }
  }
  return { inventory, diff };
}

async function main() {
  const side = process.argv[2]; // 'local' | 'cloud' | 'compare'
  if (side === 'local' || side === 'cloud') {
    const client = new Client({ connectionString: side === 'cloud' ? cloudUrl() : localUrl(), ssl: side === 'cloud' ? { rejectUnauthorized: false } : undefined });
    await client.connect();
    await client.query("set time zone 'UTC'");
    const data = await extract(client, side);
    await client.end();
    writeFileSync(`${dir}p2_extract_${side}.json`, JSON.stringify(data), 'utf8');
    const counts = Object.entries(data).map(([t, d]) => `${t}=${d.count ?? d.error}`).join('\n');
    console.log(counts);
    return;
  }
  // compare
  const localData = JSON.parse(readFileSync(`${dir}p2_extract_local.json`, 'utf8'));
  const cloudData = JSON.parse(readFileSync(`${dir}p2_extract_cloud.json`, 'utf8'));
  const { inventory, diff } = classify(localData, cloudData);
  writeFileSync(`${dir}LOCAL_CLOUD_DATABASE_INVENTORY.json`, JSON.stringify({
    specialty: 'MOHEN-ENGINEERING-DATA-UNIFICATION-01', stage: 'P2',
    generated_at: new Date().toISOString(), tables: inventory,
  }, null, 1), 'utf8');
  writeFileSync(`${dir}LOCAL_CLOUD_DATABASE_DIFF.json`, JSON.stringify({
    specialty: 'MOHEN-ENGINEERING-DATA-UNIFICATION-01', stage: 'P2/P3',
    generated_at: new Date().toISOString(), tables: diff,
  }, null, 1), 'utf8');
  const summary = Object.entries(inventory)
    .filter(([, v]) => v.local_only_pks || v.cloud_only_pks || v.same_id_different_content)
    .map(([t, v]) => `${t}: LO=${v.local_only_pks} CO=${v.cloud_only_pks} DIFF=${v.same_id_different_content} IDENT=${v.identical}`);
  console.log(summary.join('\n'));
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
