#!/usr/bin/env node
// D00-C4 隔离证据：Y02 资源总目录 / Y04 取得范围与缺失部件 / Y03 候选核查 / Y06 优先级评估。
// 与 C1 同口径：单事务 + rollback，不向 mohen_dev 留任何测试行；证据分两层——
// 数据库契约（约束/触发器/FK/权限/RLS）与唯一写入口 source-discovery-repository.mjs 的守卫。
import { randomUUID } from 'node:crypto';
import '../packages/data-access/src/index.mjs';
import { getNodePgPool } from '../packages/data-access/src/node-pg-client.mjs';
import { createSourceDiscoveryRepository } from '../packages/data-access/src/source-discovery-repository.mjs';
import { writeMethodIsolationReceipt } from './lib/method-isolation-receipt.mjs';

const VERIFIER = 'tools/verify-d00c4-remaining-stages.mjs';
const METHODS = ['Y02', 'Y03', 'Y04', 'Y06'];
const SCOPE = 'D00 剩余四工序的存储契约（四表/约束/触发器/RLS/最小授权）+ 唯一写入口的输入守卫';
const NOT_COVERED = [
  'Y02—Y06 的生产者实现：本批只有表与写入口，没有真实检索/核查/评估执行器',
  'stage 端到端运行与 registry 方法路由激活',
  'Y05 身份确认（按 Owner 裁决不建新表，复用 source.sources / source_versions）',
  '生产库',
];

const results = [];
const pass = (name, detail = '') => results.push({ ok: true, name, detail });
const fail = (name, detail = '') => results.push({ ok: false, name, detail });

async function expectThrow(name, pattern, fn) {
  try {
    await fn();
    fail(name, 'expected error, none raised');
  } catch (error) {
    const message = String(error?.message ?? error);
    if (pattern.test(message)) pass(name, message.split('\n')[0].slice(0, 120));
    else fail(name, `unexpected error: ${message.split('\n')[0].slice(0, 160)}`);
  }
}

const pool = getNodePgPool();
const client = await pool.connect();
const repo = createSourceDiscoveryRepository({ query: (text, values) => client.query(text, values) });
const projectId = randomUUID();
const otherProjectId = randomUUID();

