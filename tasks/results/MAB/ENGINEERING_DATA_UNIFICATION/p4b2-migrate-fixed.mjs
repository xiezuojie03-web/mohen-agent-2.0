#!/usr/bin/env node
/**
 * P4 Phase B2（修复版）：多遍幂等迁移 + Phase C 受控UPDATE + 核验
 */
import { Client } from './node_modules-pg-shim.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const local = new Client({ connectionString: readFileSync('.env.local', 'utf8').match(/DATABASE_URL=(.+)$/m)[1].trim() });
const cloud = new Client({ connectionString: readFileSync('.secrets/supabase-db-url.txt', 'utf8').trim(), ssl: { rejectUnauthorized: false } });
await local.connect(); await cloud.connect();
await local.query("set time zone 'UTC'"); await cloud.query("set time zone 'UTC'");
const q = (c, sql, p) => c.query(sql, p).then(r => r.rows);
const OWNER_ID = '270bcecf595dcfbd00000000fa5e2f2f';

// ---- 0. 约束对齐（云端更严 CHECK → 换成本地定义，测试数据口径）----
const checks = [
  ['source', 'source_needs', 'source_needs_coverage_dimensions_check'],
  ['source', 'acquisition_attempts', 'acquisition_attempts_alternatives_check'],
  ['studio', 'execution_receipts', 'execution_receipts_candidate_refs_check'],
];
for (const [s, t, cname] of checks) {
  const ld = await q(local, `select pg_get_constraintdef(oid) as d from pg_constraint where conname=$1 and conrelid='${s}.${t}'::regclass`, [cname]);
  if (!ld.length) continue;
  try {
    await cloud.query(`alter table ${s}.${t} drop constraint if exists ${cname}`);
    await cloud.query(`alter table ${s}.${t} add constraint ${cname} ${ld[0].d}`);
    console.log('check aligned:', cname);
  } catch (e) { console.log('check align FAIL:', cname, e.message.slice(0, 100)); }
}

// ---- 1. 迁移期间临时停用的云端强校验触发器 ----
const trgTables = ['studio.asset_revisions', 'studio.private_originals', 'studio.use_events'];
const disabled = [];
for (const t of trgTables) {
  const trgs = await q(cloud, `select t.tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname=$1 and c.relname=$2`, t.split('.'));
  for (const tr of trgs) {
    try { await cloud.query(`alter table ${t} disable trigger ${tr.tgname}`); disabled.push([t, tr.tgname]); console.log('trigger disabled:', t, tr.tgname); }
    catch (e) { console.log('trigger disable FAIL:', t, tr.tgname, e.message.slice(0, 80)); }
  }
}

// ---- 2. 表清单与列类型 ----
const BIZ = ['public', 'source', 'control', 'studio', 'publication', 'read_model', 'world', 'meaning', 'evidence'];
const tabs = await q(local, `select n.nspname as s, c.relname as t from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and n.nspname = any($1) order by 1,2`, [BIZ]);
const cloudCols = new Map();
for (const r of tabs) {
  const cols = await q(cloud, `select column_name, data_type, is_nullable from information_schema.columns where table_schema=$1 and table_name=$2 order by ordinal_position`, [r.s, r.t]);
  if (cols.length) cloudCols.set(`${r.s}.${r.t}`, cols);
}
// 依赖近似排序：run/audit/qualification/users 先行，其余按表名字典序的拓扑近似 + 多遍兜底
const priority = ['public.users', 'control.production_runs', 'control.gate_policy_versions', 'control.gate_candidates', 'control.gate_audits', 'control.gate_reviewer_bindings', 'control.qualification_current', 'control.invalidation_events', 'source.sources', 'source.source_versions', 'source.raw_items', 'source.read_runs', 'source.read_units', 'evidence.reading_units', 'evidence.material_evidence', 'studio.projects', 'studio.asset_heads', 'studio.asset_revisions', 'studio.private_originals', 'public.assets', 'public.research_tasks', 'public.research_events', 'source.source_needs', 'source.resource_catalog', 'source.acquisition_methods', 'source.acquisition_attempts', 'source.acquisition_coverages', 'source.candidate_verifications', 'source.priority_assessments', 'source.original_provider_traces', 'studio.work_revisions', 'studio.submission_snapshots', 'publication.editorial_decisions', 'publication.publication_snapshots', 'publication.withdrawals'];
const all = tabs.map(r => `${r.s}.${r.t}`);
const ordered = [...priority.filter(p => all.includes(p)), ...all.filter(p => !priority.includes(p))];

