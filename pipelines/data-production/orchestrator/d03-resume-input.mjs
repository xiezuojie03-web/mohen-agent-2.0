// Server-side reconstruction of the REAL D03 typed resume input from persisted,
// independently-readable facts: the run scope, the CURRENT independent G2 PASS
// for this run and the exact persisted L2 material evidence it qualifies. The
// claim is derived verbatim from the G2-qualified observation (research
// proposition / literal reading), never from a caller snapshot; it stays an
// UNASSESSED world-claim candidate for the independent G3 to judge. Missing or
// ambiguous facts fail closed. No paid Provider is involved in this derivation.
import {isTypedD03WorldClaimRequest} from './adapter-binding.mjs';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const SCHEMA='mohen.private-evidence-stage-request.v1';
const SUPPORT_TYPES=new Set(['supports','contradicts','contextualizes']);
const fail=code=>{throw Error(code);};

/**
 * @param query async (sql,params)=>rows, executed on the independent reader RLS.
 * @param runId the resumed run that already holds a current independent G2.
 * @param projectId the exact project id from the run scope.
 * @param registry the ACTIVE_AUTHORIZED production registry.
 * @returns the typed D03 resume input object (pass to run.mjs --resume-input-file).
 */
export async function rebuildD03ResumeInput({query,runId,projectId,registry}={}){
 if(typeof query!=='function')fail('D03_RESUME_QUERY_REQUIRED');
 if(registry?.status!=='ACTIVE_AUTHORIZED'||registry?.activation?.enabled!==true)fail('D03_RESUME_REGISTRY_NOT_ACTIVE');
 const jobs=(registry.jobs??[]).filter(j=>j.stage==='D03');
 if(jobs.length!==1||jobs[0].exit_gate!=='G3')fail('D03_RESUME_JOB_AMBIGUOUS');
 const reviewerBinding=jobs[0].implementation?.gate_reviewer_binding;
 if(!UUID.test(runId??'')||!UUID.test(projectId??''))fail('D03_RESUME_SCOPE_INVALID');
 // The run's immutable scope is a pre-execution authorization fact, read from
 // the persisted run row, never from the caller request.
 const runRows=await query("select scope from control.production_runs where run_id=:'run'::uuid limit 2",{run:runId});
 if(!Array.isArray(runRows)||runRows.length!==1)fail('D03_RESUME_RUN_SCOPE_NOT_UNIQUE');
 let scope=runRows[0].scope;
 if(typeof scope==='string'){try{scope=JSON.parse(scope);}catch{scope=null;}}
 if(scope?.project_id!==projectId||!UUID.test(scope?.original_id??'')||!UUID.test(scope?.root_task_id??'')||
    !UUID.test(scope?.source_version_id??'')||!SHA.test(scope?.raw_sha256??''))
  fail('D03_RESUME_RUN_SCOPE_MISMATCH');
 // Authoritative "current qualification": a live qualification_current row for
 // a producer material_evidence joined to its CURRENT independent G2 audit that
 // carries the D02 stage binding. Exactly one may exist.
 const current=await query([
  "select q.object_id::text as evidence_id, a.gate_audit_id::text as gate_audit_id,",
  "  a.artifact_revision, a.details->'stage_binding'->>'job_id' as job_id,",
  "  a.details->'stage_binding'->>'reviewer_binding_ref' as reviewer_binding_ref,",
  "  q.consumer::text as consumer",
  "from control.qualification_current q",
  "join control.gate_audits a on a.gate_audit_id=q.gate_audit_id",
  "where a.run_id=:'run'::uuid and a.stage='D02' and a.gate_code='G2'",
  "  and a.result='PASS' and a.decision_origin='independent_gate' and a.current_valid=true",
  "  and q.consumer='producer' and q.object_type='material_evidence'",
  "  and (q.valid_until is null or q.valid_until > now())",
  "  and (a.valid_until is null or a.valid_until > now()) limit 2"
 ].join(' '),{run:runId});
 if(!Array.isArray(current)||current.length!==1)fail('D03_RESUME_G2_NOT_CURRENT');
 const g2=current[0];
 const d02Job=(registry.jobs??[]).find(j=>j.stage==='D02');
 if(!UUID.test(g2.evidence_id??'')||!UUID.test(g2.gate_audit_id??'')||!SHA.test(g2.artifact_revision??'')||
    g2.job_id!==d02Job?.job_id||
    g2.reviewer_binding_ref!==d02Job?.implementation?.gate_reviewer_binding||
    g2.consumer!=='producer'||typeof reviewerBinding!=='string'||!reviewerBinding)
  fail('D03_RESUME_G2_BINDING_MISMATCH');
 // Independent reader RLS: the exact persisted L2 material evidence of THIS run,
 // its ordered source link and production facts. No "pick the first" across runs.
 const rows=await query([
  "select e.evidence_id::text as evidence_id, e.source_id::text as source_id,",
  "  e.source_version_id::text as source_version_id, e.raw_item_id::text as raw_item_id,",
  "  e.literal_reading, e.research_proposition, e.evidence_type, e.source_voice,",
  "  e.uncertainty::text as uncertainty, e.reading_unit_id::text as reading_unit_id,",
  "  l.link_id::text as link_id, l.read_unit_id::text as read_unit_id,",
  "  raw.checksum_sha256 as raw_sha256",
  "from evidence.material_evidence e",
  "join evidence.read_unit_evidence_links l on l.evidence_id=e.evidence_id",
  "  and l.link_version='mab.private-material-observation.v1'",
  "join source.raw_items raw on raw.raw_item_id=e.raw_item_id and raw.source_version_id=e.source_version_id",
  "where e.evidence_id=:'evidence'::uuid limit 2"
 ].join(' '),{evidence:g2.evidence_id});
 if(!Array.isArray(rows)||rows.length!==1)fail('D03_RESUME_EVIDENCE_NOT_UNIQUE');
 const ev=rows[0];
 if(ev.evidence_id!==g2.evidence_id||ev.source_version_id!==scope.source_version_id||
    ev.raw_sha256!==scope.raw_sha256||!UUID.test(ev.source_id??'')||!UUID.test(ev.raw_item_id??'')||
    !UUID.test(ev.read_unit_id??'')||!UUID.test(ev.reading_unit_id??''))
  fail('D03_RESUME_EVIDENCE_BINDING_MISMATCH');
 let uncertainty;
 try{uncertainty=JSON.parse(ev.uncertainty);}catch{uncertainty=null;}
 if(!uncertainty||typeof uncertainty!=='object'||Array.isArray(uncertainty)||
    uncertainty.qualification!=='UNASSESSED')fail('D03_RESUME_EVIDENCE_NOT_CANDIDATE');
 // Derive the W07 world-claim candidate faithfully from the G2-qualified
 // material observation. The proposition is a material claim (source voice),
 // NOT a historical fact verdict; D03 must not upgrade it, and the independent
 // G3 still decides whether the world object holds under a bounded purpose.
 const assertion=typeof ev.research_proposition==='string'&&ev.research_proposition.trim()&&
    Buffer.byteLength(ev.research_proposition)<=2000
   ? ev.research_proposition
   : (typeof ev.literal_reading==='string'&&ev.literal_reading.trim()&&Buffer.byteLength(ev.literal_reading)<=2000
       ? ev.literal_reading : null);
 if(!assertion)fail('D03_RESUME_ASSERTION_UNAVAILABLE');
 const changeType=typeof ev.evidence_type==='string'&&ev.evidence_type.trim()&&ev.evidence_type.length<=200
   ? ev.evidence_type : null;
 if(!changeType)fail('D03_RESUME_CHANGE_TYPE_UNAVAILABLE');
 const timeScope={note:'D03 world-claim candidate derived from a current G2 material observation; dating/identity remain unresolved at D03',
   qualification:'UNASSESSED',source_voice:ev.source_voice};
 const input={schema:SCHEMA,stage:'D03',originalId:scope.original_id,evidenceId:ev.evidence_id,
  claim:{assertion,change_type:changeType,time_scope:timeScope,support_type:'supports'}};
 if(!isTypedD03WorldClaimRequest(input)||!SUPPORT_TYPES.has(input.claim.support_type))
  fail('D03_RESUME_INPUT_SHAPE_INVALID');
 return input;
}
