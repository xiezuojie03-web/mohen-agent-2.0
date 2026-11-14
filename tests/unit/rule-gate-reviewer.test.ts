import { describe, expect, it } from 'vitest';
import {
  createRuleGateReviewer,
  PROJECT_ID,
  RULE_VERSION_BY_GATE,
} from '../../tools/rule-gate-reviewer.mjs';
import {
  MACHINE_REVIEWER_USER_ID,
  MACHINE_SIGNER_LOGIN,
  MAX_SESSION_TTL_MS,
  mintMachineSessionToken,
} from '../../tools/machine-reviewer-session.mjs';
import { buildMethodPlanRefs } from '../../packages/data-access/src/method-plan-ref.mjs';

const REVISION = 'a'.repeat(64);
const AUDIT_ID = '11111111-1111-4111-8111-111111111111';
// 生产者侧真实产物：D00 收到的消费者方法计划 → G0 evidence_refs 里的类型化引用。
const PLAN_REFS = buildMethodPlanRefs({ methods: [{ method_id: 'C02', method_version: 'v1' }] });

type Call = { sql: string; params: Record<string, unknown> };

function candidateRow(overrides: Record<string, unknown> = {}) {
  return {
    candidate_id: 'cand-g0',
    gate_code: 'G0',
    stage: 'D00',
    object_type: 'source_version',
    object_id: 'sv-1',
    artifact_revision: REVISION,
    allowed_scope: JSON.stringify({ project_id: PROJECT_ID }),
    consumer: 'producer',
    evidence_refs: JSON.stringify([
      { kind: 'source_version', id: 'sv-1', artifact_revision: REVISION },
      ...PLAN_REFS,
    ]),
    dependency_snapshot: '[]',
    input_fingerprint: REVISION,
    submitted_at: '2026-11-07 21:16:00',
    ...overrides,
  };
}

/** DB-free query stub: every SQL statement is answered by an explicit handler. */
function makeQuery(handlers: Record<string, (params: Record<string, unknown>) => unknown>) {
  const calls: Call[] = [];
  const query = async (sql: string, params: Record<string, unknown> = {}) => {
    calls.push({ sql, params });
    for (const [marker, handler] of Object.entries(handlers)) {
      if (sql.includes(marker)) return handler(params);
    }
    throw Error(`unexpected query: ${sql}`);
  };
  return { query, calls };
}

function makeReviewer(query: unknown, extra: Record<string, unknown> = {}) {
  const decisions: Record<string, unknown>[] = [];
  const tokens: string[] = [];
  const lines: string[] = [];
  const reviewer = createRuleGateReviewer({
    query,
    decide: async (decision: Record<string, unknown>, token: string) => {
      decisions.push(decision);
      tokens.push(token);
      return AUDIT_ID;
    },
    mintToken: ({ uid }: { uid: string }) => `token:${uid}`,
    randomId: () => '22222222-2222-4222-8222-222222222222',
    now: () => Date.parse('2026-11-07T12:00:00Z'),
    log: (line: string) => lines.push(line),
    ...extra,
  });
  return { reviewer, decisions, tokens, lines };
}

const POLICIES: Record<string, string> = {
  G0: '{identity_version,rights_by_operation}',
  G1: '{identity_version,read_unit_binding}',
};

function policyHandler(params: Record<string, unknown>) {
  return [{ required_checks: POLICIES[String(params.gate)] ?? '{identity_version}', max_validity: '7 days' }];
}

function rightsRow(overrides: Record<string, unknown> = {}) {
  return {
    original_id: 'orig-1',
    original_state: 'STORED_VERIFIED',
    rights_declared: 't',
    source_id: 'src-1',
    // CP2-D：逐动作显式许可（唯一词典）。display / external_processing 故意留 unknown。
    rights_by_action: JSON.stringify({
      access_view: 'allowed',
      machine_read: 'allowed',
      retain: 'allowed',
      quote: 'allowed',
      display: 'unknown',
      external_processing: 'unknown',
    }),
    rights_evidence: JSON.stringify({
      basis: 'owner_authorization',
      owner_decision_at: '2026-11-08',
      scope: 'project_internal_research',
    }),
    ...overrides,
  };
}

