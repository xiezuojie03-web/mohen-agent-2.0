import test from 'node:test';
import assert from 'node:assert/strict';
import { createInProcessGateReaderVerifier, createOptionalInProcessGateReaderVerifier } from '../../pipelines/data-production/orchestrator/inprocess-gate-reader-verifier.mjs';
import { requireIndependentStageQualification } from '../../pipelines/data-production/orchestrator/independent-stage-qualification.mjs';

const URL = 'postgresql://mohen_d00_gate_reader_login:pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';
const CREDENTIAL = 'synthetic-consume-capability-credential-at-least-32';
const AUDIT = '888db9e6-87bd-42b5-a932-4489e0270a5b';
const RUNID = 'bfcdfad6-bbcb-4b68-946a-82e1302eeb80';
const OBJECT = '67839b1e-a344-4dd4-adf8-f7798ddf82d7';
const IN = 'a'.repeat(64), OUT = 'b'.repeat(64);
const receipt = {
  schema: 'mohen.independent-gate-current-receipt.v1', qualification_current: true,
  decision_origin: 'independent_gate', result: 'PASS', run_id: RUNID, stage: 'D00', gate_code: 'G0',
  job_id: 'd00.source-intake', reviewer_binding_ref: 'm5-owner-reviewer-g0g1-producer', consumer: 'producer',
  input_digest: IN, output_digest: OUT, gate_audit_id: AUDIT, object_type: 'source_version', object_id: OBJECT,
  artifact_revision: 'f'.repeat(64), qualification_digest: 'e'.repeat(64),
  valid_until: new Date(Date.now() + 3600000).toISOString(),
};
function readerPool({ qualification = receipt, authenticate = true } = {}) {
  const events = [];
  const client = {
    query: async (sql, args = []) => {
      events.push({ sql, args });
      if (sql.includes('pg_roles')) return { rows: [{ db_identity: 'mohen_d00_gate_reader_login',
        login_identity: 'mohen_d00_gate_reader_login', can_login: true, member: true, unsafe_membership: false }] };
      if (sql.includes('authenticate_gate_service')) return { rows: [{ credential: authenticate ? {
        principal_user_id: '270bcecf-9bfb-4865-9432-a0ac9db8df75', job_id: 'd00.source-intake',
        reviewer_binding_ref: 'm5-owner-reviewer-g0g1-producer', gate_code: 'G0', consumer: 'producer',
        purpose_namespace: 'data-production', purpose_code: 'm5-remediation', purpose_version: 'v1',
        allowed_scope: { project_id: 'e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5' },
        valid_until: new Date(Date.now() + 3600000).toISOString() } : null }] };
      if (sql.includes('read_gate_stage_qualification')) return { rows: [{ receipt: qualification }] };
      if (sql === 'commit') return { command: 'COMMIT', rows: [] };
      return { rows: [] };
    },
    release: () => events.push({ sql: 'release' }),
  };
  return { events, connect: async () => client, end: async () => {} };
}
const run = { run_id: RUNID };
const job = { job_id: 'd00.source-intake', stage: 'D00', implementation: { gate_reviewer_binding: 'm5-owner-reviewer-g0g1-producer' } };
const input = { probe: 'in' }, output = { schema: 'mohen.private-evidence-stage-request.v1', stage: 'D01' };
// executionDigest is stable over these small objects; derive expected digests from the same module.
import { executionDigest } from '../../pipelines/data-production/orchestrator/execution-authority.mjs';
const expectedIn = executionDigest(input), expectedOut = executionDigest(output);
const matchedReceipt = { ...receipt, input_digest: expectedIn, output_digest: expectedOut };

test('in-process verifier calls read-only /current on reader pool and yields an orchestrator-valid receipt', async () => {
  const pool = readerPool({ qualification: matchedReceipt });
  const verify = createInProcessGateReaderVerifier({
    readerDatabaseUrl: URL, credential: CREDENTIAL, poolFactory: () => pool });
  const got = await verify({ run, job, stage: 'D00', gate: 'G0', input, output,
    input_digest: expectedIn, output_digest: expectedOut });
  assert.deepEqual(got, matchedReceipt);
  assert.ok(pool.events.some(e => e.sql.includes('authenticate_gate_service') && e.args[1] === 'consume'));
  assert.ok(pool.events.some(e => e.sql.includes('read_gate_stage_qualification')));
  assert.ok(!pool.events.some(e => e.sql.includes('sign_gate_candidate')));
  const bound = await requireIndependentStageQualification({
    context: { verifyStageQualification: verify }, run, stage: 'D00', job, input,
    result: { disposition: 'PASS', outputs: { qualified_source: output } },
  });
  assert.equal(bound.gate_audit_id, AUDIT);
  assert.equal(bound.input_digest, expectedIn);
  assert.equal(bound.output_digest, expectedOut);
  await verify.close();
});

test('no receipt / no credential never becomes a fallback PASS', async () => {
  for (const qualification of [null, { ...matchedReceipt, qualification_current: false },
    { ...matchedReceipt, output_digest: 'f'.repeat(64) }]) {
    const pool = readerPool({ qualification });
    const verify = createInProcessGateReaderVerifier({ readerDatabaseUrl: URL,
      credential: CREDENTIAL, poolFactory: () => pool });
    // A denied/absent receipt surfaces as an error from the client or as an
    // invalid receipt from the orchestrator; neither may become a PASS.
    await assert.rejects(requireIndependentStageQualification({
      context: { verifyStageQualification: verify }, run, stage: 'D00', job, input,
      result: { disposition: 'PASS', outputs: { qualified_source: output } },
    }));
  }
});

test('unsafe reader identity and privileged DB user are refused at construction', async () => {
  assert.throws(() => createInProcessGateReaderVerifier({ readerDatabaseUrl:
    'postgresql://postgres:pw@db.example:5432/postgres', credential: CREDENTIAL }),
    /INPROCESS_GATE_READER_ROLE_REQUIRED/);
  assert.throws(() => createInProcessGateReaderVerifier({ readerDatabaseUrl: URL, credential: 'short' }),
    /INPROCESS_GATE_READER_CONFIG_REQUIRED/);
});

test('optional env factory returns null without both reader URL and credential; no fallback', () => {
  assert.equal(createOptionalInProcessGateReaderVerifier({}), null);
  assert.equal(createOptionalInProcessGateReaderVerifier({ MOHEN_RUNNER_GATE_READER_DATABASE_URL: URL }), null);
  assert.equal(createOptionalInProcessGateReaderVerifier({ MOHEN_RUNNER_GATE_CONSUME_CREDENTIAL: CREDENTIAL }), null);
});
