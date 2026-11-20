// Independent D01-resume execution authority composition.
// Owns the D01 signing key; verifies an upstream CURRENT independent G0 with a
// separate low-privilege reader before signing a one-use D01 stage grant.
import { createPrivateKey } from 'node:crypto';
import { Readable } from 'node:stream';
import pg from 'pg';
import registry from '../../specs/data-production/production-registry.json' with {type:'json'};
import { createD01ResumeAuthorizer } from '../../pipelines/data-production/orchestrator/d01-resume-authorizer.mjs';
import { createD01ResumeJournal } from '../../pipelines/data-production/orchestrator/d01-resume-journal.mjs';
import { createD00ExecutionAuthorityHandler } from '../../pipelines/data-production/orchestrator/d00-execution-authority-http.mjs';
import { createG0ResumeQualificationChecker } from '../../pipelines/data-production/orchestrator/d01-g0-qualification.mjs';
import { createIndependentGateService } from '../../pipelines/data-production/orchestrator/independent-gate-service.mjs';
import { independentGatePoolOptions } from '../../pipelines/data-production/orchestrator/independent-gate-service-runtime.mjs';

let handler;

function configure(env){
 const d00Job=registry.jobs.find(j=>j.stage==='D00');
 const ca=env.MOHEN_D00_AUTHORITY_DATABASE_CA;
 const journalPool=new pg.Pool({...independentGatePoolOptions(env.MOHEN_D00_AUTHORITY_DATABASE_URL,{ca}),max:2});
 journalPool.on('error',()=>{});
 const readerPool=new pg.Pool({...independentGatePoolOptions(env.MOHEN_D00_GATE_READER_DATABASE_URL,{ca}),max:2});
 readerPool.on('error',()=>{});
 let gateService;
 try{
  gateService=createIndependentGateService({readOnly:true,readerPool});
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
  return createD00ExecutionAuthorityHandler({
   authority,issueCredential:env.MOHEN_D01_ISSUE_CREDENTIAL,
   verifyCredential:env.MOHEN_D01_VERIFY_CREDENTIAL,
  });
 }catch(error){
  void journalPool.end();void readerPool.end();
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
  handler??=configure(process.env);
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
