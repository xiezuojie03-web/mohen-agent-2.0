import {createAppTransaction} from './app-transaction.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const text=v=>typeof v==='string'&&v.trim().length>0&&v.length<=500;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const decimal=v=>typeof v==='string'&&/^(0|[1-9][0-9]{0,7})(\.[0-9]{1,6})?$/.test(v);
const currency=v=>typeof v==='string'&&/^[A-Z]{3}$/.test(v);
const fail=()=>{throw Error('STUDIO_EXECUTION_INVALID');};
function copy(v){try{const s=JSON.stringify(v);if(!s||Buffer.byteLength(s)>1_000_000)return fail();return JSON.parse(s);}catch{return fail();}}
function request(input){const v=copy(input);if(!object(v)||!uuid.test(v.delegationId??'')||!uuid.test(v.requestId??''))fail();return v;}
function binding(v){if(!Number.isSafeInteger(v.expectedVersion)||v.expectedVersion<0||!/^[a-f0-9]{64}$/.test(v.inputDigest??'')||!text(v.policyVersion))fail();}
/** Owner-only coordination and evidence, never a provider dispatch or spend grant.
 * inputDigest is the exact immutable delegation.request_hash, not an arbitrary
 * input hash. Uncertain external attempts require separate verified reconciliation.
 */
export function createStudioExecutionRepository(pool){
 const tx=createAppTransaction(pool,'STUDIO_IDENTITY_REQUIRED');
 const apply=(operation,v,token)=>tx(token,async client=>(await client.query('select studio.apply_execution_control($1,$2::jsonb) as state',[operation,JSON.stringify(v)])).rows[0].state);
 const invoke=(functionName,v,token)=>tx(token,async client=>(await client.query(`select studio.${functionName}($1::jsonb) as state`,[JSON.stringify(v)])).rows[0].state);
 return {
  async getState(delegationId,token){if(!uuid.test(delegationId??''))throw Error('STUDIO_ID_INVALID');return apply('GET',{delegationId},token);},
  async revoke(input,token){const v=request(input);if(!text(v.reason))fail();return apply('REVOKE',{delegationId:v.delegationId,requestId:v.requestId,reason:v.reason},token);},
  async claim(input,token){const v=request(input);binding(v);if(!text(v.ownerRef)||!Number.isSafeInteger(v.leaseSeconds)||v.leaseSeconds<1||v.leaseSeconds>300)fail();return apply('CLAIM',{delegationId:v.delegationId,requestId:v.requestId,expectedVersion:v.expectedVersion,ownerRef:v.ownerRef,inputDigest:v.inputDigest,policyVersion:v.policyVersion,leaseSeconds:v.leaseSeconds},token);},
  async checkpoint(input,token){const v=request(input);binding(v);if(!uuid.test(v.leaseId??'')||!['HOLD','IN_FLIGHT','COMPLETED'].includes(v.state)||!object(v.payload))fail();return apply('CHECKPOINT',{delegationId:v.delegationId,requestId:v.requestId,expectedVersion:v.expectedVersion,leaseId:v.leaseId,state:v.state,inputDigest:v.inputDigest,policyVersion:v.policyVersion,payload:v.payload},token);},
  async reserveBudget(input,token){
   const v=request(input);binding(v);
   if(!uuid.test(v.leaseId??'')||!decimal(v.amount)||Number(v.amount)<=0||!currency(v.currency)||!text(v.pricingPolicyVersion))fail();
   return invoke('reserve_execution_budget',{delegationId:v.delegationId,requestId:v.requestId,expectedVersion:v.expectedVersion,
    leaseId:v.leaseId,inputDigest:v.inputDigest,policyVersion:v.policyVersion,amount:v.amount,currency:v.currency,
    pricingPolicyVersion:v.pricingPolicyVersion},token);
  },
  async releaseBudget(input,token){
   const v=request(input);binding(v);
   if((v.leaseId!==null&&!uuid.test(v.leaseId??''))||!text(v.reason))fail();
   return invoke('release_execution_budget',{delegationId:v.delegationId,requestId:v.requestId,expectedVersion:v.expectedVersion,
    leaseId:v.leaseId,inputDigest:v.inputDigest,policyVersion:v.policyVersion,reason:v.reason},token);
  },
  async reconcileCost(input,token){
   const v=request(input);binding(v);
   if(!uuid.test(v.receiptId??''))fail();
   return invoke('reconcile_execution_cost',{delegationId:v.delegationId,requestId:v.requestId,expectedVersion:v.expectedVersion,
    inputDigest:v.inputDigest,policyVersion:v.policyVersion,receiptId:v.receiptId},token);
  },
 };
}