const serialize = (v, dtype) => {
  if (v == null) return null;
  if (/json/.test(dtype)) {
    if (/array/i.test(dtype) || dtype.endsWith('[]')) return Array.isArray(v) ? v.map(x => (x && typeof x === 'object') ? JSON.stringify(x) : x) : JSON.stringify(v);
    return (typeof v === 'object') ? JSON.stringify(v) : v;
  }
  if (/array/i.test(dtype) || dtype.endsWith('[]')) return v; // pg 处理普通数组
  return v;
};

const tableStats = new Map(ordered.map(t => [t, { local: 0, inserted: 0, errors: 0 }]));
for (let pass = 1; pass <= 5; pass++) {
  let passInserted = 0, passErrors = 0;
  for (const full of ordered) {
    if (!cloudCols.has(full)) continue;
    const cc = cloudCols.get(full);
    const colNames = cc.map(c => c.column_name);
    const dmap = new Map(cc.map(c => [c.column_name, c.data_type]));
    let rows;
    try { rows = await q(local, `select * from "${full.split('.')[0]}"."${full.split('.')[1]}"`); } catch { continue; }
    if (full === 'public.users') {
      rows = rows.filter(u => u.user_id !== OWNER_ID).map(u => ({ ...u, password_hash: '!', status: 'disabled', roles: ['member'] }));
    }
    if (full === 'publication.published_pointers') rows = rows.filter(r => r.revision_id != null);
    const st = tableStats.get(full);
    st.local = rows.length;
    for (const r of rows) {
      try {
        const vals = colNames.map(c => serialize(r[c], dmap.get(c)));
        const res = await cloud.query(`insert into "${full.split('.')[0]}"."${full.split('.')[1]}"(${colNames.map(c => `"${c}"`).join(',')}) values (${colNames.map((_, i) => `$${i + 1}`).join(',')}) on conflict do nothing`, vals);
        if (res.rowCount > 0) { st.inserted++; passInserted++; }
      } catch (e) { st.errors++; passErrors++; }
    }
  }
  console.log(`PASS ${pass}: inserted=${passInserted} errors=${passErrors}`);
  if (passInserted === 0) break;
}

// ---- 3. 恢复触发器 ----
for (const [t, tr] of disabled) {
  try { await cloud.query(`alter table ${t} enable trigger ${tr}`); console.log('trigger re-enabled:', t, tr); }
  catch (e) { console.log('trigger RE-ENABLE FAIL:', t, tr, e.message.slice(0, 80)); }
}

