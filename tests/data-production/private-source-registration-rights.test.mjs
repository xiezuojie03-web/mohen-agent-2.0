import assert from 'node:assert/strict';
import test from 'node:test';
import { validRegistration } from '../../packages/data-access/src/private-source-registration-repository.mjs';

const sha = 'a'.repeat(64);
const originalId = 'f474b91b-07f0-47ab-94dc-20dc7f55e518';
const registry = (overrides = {}) => ({
  schema: 'mohen.private-source-registration.v1',
  original_id: originalId,
  project_id: 'd9d48901-3aa3-4424-b50f-965d6749ee8e',
  source_id: '9aa03207-6d60-4984-8c1f-347df2532842',
  source_version_id: '36ea7ffc-d5bd-4dd2-909f-ab0724b0b1d3',
  raw_item_id: 'c26c07cc-7d1e-4d6e-9a4d-1f8b4a8f1d3f',
  asset_revision_id: 'a3f1d1f4-7c5d-4a1b-9d43-2a0c8c1f6b7e',
  sha256: sha,
  byte_size: 1259,
  content_type: 'text/plain',
  storage_ref: 'private/f474b91b',
  artifact_revision: sha,
  source_version_artifact_revision: sha,
  rights: {},
  rights_snapshot: { machine_read: 'allowed', retain: 'allowed', external_processing: 'unknown' },
  rights_by_action: { machine_read: 'allowed', retain: 'allowed', external_processing: 'unknown' },
  rights_evidence: {},
  original_locator: {},
  provenance_status: 'PRIVATE_ORIGINAL_VERIFIED',
  content_availability: 'PRIVATE_ORIGINAL_AVAILABLE',
  ...overrides
});
const decision = { decision: 'allowed', decided_at: '2026-11-22', decided_by: 'owner' };

test('a registration whose effective rights equal the pinned snapshot is valid', () => {
  assert.equal(validRegistration(registry(), originalId), true);
});

test('widening an unknown action is valid only with a complete recorded owner decision', () => {
  const widened = { machine_read: 'allowed', retain: 'allowed', external_processing: 'allowed' };
  assert.equal(validRegistration(registry({ rights_by_action: widened,
    rights_evidence: { external_processing_decision: decision } }), originalId), true);
  assert.equal(validRegistration(registry({ rights_by_action: widened }), originalId), false);
  assert.equal(validRegistration(registry({ rights_by_action: widened,
    rights_evidence: { external_processing_decision: { ...decision, decision: 'unknown' } } }), originalId), false);
  assert.equal(validRegistration(registry({ rights_by_action: widened,
    rights_evidence: { external_processing_decision: { decision: 'allowed', decided_by: 'owner' } } }), originalId), false);
  assert.equal(validRegistration(registry({ rights_by_action: widened,
    rights_evidence: { external_processing_decision: { decision: 'allowed', decided_at: '2026-11-22' } } }), originalId), false);
});

test('a pinned denied or restricted action is never widened, with or without evidence', () => {
  const pinned = { machine_read: 'allowed', external_processing: 'denied' };
  const widened = { machine_read: 'allowed', external_processing: 'allowed' };
  for (const pinnedValue of ['denied', 'restricted']) {
    assert.equal(validRegistration(registry({
      rights_snapshot: { ...pinned, external_processing: pinnedValue },
      rights_by_action: widened,
      rights_evidence: { external_processing_decision: decision } }), originalId), false);
  }
});

test('a downgrade of a pinned allowed action is rejected', () => {
  assert.equal(validRegistration(registry({
    rights_by_action: { machine_read: 'unknown', retain: 'allowed', external_processing: 'unknown' } }), originalId), false);
});

test('structurally invalid registrations stay rejected', () => {
  assert.equal(validRegistration(null, originalId), false);
  assert.equal(validRegistration(registry({ original_id: 'x' }), originalId), false);
  assert.equal(validRegistration(registry({ byte_size: 0 }), originalId), false);
  assert.equal(validRegistration(registry({ rights_by_action: [] }), originalId), false);
  assert.equal(validRegistration(registry({ rights_by_action: { bogus_action: 'allowed' } }), originalId), false);
});
