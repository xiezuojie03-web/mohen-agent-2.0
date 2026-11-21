import {Readable} from 'node:stream';
import pg from 'pg';
import {readBoundedGateJson} from '../../../pipelines/data-production/orchestrator/bounded-gate-request.mjs';
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
  const incoming=new Request(url,{method:'POST',headers,body:Readable.toWeb(req),duplex:'half'});
  // 预批准 run 可以是逗号分隔的集合：D00/G0 与后续阶段的 G1…G5 都属于同一条 run，
  // 因此不能把读服务钉在单一 run + 单一 D00/G0 上。这里只做"服务范围"预过滤，
  // 真正的 CURRENT 资格仍由 read_gate_stage_qualification 在库内判定。
  const approvedRuns=String(process.env.MOHEN_D00_GATE_APPROVED_RUN_ID??'')
    .split(/[\s,]+/).map(v=>v.trim()).filter(Boolean);
  if(!approvedRuns.length){
   res.statusCode=503;res.end('{"ok":false,"reason":"gate_run_not_configured"}');return;
  }
  let body;
  try{body=await readBoundedGateJson(incoming,{maxBytes:4096});}
  catch(error){
   res.statusCode=error.message==='REQUEST_TOO_LARGE'?413:error.message==='REQUEST_BODY_TIMEOUT'?408:400;
   res.end('{"ok":false,"reason":"invalid_current_request"}');return;
  }
  // 阶段与门禁必须成对（D00→G0、D01→G1…）；具体候选是否 CURRENT 由库内判定。
  const stageGate={D00:'G0',D01:'G1',D02:'G2',D03:'G3',D04:'G4',D05:'G5'};
  if(typeof body?.run_id!=='string'||!approvedRuns.includes(body.run_id)||
     typeof body?.stage!=='string'||stageGate[body.stage]!==body.gate_code){
   res.statusCode=403;res.end('{"ok":false,"reason":"gate_run_scope_denied"}');return;
  }
  headers.delete('content-length');
  const result=await handle(new Request(url,{method:'POST',headers,body:JSON.stringify(body)}));
  res.statusCode=result.status;
  result.headers.forEach((value,key)=>res.setHeader(key,value));
  res.end(Buffer.from(await result.arrayBuffer()));
 }catch{
  res.statusCode=503;
  res.end('{"ok":false,"reason":"independent_gate_unavailable"}');
 }
}
