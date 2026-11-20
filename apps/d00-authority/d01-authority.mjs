// Independent D01-resume execution authority composition.
// Owns the D01 signing key; verifies an upstream CURRENT independent G0 with a
// separate low-privilege reader, rebuilds the real D01 input from persisted
// facts via a dedicated attestor read connection, then signs a one-use D01
// grant. Never runs in the web/Runner process.
import { createPrivateKey } from 'node:crypto';
import { Readable } from 'node:stream';
import pg from 'pg';
import registry from '../../specs/data-production/production-registry.json' with {type:'json'};
import { createD01ResumeAuthorizer } from '../../pipelines/data-production/orchestrator/d01-resume-authorizer.mjs';
import { createD01ResumeJournal } from '../../pipelines/data-production/orchestrator/d01-resume-journal.mjs';
import { createD00ExecutionAuthorityHandler } from '../../pipelines/data-production/orchestrator/d00-execution-authority-http.mjs';
import { createD01IssueEndpoint } from '../../pipelines/data-production/orchestrator/d01-resume-issue.mjs';
import { createG0ResumeQualificationChecker } from '../../pipelines/data-production/orchestrator/d01-g0-qualification.mjs';
import { createIndependentGateService } from '../../pipelines/data-production/orchestrator/independent-gate-service.mjs';
import { independentGatePoolOptions } from '../../pipelines/data-production/orchestrator/independent-gate-service-runtime.mjs';

let handlers;

const json=v=>typeof v==='string'?JSON.parse(v):v;

