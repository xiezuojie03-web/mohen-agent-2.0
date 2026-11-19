#!/usr/bin/env node
/**
 * P4 Phase B：本地→云端全量业务数据直迁（按Owner简化指令）
 * 方法：FK拓扑排序，逐表 INSERT ON CONFLICT DO NOTHING；users 按PREREQ-2裁决降权插入；
 *       共有行冲突（权利27组/形差异19行）随后Phase C受控UPDATE；云端独有数据结构性保留。
 */
import { Client } from './node_modules-pg-shim.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const local = new Client({ connectionString: readFileSync('.env.local', 'utf8').match(/DATABASE_URL=(.+)$/m)[1].trim() });
const cloud = new Client({ connectionString: readFileSync('.secrets/supabase-db-url.txt', 'utf8').trim(), ssl: { rejectUnauthorized: false } });
await local.connect(); await cloud.connect();
await local.query("set time zone 'UTC'"); await cloud.query("set time zone 'UTC'");

const BIZ = ['public', 'source', 'control', 'studio', 'publication', 'read_model', 'world', 'meaning', 'evidence'];
const q = (c, sql, p) => c.query(sql, p).then(r => r.rows);

// 1. 全部业务表 + FK拓扑排序
const tabs = await q(local, `select n.nspname as s, c.relname as t from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and n.nspname = any($1) order by 1,2`, [BIZ]);
const fks = await q(local, `select cl.relname as t, confrelid::regclass::text as ref from pg_constraint co join pg_class cl on cl.oid=co.conrelid join pg_namespace n on n.oid=cl.relnamespace where co.contype='f' and n.nspname=any($1)`, [BIZ]);
const name = r => `${r.s}.${r.t}`;
const tset = new Set(tabs.map(name));
const deps = new Map(tabs.map(r => [name(r), new Set()]));
for (const f of fks) {
  const child = f.t; const parent = f.ref;
  // f.t 只有表名；找 schema
  for (const k of tset) { if (k.endsWith('.' + child) && tset.has(parent)) deps.get(k).add(parent); }
}
const order = [], seen = new Set();
function visit(k, stack) {
  if (seen.has(k) || stack.has(k)) return;
  stack.add(k);
  for (const d of deps.get(k) || []) visit(d, stack);
  stack.delete(k); seen.add(k); order.push(k);
}
for (const k of tset) visit(k, new Set());
console.log('table order length:', order.length);

// 2. 云端列类型
const cloudCols = new Map();
for (const [s, t] of order.map(x => x.split('.'))) {
  const cols = await q(cloud, `select column_name, data_type from information_schema.columns where table_schema=$1 and table_name=$2 order by ordinal_position`, [s, t]);
  if (cols.length) cloudCols.set(`${s}.${t}`, cols);
}

const report = [];
for (const full of order) {
  if (!cloudCols.has(full)) { report.push({ table: full, status: 'CLOUD_TABLE_MISSING' }); continue; }
  const cc = cloudCols.get(full);
  const colNames = cc.map(c => c.column_name);
  const jsonCols = new Set(cc.filter(c => /json|array/.test(c.data_type) === false && /json/.test(c.data_type)).map(c => c.column_name));
  const arrayCols = new Set(cc.filter(c => /array/.test(c.data_type) || c.data_type === 'ARRAY').map(c => c.column_name));
  let rows;
  try { rows = await q(local, `select * from "${full.split('.')[0]}"."${full.split('.')[1]}"`); }
  catch (e) { report.push({ table: full, status: 'LOCAL_READ_FAIL', error: e.message.slice(0, 80) }); continue; }
  if (full === 'public.users') {
    rows = rows.filter(u => u.user_id !== '270bcecf595dcfbd00000000fa5e2f2f').map(u => ({
      ...u, password_hash: '!', status: 'disabled', roles: ['member'], session_not_before: null,
    }));
  }
  let inserted = 0, skipped = 0, errors = 0;
  for (const r of rows) {
    const vals = colNames.map(c => (jsonCols.has(c) && r[c] != null) ? JSON.stringify(r[c]) : r[c]);
    try {
      const res = await cloud.query(
        `insert into "${full.split('.')[0]}"."${full.split('.')[1]}"(${colNames.map(c => `"${c}"`).join(',')}) values (${colNames.map((_, i) => `$${i + 1}`).join(',')}) on conflict do nothing`,
        vals);
      inserted += res.rowCount; skipped += (res.rowCount === 0 ? 1 : 0);
    } catch (e) { errors++; if (errors <= 2) console.log('  ERR', full, e.message.slice(0, 120)); }
  }
  report.push({ table: full, local_rows: rows.length, inserted, existing: skipped, errors });
  if (inserted || errors) console.log(`${full}: local=${rows.length} +${inserted} (skip ${skipped}, err ${errors})`);
}
writeFileSync('tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/P4_PHASE_B_MIGRATION_LOG.json', JSON.stringify({ performed_at: new Date().toISOString(), report }, null, 1), 'utf8');
console.log('PHASE B DONE. tables:', report.length, '| with errors:', report.filter(r => r.errors > 0).length);
await local.end(); await cloud.end();