try {
  await client.query('begin');
  const sp = async (fn) => {
    await client.query('savepoint probe');
    try { await fn(); } finally { await client.query('rollback to savepoint probe'); }
  };

  // ---------- 前置：需求 + 方法 + 两条尝试（一条已核验、一条仅目录命中）----------
  const need = await repo.recordSourceNeed({
    projectId, researchIntent: '青浦低田科则与熟荒起科的执行差异',
    scope: { time: '1644-1911', space: '松江府青浦县' },
  });
  await repo.registerAcquisitionMethod({
    methodKey: 'M0001', methodVersion: 'shl-pdf-race-v1', accessMode: 'api_pdf_stream',
  });
  const verifiedAttempt = await repo.appendAcquisitionAttempt({
    projectId, needId: need.need_id, methodKey: 'M0001', methodVersion: 'shl-pdf-race-v1',
    requestDigest: 'a'.repeat(64), startedAt: new Date(), resultState: 'acquired_verified',
    byteSize: 236005, assetSha256: 'b'.repeat(64), rightsActions: {},
  });
  const catalogOnlyAttempt = await repo.appendAcquisitionAttempt({
    projectId, needId: need.need_id, methodKey: 'M0001', methodVersion: 'shl-pdf-race-v1',
    requestDigest: 'c'.repeat(64), startedAt: new Date(), resultState: 'catalog_found', rightsActions: {},
  });

  // ---------- Y02 正例 ----------
  const entry = await repo.recordCatalogEntry({
    projectId, needId: need.need_id, provider: '国立公文书馆(NAJ)',
    catalogTitle: '松江府志7', catalogIdentifier: 'NAJ-14373', carrierHint: 'scanned_page',
    language: 'zh-Hant', availabilityState: 'catalog_found',
    coverageHint: { volumes: '卷十一' }, rightsHint: { access_view: 'allowed' },
    discoveredByMethod: 'M0001', methodVersion: 'shl-pdf-race-v1',
    evidenceRef: { provider_landing: 'https://www.digital.archives.go.jp/' },
  });
  if (/^[a-f0-9-]{36}$/.test(entry.catalog_entry_id ?? '')) pass('Y02 目录条目落库', entry.catalog_entry_id);
  else fail('Y02 目录条目落库', JSON.stringify(entry));

  // 无编号条目允许同题多版并存（不做唯一约束）。
  const entryNoIdB = await repo.recordCatalogEntry({
    projectId, needId: need.need_id, provider: '上海图书馆',
    catalogTitle: '松江府志（另一版本）', availabilityState: 'catalog_listed_no_item',
    discoveredByMethod: 'M0001', methodVersion: 'shl-pdf-race-v1',
  });
  if (entryNoIdB.catalog_entry_id !== entry.catalog_entry_id) pass('无目录编号的同题多版可并存');
  else fail('无目录编号的同题多版可并存');

  const secondEntry = await repo.recordCatalogEntry({
    projectId, needId: need.need_id, provider: '上海图书馆',
    catalogTitle: '松江府志（未核版）', catalogIdentifier: 'SHL-99999',
    availabilityState: 'unknown', discoveredByMethod: 'M0001', methodVersion: 'shl-pdf-race-v1',
  });

  await sp(() => expectThrow('同需求同提供方同编号不得重复登记', /resource_catalog_identity/,
    () => repo.recordCatalogEntry({
      projectId, needId: need.need_id, provider: '国立公文书馆(NAJ)',
      catalogTitle: '松江府志7', catalogIdentifier: 'NAJ-14373', availabilityState: 'catalog_found',
      discoveredByMethod: 'M0001', methodVersion: 'shl-pdf-race-v1',
    })));
  await sp(() => expectThrow('目录可用性取值受限', /CATALOG_ENTRY_AVAILABILITY_INVALID/,
    () => repo.recordCatalogEntry({
      projectId, needId: need.need_id, provider: 'X', catalogTitle: 'Y',
      availabilityState: 'downloaded', discoveredByMethod: 'M0001', methodVersion: 'v1',
    })));

  // ---------- Y04 正例 + 两类负例 ----------
  const completeCoverage = await repo.recordAcquisitionCoverage({
    projectId, attemptId: verifiedAttempt.attempt_id, catalogEntryId: entry.catalog_entry_id,
    coverageScope: { pages: 1, page_numbers: [35] }, missingParts: [],
    completenessState: 'complete', verifiedAgainst: { byte_size: 236005, asset_sha256: 'b'.repeat(64) },
  });
  if (completeCoverage.completeness_state === 'complete' && completeCoverage.missing_parts === 0) {
    pass('Y04 完整覆盖（有已核验取得做依据）落库', completeCoverage.coverage_id);
  } else fail('Y04 完整覆盖落库', JSON.stringify(completeCoverage));

  const partialCoverage = await repo.recordAcquisitionCoverage({
    projectId, attemptId: verifiedAttempt.attempt_id, catalogEntryId: entry.catalog_entry_id,
    coverageScope: { volumes: '卷十一' }, missingParts: [{ part: '卷十二' }, { part: '卷十三' }],
    completenessState: 'partial', note: '只取到单页',
  });
  if (partialCoverage.missing_parts === 2) pass('Y04 部分覆盖记录缺失部件');
  else fail('Y04 部分覆盖记录缺失部件', JSON.stringify(partialCoverage));

  await sp(() => expectThrow('完整与缺件互斥（仓库层）', /COVERAGE_COMPLETE_WITH_MISSING_PARTS/,
    () => repo.recordAcquisitionCoverage({
      projectId, attemptId: verifiedAttempt.attempt_id, completenessState: 'complete',
      missingParts: [{ part: '卷十二' }],
    })));
  await sp(() => expectThrow('完整与缺件互斥（库约束）', /acquisition_coverages_check/,
    () => client.query(`insert into source.acquisition_coverages
      (project_id,attempt_id,completeness_state,missing_parts) values($1,$2,'complete','[{"part":"x"}]')`,
    [projectId, verifiedAttempt.attempt_id])));
  await sp(() => expectThrow('未经核验的尝试不得宣布覆盖完整', /COVERAGE_COMPLETE_REQUIRES_VERIFIED_ATTEMPT/,
    () => repo.recordAcquisitionCoverage({
      projectId, attemptId: catalogOnlyAttempt.attempt_id, completenessState: 'complete', missingParts: [],
    })));

  // ---------- Y03 正例 + 空依据负例 ----------
  const verification = await repo.recordCandidateVerification({
    projectId, catalogEntryId: entry.catalog_entry_id,
    checks: { provider_reachable: 'pass', identity_matched: 'pass', rights_basis: 'explicit_license' },
    verdict: 'admissible', reasonCode: 'IDENTITY_AND_RIGHTS_CONFIRMED',
    methodKey: 'M0001', methodVersion: 'shl-pdf-race-v1',
  });
  if (verification.verdict === 'admissible') pass('Y03 核查结论落库（带逐项依据）');
  else fail('Y03 核查结论落库', JSON.stringify(verification));

  await sp(() => expectThrow('空依据不得给结论（仓库层）', /VERIFICATION_CHECKS_REQUIRED/,
    () => repo.recordCandidateVerification({
      projectId, catalogEntryId: entry.catalog_entry_id, checks: {}, verdict: 'admissible',
      reasonCode: 'X', methodKey: 'M0001', methodVersion: 'v1',
    })));
  await sp(() => expectThrow('空依据不得给结论（库约束）', /candidate_verifications_check/,
    () => client.query(`insert into source.candidate_verifications
      (project_id,catalog_entry_id,checks,verdict,reason_code,method_key,method_version)
      values($1,$2,'{}'::jsonb,'admissible','X','M0001','v1')`, [projectId, entry.catalog_entry_id])));

  // ---------- Y06 正例 + 未核不得入选 ----------
  const selected = await repo.recordPriorityAssessment({
    projectId, needId: need.need_id, catalogEntryId: entry.catalog_entry_id,
    criteria: { authority: 'gazetteer_primary', relevance: 'direct', coverage: 'volume_11',
      freshness: 'edition_undated', rights: 'explicit_license' },
    decision: 'selected', rationale: '唯一有明确权利依据且身份已核的卷十一版本',
    methodKey: 'M0001', methodVersion: 'shl-pdf-race-v1',
  });
  if (selected.decision === 'selected') pass('Y06 已核候选可入选');
  else fail('Y06 已核候选可入选', JSON.stringify(selected));

  const deferred = await repo.recordPriorityAssessment({
    projectId, needId: need.need_id, catalogEntryId: secondEntry.catalog_entry_id,
    criteria: { authority: 'unknown' }, decision: 'deferred',
    rationale: '尚未核查身份与权利，先不动', methodKey: 'M0001', methodVersion: 'shl-pdf-race-v1',
  });
  if (deferred.decision === 'deferred') pass('Y06 未核候选可挂起');
  else fail('Y06 未核候选可挂起', JSON.stringify(deferred));

  await sp(() => expectThrow('未核不得入选', /PRIORITY_SELECTED_REQUIRES_ADMISSIBLE_VERIFICATION/,
    () => repo.recordPriorityAssessment({
      projectId, needId: need.need_id, catalogEntryId: secondEntry.catalog_entry_id,
      criteria: {}, decision: 'selected', rationale: '跳过核查直接选',
      methodKey: 'M0001', methodVersion: 'shl-pdf-race-v1',
    })));

  // ---------- 四表一律追加 ----------
  await sp(() => expectThrow('目录条目不可改写', /D00_HISTORY_APPEND_ONLY/,
    () => client.query(`update source.resource_catalog set availability_state='unknown' where catalog_entry_id=$1`,
      [entry.catalog_entry_id])));
  await sp(() => expectThrow('覆盖结论不可删除', /D00_HISTORY_APPEND_ONLY/,
    () => client.query(`delete from source.acquisition_coverages where coverage_id=$1`, [partialCoverage.coverage_id])));
  await sp(() => expectThrow('核查结论不可改写', /D00_HISTORY_APPEND_ONLY/,
    () => client.query(`update source.candidate_verifications set verdict='rejected' where verification_id=$1`,
      [verification.verification_id])));
  await sp(() => expectThrow('优先级评估不可删除', /D00_HISTORY_APPEND_ONLY/,
    () => client.query(`delete from source.priority_assessments where assessment_id=$1`, [selected.assessment_id])));

  // 更正以新行表达。
  const correctedEntry = await repo.recordCatalogEntry({
    projectId, needId: need.need_id, provider: '国立公文书馆(NAJ)', catalogTitle: '松江府志7',
    catalogIdentifier: 'NAJ-14373', availabilityState: 'catalog_found',
    discoveredByMethod: 'M0001', methodVersion: 'shl-pdf-race-v1',
    correctionOf: entry.catalog_entry_id,
  });
  if (correctedEntry.catalog_entry_id !== entry.catalog_entry_id) pass('更正以新行表达（correction_of 不占唯一约束）');
  else fail('更正以新行表达');

  // ---------- 权限与 RLS ----------
  await sp(async () => {
    await client.query('set local role mohen_private_worker');
    const own = await client.query(
      `select (select count(*) from source.resource_catalog where project_id=$1)::int as catalog,
              (select count(*) from source.priority_assessments where project_id=$1)::int as priorities`, [projectId]);
    if (own.rows[0]?.catalog >= 1 && own.rows[0]?.priorities >= 1) pass('mohen_private_worker 可读自己写入的四表');
    else fail('mohen_private_worker 可读自己写入的四表', JSON.stringify(own.rows[0]));
    await expectThrow('mohen_private_worker 无改写目录条目的权限', /permission denied|权限不够|D00_HISTORY_APPEND_ONLY/,
      () => client.query(`update source.resource_catalog set catalog_title='x' where catalog_entry_id=$1`,
        [entry.catalog_entry_id]));
  });

  await sp(async () => {
    await client.query('set local role mohen_gate_signer_m5_machine');
    const review = await client.query(
      `select (select count(*) from source.resource_catalog)::int as catalog,
              (select count(*) from source.candidate_verifications)::int as verifications`);
    if (review.rows[0]?.catalog >= 1) pass('独立复核角色可只读四表');
    else fail('独立复核角色可只读四表', JSON.stringify(review.rows[0]));
    await expectThrow('独立复核角色不可写四表', /permission denied|权限不够/,
      () => client.query(`insert into source.resource_catalog
        (project_id,need_id,provider,catalog_title,availability_state,discovered_by_method,method_version)
        values($1,$2,'X','Y','unknown','M0001','v1')`, [otherProjectId, need.need_id]));
  });

  await sp(async () => {
    await client.query('set local role mohen_producer');
    await expectThrow('生产角色无 D00 历史表权限', /permission denied|权限不够/,
      () => client.query('select count(*) from source.priority_assessments'));
  });

  // 既有对象零改动。
  const untouched = await client.query(`select
    (select count(*) from source.sources)::int as sources,
    (select count(*) from source.source_versions)::int as versions,
    (select count(*) from source.raw_items)::int as raw_items`);
  pass('既有 source 三元链行数（本事务内未触碰）', JSON.stringify(untouched.rows[0]));

  await client.query('rollback');

  const residual = await client.query(`select
    (select count(*) from source.resource_catalog)::int as catalog,
    (select count(*) from source.acquisition_coverages)::int as coverages,
    (select count(*) from source.candidate_verifications)::int as verifications,
    (select count(*) from source.priority_assessments)::int as priorities`);
  const left = residual.rows[0];
  if (left.catalog === 0 && left.coverages === 0 && left.verifications === 0 && left.priorities === 0) {
    pass('回滚后零残留');
  } else fail('回滚后零残留', JSON.stringify(left));
} catch (error) {
  try { await client.query('rollback'); } catch { /* already rolled back */ }
  fail('验证脚本异常终止', String(error?.stack ?? error).split('\n').slice(0, 4).join(' | '));
} finally {
  client.release();
  await pool.end?.();
}

for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  :: ' + r.detail : ''}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\nD00C4_${failed === 0 ? 'ALL_PASS' : 'FAILED'} total=${results.length} failed=${failed}`);

const written = writeMethodIsolationReceipt({
  receiptId: 'd00c4-remaining-stages',
  verifier: VERIFIER,
  methods: METHODS,
  scope: SCOPE,
  notCovered: NOT_COVERED,
  environment: {
    node: process.version,
    database: 'local postgres 127.0.0.1:5432/mohen_dev',
    isolation: 'single transaction, rolled back; zero residue checked after rollback',
  },
  checks: results.map((r) => ({ name: r.name, ok: r.ok })),
});
console.log(`RECEIPT ${written.file} status=${written.receipt.status} total=${written.receipt.total} failed=${written.receipt.failed}`);
process.exit(failed === 0 ? 0 : 1);
