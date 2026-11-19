#!/usr/bin/env node
/**
 * P3 历史数据差异与冲突分析（只读）
 * 交付：LOCAL_ONLY_ASSET_CLASSIFICATION / CLOUD_ONLY_ASSET_CLASSIFICATION /
 *       SHARED_DATA_SEMANTIC_CONFLICTS / HISTORICAL_RUN_DEPENDENCY_MAPPING /
 *       GATE_QUALIFICATION_RECONCILIATION / SAMPLE_ASSET_MAPPING
 */
import { Client } from './node_modules-pg-shim.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const dir = 'tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/';
const L = JSON.parse(readFileSync(dir + 'p2_extract_local.json', 'utf8'));
const C = JSON.parse(readFileSync(dir + 'p2_extract_cloud.json', 'utf8'));

const local = new Client({ connectionString: readFileSync('.env.local', 'utf8').match(/^DATABASE_URL=(.+)$/m)[1].trim() });
const cloud = new Client({ connectionString: readFileSync('.secrets/supabase-db-url.txt', 'utf8').trim(), ssl: { rejectUnauthorized: false } });
await local.connect(); await cloud.connect();
await local.query("set time zone 'UTC'"); await cloud.query("set time zone 'UTC'");
const ql = (sql, p) => local.query(sql, p).then(r => r.rows);
const qc = (sql, p) => cloud.query(sql, p).then(r => r.rows);
const out = (name, obj) => writeFileSync(dir + name, JSON.stringify(obj, null, 1), 'utf8');

function pkSets(table) {
  const lpk = new Set(L[table].rows.map(r => r.pk[0]));
  const cpk = new Set(C[table]?.rows.map(r => r.pk[0]) || []);
  return { localOnly: [...lpk].filter(x => !cpk.has(x)), cloudOnly: [...cpk].filter(x => !lpk.has(x)), shared: [...lpk].filter(x => cpk.has(x)) };
}
const inList = (arr) => `(${arr.map(x => `'${x}'`).join(',') || "''"})`;

// ========== 1. 本地独有 Run 依赖映射 ==========
const runSets = pkSets('control.production_runs');
const runDetail = await ql(`select run_id, research_intent, status, started_at::date::text as started, finished_at::date::text as finished, execution_mode, architecture_generation from control.production_runs where run_id in ${inList(runSets.localOnly)}`);
const runLineage = await ql(`
  select r.run_id,
    (select count(*) from source.read_runs rr where rr.production_run_id = r.run_id) as read_runs,
    (select count(*) from source.read_units ru join source.read_runs rr on rr.read_run_id = ru.read_run_id where rr.production_run_id = r.run_id) as read_units,
    (select count(*) from evidence.reading_units ru2 join source.raw_items ri on ri.raw_item_id = ru2.raw_item_id join source.read_runs rr on rr.raw_item_id = ri.raw_item_id where rr.production_run_id = r.run_id) as reading_units,
    (select count(*) from evidence.material_evidence me left join evidence.reading_units ru2 on ru2.reading_unit_id = me.reading_unit_id left join source.raw_items ri on ri.raw_item_id = me.raw_item_id where me.raw_item_id in (select raw_item_id from source.read_runs rr2 where rr2.production_run_id = r.run_id) or me.reading_unit_id in (select ru3.reading_unit_id from evidence.reading_units ru3 join source.raw_items ri2 on ri2.raw_item_id = ru3.raw_item_id where ri2.raw_item_id in (select raw_item_id from source.read_runs rr3 where rr3.production_run_id = r.run_id))) as material_evidence,
    (select count(*) from control.gate_audits ga where ga.run_id = r.run_id) as gate_audits,
    (select count(*) from control.gate_candidates gc where gc.run_id = r.run_id) as gate_candidates,
    (select count(*) from control.qualification_current q join control.gate_audits ga on ga.gate_audit_id = q.gate_audit_id where ga.run_id = r.run_id) as qualifications
  from control.production_runs r where r.run_id in ${inList(runSets.localOnly)}`);
