// Independent resume execution authority composition.
// Owns the resume signing key; verifies an upstream CURRENT independent gate
// (G0 for D01, G1 for D02, G2 for D03) with a separate low-privilege reader,
// rebuilds the real next-stage input from persisted facts via a dedicated
// attestor read connection, then signs a one-use stage grant. Never runs in the
// web/Runner process. D01, D02 and D03 keep separate journals and endpoints.
import { createPrivateKey } from 'node:crypto';
import { Readable } from 'node:stream';
import pg from 'pg';
import registry from '../../specs/data-production/production-registry.json' with {type:'json'};
import { createD01ResumeAuthorizer } from '../../pipelines/data-production/orchestrator/d01-resume-authorizer.mjs';
import { createD01ResumeJournal } from '../../pipelines/data-production/orchestrator/d01-resume-journal.mjs';
import { createD02ResumeAuthorizer } from '../../pipelines/data-production/orchestrator/d02-resume-authorizer.mjs';
import { createD02ResumeJournal } from '../../pipelines/data-production/orchestrator/d02-resume-journal.mjs';
import { createD03ResumeAuthorizer } from '../../pipelines/data-production/orchestrator/d03-resume-authorizer.mjs';
import { createD03ResumeJournal } from '../../pipelines/data-production/orchestrator/d03-resume-journal.mjs';
import { createD04ResumeAuthorizer } from '../../pipelines/data-production/orchestrator/d04-resume-authorizer.mjs';
import { createD04ResumeJournal } from '../../pipelines/data-production/orchestrator/d04-resume-journal.mjs';
import { createD05ResumeAuthorizer } from '../../pipelines/data-production/orchestrator/d05-resume-authorizer.mjs';
import { createD05ResumeJournal } from '../../pipelines/data-production/orchestrator/d05-resume-journal.mjs';
import { createD00ExecutionAuthorityHandler } from '../../pipelines/data-production/orchestrator/d00-execution-authority-http.mjs';
import { createD01IssueEndpoint } from '../../pipelines/data-production/orchestrator/d01-resume-issue.mjs';
import { createD02IssueEndpoint } from '../../pipelines/data-production/orchestrator/d02-resume-issue.mjs';
import { createD03IssueEndpoint } from '../../pipelines/data-production/orchestrator/d03-resume-issue.mjs';
import { createD04IssueEndpoint } from '../../pipelines/data-production/orchestrator/d04-resume-issue.mjs';
import { createD05IssueEndpoint } from '../../pipelines/data-production/orchestrator/d05-resume-issue.mjs';
import { createG0ResumeQualificationChecker } from '../../pipelines/data-production/orchestrator/d01-g0-qualification.mjs';
import { createG1ResumeQualificationChecker } from '../../pipelines/data-production/orchestrator/d02-g1-qualification.mjs';
import { createG2ResumeQualificationChecker } from '../../pipelines/data-production/orchestrator/d03-g2-qualification.mjs';
import { createG3ResumeQualificationChecker } from '../../pipelines/data-production/orchestrator/d04-g3-qualification.mjs';
import { createG4ResumeQualificationChecker } from '../../pipelines/data-production/orchestrator/d05-g4-qualification.mjs';
import { createIndependentGateService } from '../../pipelines/data-production/orchestrator/independent-gate-service.mjs';
import { independentGatePoolOptions } from '../../pipelines/data-production/orchestrator/independent-gate-service-runtime.mjs';

let handlers;

const json=v=>typeof v==='string'?JSON.parse(v):v;

