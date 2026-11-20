import fs from 'node:fs';import path from 'node:path';
import {getVercelOidcToken} from '@vercel/oidc';
import {queryRows} from '@mohen/data-access';
import {createCloudProductionServer} from '../../../../../../pipelines/data-production/orchestrator/cloud-production-server.mjs';
import {probeCloudProductionRunner} from '../../../../../../pipelines/data-production/orchestrator/cloud-production-runtime.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=300;
function root(){let dir=process.cwd();for(let i=0;i<6;i++){if(fs.existsSync(path.join(dir,'AGENTS.md')))return dir;dir=path.dirname(dir);}return process.cwd();}
export async function POST(request:Request){
 try{
  const token=process.env.VERCEL_ENV==='preview'&&process.env.MOHEN_D00_TRUSTED_PREVIEW_ACCESS==='true'
   ? await getVercelOidcToken() : undefined;
  const environment=token?{...process.env,MOHEN_D00_PREVIEW_OIDC_TOKEN:token}:process.env;
  return await createCloudProductionServer({environment,projectRoot:root(),db:{queryRows}})(request);
 }
 catch{console.error('cloud_production_executor_unavailable');return Response.json({ok:false,reason:'cloud_executor_unavailable'},{status:503});}
}

export async function GET(){
 if(process.env.VERCEL_ENV!=='preview'||process.env.MOHEN_D00_RUNNER_PROBE_ENABLED!=='true'){
  return Response.json({ok:false,reason:'not_found'},{status:404,headers:{'cache-control':'no-store'}});
 }
 const result=await probeCloudProductionRunner({projectRoot:root()});
 return Response.json(result,{status:result.ok?200:503,headers:{'cache-control':'no-store'}});
}
