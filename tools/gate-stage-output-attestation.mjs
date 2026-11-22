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

// M5 D02→G2 BATCH: independent, read-only reconstruction of the REAL persisted
// D02 material observation. The D02 input is rebuilt by the SAME module the
// issuer and Runner use (from run scope + current G1 + persisted C01 reading),
// so a Producer can neither supply its own digest nor re-point the reading.
async function deriveD02ObservationFacts({query,candidate,projectId,registry,runId}={}){
  requireFact(typeof query==='function','STAGE_OUTPUT_REVIEWER_QUERY_REQUIRED');
  requireFact(UUID.test(runId??'')&&UUID.test(projectId??''),'STAGE_OUTPUT_RUN_REQUIRED');
  const cid=candidate?.candidate_id, evidenceId=candidate?.object_id;
  requireFact(UUID.test(cid??'')&&UUID.test(evidenceId??''),'STAGE_OUTPUT_CANDIDATE_SCOPE_MISMATCH');
  const scope=typeof candidate?.scope==='string'?JSON.parse(candidate.scope):candidate?.scope;
  requireFact(scope?.project_id===projectId&&candidate?.stage==='D02'&&candidate?.gate_code==='G2'&&
    candidate?.consumer==='producer'&&candidate?.object_type==='material_evidence'&&
    SHA.test(candidate?.artifact_revision??'')&&
    typeof candidate?.input_fingerprint==='string'&&SHA.test(candidate.input_fingerprint),
    'STAGE_OUTPUT_CANDIDATE_SCOPE_MISMATCH');
  const {rebuildD02ResumeInput}=await import(
    '../pipelines/data-production/orchestrator/d02-resume-input.mjs');
  const input=await rebuildD02ResumeInput({query,runId,projectId,registry});
  const inputDigest=executionDigest(input);
  requireFact(inputDigest===candidate.input_fingerprint,
    'STAGE_OUTPUT_INPUT_NOT_REPRODUCIBLE');

  // 取证对象必须是这条 run、这份 C01 阅读单元产出的真实证据行；阅读单元绑定以
  // 证据链接表为准（material_evidence.reading_unit_id 是证据自身的行标识）。
  const rows=await query([
    "select e.evidence_id::text as evidence_id, l.read_unit_id::text as read_unit_id,",
    "l.read_run_id::text as link_read_run_id, l.selected_extent::text as selected_extent,",
    "e.source_id::text as source_id, e.source_version_id::text as source_version_id,",
    "e.raw_item_id::text as raw_item_id, e.locator::text as locator,",
    "e.literal_reading, e.source_voice, e.evidence_type, e.research_proposition,",
    "e.uncertainty::text as uncertainty, e.modality",
    "from evidence.material_evidence e",
    "join evidence.read_unit_evidence_links l on l.evidence_id=e.evidence_id",
    "where e.evidence_id=:'ev'::uuid limit 2"
  ].join(' '),{ev:evidenceId});
  requireFact(Array.isArray(rows)&&rows.length===1,'STAGE_OUTPUT_OBSERVATION_NOT_UNIQUE');
  const row=rows[0];
  requireFact(row.read_unit_id===input.readUnitId&&
    row.link_read_run_id===input.reading.read_run_id&&
    row.source_version_id===input.reading.source_version_id&&
    row.raw_item_id===input.reading.raw_item_id&&
    row.modality==='text_quote'&&row.literal_reading&&row.source_voice&&
    row.evidence_type&&row.research_proposition,
    'STAGE_OUTPUT_OBSERVATION_BINDING_MISMATCH');
  let selected=row.selected_extent;
  if(typeof selected==='string'){try{selected=JSON.parse(selected);}catch{selected=null;}}
  requireFact(selected&&typeof selected==='object'&&
    selected.source_version_id===input.reading.extent.source_version_id&&
    selected.raw_item_id===input.reading.extent.raw_item_id&&
    selected.raw_sha256===input.reading.extent.raw_sha256&&
    selected.start_byte===input.reading.extent.start_byte&&
    selected.end_byte===input.reading.extent.end_byte,
    'STAGE_OUTPUT_OBSERVATION_EXTENT_MISMATCH');
  let locator=row.locator;
  if(typeof locator==='string'){try{locator=JSON.parse(locator);}catch{locator=null;}}
  requireFact(locator&&typeof locator==='object'&&!Array.isArray(locator)&&
    locator.kind==='utf8_byte_range/v1'&&
    locator.source_version_id===input.reading.source_version_id&&
    locator.raw_item_id===input.reading.raw_item_id&&
    locator.raw_sha256===input.reading.raw_sha256&&
    locator.quote_sha256===input.reading.raw_sha256,
    'STAGE_OUTPUT_OBSERVATION_LOCATOR_INVALID');
  let uncertainty=row.uncertainty;
  if(typeof uncertainty==='string'){try{uncertainty=JSON.parse(uncertainty);}catch{uncertainty=null;}}
  requireFact(uncertainty&&typeof uncertainty==='object'&&
    uncertainty.qualification==='UNASSESSED','STAGE_OUTPUT_OBSERVATION_NOT_UNASSESSED');
  // 引文必须是该阅读单元的逐字片段：模型不能自造文本。
  const revision=await query(
    "select control.artifact_revision_for('material_evidence',:'ev'::uuid) as revision",
    {ev:evidenceId});
  requireFact(Array.isArray(revision)&&revision.length===1&&
    revision[0].revision===candidate.artifact_revision,
    'STAGE_OUTPUT_ARTIFACT_REVISION_MISMATCH');
  const dependency=Array.isArray(candidate?.dependency_snapshot)?candidate.dependency_snapshot:[];
  requireFact(dependency.length===1&&
    dependency[0].gate_audit_id===input.reading.gate_audit_id&&
    SHA.test(dependency[0].qualification_digest??''),
    'STAGE_OUTPUT_UPSTREAM_QUALIFICATION_MISMATCH');

  const output={stage:'D02',candidate_kind:'private_material_observation',
    evidence_id:evidenceId,read_unit_id:input.readUnitId,
    source_id:row.source_id,source_version_id:row.source_version_id,
    raw_item_id:row.raw_item_id,extent:locator,
    h_type:'H05',literal_reading:row.literal_reading,source_voice:row.source_voice,
    evidence_type:row.evidence_type,research_proposition:row.research_proposition,
    uncertainty,artifact_revision:candidate.artifact_revision,
    gate_candidate_id:cid,gate_candidate_status:'SUBMITTED',
    qualification:'UNASSESSED',gate_code:'G2'};
  return {input,output,input_digest:inputDigest,output_digest:executionDigest(output)};
}