function configure(env){
 const d00Job=registry.jobs.find(j=>j.stage==='D00');
 const ca=env.MOHEN_D00_AUTHORITY_DATABASE_CA;
 const journalPool=new pg.Pool({...independentGatePoolOptions(env.MOHEN_D00_AUTHORITY_DATABASE_URL,{ca}),max:2});
 journalPool.on('error',()=>{});
 const readerPool=new pg.Pool({...independentGatePoolOptions(env.MOHEN_D00_GATE_READER_DATABASE_URL,{ca}),max:2});
 readerPool.on('error',()=>{});
 const attestorPool=new pg.Pool({...independentGatePoolOptions(env.MOHEN_D01_ATTESTOR_DATABASE_URL,{ca}),max:2});
 attestorPool.on('error',()=>{});
 try{
  // CURRENT independent G0 check via the low-privilege gate reader.
  const gateService=createIndependentGateService({readOnly:true,readerPool});
  const bearer=env.MOHEN_GATE_CONSUME_CREDENTIAL;
  if(typeof bearer!=='string'||!bearer.trim())throw Error('gate consume credential required');
  const readG0=async ({run_id})=>{
   const url=new URL('https://d01-authority.invalid/current');
   const body=JSON.stringify({run_id,stage:'D00',gate_code:'G0',
    reviewer_binding_ref:d00Job?.implementation?.gate_reviewer_binding??null,consumer:'producer'});
   const reply=await gateService(new Request(url,{method:'POST',
    headers:{'content-type':'application/json',authorization:'Bearer '+bearer.trim()},body}));
   if(!reply.ok)return null;
   try{return await reply.json();}catch{return null;}
  };
  const qualificationChecker=createG0ResumeQualificationChecker({
   d00JobId:d00Job?.job_id,gateReviewerBinding:d00Job?.implementation?.gate_reviewer_binding,readG0});
  const authority=createD01ResumeAuthorizer({
   registry,holdEpoch:env.MOHEN_D01_RESUME_HOLD_EPOCH,
   privateKey:createPrivateKey(env.MOHEN_D01_RESUME_SIGNING_KEY),
   journal:createD01ResumeJournal(journalPool),qualificationChecker});
  const grantHandler=createD00ExecutionAuthorityHandler({
   authority,issueCredential:env.MOHEN_D01_ISSUE_CREDENTIAL,
   verifyCredential:env.MOHEN_D01_VERIFY_CREDENTIAL,
  });
  // Attestor queries: only CURRENT independent G0 candidates for this exact run.
  const attestorQuery=async (sql,params={})=>{
   const values=[];const text=sql.replace(/:'([^']+)'/g,(_f,n)=>{values.push(params[n]);return '$'+values.length;});
   return (await attestorPool.query(text,values)).rows;
  };
  // The authoritative "current qualification" is a row in qualification_current
  // whose valid_until is still live, joined to its independent G0 audit carrying
  // a stage_binding.output_digest. This selects exactly one candidate, avoiding
  // older current_valid audits that were superseded without a qualification row.
  const currentG0=async (run_id)=>{
   const rows=await attestorQuery([
    "select a.gate_audit_id::text as audit_id, a.candidate_id::text as candidate_id,",
    "  a.details->'stage_binding'->>'output_digest' as output_digest",
    "from control.qualification_current q",
    "join control.gate_audits a on a.gate_audit_id=q.gate_audit_id",
    "where a.run_id=:'run'::uuid and a.stage='D00' and a.gate_code='G0'",
    "  and a.result='PASS' and a.decision_origin='independent_gate' and a.current_valid=true",
    "  and q.consumer='producer' and q.object_type='source_version'",
    "  and (q.valid_until is null or q.valid_until > now())",
    "  and (a.valid_until is null or a.valid_until > now()) limit 2"
   ].join(' '),{run:run_id});
   if(rows.length!==1||!/^[a-f0-9]{64}$/.test(rows[0].output_digest??''))return null;
   return rows[0];
  };
  const loadCandidate=async ({run_id})=>{
   const g0=await currentG0(run_id);if(!g0)return null;
   const rows=await attestorQuery([
    "select c.candidate_id::text as candidate_id, c.object_id::text as object_id,",
    "  c.object_type, c.gate_code, c.stage, c.consumer, c.artifact_revision,",
    "  c.allowed_scope::text as scope, c.evidence_refs::text as evidence_refs",
    "from control.gate_candidates c where c.candidate_id=:'candidate'::uuid and c.consumer='producer' limit 1"
   ].join(' '),{candidate:g0.candidate_id});
   if(rows.length!==1)return null;
   return {...rows[0],scope:json(rows[0].scope),evidence_refs:json(rows[0].evidence_refs)??[]};
  };
  const loadG0Request=async ({run_id})=>{
   const g0=await currentG0(run_id);if(!g0)return null;
   return {run_id,stage:'D00',gate_code:'G0',output_digest:g0.output_digest};
  };
  const issueEndpoint=createD01IssueEndpoint({
   credential:env.MOHEN_D01_ISSUE_CREDENTIAL,attestorQuery,loadCandidate,loadG0Request,authority,registry,
  });
  return {
   '/token':grantHandler,
   '/consume':grantHandler,
   '/d01-issue':issueEndpoint,
  };
 }catch(error){
  void journalPool.end();void readerPool.end();void attestorPool.end();
  throw error;
 }
}

export async function d01AuthorityEndpoint(route,req,res){
 res.setHeader('content-type','application/json');
 res.setHeader('cache-control','no-store');
 if(process.env.VERCEL_ENV!=='preview'||process.env.MOHEN_D01_RESUME_AUTHORITY_ENABLED!=='true'){
  res.statusCode=503;res.end('{"ok":false,"reason":"d01_authority_not_configured"}');return;
 }
 try{
  handlers??=configure(process.env);
  const handler=handlers[route];
  if(!handler){res.statusCode=404;res.end('{"ok":false,"reason":"not_found"}');return;}
  const headers=new Headers();
  for(const [key,value] of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):value);
  const requestUrl=new URL(req.url,'https://d01-authority.invalid');
  const url=new URL(route+requestUrl.search,'https://d01-authority.invalid');
  const request=new Request(url,{method:req.method,headers,
   ...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
  const reply=await handler(request);
  res.statusCode=reply.status;
  reply.headers.forEach((value,key)=>res.setHeader(key,value));
  res.end(Buffer.from(await reply.arrayBuffer()));
 }catch{
  res.statusCode=503;res.end('{"ok":false,"reason":"d01_authority_unavailable"}');
 }
}
