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

// M5 D01→G1 BATCH: independent, read-only reconstruction of the REAL persisted
// D01 reading (C02 scanned page or C01 verified full text). Same non-circular
// rule as G0: every digest input is read back by the signer's own RLS, never
// taken from the Producer request. Ambiguous or missing facts fail closed.
//
// D01 output contains the persisted gate_candidate_id, so the signer cannot
// guess it: it is read from the candidate row being reviewed.
async function deriveD01ReadingFacts({query,candidate,projectId,runId}={}){
  requireFact(typeof query==='function','STAGE_OUTPUT_REVIEWER_QUERY_REQUIRED');
  requireFact(UUID.test(runId??''),'STAGE_OUTPUT_RUN_REQUIRED');
  const cid=candidate?.candidate_id, readUnitId=candidate?.object_id;
  requireFact(UUID.test(cid??'')&&UUID.test(readUnitId??''),
    'STAGE_OUTPUT_CANDIDATE_SCOPE_MISMATCH');
  const scope=typeof candidate?.scope==='string'?JSON.parse(candidate.scope):candidate?.scope;
  requireFact(UUID.test(projectId??'')&&scope?.project_id===projectId&&
    candidate?.stage==='D01'&&candidate?.gate_code==='G1'&&
    candidate?.consumer==='producer'&&candidate?.object_type==='read_unit'&&
    SHA.test(candidate?.artifact_revision??''),
    'STAGE_OUTPUT_CANDIDATE_SCOPE_MISMATCH');
  const refs=candidate.evidence_refs;
  requireFact(Array.isArray(refs),'STAGE_OUTPUT_EVIDENCE_REFS_REQUIRED');
  const unitRefs=refs.filter(ref=>ref?.kind==='read_unit'&&ref.id===readUnitId&&
    ref.artifact_revision===candidate.artifact_revision);
  requireFact(unitRefs.length===1,'STAGE_OUTPUT_READING_UNIT_UNBOUND');
  const sourceRefs=refs.filter(ref=>ref?.kind==='source_version'&&UUID.test(ref?.id??''));
  requireFact(sourceRefs.length===1,'STAGE_OUTPUT_SOURCE_REVISION_UNBOUND');
  const sourceVersionId=sourceRefs[0].id;

  // Persisted L1 reading and its read run: exact identity, run and request digest.
  const units=await query([
    "select ru.read_unit_id::text as read_unit_id, ru.read_run_id::text as read_run_id,",
    "ru.method_code as method_code, ru.locator_schema as locator_schema,",
    "ru.locator::text as locator,",
    "rr.production_run_id::text as production_run_id,",
    "rr.config->>'request_digest' as request_digest,",
    "rr.config->>'project_id' as project_id,",
    "rr.config->>'private_original_id' as original_id",
    "from source.read_units ru join source.read_runs rr on rr.read_run_id=ru.read_run_id",
    "where ru.read_unit_id=:'readUnit'::uuid limit 2"
  ].join(' '),{readUnit:readUnitId});
  requireFact(Array.isArray(units)&&units.length===1,
    'STAGE_OUTPUT_PERSISTED_READING_NOT_UNIQUE');
  const unit=units[0];
  requireFact(unit.read_unit_id===readUnitId&&UUID.test(unit.read_run_id??'')&&
    unit.project_id===projectId&&UUID.test(unit.original_id??'')&&
    SHA.test(unit.request_digest??''),
    'STAGE_OUTPUT_PERSISTED_READING_INVALID');
  let locator=unit.locator;
  if(typeof locator==='string'){try{locator=JSON.parse(locator);}catch{locator=null;}}
  requireFact(locator&&typeof locator==='object'&&!Array.isArray(locator)&&
    locator.source_version_id===sourceVersionId,
    'STAGE_OUTPUT_READING_LOCATOR_INVALID');

  // Exact immutable original/raw pair for this source version in this project.
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
  ].join(' '),{sourceVersion:sourceVersionId,project:projectId});
  requireFact(Array.isArray(rows)&&rows.length===1,
    'STAGE_OUTPUT_PERSISTED_SOURCE_NOT_UNIQUE');
  const row=rows[0];
  requireFact(UUID.test(row.original_id??'')&&UUID.test(row.raw_item_id??'')&&
    row.project_id===projectId&&row.original_state==='STORED_VERIFIED'&&
    row.original_id===unit.original_id&&locator.raw_item_id===row.raw_item_id&&
    SHA.test(row.original_sha256??'')&&row.original_sha256===row.raw_checksum&&
    locator.raw_sha256===row.original_sha256&&
    Number.isSafeInteger(Number(row.original_bytes))&&Number(row.original_bytes)>0&&
    Number(row.original_bytes)===Number(row.raw_bytes),
    'STAGE_OUTPUT_ORIGINAL_BYTES_NOT_ATTESTED');
  const image=IMAGE_TYPES.includes(row.content_type);
  const carrier=image?'C02':'C01';
  requireFact(image||row.content_type==='text/plain','STAGE_OUTPUT_CARRIER_NOT_SUPPORTED');
  requireFact(unit.method_code===carrier&&
    unit.locator_schema===(image?'scanned_page/v1':'utf8_byte_range/v1'),
    'STAGE_OUTPUT_READING_METHOD_MISMATCH');

  // page_number is a pre-execution authorization fact read from the run scope.
  const runRows=await query(
    "select scope from control.production_runs where run_id=:'run'::uuid limit 2",
    {run:runId});
  requireFact(Array.isArray(runRows)&&runRows.length===1,
    'STAGE_OUTPUT_RUN_SCOPE_NOT_UNIQUE');
  let runScope=runRows[0].scope;
  if(typeof runScope==='string'){try{runScope=JSON.parse(runScope);}catch{runScope=null;}}
  requireFact(unit.production_run_id===runId&&
    runScope?.project_id===projectId&&
    runScope?.source_version_id===sourceVersionId&&
    runScope?.original_id===row.original_id&&
    runScope?.raw_sha256===row.original_sha256,
    'STAGE_OUTPUT_RUN_SCOPE_MISMATCH');

  // artifact_revision must be the one the database derives for this read unit.
  const revisionRows=await query(
    "select control.artifact_revision_for('read_unit',:'unit'::uuid) as revision",
    {unit:readUnitId});
  requireFact(Array.isArray(revisionRows)&&revisionRows.length===1&&
    revisionRows[0].revision===candidate.artifact_revision,
    'STAGE_OUTPUT_ARTIFACT_REVISION_MISMATCH');

  // The G0-approved method plan is the one D01 recorded as approval evidence.
  const approved=await query([
    "select a.gate_audit_id::text as gate_audit_id, c.evidence_refs::text as evidence_refs",
    "from control.qualification_current q",
    "join control.gate_audits a on a.gate_audit_id=q.gate_audit_id",
    "join control.gate_candidates c on c.candidate_id=a.candidate_id",
    "where q.gate_code='G0' and q.object_type='source_version' and q.object_id=:'sv'::uuid",
    "and a.result='PASS' and a.decision_origin='independent_gate' and a.consumer='producer'",
    "and control.current_qualification_is_valid(a.gate_audit_id)",
    "limit 2"
  ].join(' '),{sv:sourceVersionId});
  requireFact(Array.isArray(approved)&&approved.length===1,
    'STAGE_OUTPUT_G0_METHOD_PLAN_NOT_CURRENT');
  let approvedRefs=approved[0].evidence_refs;
  if(typeof approvedRefs==='string'){try{approvedRefs=JSON.parse(approvedRefs);}catch{approvedRefs=null;}}
  requireFact(Array.isArray(approvedRefs),'STAGE_OUTPUT_G0_METHOD_PLAN_INVALID');
  const approvedPlan=approvedRefs.filter(ref=>ref?.kind==='method_plan');
  const approvedInspected=approvedPlan.map(inspectMethodPlanRef);
  requireFact(approvedPlan.length>0&&approvedInspected.every(v=>v.ok)&&
    new Set(approvedInspected.map(v=>v.id)).size===approvedInspected.length,
    'STAGE_OUTPUT_G0_METHOD_PLAN_INVALID');
  const planned=approvedInspected.find(v=>v.methodId===carrier);
  requireFact(!!planned,'STAGE_OUTPUT_G0_METHOD_PLAN_NOT_APPROVED');

  const methodPlanApproval={gate_audit_id:String(approved[0].gate_audit_id),
    method_id:planned.methodId,method_version:planned.methodVersion,
    planned_methods:approvedInspected.map(v=>v.id)};

  // D01 input = the G0-approved typed request (rebuilt, never Producer-supplied).
  const input=image
    ? {schema:REQUEST_SCHEMA,stage:'D01',originalId:row.original_id,
        method_plan:approvedPlan,
        page:{kind:'scanned_page/v1',page_number:runScope.page_number,
          source_version_id:sourceVersionId,raw_item_id:row.raw_item_id,
          raw_sha256:row.original_sha256,page_sha256:row.original_sha256}}
    : {schema:REQUEST_SCHEMA,stage:'D01',originalId:row.original_id,
        method_plan:approvedPlan,
        text:{kind:'verified_utf8_full/v1',source_version_id:sourceVersionId,
          raw_item_id:row.raw_item_id,raw_sha256:row.original_sha256}};
  if(image){
    requireFact(Number.isSafeInteger(runScope?.page_number)&&runScope.page_number>=1&&
      runScope.page_number<=10000&&locator.page_number===runScope.page_number&&
      locator.page_sha256===row.original_sha256,
      'STAGE_OUTPUT_PAGE_SCOPE_MISMATCH');
  }else{
    // Only the whole-document C01 reading is reconstructible without the quote:
    // the persisted locator must cover exactly the verified bytes.
    requireFact(locator.kind==='utf8_byte_range/v1'&&locator.start_byte===0&&
      locator.end_byte===Number(row.original_bytes)&&
      locator.quote_sha256===row.original_sha256,
      'STAGE_OUTPUT_TEXT_QUOTE_NOT_ATTESTABLE');
  }

  const output={stage:'D01',
    candidate_kind:image?'private_scanned_page_reading':'private_text_reading',
    original_id:row.original_id,source_version_id:sourceVersionId,
    raw_item_id:image?row.raw_item_id:locator.raw_item_id,
    raw_sha256:row.original_sha256,read_run_id:unit.read_run_id,
    read_unit_id:readUnitId,artifact_revision:candidate.artifact_revision,
    request_digest:unit.request_digest,
    ...(image?{page:locator}:{extent:locator}),
    method_plan_approval:methodPlanApproval,gate_candidate_id:cid,
    gate_candidate_status:'SUBMITTED',qualification:'UNASSESSED',gate_code:'G1'};

  return {input,output,input_digest:executionDigest(input),
    output_digest:executionDigest(output),carrier};
}