describe('machine rule reviewer', () => {
  it('refuses a token for any foreign principal and enforces a ten minute ceiling', () => {
    expect(() => mintMachineSessionToken({ uid: '270bcecf-9bfb-4865-9432-a0ac9db8df75', secret: 'x'.repeat(64) }))
      .toThrow('MACHINE_TOKEN_FOR_FOREIGN_PRINCIPAL_FORBIDDEN');
    expect(() => mintMachineSessionToken({ uid: MACHINE_REVIEWER_USER_ID, ttlMs: MAX_SESSION_TTL_MS + 1, secret: 'x'.repeat(64) }))
      .toThrow('MACHINE_SESSION_TTL_INVALID');
    expect(() => mintMachineSessionToken({ uid: MACHINE_REVIEWER_USER_ID, secret: undefined }))
      .toThrow('MOHEN_DATABASE_SESSION_SECRET_REQUIRED');
    const token = mintMachineSessionToken({ uid: MACHINE_REVIEWER_USER_ID, secret: 'x'.repeat(64) });
    expect(token.split('.')).toHaveLength(2);
    expect(token).not.toContain(MACHINE_REVIEWER_USER_ID);
  });

  it('refuses to sign without a submitted candidate', async () => {
    const { query } = makeQuery({
      'control.gate_policy_versions': policyHandler,
      'from control.gate_candidates': () => [],
    });
    const { reviewer, decisions } = makeReviewer(query);
    await expect(reviewer.review({ gate: 'G0' })).rejects.toThrow('NO_SUBMITTED_CANDIDATE');
    expect(decisions).toHaveLength(0);
  });

  it('blocks gate-skipping through the fixed order guard', async () => {
    const { query } = makeQuery({
      'control.gate_policy_versions': policyHandler,
      'from control.gate_candidates': () => [candidateRow({ gate_code: 'G1', object_type: 'read_unit', object_id: 'ru-1' })],
    });
    const { reviewer, decisions } = makeReviewer(query);
    await expect(reviewer.review({ gate: 'G1' })).rejects.toThrow('GATE_ORDER_VIOLATION:missing_G0_dependency');
    expect(decisions).toHaveLength(0);
  });

  it('blocks a non-current upstream audit through the order guard', async () => {
    const dependency = { gate_audit_id: 'audit-g0', qualification_digest: 'digest-g0', artifact_revision: REVISION };
    const { query } = makeQuery({
      'control.gate_policy_versions': policyHandler,
      'from control.gate_candidates': () => [candidateRow({
        gate_code: 'G1',
        object_type: 'read_unit',
        object_id: 'ru-1',
        evidence_refs: JSON.stringify([{ kind: 'read_unit', id: 'ru-1' }, { kind: 'source_version', id: 'sv-1' }]),
        dependency_snapshot: JSON.stringify([dependency]),
      })],
      'a.qualification_digest': () => [{
        id: 'audit-g0', gate_code: 'G0', object_type: 'source_version', object_id: 'sv-1',
        artifact_revision: REVISION, result: 'PASS', decision_origin: 'independent_gate', consumer: 'producer',
        qualification_digest: 'digest-g0', current_valid: 'f',
      }],
    });
    const { reviewer, decisions } = makeReviewer(query);
    await expect(reviewer.review({ gate: 'G1' })).rejects.toThrow('GATE_ORDER_VIOLATION:G0_not_current');
    expect(decisions).toHaveLength(0);
  });

  it('does not sign when the artifact revision is no longer current', async () => {
    const { query } = makeQuery({
      'control.gate_policy_versions': policyHandler,
      'from control.gate_candidates': () => [candidateRow()],
      'control.artifact_revision_for': () => [{ revision: 'b'.repeat(64) }],
      'from source.source_versions v': () => [rightsRow()],
    });
    const { reviewer, decisions, lines } = makeReviewer(query);
    const outcome = await reviewer.review({ gate: 'G0' });
    expect(outcome.status).toBe('FAIL');
    expect(outcome.failed).toEqual(['identity_version']);
    expect(decisions).toHaveLength(0);
    expect(lines.join('\n')).toContain('artifact_revision_not_current');
  });

  it('does not sign when a required check has no evidence', async () => {
    const { query } = makeQuery({
      'control.gate_policy_versions': () => [{ required_checks: '{identity_version,read_unit_binding}', max_validity: '7 days' }],
      'from control.gate_candidates': () => [candidateRow()],
      'control.artifact_revision_for': () => [{ revision: REVISION }],
      'from source.read_units ru': () => [],
    });
    const { reviewer, decisions } = makeReviewer(query);
    const outcome = await reviewer.review({ gate: 'G0' });
    expect(outcome.status).toBe('FAIL');
    expect(outcome.failed).toEqual(['read_unit_binding']);
    expect(outcome.checks.read_unit_binding.reason).toBe('read_unit_missing');
    expect(decisions).toHaveLength(0);
  });

  it('fails closed when a policy declares a check it cannot verify', async () => {
    const { query } = makeQuery({
      'control.gate_policy_versions': () => [{ required_checks: '{identity_version,unmapped_check}', max_validity: '7 days' }],
      'from control.gate_candidates': () => [candidateRow()],
      'control.artifact_revision_for': () => [{ revision: REVISION }],
    });
    const { reviewer, decisions } = makeReviewer(query);
    const outcome = await reviewer.review({ gate: 'G0' });
    expect(outcome.status).toBe('FAIL');
    expect(outcome.failed).toEqual(['unmapped_check']);
    expect(decisions).toHaveLength(0);
  });

  it('signs only when every check passes, with receipts bound to the candidate', async () => {
    const { query } = makeQuery({
      'control.gate_policy_versions': policyHandler,
      'from control.gate_candidates': () => [candidateRow()],
      'control.artifact_revision_for': () => [{ revision: REVISION }],
      'from source.source_versions v': () => [rightsRow()],
      'from control.qualification_current': () => [],
      'a.reviewer_user_id': () => [{
        gate_code: 'G0', result: 'PASS', decision_origin: 'independent_gate', consumer: 'producer',
        reviewer_user_id: MACHINE_REVIEWER_USER_ID, reviewer_db_identity: MACHINE_SIGNER_LOGIN, current: 't',
      }],
    });
    const { reviewer, decisions, tokens } = makeReviewer(query);
    const outcome = await reviewer.review({ gate: 'G0' });
    expect(outcome.status).toBe('PASS');
    expect(outcome.auditId).toBe(AUDIT_ID);
    expect(decisions).toHaveLength(1);
    expect(tokens).toEqual([`token:${MACHINE_REVIEWER_USER_ID}`]);
    const decision = decisions[0] as Record<string, any>;
    expect(decision.result).toBe('PASS');
    expect(decision.ruleVersion).toBe(RULE_VERSION_BY_GATE.G0);
    expect(decision.candidateId).toBe('cand-g0');
    expect(decision.receipt.checks).toEqual({
      identity_version: true,
      rights_by_operation: true,
      method_plan_preselection: true,
    });
    expect(decision.receipt.evidence_refs).toEqual([
      { kind: 'source_version', id: 'sv-1', artifact_revision: REVISION },
      ...PLAN_REFS,
    ]);
    expect(decision.receipt.rationale).toBe(`MACHINE_RULE_REVIEW:${RULE_VERSION_BY_GATE.G0}:all deterministic checks passed`);
    expect(new Date(decision.validUntil).getTime()).toBe(Date.parse('2026-11-07T12:00:00Z') + 6 * 24 * 60 * 60 * 1000);
  });

  it('rejects a rights record that declares no authorisation basis', async () => {
    const { query } = makeQuery({
      'control.gate_policy_versions': policyHandler,
      'from control.gate_candidates': () => [candidateRow()],
      'control.artifact_revision_for': () => [{ revision: REVISION }],
      'from source.source_versions v': () => [rightsRow({ rights_evidence: '{}' })],
    });
    const { reviewer, decisions, lines } = makeReviewer(query);
    const outcome = await reviewer.review({ gate: 'G0' });
    expect(outcome.status).toBe('FAIL');
    expect(outcome.failed).toEqual(['rights_by_operation']);
    expect(decisions).toHaveLength(0);
    expect(lines.join('\n')).toContain('rights_basis_missing');
  });

  it('no longer accepts a legacy rights self-description instead of explicit per-action allow', async () => {
    const { query } = makeQuery({
      'control.gate_policy_versions': policyHandler,
      'from control.gate_candidates': () => [candidateRow()],
      'control.artifact_revision_for': () => [{ revision: REVISION }],
      'from source.source_versions v': () => [rightsRow({
        rights_by_action: JSON.stringify({}),
        rights: JSON.stringify({ basis: 'NAJ_secondary_use_policy', status: 'public_domain_secondary_use' }),
      })],
    });
    const { reviewer, decisions, lines } = makeReviewer(query);
    const outcome = await reviewer.review({ gate: 'G0' });
    expect(outcome.status).toBe('FAIL');
    expect(outcome.failed).toEqual(['rights_by_operation']);
    expect(decisions).toHaveLength(0);
    expect(lines.join('\n')).toContain('rights_action_not_allowed:src-1:rights_unknown:machine_read');
  });

  it('holds when machine read is allowed but the copy may not be retained', async () => {
    const { query } = makeQuery({
      'control.gate_policy_versions': policyHandler,
      'from control.gate_candidates': () => [candidateRow()],
      'control.artifact_revision_for': () => [{ revision: REVISION }],
      'from source.source_versions v': () => [rightsRow({
        rights_by_action: JSON.stringify({ machine_read: 'allowed', retain: 'restricted' }),
      })],
    });
    const { reviewer, decisions, lines } = makeReviewer(query);
    const outcome = await reviewer.review({ gate: 'G0' });
    expect(outcome.status).toBe('FAIL');
    expect(decisions).toHaveLength(0);
    expect(lines.join('\n')).toContain('rights_action_not_allowed:src-1:rights_restricted:retain');
  });

  it('reports an already signed audit that does not match the machine reviewer', async () => {
    const { query } = makeQuery({
      'control.gate_policy_versions': policyHandler,
      'from control.gate_candidates': () => [candidateRow()],
      'control.artifact_revision_for': () => [{ revision: REVISION }],
      'from source.source_versions v': () => [rightsRow()],
      'from control.qualification_current': () => [],
      'a.reviewer_user_id': () => [{
        gate_code: 'G0', result: 'PASS', decision_origin: 'independent_gate', consumer: 'producer',
        reviewer_user_id: '270bcecf-9bfb-4865-9432-a0ac9db8df75', reviewer_db_identity: MACHINE_SIGNER_LOGIN, current: 't',
      }],
    });
    const { reviewer } = makeReviewer(query);
    await expect(reviewer.review({ gate: 'G0' })).rejects.toThrow(`SIGNED_AUDIT_MISMATCH:${AUDIT_ID}`);
  });

  it('supports a dry run that evaluates without signing', async () => {
    const { query } = makeQuery({
      'control.gate_policy_versions': policyHandler,
      'from control.gate_candidates': () => [candidateRow()],
      'control.artifact_revision_for': () => [{ revision: REVISION }],
      'from source.source_versions v': () => [rightsRow()],
    });
    const { reviewer, decisions, lines } = makeReviewer(query);
    const outcome = await reviewer.review({ gate: 'G0', dryRun: true });
    expect(outcome.status).toBe('DRY_RUN_PASS');
    expect(decisions).toHaveLength(0);
    expect(lines.join('\n')).toContain('RULE_GATE_REVIEW G0 DRY_RUN_PASS audit=none');
  });

  // ---- D00-B：G0 必须承载 C 方法预选（策略之外的结构性前置，零 DDL）----
  function g0QueryWith(evidenceRefs: unknown[]) {
    return makeQuery({
      'control.gate_policy_versions': policyHandler,
      'from control.gate_candidates': () => [candidateRow({ evidence_refs: JSON.stringify(evidenceRefs) })],
      'control.artifact_revision_for': () => [{ revision: REVISION }],
      'from source.source_versions v': () => [rightsRow()],
    });
  }

  it('refuses G0 when the candidate carries no C method plan preselection', async () => {
    const { query } = g0QueryWith([{ kind: 'source_version', id: 'sv-1', artifact_revision: REVISION }]);
    const { reviewer, decisions, lines } = makeReviewer(query);
    const outcome = await reviewer.review({ gate: 'G0' });
    expect(outcome.status).toBe('FAIL');
    expect(outcome.failed).toEqual(['method_plan_preselection']);
    expect(outcome.checks.method_plan_preselection.reason).toBe('method_plan_ref_missing');
    expect(decisions).toHaveLength(0);
    expect(lines.join('\n')).toContain('method_plan_ref_missing');
  });

  it('refuses G0 when a method plan ref was edited after it was built', async () => {
    const tampered = { ...PLAN_REFS[0], method_version: 'v2' };
    const { query } = g0QueryWith([{ kind: 'source_version', id: 'sv-1', artifact_revision: REVISION }, tampered]);
    const { reviewer, decisions } = makeReviewer(query);
    const outcome = await reviewer.review({ gate: 'G0' });
    expect(outcome.status).toBe('FAIL');
    expect(outcome.failed).toEqual(['method_plan_preselection']);
    expect(outcome.checks.method_plan_preselection.reason).toBe('method_plan_ref_id_mismatch:C02@v1');
    expect(decisions).toHaveLength(0);
  });

  it('refuses G0 when the preselected method is not in the identity registry', async () => {
    const unregistered = buildMethodPlanRefs({ methods: [{ method_id: 'C09', method_version: 'v1' }] });
    const { query } = g0QueryWith([{ kind: 'source_version', id: 'sv-1', artifact_revision: REVISION }, ...unregistered]);
    const { reviewer, decisions } = makeReviewer(query);
    const outcome = await reviewer.review({ gate: 'G0' });
    expect(outcome.status).toBe('FAIL');
    expect(outcome.checks.method_plan_preselection.reason).toBe('method_plan_method_not_registered:C09');
    expect(decisions).toHaveLength(0);
  });
});
