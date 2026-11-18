import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveSourceIdentityStratification, IDENTITY_STRATIFICATION_SCHEMA,
  INTAKE_IDENTITY_METHOD, INTAKE_IDENTITY_METHOD_VERSION }
  from '../../pipelines/data-production/workers/source-identity-stratification.mjs';

// Y05 的身份分层只从本次准入真值派生，逐层标 known/unknown 与证据；
// 没读到的层如实 unknown，不拿提供方冒充收藏，不拿单页冒充版本。
const SHA = 'a'.repeat(64);
const REV = 'c'.repeat(64);
const ID = '11111111-1111-4111-8111-111111111111';
const registration = (overrides = {}) => ({
  original_id: ID,
  source_id: '22222222-2222-4222-8222-222222222222',
  source_version_id: '33333333-3333-4333-8333-333333333333',
  raw_item_id: '44444444-4444-4444-8444-444444444444',
  sha256: SHA, byte_size: 8, content_type: 'image/jpeg',
  provider: '国立公文书馆（NAJ)', title: '松江府志7',
  source_type: 'gazetteer', carrier_type: 'scanned_page',
  original_locator: { item: 4252790, catalog_no: 'NAJDA-292-0017' },
  source_version_artifact_revision: REV,
  ...overrides,
});
const record = (overrides = {}) => ({
  state: 'STORED_VERIFIED', sha256: SHA, byte_size: 8, content_type: 'image/jpeg', ...overrides,
});
const layerOf = (result, name) => result.layers.find((layer) => layer.layer === name);

test('Y05 分层：已读层逐层带证据，没读的收藏如实 unknown', () => {
  const result = deriveSourceIdentityStratification({ registration: registration(), record: record() });
  assert.equal(result.schema, IDENTITY_STRATIFICATION_SCHEMA);
  assert.equal(result.method, `${INTAKE_IDENTITY_METHOD}@${INTAKE_IDENTITY_METHOD_VERSION}`);
  assert.equal(result.layers.length, 7);
  assert.equal(layerOf(result, 'provider').state, 'known');
  assert.equal(layerOf(result, 'provider').value.name, '国立公文书馆（NAJ)');
  assert.equal(layerOf(result, 'collection').state, 'unknown');
  assert.deepEqual(layerOf(result, 'collection').evidence, ['not_read:this_intake']);
  assert.equal(layerOf(result, 'catalog_record').state, 'known');
  assert.equal(layerOf(result, 'catalog_record').value.catalog_no, 'NAJDA-292-0017');
  assert.equal(layerOf(result, 'catalog_record').value.item, 4252790);
  assert.equal(layerOf(result, 'work').value.title, '松江府志7');
  assert.equal(layerOf(result, 'version').value.source_version_id, registration().source_version_id);
  assert.equal(layerOf(result, 'version').value.artifact_revision, REV);
  assert.equal(layerOf(result, 'holding').state, 'unknown');
  assert.deepEqual(layerOf(result, 'holding').evidence, ['not_in_registration:original_locator.holding_institution']);
  assert.equal(layerOf(result, 'digital_asset').value.sha256, SHA);
  assert.equal(layerOf(result, 'digital_asset').value.storage_state, 'STORED_VERIFIED');
  assert.deepEqual(result.dependencies.unresolved, ['collection', 'holding']);
  assert.deepEqual(result.dependencies.digital_asset_depends_on, ['version']);
  assert.deepEqual(result.dependencies.version_depends_on, ['work']);
  assert.deepEqual(result.dependencies.work_identified_by, ['catalog_record']);
});

test('Y05 分层：登记没给馆方目录号时目录记录层如实 unknown', () => {
  const result = deriveSourceIdentityStratification({
    registration: registration({ original_locator: {} }), record: record() });
  assert.equal(layerOf(result, 'catalog_record').state, 'unknown');
  assert.deepEqual(layerOf(result, 'catalog_record').evidence,
    ['not_in_registration:original_locator.catalog_no_or_item']);
  assert.equal(layerOf(result, 'holding').state, 'unknown');
  assert.deepEqual(result.dependencies.unresolved.sort(), ['catalog_record', 'collection', 'holding']);
});

test('Y05 藏所：必须有显式馆藏机构和目录定位，不能用提供方代替', () => {
  const known = deriveSourceIdentityStratification({
    registration: registration({ original_locator: { ...registration().original_locator, holding_institution: '国立公文书馆' } }), record: record() });
  assert.equal(layerOf(known, 'holding').state, 'known');
  assert.equal(layerOf(known, 'holding').value.institution, '国立公文书馆');
  assert.deepEqual(layerOf(known, 'holding').evidence,
    ['registration.original_locator.holding_institution', 'registration.original_locator']);
  assert.deepEqual(known.dependencies.unresolved, ['collection']);

  const topLevelOnly = deriveSourceIdentityStratification({
    registration: registration({ holding_institution: '国立公文书馆' }), record: record() });
  assert.equal(layerOf(topLevelOnly, 'holding').state, 'unknown');

  const missingLocator = deriveSourceIdentityStratification({
    registration: registration({ original_locator: { holding_institution: '国立公文书馆' } }), record: record() });
  assert.equal(layerOf(missingLocator, 'holding').state, 'unknown');
  assert.deepEqual(missingLocator.dependencies.unresolved.sort(), ['catalog_record', 'collection', 'holding']);
});

test('Y05 分层：版本没有不可变修订就不是身份，失败关闭', () => {
  assert.throws(() => deriveSourceIdentityStratification({
    registration: registration({ source_version_artifact_revision: '' }), record: record() }),
    /IDENTITY_VERSION_REVISION_INVALID/);
  assert.throws(() => deriveSourceIdentityStratification({
    registration: registration({ source_version_artifact_revision: 'not-hex' }), record: record() }),
    /IDENTITY_VERSION_REVISION_INVALID/);
});

test('Y05 分层：缺身份锚点或登记身份不全即失败关闭', () => {
  assert.throws(() => deriveSourceIdentityStratification({ record: record() }),
    /IDENTITY_REGISTRATION_REQUIRED/);
  assert.throws(() => deriveSourceIdentityStratification({ registration: registration() }),
    /IDENTITY_ORIGINAL_REQUIRED/);
  assert.throws(() => deriveSourceIdentityStratification({
    registration: registration({ provider: '  ' }), record: record() }), /IDENTITY_ANCHOR_REQUIRED/);
  assert.throws(() => deriveSourceIdentityStratification({
    registration: registration({ title: '' }), record: record() }), /IDENTITY_ANCHOR_REQUIRED/);
  assert.throws(() => deriveSourceIdentityStratification({
    registration: registration({ source_version_id: '' }), record: record() }),
    /IDENTITY_REGISTRATION_INVALID/);
});

test('Y05 分层：登记与原件不复核一致即失败关闭，不在未核字节上分层', () => {
  assert.throws(() => deriveSourceIdentityStratification({ registration: registration(),
    record: record({ state: 'STORED' }) }), /IDENTITY_ORIGINAL_NOT_VERIFIED/);
  assert.throws(() => deriveSourceIdentityStratification({ registration: registration(),
    record: record({ sha256: 'b'.repeat(64) }) }), /IDENTITY_ORIGINAL_NOT_VERIFIED/);
  assert.throws(() => deriveSourceIdentityStratification({ registration: registration(),
    record: record({ byte_size: 9 }) }), /IDENTITY_ORIGINAL_NOT_VERIFIED/);
});