const lineageMap = new Map(runLineage.map(r => [r.run_id, r]));
const runMapping = runDetail.map(r => ({ ...r, ...(lineageMap.get(r.run_id) || {}) }));
// 云端独有 run 关联对象（本地独有 run 在云端的对象缺失 = RELATION_MISSING 风险面）
out('HISTORICAL_RUN_DEPENDENCY_MAPPING.json', {
  specialty: 'MOHEN-ENGINEERING-DATA-UNIFICATION-01', stage: 'P3', generated_at: new Date().toISOString(),
  method: '以P2主键差集为基线，对115个本地独有run做血缘计数（read_runs→read_units/reading_units→material_evidence；gate_audits→candidates→qualification_current）。全部只读。',
  local_only_runs: runMapping,
});
console.log('runs mapped:', runMapping.length, '| with_gate_audits:', runMapping.filter(r => r.gate_audits > 0).length, '| with_qualifications:', runMapping.filter(r => r.qualifications > 0).length, '| with_read_runs:', runMapping.filter(r => r.read_runs > 0).length);

// ========== 2. Gate 资格核账 ==========
const gaSets = pkSets('control.gate_audits');
const gaOrigin = await ql(`select decision_origin, result, count(*)::int as c from control.gate_audits where gate_audit_id in ${inList(gaSets.localOnly)} group by 1,2 order by 3 desc`);
const gaReviewer = await ql(`select reviewer_user_id, reviewer_db_identity, count(*)::int as c from control.gate_audits where gate_audit_id in ${inList(gaSets.localOnly)} group by 1,2 order by 3 desc`);
const gaStage = await ql(`select stage, gate_code, count(*)::int as c from control.gate_audits where gate_audit_id in ${inList(gaSets.localOnly)} group by 1,2 order by 3 desc`);
const candSets = pkSets('control.gate_candidates');
const candStatus = await ql(`select candidate_status, count(*)::int as c from control.gate_candidates where candidate_id in ${inList(candSets.localOnly)} group by 1 order by 2 desc`);
const qualSets = pkSets('control.qualification_current');
const qualByGate = await ql(`select gate_code, count(*)::int as c, min(valid_from)::date::text as from_min, max(valid_until)::date::text as until_max, count(*) filter (where valid_until < now())::int as expired from control.qualification_current where (architecture_generation, artifact_revision, consumer, gate_code, object_id, object_type, purpose_code, purpose_namespace, purpose_version) in (select architecture_generation, artifact_revision, consumer, gate_code, object_id, object_type, purpose_code, purpose_namespace, purpose_version from control.qualification_current where true) group by 1 order by 2 desc`);
const qualValidity = await ql(`select count(*)::int as total, count(*) filter (where valid_until is null)::int as no_expiry, count(*) filter (where valid_until < now())::int as expired, count(*) filter (where valid_until >= now())::int as active from control.qualification_current`);
const qualOrigin = await ql(`select ga.decision_origin, count(*)::int as c from control.qualification_current q join control.gate_audits ga on ga.gate_audit_id = q.gate_audit_id group by 1`);
const qualGateAuditIds = await ql(`select q.gate_audit_id from control.qualification_current q`);
const qualMissingAudit = qualGateAuditIds.filter(q => !gaSets.localOnly.includes(q.gate_audit_id) && !L['control.gate_audits'].rows.some(r => r.pk[0] === q.gate_audit_id));
// 49条资格对应的 gate_audit 是否都在本地（依赖完整性）
const qualAuditLocal = await ql(`select count(*)::int as c from control.qualification_current q join control.gate_audits ga on ga.gate_audit_id = q.gate_audit_id`);
// invalidation_events 20条
const invSets = pkSets('control.invalidation_events');
const invDisp = await ql(`select disposition, count(*)::int as c from control.invalidation_events where invalidation_event_id in ${inList(invSets.localOnly)} group by 1`);
// 资格对象指向的对象层（object_type 分布）
const qualObjType = await ql(`select object_type, count(*)::int as c from control.qualification_current group by 1 order by 2 desc`);

