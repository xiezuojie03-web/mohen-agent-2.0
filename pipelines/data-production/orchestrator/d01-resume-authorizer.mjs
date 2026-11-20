// Independent, one-use D01 execution grant for a resumed run whose upstream
// D00 already holds a current independent G0 PASS. Runs in the independent
// authority, never in the Producer or web process. The JWT shape deliberately
// matches assertStageExecutionAuthorized() so the existing verify/consume
// transport can validate it; the only differences from D00 are stage/job/input.
import { randomBytes, sign } from 'node:crypto';
import { executionDigest } from './execution-authority.mjs';

const header=Buffer.from(JSON.stringify({alg:'EdDSA',typ:'MOHEN-STAGE',kid:'mohen-stage-v1'})).toString('base64url');
const hexDigest=/^[a-f0-9]{64}$/;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const denied=()=>Error('D01_RESUME_AUTHORITY_DENIED');

/**
 * @param qualificationChecker async ({run_id,input_digest}) => boolean
 *   Server-side low-privilege reader check that a current, independent G0 PASS
 *   exists for this exact run and that its output_digest === input_digest (the
 *   D01 input digest). Injected; the authority owning the signing key decides
 *   the concrete reader. Returns true only on a verified current qualification.
 */
export function createD01ResumeAuthorizer({registry,holdEpoch,privateKey,journal,qualificationChecker,now=Date.now}={}){
 const d01=registry?.jobs?.find(entry=>entry.stage==='D01');
 const policy=d01?.execution_policy;
 const jobId=d01?.job_id;
 if(registry?.status!=='ACTIVE_AUTHORIZED'||registry.activation?.enabled!==true||
  typeof registry.architecture_generation!=='string'||!registry.architecture_generation||
  typeof jobId!=='string'||!jobId||policy?.enabled!==true||policy.attended!==true||
  !Array.isArray(policy.enable_requires)||!policy.enable_requires.length||
  typeof holdEpoch!=='string'||!holdEpoch.trim()||holdEpoch.length>128||
  privateKey?.type!=='private'||privateKey.asymmetricKeyType!=='ed25519'||
  typeof journal?.issueOnce!=='function'||typeof journal.consumeOnce!=='function'||
  typeof qualificationChecker!=='function'){
  throw Error('D01_RESUME_AUTHORITY_CONFIG_INVALID');
 }
 const binding={stage:'D01',job_id:jobId,mode:'attended'};
 const conditions=Object.fromEntries(policy.enable_requires.map(key=>[key,true]));
 const architectureGeneration=registry.architecture_generation;
 const registryDigest=executionDigest(registry);
 const matchesStage=request=>request&&matchesBinding(request,binding);
 // The journal binding must be byte-identical between issue and consume:
 // control.d01_resume_grant_journal uses `binding = $2::jsonb` exact match.
 // Same shape as D00: {run_id,stage,job_id,mode,hold_epoch,registry_digest,input_digest,jti}.
 const grantBinding=({run_id,input_digest,jti})=>({run_id,...binding,hold_epoch:holdEpoch,
  registry_digest:registryDigest,input_digest,jti});
 return {
  async issue(request){
   if(!matchesStage(request)||!uuid.test(request.run_id??'')||
      typeof request.input!=='object'||request.input===null||Array.isArray(request.input)||
      !hexDigest.test(request.d00_input_digest??''))throw denied();
   // Digest is always recomputed from the body by the authority, never trusted
   // from the caller. A caller-supplied digest, if present, must still agree.
   const inputDigest=executionDigest(request.input);
   if(request.input_digest!==undefined&&request.input_digest!==inputDigest)throw denied();
   // The signing authority independently confirms the upstream G0 is current
   // and binds EXACTLY this D01 input (whose digest is the G0 output). No
   // Producer-supplied claim is trusted.
   let qualified;
   try{qualified=await qualificationChecker({run_id:request.run_id,d01_input_digest:inputDigest,
     d00_input_digest:request.d00_input_digest});}
   catch{throw denied();}
   if(qualified!==true)throw denied();
   const iat=Math.floor(now()/1000);
   const jti=randomBytes(24).toString('hex');
   const claims={run_id:request.run_id,...binding,hold_epoch:holdEpoch,
    iss:'mohen-independent-execution-authorizer',aud:'mohen-production-stage',
    architecture_generation:architectureGeneration,registry_digest:registryDigest,
    iat,exp:iat+240,jti,authorized_conditions:conditions,input_digest:inputDigest};
   const payload=Buffer.from(JSON.stringify(claims)).toString('base64url');
   const message=header+'.'+payload;
   const signature=sign(null,Buffer.from(message),privateKey).toString('base64url');
   const issued=await journal.issueOnce({exp:claims.exp,...grantBinding({run_id:request.run_id,input_digest:inputDigest,jti})});
   if(issued!==true)throw denied();
   return {token:message+'.'+signature};
  },
  async consume(request){
   if(!matchesStage(request)||!uuid.test(request.run_id??'')||
      typeof request.jti!=='string'||!/^[a-f0-9]{48}$/.test(request.jti)||
      !hexDigest.test(request.input_digest??''))throw denied();
   const storedBinding=grantBinding({run_id:request.run_id,input_digest:request.input_digest,jti:request.jti});
   const ok=await journal.consumeOnce(storedBinding,Math.floor(now()/1000));
   if(ok!==true)throw denied();
   const {jti:_jti,...attestation}=storedBinding;
   return {allowed:true,consumed_nonce:request.jti,...attestation};
  },
 };
}

function matchesBinding(value,expected){
 return value&&Object.entries(expected).every(([key,required])=>value[key]===required);
}
