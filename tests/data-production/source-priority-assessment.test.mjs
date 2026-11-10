import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveIntakePriority, PRIORITY_ASSESSMENT_SCHEMA,
  INTAKE_PRIORITY_METHOD, INTAKE_PRIORITY_METHOD_VERSION }
  from '../../pipelines/data-production/workers/source-priority-assessment.mjs';

// Y06 的处置只由 Y03 核查结论决定：admissible→selected、needs_owner→deferred、
// rejected→excluded；五维各带依据，未评估如实 unknown，绝不放宽结论。
const registration = (overrides = {}) => ({
  provider: '国立公文书馆（NAJ)', title: '松江府志7',
  rights: { status: 'public_domain_secondary_use' },
  ...overrides,
});
const verification = (overrides = {}) => ({
  verdict: 'needs_owner', reasonCode: 'Y03_EXPANSION_UNASSESSED:place_name,era',
  checks: { named_expansions: { provided: 0, dimensions: [], unresolved: ['place_name', 'era'], items: [] } },
  ...overrides,
});

test('Y06 处置：needs_owner 只能 deferred，理由可回读 Y03 结论', () => {
  const result = deriveIntakePriority({ registration: registration(), verification: verification() });
  assert.equal(result.decision, 'deferred');
  assert.match(result.rationale, /needs_owner/);
  assert.match(result.rationale, /Y03_EXPANSION_UNASSESSED:place_name,era/);
  assert.match(result.rationale, /不放宽为 selected/);
  assert.equal(result.methodKey, INTAKE_PRIORITY_METHOD);
  assert.equal(result.methodVersion, INTAKE_PRIORITY_METHOD_VERSION);
  assert.equal(result.criteria.schema, PRIORITY_ASSESSMENT_SCHEMA);
  // 五维各带依据：机构身份与权利现状是准入已知的，其余如实 unknown。
  assert.equal(result.criteria.authority.state, 'known');
  assert.match(result.criteria.authority.note, /国立公文书馆/);
  assert.equal(result.criteria.rights.state, 'known');
  assert.equal(result.criteria.relevance.state, 'unknown');
  assert.equal(result.criteria.coverage.state, 'unknown');
  assert.match(result.criteria.coverage.note, /place_name,era/);
  assert.equal(result.criteria.freshness.state, 'unknown');
});

test('Y06 处置：admissible 才允许 selected，rejected 即 excluded', () => {
  const admissible = deriveIntakePriority({ registration: registration(),
    verification: verification({ verdict: 'admissible', reasonCode: 'Y03_EXPANSION_SOURCED' }) });
  assert.equal(admissible.decision, 'selected');
  assert.match(admissible.rationale, /admissible→selected/);
  assert.doesNotMatch(admissible.rationale, /不放宽/);
  const rejected = deriveIntakePriority({ registration: registration(),
    verification: verification({ verdict: 'rejected', reasonCode: 'Y03_IDENTITY_MISMATCH' }) });
  assert.equal(rejected.decision, 'excluded');
  assert.match(rejected.rationale, /rejected→excluded/);
});

test('Y06 处置：核查结论缺失或越界即失败关闭，不给无依据的处置', () => {
  assert.throws(() => deriveIntakePriority({}), /PRIORITY_REGISTRATION_REQUIRED/);
  assert.throws(() => deriveIntakePriority({ registration: registration({ provider: ' ' }),
    verification: verification() }), /PRIORITY_PROVIDER_REQUIRED/);
  assert.throws(() => deriveIntakePriority({ registration: registration() }),
    /PRIORITY_VERIFICATION_REQUIRED/);
  assert.throws(() => deriveIntakePriority({ registration: registration(),
    verification: verification({ verdict: 'approved' }) }), /PRIORITY_VERIFICATION_VERDICT_INVALID/);
  assert.throws(() => deriveIntakePriority({ registration: registration(),
    verification: verification({ verdict: '' }) }), /PRIORITY_VERIFICATION_VERDICT_INVALID/);
  assert.throws(() => deriveIntakePriority({ registration: registration(),
    verification: verification({ reasonCode: ' ' }) }), /PRIORITY_VERIFICATION_REASON_REQUIRED/);
});

test('Y06 处置：权利只如实登记逐动作现状，缺失动作列入 unknown', () => {
  const result = deriveIntakePriority({ registration: registration({
    rights: { access_view: 'allowed', display: 'denied' } }), verification: verification() });
  assert.deepEqual(result.criteria.rights.declared_actions.sort(), ['access_view', 'display']);
  assert.deepEqual(result.criteria.rights.denied_actions, ['display']);
  assert.ok(result.criteria.rights.unknown_actions.length > 0,
    '九动作里没给依据的必须如实列入 unknown');
});
