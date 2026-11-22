import fs from 'node:fs';import path from 'node:path';
import {getVercelOidcToken} from '@vercel/oidc';
import {queryRows} from '@mohen/data-access';
import {createCloudProductionServer} from '../../../../../../pipelines/data-production/orchestrator/cloud-production-server.mjs';
import {probeCloudProductionRunner} from '../../../../../../pipelines/data-production/orchestrator/cloud-production-runtime.mjs';
// @ts-expect-error .mjs module has no emitted declaration
import {createD01ResumeProvider} from '../../../../../../pipelines/data-production/orchestrator/d01-resume-provider.mjs';
// @ts-expect-error .mjs module has no emitted declaration
import {createD02ResumeProvider} from '../../../../../../pipelines/data-production/orchestrator/d02-resume-provider.mjs';
// @ts-expect-error .mjs module has no emitted declaration
import {createD03ResumeProvider} from '../../../../../../pipelines/data-production/orchestrator/d03-resume-provider.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=300;
function root(){let dir=process.cwd();for(let i=0;i<6;i++){if(fs.existsSync(path.join(dir,'AGENTS.md')))return dir;dir=path.dirname(dir);}return process.cwd();}
// Each resumed stage has its own independent authority endpoint and one-use
// journal; the executor asks by from_stage and never falls back across stages.
function resumeProviderFor(environment:Record<string,string|undefined>){
 const credential=environment.MOHEN_D01_ISSUE_CREDENTIAL;
 const providers:Record<string,(args:{input:never;fromStage:string})=>Promise<{resume_input:object;token:string}>>={};
 if(environment.MOHEN_D01_ISSUE_URL&&credential)
  providers.D01=createD01ResumeProvider({url:environment.MOHEN_D01_ISSUE_URL,credential,environment});
 if(environment.MOHEN_D02_ISSUE_URL&&credential)
  providers.D02=createD02ResumeProvider({url:environment.MOHEN_D02_ISSUE_URL,credential,environment});
 const d03Credential=environment.MOHEN_D03_ISSUE_CREDENTIAL??credential;
 if(environment.MOHEN_D03_ISSUE_URL&&d03Credential)
  providers.D03=createD03ResumeProvider({url:environment.MOHEN_D03_ISSUE_URL,credential:d03Credential,environment});
 if(!Object.keys(providers).length)return undefined;
 return async(args:{input:never;fromStage:string})=>{
  const provider=providers[args.fromStage];
  if(!provider)throw Error('CLOUD_EXECUTOR_RESUME_PROVIDER_REQUIRED');
  return provider(args);
 };
}
export async function POST(request:Request){
 try{
  const token=process.env.VERCEL_ENV==='preview'&&process.env.MOHEN_D00_TRUSTED_PREVIEW_ACCESS==='true'
   ? await getVercelOidcToken() : undefined;
  const environment:Record<string,string|undefined>=token?{...process.env,MOHEN_D00_PREVIEW_OIDC_TOKEN:token}:{...process.env};
  const resumeProvider=resumeProviderFor(environment);
  // @ts-expect-error .mjs module has no emitted declaration
  return await createCloudProductionServer({environment,projectRoot:root(),db:{queryRows},resumeProvider})(request);
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
