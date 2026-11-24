// M5 G0 BATCH-02: independent, read-only reconstruction of a REAL persisted
// D00 -> D01 stage output (text C01 and scanned-page image C02). This is NOT a
// Producer supplied digest, new Gate, or authorization to review other stages.
// Missing facts fail closed.
import {createHash} from 'node:crypto';
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
    "l.link_id::text as link_id, e.reading_unit_id::text as reading_unit_id,",
    "e.input_fingerprint as request_digest,",
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
    row.evidence_type&&row.research_proposition&&
    UUID.test(row.link_id??'')&&UUID.test(row.reading_unit_id??'')&&
    SHA.test(row.request_digest??''),
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

  const output=d02ObservationOutput({originalId:input.originalId,evidenceId,
    readingUnitId:row.reading_unit_id,linkId:row.link_id,readUnitId:row.read_unit_id,
    readRunId:row.link_read_run_id,artifactRevision:candidate.artifact_revision,
    requestDigest:row.request_digest,gateCandidateId:cid});
  return {input,output,input_digest:inputDigest,output_digest:executionDigest(output)};
}

export async function deriveD02ObservationStageDigests(args={}){
  const facts=await deriveD02ObservationFacts(args);
  return {input_digest:facts.input_digest,output_digest:facts.output_digest};
}

// Exact D02 contract output the Runner hands to G2: the persisted candidate the
// private worker returns (see private-evidence-stage.mjs observeMaterial). The
// attester must rebuild THIS object, not a richer variant of its own, or the
// digest can never reproduce.
export function d02ObservationOutput({originalId,evidenceId,readingUnitId,linkId,
  readUnitId,readRunId,artifactRevision,requestDigest,gateCandidateId}={}){
  return {stage:'D02',candidate_kind:'private_material_observation',
    original_id:originalId,evidence_id:evidenceId,
    reading_unit_id:readingUnitId,link_id:linkId,
    read_unit_id:readUnitId,read_run_id:readRunId,
    artifact_revision:artifactRevision,request_digest:requestDigest,
    gate_candidate_id:gateCandidateId,gate_candidate_status:'SUBMITTED',
    qualification:'UNASSESSED',gate_code:'G2'};
}

// The exact signed stage_binding contract G2-G5 attesters must return. The
// read-only verifier matches job, Reviewer binding, both digests and consumer;
// hand-written copies dropped `consumer`, which signed an audit every later
// current-qualification read rejects as unreadable.
export function stageBindingFor(job,facts,gate){
  return {gate_code:gate,consumer:'producer',
    input_digest:facts.input_digest,output_digest:facts.output_digest,
    job_id:job.job_id,reviewer_binding_ref:job.implementation?.gate_reviewer_binding};
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
  // The signed stage_binding is what the read-only verifier later accepts as
  // THIS Producer's handoff, so it must carry the same consumer the G0/G1
  // bindings do; a missing consumer is unreadable by auditHasExactStageBinding.
  return stageBindingFor(job,facts,'G2');
}

