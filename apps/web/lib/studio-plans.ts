// Draft planning only. All authority comes from the signed Owner transaction;
// neither an Owner JSON request nor this frozen plan authorizes execution/spend.
import {createHash} from 'node:crypto';
import type {StudioAssetRepository,StudioDelegationInput} from '@mohen/data-access';
import {createStudioPlan} from '../../../packages/agent-runtime/src/studio-plan.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const keys=new Set(['project_id','asset_id','root_task_ref','series_id','request_id','question','source_revision_ids','expires_at','expected_revision_id']);
const canonical=(v:unknown):string=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v!==null&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical((v as Record<string,unknown>)[k])).join(',')+'}':JSON.stringify(v);
const hash=(v:unknown)=>createHash('sha256').update(canonical(v)).digest('hex');
interface Stores {
 assets:Pick<StudioAssetRepository,'getRevision'|'saveRevision'>;
 delegations:{saveDelegation:(input:StudioDelegationInput,token:string)=>Promise<unknown>};registry:unknown;
}
export async function saveStudioResearchPlan(stores:Stores,input:Record<string,unknown>,actor:{actorId:string;token:string}){
 if(!input||Object.keys(input).some(k=>!keys.has(k))||!uuid.test(actor.actorId)||!actor.token||
  !['project_id','asset_id','root_task_ref','series_id','request_id'].every(k=>typeof input[k]==='string'&&uuid.test(input[k] as string))||
  typeof input.question!=='string'||!input.question.trim()||input.question.length>2000||
  !Array.isArray(input.source_revision_ids)||input.source_revision_ids.length>16||
  !input.source_revision_ids.every(x=>typeof x==='string'&&uuid.test(x))||
  typeof input.expires_at!=='string'||!Number.isFinite(Date.parse(input.expires_at))||
  Date.parse(input.expires_at)<=Date.now()||Date.parse(input.expires_at)>Date.now()+86400000||
  (input.expected_revision_id!==undefined&&input.expected_revision_id!==null&&
   (typeof input.expected_revision_id!=='string'||!uuid.test(input.expected_revision_id))))throw Error('STUDIO_PLAN_REQUEST_INVALID');
 const refs:{ref:string;revision:string}[]=[];
 for(const revisionId of input.source_revision_ids as string[]){
  const source=await stores.assets.getRevision(revisionId,actor.token);
  if(!source||source.project_id!==input.project_id||source.revision_id!==revisionId)throw Error('STUDIO_SOURCE_NOT_FOUND');
  refs.push({ref:String(source.asset_id),revision:revisionId});
 }
 const question=input.question.trim(),root=input.root_task_ref as string;
 const definitions=[['reuse','retrieve-local','reuse_asset',[]],['delegate','llm-extract-entities','external_delegate',['reuse']],
  ['receive-delegate','receive-candidate','receive_candidate',['delegate']],['production','production-run','existing_production',['receive-delegate']],
  ['receive-production','receive-candidate','receive_candidate',['production']]] as const;
 const plan=createStudioPlan({schema_version:1,root_task_id:root,project_id:input.project_id,actor_id:actor.actorId,
  policy_ref:{ref:'mohen.studio-plan',revision:'m4.1'},registry_ref:{ref:'production-registry',revision:hash(stores.registry)},
  source_refs:refs,budget:{amount:'0',currency:'CRD'},nodes:definitions.map(([node_id,tool_id,category,dependencies])=>({
   node_id,tool_id,category,dependencies:[...dependencies],input_schema:{type:'object',version:'m4.1'},output_schema:{type:'object',version:'m4.1'},
   input_hash:hash({question,refs,node_id,dependencies})}))});
 const payload={schema:'mohen.studio-research-plan.v1',request_id:input.request_id,delegation_series_id:input.series_id,title:question.slice(0,200),text:question,plan,
  source_binding:'OWNER_DRAFT_ONLY',plan_request:JSON.parse(JSON.stringify(input)) as Record<string,unknown>,execution_authorized:false};
 const asset=await stores.assets.saveRevision({projectId:input.project_id as string,assetId:input.asset_id as string,kind:'research_brief',
  expectedRevisionId:(input.expected_revision_id as string|null|undefined)??null,idempotencyKey:input.request_id as string,payload,sourceRefs:refs,dependencyRefs:[]},actor.token);
 const delegation=await stores.delegations.saveDelegation({projectId:input.project_id as string,seriesId:input.series_id as string,revisionNo:1,
  rootTaskRef:root,rootTaskSnapshot:{plan,plan_asset_id:input.asset_id,request_id:input.request_id},subtaskRef:'plan-root',executor:'mohen-studio',provider:'mohen-internal-orchestration',engineVersion:'m4.1',
  inputManifest:{plan_hash:plan.plan_hash,source_refs:refs},allowedActions:['prepare_candidate'],
  transferRightsDecision:{external_processing:'DENIED'},policyVersion:'m4.1',expiresAt:input.expires_at,
  budgetLimit:'0',currency:'CRD',outputSchema:'mohen.studio-research-plan.v1',idempotencyKey:input.request_id as string},actor.token);
 return {state:'HOLD' as const,execution_authorized:false as const,asset,delegation,plan,
  missing_requirements:['CURRENT_SOURCE_QUALIFICATION','TRANSFER_AUTHORIZATION','VERIFIED_BUDGET','INDEPENDENT_GATE']};
}
