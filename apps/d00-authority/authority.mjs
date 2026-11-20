import {createPrivateKey} from 'node:crypto';
import {Readable} from 'node:stream';
import pg from 'pg';
import {createD00ExecutionAuthorizer} from '../../pipelines/data-production/orchestrator/d00-execution-authorizer.mjs';
import {createD00ExecutionAuthorityHandler} from '../../pipelines/data-production/orchestrator/d00-execution-authority-http.mjs';
import {createD00ExecutionJournal} from '../../pipelines/data-production/orchestrator/d00-execution-journal.mjs';
import {independentGatePoolOptions} from '../../pipelines/data-production/orchestrator/independent-gate-service-runtime.mjs';
import registry from '../../specs/data-production/production-registry.json' with {type:'json'};

let handler;

function configure(env){
 const options=independentGatePoolOptions(env.MOHEN_D00_AUTHORITY_DATABASE_URL,{ca:env.MOHEN_D00_AUTHORITY_DATABASE_CA});
 const pool=new pg.Pool({...options,max:2});
 pool.on('error',()=>{});
 try{
  return createD00ExecutionAuthorityHandler({
   issueCredential:env.MOHEN_D00_AUTHORITY_ISSUE_CREDENTIAL,
   verifyCredential:env.MOHEN_D00_AUTHORITY_VERIFY_CREDENTIAL,
   authority:createD00ExecutionAuthorizer({
    registry,approval:JSON.parse(env.MOHEN_D00_AUTHORITY_APPROVAL),
    privateKey:createPrivateKey(env.MOHEN_D00_AUTHORITY_SIGNING_KEY),
    journal:createD00ExecutionJournal(pool),
   }),
  });
 }catch(error){
  void pool.end();
  throw error;
 }
}

export async function authorityEndpoint(route,req,res){
 res.setHeader('content-type','application/json');
 res.setHeader('cache-control','no-store');
 if(process.env.VERCEL_ENV!=='preview'||process.env.MOHEN_D00_AUTHORITY_ENABLED!=='true'){
  res.statusCode=503;res.end('{"ok":false,"reason":"execution_authority_not_configured"}');return;
 }
 try{
  handler??=configure(process.env);
  const headers=new Headers();
  for(const [key,value] of Object.entries(req.headers)){
   if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):value);
  }
  const requestUrl=new URL(req.url,'https://d00-authority.invalid');
  const url=new URL(route+requestUrl.search,'https://d00-authority.invalid');
  const request=new Request(url,{method:req.method,headers,
   ...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
  const reply=await handler(request);
  res.statusCode=reply.status;
  reply.headers.forEach((value,key)=>res.setHeader(key,value));
  res.end(Buffer.from(await reply.arrayBuffer()));
 }catch{
  res.statusCode=503;res.end('{"ok":false,"reason":"execution_authority_unavailable"}');
 }
}