// D03 → G3: independent, read-only reconstruction of the REAL persisted D03
// world-claim candidate. The D03 input is rebuilt by the SAME module the issuer
// uses (run scope + current G2 + persisted L2 material evidence), and the output
// is rebuilt from the persisted claim_revision/change/claim_evidence_link rows,
// not from any Producer-supplied digest. Missing/ambiguous facts fail closed.
async function deriveD03WorldClaimFacts({query,candidate,projectId,registry,runId}={}){
  requireFact(typeof query==='function','STAGE_OUTPUT_REVIEWER_QUERY_REQUIRED');
  requireFact(UUID.test(runId??'')&&UUID.test(projectId??''),'STAGE_OUTPUT_RUN_REQUIRED');
  const cid=candidate?.candidate_id, revisionId=candidate?.object_id;
  requireFact(UUID.test(cid??'')&&UUID.test(revisionId??''),'STAGE_OUTPUT_CANDIDATE_SCOPE_MISMATCH');
  const scope=typeof candidate?.scope==='string'?JSON.parse(candidate.scope):candidate?.scope;
  requireFact(scope?.project_id===projectId&&candidate?.stage==='D03'&&candidate?.gate_code==='G3'&&
    candidate?.consumer==='producer'&&candidate?.object_type==='claim_revision'&&
    SHA.test(candidate?.artifact_revision??'')&&SHA.test(candidate?.input_fingerprint??''),
    'STAGE_OUTPUT_CANDIDATE_SCOPE_MISMATCH');
  const {rebuildD03ResumeInput}=await import(
    '../pipelines/data-production/orchestrator/d03-resume-input.mjs');
  const input=await rebuildD03ResumeInput({query,runId,projectId,registry});
  const inputDigest=executionDigest(input);
  requireFact(inputDigest===candidate.input_fingerprint,'STAGE_OUTPUT_INPUT_NOT_REPRODUCIBLE');
  // The evidence_refs must point to exactly this claim revision and its
  // upstream material evidence — never to a different world object.
  const refs=Array.isArray(candidate?.evidence_refs)?candidate.evidence_refs:[];
  requireFact(refs.length===2&&
    refs.some(r=>r?.kind==='claim_revision'&&r.id===revisionId&&r.artifact_revision===candidate.artifact_revision)&&
    refs.some(r=>r?.kind==='material_evidence'&&r.id===input.evidenceId),
    'STAGE_OUTPUT_CANDIDATE_SCOPE_MISMATCH');
  // Persisted world claims of this exact revision, bound to the run's input.
  const rows=await query([
    "select cr.claim_revision_id::text as claim_revision_id, cr.subject_id::text as change_id,",
    "  ch.change_type, cr.producer_method_id, cr.assertion_payload_json::text as payload,",
    "  l.claim_evidence_link_id::text as claim_evidence_link_id, l.evidence_id::text as evidence_id,",
    "  l.support_type",
    "from world.claim_revisions cr",
    "join world.changes ch on ch.change_id=cr.subject_id",
    "join world.claim_evidence_links l on l.claim_revision_id=cr.claim_revision_id",
    "where cr.claim_revision_id=:'rev'::uuid limit 2"
  ].join(' '),{rev:revisionId});
  requireFact(Array.isArray(rows)&&rows.length===1,'STAGE_OUTPUT_WORLD_CLAIM_NOT_UNIQUE');
  const row=rows[0];
  let payload;
  try{payload=JSON.parse(row.payload);}catch{payload=null;}
  // The artifact_revision is the deterministic row hash written by the persist
  // function at execution time; the machine reader cannot recompute it (no
  // sha256_bytes grant), exactly as for G2 we adopt candidate.artifact_revision
  // after cross-checking the independently-readable facts that bind it.
  // The claim payload's request_digest is the candidate repository's persist
  // digest (sha256 of {runId,originalId,evidenceId,claim}), distinct from the
  // stage input digest executionDigest(input). Re-derive it from the persisted
  // input facts and require an exact match — a Producer cannot re-point it.
  const persistDigest=createHash('sha256').update(JSON.stringify({runId,
    originalId:input.originalId,evidenceId:input.evidenceId,claim:input.claim}),'utf8').digest('hex');
  requireFact(row.claim_revision_id===revisionId&&row.evidence_id===input.evidenceId&&
    row.producer_method_id==='W07'&&payload?.qualification==='UNASSESSED'&&
    payload?.request_digest===persistDigest&&
    payload?.original_id===input.originalId&&
    input.claim.change_type===row.change_type&&input.claim.support_type===row.support_type&&
    UUID.test(row.change_id??'')&&UUID.test(row.claim_evidence_link_id??'')&&
    SHA.test(candidate.artifact_revision??''),
    'STAGE_OUTPUT_WORLD_CLAIM_BINDING_MISMATCH');
  // Upstream qualification must be the exact current independent G2.
  const dependency=Array.isArray(candidate?.dependency_snapshot)?candidate.dependency_snapshot:[];
  requireFact(dependency.length===1&&UUID.test(dependency[0].gate_audit_id??'')&&
    SHA.test(dependency[0].artifact_revision??'')&&SHA.test(dependency[0].qualification_digest??''),
    'STAGE_OUTPUT_UPSTREAM_QUALIFICATION_MISMATCH');
  const output={stage:'D03',candidate_kind:'private_world_claim',
    original_id:input.originalId,change_id:row.change_id,
    claim_revision_id:row.claim_revision_id,claim_evidence_link_id:row.claim_evidence_link_id,
    evidence_id:row.evidence_id,artifact_revision:candidate.artifact_revision,
    request_digest:inputDigest,gate_candidate_id:cid,gate_candidate_status:'SUBMITTED',
    qualification:'UNASSESSED',gate_code:'G3'};
  return {input,output,input_digest:inputDigest,output_digest:executionDigest(output)};
}

