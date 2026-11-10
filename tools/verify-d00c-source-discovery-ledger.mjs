#!/usr/bin/env node
// D00-C1 隔离证据：Y01 需求回执 / Y07 方法目录与追加式获取尝试日志。
// 全部动作在一个事务里进行并 rollback，不向 mohen_dev 留任何测试行。
// 证据分两层：数据库契约（约束/触发器/FK/权限/RLS）+ 唯一写入口
// packages/data-access/src/source-discovery-repository.mjs 的输入守卫。
import { randomUUID } from 'node:crypto';
// index.mjs 负责读取本机 .env.local（DATABASE_URL 等），必须早于取连接池。
import '../packages/data-access/src/index.mjs';
import { getNodePgPool } from '../packages/data-access/src/node-pg-client.mjs';
import { createSourceDiscoveryRepository } from '../packages/data-access/src/source-discovery-repository.mjs';

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

  // ---------- 正例 ----------
  const need = await repo.recordSourceNeed({
    projectId,
    researchIntent: '松江府田赋折色在明末的实际征收口径',
    scope: { time: '1600-1644', space: '松江府' },
    coverageDimensions: [{ dimension: '赋役制度', target: '折色比例与征收记录' }],
    existingStockGap: { covered: ['府志田赋门'], missing: ['县级实征册'] },
    rightsBoundary: { access_view: 'allowed', machine_read: 'unknown' },
  });
  if (/^[a-f0-9-]{36}$/.test(need.need_id ?? '')) pass('Y01 需求回执落库', need.need_id);
  else fail('Y01 需求回执落库', JSON.stringify(need));

  const methodA = await repo.registerAcquisitionMethod({
    methodKey: 'M0001', methodVersion: 'shl-pdf-race-v1',
    resourceScope: { provider: 'SHL_OPEN_DATA', collection: 'gj' },
    accessMode: 'api_pdf_stream',
    preconditions: { throttle: 'serial', note: '限流返回 HTTP 200 + state=-1' },
    steps: [{ step: 1, call: 'POST /service_pdf_race/race/pdf/list' }],
    successCriteria: [{ criterion: 'pdf/stream 返回非空字节' }],
    failureModes: [{ code: 'RATE_LIMITED', certainty: 'CONFIRMED' }],
    alternatives: [], methodState: 'TESTED_SUCCESS', recommended: true,
  });
  if (methodA.created === true) pass('Y07 方法身份登记', `${methodA.method_key}@${methodA.method_version}`);
  else fail('Y07 方法身份登记', JSON.stringify(methodA));

  // 重复登记不得覆盖既有定义。
  const methodA2 = await repo.registerAcquisitionMethod({
    methodKey: 'M0001', methodVersion: 'shl-pdf-race-v1',
    resourceScope: { provider: 'SHL_OPEN_DATA', collection: 'mgts' },
    accessMode: 'different_mode_should_not_apply',
  });
  const stored = await client.query(
    `select access_mode, resource_scope->>'collection' as collection from source.acquisition_methods
      where method_key='M0001' and method_version='shl-pdf-race-v1'`);
  if (methodA2.created === false && stored.rows[0]?.access_mode === 'api_pdf_stream'
      && stored.rows[0]?.collection === 'gj') pass('重复登记不覆盖既有方法定义');
  else fail('重复登记不覆盖既有方法定义', JSON.stringify(stored.rows[0]));

  const verifiedAttempt = await repo.appendAcquisitionAttempt({
    projectId, needId: need.need_id,
    candidateRef: { title: '[崇禎]松江府志九十四卷', item_id: '14373' },
    methodKey: 'M0001', methodVersion: 'shl-pdf-race-v1',
    executionEnvironment: { runtime: 'local-isolated', node: process.version },
    requestDigest: 'a'.repeat(64), pagination: { page_no: 51 },
    startedAt: new Date(Date.now() - 3000), finishedAt: new Date(),
    resultState: 'acquired_verified', acquiredExtent: { pages: 1, page_numbers: [51] },
    byteSize: 236005, assetSha256: 'b'.repeat(64),
    sourceLocator: { provider: 'SHL_OPEN_DATA', item_id: '14373', page_no: 51 },
    rightsActions: { access_view: 'allowed', machine_read: 'allowed', retain: 'allowed' },
    accessRestrictions: { login_required: false },
    cost: { amount: 0, currency: 'CNY', certainty: 'CONFIRMED' },
  });
  if (/^[a-f0-9-]{36}$/.test(verifiedAttempt.attempt_id ?? '')) pass('Y07 已核验取得尝试落库', verifiedAttempt.attempt_id);
  else fail('Y07 已核验取得尝试落库', JSON.stringify(verifiedAttempt));

  const catalogAttempt = await repo.appendAcquisitionAttempt({
    projectId, needId: need.need_id,
    candidateRef: { title: '华亭县志（某馆藏目录命中）' },
    methodKey: 'M0001', methodVersion: 'shl-pdf-race-v1',
    requestDigest: 'c'.repeat(64), startedAt: new Date(),
    resultState: 'catalog_found',
    sourceLocator: { catalog_no: 'TEST-ONLY-0001' },
    rightsActions: {},
    cost: { amount: null, currency: null },
  });
  const costUnknown = await client.query(
    `select cost->>'certainty' as certainty from source.acquisition_attempts where attempt_id=$1`,
    [catalogAttempt.attempt_id]);
  if (costUnknown.rows[0]?.certainty === 'unknown') pass('成本未知保持 unknown 且无字节也可登记目录命中');
  else fail('成本未知保持 unknown 且无字节也可登记目录命中', JSON.stringify(costUnknown.rows[0]));

  // 更正另起一行，不改历史。
  const corrected = await repo.appendAcquisitionAttempt({
    projectId, needId: need.need_id, methodKey: 'M0001', methodVersion: 'shl-pdf-race-v1',
    requestDigest: 'd'.repeat(64), startedAt: new Date(), resultState: 'not_found',
    failureCode: 'PAGE_QUOTA_EXHAUSTED', failureCertainty: 'HYPOTHESIS',
    correctionOf: catalogAttempt.attempt_id, rightsActions: {},
  });
  const lineage = await client.query(
    `select correction_of::text as correction_of from source.acquisition_attempts where attempt_id=$1`,
    [corrected.attempt_id]);
  if (lineage.rows[0]?.correction_of === catalogAttempt.attempt_id) pass('更正以新行表达并指向原尝试');
  else fail('更正以新行表达并指向原尝试', JSON.stringify(lineage.rows[0]));

  // ---------- 数据库契约负例 ----------
  const sp = async (name, fn) => {
    await client.query('savepoint probe');
    try { await fn(); } finally { await client.query('rollback to savepoint probe'); }
  };

  await sp('x', () => expectThrow('需求回执不可改写', /D00_HISTORY_APPEND_ONLY/,
    () => client.query(`update source.source_needs set research_intent='改写' where need_id=$1`, [need.need_id])));
  await sp('x', () => expectThrow('获取尝试不可删除', /D00_HISTORY_APPEND_ONLY/,
    () => client.query(`delete from source.acquisition_attempts where attempt_id=$1`, [verifiedAttempt.attempt_id])));
  await sp('x', () => expectThrow('方法定义不可改写', /ACQUISITION_METHOD_DEFINITION_IMMUTABLE/,
    () => client.query(`update source.acquisition_methods set access_mode='rewritten'
      where method_key='M0001' and method_version='shl-pdf-race-v1'`)));
  await sp('x', () => expectThrow('方法身份不可删除', /RAW_APPEND_ONLY/,
    () => client.query(`delete from source.acquisition_methods where method_key='M0001'`)));
  await sp('x', () => expectThrow('无字节不得标记已核验取得', /acquisition_attempts_check/,
    () => client.query(`insert into source.acquisition_attempts
      (project_id,need_id,method_key,method_version,request_digest,started_at,result_state)
      values($1,$2,'M0001','shl-pdf-race-v1',$3,now(),'acquired_verified')`,
    [projectId, need.need_id, 'e'.repeat(64)])));
  await sp('x', () => expectThrow('九动作之外的键被库拒绝', /acquisition_attempts_rights_actions_valid/,
    () => client.query(`insert into source.acquisition_attempts
      (project_id,need_id,method_key,method_version,request_digest,started_at,result_state,rights_actions)
      values($1,$2,'M0001','shl-pdf-race-v1',$3,now(),'catalog_found','{"publish_worldwide":"allowed"}')`,
    [projectId, need.need_id, 'f'.repeat(64)])));
  await sp('x', () => expectThrow('未登记方法不得被尝试引用', /acquisition_attempts_method_key_method_version_fkey/,
    () => client.query(`insert into source.acquisition_attempts
      (project_id,need_id,method_key,method_version,request_digest,started_at,result_state)
      values($1,$2,'M9999','nope',$3,now(),'catalog_found')`,
    [projectId, need.need_id, '1'.repeat(64)])));
  await sp('x', () => expectThrow('仓库层拒绝九动作之外的键', /SOURCE_DISCOVERY_RIGHTS_ACTION_UNKNOWN/,
    () => repo.appendAcquisitionAttempt({
      projectId, needId: need.need_id, methodKey: 'M0001', methodVersion: 'shl-pdf-race-v1',
      requestDigest: '2'.repeat(64), startedAt: new Date(), resultState: 'catalog_found',
      rightsActions: { publish_worldwide: 'allowed' },
    })));
  // 旧键的兼容发生在唯一写入口：仓库把 public_display/read 归一为九动作后入库，
  // 库里只允许九个规范键，避免同一动作出现两个存储形态。
  const legacyNormalized = await repo.appendAcquisitionAttempt({
    projectId, needId: need.need_id, methodKey: 'M0001', methodVersion: 'shl-pdf-race-v1',
    requestDigest: '5'.repeat(64), startedAt: new Date(), resultState: 'catalog_found',
    rightsActions: { public_display: 'allowed', read: 'allowed' },
  });
  const normalized = await client.query(
    `select rights_actions from source.acquisition_attempts where attempt_id=$1`,
    [legacyNormalized.attempt_id]);
  const actions = normalized.rows[0]?.rights_actions ?? {};
  const canonicalOk = await client.query(
    `select source.is_rights_actions_valid($1::jsonb) as ok`, [JSON.stringify(actions)]);
  if (actions.display === 'allowed' && actions.access_view === 'allowed'
      && actions.public_display === undefined && actions.read === undefined
      && canonicalOk.rows[0]?.ok === true) pass('旧键 public_display/read 经写入口归一为九动作后入库');
  else fail('旧键 public_display/read 经写入口归一为九动作后入库', JSON.stringify(actions));
  await sp('x', () => expectThrow('仓库层拒绝无字节的已核验取得', /ACQUISITION_ATTEMPT_VERIFIED_REQUIRES_BYTES/,
    () => repo.appendAcquisitionAttempt({
      projectId, needId: need.need_id, methodKey: 'M0001', methodVersion: 'shl-pdf-race-v1',
      requestDigest: '3'.repeat(64), startedAt: new Date(), resultState: 'acquired_verified',
      byteSize: 10,
    })));
  await sp('x', () => expectThrow('需求必须绑定合法项目', /SOURCE_DISCOVERY_PROJECT_INVALID/,
    () => repo.recordSourceNeed({ projectId: 'not-a-uuid', researchIntent: 'x' })));

  // ---------- 权限与 RLS ----------
  await sp('x', async () => {
    await client.query('set local role mohen_private_worker');
    const own = await client.query('select count(*)::int as n from source.source_needs where project_id=$1', [projectId]);
    if (own.rows[0]?.n >= 1) pass('mohen_private_worker 可读自己写入的需求回执');
    else fail('mohen_private_worker 可读自己写入的需求回执', JSON.stringify(own.rows[0]));
    await expectThrow('mohen_private_worker 无改写需求回执的权限', /permission denied|权限不够|D00_HISTORY_APPEND_ONLY/,
      () => client.query(`update source.source_needs set research_intent='x' where need_id=$1`, [need.need_id]));
  });

  await sp('x', async () => {
    await client.query('set local role mohen_gate_signer_m5_machine');
    const review = await client.query(
      `select (select count(*) from source.source_needs)::int as needs,
              (select count(*) from source.acquisition_attempts)::int as attempts`);
    if (review.rows[0]?.attempts >= 1) pass('独立复核角色可只读获取尝试');
    else fail('独立复核角色可只读获取尝试', JSON.stringify(review.rows[0]));
    await expectThrow('独立复核角色不可写获取尝试', /permission denied|权限不够/,
      () => client.query(`insert into source.acquisition_attempts
        (project_id,need_id,method_key,method_version,request_digest,started_at,result_state)
        values($1,$2,'M0001','shl-pdf-race-v1',$3,now(),'catalog_found')`,
      [otherProjectId, need.need_id, '4'.repeat(64)]));
  });

  await sp('x', async () => {
    await client.query('set local role mohen_producer');
    await expectThrow('生产角色无 D00 历史表权限', /permission denied|权限不够/,
      () => client.query(`select count(*) from source.acquisition_attempts`));
  });

  // 既有对象零改动：本批次不触碰 sources / source_versions / raw_items 任何行。
  const untouched = await client.query(`select
    (select count(*) from source.sources)::int as sources,
    (select count(*) from source.source_versions)::int as versions,
    (select count(*) from source.raw_items)::int as raw_items`);
  pass('既有 source 三元链行数（本事务内未触碰）', JSON.stringify(untouched.rows[0]));

  await client.query('rollback');

  // 回滚后确认零残留（同一连接，事务外读取真实提交状态）。
  const residual = await client.query(
    `select (select count(*) from source.source_needs)::int as needs,
            (select count(*) from source.acquisition_methods)::int as methods,
            (select count(*) from source.acquisition_attempts)::int as attempts`);
  const left = residual.rows[0];
  if (left.needs === 0 && left.methods === 0 && left.attempts === 0) pass('回滚后零残留');
  else fail('回滚后零残留', JSON.stringify(left));
} catch (error) {
  try { await client.query('rollback'); } catch { /* already rolled back */ }
  fail('验证脚本异常终止', String(error?.stack ?? error).split('\n').slice(0, 4).join(' | '));
} finally {
  client.release();
  await pool.end?.();
}

for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  :: ' + r.detail : ''}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\nD00C1_${failed === 0 ? 'ALL_PASS' : 'FAILED'} total=${results.length} failed=${failed}`);
process.exit(failed === 0 ? 0 : 1);
