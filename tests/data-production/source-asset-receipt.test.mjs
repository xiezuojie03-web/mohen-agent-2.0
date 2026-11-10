import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { deriveValidatedAssetReceipt }
  from '../../pipelines/data-production/workers/source-asset-receipt.mjs';
import { deriveSourceIdentityStratification }
  from '../../pipelines/data-production/workers/source-identity-stratification.mjs';

// Y08 取得回执：对"这一页原件已在库、来路在账、身份已分层"的存证小结。
// 回执只从本次准入已核验真值与刚落库的工序记录派生：库存回读哈希、登记一致、
// Y05 身份分层、Y07 获取尝试（acquired_verified 且字节一致）、Y04 覆盖结论
// （verified_against.matched）、Y03 核查结论——缺任一项即失败关闭；
// 核查结论是 needs_owner 就原样带回执，绝不升级为可采纳。
const BYTES = Buffer.from('合成扫描页字节。');
const SHA = createHash('sha256').update(BYTES).digest('hex');
const ORIGINAL_ID = '11111111-1111-4111-8111-111111111111';
const VERSION_ID = '22222222-2222-4222-8222-222222222222';
const RAW_ID = '33333333-3333-4333-8333-333333333333';
const NEED_ID = '55555555-5555-4555-8555-555555555555';
const CATALOG_ID = '66666666-6666-4666-8666-666666666666';
const VERIFICATION_ID = '77777777-7777-4777-8777-777777777777';
const ATTEMPT_ID = '88888888-8888-4888-8888-888888888888';
const COVERAGE_ID = '99999999-9999-4999-8999-999999999999';

const registration = (overrides = {}) => ({
  original_id: ORIGINAL_ID, source_version_id: VERSION_ID, raw_item_id: RAW_ID,
  sha256: SHA, byte_size: BYTES.length, content_type: 'image/jpeg',
  provider: '国立公文书馆(NAJ)', title: '松江府志7',
  source_version_artifact_revision: 'a'.repeat(64),
  ...overrides,
});
const record = (overrides = {}) => ({
  state: 'STORED_VERIFIED', sha256: SHA, byte_size: BYTES.length,
  content_type: 'image/jpeg', ...overrides,
});
const identityOf = (reg = registration(), rec = record()) =>
  deriveSourceIdentityStratification({ registration: reg, record: rec });
const facts = (overrides = {}) => ({
  registration: registration(), record: record(), identity: identityOf(),
  attempt: { attempt_id: ATTEMPT_ID, resultState: 'acquired_verified',
    assetSha256: SHA, byteSize: BYTES.length },
  coverage: { coverage_id: COVERAGE_ID, verifiedAgainst: { matched: true } },
  verification: { verification_id: VERIFICATION_ID, verdict: 'needs_owner' },
  needId: NEED_ID, catalogEntryId: CATALOG_ID, pageNumber: 35,
  ...overrides,
});

test('Y08 取得回执：六道工序齐备则回执成文，链上五条引用可回读', () => {
  const { receipt, evidenceRefs } = deriveValidatedAssetReceipt(facts());
  assert.equal(receipt.schema, 'mohen.validated-asset-receipt.v1');
  assert.equal(receipt.method, 'D00/Y08:intake_receipt@v1');
  assert.equal(receipt.original_id, ORIGINAL_ID);
  assert.equal(receipt.source_version_id, VERSION_ID);
  assert.equal(receipt.raw_item_id, RAW_ID);
  assert.equal(receipt.page_number, 35);
  assert.equal(receipt.sha256, SHA);
  assert.equal(receipt.byte_size, BYTES.length);
  assert.deepEqual(receipt.basis, [
    'storage_readback_sha256', 'registration_consistency', 'identity_stratification',
    'acquisition_attempt_verified', 'coverage_conclusion', 'candidate_verification',
  ]);
  // 核查结论原样带回执，资格恒为未评定：回执不是裁决。
  assert.equal(receipt.verification_verdict, 'needs_owner');
  assert.equal(receipt.qualification, 'UNASSESSED');
  assert.deepEqual(evidenceRefs, [
    { kind: 'source_need', id: NEED_ID },
    { kind: 'resource_catalog', id: CATALOG_ID },
    { kind: 'candidate_verification', id: VERIFICATION_ID },
    { kind: 'acquisition_attempt', id: ATTEMPT_ID },
    { kind: 'acquisition_coverage', id: COVERAGE_ID },
  ]);
});

test('Y08 取得回执：库存事实或登记不全即失败关闭', () => {
  assert.throws(() => deriveValidatedAssetReceipt(facts({ registration: null })),
    /RECEIPT_REGISTRATION_REQUIRED/);
  assert.throws(() => deriveValidatedAssetReceipt(
    facts({ record: record({ state: 'STORED' }) })), /RECEIPT_ORIGINAL_NOT_VERIFIED/);
  assert.throws(() => deriveValidatedAssetReceipt(
    facts({ registration: registration({ source_version_id: 'nope' }) })),
    /RECEIPT_REGISTRATION_INVALID/);
});

test('Y08 取得回执：身份不是本次准入这份即失败关闭', () => {
  assert.throws(() => deriveValidatedAssetReceipt(facts({ identity: { schema: 'other' } })),
    /RECEIPT_IDENTITY_REQUIRED/);
  const foreign = identityOf(
    registration({ source_version_id: '44444444-4444-4444-8444-444444444444' }), record());
  assert.throws(() => deriveValidatedAssetReceipt(facts({ identity: foreign })),
    /RECEIPT_IDENTITY_MISMATCH/);
});

test('Y08 取得回执：尝试未核验或覆盖未核对即失败关闭', () => {
  assert.throws(() => deriveValidatedAssetReceipt(facts({ attempt: null })),
    /RECEIPT_ATTEMPT_REQUIRED/);
  assert.throws(() => deriveValidatedAssetReceipt(facts({
    attempt: { attempt_id: ATTEMPT_ID, resultState: 'acquired_unverified',
      assetSha256: SHA, byteSize: BYTES.length } })), /RECEIPT_ATTEMPT_NOT_VERIFIED/);
  assert.throws(() => deriveValidatedAssetReceipt(facts({
    attempt: { attempt_id: ATTEMPT_ID, resultState: 'acquired_verified',
      assetSha256: 'e'.repeat(64), byteSize: BYTES.length } })),
    /RECEIPT_ATTEMPT_NOT_VERIFIED/);
  assert.throws(() => deriveValidatedAssetReceipt(facts({ coverage: null })),
    /RECEIPT_COVERAGE_REQUIRED/);
  assert.throws(() => deriveValidatedAssetReceipt(facts({
    coverage: { coverage_id: COVERAGE_ID, verifiedAgainst: { matched: false } } })),
    /RECEIPT_COVERAGE_UNVERIFIED/);
});

test('Y08 取得回执：核查结论或链上锚点缺失即失败关闭', () => {
  assert.throws(() => deriveValidatedAssetReceipt(facts({ verification: null })),
    /RECEIPT_VERIFICATION_REQUIRED/);
  assert.throws(() => deriveValidatedAssetReceipt(facts({ needId: null })),
    /RECEIPT_CHAIN_REFS_REQUIRED/);
  assert.throws(() => deriveValidatedAssetReceipt(facts({ catalogEntryId: 'nope' })),
    /RECEIPT_CHAIN_REFS_REQUIRED/);
});