export async function deriveD03WorldClaimStageDigests(args={}){
  const facts=await deriveD03WorldClaimFacts(args);
  return {input_digest:facts.input_digest,output_digest:facts.output_digest};
}

export async function attestG3WorldClaimStageOutput({query,candidate,request,registry,projectId}={}){
  requireFact(typeof query==='function','STAGE_OUTPUT_REVIEWER_QUERY_REQUIRED');
  assertStageQualificationRequest(request);
  requireFact(request.stage==='D03'&&request.gate_code==='G3',
    'STAGE_OUTPUT_ATTESTATION_NOT_SUPPORTED');
  const jobs=(registry?.jobs??[]).filter(j=>j.stage==='D03');
  requireFact(jobs.length===1,'STAGE_OUTPUT_JOB_NOT_UNIQUE');
  const job=jobs[0];
  if(request.job_id!==undefined)requireFact(request.job_id===job.job_id,'STAGE_OUTPUT_JOB_MISMATCH');
  if(request.reviewer_binding_ref!==undefined)
    requireFact(request.reviewer_binding_ref===job.implementation?.gate_reviewer_binding,
      'STAGE_OUTPUT_REVIEWER_BINDING_MISMATCH');
  const facts=await deriveD03WorldClaimFacts({query,candidate,projectId,registry,runId:request.run_id});
  requireFact(request.input_digest===facts.input_digest&&
    request.output_digest===facts.output_digest,'STAGE_OUTPUT_ATTESTATION_MISMATCH');
  return stageBindingFor(job,facts,'G3');
}