out('GATE_QUALIFICATION_RECONCILIATION.json', {
  specialty: 'MOHEN-ENGINEERING-DATA-UNIFICATION-01', stage: 'P3', generated_at: new Date().toISOString(),
  local_only_gate_audits_91: {
    by_decision_origin_result: gaOrigin, by_reviewer: gaReviewer, by_stage_gate: gaStage,
    note: '历史审计逐项保留原始记录，不因迁移改变 decision_origin。legacy_untrusted 保持原样。',
  },
  local_only_candidates_123: { by_status: candStatus },
  local_only_qualifications_49: {
    by_gate_code: qualByGate, validity: qualValidity[0], by_audit_decision_origin: qualOrigin,
    by_object_type: qualObjType,
    audit_dependency_intact: qualAuditLocal[0].c,
    note: '资格依赖的gate_audit全部在本地；迁移时须先迁审计后迁资格（依赖拓扑）。',
  },
  local_only_invalidation_events_20: { by_disposition: invDisp },
});
console.log('gate audits origin:', JSON.stringify(gaOrigin));
console.log('candidates:', JSON.stringify(candStatus));
console.log('qualifications validity:', JSON.stringify(qualValidity[0]), 'origin:', JSON.stringify(qualOrigin));

// ========== 3. 云端历史改写冲突 ==========
const lRuns = await ql(`select run_id, status, metadata::text as metadata from control.production_runs where run_id in ${inList(runSets.shared)}`);
const cRuns = await qc(`select run_id, status, metadata::text as metadata from control.production_runs where run_id in ${inList(runSets.shared)}`);
const runConflicts = lRuns.map(l => {
  const c = cRuns.find(x => x.run_id === l.run_id);
  return { run_id: l.run_id, local_status: l.status, cloud_status: c?.status, local_metadata: l.metadata?.slice(0, 400), cloud_metadata: c?.metadata?.slice(0, 400) };
});
// sources 权利前后值
const srcSets = pkSets('source.sources');
const lSrc = await ql(`select source_id, rights_by_action from source.sources where source_id in ${inList(srcSets.shared)}`);
const cSrc = await qc(`select source_id, rights_by_action from source.sources where source_id in ${inList(srcSets.shared)}`);
const rightsConflicts = [];
for (const l of lSrc) {
  const c = cSrc.find(x => x.source_id === l.source_id);
  if (c && JSON.stringify(l.rights_by_action) !== JSON.stringify(c.rights_by_action)) {
    rightsConflicts.push({ source_id: l.source_id, local_rights: l.rights_by_action, cloud_rights: c.rights_by_action });
  }
}
const svSets = pkSets('source.source_versions');
const lSv = await ql(`select source_version_id, rights_snapshot from source.source_versions where source_version_id in ${inList(svSets.shared)}`);
const cSv = await qc(`select source_version_id, rights_snapshot from source.source_versions where source_version_id in ${inList(svSets.shared)}`);
const svRights = [];
for (const l of lSv) {
  const c = cSv.find(x => x.source_version_id === l.source_version_id);
  if (c && JSON.stringify(l.rights_snapshot) !== JSON.stringify(c.rights_snapshot)) svRights.push({ source_version_id: l.source_version_id });
}
// users 认证差异
const uSets = pkSets('public.users');
const lUsers = await ql(`select user_id, email from public.users where user_id in ${inList(uSets.shared)}`);
const cUsers = await qc(`select user_id, email from public.users where user_id in ${inList(uSets.shared)}`);
// 云端改写的迁移依据（账本）
const ledger = JSON.parse(readFileSync(dir + 'cloud_migration_ledger.json', 'utf8'));
const relevantLedger = ledger.filter(m => ['m5_reuse_existing_m2_private_originals', 'm5_inherit_existing_owner_read_and_d02_d05_candidate_functions', 'mab_m5_private_source_action_rights_projection', 'm5_reuse_existing_m2_private_source_registration_source_revision', 'm5_scoped_formal_project_gate_read'].includes(m.name) || /reconcil|repair|rights/i.test(m.name));
// 其他同ID异内容
const shapeDriven = ['public.assets', 'public.director_plans', 'publication.published_pointers', 'control.session_verification_keys'];
out('SHARED_DATA_SEMANTIC_CONFLICTS.json', {
  specialty: 'MOHEN-ENGINEERING-DATA-UNIFICATION-01', stage: 'P3', generated_at: new Date().toISOString(),
  conflicts: {
    production_runs_status_20: {
      classification: 'CONFLICT_PENDING / PRESERVE_CLOUD 倾向',
      detail: runConflicts,
      evidence: '云端迁移 20261118123000_m5_legacy_run_reconciliation 与 20261118130000_m5_repair_historical_run_status_incident 有意改写；本地为原始状态。需逐run比对metadata中的对账理由后裁决，不得无证据恢复本地旧值。',
    },
    sources_rights_27: {
      classification: 'CONFLICT_PENDING',
      detail_sample: rightsConflicts.slice(0, 5),
      detail_count: rightsConflicts.length,
      evidence: '云端迁移 mab_m5_private_source_action_rights_projection（20261116121153）改写 rights_by_action；本地保留原值。需比对语义（动作键规范 vs 内容变化）后裁决。',
    },
    source_versions_rights_snapshot: { count: svRights.length, ids: svRights.map(x => x.source_version_id), classification: 'CONFLICT_PENDING' },
    users_auth_1: {
      classification: 'AUTH_DATA_EXCLUDED',
      detail: '共有用户 ' + lUsers.map(u => u.user_id).join(',') + ' 的 password_hash/session_not_before/updated_at 不一致（云端密码恢复流程更新）。认证数据不纳入业务迁移，云端现状优先保持不变。',
    },
    shape_driven_diffs: {
      classification: 'CONFLICT_PENDING（表形差异所致，P4结构对齐后重估）',
      tables: shapeDriven, note: '本地表列多于云端（P1结构差异），同ID行内容差异主要由列集不同与云端work_id外键重构引起。',
    },
  },
  cloud_migration_evidence: relevantLedger.map(m => ({ version: m.version, name: m.name })),
});
console.log('run conflicts sample:', JSON.stringify(runConflicts.find(r => r.local_status !== r.cloud_status)?.cloud_metadata)?.slice(0, 300));
console.log('rights conflict count:', rightsConflicts.length, '| sample:', JSON.stringify(rightsConflicts[0])?.slice(0, 300));

