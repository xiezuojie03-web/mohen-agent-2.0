import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { deriveIntakeAcquisitionRecord }
  from '../../pipelines/data-production/workers/source-acquisition-record.mjs';
import { deriveSourceIdentityStratification }
  from '../../pipelines/data-production/workers/source-identity-stratification.mjs';

// Y07 获取账：原件在库就必须有"怎么来的"账。方法键 M####、64hex 请求摘要、
// 可解析时间逐项校验；自称 acquired_verified 必须字节与哈希同库存原件一致；
// candidate_ref/dependency_refs 由本次准入的 Y05 身份分层派生，不抄调用方。
const BYTES = Buffer.from('合成扫描页字节。');
const SHA = createHash('sha256').update(BYTES).digest('hex');
const ORIGINAL_ID = '11111111-1111-4111-8111-111111111111';
const VERSION_ID = '22222222-2222-4222-8222-222222222222';
const RAW_ID = '33333333-3333-4333-8333-333333333333';

const registration = (overrides = {}) => ({
  original_id: ORIGINAL_ID, source_version_id: VERSION_ID, raw_item_id: RAW_ID,
  sha256: SHA, byte_size: BYTES.length, content_type: 'image/jpeg',
  provider: '国立公文书馆(NAJ)', title: '松江府志7',
  original_locator: { item: 4252790, catalog_no: 'NAJDA-292-0017' },
  source_version_artifact_revision: 'a'.repeat(64),
  ...overrides,
});
const record = (overrides = {}) => ({
  state: 'STORED_VERIFIED', sha256: SHA, byte_size: BYTES.length,
  content_type: 'image/jpeg', ...overrides,
});
const identityOf = (reg = registration(), rec = record()) =>
  deriveSourceIdentityStratification({ registration: reg, record: rec });
const acquisition = (overrides = {}) => ({
  method: {
    method_key: 'M0002', method_version: 'v1', access_mode: 'manual_download',
    resource_scope: { provider: '国立公文书馆(NAJ)' },
    steps: ['打开馆藏页面', '下载本页 JPEG'],
    success_criteria: ['字节与馆藏页面一致'], failure_modes: ['页面不可达'], alternatives: [],
  },
  attempt: {
    result_state: 'acquired_verified', asset_sha256: SHA, byte_size: BYTES.length,
    started_at: '2026-11-10T00:00:00.000Z', finished_at: '2026-11-10T00:01:00.000Z',
    request_digest: 'd'.repeat(64),
  },
  ...overrides,
});

test('Y07 获取账：真实人工下载尝试规范化，身份引用即本次准入的 Y05 分层', () => {
  const reg = registration(), rec = record();
  const result = deriveIntakeAcquisitionRecord({
    registration: reg, record: rec, identity: identityOf(reg, rec), acquisition: acquisition() });
  assert.equal(result.method.methodKey, 'M0002');
  assert.equal(result.method.methodVersion, 'v1');
  assert.equal(result.method.accessMode, 'manual_download');
  assert.deepEqual(result.method.steps, ['打开馆藏页面', '下载本页 JPEG']);
  assert.equal(result.attempt.resultState, 'acquired_verified');
  assert.equal(result.attempt.assetSha256, SHA);
  assert.equal(result.attempt.byteSize, BYTES.length);
  assert.equal(result.attempt.requestDigest, 'd'.repeat(64));
  assert.ok(result.attempt.startedAt instanceof Date);
  // 定位缺省回落到登记原件定位，不编造。
  assert.deepEqual(result.attempt.sourceLocator, { item: 4252790, catalog_no: 'NAJDA-292-0017' });
  // candidate_ref 就是 Y05 身份分层本身；依赖只列库里真实存在的两层实体。
  assert.equal(result.candidateRef.schema, 'mohen.source-identity-stratification.v1');
  assert.deepEqual(result.dependencyRefs, [
    { kind: 'source_version', id: VERSION_ID, layer: 'version' },
    { kind: 'raw_item', id: RAW_ID, layer: 'digital_asset' },
  ]);
});

test('Y07 获取账：缺 acquisition、缺方法或缺尝试即失败关闭', () => {
  const reg = registration(), rec = record(), idn = identityOf(reg, rec);
  assert.throws(() => deriveIntakeAcquisitionRecord({ registration: reg, record: rec, identity: idn }),
    /ACQUISITION_REQUIRED/);
  assert.throws(() => deriveIntakeAcquisitionRecord({ registration: reg, record: rec, identity: idn,
    acquisition: { attempt: acquisition().attempt } }), /ACQUISITION_METHOD_REQUIRED/);
  assert.throws(() => deriveIntakeAcquisitionRecord({ registration: reg, record: rec, identity: idn,
    acquisition: { method: acquisition().method } }), /ACQUISITION_ATTEMPT_REQUIRED/);
});

test('Y07 获取账：方法键、摘要、时间与结果状态逐项校验', () => {
  const reg = registration(), rec = record(), idn = identityOf(reg, rec);
  const bad = (mutate, pattern) => {
    const input = acquisition();
    mutate(input);
    assert.throws(() => deriveIntakeAcquisitionRecord({
      registration: reg, record: rec, identity: idn, acquisition: input }), pattern);
  };
  bad((a) => { a.method.method_key = 'manual'; }, /ACQUISITION_METHOD_KEY_INVALID/);
  bad((a) => { a.method.method_version = ' '; }, /ACQUISITION_METHOD_VERSION_REQUIRED/);
  bad((a) => { a.method.access_mode = ''; }, /ACQUISITION_ACCESS_MODE_REQUIRED/);
  bad((a) => { a.attempt.result_state = ''; }, /ACQUISITION_ATTEMPT_STATE_REQUIRED/);
  bad((a) => { a.attempt.request_digest = 'xyz'; }, /ACQUISITION_REQUEST_DIGEST_INVALID/);
  bad((a) => { a.attempt.started_at = 'not-a-time'; }, /ACQUISITION_STARTED_AT_INVALID/);
  bad((a) => { a.attempt.finished_at = 'not-a-time'; }, /ACQUISITION_FINISHED_AT_INVALID/);
});