// D04 → G4: independent, read-only reconstruction of the REAL persisted D04
// humanistic-finding candidate. The D04 input is rebuilt by the SAME module the
// authority uses (run scope + current G3 + persisted L3 claim revision), and the
// output is rebuilt from the persisted meaning.finding row, not from any
// Producer-supplied digest. Missing/ambiguous facts fail closed. No paid
// Provider is involved in this derivation.
async function deriveD04FindingFacts({query,candidate,projectId,registry,runId}={}){
  requireFact(typeof query==='function','STAGE_OUTPUT_REVIEWER_QUERY_REQUIRED');
  requireFact(UUID.test(runId??'')&&UUID.test(projectId??''),'STAGE_OUTPUT_RUN_REQUIRED');
  const cid=candidate?.candidate_id, findingId=candidate?.object_id;
  requireFact(UUID.test(cid??'')&&UUID.test(findingId??''),'STAGE_OUTPUT_CANDIDATE_SCOPE_MISMATCH');
  const scope=typeof candidate?.scope==='string'?JSON.parse(candidate.scope):candidate?.scope;
  requireFact(scope?.project_id===projectId&&candidate?.stage==='D04'&&candidate?.gate_code==='G4'&&
    candidate?.consumer==='producer'&&candidate?.object_type==='finding'&&
    SHA.test(candidate?.artifact_revision??'')&&SHA.test(candidate?.input_fingerprint??''),
    'STAGE_OUTPUT_CANDIDATE_SCOPE_MISMATCH');
  const {rebuildD04ResumeInput}=await import(
    '../pipelines/data-production/orchestrator/d04-resume-input.mjs');
  const input=await rebuildD04ResumeInput({query,runId,projectId,registry});
  const inputDigest=executionDigest(input);
  requireFact(inputDigest===candidate.input_fingerprint,'STAGE_OUTPUT_INPUT_NOT_REPRODUCIBLE');
  const refs=Array.isArray(candidate?.evidence_refs)?candidate.evidence_refs:[];
  requireFact(refs.length===2&&
    refs.some(r=>r?.kind==='finding'&&r.id===findingId&&r.artifact_revision===candidate.artifact_revision)&&
    refs.some(r=>r?.kind==='claim_revision'&&r.id===input.claimRevisionId),
    'STAGE_OUTPUT_CANDIDATE_SCOPE_MISMATCH');
  const rows=await query([
    "select f.finding_id::text as finding_id, f.discovery_method->>'method_id' as method_id,",
    "  f.uncertainty->>'qualification' as qualification,",
    "  f.supporting_world_objects::text as refs, f.discovery_method::text as discovery_method",
    "from meaning.findings f where f.finding_id=:'fid'::uuid limit 2"
  ].join(' '),{fid:findingId});
  requireFact(Array.isArray(rows)&&rows.length===1,'STAGE_OUTPUT_FINDING_NOT_UNIQUE');
  const row=rows[0];
  let supporting,method;
  try{supporting=JSON.parse(row.refs);}catch{supporting=null;}
  try{method=JSON.parse(row.discovery_method);}catch{method=null;}
  // The finding must be an UNASSESSED A01-A12 candidate grounded in exactly the
  // claim revision the authority rebuilt. The persist digest is the repository's
  // canonical sha256 of {runId,originalId,claimRevisionId,finding}, distinct
  // from the stage input digest; re-derive it from persisted input facts.
  const persistDigest=createHash('sha256').update(JSON.stringify({runId,
    originalId:input.originalId,claimRevisionId:input.claimRevisionId,finding:input.finding}),'utf8').digest('hex');
  requireFact(row.finding_id===findingId&&/^A(0[1-9]|1[0-2])$/.test(row.method_id??'')&&
    row.qualification==='UNASSESSED'&&
    Array.isArray(supporting)&&supporting.some(r=>r?.kind==='claim_revision'&&r.id===input.claimRevisionId)&&
    method?.request_digest===persistDigest&&SHA.test(candidate.artifact_revision??''),
    'STAGE_OUTPUT_FINDING_BINDING_MISMATCH');
  // Upstream qualification must be the exact current independent G3.
  const dependency=Array.isArray(candidate?.dependency_snapshot)?candidate.dependency_snapshot:[];
  requireFact(dependency.length===1&&UUID.test(dependency[0].gate_audit_id??'')&&
    SHA.test(dependency[0].artifact_revision??'')&&SHA.test(dependency[0].qualification_digest??''),
    'STAGE_OUTPUT_UPSTREAM_QUALIFICATION_MISMATCH');
  const output={stage:'D04',candidate_kind:'private_humanistic_finding',
    original_id:input.originalId,finding_id:findingId,
    claim_revision_id:input.claimRevisionId,artifact_revision:candidate.artifact_revision,
    request_digest:inputDigest,gate_candidate_id:cid,gate_candidate_status:'SUBMITTED',
    qualification:'UNASSESSED',gate_code:'G4'};
  return {input,output,input_digest:inputDigest,output_digest:executionDigest(output)};
}

export async function deriveD04FindingStageDigests(args={}){
  const facts=await deriveD04FindingFacts(args);
  return {input_digest:facts.input_digest,output_digest:facts.output_digest};
}

export async function attestG4FindingStageOutput({query,candidate,request,registry,projectId}={}){
  requireFact(typeof query==='function','STAGE_OUTPUT_REVIEWER_QUERY_REQUIRED');
  assertStageQualificationRequest(request);
  requireFact(request.stage==='D04'&&request.gate_code==='G4',
    'STAGE_OUTPUT_ATTESTATION_NOT_SUPPORTED');
  const jobs=(registry?.jobs??[]).filter(j=>j.stage==='D04');
  requireFact(jobs.length===1,'STAGE_OUTPUT_JOB_NOT_UNIQUE');
  const job=jobs[0];
  if(request.job_id!==undefined)requireFact(request.job_id===job.job_id,'STAGE_OUTPUT_JOB_MISMATCH');
  if(request.reviewer_binding_ref!==undefined)
    requireFact(request.reviewer_binding_ref===job.implementation?.gate_reviewer_binding,
      'STAGE_OUTPUT_REVIEWER_BINDING_MISMATCH');
  const facts=await deriveD04FindingFacts({query,candidate,projectId,registry,runId:request.run_id});
  requireFact(request.input_digest===facts.input_digest&&
    request.output_digest===facts.output_digest,'STAGE_OUTPUT_ATTESTATION_MISMATCH');
  return stageBindingFor(job,facts,'G4');
}

