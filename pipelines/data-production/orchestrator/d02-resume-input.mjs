// Server-side reconstruction of the REAL D02 typed resume input from persisted,
// independently-readable facts: the run scope, the CURRENT independent G1 PASS
// for this run and the exact persisted L1 read unit it qualifies. Nothing comes
// from a caller snapshot, and missing or ambiguous facts fail closed.
import {isTypedD02ReadingRequest} from './adapter-binding.mjs';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const SCHEMA='mohen.private-evidence-stage-request.v1';
const READING_SCHEMA='mohen.qualified-private-reading.v1';
const fail=code=>{throw Error(code);};

/**
 * @param query async (sql,params)=>rows, executed on the independent reader RLS.
 * @param runId the resumed run that already holds a current independent G1.
 * @param projectId the exact project id from the run scope.
 * @param registry the ACTIVE_AUTHORIZED production registry.
 * @returns the typed D02 resume input object (pass to run.mjs --resume-input-file).
 */
export async function rebuildD02ResumeInput({query,runId,projectId,registry}={}){
 if(typeof query!=='function')fail('D02_RESUME_QUERY_REQUIRED');
 if(registry?.status!=='ACTIVE_AUTHORIZED'||registry?.activation?.enabled!==true)fail('D02_RESUME_REGISTRY_NOT_ACTIVE');
 const job=(registry.jobs??[]).filter(j=>j.stage==='D02');
 if(job.length!==1||job[0].exit_gate!=='G2')fail('D02_RESUME_JOB_AMBIGUOUS');
 const reviewerBinding=job[0].implementation?.gate_reviewer_binding;
 if(!UUID.test(runId??'')||!UUID.test(projectId??''))fail('D02_RESUME_SCOPE_INVALID');
 // The page/scale facts of the run are pre-execution authorization facts and are
 // read from the persisted run row, never from the caller request.
 const runRows=await query("select scope from control.production_runs where run_id=:'run'::uuid limit 2",{run:runId});
 if(!Array.isArray(runRows)||runRows.length!==1)fail('D02_RESUME_RUN_SCOPE_NOT_UNIQUE');
 let scope=runRows[0].scope;
 if(typeof scope==='string'){try{scope=JSON.parse(scope);}catch{scope=null;}}
 if(scope?.project_id!==projectId||!UUID.test(scope?.original_id??'')||!UUID.test(scope?.root_task_id??'')||
    !UUID.test(scope?.source_version_id??'')||!SHA.test(scope?.raw_sha256??''))
  fail('D02_RESUME_RUN_SCOPE_MISMATCH');
 // The authoritative "current qualification" is a live qualification_current row
 // for a producer read_unit joined to its current independent G1 audit that
 // carries the D01 stage binding. Exactly one may exist.
 const current=await query([
  "select q.object_id::text as read_unit_id, a.gate_audit_id::text as gate_audit_id,",
  "  a.artifact_revision, a.details->'stage_binding'->>'job_id' as job_id,",
  "  a.details->'stage_binding'->>'reviewer_binding_ref' as reviewer_binding_ref,",
  "  a.details->'stage_binding'->>'consumer' as consumer",
  "from control.qualification_current q",
  "join control.gate_audits a on a.gate_audit_id=q.gate_audit_id",
  "where a.run_id=:'run'::uuid and a.stage='D01' and a.gate_code='G1'",
  "  and a.result='PASS' and a.decision_origin='independent_gate' and a.current_valid=true",
  "  and q.consumer='producer' and q.object_type='read_unit'",
  "  and (q.valid_until is null or q.valid_until > now())",
  "  and (a.valid_until is null or a.valid_until > now()) limit 2"
 ].join(' '),{run:runId});
 if(!Array.isArray(current)||current.length!==1)fail('D02_RESUME_G1_NOT_CURRENT');
 const g1=current[0];
 if(!UUID.test(g1.read_unit_id??'')||!UUID.test(g1.gate_audit_id??'')||!SHA.test(g1.artifact_revision??'')||
    g1.job_id!==registry.jobs.find(j=>j.stage==='D01')?.job_id||
    g1.reviewer_binding_ref!==registry.jobs.find(j=>j.stage==='D01')?.implementation?.gate_reviewer_binding||
    g1.consumer!=='producer'||typeof reviewerBinding!=='string'||!reviewerBinding)
  fail('D02_RESUME_G1_BINDING_MISMATCH');
 // Independent reader RLS: the exact persisted L1 read unit of THIS run, its raw
 // item and its production facts. No "pick the first" across runs.
 const rows=await query([
  "select u.read_unit_id::text as read_unit_id, u.read_run_id::text as read_run_id,",
  "  u.method_code, u.locator_schema, u.locator::text as locator,",
  "  r.production_run_id::text as production_run_id, r.raw_item_id::text as raw_item_id,",
  "  r.input_sha256 as raw_sha256, r.status, r.config->>'schema' as config_schema,",
  "  r.config->>'private_original_id' as original_id, r.config->>'project_id' as project_id,",
  "  raw.source_version_id::text as source_version_id",
  "from source.read_units u",
  "join source.read_runs r on r.read_run_id=u.read_run_id",
  "join source.raw_items raw on raw.raw_item_id=r.raw_item_id",
  "where u.read_unit_id=:'readUnit'::uuid and r.production_run_id=:'run'::uuid limit 2"
 ].join(' '),{readUnit:g1.read_unit_id,run:runId});
 if(!Array.isArray(rows)||rows.length!==1)fail('D02_RESUME_READ_UNIT_NOT_UNIQUE');
 const row=rows[0];
 if(row.read_unit_id!==g1.read_unit_id||row.production_run_id!==runId||
    row.method_code!=='C01'||row.locator_schema!=='utf8_byte_range/v1'||row.status!=='done'||
    row.config_schema!=='mab.private-text-reading.v1'||row.original_id!==scope.original_id||
    row.project_id!==projectId||row.raw_sha256!==scope.raw_sha256||
    row.source_version_id!==scope.source_version_id||!UUID.test(row.raw_item_id??'')||
    !UUID.test(row.read_run_id??''))fail('D02_RESUME_READ_UNIT_BINDING_MISMATCH');
 let extent;
 try{extent=JSON.parse(row.locator);}catch{extent=null;}
 if(!extent||typeof extent!=='object'||Array.isArray(extent)||extent.kind!=='utf8_byte_range/v1'||
    extent.source_version_id!==row.source_version_id||extent.raw_item_id!==row.raw_item_id||
    extent.raw_sha256!==row.raw_sha256)fail('D02_RESUME_LOCATOR_INVALID');
 // EXACT shape the orchestrator derives for D02 after a qualified C01 reading
 // (see orchestrator.mjs privateD02Request); validated by the same authority the
 // Runner and the Gate binding use.
 const input={schema:SCHEMA,stage:'D02',originalId:scope.original_id,readUnitId:g1.read_unit_id,
  reading:{schema:READING_SCHEMA,run_id:runId,project_id:projectId,root_task_id:scope.root_task_id,
   gate_audit_id:g1.gate_audit_id,artifact_revision:g1.artifact_revision,read_run_id:row.read_run_id,
   source_version_id:row.source_version_id,raw_item_id:row.raw_item_id,raw_sha256:row.raw_sha256,
   extent}};
 if(!isTypedD02ReadingRequest(input))fail('D02_RESUME_INPUT_SHAPE_INVALID');
 return input;
}