function configure(env){
 const d00Job=registry.jobs.find(j=>j.stage==='D00');
 const d01Job=registry.jobs.find(j=>j.stage==='D01');
 const d02Job=registry.jobs.find(j=>j.stage==='D02');
 const d03Job=registry.jobs.find(j=>j.stage==='D03');
 const ca=env.MOHEN_D01_DATABASE_CA;
 // Two distinct low-privilege connections: the journal writer (a D01-dedicated
 // login that is a MEMBER of mohen_d00_grant_journal) and the G0 gate reader
 // (the identity bound to the long-lived consume credential). They cannot be
 // one login, because authenticate_gate_service checks the login against the
 // credential's bound principal.
 const journalPool=new pg.Pool({...independentGatePoolOptions(env.MOHEN_D01_AUTHORITY_DATABASE_URL,{ca}),max:2});
 journalPool.on('error',()=>{});
 const readerPool=new pg.Pool({...independentGatePoolOptions(env.MOHEN_D01_GATE_READER_DATABASE_URL,{ca}),max:2});
 readerPool.on('error',()=>{});
 const attestorPool=new pg.Pool({...independentGatePoolOptions(env.MOHEN_D01_ATTESTOR_DATABASE_URL,{ca}),max:2});
 attestorPool.on('error',()=>{});
 try{
  // CURRENT independent G0 check via the low-privilege gate reader.
  const gateService=createIndependentGateService({readOnly:true,readerPool});
  const bearer=env.MOHEN_GATE_CONSUME_CREDENTIAL;
  if(typeof bearer!=='string'||!bearer.trim())throw Error('gate consume credential required');
  const readG0=async ({run_id,input_digest,output_digest})=>{
   const url=new URL('https://d01-authority.invalid/current');
   const body=JSON.stringify({schema:'mohen.independent-gate-current-check.v1',run_id,
    job_id:d00Job?.job_id,stage:'D00',gate_code:'G0',input_digest,output_digest,
    reviewer_binding_ref:d00Job?.implementation?.gate_reviewer_binding,consumer:'producer'});
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
    "  a.input_fingerprint as input_digest,",
    "  a.details->'stage_binding'->>'output_digest' as output_digest",
    "from control.qualification_current q",
    "join control.gate_audits a on a.gate_audit_id=q.gate_audit_id",
    "where a.run_id=:'run'::uuid and a.stage='D00' and a.gate_code='G0'",
    "  and a.result='PASS' and a.decision_origin='independent_gate' and a.current_valid=true",
    "  and q.consumer='producer' and q.object_type='source_version'",
    "  and (q.valid_until is null or q.valid_until > now())",
    "  and (a.valid_until is null or a.valid_until > now()) limit 2"
   ].join(' '),{run:run_id});
   if(rows.length!==1||!/^[a-f0-9]{64}$/.test(rows[0].input_digest??'')||
      !/^[a-f0-9]{64}$/.test(rows[0].output_digest??''))return null;
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
   return {run_id,stage:'D00',gate_code:'G0',input_digest:g0.input_digest,output_digest:g0.output_digest};
  };
  const issueEndpoint=createD01IssueEndpoint({
   credential:env.MOHEN_D01_ISSUE_CREDENTIAL,attestorQuery,loadCandidate,loadG0Request,authority,registry,
  });
  // D02 resume: the upstream fact is a CURRENT independent G1 on the exact
  // persisted L1 read unit. Same readers/pools, separate journal and endpoint.
  const currentG1=async (run_id)=>{
   const rows=await attestorQuery([
    "select q.object_id::text as read_unit_id, a.gate_audit_id::text as gate_audit_id,",
    "  a.artifact_revision, a.stage, a.gate_code, a.result, a.decision_origin,",
    "  a.current_valid as qualification_current, a.valid_until::text as valid_until,",
    "  a.details->'stage_binding'->>'job_id' as job_id,",
    "  a.details->'stage_binding'->>'reviewer_binding_ref' as reviewer_binding_ref,",
    "  a.details->'stage_binding'->>'consumer' as consumer",
    "from control.qualification_current q",
    "join control.gate_audits a on a.gate_audit_id=q.gate_audit_id",
    "where a.run_id=:'run'::uuid and a.stage='D01' and a.gate_code='G1'",
    "  and a.result='PASS' and a.decision_origin='independent_gate' and a.current_valid=true",
    "  and q.consumer='producer' and q.object_type='read_unit'",
    "  and (q.valid_until is null or q.valid_until > now())",
    "  and (a.valid_until is null or a.valid_until > now()) limit 2"
   ].join(' '),{run:run_id});
   if(rows.length!==1)return null;
   return rows[0];
  };
  const d02QualificationChecker=createG1ResumeQualificationChecker({
   readG1:({run_id})=>currentG1(run_id),d01JobId:d01Job?.job_id,
   gateReviewerBinding:d01Job?.implementation?.gate_reviewer_binding});
  const d02Authority=createD02ResumeAuthorizer({
   registry,holdEpoch:env.MOHEN_D01_RESUME_HOLD_EPOCH,
   privateKey:createPrivateKey(env.MOHEN_D01_RESUME_SIGNING_KEY),
   journal:createD02ResumeJournal(journalPool),qualificationChecker:d02QualificationChecker});
  const d02GrantHandler=createD00ExecutionAuthorityHandler({
   authority:d02Authority,issueCredential:env.MOHEN_D01_ISSUE_CREDENTIAL,
   verifyCredential:env.MOHEN_D01_VERIFY_CREDENTIAL,
  });
  const d02IssueEndpoint=createD02IssueEndpoint({
   credential:env.MOHEN_D01_ISSUE_CREDENTIAL,attestorQuery,authority:d02Authority,registry,
  });
  // D03 resume: the upstream fact is a CURRENT independent G2 on the exact
  // persisted L2 material evidence. Same readers/pools and signing key, but a
  // separate journal and endpoint; the claim is derived from G2 facts by the
  // input builder, never supplied by the Producer. No paid Provider is invoked.
  const currentG2=async (run_id)=>{
   const rows=await attestorQuery([
    "select q.object_id::text as evidence_id, a.gate_audit_id::text as gate_audit_id,",
    "  a.artifact_revision, a.stage, a.gate_code, a.result, a.decision_origin,",
    "  a.current_valid as qualification_current, a.valid_until::text as valid_until,",
    "  a.details->'stage_binding'->>'job_id' as job_id,",
    "  a.details->'stage_binding'->>'reviewer_binding_ref' as reviewer_binding_ref,",
    "  q.consumer::text as consumer",
    "from control.qualification_current q",
    "join control.gate_audits a on a.gate_audit_id=q.gate_audit_id",
    "where a.run_id=:'run'::uuid and a.stage='D02' and a.gate_code='G2'",
    "  and a.result='PASS' and a.decision_origin='independent_gate' and a.current_valid=true",
    "  and q.consumer='producer' and q.object_type='material_evidence'",
    "  and (q.valid_until is null or q.valid_until > now())",
    "  and (a.valid_until is null or a.valid_until > now()) limit 2"
   ].join(' '),{run:run_id});
   if(rows.length!==1)return null;
   return rows[0];
  };
  const d03QualificationChecker=createG2ResumeQualificationChecker({
   readG2:({run_id})=>currentG2(run_id),d02JobId:d02Job?.job_id,
   gateReviewerBinding:d02Job?.implementation?.gate_reviewer_binding});
  const d03Authority=createD03ResumeAuthorizer({
   registry,holdEpoch:env.MOHEN_D01_RESUME_HOLD_EPOCH,
   privateKey:createPrivateKey(env.MOHEN_D01_RESUME_SIGNING_KEY),
   journal:createD03ResumeJournal(journalPool),qualificationChecker:d03QualificationChecker});
  const d03GrantHandler=createD00ExecutionAuthorityHandler({
   authority:d03Authority,issueCredential:env.MOHEN_D01_ISSUE_CREDENTIAL,
   verifyCredential:env.MOHEN_D01_VERIFY_CREDENTIAL,
  });
  const d03IssueEndpoint=createD03IssueEndpoint({
   credential:env.MOHEN_D01_ISSUE_CREDENTIAL,attestorQuery,authority:d03Authority,registry,
  });
  // D04 resume: the upstream fact is a CURRENT independent G3 on the exact
  // persisted L3 claim_revision. Same readers/pools and signing key, but a
  // separate journal and endpoint; the humanistic finding is derived from G3
  // facts by the input builder, never supplied by the Producer. No paid
  // Provider is invoked.
  const currentG3=async (run_id)=>{
   const rows=await attestorQuery([
    "select q.object_id::text as claim_revision_id, a.gate_audit_id::text as gate_audit_id,",
    "  a.artifact_revision, a.stage, a.gate_code, a.result, a.decision_origin,",
    "  a.current_valid as qualification_current, a.valid_until::text as valid_until,",
    "  a.details->'stage_binding'->>'job_id' as job_id,",
    "  a.details->'stage_binding'->>'reviewer_binding_ref' as reviewer_binding_ref,",
    "  q.consumer::text as consumer",
    "from control.qualification_current q",
    "join control.gate_audits a on a.gate_audit_id=q.gate_audit_id",
    "where a.run_id=:'run'::uuid and a.stage='D03' and a.gate_code='G3'",
    "  and a.result='PASS' and a.decision_origin='independent_gate' and a.current_valid=true",
    "  and q.consumer='producer' and q.object_type='claim_revision'",
    "  and (q.valid_until is null or q.valid_until > now())",
    "  and (a.valid_until is null or a.valid_until > now()) limit 2"
   ].join(' '),{run:run_id});
   if(rows.length!==1)return null;
   return rows[0];
  };
  const d04QualificationChecker=createG3ResumeQualificationChecker({
   readG3:({run_id})=>currentG3(run_id),d03JobId:d03Job?.job_id,
   gateReviewerBinding:d03Job?.implementation?.gate_reviewer_binding});
  const d04Authority=createD04ResumeAuthorizer({
   registry,holdEpoch:env.MOHEN_D01_RESUME_HOLD_EPOCH,
   privateKey:createPrivateKey(env.MOHEN_D01_RESUME_SIGNING_KEY),
   journal:createD04ResumeJournal(journalPool),qualificationChecker:d04QualificationChecker});
  const d04GrantHandler=createD00ExecutionAuthorityHandler({
   authority:d04Authority,issueCredential:env.MOHEN_D01_ISSUE_CREDENTIAL,
   verifyCredential:env.MOHEN_D01_VERIFY_CREDENTIAL,
  });
  const d04IssueEndpoint=createD04IssueEndpoint({
   credential:env.MOHEN_D01_ISSUE_CREDENTIAL,attestorQuery,authority:d04Authority,registry,
  });
  // D05 fact branch: the upstream fact is a CURRENT independent G4 on the exact
  // persisted L4 finding. Same readers/pools and signing key, but a separate
  // journal and endpoint; the P02 world projection is derived from G4/G3 facts by
  // the input builder, never supplied by the Producer. No paid Provider invoked.
  const currentG4=async (run_id)=>{
   const rows=await attestorQuery([
    "select q.object_id::text as finding_id, a.gate_audit_id::text as gate_audit_id,",
    "  a.artifact_revision, a.stage, a.gate_code, a.result, a.decision_origin,",
    "  a.current_valid as qualification_current, a.valid_until::text as valid_until,",
    "  a.details->'stage_binding'->>'job_id' as job_id,",
    "  a.details->'stage_binding'->>'reviewer_binding_ref' as reviewer_binding_ref,",
    "  q.consumer::text as consumer",
    "from control.qualification_current q",
    "join control.gate_audits a on a.gate_audit_id=q.gate_audit_id",
    "where a.run_id=:'run'::uuid and a.stage='D04' and a.gate_code='G4'",
    "  and a.result='PASS' and a.decision_origin='independent_gate' and a.current_valid=true",
    "  and q.consumer='producer' and q.object_type='finding'",
    "  and (q.valid_until is null or q.valid_until > now())",
    "  and (a.valid_until is null or a.valid_until > now()) limit 2"
   ].join(' '),{run:run_id});
   if(rows.length!==1)return null;
   return rows[0];
  };
  const d05QualificationChecker=createG4ResumeQualificationChecker({
   readG4:({run_id})=>currentG4(run_id),d04JobId:d04Job?.job_id,
   gateReviewerBinding:d04Job?.implementation?.gate_reviewer_binding});
  const d05Authority=createD05ResumeAuthorizer({
   registry,holdEpoch:env.MOHEN_D01_RESUME_HOLD_EPOCH,
   privateKey:createPrivateKey(env.MOHEN_D01_RESUME_SIGNING_KEY),
   journal:createD05ResumeJournal(journalPool),qualificationChecker:d05QualificationChecker});
  const d05GrantHandler=createD00ExecutionAuthorityHandler({
   authority:d05Authority,issueCredential:env.MOHEN_D01_ISSUE_CREDENTIAL,
   verifyCredential:env.MOHEN_D01_VERIFY_CREDENTIAL,
  });
  const d05IssueEndpoint=createD05IssueEndpoint({
   credential:env.MOHEN_D01_ISSUE_CREDENTIAL,attestorQuery,authority:d05Authority,registry,
  });
  return {
   d01:{'/token':grantHandler,'/consume':grantHandler,'/d01-issue':issueEndpoint},
   d02:{'/token':d02GrantHandler,'/consume':d02GrantHandler,'/d02-issue':d02IssueEndpoint},
   d03:{'/token':d03GrantHandler,'/consume':d03GrantHandler,'/d03-issue':d03IssueEndpoint},
   d04:{'/token':d04GrantHandler,'/consume':d04GrantHandler,'/d04-issue':d04IssueEndpoint},
   d05:{'/token':d05GrantHandler,'/consume':d05GrantHandler,'/d05-issue':d05IssueEndpoint},
  };
 }catch(error){
  void journalPool.end();void readerPool.end();void attestorPool.end();
  throw error;
 }
}

