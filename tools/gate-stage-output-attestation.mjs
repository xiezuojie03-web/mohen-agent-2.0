// M5 G0 BATCH-02: independent, read-only reconstruction of a REAL persisted
// D00 -> D01 stage output (text C01 and scanned-page image C02). This is NOT a
// Producer supplied digest, new Gate, or authorization to review other stages.
// Missing facts fail closed.
import {executionDigest} from '../pipelines/data-production/orchestrator/execution-authority.mjs';
import {inspectMethodPlanRef} from '../packages/data-access/src/method-plan-ref.mjs';
import {assertStageQualificationRequest} from '../packages/data-access/src/gate-stage-qualification.mjs';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA=/^[0-9a-f]{64}$/;
const REQUEST_SCHEMA='mohen.private-evidence-stage-request.v1';

function requireFact(ok,code){if(!ok)throw Error(code);}

export async function attestG0TextStageOutput({query,candidate,request,registry,projectId}={}){
  requireFact(typeof query==='function','STAGE_OUTPUT_REVIEWER_QUERY_REQUIRED');
  assertStageQualificationRequest(request);
  requireFact(request.stage==='D00'&&request.gate_code==='G0',
    'STAGE_OUTPUT_ATTESTATION_NOT_SUPPORTED');
  requireFact(registry?.status==='ACTIVE_AUTHORIZED'&&registry?.activation?.enabled===true,
    'STAGE_OUTPUT_REGISTRY_NOT_AUTHORIZED');
  const jobs=registry.jobs?.filter(x=>x.stage==='D00');
  requireFact(Array.isArray(jobs)&&jobs.length===1&&jobs[0].exit_gate==='G0',
    'STAGE_OUTPUT_REGISTRY_JOB_AMBIGUOUS');
  const job=jobs[0];
  requireFact(request.job_id===job.job_id&&
    request.reviewer_binding_ref===job.implementation?.gate_reviewer_binding,
    'STAGE_OUTPUT_JOB_REVIEWER_MISMATCH');
  const scope=typeof candidate?.scope==='string'?JSON.parse(candidate.scope):candidate?.scope;
  requireFact(UUID.test(projectId??'')&&scope?.project_id===projectId&&
    UUID.test(candidate?.candidate_id??'')&&UUID.test(candidate?.object_id??'')&&
    candidate?.gate_code==='G0'&&candidate?.stage==='D00'&&
    candidate?.consumer==='producer'&&candidate?.object_type==='source_version'&&
    SHA.test(candidate?.artifact_revision??'')&&
    candidate?.input_fingerprint===request.input_digest,
    'STAGE_OUTPUT_CANDIDATE_SCOPE_MISMATCH');
  const refs=candidate.evidence_refs;
  requireFact(Array.isArray(refs),'STAGE_OUTPUT_EVIDENCE_REFS_REQUIRED');
  const sourceRefs=refs.filter(ref=>ref?.kind==='source_version'&&
    ref.id===candidate.object_id&&ref.artifact_revision===candidate.artifact_revision);
  requireFact(sourceRefs.length===1,'STAGE_OUTPUT_SOURCE_REVISION_UNBOUND');
  const methodPlan=refs.filter(ref=>ref?.kind==='method_plan');
  requireFact(methodPlan.length>0&&methodPlan.length<=8,'STAGE_OUTPUT_METHOD_PLAN_REQUIRED');
  const inspected=methodPlan.map(inspectMethodPlanRef);
  requireFact(inspected.every(v=>v.ok)&&
    new Set(inspected.map(v=>v.id)).size===inspected.length&&
    inspected.some(v=>v.methodId==='C01'),
    'STAGE_OUTPUT_METHOD_PLAN_INVALID');
  // The independent machine login reads SOURCE/ORIGINAL rows with its own RLS.
  // An ambiguous original-to-raw mapping is NOT permission to select the first.
  const rows=await query([
    "select o.original_id::text as original_id, o.project_id::text as project_id,",
    "o.state as original_state, o.content_type as content_type,",
    "o.sha256 as original_sha256, o.byte_size as original_bytes,",
    "r.raw_item_id::text as raw_item_id, r.checksum_sha256 as raw_checksum,",
    "r.byte_size as raw_bytes",
    "from source.raw_items r join studio.private_originals o",
    "on o.storage_bucket || '/' || o.storage_key = r.storage_ref",
    "where r.source_version_id=:'sourceVersion'::uuid",
    "and o.project_id=:'project'::uuid",
    "order by o.original_id,r.raw_item_id limit 2"
  ].join(' '),{sourceVersion:candidate.object_id,project:projectId});
  requireFact(Array.isArray(rows)&&rows.length===1,
    'STAGE_OUTPUT_PERSISTED_SOURCE_NOT_UNIQUE');
  const row=rows[0];
  requireFact(UUID.test(row.original_id??'')&&UUID.test(row.raw_item_id??'')&&
    row.project_id===projectId&&row.original_state==='STORED_VERIFIED'&&
    row.content_type==='text/plain'&&SHA.test(row.original_sha256??'')&&
    row.original_sha256===row.raw_checksum&&Number.isSafeInteger(Number(row.original_bytes))&&
    Number(row.original_bytes)>0&&Number(row.original_bytes)===Number(row.raw_bytes),
    'STAGE_OUTPUT_ORIGINAL_BYTES_NOT_ATTESTED');
  // EXACT same D00 private-text output shape as privateSourceIntakeAdapter:
  // never read text bytes or accept a caller-supplied output snapshot/digest.
  const independentlyRebuiltOutput={
    schema:REQUEST_SCHEMA,stage:'D01',originalId:row.original_id,
    method_plan:methodPlan,
    text:{kind:'verified_utf8_full/v1',source_version_id:candidate.object_id,
      raw_item_id:row.raw_item_id,raw_sha256:row.original_sha256}
  };
  const outputDigest=executionDigest(independentlyRebuiltOutput);
  requireFact(outputDigest===request.output_digest,
    'STAGE_OUTPUT_DIGEST_NOT_REPRODUCIBLE');
  return {
    job_id:job.job_id,reviewer_binding_ref:job.implementation.gate_reviewer_binding,
    consumer:'producer',input_digest:candidate.input_fingerprint,output_digest:outputDigest
  };
}