export async function deriveD01ReadingStageDigests(args={}){
  const facts=await deriveD01ReadingFacts(args);
  return {input_digest:facts.input_digest,output_digest:facts.output_digest,
    carrier:facts.carrier};
}

export async function attestG1ReadingStageOutput({query,candidate,request,registry,projectId}={}){
  requireFact(typeof query==='function','STAGE_OUTPUT_REVIEWER_QUERY_REQUIRED');
  assertStageQualificationRequest(request);
  requireFact(request.stage==='D01'&&request.gate_code==='G1',
    'STAGE_OUTPUT_ATTESTATION_NOT_SUPPORTED');
  requireFact(registry?.status==='ACTIVE_AUTHORIZED'&&registry?.activation?.enabled===true,
    'STAGE_OUTPUT_REGISTRY_NOT_AUTHORIZED');
  const jobs=registry.jobs?.filter(x=>x.stage==='D01');
  requireFact(Array.isArray(jobs)&&jobs.length===1&&jobs[0].exit_gate==='G1',
    'STAGE_OUTPUT_REGISTRY_JOB_AMBIGUOUS');
  const job=jobs[0];
  requireFact(request.job_id===job.job_id&&
    request.reviewer_binding_ref===job.implementation?.gate_reviewer_binding,
    'STAGE_OUTPUT_JOB_REVIEWER_MISMATCH');
  requireFact(candidate?.input_fingerprint===request.input_digest,
    'STAGE_OUTPUT_CANDIDATE_SCOPE_MISMATCH');
  const facts=await deriveD01ReadingFacts({query,candidate,projectId,runId:request.run_id});
  requireFact(facts.input_digest===request.input_digest,
    'STAGE_OUTPUT_INPUT_NOT_REPRODUCIBLE');
  requireFact(facts.output_digest===request.output_digest,
    'STAGE_OUTPUT_DIGEST_NOT_REPRODUCIBLE');
  return {
    job_id:job.job_id,reviewer_binding_ref:job.implementation.gate_reviewer_binding,
    consumer:'producer',input_digest:facts.input_digest,output_digest:facts.output_digest
  };
}