// D05 fact branch → G5: independent, read-only reconstruction of the REAL
// persisted D05 P02 world_projection candidate. The typed input is rebuilt by the
// SAME module the authority uses (run scope + current G4 finding + G3 claim), and
// the output is rebuilt from the persisted read_model.world_projections row, not
// from any Producer-supplied digest. Missing/ambiguous facts fail closed. No paid
// Provider is involved in this derivation.
async function deriveD05FactFacts({ query, candidate, projectId, registry, runId } = {}) {
  requireFact(typeof query === 'function', 'STAGE_OUTPUT_REVIEWER_QUERY_REQUIRED');
  requireFact(UUID.test(runId ?? '') && UUID.test(projectId ?? ''), 'STAGE_OUTPUT_RUN_REQUIRED');
  const cid = candidate?.candidate_id, projectionId = candidate?.object_id;
  requireFact(UUID.test(cid ?? '') && UUID.test(projectionId ?? ''), 'STAGE_OUTPUT_CANDIDATE_SCOPE_MISMATCH');
  const scope = typeof candidate?.scope === 'string' ? JSON.parse(candidate.scope) : candidate?.scope;
  requireFact(scope?.project_id === projectId && candidate?.stage === 'D05' && candidate?.gate_code === 'G5' &&
    candidate?.consumer === 'producer' && candidate?.object_type === 'world_projection' &&
    SHA.test(candidate?.artifact_revision ?? '') && SHA.test(candidate?.input_fingerprint ?? ''),
    'STAGE_OUTPUT_CANDIDATE_SCOPE_MISMATCH');
  const { rebuildD05ResumeInput } = await import(
    '../pipelines/data-production/orchestrator/d05-resume-input.mjs');
  const input = await rebuildD05ResumeInput({ query, runId, projectId, registry });
  const inputDigest = executionDigest(input);
  requireFact(inputDigest === candidate.input_fingerprint, 'STAGE_OUTPUT_INPUT_NOT_REPRODUCIBLE');
  // The projection persisted by the private worker is the exact deterministic
  // spec rebuilt above. Re-derive all of its binding fields from persisted facts.
  const rows = await query([
    'select p.projection_id::text as projection_id, p.projection_key,',
    // derived_from_finding_ids is uuid[]: a plain ::text cast yields the Postgres
    // array literal ({a,b}) which is NOT JSON. Ask the database for JSON so the
    // reviewer parses the same shape it compares against.
    '  p.payload::text as payload, array_to_json(p.derived_from_finding_ids)::text as derived,',
    '  p.expression_rule::text as rule',
    'from read_model.world_projections p where p.projection_id=:\'pid\'::uuid limit 2',
  ].join(' '), { pid: projectionId });
  requireFact(Array.isArray(rows) && rows.length === 1, 'STAGE_OUTPUT_PROJECTION_NOT_UNIQUE');
  const row = rows[0];
  let payload, derived, rule;
  try { payload = JSON.parse(row.payload); } catch { payload = null; }
  try { derived = JSON.parse(row.derived); } catch { derived = null; }
  try { rule = JSON.parse(row.rule); } catch { rule = null; }
  // The private worker persists the canonical (key-sorted) projection body, so the
  // rebuild must be compared by CONTENT, never by JSON key order: a key-order
  // difference is the same persisted fact, while any real difference still fails.
  const sameBody = Boolean(payload?.body) && typeof payload.body === 'object' &&
    !Array.isArray(payload.body) &&
    executionDigest(payload.body) === executionDigest(input.projection.payload);
  requireFact(row.projection_key === input.projection.projection_key &&
    payload?.qualification === 'UNASSESSED' && payload?.finding_id === input.findingId &&
    payload?.original_id === input.originalId &&
    sameBody &&
    SHA.test(payload?.request_digest ?? '') &&
    Array.isArray(derived) && derived.length === 1 && derived[0] === input.findingId &&
    rule?.method_id === 'P02' && rule?.qualification === 'UNASSESSED',
    'STAGE_OUTPUT_PROJECTION_BINDING_MISMATCH');
  const persistDigest = createHash('sha256').update(JSON.stringify({
    runId, originalId: input.originalId, findingId: input.findingId, projection: input.projection,
  }), 'utf8').digest('hex');
  requireFact(payload.request_digest === persistDigest, 'STAGE_OUTPUT_PROJECTION_PERSIST_DIGEST_MISMATCH');
  const refs = Array.isArray(candidate?.evidence_refs) ? candidate.evidence_refs : [];
  requireFact(refs.length === 2 &&
    refs.some((r) => r?.kind === 'world_projection' && r.id === projectionId && r.artifact_revision === candidate.artifact_revision) &&
    refs.some((r) => r?.kind === 'finding' && r.id === input.findingId),
    'STAGE_OUTPUT_CANDIDATE_SCOPE_MISMATCH');
  // Upstream qualification must be the exact current independent G4 audit that
  // the rebuilt fact input bound in its lineage.
  const g4AuditId = input.projection?.payload?.lineage?.g4_audit_id;
  const dependency = Array.isArray(candidate?.dependency_snapshot) ? candidate.dependency_snapshot : [];
  requireFact(dependency.length === 1 && UUID.test(dependency[0].gate_audit_id ?? '') &&
    dependency[0].gate_audit_id === g4AuditId && SHA.test(dependency[0].artifact_revision ?? '') &&
    SHA.test(dependency[0].qualification_digest ?? ''),
    'STAGE_OUTPUT_UPSTREAM_QUALIFICATION_MISMATCH');
  const output = { stage: 'D05', candidate_kind: 'private_world_projection_fact_branch',
    original_id: input.originalId, projection_id: projectionId, finding_id: input.findingId,
    artifact_revision: candidate.artifact_revision, request_digest: inputDigest,
    gate_candidate_id: cid, gate_candidate_status: 'SUBMITTED',
    qualification: 'UNASSESSED', gate_code: 'G5' };
  return { input, output, input_digest: inputDigest, output_digest: executionDigest(output) };
}

