// Read-only independent service boundary. No default pool, signing role,
// privileged connection fallback, or cached PASS. Deployment grants are separate.
import {requireQualifiedReadContext} from './qualification-read-context.mjs';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const field=x=>typeof x==='string'&&x.trim().length>0&&x.length<=128;
const FIELDS=new Set(['schema','run_id','job_id','stage','gate_code','input_digest',
  'output_digest','reviewer_binding_ref','consumer']);

export function assertStageQualificationRequest(request) {
  if(!request||typeof request!=='object'||Array.isArray(request)||
    Object.keys(request).some(k=>!FIELDS.has(k))||
    request.schema!=='mohen.independent-gate-current-check.v1'||
    !UUID.test(request.run_id??'')||!/^D0[0-5]$/.test(request.stage??'')||
    request.gate_code!=='G'+request.stage?.slice(-1)||request.consumer!=='producer'||
    !field(request.job_id)||!field(request.reviewer_binding_ref)||
    !SHA.test(request.input_digest??'')||!SHA.test(request.output_digest??''))
    throw Error('STAGE_QUALIFICATION_REQUEST_INVALID');
}

/** Check that a current independent audit actually signed the exact output,
 * job, Reviewer and consumer. A Producer-supplied hash in a request is never
 * evidence of a Reviewer-attested stage binding on its own. */
export function auditHasExactStageBinding(audit,request) {
  let binding=audit?.stage_binding;
  if(typeof binding==='string'){try{binding=JSON.parse(binding);}catch{return false;}}
  if(!binding||typeof binding!=='object'||Array.isArray(binding))return false;
  return audit.input_fingerprint===request?.input_digest &&
    audit.stage===request.stage && audit.consumer==='producer' &&
    binding.input_digest===request.input_digest &&
    binding.output_digest===request.output_digest &&
    binding.job_id===request.job_id &&
    binding.reviewer_binding_ref===request.reviewer_binding_ref &&
    binding.consumer==='producer';
}

export function createGateStageQualificationReader(db) {
  if(typeof db?.query!=='function')throw Error('DB_QUERY_INTERFACE_REQUIRED');
  return async function readStageQualification(request,context) {
    assertStageQualificationRequest(request);
    const scoped=requireQualifiedReadContext(context);
    if(context.consumer!=='producer')throw Error('QUALIFICATION_CONTEXT_REQUIRED');
    // A Reviewer must have explicitly signed these stage bindings in the
    // immutable decision receipt. A legacy PASS or an object-only qualification
    // cannot be retrospectively relabelled as this Runner's exact output.
    const {rows}=await db.query(`select a.gate_audit_id::text, a.object_type,
      a.object_id::text, a.artifact_revision, a.valid_until::text
      from control.gate_audits a
      where a.architecture_generation='mohen.six-stage.v1'
        and a.decision_origin='independent_gate' and a.result='PASS'
        and a.run_id=$1::uuid and a.stage=$2 and a.gate_code=$3
        and a.details->'stage_binding'->>'job_id'=$4
        and a.details->'stage_binding'->>'reviewer_binding_ref'=$5
        and a.input_fingerprint=$6
        and a.details->'stage_binding'->>'input_digest'=$6
        and a.details->'stage_binding'->>'output_digest'=$7
        and a.details->'stage_binding'->>'consumer'='producer'
        and control.qualification_allows(a.gate_audit_id,$8,$9,$10,$11,$12::jsonb)
      limit 2`,[request.run_id,request.stage,request.gate_code,request.job_id,
      request.reviewer_binding_ref,request.input_digest,request.output_digest,...scoped]);
    if(rows.length!==1)return null; // ambiguity is not permission to choose a PASS
    const row=rows[0];
    if(!UUID.test(row.gate_audit_id??'')||!UUID.test(row.object_id??'')||
      !field(row.object_type)||typeof row.artifact_revision!=='string'||!row.artifact_revision||
      !Number.isFinite(Date.parse(row.valid_until))||Date.parse(row.valid_until)<=Date.now())return null;
    return {schema:'mohen.independent-gate-current-receipt.v1',
      run_id:request.run_id,job_id:request.job_id,stage:request.stage,gate_code:request.gate_code,
      reviewer_binding_ref:request.reviewer_binding_ref,consumer:'producer',
      input_digest:request.input_digest,output_digest:request.output_digest,
      gate_audit_id:row.gate_audit_id,object_type:row.object_type,object_id:row.object_id,
      artifact_revision:row.artifact_revision,valid_until:row.valid_until,
      qualification_current:true,decision_origin:'independent_gate',result:'PASS'};
  };
}
