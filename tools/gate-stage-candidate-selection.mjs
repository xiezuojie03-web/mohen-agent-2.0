// Pure local-Gate candidate locator: selectors are constrained by DB facts,
// never by a caller-selected project or by the requested output_digest.
// This identifies only which candidate to review; it DOES NOT certify output.
import { assertStageQualificationRequest } from "../packages/data-access/src/gate-stage-qualification.mjs";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function selectExactStageCandidate(query, request) {
  if(typeof query!=="function")throw Error("GATE_CANDIDATE_QUERY_REQUIRED");
  assertStageQualificationRequest(request);
  const rows=await query(
    `select candidate_id::text as candidate_id,
            allowed_scope->>'project_id' as project_id
       from control.gate_candidates
      where run_id=:'run'::uuid
        and stage=:'stage' and gate_code=:'gate'
        and consumer='producer' and candidate_status='SUBMITTED'
        and input_fingerprint=:'fp'
      order by submitted_at asc, candidate_id asc
      limit 2`,
    {run:request.run_id,stage:request.stage,gate:request.gate_code,fp:request.input_digest});
  // Multiple or ambiguous candidates must not be resolved by "first".
  if(!Array.isArray(rows)||rows.length!==1)return null;
  const row=rows[0];
  if(!UUID.test(row?.candidate_id??"")||!UUID.test(row?.project_id??""))return null;
  return {candidateId:row.candidate_id,projectId:row.project_id};
}
