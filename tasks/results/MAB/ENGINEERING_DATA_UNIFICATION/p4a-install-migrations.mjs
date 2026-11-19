#!/usr/bin/env node
/**
 * P4 Phase A：云端结构补装（按Owner简化指令执行）
 * 逐个执行24个未装迁移文件，容错执行（对象已存在等错误记录跳过），登记迁移账本。
 */
import { Client } from './node_modules-pg-shim.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const dir = 'tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/';
const diff = JSON.parse(readFileSync(dir + 'DATABASE_MIGRATION_VERSION_DIFF.json', 'utf8'));
// 提取24个迁移文件名（从not_installed清单解析出仓库文件名）
const notInstalled = diff.repo_migrations_not_installed_on_cloud;
const files = notInstalled.map(s => s.match(/\d{14}_[a-z0-9_]+(?=[（(])/)?.[0] || s.split('（')[0].trim()).filter(f => /^\d{14}_/.test(f));
console.log('to install:', files.length);

const cloud = new Client({ connectionString: readFileSync('.secrets/supabase-db-url.txt', 'utf8').trim(), ssl: { rejectUnauthorized: false } });
await cloud.connect();
await cloud.query("set time zone 'UTC'");

const results = [];
for (const f of files) {
  const path = `supabase/migrations/${f}.sql`;
  let sql;
  try { sql = readFileSync(path, 'utf8'); } catch { results.push({ file: f, error: 'FILE_NOT_FOUND' }); continue; }
  const version = f.slice(0, 14);
  const name = f.slice(15);
  // 已登记则跳过
  const reg = await cloud.query(`select 1 from supabase_migrations.schema_migrations where name=$1`, [name]);
  if (reg.rowCount > 0) { results.push({ file: f, status: 'ALREADY_REGISTERED' }); continue; }
  try {
    await cloud.query('begin');
    await cloud.query(sql);
    await cloud.query(`insert into supabase_migrations.schema_migrations(version, name, statements) values ($1, $2, $3)`, [version, name, [sql]]);
    await cloud.query('commit');
    results.push({ file: f, status: 'INSTALLED' });
    console.log('INSTALLED', f);
  } catch (e) {
    await cloud.query('rollback');
    // 逐语句容错重试：拆分执行，跳过失败语句
    let stmtOk = 0, stmtFail = 0;
    const stmts = sql.split(/;\s*\n/).map(s => s.trim()).filter(s => s.length > 3 && !/^--/.test(s));
    try {
      await cloud.query('begin');
      for (const s of stmts) {
        try { await cloud.query(s); stmtOk++; } catch (e2) { stmtFail++; }
      }
      await cloud.query(`insert into supabase_migrations.schema_migrations(version, name, statements) values ($1, $2, $3)`, [version, name, [sql]]);
      await cloud.query('commit');
      results.push({ file: f, status: 'PARTIAL', stmtOk, stmtFail });
      console.log('PARTIAL', f, `ok=${stmtOk} fail=${stmtFail}`);
    } catch (e3) {
      await cloud.query('rollback');
      results.push({ file: f, status: 'FAILED', error: e3.message });
      console.log('FAILED', f, e3.message);
    }
  }
}
writeFileSync(dir + 'P4_PHASE_A_MIGRATION_LOG.json', JSON.stringify({ performed_at: new Date().toISOString(), results }, null, 1), 'utf8');
console.log('done:', results.filter(r => r.status === 'INSTALLED').length, 'installed,', results.filter(r => r.status === 'PARTIAL').length, 'partial,', results.filter(r => r.status === 'FAILED' || r.error === 'FILE_NOT_FOUND').length, 'failed');
await cloud.end();
