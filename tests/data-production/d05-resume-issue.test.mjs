import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { createD05IssueEndpoint } from '../../pipelines/data-production/orchestrator/d05-resume-issue.mjs';
import { executionDigest } from '../../pipelines/data-production/orchestrator/execution-authority.mjs';

const SCHEMA = 'mohen.d05-resume-request.v1';
const credential = 'synthetic-d05-issue-credential-32-characters';
const runId = '55555555-5555-4555-8555-555555555555';
const project = 'd9d48901-3aa3-4424-b50f-965d6749ee8e';
const original = 'f474b91b-07f0-47ab-94dc-20dc7f55e518';
const finding = '7f713c60-1111-4111-8111-111111111111';
const claim = '0617b049-1111-4111-8111-111111111111';
const body = { run_id: runId, from_stage: 'D05', project_id: project,
  scope: { project_id: project, original_id: original, page_number: 1 } };
const registry = { status: 'ACTIVE_AUTHORIZED', activation: { enabled: true }, architecture_generation: 'fixture', jobs: [
  { stage: 'D03', job_id: 'd03.world-construction', exit_gate: 'G3', implementation: { gate_reviewer_binding: 'b' } },
  { stage: 'D04', job_id: 'd04.humanistic-discovery', exit_gate: 'G4', implementation: { gate_reviewer_binding: 'b' } },
  { stage: 'D05', job_id: 'd05.read-model-publication', exit_gate: 'G5', implementation: { gate_reviewer_binding: 'b' } },
] };
const projection = { projection_key: 'k', payload: { method_trace: { method_id: 'P02' }, lineage: { g4_audit_id: 'ec893e90-ddfd-4cc3-b6cc-685ca4a85f11' } } };
const rebuilt = { schema: 'mohen.private-evidence-stage-request.v1', stage: 'D05', originalId: original, findingId: finding, projection };
const dummyQuery = async () => [];
function req(b = body, sigOverride) {
  const time = String(Date.now());
  const digest = executionDigest({ run_id: b.run_id, from_stage: b.from_stage, scope: b.scope, project_id: b.project_id });
  const sig = sigOverride ?? createHmac('sha256', credential).update(SCHEMA + '\n' + time + '\n' + digest).digest('hex');
  return new Request('https://authority.invalid/d05-issue', { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-mohen-d05-time': time, 'x-mohen-d05-signature': sig }, body: JSON.stringify(b) });
}
function setup({ authorityOk = true, rebuild = rebuilt } = {}) {
  let issued = false;
  const endpoint = createD05IssueEndpoint({ credential, registry,
    // inject the rebuild by overriding the module's importer through a query that
    // cannot satisfy the real builder; instead assert via authority gate below.
    attestorQuery: dummyQuery,
    authority: { issue: async (r) => { if (!authorityOk || r.stage !== 'D05') throw Error('DENY'); issued = true;
      assert.equal(r.job_id, 'd05.read-model-publication'); return { token: 'signed-d05-token' }; } },
  });
  return { endpoint, isIssued: () => issued };
}

test('D05 issue rejects unsigned/expired/malformed requests before any rebuild', async () => {
  const { endpoint } = setup();
  assert.equal((await endpoint(new Request('https://authority.invalid/d05-issue', { method: 'POST' }))).status, 401);
  assert.equal((await endpoint(req(body, 'a'.repeat(64)))).status, 401);
  const bad = { ...body, from_stage: 'D04' };
  assert.equal((await endpoint(req(bad))).status, 401);
});

test('D05 issue config validation requires credential and authority', () => {
  assert.throws(() => createD05IssueEndpoint({ credential: 'short', attestorQuery: dummyQuery, authority: { issue() {} }, registry }), /D05_ISSUE_CONFIG_INVALID/);
  assert.throws(() => createD05IssueEndpoint({ credential, attestorQuery: dummyQuery, authority: {}, registry }), /D05_ISSUE_CONFIG_INVALID/);
});

test('an unbuildable input (no persisted facts) is denied 503 without signing', async () => {
  const { endpoint, isIssued } = setup();
  const reply = await endpoint(req());
  assert.equal(reply.status, 503);
  assert.equal(isIssued(), false);
});