export async function deriveD05FactStageDigests(args = {}) {
  const facts = await deriveD05FactFacts(args);
  return { input_digest: facts.input_digest, output_digest: facts.output_digest };
}

export async function attestG5FactStageOutput({ query, candidate, request, registry, projectId } = {}) {
  requireFact(typeof query === 'function', 'STAGE_OUTPUT_REVIEWER_QUERY_REQUIRED');
  assertStageQualificationRequest(request);
  requireFact(request.stage === 'D05' && request.gate_code === 'G5',
    'STAGE_OUTPUT_ATTESTATION_NOT_SUPPORTED');
  const jobs = (registry?.jobs ?? []).filter((j) => j.stage === 'D05');
  requireFact(jobs.length === 1, 'STAGE_OUTPUT_JOB_NOT_UNIQUE');
  const job = jobs[0];
  if (request.job_id !== undefined) requireFact(request.job_id === job.job_id, 'STAGE_OUTPUT_JOB_MISMATCH');
  if (request.reviewer_binding_ref !== undefined)
    requireFact(request.reviewer_binding_ref === job.implementation?.gate_reviewer_binding,
      'STAGE_OUTPUT_REVIEWER_BINDING_MISMATCH');
  const facts = await deriveD05FactFacts({ query, candidate, projectId, registry, runId: request.run_id });
  requireFact(request.input_digest === facts.input_digest &&
    request.output_digest === facts.output_digest, 'STAGE_OUTPUT_ATTESTATION_MISMATCH');
  return stageBindingFor(job,facts,'G5');
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
  if(stage==='D03'&&gate==='G3')
    return attestG3WorldClaimStageOutput({query,candidate,request,registry,projectId});
  if(stage==='D04'&&gate==='G4')
    return attestG4FindingStageOutput({query,candidate,request,registry,projectId});
  if(stage==='D05'&&gate==='G5')
    return attestG5FactStageOutput({query,candidate,request,registry,projectId});
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