const IMAGE_TYPES=['image/jpeg','image/png','image/webp'];

// Independent, read-only reconstruction of a REAL persisted scanned-page
// D00 -> D01 output. page_number is NOT taken from the Producer request: it is
// read from the pre-execution, machine-reviewer-readable control.production_runs
// scope that the D00 grant journal bound. Every carrier fact comes from the
// signer's own RLS read. Missing/ambiguous facts fail closed.
export async function attestG0ImageStageOutput({query,candidate,request,registry,projectId}={}){
  requireFact(typeof query==='function','STAGE_OUTPUT_REVIEWER_QUERY_REQUIRED');
  assertStageQualificationRequest(request);
  requireFact(request.stage==='D00'&&request.gate_code==='G0',
    'STAGE_OUTPUT_ATTESTATION_NOT_SUPPORTED');
  requireFact(registry?.status==='ACTIVE_AUTHORIZED'&&registry?.activation?.enabled===true,
    'STAGE_OUTPUT_REGISTRY_NOT_AUTHORIZED');
  const jobs=registry.jobs?.filter(x=>x.stage==='D00');
  requireFact(Array.isArray(jobs)&&jobs.length===1&&jobs[0].exit_gate==='G0',
    'STAGE_OUTPUT_REGISTRY_JOB_AMBIGUOUS');
  const job=jobs[0];
  requireFact(request.job_id===job.job_id&&
    request.reviewer_binding_ref===job.implementation?.gate_reviewer_binding,
    'STAGE_OUTPUT_JOB_REVIEWER_MISMATCH');
  const scope=typeof candidate?.scope==='string'?JSON.parse(candidate.scope):candidate?.scope;
  requireFact(UUID.test(projectId??'')&&scope?.project_id===projectId&&
    UUID.test(candidate?.candidate_id??'')&&UUID.test(candidate?.object_id??'')&&
    candidate?.gate_code==='G0'&&candidate?.stage==='D00'&&
    candidate?.consumer==='producer'&&candidate?.object_type==='source_version'&&
    SHA.test(candidate?.artifact_revision??'')&&
    candidate?.input_fingerprint===request.input_digest,
    'STAGE_OUTPUT_CANDIDATE_SCOPE_MISMATCH');
  const refs=candidate.evidence_refs;
  requireFact(Array.isArray(refs),'STAGE_OUTPUT_EVIDENCE_REFS_REQUIRED');
  const sourceRefs=refs.filter(ref=>ref?.kind==='source_version'&&
    ref.id===candidate.object_id&&ref.artifact_revision===candidate.artifact_revision);
  requireFact(sourceRefs.length===1,'STAGE_OUTPUT_SOURCE_REVISION_UNBOUND');
  const methodPlan=refs.filter(ref=>ref?.kind==='method_plan');
  requireFact(methodPlan.length>0&&methodPlan.length<=8,'STAGE_OUTPUT_METHOD_PLAN_REQUIRED');
  const inspected=methodPlan.map(inspectMethodPlanRef);
  requireFact(inspected.every(v=>v.ok)&&
    new Set(inspected.map(v=>v.id)).size===inspected.length&&
    inspected.some(v=>v.methodId==='C02'),
    'STAGE_OUTPUT_METHOD_PLAN_INVALID');
  // The independent machine login reads SOURCE/ORIGINAL rows with its own RLS.
  // An ambiguous original-to-raw mapping is NOT permission to select the first.
  const rows=await query([
    "select o.original_id::text as original_id, o.project_id::text as project_id,",
    "o.state as original_state, o.content_type as content_type,",
    "o.sha256 as original_sha256, o.byte_size as original_bytes,",
    "r.raw_item_id::text as raw_item_id, r.checksum_sha256 as raw_checksum,",
    "r.byte_size as raw_bytes",
    "from source.raw_items r join studio.private_originals o",
    "on o.storage_bucket || '/' || o.storage_key = r.storage_ref",
    "where r.source_version_id=:'sourceVersion'::uuid",
    "and o.project_id=:'project'::uuid",
    "order by o.original_id,r.raw_item_id limit 2"
  ].join(' '),{sourceVersion:candidate.object_id,project:projectId});
  requireFact(Array.isArray(rows)&&rows.length===1,
    'STAGE_OUTPUT_PERSISTED_SOURCE_NOT_UNIQUE');
  const row=rows[0];
  requireFact(UUID.test(row.original_id??'')&&UUID.test(row.raw_item_id??'')&&
    row.project_id===projectId&&row.original_state==='STORED_VERIFIED'&&
    IMAGE_TYPES.includes(row.content_type)&&SHA.test(row.original_sha256??'')&&
    row.original_sha256===row.raw_checksum&&Number.isSafeInteger(Number(row.original_bytes))&&
    Number(row.original_bytes)>0&&Number(row.original_bytes)===Number(row.raw_bytes),
    'STAGE_OUTPUT_ORIGINAL_BYTES_NOT_ATTESTED');
  // page_number is a pre-execution authorization fact: read the exact run's
  // persisted scope via the signer's RLS, never the Producer's request/candidate.
  const runRows=await query(
    "select scope from control.production_runs where run_id=:'run'::uuid limit 2",
    {run:request.run_id});
  requireFact(Array.isArray(runRows)&&runRows.length===1,
    'STAGE_OUTPUT_RUN_SCOPE_NOT_UNIQUE');
  let runScope=runRows[0].scope;
  if(typeof runScope==='string'){try{runScope=JSON.parse(runScope);}catch{runScope=null;}}
  const pageNumber=runScope?.page_number;
  requireFact(runScope?.project_id===projectId&&
    runScope?.source_version_id===candidate.object_id&&
    runScope?.original_id===row.original_id&&
    runScope?.raw_sha256===row.original_sha256&&
    Number.isSafeInteger(pageNumber)&&pageNumber>=1&&pageNumber<=10000,
    'STAGE_OUTPUT_PAGE_SCOPE_MISMATCH');
  // EXACT same D00 scanned-page output shape as privateSourceIntakeAdapter:
  // never read image bytes or accept a caller-supplied output snapshot/digest.
  const independentlyRebuiltOutput={
    schema:REQUEST_SCHEMA,stage:'D01',originalId:row.original_id,
    method_plan:methodPlan,
    page:{kind:'scanned_page/v1',page_number:pageNumber,
      source_version_id:candidate.object_id,raw_item_id:row.raw_item_id,
      raw_sha256:row.original_sha256,page_sha256:row.original_sha256}
  };
  const outputDigest=executionDigest(independentlyRebuiltOutput);
  requireFact(outputDigest===request.output_digest,
    'STAGE_OUTPUT_DIGEST_NOT_REPRODUCIBLE');
  return {
    job_id:job.job_id,reviewer_binding_ref:job.implementation.gate_reviewer_binding,
    consumer:'producer',input_digest:candidate.input_fingerprint,output_digest:outputDigest
  };
}