// ========== 4. 样板资产映射 ==========
const samples = [
  { name: '金泽', kw: ['金泽'] },
  { name: '绿之丘', kw: ['绿之丘'] },
  { name: '朱家角', kw: ['朱家角'] },
  { name: '七宝', kw: ['七宝'] },
  { name: '松江府志', kw: ['松江'] },
];
const sampleMapping = {};
for (const s of samples) {
  const like = s.kw.map(k => `title like '%${k}%'`).join(' or ');
  const lIds = (await ql(`select source_id from source.sources where ${like}`)).map(r => r.source_id);
  const cIds = (await qc(`select source_id from source.sources where ${like}`)).map(r => r.source_id);
  const chain = async (db, ids, isCloud) => {
    if (ids.length === 0) return { sources: 0, source_versions: 0, raw_items: 0, read_runs: 0, read_units: 0, reading_units: 0, material_evidence: 0, gate_audits: 0, qualifications: 0 };
    const q = isCloud ? qc : ql;
    const versions = (await q(`select source_version_id from source.source_versions where source_id in ${inList(ids)}`)).map(r => r.source_version_id);
    const raws = versions.length ? (await q(`select raw_item_id, checksum_sha256 from source.raw_items where source_version_id in ${inList(versions)}`)) : [];
    const readRuns = raws.length ? (await q(`select read_run_id, production_run_id from source.read_runs where raw_item_id in ${inList(raws.map(r => r.raw_item_id))}`)) : [];
    const runIds = [...new Set(readRuns.map(r => r.production_run_id))];
    const readUnits = readRuns.length ? (await q(`select count(*)::int as c from source.read_units where read_run_id in ${inList(readRuns.map(r => r.read_run_id))}`)) : [{ c: 0 }];
    const readingUnits = raws.length ? (await q(`select count(*)::int as c from evidence.reading_units where raw_item_id in ${inList(raws.map(r => r.raw_item_id))}`)) : [{ c: 0 }];
    const evidence = (await q(`select count(*)::int as c from evidence.material_evidence where source_id in ${inList(ids)}`))[0].c;
    const gates = runIds.length ? (await q(`select count(*)::int as c from control.gate_audits where run_id in ${inList(runIds)}`))[0].c : 0;
    const quals = runIds.length ? (await q(`select count(*)::int as c from control.qualification_current q join control.gate_audits ga on ga.gate_audit_id = q.gate_audit_id where ga.run_id in ${inList(runIds)}`))[0].c : 0;
    return { sources: ids.length, source_versions: versions.length, raw_items: raws.length, read_runs: readRuns.length, read_units: readUnits[0].c, reading_units: readingUnits[0].c, material_evidence: evidence, gate_audits: gates, qualifications: quals, _runIds: runIds, _shas: raws.map(r => r.checksum_sha256).slice(0, 200) };
  };
  const lc = await chain(local, lIds, false);
  const cc = await chain(cloud, cIds, true);
  sampleMapping[s.name] = {
    local_source_ids: lIds, cloud_source_ids: cIds,
    object_counts: { local: { ...lc, _runIds: undefined, _shas: undefined }, cloud: cc },
    sha_overlap: lc._shas?.filter(s2 => cc._shas?.includes(s2)).length ?? 0,
    local_run_ids: lc._runIds, cloud_run_ids: cc._runIds,
  };
}
out('SAMPLE_ASSET_MAPPING.json', {
  specialty: 'MOHEN-ENGINEERING-DATA-UNIFICATION-01', stage: 'P3', generated_at: new Date().toISOString(),
  method: '以source标题检索样板来源，沿 FK 链 sources→versions→raws→read_runs→read_units/reading_units→material_evidence 及 run→gate_audits→qualification 统计。全部只读。',
  samples: sampleMapping,
});
console.log('samples:', Object.entries(sampleMapping).map(([k, v]) => `${k}: L${v.local_source_ids.length}/C${v.cloud_source_ids.length} raws L${v.object_counts.local.raw_items}/C${v.object_counts.cloud.raw_items} gates L${v.object_counts.local.gate_audits}/C${v.object_counts.cloud.gate_audits} quals L${v.object_counts.local.qualifications}/C${v.object_counts.cloud.qualifications}`).join(' | '));

