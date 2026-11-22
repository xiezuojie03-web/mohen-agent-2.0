// Server-side reconstruction of the REAL D05 fact-branch typed resume input from
// persisted, independently-readable facts: the run scope, the CURRENT independent
// G4 PASS for this run and the exact persisted L4 finding it qualifies, the G3
// claim revision that finding is grounded in, and that claim's CURRENT G3 PASS.
// The P02 world_projection is derived verbatim/boundedly from those qualified
// facts (no paid Provider, no LLM, no caller snapshot); it stays an UNASSESSED
// candidate for the independent G5 to judge. Missing/ambiguous facts fail closed.
//
// EX05 fact branch (Protocol §13.5): L3_fact_ref@revision + valid_G3_for_purpose +
// dependency_snapshot + rights/consumer/scope -> fact read models. We additionally
// anchor on the current G4 finding (the only A-method with a live binding) so the
// projection is grounded in an independently-qualified humanistic finding, never
// in a Producer-supplied digest.
import { isTypedD05FactRequest } from './adapter-binding.mjs';
import { deriveFactWorldProjection } from './d05-fact-publish.mjs';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA = /^[a-f0-9]{64}$/;
const SCHEMA = 'mohen.private-evidence-stage-request.v1';
const fail = (code) => { throw Error(code); };

/**
 * @param query async (sql,params)=>rows, executed on the independent reader RLS.
 * @param runId the resumed run that already holds current G4 + G3 qualifications.
 * @param projectId the exact project id from the run scope.
 * @param registry the ACTIVE_AUTHORIZED production registry.
 * @returns the typed D05 fact resume input object (pass to run.mjs --resume-input-file).
 */
