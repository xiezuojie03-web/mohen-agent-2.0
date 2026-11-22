// Server-side reconstruction of the REAL D04 typed resume input from persisted,
// independently-readable facts: the run scope, the CURRENT independent G3 PASS
// for this run and the exact persisted L3 claim_revision it qualifies. The
// humanistic finding is derived verbatim/boundedly from that G3-qualified claim
// (no paid Provider, no LLM reasoning, no caller snapshot); it stays an
// UNASSESSED meaning candidate for the independent G4 to judge. Missing or
// ambiguous facts fail closed.
import {isTypedD04FindingRequest} from './adapter-binding.mjs';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const SCHEMA='mohen.private-evidence-stage-request.v1';
// A06 is the only D04 method with a live implementation_binding in the current
// method-binding-contract (private-evidence-adapters.mjs#D04:recordHumanisticFinding).
// The other A01-A12 remain HOLD; selecting them here would invent an unbound
// professional method. BE = bounded explanation in G4.interpretation.v1.
const METHOD_ID='A06';
const PURPOSE_CODE='BE';
const fail=code=>{throw Error(code);};

/** Pure, deterministic derivation of an UNASSESSED finding from a G3-qualified claim. */
export function deriveFindingFromClaim({claimId,payload,assertedTime,g3AuditId}={}){
 if(!UUID.test(claimId??''))fail('D04_RESUME_CLAIM_ID_INVALID');
 const assertion=typeof payload?.assertion==='string'?payload.assertion.trim():'';
 if(!assertion||Buffer.byteLength(assertion)>2000)fail('D04_RESUME_ASSERTION_UNAVAILABLE');
 const derived={
  method_id:METHOD_ID,
  finding_type:'bounded_interpretive_finding',
  human_question:`依据当前 G3 合格的世界对象 ${claimId}，这一材料记载在限定用途内呈现何种可讨论的地望、沿革与聚落面貌？`,
  interpretive_statement:`依据当前独立 G3 合格的世界对象 ${claimId}：${assertion}。本解释仅在材料原文所述范围内成立，人物、年代与地名同一性以及史实定性仍待独立复核。`,
  understanding_delta:'把材料记载组织为具备地望、沿革、聚落规模与设施线索的可讨论对象；仅为候选解释，不作史实定论。',
  counter_view_or_alternative:['方志为概述性材料，人口与面积等数字未提供独立统计口径与年代；该描述不等同于独立史实核定。'],
  missing_evidence:['人口与面积数据的统计年代与口径','所提及产业、桥梁、水道与设施的具体年代、位置及旁证'],
  uncertainty:{qualification:'UNASSESSED',
   note:'D04 finding deterministically derived from the current G3-qualified claim_revision; no paid Provider/LLM reasoning used',
   source_voice:typeof assertedTime?.source_voice==='string'?assertedTime.source_voice:null,
   g3_audit_id:UUID.test(g3AuditId??'')?g3AuditId:null},
  purpose_code:PURPOSE_CODE,
 };
 if(Buffer.byteLength(derived.human_question)>2000||Buffer.byteLength(derived.interpretive_statement)>5000)
  fail('D04_RESUME_FINDING_TOO_LARGE');
 return derived;
}

/**
 * @param query async (sql,params)=>rows, executed on the independent reader RLS.
 * @param runId the resumed run that already holds a current independent G3.
 * @param projectId the exact project id from the run scope.
 * @param registry the ACTIVE_AUTHORIZED production registry.
 * @returns the typed D04 resume input object (pass to run.mjs --resume-input-file).
 */
