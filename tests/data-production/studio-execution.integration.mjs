import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHmac,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createStudioExecutionRepository} from '../../packages/data-access/src/studio-execution-repository.mjs';
import {createStudioDelegationRepository} from '../../packages/data-access/src/studio-delegation-repository.mjs';
import {createStudioAssetRepository} from '../../packages/data-access/src/studio-asset-repository.mjs';
const {MOHEN_TEST_PSQL:psql,MOHEN_TEST_SOCKET:socket,MOHEN_TEST_DATABASE:database}=process.env;
if(!psql||!socket?.startsWith('/workspace/')||!/^mohen_k3_[a-z0-9_]*test$/.test(database??''))throw Error('ISOLATED_TEST_DATABASE_REQUIRED');
const sql=s=>execFileSync(psql,['-X','-q','-h',socket,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database,'-At','-v','ON_ERROR_STOP=1'],{input:s,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
assert.equal(sql("select current_setting('mohen.test_instance',true)"),'codex-k3-isolated');
const a=randomUUID(),b=randomUUID(),project=randomUUID(),task=randomUUID(),key='m4-execution-synthetic-session-key-at-least-32';
sql(`insert into public.users(user_id,email,username,password_hash)values('${a}','${a}@example.invalid','A','synthetic'),('${b}','${b}@example.invalid','B','synthetic');insert into control.session_verification_keys(verification_key)values('${key}')on conflict(key_slot)do update set verification_key=excluded.verification_key;insert into public.research_tasks(task_id,owner_user_id,prompt)values('${task}','${a}','synthetic')`);
const token=uid=>{const p=Buffer.from(JSON.stringify({uid,r:[],exp:Date.now()+600000})).toString('base64url');return p+'.'+createHmac('sha256',key).update(p).digest('base64url');};
const require=createRequire(new URL('../../packages/data-access/package.json',import.meta.url)),{Pool}=require('pg');
const login='m4_execution_'+randomUUID().replaceAll('-','');
sql(`create role ${login} login nosuperuser nobypassrls nocreatedb nocreaterole noreplication;grant mohen_app_runtime to ${login}`);
const pool=new Pool({host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),user:login,database,max:4});
const repo=createStudioExecutionRepository(pool),delegations=createStudioDelegationRepository(pool),assets=createStudioAssetRepository(pool);
const call=(d,v=0)=>({delegationId:d.delegation_id,requestId:randomUUID(),expectedVersion:v,ownerRef:'synthetic-worker',inputDigest:d.request_hash,policyVersion:'fixture-v1',leaseSeconds:60});
const checkpoint=(d,s,state='HOLD',payload={})=>({delegationId:d.delegation_id,requestId:randomUUID(),expectedVersion:s.version,leaseId:s.lease_id,state,inputDigest:d.request_hash,policyVersion:'fixture-v1',payload});
try{
 assert.equal((await pool.query('select session_user as identity')).rows[0].identity,login);
 for(const role of ['mohen_execution_authority','mohen_producer','mohen_gate_signer'])await assert.rejects(()=>pool.query('set role '+role),/permission denied/);
 await assets.createProject({projectId:project,title:'M4 synthetic execution controls'},token(a));
 const make=()=>delegations.saveDelegation({projectId:project,rootTaskRef:task,rootTaskSnapshot:{prompt:'synthetic'},subtaskRef:'synthetic',seriesId:randomUUID(),revisionNo:1,executor:'fixture',provider:'no-provider-called',engineVersion:'fixture-v1',inputManifest:{source_refs:[]},allowedActions:['prepare_candidate'],transferRightsDecision:{status:'UNVERIFIED',external_processing:'DENIED'},policyVersion:'fixture-v1',expiresAt:new Date(Date.now()+600000).toISOString(),budgetLimit:'0',currency:'CNY',idempotencyKey:randomUUID(),outputSchema:'fixture-v1'},token(a));
 const makeProviderDelegation=async({allowed=true,budget='2.000000'}={})=>{
  const sourceRef=randomUUID(),sourceRevision=randomUUID(),purpose='studio_research_candidate';
  const pricingPolicyVersion='fixture-deepseek-v1',issuedAt=new Date().toISOString(),expiresAt=new Date(Date.now()+600000).toISOString();
  const transferRightsDecision={schema:'mohen.transfer-rights-decision.v1',status:allowed?'ALLOWED':'DENIED',
   decision_method:'OWNER_ATTESTATION',external_processing:allowed?'ALLOWED':'DENIED',decision_id:randomUUID(),
   owner_user_id:a,project_id:project,purpose,provider:'deepseek',engine_version:'deepseek-chat',
   pricing_policy_version:pricingPolicyVersion,issued_at:issuedAt,expires_at:expiresAt,
   source_refs:[{ref:sourceRef,revision:sourceRevision,action:'external_processing',decision:allowed?'ALLOW':'DENY',
    rights_basis:'official_reuse_policy',evidence_ref:'fixture:rights-evidence'}]};
  const delegation=await delegations.saveDelegation({projectId:project,rootTaskRef:task,rootTaskSnapshot:{prompt:'synthetic provider input'},
   subtaskRef:'provider-call',seriesId:randomUUID(),revisionNo:1,executor:'mohen-provider-worker',provider:'deepseek',
   engineVersion:'deepseek-chat',inputManifest:{purpose,source_refs:[{ref:sourceRef,revision:sourceRevision}],prompt_digest:'a'.repeat(64)},
   allowedActions:['external_processing','prepare_candidate'],transferRightsDecision,policyVersion:'fixture-v1',
   expiresAt,budgetLimit:budget,currency:'USD',idempotencyKey:randomUUID(),outputSchema:'mohen.provider-execution-result.v1'},token(a));
  return {delegation,purpose,pricingPolicyVersion};
 };
 const reserveInput=(delegation,state,amount='0.000100',pricingPolicyVersion='fixture-deepseek-v1')=>({
  delegationId:delegation.delegation_id,requestId:randomUUID(),expectedVersion:state.version,leaseId:state.lease_id,
  inputDigest:delegation.request_hash,policyVersion:'fixture-v1',amount,currency:'USD',pricingPolicyVersion});
 const appendEstimatedReceipt=async(delegation,purpose,pricingPolicyVersion,cost='0.000400')=>{
  const now=new Date(),finished=new Date(now.getTime()+10);
  const resultManifest={schema:'mohen.provider-execution-result.v1',delegation_request_hash:delegation.request_hash,
   provider:'deepseek',engine_version:'deepseek-chat',purpose,pricing_policy_version:pricingPolicyVersion,
   input_digest:'b'.repeat(64),output_digest:'c'.repeat(64),
   usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150},
   pricing:{version:pricingPolicyVersion,currency:'USD',provider:'deepseek',model:'deepseek-chat',
    input_per_million:'2',output_per_million:'4'},
   cost_estimate:{amount:cost,currency:'USD'}};
  return delegations.appendHeldReceipt({delegationId:delegation.delegation_id,attemptNo:1,requestHash:delegation.request_hash,
   resultManifest,candidateRefs:[],actualProvider:'deepseek',actualEngineVersion:'deepseek-chat',
   startedAt:now.toISOString(),finishedAt:finished.toISOString(),cost,currency:'USD',
   costConfidence:'ESTIMATED',errorCode:'PROVIDER_COMPLETED_PENDING_REVIEW'},token(a));
 };
 const d=await make();
 assert.equal((await repo.getState(d.delegation_id,token(a))).version,0);
 await assert.rejects(()=>repo.getState(d.delegation_id,token(b)),/STUDIO_EXECUTION_NOT_FOUND/);
 await assert.rejects(()=>repo.claim({...call(d),inputDigest:'f'.repeat(64)},token(a)),/STUDIO_EXECUTION_BINDING_MISMATCH/);
 await assert.rejects(()=>repo.claim({...call(d),policyVersion:'changed'},token(a)),/STUDIO_EXECUTION_BINDING_MISMATCH/);
 const contenders=await Promise.allSettled([repo.claim(call(d),token(a)),repo.claim(call(d),token(a))]);
 assert.equal(contenders.filter(x=>x.status==='fulfilled').length,1);
 assert.match(contenders.find(x=>x.status==='rejected').reason.message,/STUDIO_EXECUTION_VERSION_CONFLICT/);
 let leased=contenders.find(x=>x.status==='fulfilled').value;
 await assert.rejects(()=>repo.claim(call(d,leased.version),token(a)),/STUDIO_EXECUTION_LEASE_BUSY/);
 await assert.rejects(()=>repo.checkpoint({...checkpoint(d,leased),leaseId:randomUUID()},token(a)),/STUDIO_EXECUTION_LEASE_STALE/);
 await assert.rejects(()=>repo.checkpoint({...checkpoint(d,leased),expectedVersion:0},token(a)),/STUDIO_EXECUTION_VERSION_CONFLICT/);
 await assert.rejects(()=>repo.checkpoint({...checkpoint(d,leased),inputDigest:'f'.repeat(64)},token(a)),/STUDIO_EXECUTION_BINDING_MISMATCH/);
 sql(`update studio.projects set owner_user_id='${b}' where project_id='${project}'`);
 await assert.rejects(()=>repo.checkpoint(checkpoint(d,leased),token(a)),/STUDIO_EXECUTION_NOT_FOUND/);
 sql(`update studio.projects set owner_user_id='${a}',lifecycle_status='ARCHIVED' where project_id='${project}'`);
 await assert.rejects(()=>repo.checkpoint(checkpoint(d,leased),token(a)),/STUDIO_EXECUTION_NOT_FOUND/);
 sql(`update studio.projects set lifecycle_status='ACTIVE' where project_id='${project}';update public.users set status='disabled' where user_id='${a}'`);
 await assert.rejects(()=>repo.checkpoint(checkpoint(d,leased),token(a)),/STUDIO_IDENTITY_REQUIRED/);
 sql(`update public.users set status='active' where user_id='${a}'`);
 const holdRequest=checkpoint(d,leased,'HOLD',{spent_cost:0,reserved_cost:0,unknown_cost:false});
 const held=await repo.checkpoint(holdRequest,token(a));
 assert.equal(held.state,'HOLD');assert.equal(held.version,2);
 assert.deepEqual(await repo.checkpoint(holdRequest,token(a)),held);
 await assert.rejects(()=>repo.checkpoint({...holdRequest,payload:{changed:true}},token(a)),/STUDIO_EXECUTION_IDEMPOTENCY_CONFLICT/);
 const claimRequest=call(d,held.version);let next=await repo.claim(claimRequest,token(a));
 assert.deepEqual(await repo.claim(claimRequest,token(a)),next);
 await assert.rejects(()=>repo.claim({...claimRequest,ownerRef:'changed'},token(a)),/STUDIO_EXECUTION_IDEMPOTENCY_CONFLICT/);
 await assert.rejects(()=>repo.checkpoint(checkpoint(d,leased,'COMPLETED'),token(a)),/STUDIO_EXECUTION_LEASE_STALE/);
 // Server clock / persisted expiry, not client time, determines stale authorization.
 sql(`update studio.execution_controls set lease_expires_at=clock_timestamp()-interval '1 second' where delegation_id='${d.delegation_id}'`);
 await assert.rejects(()=>repo.checkpoint(checkpoint(d,next,'COMPLETED'),token(a)),/STUDIO_EXECUTION_LEASE_STALE/);
 await assert.rejects(()=>repo.claim(claimRequest,token(a)),/STUDIO_EXECUTION_LEASE_STALE/);
 next=await repo.claim(call(d,next.version),token(a));
 const beforeAttemptRequest=checkpoint(d,next,'HOLD',{prepared:true});
 const beforeAttempt=await repo.checkpoint(beforeAttemptRequest,token(a));
 const flightRequest=checkpoint(d,beforeAttempt,'IN_FLIGHT',{provider_attempt:'synthetic-only'});
 let flight=await repo.checkpoint(flightRequest,token(a));
 assert.deepEqual(await repo.checkpoint(flightRequest,token(a)),flight);
 await assert.rejects(()=>repo.checkpoint(beforeAttemptRequest,token(a)),/STUDIO_EXECUTION_VERSION_CONFLICT/);
 assert.equal(flight.unknown_cost,true);assert.equal(flight.external_attempted,true);
 sql(`update studio.execution_controls set reserved_cost=4.25,spent_cost=1.5 where delegation_id='${d.delegation_id}'`);
 const uncertain=await repo.checkpoint(checkpoint(d,flight,'HOLD',{unknown_cost:false,external_attempted:false,spent_cost:0,reserved_cost:0}),token(a));
 assert.equal(uncertain.unknown_cost,true);assert.equal(uncertain.external_attempted,true);
 assert.equal(uncertain.reserved_cost,'4.250000');assert.equal(uncertain.spent_cost,'1.500000');
 await assert.rejects(()=>repo.checkpoint(checkpoint(d,uncertain,'IN_FLIGHT',{retry:true}),token(a)),/STUDIO_EXECUTION_RECONCILIATION_REQUIRED/);
 assert.throws(()=>sql(`update studio.execution_controls set spent_cost=0 where delegation_id='${d.delegation_id}'`),/STUDIO_EXECUTION_COST_PERMANENT/);
 sql(`update studio.execution_controls set lease_expires_at=clock_timestamp()-interval '1 second' where delegation_id='${d.delegation_id}'`);
 await assert.rejects(()=>repo.claim(call(d,uncertain.version),token(a)),/STUDIO_EXECUTION_RECONCILIATION_REQUIRED/);
 const revocation={delegationId:d.delegation_id,requestId:randomUUID(),reason:'Owner revoked synthetic job'};
 const revoked=await repo.revoke(revocation,token(a));assert.equal(revoked.state,'REVOKED');assert.ok(revoked.revoked_at);
 assert.deepEqual(await repo.revoke(revocation,token(a)),revoked);
 assert.deepEqual(await repo.revoke({...revocation,requestId:randomUUID(),reason:'Second revoke remains terminal'},token(a)),revoked);
 await assert.rejects(()=>repo.revoke({...revocation,reason:'changed'},token(a)),/STUDIO_EXECUTION_IDEMPOTENCY_CONFLICT/);
 await assert.rejects(()=>repo.claim(call(d,revoked.version),token(a)),/STUDIO_EXECUTION_REVOKED/);
 await assert.rejects(()=>repo.claim(claimRequest,token(a)),/STUDIO_EXECUTION_REVOKED/);
 await assert.rejects(()=>repo.checkpoint(checkpoint(d,next,'COMPLETED'),token(a)),/STUDIO_EXECUTION_REVOKED/);
 sql(`delete from public.research_tasks where task_id='${task}'`);
 assert.equal((await repo.getState(d.delegation_id,token(a))).state,'REVOKED');
 const active=await make();let initial=await repo.getState(active.delegation_id,token(a));
 sql(`update studio.projects set lifecycle_status='ARCHIVED' where project_id='${project}'`);
 await assert.rejects(()=>repo.claim(call(active,initial.version),token(a)),/STUDIO_EXECUTION_NOT_FOUND/);
 sql(`update studio.projects set lifecycle_status='ACTIVE' where project_id='${project}';update public.users set status='disabled' where user_id='${a}'`);
 await assert.rejects(()=>repo.claim(call(active,initial.version),token(a)),/STUDIO_IDENTITY_REQUIRED/);
 sql(`update public.users set status='active' where user_id='${a}'`);
 // A short envelope expires without mutating immutable delegation evidence.
 const expiring=await delegations.saveDelegation({projectId:project,rootTaskRef:'expired-fixture',rootTaskSnapshot:{},subtaskRef:'synthetic',seriesId:randomUUID(),revisionNo:1,executor:'fixture',provider:'no-provider-called',engineVersion:'fixture-v1',inputManifest:{},allowedActions:['prepare_candidate'],transferRightsDecision:{},policyVersion:'fixture-v1',expiresAt:new Date(Date.now()+1500).toISOString(),budgetLimit:'0',currency:'CNY',idempotencyKey:randomUUID(),outputSchema:'fixture'},token(a));
 await new Promise(resolve=>setTimeout(resolve,1600));
 await assert.rejects(()=>repo.claim(call(expiring),token(a)),/STUDIO_EXECUTION_EXPIRED/);
 await delegations.appendHeldReceipt({delegationId:active.delegation_id,attemptNo:1,requestHash:active.request_hash,resultManifest:{uncertain:true},candidateRefs:[],actualProvider:'synthetic',actualEngineVersion:'fixture',startedAt:new Date().toISOString(),finishedAt:new Date().toISOString(),cost:null,currency:null,costConfidence:'UNKNOWN',errorCode:'SYNTHETIC_UNKNOWN'},token(a));
 await assert.rejects(()=>repo.claim(call(active,initial.version),token(a)),/STUDIO_EXECUTION_RECONCILIATION_REQUIRED/);
 // Provider spend controls: synthetic only; no network/provider request is made.
 const denied=await makeProviderDelegation({allowed:false});
 const deniedLease=await repo.claim(call(denied.delegation),token(a));
 await assert.rejects(()=>repo.reserveBudget(reserveInput(denied.delegation,deniedLease),token(a)),/STUDIO_EXECUTION_TRANSFER_DENIED/);
 await repo.revoke({delegationId:denied.delegation.delegation_id,requestId:randomUUID(),reason:'Denied transfer fixture'},token(a));

 const spend=await makeProviderDelegation();
 const spendLease=await repo.claim(call(spend.delegation),token(a));
 await assert.rejects(()=>repo.checkpoint(checkpoint(spend.delegation,spendLease,'IN_FLIGHT',{synthetic:true}),token(a)),/STUDIO_EXECUTION_RESERVATION_REQUIRED/);
 const reservation=reserveInput(spend.delegation,spendLease);
 const reserved=await repo.reserveBudget(reservation,token(a));
 assert.equal(reserved.reserved_cost,'0.000100');
 assert.deepEqual(await repo.reserveBudget(reservation,token(a)),reserved);
 await assert.rejects(()=>repo.reserveBudget({...reservation,amount:'0.000200'},token(a)),/STUDIO_EXECUTION_IDEMPOTENCY_CONFLICT/);
 const flight=await repo.checkpoint(checkpoint(spend.delegation,reserved,'IN_FLIGHT',{synthetic_provider_attempt:true}),token(a));
 assert.equal(flight.unknown_cost,true);assert.equal(flight.external_attempted,true);
 const spendReceipt=await appendEstimatedReceipt(spend.delegation,spend.purpose,spend.pricingPolicyVersion);
 const reconcileRequest={delegationId:spend.delegation.delegation_id,requestId:randomUUID(),expectedVersion:flight.version,
  inputDigest:spend.delegation.request_hash,policyVersion:'fixture-v1',receiptId:spendReceipt.receipt_id};
 const settled=await repo.reconcileCost(reconcileRequest,token(a));
 assert.equal(settled.state,'HOLD');assert.equal(settled.unknown_cost,false);
 assert.equal(settled.reserved_cost,'0.000000');assert.equal(settled.spent_cost,'0.000400');
 assert.equal(settled.budget_overrun,true);assert.equal(settled.external_attempted,true);
 assert.deepEqual(await repo.reconcileCost(reconcileRequest,token(a)),settled);
 await assert.rejects(()=>repo.reconcileCost({...reconcileRequest,receiptId:randomUUID()},token(a)),/STUDIO_EXECUTION_IDEMPOTENCY_CONFLICT/);
 await assert.rejects(()=>repo.claim(call(spend.delegation,settled.version),token(a)),/STUDIO_EXECUTION_RECONCILIATION_REQUIRED/);
 await assert.rejects(()=>repo.reconcileCost({...reconcileRequest,requestId:randomUUID()},token(b)),/STUDIO_EXECUTION_NOT_FOUND/);

 const releasable=await makeProviderDelegation();
 const releaseLease=await repo.claim(call(releasable.delegation),token(a));
 const releaseReserve=await repo.reserveBudget(reserveInput(releasable.delegation,releaseLease,'0.000100'),token(a));
 const released=await repo.releaseBudget({delegationId:releasable.delegation.delegation_id,requestId:randomUUID(),
  expectedVersion:releaseReserve.version,leaseId:releaseReserve.lease_id,inputDigest:releasable.delegation.request_hash,
  policyVersion:'fixture-v1',reason:'Provider call not started'},token(a));
 assert.equal(released.state,'HOLD');assert.equal(released.reserved_cost,'0.000000');
 assert.equal((await repo.claim(call(releasable.delegation,released.version),token(a))).state,'LEASED');

 const revokeBeforeRelease=await makeProviderDelegation();
 const revokeReleaseLease=await repo.claim(call(revokeBeforeRelease.delegation),token(a));
 await repo.reserveBudget(reserveInput(revokeBeforeRelease.delegation,revokeReleaseLease,'0.000100'),token(a));
 const revokedReservation=await repo.revoke({delegationId:revokeBeforeRelease.delegation.delegation_id,requestId:randomUUID(),reason:'Owner revoked before dispatch'},token(a));
 const releasedAfterRevoke=await repo.releaseBudget({delegationId:revokeBeforeRelease.delegation.delegation_id,requestId:randomUUID(),
  expectedVersion:revokedReservation.version,leaseId:null,inputDigest:revokeBeforeRelease.delegation.request_hash,
  policyVersion:'fixture-v1',reason:'Release unused reservation after revoke'},token(a));
 assert.equal(releasedAfterRevoke.state,'REVOKED');assert.equal(releasedAfterRevoke.reserved_cost,'0.000000');

 const reconcileAfterRevoke=await makeProviderDelegation();
 const revokeFlightLease=await repo.claim(call(reconcileAfterRevoke.delegation),token(a));
 const revokeFlightReserve=await repo.reserveBudget(reserveInput(reconcileAfterRevoke.delegation,revokeFlightLease,'0.000100'),token(a));
 await repo.checkpoint(checkpoint(reconcileAfterRevoke.delegation,revokeFlightReserve,'IN_FLIGHT',{synthetic_provider_attempt:true}),token(a));
 const revokedInFlight=await repo.revoke({delegationId:reconcileAfterRevoke.delegation.delegation_id,requestId:randomUUID(),reason:'Owner revoked after dispatch'},token(a));
 const revokedReceipt=await appendEstimatedReceipt(reconcileAfterRevoke.delegation,reconcileAfterRevoke.purpose,reconcileAfterRevoke.pricingPolicyVersion);
 const reconciledAfterRevoke=await repo.reconcileCost({delegationId:reconcileAfterRevoke.delegation.delegation_id,requestId:randomUUID(),
  expectedVersion:revokedInFlight.version,inputDigest:reconcileAfterRevoke.delegation.request_hash,
  policyVersion:'fixture-v1',receiptId:revokedReceipt.receipt_id},token(a));
 assert.equal(reconciledAfterRevoke.state,'REVOKED');assert.equal(reconciledAfterRevoke.unknown_cost,false);
 assert.equal(reconciledAfterRevoke.reserved_cost,'0.000000');assert.equal(reconciledAfterRevoke.spent_cost,'0.000400');

 const signed=token(a);
 for(const statement of ["update studio.execution_controls set revoked_at=null,state='READY'","delete from studio.execution_controls","insert into studio.execution_control_events(event_id)values(gen_random_uuid())"]){assert.throws(()=>sql(`begin;set local role mohen_app_runtime;select set_config('mohen.session_token','${signed}',true);${statement};rollback`),/permission denied/);}
 for(const role of ['mohen_producer','mohen_gate_signer','anon','authenticated','service_role'])assert.equal(sql(`select has_function_privilege('${role}','studio.apply_execution_control(text,jsonb)','execute')`),'f');
 assert.throws(()=>sql(`update studio.execution_controls set revoked_at=null,state='READY' where delegation_id='${d.delegation_id}'`),/STUDIO_EXECUTION_REVOCATION_PERMANENT/);
 assert.throws(()=>sql('delete from studio.execution_control_events'),/PERMANENT_RECEIPT_IMMUTABLE/);
 assert.throws(()=>sql('truncate studio.execution_control_events'),/PERMANENT_RECEIPT_IMMUTABLE/);
 const before=sql('select md5(jsonb_agg(to_jsonb(e)order by event_id)::text)from studio.execution_control_events e');
 sql(readFileSync(new URL('../../supabase/rollback/20261107090000_mab_m4_execution_controls.rollback.sql',import.meta.url),'utf8'));
 await assert.rejects(()=>repo.reserveBudget({delegationId:spend.delegation.delegation_id,requestId:randomUUID(),expectedVersion:settled.version,
  leaseId:spendLease.lease_id,inputDigest:spend.delegation.request_hash,policyVersion:'fixture-v1',amount:'0.000100',currency:'USD',
  pricingPolicyVersion:spend.pricingPolicyVersion},token(a)),/permission denied/);
 sql(readFileSync(new URL('../../supabase/rollback/20261104013351_mab_m4_execution_controls.rollback.sql',import.meta.url),'utf8'));
 await assert.rejects(()=>repo.claim(call(active,initial.version),token(a)),/permission denied/);
 assert.equal(sql('select md5(jsonb_agg(to_jsonb(e)order by event_id)::text)from studio.execution_control_events e'),before);
 assert.equal(sql(`select state from studio.execution_controls where delegation_id='${d.delegation_id}'`),'REVOKED');
 assert.equal(sql(`select spent_cost::text||':'||reserved_cost::text||':'||unknown_cost::text from studio.execution_controls where delegation_id='${spend.delegation.delegation_id}'`),'0.000400:0.000000:false');
 console.log('MAB_EXECUTION_CONTROLS_PASS low-privilege-LOGIN atomic-CAS reservation exact-owner-rights currency-budget estimate-settlement budget-overrun sticky-unknown revoke-release post-revoke-settlement no-provider-network-call rollback-audit-preserved');
}finally{await pool.end();sql(`drop owned by ${login};drop role ${login}`);}