test('Y07 获取账：自称 acquired_verified 却字节不符即伪造，失败关闭', () => {
  const reg = registration(), rec = record(), idn = identityOf(reg, rec);
  const tamperedSha = acquisition();
  tamperedSha.attempt.asset_sha256 = 'e'.repeat(64);
  assert.throws(() => deriveIntakeAcquisitionRecord({
    registration: reg, record: rec, identity: idn, acquisition: tamperedSha }),
    /ACQUISITION_ASSET_MISMATCH/);
  const tamperedSize = acquisition();
  tamperedSize.attempt.byte_size = BYTES.length + 1;
  assert.throws(() => deriveIntakeAcquisitionRecord({
    registration: reg, record: rec, identity: idn, acquisition: tamperedSize }),
    /ACQUISITION_ASSET_MISMATCH/);
  // 非 acquired_verified 的失败尝试如实透传，不要求字节一致。
  const failed = acquisition();
  failed.attempt = { result_state: 'failed', failure_code: 'PAGE_UNREACHABLE',
    started_at: '2026-11-10T00:00:00.000Z', request_digest: 'd'.repeat(64) };
  const result = deriveIntakeAcquisitionRecord({
    registration: reg, record: rec, identity: idn, acquisition: failed });
  assert.equal(result.attempt.resultState, 'failed');
  assert.equal(result.attempt.failureCode, 'PAGE_UNREACHABLE');
  assert.equal(result.attempt.assetSha256, null);
});

test('Y07 获取账：分页整卷尝试按页码明细认这一页，摘要不符仍失败关闭', () => {
  const reg = registration(), rec = record(), idn = identityOf(reg, rec);
  const volumeDigest = 'c'.repeat(64);
  const paginated = acquisition();
  paginated.method = { ...paginated.method, method_key: 'M0003', method_version: 'v1',
    access_mode: 'iiif_presentation_and_image_api' };
  paginated.attempt = {
    result_state: 'acquired_verified', asset_sha256: volumeDigest, byte_size: BYTES.length * 73,
    request_digest: 'd'.repeat(64), started_at: '2026-11-10T00:00:00.000Z',
    pagination: { boundary: 'canvas_index', total_pages: 73, pages_acquired: [34, 35, 36] },
    acquired_extent: { total_pages: 73, pages: [
      { page: 34, sha256: 'a'.repeat(64), byte_size: 1 },
      { page: 35, sha256: SHA, byte_size: BYTES.length },
      { page: 36, sha256: 'b'.repeat(64), byte_size: 2 },
    ] },
  };
  const result = deriveIntakeAcquisitionRecord({
    registration: reg, record: rec, identity: idn, acquisition: paginated });
  // 整卷摘要是整次尝试的哈希，落库时不得被当成这一页的哈希。
  assert.equal(result.attempt.assetSha256, SHA);
  assert.equal(result.attempt.byteSize, BYTES.length);
  assert.equal(result.attempt.pagination.admitted_page.sha256, SHA);
  assert.equal(result.attempt.pagination.admitted_page.page_scope_verified, true);
  assert.equal(result.attempt.pagination.total_pages, 73);

  // 明细里没有任何一页对得上这份字节 → 仍按伪造处理。
  const lying = acquisition();
  lying.attempt = { ...paginated.attempt, acquired_extent: { total_pages: 73, pages: [
    { page: 35, sha256: 'f'.repeat(64), byte_size: BYTES.length }] } };
  assert.throws(() => deriveIntakeAcquisitionRecord({
    registration: reg, record: rec, identity: idn, acquisition: lying }),
    /ACQUISITION_ASSET_MISMATCH/);
});

test('Y07 获取账：登记/原件事实不符或身份不是本次准入这份即失败关闭', () => {
  const reg = registration(), rec = record();
  assert.throws(() => deriveIntakeAcquisitionRecord({ record: rec, identity: identityOf(),
    acquisition: acquisition() }), /ACQUISITION_REGISTRATION_REQUIRED/);
  assert.throws(() => deriveIntakeAcquisitionRecord({ registration: reg, identity: identityOf(),
    acquisition: acquisition() }), /ACQUISITION_ORIGINAL_REQUIRED/);
  assert.throws(() => deriveIntakeAcquisitionRecord({ registration: reg,
    record: record({ state: 'STORED' }), identity: identityOf(), acquisition: acquisition() }),
    /ACQUISITION_ORIGINAL_NOT_VERIFIED/);
  assert.throws(() => deriveIntakeAcquisitionRecord({ registration: reg, record: rec,
    identity: { schema: 'other' }, acquisition: acquisition() }), /ACQUISITION_IDENTITY_REQUIRED/);
  // 拿另一份准入的身份给这次获取背书：版本层对不上即拒绝。
  const otherIdentity = identityOf(registration({ source_version_id: '44444444-4444-4444-8444-444444444444' }),
    record());
  assert.throws(() => deriveIntakeAcquisitionRecord({ registration: reg, record: rec,
    identity: otherIdentity, acquisition: acquisition() }), /ACQUISITION_IDENTITY_MISMATCH/);
});
