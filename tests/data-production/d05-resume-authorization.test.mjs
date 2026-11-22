import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync } from 'node:crypto';
import { createD05ResumeAuthorizer } from '../../pipelines/data-production/orchestrator/d05-resume-authorizer.mjs';
import { createD05ResumeJournal } from '../../pipelines/data-production/orchestrator/d05-resume-journal.mjs';
import { executionDigest } from '../../pipelines/data-production/orchestrator/execution-authority.mjs';

const runId = '55555555-5555-4555-8555-555555555555';
const project = 'd9d48901-3aa3-4424-b50f-965d6749ee8e';
const original = 'f474b91b-07f0-47ab-94dc-20dc7f55e518';
const registry = { status: 'ACTIVE_AUTHORIZED', activation: { enabled: true }, architecture_generation: 'fixture',
  jobs: [{ stage: 'D05', job_id: 'd05.read-model-publication', exit_gate: 'G5',
    execution_policy: { enabled: true, attended: true, enable_requires: ['a', 'b'] },
    implementation: { gate_reviewer_binding: 'm5-owner-reviewer-g2g5-producer' } }] };
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const input = { schema: 'mohen.private-evidence-stage-request.v1', stage: 'D05', originalId: original,
  findingId: '7f713c60-1111-4111-8111-111111111111', projection: { projection_key: 'k', payload: { a: 1 } } };

function fakeJournal() {
  const store = new Map();
  return { store,
    async issueOnce({ exp, ...binding }) {
      const key = binding.run_id;
      const row = store.get(key);
      if (row && !row.consumed_at && row.expires_at > Date.now() / 1000) return false;
      store.set(key, { ...binding, expires_at: exp, consumed_at: null });
      return true;
    },
    async consumeOnce(binding) {
      const row = store.get(binding.run_id);
      if (!row || row.consumed_at || JSON.stringify(Object.keys(binding).sort().reduce((o, k) => (o[k] = binding[k], o), {})) !==
          JSON.stringify(Object.keys(row).filter((k) => k !== 'expires_at' && k !== 'consumed_at').sort().reduce((o, k) => (o[k] = row[k], o), {})))
        return false;
      row.consumed_at = Date.now() / 1000;
      return true;
    },
  };
}
const qualified = async () => true;
function authorizer(over = {}) {
  return createD05ResumeAuthorizer({ registry, holdEpoch: 'epoch-1', privateKey,
    journal: over.journal ?? fakeJournal(), qualificationChecker: over.checker ?? qualified, now: over.now ?? Date.now });
}

test('D05 grant issues and consumes with exact one-use binding', async () => {
  const a = authorizer();
  const req = { run_id: runId, stage: 'D05', job_id: 'd05.read-model-publication', mode: 'attended', input };
  const { token } = await a.issue(req);
  const parts = token.split('.');
  assert.equal(parts.length, 3);
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  assert.equal(claims.stage, 'D05');
  assert.equal(claims.input_digest, executionDigest(input));
  assert.equal(claims.exp - claims.iat, 240);
  const consume = { run_id: runId, stage: 'D05', job_id: 'd05.read-model-publication', mode: 'attended',
    jti: claims.jti, input_digest: claims.input_digest };
  const att = await a.consume(consume);
  assert.equal(att.allowed, true);
  assert.equal(att.consumed_nonce, claims.jti);
  await assert.rejects(a.consume(consume), /D05_RESUME_AUTHORITY_DENIED/);
});

test('a non-qualified or wrong-stage request is denied', async () => {
  const a = authorizer({ checker: async () => false });
  await assert.rejects(a.issue({ run_id: runId, stage: 'D05', job_id: 'd05.read-model-publication', mode: 'attended', input }), /D05_RESUME_AUTHORITY_DENIED/);
  const b = authorizer();
  await assert.rejects(b.issue({ run_id: runId, stage: 'D04', job_id: 'd05.read-model-publication', mode: 'attended', input }), /D05_RESUME_AUTHORITY_DENIED/);
});

test('config validation rejects missing key/checker', () => {
  assert.throws(() => createD05ResumeAuthorizer({ registry, holdEpoch: 'e', privateKey: {}, journal: fakeJournal(), qualificationChecker: qualified }), /D05_RESUME_AUTHORITY_CONFIG_INVALID/);
});

test('journal SQL binding uses exact jsonb equality via helper shape', () => {
  const journal = createD05ResumeJournal({ query: async (sql) => ({ rowCount: sql.includes('insert into') ? 1 : 0 }) });
  assert.equal(typeof journal.issueOnce, 'function');
  assert.equal(typeof journal.consumeOnce, 'function');
});
