import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveIntakeCatalogEntry, CATALOG_OBSERVATION_SCHEMA,
  INTAKE_DISCOVERY_METHOD, INTAKE_DISCOVERY_METHOD_VERSION }
  from '../../pipelines/data-production/workers/source-catalog-observation.mjs';

// Y02 的目录观察只从本次准入已核验的登记真值派生；读不到的保持缺失，不补默认。
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

test('Y02 目录观察登记本次真实读到的身份、目录号、载体与权利线索', async () => {
  const entry = deriveIntakeCatalogEntry({ registration: registration(), record: record() });
  assert.equal(entry.provider, '国立公文书馆（NAJ)');
  assert.equal(entry.catalogTitle, '松江府志7');
  assert.equal(entry.catalogIdentifier, 'NAJDA-292-0017');
  assert.equal(entry.carrierHint, 'scanned_page');
  assert.equal(entry.language, null, '本次准入没有读语言真值');
  assert.deepEqual(entry.coverageHint, { content_availability: 'image_scan' });
  assert.deepEqual(entry.rightsHint, { basis: 'NAJ_secondary_use_policy', status: 'public_domain_secondary_use' });
  assert.equal(entry.availabilityState, 'catalog_found');
  assert.equal(entry.discoveredByMethod, INTAKE_DISCOVERY_METHOD);
  assert.equal(entry.methodVersion, INTAKE_DISCOVERY_METHOD_VERSION);
  assert.equal(entry.evidenceRef.schema, CATALOG_OBSERVATION_SCHEMA);
  assert.equal(entry.evidenceRef.original_id, ID);
  assert.equal(entry.evidenceRef.provenance_status, 'verified');
  assert.equal(entry.evidenceRef.sha256, SHA);
});

test('Y02 目录观察在登记缺目录号或内容形态时如实留空，不编一个', async () => {
  const entry = deriveIntakeCatalogEntry({
    registration: registration({ original_locator: null, content_availability: null }),
    record: record(),
  });
  assert.equal(entry.catalogIdentifier, null);
  assert.deepEqual(entry.coverageHint, {});
});

test('Y02 目录观察复核"在册且字节已核验"，不复核一致就失败关闭', async () => {
  assert.throws(() => deriveIntakeCatalogEntry({ registration: registration(), record: record({ state: 'STORED' }) }),
    /SOURCE_CATALOG_ORIGINAL_NOT_VERIFIED/);
  assert.throws(() => deriveIntakeCatalogEntry({ registration: registration(), record: record({ sha256: 'c'.repeat(64) }) }),
    /SOURCE_CATALOG_ORIGINAL_NOT_VERIFIED/);
  assert.throws(() => deriveIntakeCatalogEntry({ registration: registration(), record: record({ content_type: 'text/plain' }) }),
    /SOURCE_CATALOG_ORIGINAL_NOT_VERIFIED/);
  assert.throws(() => deriveIntakeCatalogEntry({ registration: registration(), record: record({ byte_size: 9 }) }),
    /SOURCE_CATALOG_ORIGINAL_NOT_VERIFIED/);
});

test('Y02 目录观察在登记身份不完整时失败关闭，不替来源编身份', async () => {
  assert.throws(() => deriveIntakeCatalogEntry({}), /SOURCE_CATALOG_REGISTRATION_REQUIRED/);
  assert.throws(() => deriveIntakeCatalogEntry({ registration: registration() }), /SOURCE_CATALOG_ORIGINAL_REQUIRED/);
  assert.throws(() => deriveIntakeCatalogEntry({ registration: registration({ provider: '  ' }), record: record() }),
    /SOURCE_CATALOG_REGISTRATION_IDENTITY_REQUIRED/);
  assert.throws(() => deriveIntakeCatalogEntry({ registration: registration({ title: '' }), record: record() }),
    /SOURCE_CATALOG_REGISTRATION_IDENTITY_REQUIRED/);
  assert.throws(() => deriveIntakeCatalogEntry({ registration: registration({ source_version_id: '' }), record: record() }),
    /SOURCE_CATALOG_REGISTRATION_INVALID/);
});
