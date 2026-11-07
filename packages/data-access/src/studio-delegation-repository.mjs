import {createHash,randomUUID} from 'node:crypto';
import {createAppTransaction} from './app-transaction.mjs';
const idPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v!==null&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const hash=v=>createHash('sha256').update(canonical(v)).digest('hex');
const text=v=>typeof v==='string'&&v.trim().length>0&&v.length<=500;
const decimal=v=>typeof v==='string'&&/^(0|[1-9]\d{0,7})(\.\d{1,6})?$/.test(v);
function copy(v){try{const s=JSON.stringify(v);if(!s||Buffer.byteLength(s)>1_000_000)throw Error();return JSON.parse(s);}catch{throw Error('STUDIO_DELEGATION_INVALID');}}
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function id(v){if(!idPattern.test(v??''))throw Error('STUDIO_ID_INVALID');}
/** Private, immutable evidence storage only. This repository never dispatches a
 * provider, grants spend/transfer permission, or validates a candidate. Unverified
 * outcomes remain HOLD; ACTUAL costs require a separate verified reconciliation.
 * The stable root reference/snapshot deliberately does not depend on task FK life.
 */
export function createStudioDelegationRepository(pool){
 const tx=createAppTransaction(pool,'STUDIO_IDENTITY_REQUIRED');
 return {
  async saveDelegation(input,token){
   const v=copy(input);
   if(!object(v)||!idPattern.test(v.projectId??'')||!idPattern.test(v.seriesId??'')||
    !Number.isSafeInteger(v.revisionNo)||v.revisionNo<1||
    !['rootTaskRef','subtaskRef','executor','provider','engineVersion','policyVersion','outputSchema','idempotencyKey','currency'].every(k=>text(v[k]))||
    !object(v.rootTaskSnapshot)||!object(v.inputManifest)||!object(v.transferRightsDecision)||
    !Array.isArray(v.allowedActions)||!v.allowedActions.length||!v.allowedActions.every(text)||
    !decimal(v.budgetLimit)||typeof v.expiresAt!=='string'||!Number.isFinite(Date.parse(v.expiresAt)))throw Error('STUDIO_DELEGATION_INVALID');
   // No task FK binding until its current ownership can be verified by a dedicated service.
   if(v.rootTaskId!==undefined&&v.rootTaskId!==null)throw Error('STUDIO_TASK_BINDING_REQUIRED');
   const payload={projectId:v.projectId,seriesId:v.seriesId,revisionNo:v.revisionNo,rootTaskRef:v.rootTaskRef,
    rootTaskSnapshot:v.rootTaskSnapshot,subtaskRef:v.subtaskRef,executor:v.executor,provider:v.provider,
    engineVersion:v.engineVersion,inputManifest:v.inputManifest,allowedActions:v.allowedActions,
    transferRightsDecision:v.transferRightsDecision,policyVersion:v.policyVersion,expiresAt:new Date(v.expiresAt).toISOString(),
    budgetLimit:Number(v.budgetLimit).toFixed(6),currency:v.currency,outputSchema:v.outputSchema,idempotencyKey:v.idempotencyKey};
   return tx(token,async(client,actor)=>{
    const project=await client.query("select project_id from studio.projects where project_id=$1 and lifecycle_status='ACTIVE'",[v.projectId]);
    if(project.rows.length!==1)throw Error('STUDIO_PROJECT_NOT_FOUND');
    const requestHash=hash({...payload,requester:actor});
    const prior=await client.query('select * from studio.delegations where project_id=$1 and root_task_ref=$2 and idempotency_key=$3',[v.projectId,v.rootTaskRef,v.idempotencyKey]);
    if(prior.rows.length){if(prior.rows[0].request_hash!==requestHash)throw Error('STUDIO_DELEGATION_IDEMPOTENCY_CONFLICT');return prior.rows[0];}
    if(Date.parse(payload.expiresAt)<=Date.now())throw Error('STUDIO_DELEGATION_EXPIRED');
    await client.query(`insert into studio.delegations(delegation_id,project_id,root_task_ref,root_task_snapshot,subtask_ref,
     delegation_series_id,delegation_revision_no,requester,executor,provider,engine_version,input_manifest,allowed_actions,
     transfer_rights_decision,policy_version,expires_at,budget_limit,currency,request_hash,idempotency_key,output_schema)
     values($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14::jsonb,$15,$16,$17,$18,$19,$20,$21)
     on conflict(project_id,root_task_ref,idempotency_key) do nothing`,
     [randomUUID(),v.projectId,v.rootTaskRef,JSON.stringify(v.rootTaskSnapshot),v.subtaskRef,v.seriesId,v.revisionNo,actor,
      v.executor,v.provider,v.engineVersion,JSON.stringify(v.inputManifest),v.allowedActions,JSON.stringify(v.transferRightsDecision),
      v.policyVersion,payload.expiresAt,payload.budgetLimit,v.currency,requestHash,v.idempotencyKey,v.outputSchema]);
    const saved=await client.query('select * from studio.delegations where project_id=$1 and root_task_ref=$2 and idempotency_key=$3',[v.projectId,v.rootTaskRef,v.idempotencyKey]);
    if(saved.rows.length!==1)throw Error('STUDIO_DELEGATION_NOT_PERSISTED');
    if(saved.rows[0].request_hash!==requestHash)throw Error('STUDIO_DELEGATION_IDEMPOTENCY_CONFLICT');
    return saved.rows[0];
   });
  },
  async appendHeldReceipt(input,token){
   if(input?.acceptanceState!==undefined&&input.acceptanceState!=='HOLD')throw Error('STUDIO_RECEIPT_HOLD_ONLY');
   if(input?.costConfidence==='ACTUAL')throw Error('STUDIO_RECEIPT_COST_VERIFICATION_REQUIRED');
   const v=copy(input);
   if(!object(v)||!idPattern.test(v.delegationId??'')||!Number.isSafeInteger(v.attemptNo)||v.attemptNo<1||
    !/^[a-f0-9]{64}$/.test(v.requestHash??'')||!object(v.resultManifest)||!Array.isArray(v.candidateRefs)||
    !Number.isFinite(Date.parse(v.startedAt))||!Number.isFinite(Date.parse(v.finishedAt))||Date.parse(v.finishedAt)<Date.parse(v.startedAt)||
    !['UNKNOWN','ESTIMATED'].includes(v.costConfidence)||
    (v.costConfidence==='UNKNOWN'&&(v.cost!==null||v.currency!==null))||
    (v.costConfidence==='ESTIMATED'&&(!decimal(v.cost)||!text(v.currency)))||
    !text(v.errorCode)||!text(v.actualProvider)||!text(v.actualEngineVersion))throw Error('STUDIO_RECEIPT_INVALID');
   const payload={resultManifest:v.resultManifest,candidateRefs:v.candidateRefs,actualProvider:v.actualProvider,
    actualEngineVersion:v.actualEngineVersion,startedAt:new Date(v.startedAt).toISOString(),finishedAt:new Date(v.finishedAt).toISOString(),
    cost:v.cost===null?null:Number(v.cost).toFixed(6),currency:v.currency,costConfidence:v.costConfidence,errorCode:v.errorCode};
   // result_hash covers exact observed content, not an assertion of provider authenticity.
   const resultHash=hash(payload);
   return tx(token,async client=>{
    const parent=await client.query('select request_hash from studio.delegations where delegation_id=$1',[v.delegationId]);
    if(parent.rows.length!==1)throw Error('STUDIO_DELEGATION_NOT_FOUND');
    if(parent.rows[0].request_hash!==v.requestHash)throw Error('STUDIO_RECEIPT_REQUEST_MISMATCH');
    await client.query(`insert into studio.execution_receipts(receipt_id,delegation_id,attempt_no,request_hash,result_hash,result_manifest,
     candidate_refs,acceptance_state,actual_provider,actual_engine_version,started_at,finished_at,cost,currency,cost_confidence,error_code)
     values($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,'HOLD',$8,$9,$10,$11,$12,$13,$14,$15)
     on conflict(delegation_id,attempt_no) do nothing`,[randomUUID(),v.delegationId,v.attemptNo,v.requestHash,resultHash,
      JSON.stringify(v.resultManifest),JSON.stringify(v.candidateRefs),v.actualProvider,v.actualEngineVersion,
      payload.startedAt,payload.finishedAt,payload.cost,v.currency,v.costConfidence,v.errorCode]);
    const saved=await client.query('select * from studio.execution_receipts where delegation_id=$1 and attempt_no=$2',[v.delegationId,v.attemptNo]);
    if(saved.rows.length!==1)throw Error('STUDIO_RECEIPT_NOT_PERSISTED');
    if(saved.rows[0].result_hash!==resultHash)throw Error('STUDIO_RECEIPT_IDEMPOTENCY_CONFLICT');
    return saved.rows[0];
   });
  },
  async appendVerifiedReceipt(input,token){
   // Verified provider outcome: real usage + versioned price reference + io hashes.
   // ACTUAL remains reserved for a separate bill reconciliation (M4-C03).
   if(input?.acceptanceState!==undefined&&input.acceptanceState!=='ACCEPT_AS_CANDIDATE')throw Error('STUDIO_RECEIPT_VERIFIED_ONLY');
   if(input?.costConfidence==='ACTUAL')throw Error('STUDIO_RECEIPT_COST_VERIFICATION_REQUIRED');
   const v=copy(input);
   if(!object(v)||!idPattern.test(v.delegationId??'')||!Number.isSafeInteger(v.attemptNo)||v.attemptNo<1||
    !/^[a-f0-9]{64}$/.test(v.requestHash??'')||!Array.isArray(v.candidateRefs)||
    !Number.isFinite(Date.parse(v.startedAt))||!Number.isFinite(Date.parse(v.finishedAt))||Date.parse(v.finishedAt)<Date.parse(v.startedAt)||
    v.costConfidence!=='ESTIMATED'||!decimal(v.cost)||!text(v.currency)||
    (v.errorCode!==undefined&&v.errorCode!==null)||
    !text(v.actualProvider)||!text(v.actualEngineVersion))throw Error('STUDIO_RECEIPT_INVALID');
   const m=v.resultManifest;
   if(!object(m)||!object(m.usage)||!Number.isSafeInteger(m.usage.prompt_tokens)||m.usage.prompt_tokens<0||
    !Number.isSafeInteger(m.usage.completion_tokens)||m.usage.completion_tokens<0||
    !text(m.price_ref)||!text(m.rate_window)||!text(m.model)||
    !/^[a-f0-9]{64}$/.test(m.input_hash??'')||!/^[a-f0-9]{64}$/.test(m.output_hash??''))throw Error('STUDIO_RECEIPT_MANIFEST_INCOMPLETE');
   const payload={resultManifest:m,candidateRefs:v.candidateRefs,actualProvider:v.actualProvider,
    actualEngineVersion:v.actualEngineVersion,startedAt:new Date(v.startedAt).toISOString(),finishedAt:new Date(v.finishedAt).toISOString(),
    cost:Number(v.cost).toFixed(6),currency:v.currency,costConfidence:'ESTIMATED',errorCode:null};
   // result_hash covers exact observed content, not an assertion of provider authenticity.
   const resultHash=hash(payload);
   return tx(token,async client=>{
    const parent=await client.query('select request_hash from studio.delegations where delegation_id=$1',[v.delegationId]);
    if(parent.rows.length!==1)throw Error('STUDIO_DELEGATION_NOT_FOUND');
    if(parent.rows[0].request_hash!==v.requestHash)throw Error('STUDIO_RECEIPT_REQUEST_MISMATCH');
    await client.query(`insert into studio.execution_receipts(receipt_id,delegation_id,attempt_no,request_hash,result_hash,result_manifest,
     candidate_refs,acceptance_state,actual_provider,actual_engine_version,started_at,finished_at,cost,currency,cost_confidence,error_code)
     values($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,'ACCEPT_AS_CANDIDATE',$8,$9,$10,$11,$12,$13,$14,$15)
     on conflict(delegation_id,attempt_no) do nothing`,[randomUUID(),v.delegationId,v.attemptNo,v.requestHash,resultHash,
      JSON.stringify(m),JSON.stringify(v.candidateRefs),v.actualProvider,v.actualEngineVersion,
      payload.startedAt,payload.finishedAt,payload.cost,v.currency,'ESTIMATED',null]);
    const saved=await client.query('select * from studio.execution_receipts where delegation_id=$1 and attempt_no=$2',[v.delegationId,v.attemptNo]);
    if(saved.rows.length!==1)throw Error('STUDIO_RECEIPT_NOT_PERSISTED');
    if(saved.rows[0].result_hash!==resultHash)throw Error('STUDIO_RECEIPT_IDEMPOTENCY_CONFLICT');
    if(saved.rows[0].acceptance_state!=='ACCEPT_AS_CANDIDATE')throw Error('STUDIO_RECEIPT_IDEMPOTENCY_CONFLICT');
    return saved.rows[0];
   });
  },
  getDelegationForPlan(projectId,rootTaskRef,idempotencyKey,token){id(projectId);if(!text(rootTaskRef)||!text(idempotencyKey))throw Error('STUDIO_DELEGATION_INVALID');return tx(token,async client=>(await client.query('select * from studio.delegations where project_id=$1 and root_task_ref=$2 and idempotency_key=$3',[projectId,rootTaskRef,idempotencyKey])).rows[0]??null);},
  listDelegations(projectId,token){id(projectId);return tx(token,async client=>(await client.query('select * from studio.delegations where project_id=$1 order by created_at desc,delegation_id limit 100',[projectId])).rows);},
  getDelegation(delegationId,token){id(delegationId);return tx(token,async client=>(await client.query('select * from studio.delegations where delegation_id=$1',[delegationId])).rows[0]??null);},
  listReceipts(delegationId,token){id(delegationId);return tx(token,async client=>(await client.query('select * from studio.execution_receipts where delegation_id=$1 order by attempt_no desc limit 100',[delegationId])).rows);},
 };
}
