// Server-side reconstruction of the REAL D00->D01 typed resume input from
// persisted, independently-readable facts. The rebuilt JSON is byte-shaped
// exactly like the bound D00 adapter output, so its executionDigest equals the
// G0 stage_binding.output_digest. No original bytes are read and no caller
// snapshot is trusted. Missing/ambiguous facts fail closed.
import {inspectMethodPlanRef} from '../../../packages/data-access/src/method-plan-ref.mjs';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const SCHEMA='mohen.private-evidence-stage-request.v1';
const IMAGE_TYPES=['image/jpeg','image/png','image/webp'];
const fail=code=>{throw Error(code);};

/**
 * @param query async (sql,params)=>rows, executed on the independent reader RLS.
 * @param candidate the consumed G0 gate_candidate row (object_id = source_version).
 * @param request the current-check request whose output_digest must be reproduced.
 * @param registry the ACTIVE_AUTHORIZED production registry.
 * @param projectId the exact project id from the run scope.
 * @returns the typed D01 resume input object (pass to run.mjs --resume-input-file).
 */
export async function rebuildD01ResumeInput({query,candidate,request,registry,projectId}={}){
 if(typeof query!=='function')fail('D01_RESUME_QUERY_REQUIRED');
 if(!request||request.stage!=='D00'||request.gate_code!=='G0')fail('D01_RESUME_NOT_G0');
 if(registry?.status!=='ACTIVE_AUTHORIZED'||registry?.activation?.enabled!==true)fail('D01_RESUME_REGISTRY_NOT_ACTIVE');
 const job=(registry.jobs??[]).filter(j=>j.stage==='D00');
 if(job.length!==1||job[0].exit_gate!=='G0')fail('D01_RESUME_JOB_AMBIGUOUS');
 const scope=typeof candidate?.scope==='string'?JSON.parse(candidate.scope):candidate?.scope;
 if(!UUID.test(projectId??'')||scope?.project_id!==projectId||
    !UUID.test(candidate?.candidate_id??'')||!UUID.test(candidate?.object_id??'')||
    candidate?.gate_code!=='G0'||candidate?.stage!=='D00'||candidate?.consumer!=='producer'||
    !SHA.test(candidate?.artifact_revision??''))fail('D01_RESUME_CANDIDATE_SCOPE_MISMATCH');
 const refs=candidate.evidence_refs;
 if(!Array.isArray(refs))fail('D01_RESUME_REFS_REQUIRED');
 const sourceRefs=refs.filter(r=>r?.kind==='source_version'&&r.id===candidate.object_id&&
   r.artifact_revision===candidate.artifact_revision);
 if(sourceRefs.length!==1)fail('D01_RESUME_SOURCE_UNBOUND');
 const methodPlan=refs.filter(r=>r?.kind==='method_plan');
 if(methodPlan.length<1||methodPlan.length>8)fail('D01_RESUME_METHOD_PLAN_REQUIRED');
 const inspected=methodPlan.map(inspectMethodPlanRef);
 if(!inspected.every(v=>v.ok)||new Set(inspected.map(v=>v.id)).size!==inspected.length)
   fail('D01_RESUME_METHOD_PLAN_INVALID');
 const textOnly=inspected.every(v=>v.methodId==='C01');
 const imageOnly=inspected.every(v=>v.methodId==='C02');
 if(!textOnly&&!imageOnly)fail('D01_RESUME_METHOD_MIXED');
 // Independent reader RLS: exact source/raw mapping, no "pick the first".
 const rows=await query([
  "select o.original_id::text as original_id, o.project_id::text as project_id,",
  "o.state as original_state, o.content_type as content_type,",
  "o.sha256 as original_sha256, o.byte_size as original_bytes,",
  "r.raw_item_id::text as raw_item_id, r.checksum_sha256 as raw_checksum,",
  "r.byte_size as raw_bytes",
  "from source.raw_items r join studio.private_originals o",
  "on o.storage_bucket || '/' || o.storage_key = r.storage_ref",
  "where r.source_version_id=:'sourceVersion'::uuid and o.project_id=:'project'::uuid",
  "order by o.original_id,r.raw_item_id limit 2"
 ].join(' '),{sourceVersion:candidate.object_id,project:projectId});
 if(!Array.isArray(rows)||rows.length!==1)fail('D01_RESUME_SOURCE_NOT_UNIQUE');
 const row=rows[0];
 if(!UUID.test(row.original_id??'')||!UUID.test(row.raw_item_id??'')||
    row.project_id!==projectId||row.original_state!=='STORED_VERIFIED'||
    !SHA.test(row.original_sha256??'')||row.original_sha256!==row.raw_checksum||
    !(Number.isSafeInteger(Number(row.original_bytes))&&Number(row.original_bytes)>0)||
    Number(row.original_bytes)!==Number(row.raw_bytes))fail('D01_RESUME_BYTES_NOT_ATTESTED');
 // page_number is a pre-execution authorization fact from the run's stored
 // scope, never from a caller request.
 const runRows=await query("select scope from control.production_runs where run_id=:'run'::uuid limit 2",{run:request.run_id});
 if(!Array.isArray(runRows)||runRows.length!==1)fail('D01_RESUME_RUN_SCOPE_NOT_UNIQUE');
 let runScope=runRows[0].scope;
 if(typeof runScope==='string'){try{runScope=JSON.parse(runScope);}catch{runScope=null;}}
 const pageNumber=runScope?.page_number;
 if(runScope?.project_id!==projectId||runScope?.source_version_id!==candidate.object_id||
    runScope?.original_id!==row.original_id||runScope?.raw_sha256!==row.original_sha256||
    !(Number.isSafeInteger(pageNumber)&&pageNumber>=1&&pageNumber<=10000)||
    pageNumber!==scope?.page_number)fail('D01_RESUME_PAGE_SCOPE_MISMATCH');
 // EXACT D00 adapter output shape (see private-evidence-adapters.mjs:87-98).
 const resumeInput=imageOnly
  ? {schema:SCHEMA,stage:'D01',originalId:row.original_id,method_plan:methodPlan,
     page:{kind:'scanned_page/v1',page_number:pageNumber,source_version_id:candidate.object_id,
       raw_item_id:row.raw_item_id,raw_sha256:row.original_sha256,page_sha256:row.original_sha256}}
  : {schema:SCHEMA,stage:'D01',originalId:row.original_id,method_plan:methodPlan,
     text:{kind:'verified_utf8_full/v1',source_version_id:candidate.object_id,
       raw_item_id:row.raw_item_id,raw_sha256:row.original_sha256}};
 if(!IMAGE_TYPES.includes(row.content_type)&&!imageOnly){
  // text/plain is the only C01 carrier; a C01 plan on an image is inconsistent.
  if(row.content_type!=='text/plain')fail('D01_RESUME_CARRIER_CONTENT_MISMATCH');
 }
 if(imageOnly&&!IMAGE_TYPES.includes(row.content_type))fail('D01_RESUME_CARRIER_CONTENT_MISMATCH');
 return resumeInput;
}
