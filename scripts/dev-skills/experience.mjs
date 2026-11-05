// CTX-ENG offline experience analysis. No model, shell, Registry write or activation.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const fields=['id','task','signature','host','baseline_sha','result_sha','outcome','reuse_target','checks',
 'evidence_refs','redacted','context','production','paid','restricted_data'].sort();
const id=/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,119}$/;
const sha=/^[a-f0-9]{40}$/;
const checks=new Set(['static','typecheck','unit','boundary','build','http','permission-negative','profile-negative']);
const targets={existing_method:'UPGRADE_EXISTING',shared_tool:'SHARED_SCRIPT',independent_method:'NEW_SKILL_CANDIDATE'};
const evidence=/^(?:tasks\/(?:results\/MAB|implementation\/MAB)\/[A-Za-z0-9_.-]+\.(?:md|json)|https:\/\/github\.com\/xiezuojie03-web\/mohen-agent-2\.0\/actions\/runs\/[0-9]+)$/;
function validate(r){
 if(!r||typeof r!=='object'||Array.isArray(r)||JSON.stringify(Object.keys(r).sort())!==JSON.stringify(fields)||
  ![r.id,r.task,r.signature].every(x=>typeof x==='string'&&id.test(x))||
  !['codex','codebuddy','unknown'].includes(r.host)||![r.baseline_sha,r.result_sha].every(x=>typeof x==='string'&&sha.test(x))||
  !['PASS','FAIL','DEFERRED_ENV'].includes(r.outcome)||!Object.hasOwn(targets,r.reuse_target)||
  !Array.isArray(r.checks)||!r.checks.length||!r.checks.every(x=>checks.has(x))||
  !Array.isArray(r.evidence_refs)||!r.evidence_refs.length||!r.evidence_refs.every(x=>typeof x==='string'&&evidence.test(x))||
  r.redacted!==true||r.context!=='CTX-ENG'||r.production!==false||r.paid!==false||r.restricted_data!==false)
  throw Error('EXPERIENCE_INVALID');
 return Object.fromEntries(fields.map(k=>[k,Array.isArray(r[k])?[...new Set(r[k])].sort():r[k]]));
}
export function analyzeExperience(receipts){
 if(!Array.isArray(receipts)||receipts.length>1000)throw Error('EXPERIENCE_INVALID');
 const unique=new Map();
 for(const input of receipts){
  const r=validate(input),previous=unique.get(r.id);
  if(previous&&JSON.stringify(previous)!==JSON.stringify(r))throw Error('EXPERIENCE_RECEIPT_CONFLICT');
  unique.set(r.id,r);
 }
 const groups=new Map();
 for(const r of [...unique.values()].sort((a,b)=>a.id.localeCompare(b.id))){
  const group=groups.get(r.signature)??[];group.push(r);groups.set(r.signature,group);
 }
 return {schema:'mohen.dev-experience-analysis.v1',host_telemetry_available:false,receipt_count:unique.size,
  discovery:'EXACT_SIGNATURE_GROUPING_ON_EXPLICIT_REDACTED_RECEIPTS',
  candidates:[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([signature,rows])=>{
   const success=rows.filter(r=>r.outcome==='PASS'),signals=new Set(success.map(r=>r.reuse_target));
   const route=success.length&&signals.size===1?targets[success[0].reuse_target]:'LESSON_ONLY';
   return {signature,route,state:route==='LESSON_ONLY'?'OBSERVED':'DRAFT_PENDING_EVALUATION',auto_activate:false,
    permission:'NO_EXECUTION_AUTHORITY',sample_count:rows.length,success_count:success.length,
    failure_count:rows.filter(r=>r.outcome==='FAIL').length,source_receipts:rows.map(r=>r.id),
    evidence:rows.map(r=>({receipt_id:r.id,task:r.task,host:r.host,baseline_sha:r.baseline_sha,result_sha:r.result_sha,evidence_refs:r.evidence_refs})),
    proposed_checks:[...new Set(success.flatMap(r=>r.checks))].sort(),
    required_evaluation:['positive-and-negative-tests','reuse-value','host-specific-permissions','version-and-rollback','authorized-admission'],
    rollback:'Discard draft; retain source receipts; never change canonical or product routes automatically.'};
  })};
}
// Explicit work receipts only: classify/schedule, never execute or grant access.
export function triageWork(tasks){
 const keys=['id','depends_on','completed','classification','signature','evidence_revision','attempts'].sort();
 const classes=new Set(['READY','DATA_BLOCKED','GATE_BLOCKED','OWNER_BLOCKED']);
 const invalid=()=>{throw Error('WORKLIST_INVALID');};
 if(!Array.isArray(tasks)||tasks.length>1000)invalid();
 const byId=new Map();
 for(const t of tasks){
  if(!t||typeof t!=='object'||Array.isArray(t)||JSON.stringify(Object.keys(t).sort())!==JSON.stringify(keys)||
   ![t.id,t.signature].every(v=>typeof v==='string'&&id.test(v))||byId.has(t.id)||
   typeof t.completed!=='boolean'||!classes.has(t.classification)||typeof t.evidence_revision!=='string'||!sha.test(t.evidence_revision)||
   !Array.isArray(t.depends_on)||!t.depends_on.every(v=>typeof v==='string'&&id.test(v))||
   !Array.isArray(t.attempts)||t.attempts.length>1000)invalid();
  for(const a of t.attempts)if(!a||JSON.stringify(Object.keys(a).sort())!==JSON.stringify(['evidence_revision','outcome'])||
   !['PASS','FAIL','DEFERRED_ENV'].includes(a.outcome)||typeof a.evidence_revision!=='string'||!sha.test(a.evidence_revision))invalid();
  byId.set(t.id,t);
 }
 const rows=new Map(),visiting=new Set(),order=[];
 function visit(t){
  if(rows.has(t.id))return rows.get(t.id);
  if(visiting.has(t.id))invalid();visiting.add(t.id);
  const deps=[...new Set(t.depends_on)].map(d=>{if(!byId.has(d))invalid();return visit(byId.get(d));});
  const inherited=deps.filter(d=>!d.completed&&d.effective_classification!=='READY').map(d=>d.effective_classification);
  const classification=t.classification!=='READY'?t.classification:(inherited[0]??'READY');
  let repeats=0;
  for(const a of [...t.attempts].reverse()){
   if(a.evidence_revision!==t.evidence_revision||a.outcome==='PASS')break;
   repeats++;
  }
  const execution=t.completed?'COMPLETE':classification!=='READY'?'EXTERNAL_BLOCKED':repeats>=2?'STOP_REPEATED_FAILURE':
   deps.some(d=>!d.completed&&d.execution!=='READY')?'DEPENDENCY_BLOCKED':'READY';
  const row={id:t.id,completed:t.completed,declared_classification:t.classification,effective_classification:classification,
   execution,waiting_for:deps.filter(d=>!d.completed).map(d=>d.id),evidence_revision:t.evidence_revision};
  rows.set(t.id,row);order.push(row);visiting.delete(t.id);return row;
 }
 for(const t of tasks)visit(t);
 return {schema:'mohen.dev-work-triage.v1',auto_execute:false,permission:'NO_EXECUTION_AUTHORITY',
  observation:'EXPLICIT_WORKLIST_NOT_ENVIRONMENT_OR_AUTHORIZATION_PROOF',
  ready:order.filter(t=>t.execution==='READY').map(t=>t.id),tasks:order,complete:order.every(t=>t.completed)};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 try{
  if(process.argv.length!==4||!['--input','--worklist'].includes(process.argv[2]))throw Error('EXPERIENCE_INVALID_ARGUMENTS');
  const data=fs.readFileSync(process.argv[3],'utf8');if(Buffer.byteLength(data)>1048576)throw Error('EXPERIENCE_INVALID_SIZE');
  process.stdout.write(JSON.stringify(process.argv[2]==='--worklist'?triageWork(JSON.parse(data)):analyzeExperience(JSON.parse(data)),null,2)+'\n');
 }catch{process.stderr.write('EXPERIENCE_ANALYSIS_REJECTED\n');process.exitCode=64;}
}