async function serve(group,route,req,res){
 res.setHeader('content-type','application/json');
 res.setHeader('cache-control','no-store');
 // The issue and consume endpoints are authenticated by HMAC signature (never
 // SSO identity) and may serve the stable production domain; the D00 token
 // issuer stays preview-only.
 const env=process.env.VERCEL_ENV;
 const prodOk=(route==='/d01-issue'||route==='/d02-issue'||route==='/d03-issue'||route==='/d04-issue'||route==='/d05-issue'||route==='/consume')&&(env==='preview'||env==='production');
 const previewOk=env==='preview';
 if(process.env.MOHEN_D01_RESUME_AUTHORITY_ENABLED!=='true'||(!prodOk&&!previewOk)){
  res.statusCode=503;res.end('{"ok":false,"reason":"d01_authority_not_configured"}');return;
 }
 try{
  handlers??=configure(process.env);
  const handler=handlers[group]?.[route];
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
 }catch(error){
  const detail=String(error&&error.message?error.message:'unknown').split('\n')[0].replace(/["\\]/g,'').slice(0,120);
  res.statusCode=503;res.end(JSON.stringify({ok:false,reason:'d01_authority_unavailable',detail}));
 }
}

export async function d01AuthorityEndpoint(route,req,res){
 await serve('d01',route,req,res);
}

export async function d02AuthorityEndpoint(route,req,res){
 await serve('d02',route,req,res);
}

export async function d03AuthorityEndpoint(route,req,res){
 await serve('d03',route,req,res);
}

export async function d04AuthorityEndpoint(route,req,res){
 await serve('d04',route,req,res);
}

export async function d05AuthorityEndpoint(route,req,res){
 await serve('d05',route,req,res);
}
