import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveIntakeCandidateVerification, CANDIDATE_VERIFICATION_SCHEMA,
  INTAKE_VERIFICATION_METHOD, INTAKE_VERIFICATION_METHOD_VERSION, EXPANSION_DIMENSIONS }
  from '../../pipelines/data-production/workers/source-candidate-verification.mjs';

// Y03 的候选核查只从本次准入真值 + 调用方确实给出、且带词源的检索扩展派生；
// 没读到的一律 unassessed，不用措辞把"未核"说成"能用"。
const SHA = 'a'.repeat(64);
const ID = '11111111-1111-4111-8111-111111111111';
const registration = (overrides = {}) => ({
  original_id: ID,
  source_id: '22222222-2222-4222-8222-222222222222',
  source_version_id: '33333333-3333-4333-8333-333333333333',
  raw_item_id: '44444444-4444-4444-8444-444444444444',
  sha256: SHA, byte_size: 8, content_type: 'image/jpeg',
  provider: '国立公文书馆（NAJ)', title: '松江府志7',
  source_type: 'gazetteer', carrier_type: 'scanned_page',
  rights: { basis: 'NAJ_secondary_use_policy', status: 'public_domain_secondary_use' },
  asset_revision_id: '55555555-5555-4555-8555-555555555555',
  original_locator: { item: 4252790, catalog_no: 'NAJDA-292-0017' },
  provenance_status: 'verified', content_availability: 'image_scan',
  source_version_artifact_revision: 'b'.repeat(64),
  ...overrides,
});
const record = (overrides = {}) => ({
  state: 'STORED_VERIFIED', sha256: SHA, byte_size: 8, content_type: 'image/jpeg', ...overrides,
});
const expansion = (overrides = {}) => ({
  dimension: 'place_name', term: '松江府', source_ref: '中国历史地名大辞典·松江府条',
  applicable_era: '元至清（1277—1911）', ambiguity: 'none',
  rationale: '该馆目录以清代政区名编目，需按府级词形扩展检索',
  ...overrides,
});
const sourced = () => [expansion(), expansion({ dimension: 'era', term: '清乾隆年间',
  source_ref: '松江府志·卷十一·田赋·乾隆刻本', applicable_era: '1736—1795',
  ambiguity: 'none', rationale: '原件题名含卷次与年代，用于收窄检索时段' })];

test('Y03 核查：扩展簇带齐词源后，身份已核的候选才可采纳', async () => {
  const result = deriveIntakeCandidateVerification({
    registration: registration(), record: record(), expansions: sourced() });
  assert.equal(result.verdict, 'admissible');
  assert.equal(result.reasonCode, 'Y03_EXPANSION_SOURCED');
  assert.equal(result.methodKey, INTAKE_VERIFICATION_METHOD);
  assert.equal(result.methodVersion, INTAKE_VERIFICATION_METHOD_VERSION);
  assert.equal(result.checks.schema, CANDIDATE_VERIFICATION_SCHEMA);
  assert.equal(result.checks.identity.sha256, SHA);
  assert.equal(result.checks.identity.byte_size, 8);
  assert.equal(result.checks.locator.catalog_no, 'present');
  assert.equal(result.checks.provenance.status, 'verified');
  assert.deepEqual(result.checks.named_expansions.unresolved, []);
  assert.deepEqual(result.checks.named_expansions.dimensions, ['place_name', 'era']);
  assert.equal(result.checks.named_expansions.items.length, 2);
  assert.equal(result.checks.named_expansions.items[0].source_ref, '中国历史地名大辞典·松江府条');
  assert.equal(result.checks.entity_truth, 'out_of_scope:D03');
});

test('Y03 核查：没有词源的时空异名维度写未评估，结论是需人确认而不是能用', async () => {
  const result = deriveIntakeCandidateVerification({ registration: registration(), record: record() });
  assert.equal(result.verdict, 'needs_owner');
  assert.equal(result.reasonCode, 'Y03_EXPANSION_UNASSESSED:place_name,era');
  assert.deepEqual(result.checks.named_expansions.unresolved, ['place_name', 'era']);
  assert.equal(result.checks.named_expansions.provided, 0);
  assert.equal(result.checks.language.state, 'unassessed');
});

