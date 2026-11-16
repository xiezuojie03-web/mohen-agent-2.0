// Pure local-Gate candidate locator: selectors are constrained by DB facts,
// never by a caller-selected project or by the requested output_digest.
// This identifies only which candidate to review; it DOES NOT certify output.
import { assertStageQualificationRequest } from "../packages/data-access/src/gate-stage-qualification.mjs";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function selectExactStageCandidate(query, request) {
  if(typeof query!=="function")throw Error("GATE_CANDIDATE_QUERY_REQUIRED");
  assertStageQualificationRequest(request);
  // The persisted run, not just the Producer-submitted candidate, must name
  // this project. A legacy/empty run scope cannot authorize cross-project G0.
  // JOIN uses the existing production_runs + machine-reviewer SELECT grant.
  const rows=await query(
    `select c.candidate_id::text as candidate_id,
            c.allowed_scope->>'project_id' as project_id,
            r.scope->>'project_id' as run_project_id
       from control.gate_candidates c
       join control.production_runs r on r.run_id=c.run_id
      where c.run_id=:'run'::uuid
        and c.stage=:'stage' and c.gate_code=:'gate'
        and c.consumer='producer' and c.candidate_status='SUBMITTED'
        and c.input_fingerprint=:'fp'
        and r.scope->>'project_id'=c.allowed_scope->>'project_id'
      order by c.submitted_at asc, c.candidate_id asc
      limit 2`,
    {run:request.run_id,stage:request.stage,gate:request.gate_code,fp:request.input_digest});
  // Multiple or ambiguous candidates must not be resolved by "first".
  if(!Array.isArray(rows)||rows.length!==1)return null;
  const row=rows[0];
  if(!UUID.test(row?.candidate_id??"")||!UUID.test(row?.project_id??"")||
     row.run_project_id!==row.project_id)return null;
  return {candidateId:row.candidate_id,projectId:row.project_id};
}