// Single dispatch used by every independent signer composition (local Gate
// service and the CLI Reviewer). The carrier is decided by the persisted
// stage/gate and method plan, never by a Producer-supplied digest.
export function attestStageOutputForRequest({query,candidate,request,registry,projectId}={}){
  const stage=request?.stage, gate=request?.gate_code;
  if(stage==='D01'&&gate==='G1')
    return attestG1ReadingStageOutput({query,candidate,request,registry,projectId});
  requireFact(stage==='D00'&&gate==='G0','STAGE_OUTPUT_ATTESTATION_NOT_SUPPORTED');
  const refs=Array.isArray(candidate?.evidence_refs)?candidate.evidence_refs:[];
  const methodIds=new Set(refs.filter(r=>r?.kind==='method_plan').map(r=>String(r.method_id??'')));
  requireFact(methodIds.size>0&&methodIds.size<=1,'STAGE_OUTPUT_CARRIER_METHOD_AMBIGUOUS');
  const methodId=[...methodIds][0];
  const args={query,candidate,request,registry,projectId};
  if(methodId==='C02')return attestG0ImageStageOutput(args);
  requireFact(methodId==='C01','STAGE_OUTPUT_CARRIER_NOT_SUPPORTED');
  return attestG0TextStageOutput(args);
}

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