test('Y03 核查：只补一维仍不算已评估，缺的那维如实列出', async () => {
  const result = deriveIntakeCandidateVerification({
    registration: registration(), record: record(), expansions: [expansion()] });
  assert.equal(result.verdict, 'needs_owner');
  assert.equal(result.reasonCode, 'Y03_EXPANSION_UNASSESSED:era');
  assert.deepEqual(result.checks.named_expansions.unresolved, ['era']);
});

test('Y03 核查：扩展缺词源/适用时代/歧义/理由即失败关闭，不替研究者补', async () => {
  for (const field of ['source_ref', 'applicable_era', 'ambiguity', 'rationale']) {
    assert.throws(
      () => deriveIntakeCandidateVerification({ registration: registration(), record: record(),
        expansions: [expansion({ [field]: '  ' })] }),
      new RegExp(`CANDIDATE_VERIFICATION_EXPANSION_INCOMPLETE:0:${field}`));
  }
  assert.throws(() => deriveIntakeCandidateVerification({ registration: registration(), record: record(),
    expansions: [expansion({ dimension: 'administrative_unit_2020' })] }),
    /CANDIDATE_VERIFICATION_EXPANSION_DIMENSION_INVALID/);
  assert.throws(() => deriveIntakeCandidateVerification({ registration: registration(), record: record(),
    expansions: 'not-an-array' }), /CANDIDATE_VERIFICATION_EXPANSIONS_INVALID/);
  assert.ok(EXPANSION_DIMENSIONS.includes('water_system'));
});

test('Y03 核查：准入真值不复核就失败关闭，不在未核的字节上给结论', async () => {
  assert.throws(() => deriveIntakeCandidateVerification({}), /CANDIDATE_VERIFICATION_REGISTRATION_REQUIRED/);
  assert.throws(() => deriveIntakeCandidateVerification({ registration: registration() }),
    /CANDIDATE_VERIFICATION_ORIGINAL_REQUIRED/);
  assert.throws(() => deriveIntakeCandidateVerification({ registration: registration(), record: record({ state: 'STORED' }) }),
    /CANDIDATE_VERIFICATION_ORIGINAL_NOT_VERIFIED/);
  assert.throws(() => deriveIntakeCandidateVerification({ registration: registration(), record: record({ sha256: 'c'.repeat(64) }) }),
    /CANDIDATE_VERIFICATION_ORIGINAL_NOT_VERIFIED/);
  assert.throws(() => deriveIntakeCandidateVerification({ registration: registration(), record: record({ byte_size: 9 }) }),
    /CANDIDATE_VERIFICATION_ORIGINAL_NOT_VERIFIED/);
  assert.throws(() => deriveIntakeCandidateVerification({ registration: registration({ provider: '' }), record: record() }),
    /CANDIDATE_VERIFICATION_REGISTRATION_IDENTITY_REQUIRED/);
  assert.throws(() => deriveIntakeCandidateVerification({ registration: registration({ source_version_id: '' }), record: record() }),
    /CANDIDATE_VERIFICATION_REGISTRATION_INVALID/);
});

test('Y03 核查：权利只如实登记现状，不在本工序裁决', async () => {
  // 真实登记的 rights 往往只有一个自述 status：九个动作因此全是 unknown。
  const unknown = deriveIntakeCandidateVerification({
    registration: registration(), record: record(), expansions: sourced() });
  assert.equal(unknown.checks.rights.declared_actions.length, 0);
  assert.equal(unknown.checks.rights.unknown_actions.length, 9);
  assert.equal(unknown.verdict, 'admissible', '权利未核不改变 Y03 的时空异名结论');
  // 显式拒绝只记录，不用它冒充 Gate 裁决。
  const denied = deriveIntakeCandidateVerification({
    registration: registration({ rights: { machine_read: 'denied', display: 'allowed' } }),
    record: record(), expansions: sourced() });
  assert.deepEqual(denied.checks.rights.denied_actions, ['machine_read']);
  assert.deepEqual(denied.checks.rights.declared_actions.sort(), ['display', 'machine_read']);
});
