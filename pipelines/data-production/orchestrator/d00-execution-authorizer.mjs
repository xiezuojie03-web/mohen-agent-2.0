// Runs in the independent authority. The journal must atomically enforce one
// issuance per approved run and one matching consumption before expiration.
import { randomBytes, sign } from 'node:crypto';
import { executionDigest } from './execution-authority.mjs';

const header=Buffer.from(JSON.stringify({alg:'EdDSA',typ:'MOHEN-STAGE',kid:'mohen-stage-v1'})).toString('base64url');
const jobId='d00.source-intake';
const hexDigest=/^[a-f0-9]{64}$/;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const denied=()=>Error('D00_EXECUTION_AUTHORITY_DENIED');

export function createD00ExecutionAuthorizer({registry,approval,privateKey,journal,now=Date.now}={}){
 const {runId,inputDigest,registryDigest,holdEpoch,authorizedConditions}=approval??{};
 const job=registry?.jobs?.find(entry=>entry.stage==='D00'&&entry.job_id===jobId);
 const policy=job?.execution_policy;
 if(registry?.status!=='ACTIVE_AUTHORIZED'||registry.activation?.enabled!==true||
  typeof registry.architecture_generation!=='string'||!registry.architecture_generation||
  policy?.enabled!==true||policy.attended!==true||!Array.isArray(policy.enable_requires)||
  !policy.enable_requires.length||!policy.enable_requires.every(key=>Object.hasOwn(authorizedConditions??{},key)&&authorizedConditions[key]===true)||
  !uuid.test(runId)||!hexDigest.test(inputDigest)||registryDigest!==executionDigest(registry)||
  typeof holdEpoch!=='string'||!holdEpoch.trim()||holdEpoch.length>128||
  privateKey?.type!=='private'||privateKey.asymmetricKeyType!=='ed25519'||
  typeof journal?.issueOnce!=='function'||typeof journal.consumeOnce!=='function'){
  throw Error('D00_EXECUTION_AUTHORITY_CONFIG_INVALID');
 }
 const binding={run_id:runId,stage:'D00',job_id:jobId,mode:'attended'};
 const approvalBinding={...binding,hold_epoch:holdEpoch,registry_digest:registryDigest,input_digest:inputDigest};
 const conditions=Object.fromEntries(policy.enable_requires.map(key=>[key,true]));
 const architectureGeneration=registry.architecture_generation;
 function matches(value,expected){
  return value&&Object.entries(expected).every(([key,required])=>value[key]===required);
 }
 return {
  async issue(request){
   if(!matches(request,binding)||executionDigest(request.input)!==inputDigest)throw denied();
   const iat=Math.floor(now()/1000);
   const claims={...approvalBinding,iss:'mohen-independent-execution-authorizer',aud:'mohen-production-stage',
    architecture_generation:architectureGeneration,iat,exp:iat+240,
    jti:randomBytes(24).toString('hex'),authorized_conditions:conditions};
   const payload=Buffer.from(JSON.stringify(claims)).toString('base64url');
   const message=header+'.'+payload;
   const signature=sign(null,Buffer.from(message),privateKey).toString('base64url');
   if(await journal.issueOnce({...approvalBinding,jti:claims.jti,exp:claims.exp})!==true)throw denied();
   return {token:message+'.'+signature};
  },
  async consume(request){
   if(!matches(request,approvalBinding)||typeof request.jti!=='string'||!/^[a-f0-9]{48}$/.test(request.jti)){
    throw denied();
   }
   const issuedBinding={...approvalBinding,jti:request.jti};
   if(await journal.consumeOnce(issuedBinding,Math.floor(now()/1000))!==true)throw denied();
   return {allowed:true,consumed_nonce:issuedBinding.jti,...approvalBinding};
  },
 };
}