// ========== 5/6. 分类清单 ==========
const inv = JSON.parse(readFileSync(dir + 'LOCAL_CLOUD_DATABASE_INVENTORY.json', 'utf8')).tables;
const classifyLocalOnly = (table, stat) => {
  const n = stat.local_only_pks ?? (stat.local_rows_present ? stat.local_rows : 0);
  if (table === 'public.users') return { table, class: 'AUTH_DATA_EXCLUDED', count: n, reason: '用户账户与认证数据，除ID映射外不迁移' };
  if (table === 'control.production_runs') return { table, class: 'MIGRATE_AFTER_REVIEW', count: n, reason: '20个共有run已被云端对账改写，本地115个独有run须逐个核对状态语义后迁移' };
  if (table === 'source.sources' || table === 'source.source_versions') return { table, class: 'MIGRATE_AFTER_REVIEW', count: n, reason: '27个共有记录权利字段被云端投影改写，本地独有12/89条须核对权利语义（动作键规范）后迁移' };
  if (table === 'studio.private_originals') return { table, class: 'BINARY_REFERENCE_ONLY', count: n, reason: '90个原件字节留本地/待另行存储策略，仅迁移元数据+SHA（90/90与本地独有raw_items SHA对应）' };
  if (table.startsWith('control.')) return { table, class: 'MIGRATE_AS_IS', count: n, reason: 'Gate审计/候选/资格/撤权等历史记录，保留原始主键与身份迁移，decision_origin不改' };
  if (table.startsWith('source.') || table.startsWith('evidence.') || table.startsWith('world.') || table.startsWith('meaning.') || table.startsWith('read_model.')) return { table, class: 'MIGRATE_AS_IS', count: n, reason: '知识对象层，依赖拓扑排序后按原主键幂等迁移' };
  if (table.startsWith('studio.')) return { table, class: n === stat.local_rows && !stat.cloud_rows ? 'MIGRATE_WITH_MAPPING' : 'MIGRATE_AS_IS', count: n, reason: 'Studio项目/资产层；10张本地独有表需先在云端补装对应结构迁移' };
  if (table.startsWith('publication.')) return { table, class: 'MIGRATE_WITH_MAPPING', count: n, reason: '出版链路表形双端有差异（published_pointers列集不同），需映射后迁移' };
  if (table === 'public.assets' || table === 'public.director_plans') return { table, class: 'MIGRATE_WITH_MAPPING', count: n, reason: '本地列多于云端（权利追踪列/项目绑定列），需先装列扩展迁移' };
  return { table, class: 'MIGRATE_AS_IS', count: n, reason: '一般业务数据，原主键幂等迁移' };
};
const localOnlyClassification = Object.entries(inv).filter(([, v]) => v.local_only_pks || v.classification === 'LOCAL_ONLY_TABLE').map(([t, v]) => v.classification === 'LOCAL_ONLY_TABLE'
  ? { table: t, class: 'MIGRATE_WITH_MAPPING', count: v.local_rows, reason: '本地独有表（云端缺结构），须先安装对应迁移再迁数据', source_migration: '见 DATABASE_MIGRATION_VERSION_DIFF.json' }
  : classifyLocalOnly(t, v));