export async function rebuildD05ResumeInput({ query, runId, projectId, registry } = {}) {
  if (typeof query !== 'function') fail('D05_RESUME_QUERY_REQUIRED');
  if (registry?.status !== 'ACTIVE_AUTHORIZED' || registry?.activation?.enabled !== true)
    fail('D05_RESUME_REGISTRY_NOT_ACTIVE');
  const d05Jobs = (registry.jobs ?? []).filter((j) => j.stage === 'D05');
  if (d05Jobs.length !== 1 || d05Jobs[0].exit_gate !== 'G5') fail('D05_RESUME_JOB_AMBIGUOUS');
  const reviewerBinding = d05Jobs[0].implementation?.gate_reviewer_binding;
  const d04Job = (registry.jobs ?? []).find((j) => j.stage === 'D04');
  const d03Job = (registry.jobs ?? []).find((j) => j.stage === 'D03');
  if (!UUID.test(runId ?? '') || !UUID.test(projectId ?? '')) fail('D05_RESUME_SCOPE_INVALID');

  // 1) run's immutable scope (pre-execution authorization fact, from the run row).
  const runRows = await query('select scope from control.production_runs where run_id=:\'run\'::uuid limit 2', { run: runId });
  if (!Array.isArray(runRows) || runRows.length !== 1) fail('D05_RESUME_RUN_SCOPE_NOT_UNIQUE');
  let scope = runRows[0].scope;
  if (typeof scope === 'string') { try { scope = JSON.parse(scope); } catch { scope = null; } }
  if (scope?.project_id !== projectId || !UUID.test(scope?.original_id ?? '') ||
      !UUID.test(scope?.root_task_id ?? '') || !UUID.test(scope?.source_version_id ?? '') ||
      !SHA.test(scope?.raw_sha256 ?? '')) fail('D05_RESUME_RUN_SCOPE_MISMATCH');

  // 2) CURRENT independent G4 PASS for this run, qualifying exactly one persisted finding.
  const g4Rows = await query([
    'select q.object_id::text as finding_id, a.gate_audit_id::text as gate_audit_id,',
    '  a.artifact_revision, a.details->\'stage_binding\'->>\'job_id\' as job_id,',
    '  a.details->\'stage_binding\'->>\'reviewer_binding_ref\' as reviewer_binding_ref,',
    '  q.consumer::text as consumer',
    'from control.qualification_current q',
    'join control.gate_audits a on a.gate_audit_id=q.gate_audit_id',
    'where a.run_id=:\'run\'::uuid and a.stage=\'D04\' and a.gate_code=\'G4\'',
    '  and a.result=\'PASS\' and a.decision_origin=\'independent_gate\' and a.current_valid=true',
    '  and q.consumer=\'producer\' and q.object_type=\'finding\'',
    '  and (q.valid_until is null or q.valid_until > now())',
    '  and (a.valid_until is null or a.valid_until > now()) limit 2',
  ].join(' '), { run: runId });
  if (!Array.isArray(g4Rows) || g4Rows.length !== 1) fail('D05_RESUME_G4_NOT_CURRENT');
  const g4 = g4Rows[0];
  if (!UUID.test(g4.finding_id ?? '') || !UUID.test(g4.gate_audit_id ?? '') ||
      !SHA.test(g4.artifact_revision ?? '') || g4.job_id !== d04Job?.job_id ||
      g4.reviewer_binding_ref !== d04Job?.implementation?.gate_reviewer_binding ||
      g4.consumer !== 'producer') fail('D05_RESUME_G4_BINDING_MISMATCH');

  // 3) the persisted finding row: method A01-A12, UNASSESSED, grounded in a claim.
  const findRows = await query([
    'select f.finding_id::text as finding_id, f.discovery_method->>\'method_id\' as method_id,',
    '  f.uncertainty->>\'qualification\' as qualification,',
    '  f.interpretive_statement, f.supporting_world_objects::text as refs',
    'from meaning.findings f where f.finding_id=:\'fid\'::uuid limit 2',
  ].join(' '), { fid: g4.finding_id });
  if (!Array.isArray(findRows) || findRows.length !== 1) fail('D05_RESUME_FINDING_NOT_UNIQUE');
  const finding = findRows[0];
  if (finding.finding_id !== g4.finding_id || !/^A(0[1-9]|1[0-2])$/.test(finding.method_id ?? '') ||
      finding.qualification !== 'UNASSESSED' ||
      typeof finding.interpretive_statement !== 'string' || !finding.interpretive_statement.trim() ||
      Buffer.byteLength(finding.interpretive_statement) > 5000) fail('D05_RESUME_FINDING_BINDING_MISMATCH');
  let supporting;
  try { supporting = JSON.parse(finding.refs); } catch { supporting = null; }
  if (!Array.isArray(supporting)) fail('D05_RESUME_FINDING_REFS_INVALID');
  const claimRefs = supporting.filter((r) => r && r.kind === 'claim_revision' && UUID.test(r.id ?? ''));
  if (claimRefs.length !== 1) fail('D05_RESUME_CLAIM_REF_AMBIGUOUS');
  const claimRevisionId = claimRefs[0].id;

  // 4) the exact persisted claim revision (verbatim assertion, project/original binding).
  const claimRows = await query([
    'select cr.claim_revision_id::text as claim_revision_id,',
    '  cr.assertion_payload_json::text as payload, cr.asserted_time_json::text as asserted_time,',
    '  cr.producer_method_id',
    'from world.claim_revisions cr where cr.claim_revision_id=:\'rev\'::uuid limit 2',
  ].join(' '), { rev: claimRevisionId });
  if (!Array.isArray(claimRows) || claimRows.length !== 1) fail('D05_RESUME_CLAIM_NOT_UNIQUE');
  const claim = claimRows[0];
  if (claim.claim_revision_id !== claimRevisionId || claim.producer_method_id !== 'W07')
    fail('D05_RESUME_CLAIM_BINDING_MISMATCH');
  let payload, assertedTime;
  try { payload = JSON.parse(claim.payload); } catch { payload = null; }
  try { assertedTime = JSON.parse(claim.asserted_time); } catch { assertedTime = null; }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
      payload.project_id !== projectId || payload.original_id !== scope.original_id ||
      payload.qualification !== 'UNASSESSED') fail('D05_RESUME_CLAIM_NOT_CANDIDATE');
  const assertion = typeof payload.assertion === 'string' ? payload.assertion.trim() : '';
  if (!assertion || Buffer.byteLength(assertion) > 2000) fail('D05_RESUME_ASSERTION_UNAVAILABLE');

  // 5) CURRENT independent G3 PASS qualifies exactly this claim revision (EX05 fact branch).
  const g3Rows = await query([
    'select q.object_id::text as claim_revision_id, a.gate_audit_id::text as gate_audit_id,',
    '  a.artifact_revision, a.details->\'stage_binding\'->>\'job_id\' as job_id,',
    '  a.details->\'stage_binding\'->>\'reviewer_binding_ref\' as reviewer_binding_ref,',
    '  q.consumer::text as consumer',
    'from control.qualification_current q',
    'join control.gate_audits a on a.gate_audit_id=q.gate_audit_id',
    'where a.run_id=:\'run\'::uuid and a.stage=\'D03\' and a.gate_code=\'G3\'',
    '  and a.result=\'PASS\' and a.decision_origin=\'independent_gate\' and a.current_valid=true',
    '  and q.consumer=\'producer\' and q.object_type=\'claim_revision\'',
    '  and (q.valid_until is null or q.valid_until > now())',
    '  and (a.valid_until is null or a.valid_until > now()) limit 2',
  ].join(' '), { run: runId });
  if (!Array.isArray(g3Rows) || g3Rows.length !== 1) fail('D05_RESUME_G3_NOT_CURRENT');
  const g3 = g3Rows[0];
  if (g3.claim_revision_id !== claimRevisionId || !UUID.test(g3.gate_audit_id ?? '') ||
      !SHA.test(g3.artifact_revision ?? '') || g3.job_id !== d03Job?.job_id ||
      g3.reviewer_binding_ref !== d03Job?.implementation?.gate_reviewer_binding ||
      g3.consumer !== 'producer') fail('D05_RESUME_G3_BINDING_MISMATCH');

  // 6) deterministically derive the fact-branch P02 world projection (zero Provider).
  const projection = deriveFactWorldProjection({
    findingId: g4.finding_id,
    claimRevisionId,
    originalId: scope.original_id,
    g4AuditId: g4.gate_audit_id,
    g3AuditId: g3.gate_audit_id,
    findingMethodId: finding.method_id,
    interpretiveStatement: finding.interpretive_statement,
    assertion,
    sourceVoice: typeof assertedTime?.source_voice === 'string' ? assertedTime.source_voice : null,
    g4ArtifactRevision: g4.artifact_revision,
    g3ArtifactRevision: g3.artifact_revision,
  });

  const input = {
    schema: SCHEMA,
    stage: 'D05',
    originalId: scope.original_id,
    findingId: g4.finding_id,
    projection,
  };
  if (!isTypedD05FactRequest(input)) fail('D05_RESUME_INPUT_SHAPE_INVALID');
  return input;
}
