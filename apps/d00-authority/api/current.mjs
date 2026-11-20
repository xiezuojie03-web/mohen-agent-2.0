import {Readable} from 'node:stream';
import pg from 'pg';
import {createIndependentGateService} from '../../../pipelines/data-production/orchestrator/independent-gate-service.mjs';
import {independentGatePoolOptions} from '../../../pipelines/data-production/orchestrator/independent-gate-service-runtime.mjs';

let handle;

export default async function current(req,res){
 res.setHeader('content-type','application/json');
 res.setHeader('cache-control','no-store');
 if(process.env.VERCEL_ENV!=='preview'||process.env.MOHEN_D00_GATE_READER_ENABLED!=='true'){
  res.statusCode=404;
  res.end('{"ok":false,"reason":"not_found"}');
  return;
 }
 if(req.method!=='POST'){
  res.statusCode=405;
  res.end('{"ok":false,"reason":"method_not_allowed"}');
  return;
 }
 try{
  if(!handle){
   const options=independentGatePoolOptions(process.env.MOHEN_D00_GATE_READER_DATABASE_URL,{ca:process.env.MOHEN_D00_AUTHORITY_DATABASE_CA});
   const readerPool=new pg.Pool({...options,max:2});
   readerPool.on('error',()=>{});
   handle=createIndependentGateService({readOnly:true,readerPool});
  }
  const url=new URL('/current','https://d00-gate.invalid');
  url.search=new URL(req.url,'https://d00-gate.invalid').search;
  const headers=new Headers();
  for(const name of ['authorization','content-type','content-length']){
   const value=req.headers[name];
   if(typeof value==='string')headers.set(name,value);
  }
  const result=await handle(new Request(url,{method:'POST',headers,body:Readable.toWeb(req),duplex:'half'}));
  res.statusCode=result.status;
  result.headers.forEach((value,key)=>res.setHeader(key,value));
  res.end(Buffer.from(await result.arrayBuffer()));
 }catch{
  res.statusCode=503;
  res.end('{"ok":false,"reason":"independent_gate_unavailable"}');
 }
}