out('LOCAL_ONLY_ASSET_CLASSIFICATION.json', {
  specialty: 'MOHEN-ENGINEERING-DATA-UNIFICATION-01', stage: 'P3', generated_at: new Date().toISOString(),
  summary: localOnlyClassification.reduce((a, x) => { a[x.class] = (a[x.class] || 0) + 1; return a; }, {}),
  classification: localOnlyClassification,
});
const cloudOnlyRows = Object.entries(inv).filter(([, v]) => v.cloud_only_pks).map(([t, v]) => ({ table: t, count: v.cloud_only_pks, class: 'PRESERVE_CLOUD', reason: '云端独有（11月正式读取诊断实验等产生），保留不删除' }));
const cloudProj = pkSets('studio.projects');
out('CLOUD_ONLY_ASSET_CLASSIFICATION.json', {
  specialty: 'MOHEN-ENGINEERING-DATA-UNIFICATION-01', stage: 'P3', generated_at: new Date().toISOString(),
  classification: cloudOnlyRows,
  cloud_only_project: { id: cloudProj.cloudOnly, class: 'PRESERVE_CLOUD', note: '云端开发Project（e03c4ba8）及其资产，本地没有，保留云端现状' },
});
console.log('local-only classes:', JSON.stringify(localOnlyClassification.reduce((a, x) => { a[x.class] = (a[x.class] || 0) + 1; return a; }, {})));
console.log('cloud-only rows tables:', cloudOnlyRows.map(x => `${x.table}:${x.count}`).join(', '));

await local.end(); await cloud.end();
console.log('P3 analysis done.');