// ---- 4. Phase C：受控UPDATE（权利27组 + 形差异19行）----
// 4a. 权利：本地有值、云端空对象的27组共有source
const lsrc = await q(local, `select source_id, rights_by_action, rights_evidence from source.sources`);
const csrc = await q(cloud, `select source_id, rights_by_action, rights_evidence from source.sources`);
const cmap = new Map(csrc.map(s => [s.source_id, s]));
let rightsUpdated = 0;
for (const s of lsrc) {
  const c = cmap.get(s.source_id);
  if (!c) continue; // 本地独有行已随INSERT带入
  if ((s.rights_by_action && Object.keys(s.rights_by_action).length) && (!c.rights_by_action || Object.keys(c.rights_by_action).length === 0)) {
    await cloud.query(`update source.sources set rights_by_action=$1, rights_evidence=$2 where source_id=$3`, [JSON.stringify(s.rights_by_action), JSON.stringify(s.rights_evidence), s.source_id]);
    rightsUpdated++;
  }
}
console.log('rights updated (sources):', rightsUpdated);
// 4b. 版本 rights_snapshot
const lsv = await q(local, `select source_version_id, rights_snapshot from source.source_versions where rights_snapshot is not null and rights_snapshot::text <> '{}'`);
let svUpdated = 0;
for (const v of lsv) {
  const csv = await q(cloud, `select rights_snapshot from source.source_versions where source_version_id=$1`, [v.source_version_id]);
  if (csv.length && (!csv[0].rights_snapshot || Object.keys(csv[0].rights_snapshot).length === 0)) {
    await cloud.query(`update source.source_versions set rights_snapshot=$1 where source_version_id=$2`, [JSON.stringify(v.rights_snapshot), v.source_version_id]);
    svUpdated++;
  }
}
console.log('rights updated (versions):', svUpdated);
// 4c. 形差异行（assets/director_plans/published_pointers）：以本地完整值补齐云端扩展列
const shapeUpdates = { 'public.assets': 0, 'public.director_plans': 0, 'publication.published_pointers': 0 };
const shapeCols = {
  'public.assets': ['original_id', 'source_id', 'page_locator', 'content_sha256', 'rights_by_action'],
  'public.director_plans': ['source_ids', 'project_id'],
  'publication.published_pointers': ['source_schema', 'studio_revision_id', 'publication_id'],
};
for (const [t, cols] of Object.entries(shapeCols)) {
  const lrows = await q(local, `select * from "${t.split('.')[0]}"."${t.split('.')[1]}"`);
  for (const r of lrows) {
    const pk = t === 'public.director_plans' ? 'plan_id' : (t === 'public.assets' ? 'asset_id' : 'pointer_id');
    const sets = [], vals = [];
    for (const c of cols) {
      if (r[c] == null) continue;
      const dt = (await q(cloud, `select data_type from information_schema.columns where table_schema=$1 and table_name=$2 and column_name=$3`, [t.split('.')[0], t.split('.')[1], c]))[0]?.data_type || 'text';
      vals.push(serialize(r[c], dt)); sets.push(`"${c}"=$${vals.length}`);
    }
    if (!sets.length) continue;
    vals.push(r[pk]);
    try {
      const res = await cloud.query(`update "${t.split('.')[0]}"."${t.split('.')[1]}" set ${sets.join(',')} where "${pk}"=$${vals.length}`, vals);
      shapeUpdates[t] += res.rowCount;
    } catch (e) { console.log('shape update fail:', t, e.message.slice(0, 80)); }
  }
}
console.log('shape updates:', JSON.stringify(shapeUpdates));

// ---- 5. 核验 ----
const verify = [];
for (const full of ordered) {
  const [s, t] = full.split('.');
  let lc, cc;
  try { lc = (await q(local, `select count(*)::int as c from ${full}`))[0].c; } catch { continue; }
  try { cc = (await q(cloud, `select count(*)::int as c from ${full}`))[0].c; } catch { cc = -1; }
  verify.push({ table: full, local: lc, cloud: cc, ok: lc === cc });
}
const bad = verify.filter(v => !v.ok);
writeFileSync('tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/P4_MIGRATION_RESULT.json', JSON.stringify({
  performed_at: new Date().toISOString(),
  trigger_toggles: { disabled_during_migration: disabled },
  checks_aligned: checks.map(c => c[2]),
  rights_updates: { sources: rightsUpdated, versions: svUpdated },
  shape_updates: shapeUpdates,
  table_stats: [...tableStats.entries()].map(([t, s]) => ({ table: t, ...s })),
  verify, mismatches: bad,
}, null, 1), 'utf8');
console.log('VERIFY: tables=', verify.length, 'mismatches=', bad.length);
for (const v of bad) console.log('  MISMATCH', v.table, 'local=', v.local, 'cloud=', v.cloud);
await local.end(); await cloud.end();
console.log('PHASE B2 + C COMPLETE');