export async function rebuildD04ResumeInput({query,runId,projectId,registry}={}){
 if(typeof query!=='function')fail('D04_RESUME_QUERY_REQUIRED');
 if(registry?.status!=='ACTIVE_AUTHORIZED'||registry?.activation?.enabled!==true)fail('D04_RESUME_REGISTRY_NOT_ACTIVE');
 const jobs=(registry.jobs??[]).filter(j=>j.stage==='D04');
 if(jobs.length!==1||jobs[0].exit_gate!=='G4')fail('D04_RESUME_JOB_AMBIGUOUS');
 const reviewerBinding=jobs[0].implementation?.gate_reviewer_binding;
 if(!UUID.test(runId??'')||!UUID.test(projectId??''))fail('D04_RESUME_SCOPE_INVALID');
 // The run's immutable scope is a pre-execution authorization fact, read from
 // the persisted run row, never from the caller request.
 const runRows=await query("select scope from control.production_runs where run_id=:'run'::uuid limit 2",{run:runId});
 if(!Array.isArray(runRows)||runRows.length!==1)fail('D04_RESUME_RUN_SCOPE_NOT_UNIQUE');
 let scope=runRows[0].scope;
 if(typeof scope==='string'){try{scope=JSON.parse(scope);}catch{scope=null;}}
 if(scope?.project_id!==projectId||!UUID.test(scope?.original_id??'')||!UUID.test(scope?.root_task_id??'')||
    !UUID.test(scope?.source_version_id??'')||!SHA.test(scope?.raw_sha256??''))
  fail('D04_RESUME_RUN_SCOPE_MISMATCH');
 // Authoritative "current qualification": a live qualification_current row for
 // a producer claim_revision joined to its CURRENT independent G3 audit that
 // carries the D03 stage binding. Exactly one may exist.
 const current=await query([
  "select q.object_id::text as claim_revision_id, a.gate_audit_id::text as gate_audit_id,",
  "  a.artifact_revision, a.details->'stage_binding'->>'job_id' as job_id,",
  "  a.details->'stage_binding'->>'reviewer_binding_ref' as reviewer_binding_ref,",
  "  q.consumer::text as consumer",
  "from control.qualification_current q",
  "join control.gate_audits a on a.gate_audit_id=q.gate_audit_id",
  "where a.run_id=:'run'::uuid and a.stage='D03' and a.gate_code='G3'",
  "  and a.result='PASS' and a.decision_origin='independent_gate' and a.current_valid=true",
  "  and q.consumer='producer' and q.object_type='claim_revision'",
  "  and (q.valid_until is null or q.valid_until > now())",
  "  and (a.valid_until is null or a.valid_until > now()) limit 2"
 ].join(' '),{run:runId});
 if(!Array.isArray(current)||current.length!==1)fail('D04_RESUME_G3_NOT_CURRENT');
 const g3=current[0];
 const d03Job=(registry.jobs??[]).find(j=>j.stage==='D03');
 if(!UUID.test(g3.claim_revision_id??'')||!UUID.test(g3.gate_audit_id??'')||!SHA.test(g3.artifact_revision??'')||
    g3.job_id!==d03Job?.job_id||
    g3.reviewer_binding_ref!==d03Job?.implementation?.gate_reviewer_binding||
    g3.consumer!=='producer'||typeof reviewerBinding!=='string'||!reviewerBinding)
  fail('D04_RESUME_G3_BINDING_MISMATCH');
 // Independent reader RLS: the exact persisted L3 claim revision, its asserted
 // payload and its single ordered evidence link. No "pick the first" across runs.
 const rows=await query([
  "select cr.claim_revision_id::text as claim_revision_id,",
  "  cr.assertion_payload_json::text as payload, cr.asserted_time_json::text as asserted_time,",
  "  cr.producer_method_id, l.claim_evidence_link_id::text as claim_evidence_link_id,",
  "  l.evidence_id::text as evidence_id, l.support_type",
  "from world.claim_revisions cr",
  "join world.claim_evidence_links l on l.claim_revision_id=cr.claim_revision_id",
  "where cr.claim_revision_id=:'rev'::uuid limit 2"
 ].join(' '),{rev:g3.claim_revision_id});
 if(!Array.isArray(rows)||rows.length!==1)fail('D04_RESUME_CLAIM_NOT_UNIQUE');
 const row=rows[0];
 if(row.claim_revision_id!==g3.claim_revision_id||row.producer_method_id!=='W07')
  fail('D04_RESUME_CLAIM_BINDING_MISMATCH');
 let payload,assertedTime;
 try{payload=JSON.parse(row.payload);}catch{payload=null;}
 try{assertedTime=JSON.parse(row.asserted_time);}catch{assertedTime=null;}
 if(!payload||typeof payload!=='object'||Array.isArray(payload)||
    payload.qualification!=='UNASSESSED'||payload.project_id!==projectId||
    payload.original_id!==scope.original_id||!Array.isArray(payload.evidence_ids)||
    !payload.evidence_ids.includes(row.evidence_id)||!UUID.test(row.claim_evidence_link_id??''))
  fail('D04_RESUME_CLAIM_NOT_CANDIDATE');
 const finding=deriveFindingFromClaim({claimId:g3.claim_revision_id,payload,assertedTime,g3AuditId:g3.gate_audit_id});
 const input={schema:SCHEMA,stage:'D04',originalId:scope.original_id,
  claimRevisionId:g3.claim_revision_id,finding};
 if(!isTypedD04FindingRequest(input))fail('D04_RESUME_INPUT_SHAPE_INVALID');
 return input;
}
