import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveFactWorldProjection, createD05FactPublishReadModels, HELD_FACT_METHODS } from '../../pipelines/data-production/orchestrator/d05-fact-publish.mjs';

const finding = '7f713c60-548b-0395-c8c8-76303e46b1c3';
const claim = '0617b049-1111-4111-8111-111111111111';
const original = 'f474b91b-07f0-47ab-94dc-20dc7f55e518';
const g4 = 'ec893e90-ddfd-4cc3-b6cc-685ca4a85f11';
const g3 = 'f1d9163e-3111-4b2b-86ba-7a06ad1bf78b';
const sha = 'a'.repeat(64);
const facts = { findingId: finding, claimRevisionId: claim, originalId: original, g4AuditId: g4, g3AuditId: g3,
  findingMethodId: 'A06', interpretiveStatement: '依据当前 G3 合格世界对象：材料记载朱家角为明清棉布与米市重镇。',
  assertion: '朱家角位于县境中部，为镇人民政府驻地。', sourceVoice: 'official_gazetteer',
  g4ArtifactRevision: sha, g3ArtifactRevision: sha };

test('D05 fact projection is deterministic and carries zero-provider lineage', () => {
  const a = deriveFactWorldProjection(facts);
  const b = deriveFactWorldProjection(facts);
  assert.deepEqual(a, b);
  assert.equal(a.projection_key, `d05-fact-${claim.slice(0, 8)}-${finding.slice(0, 8)}`);
  assert.equal(a.payload.method_trace.method_id, 'P02');
  assert.equal(a.payload.method_trace.provider_calls, 0);
  assert.equal(a.payload.qualification, 'UNASSESSED');
  assert.equal(a.payload.lineage.g4_audit_id, g4);
  assert.equal(a.payload.lineage.g3_audit_id, g3);
  assert.ok(a.payload.facts[0].assertion.includes('朱家角'));
  assert.deepEqual(a.payload.evidence_refs.map((r) => r.kind), ['claim_revision', 'finding']);
});

test('D05 fact projection fails closed on bad binding / size', () => {
  assert.throws(() => deriveFactWorldProjection({ ...facts, findingMethodId: 'P02' }), /D05_FACT_METHOD_INVALID/);
  assert.throws(() => deriveFactWorldProjection({ ...facts, g4AuditId: 'bad' }), /D05_FACT_G4_AUDIT_INVALID/);
  assert.throws(() => deriveFactWorldProjection({ ...facts, assertion: '' }), /D05_FACT_ASSERTION_INVALID/);
  assert.throws(() => deriveFactWorldProjection({ ...facts, interpretiveStatement: 'x'.repeat(6000) }), /D05_FACT_STATEMENT_INVALID/);
});

test('injected publishReadModels emits only P02 world_projections and holds P03/P06', async () => {
  const publish = createD05FactPublishReadModels();
  const projection = deriveFactWorldProjection(facts);
  const reply = await publish({ job: { methods: ['P02', 'P03', 'P06'] }, input: { projection } });
  assert.equal(reply.candidates.world_projections.length, 1);
  assert.equal(reply.candidates.map_timeline_projections.length, 0);
  assert.equal(reply.candidates.evidence_pointers.length, 0);
  assert.equal(reply.stats.provider_calls, 0);
  assert.deepEqual(reply.reviews.map((r) => r.method_id).sort(), ['P03', 'P06']);
  assert.ok(reply.reviews.every((r) => r.reason_code === 'METHOD_BINDING_HELD'));
});

test('injected publishReadModels fails closed without a projection or with unknown method', async () => {
  const publish = createD05FactPublishReadModels();
  await assert.rejects(publish({ job: { methods: ['P02'] }, input: {} }), /D05_FACT_PROJECTION_UNAVAILABLE/);
  await assert.rejects(publish({ job: { methods: ['P99'] }, input: {} }), /D05_FACT_UNKNOWN_METHOD/);
  assert.deepEqual(Object.keys(HELD_FACT_METHODS).sort(), ['P03', 'P06']);
});