export async function deriveD02ObservationStageDigests(args={}){
  const facts=await deriveD02ObservationFacts(args);
  return {input_digest:facts.input_digest,output_digest:facts.output_digest};
}

export async function attestG2ObservationStageOutput({query,candidate,request,registry,projectId}={}){
  requireFact(typeof query==='function','STAGE_OUTPUT_REVIEWER_QUERY_REQUIRED');
  assertStageQualificationRequest(request);
  requireFact(request.stage==='D02'&&request.gate_code==='G2',
    'STAGE_OUTPUT_ATTESTATION_NOT_SUPPORTED');
  const jobs=(registry?.jobs??[]).filter(j=>j.stage==='D02');
  requireFact(jobs.length===1,'STAGE_OUTPUT_JOB_NOT_UNIQUE');
  const job=jobs[0];
  if(request.job_id!==undefined)requireFact(request.job_id===job.job_id,'STAGE_OUTPUT_JOB_MISMATCH');
  if(request.reviewer_binding_ref!==undefined)
    requireFact(request.reviewer_binding_ref===job.implementation?.gate_reviewer_binding,
      'STAGE_OUTPUT_REVIEWER_BINDING_MISMATCH');
  const facts=await deriveD02ObservationFacts({query,candidate,projectId,registry,
    runId:request.run_id});
  requireFact(request.input_digest===facts.input_digest&&
    request.output_digest===facts.output_digest,'STAGE_OUTPUT_ATTESTATION_MISMATCH');
  return {gate_code:'G2',input_digest:facts.input_digest,
    output_digest:facts.output_digest,job_id:job.job_id,
    reviewer_binding_ref:job.implementation?.gate_reviewer_binding};
}

// Single dispatch used by every independent signer composition (local Gate
// service and the CLI Reviewer). The carrier is decided by the persisted
// stage/gate and method plan, never by a Producer-supplied digest.
export function attestStageOutputForRequest({query,candidate,request,registry,projectId}={}){
  const stage=request?.stage, gate=request?.gate_code;
  if(stage==='D01'&&gate==='G1')
    return attestG1ReadingStageOutput({query,candidate,request,registry,projectId});
  if(stage==='D02'&&gate==='G2')
    return attestG2ObservationStageOutput({query,candidate,request,registry,projectId});
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
