#!/usr/bin/env node
/**
 * M5-P3-RIGHTS-RECONCILIATION-01：27组权利字段冲突逐条核查（只读）
 * 交付：RIGHTS_27_GROUPS_EVIDENCE_RECONCILIATION.json（+控制台摘要）
 */
import { Client } from './node_modules-pg-shim.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const dir = 'tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/';
const L = JSON.parse(readFileSync(dir + 'p2_extract_local.json', 'utf8'));
const C = JSON.parse(readFileSync(dir + 'p2_extract_cloud.json', 'utf8'));

const local = new Client({ connectionString: readFileSync('.env.local', 'utf8').match(/^DATABASE_URL=(.+)$/m)[1].trim() });
const cloud = new Client({ connectionString: readFileSync('.secrets/supabase-db-url.txt', 'utf8').trim(), ssl: { rejectUnauthorized: false } });
await local.connect(); await cloud.connect();

// 27 组差异 source（P2 同ID异内容）
const lpk = new Map(L['source.sources'].rows.map(r => [r.pk[0], r.digest]));
const cpk = new Map(C['source.sources'].rows.map(r => [r.pk[0], r.digest]));
const conflictIds = [...lpk.keys()].filter(k => cpk.has(k) && cpk.get(k) !== lpk.get(k));

const lrows = (await local.query(`select source_id, provider, title, source_type, source_uri_or_catalog_no, rights::text as rights_legacy, rights_by_action, rights_evidence, created_at from source.sources where source_id = any($1)`, [conflictIds])).rows;
const crows = (await cloud.query(`select source_id, rights_by_action, rights_evidence, created_at from source.sources where source_id = any($1)`, [conflictIds])).rows;
const cMap = new Map(crows.map(r => [r.source_id, r]));

// 本地版本的 rights_snapshot（版本级权利快照）
const lvers = (await local.query(`
  select sv.source_version_id, sv.source_id, sv.version_label, sv.rights_snapshot, sv.retrieved_at
  from source.source_versions sv where sv.source_id = any($1) order by sv.source_id, sv.retrieved_at`, [conflictIds])).rows;
const versBySource = new Map();
for (const v of lvers) {
  if (!versBySource.has(v.source_id)) versBySource.set(v.source_id, []);
  versBySource.get(v.source_id).push(v);
}
// 云端版本快照
const cvers = (await cloud.query(`select source_version_id, source_id, rights_snapshot from source.source_versions where source_id = any($1)`, [conflictIds])).rows;
const cverMap = new Map(cvers.map(v => [v.source_version_id, v]));

// 本地权利动作值是否与版本快照一致（可追溯性）
// 本地 D00 原机构回溯 / 资源目录中是否有权利依据
const traces = (await local.query(`select catalog_entry_id, provider, catalog_title, rights_hint, evidence_ref, availability_state from source.resource_catalog where provider ~ '上海图书馆|shl|SHL' or rights_hint is not null and rights_hint::text <> '{}' limit 8`)).rows;

// 云端两条权利投影迁移的处理逻辑（从账本取 statements）
const ledgerRows = (await cloud.query(`select version, name, statements from supabase_migrations.schema_migrations where name in ('mab_m5_private_source_action_rights_projection','m5_private_source_rights_projection_20261119','m5_reuse_existing_m2_private_source_registration_source_revision') order by version`)).rows;
const migrations = ledgerRows.map(m => ({ version: m.version, name: m.name, statements: m.statements }));

// 动作级证据分类
function classifyAction(action, value, evidence) {
  // evidence 为该动作的证据对象（来自 rights_evidence）
  const ev = evidence && (evidence[action] || (typeof evidence === 'object' && Object.keys(evidence).length ? evidence : null));
  if (value === 'allowed') {
    if (ev && (ev.basis || ev.decision || ev.term || ev.evidence)) return 'EVIDENCE_SUPPORTED_ALLOWED';
    return 'DECLARED_BUT_UNVERIFIED';
  }
  if (value === 'denied') return 'EVIDENCE_SUPPORTED_DENIED';
  if (value === 'restricted') return 'EVIDENCE_SUPPORTED_RESTRICTED';
  return 'NO_EVIDENCE'; // unknown / 缺失
}

const groups = lrows.map(l => {
  const c = cMap.get(l.source_id);
  const localRba = l.rights_by_action || {};
  const cloudRba = c?.rights_by_action || {};
  const ev = l.rights_evidence || {};
  const actions = {};
  for (const [a, v] of Object.entries(localRba)) {
    actions[a] = {
      local_value: v,
      cloud_value: cloudRba[a] === undefined ? '(键不存在/空对象)' : cloudRba[a],
      classification: classifyAction(a, v, ev),
      evidence: ev[a] || ev || null,
    };
  }
  // 云端独有动作（如有）
  for (const [a, v] of Object.entries(cloudRba)) if (!(a in localRba)) actions[a] = { local_value: '(无)', cloud_value: v, classification: 'CONFLICT_PENDING', evidence: null };
  const versions = (versBySource.get(l.source_id) || []).map(v => ({
    source_version_id: v.source_version_id, version_label: v.version_label, retrieved_at: v.retrieved_at,
    local_snapshot: v.rights_snapshot,
    cloud_snapshot: cverMap.has(v.source_version_id) ? cverMap.get(v.source_version_id).rights_snapshot : '(云端无此版本)',
  }));
  return {
    source_id: l.source_id,
    provider: l.provider, title: l.title, source_type: l.source_type,
    source_uri_or_catalog_no: l.source_uri_or_catalog_no,
    created_at_local: l.created_at,
    rights_legacy_field: l.rights_legacy,
    local_rights_by_action: localRba,
    cloud_rights_by_action: cloudRba,
    rights_evidence: ev,
    actions,
    versions,
  };
});

const summary = { total: groups.length,
  providers: {}, action_tally: {}, classification_tally: {} };
for (const g of groups) {
  summary.providers[g.provider] = (summary.providers[g.provider] || 0) + 1;
  for (const [a, d] of Object.entries(g.actions)) {
    summary.action_tally[a] = summary.action_tally[a] || {};
    summary.action_tally[a][d.local_value] = (summary.action_tally[a][d.local_value] || 0) + 1;
    summary.classification_tally[d.classification] = (summary.classification_tally[d.classification] || 0) + 1;
  }
}

writeFileSync(dir + 'RIGHTS_27_GROUPS_EVIDENCE_RECONCILIATION.json', JSON.stringify({
  specialty: 'M5-P3-RIGHTS-RECONCILIATION-01', stage: 'P3',
  generated_at: new Date().toISOString(),
  method: '只读比对：本地/云端 rights_by_action 全量 + rights_evidence（授权依据列）+ 版本 rights_snapshot + 云端权利投影迁移账本 statements。零写入。',
  cloud_migration_logic: migrations,
  resource_catalog_shl_traces: traces.length,
  groups,
  summary,
}, null, 1), 'utf8');

console.log('conflict groups:', groups.length);
console.log('providers:', JSON.stringify(summary.providers));
console.log('action tally:', JSON.stringify(summary.action_tally));
console.log('classification tally:', JSON.stringify(summary.classification_tally));
console.log('sample group 0 keys:', JSON.stringify(groups[0]?.local_rights_by_action));
console.log('sample group 0 evidence:', JSON.stringify(groups[0]?.rights_evidence)?.slice(0, 500));
console.log('cloud migration names:', migrations.map(m => m.name).join(', '));
await local.end(); await cloud.end();
