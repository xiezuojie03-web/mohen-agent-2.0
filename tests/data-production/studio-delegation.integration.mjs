import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHmac,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as access from '../../packages/data-access/src/index.mjs';
assert.equal(typeof access.createStudioDelegationRepository,'function');
const {MOHEN_TEST_PSQL:psql,MOHEN_TEST_SOCKET:socket,MOHEN_TEST_DATABASE:database}=process.env;
if(!psql||!socket?.startsWith('/workspace/')||!/^mohen_k3_[a-z0-9_]*test$/.test(database??''))throw Error('ISOLATED_TEST_DATABASE_REQUIRED');
const sql=s=>execFileSync(psql,['-X','-q','-h',socket,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database,'-At','-v','ON_ERROR_STOP=1'],{input:s,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
assert.equal(sql("select current_setting('mohen.test_instance',true)"),'codex-k3-isolated');
const a=randomUUID(),b=randomUUID(),project=randomUUID(),asset=randomUUID();
const key='mab-repository-synthetic-attestation-key-at-least-32';
sql(`insert into public.users(user_id,email,username,password_hash)values('${a}','delegation-a@example.invalid','A','synthetic'),('${b}','delegation-b@example.invalid','B','synthetic');insert into control.session_verification_keys(verification_key)values('${key}')on conflict(key_slot)do update set verification_key=excluded.verification_key`);
const token=uid=>{const p=Buffer.from(JSON.stringify({uid,r:[],exp:Date.now()+60000})).toString('base64url');return p+'.'+createHmac('sha256',key).update(p).digest('base64url');};
const require=createRequire(new URL('../../packages/data-access/package.json',import.meta.url)),{Pool}=require('pg');
const pool=new Pool({host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),user:'k3_admin',database,max:2});
const assets=access.createStudioAssetRepository(pool),repo=access.createStudioDelegationRepository(pool);
try {
 await assets.createProject({projectId:project,title:'合成委托测试'},token(a));
 const task=randomUUID(),foreignTask=randomUUID(),otherProjectTask=randomUUID();
 const foreignProject=randomUUID();
 sql(`insert into public.research_tasks(task_id,owner_user_id,prompt,checkpoint)values
 ('${task}','${a}','synthetic','{"studio":{"project_id":"${project}","state":"BRIEF_PENDING"}}'::jsonb),
 ('${foreignTask}','${b}','synthetic','{"studio":{"project_id":"${project}"}}'::jsonb),
 ('${otherProjectTask}','${a}','synthetic','{"studio":{"project_id":"${foreignProject}"}}'::jsonb)`);
 const input={projectId:project,rootTaskRef:task,rootTaskSnapshot:{prompt:'synthetic',status:'hold'},subtaskRef:'subtask-1',seriesId:randomUUID(),revisionNo:1,
 executor:'fixture-only',provider:'no-provider-called',engineVersion:'fixture-v1',inputManifest:{source_refs:[]},allowedActions:['prepare_candidate'],
 transferRightsDecision:{status:'UNVERIFIED',external_processing:'DENIED'},policyVersion:'fixture-v1',expiresAt:new Date(Date.now()+60000).toISOString(),
 budgetLimit:'0',currency:'CNY',idempotencyKey:'first',outputSchema:'synthetic-candidate-v1'};
 const concurrent=await Promise.all([repo.saveDelegation(input,token(a)),repo.saveDelegation(input,token(a))]);
 const d=concurrent[0];assert.equal(concurrent[1].delegation_id,d.delegation_id);assert.match(d.request_hash,/^[a-f0-9]{64}$/);
 assert.equal(d.requester,a);assert.equal(d.root_task_id,null);assert.equal(d.budget_limit,'0.000000');
 await assert.rejects(()=>repo.saveDelegation({...input,budgetLimit:'1'},token(a)),/STUDIO_DELEGATION_IDEMPOTENCY_CONFLICT/);
 // QR-06 same-root binding: unbound behaviour unchanged (root_task_id null above).
 await assert.rejects(()=>repo.saveDelegation({...input,idempotencyKey:'bound-missing',seriesId:randomUUID(),rootTaskId:randomUUID()},token(a)),/STUDIO_TASK_BINDING_INVALID/);
 await assert.rejects(()=>repo.saveDelegation({...input,idempotencyKey:'bound-foreign-task',seriesId:randomUUID(),rootTaskId:foreignTask},token(a)),/STUDIO_TASK_BINDING_INVALID/);
 await assert.rejects(()=>repo.saveDelegation({...input,idempotencyKey:'bound-other-project',seriesId:randomUUID(),rootTaskId:otherProjectTask},token(a)),/STUDIO_TASK_BINDING_INVALID/);
 await assert.rejects(()=>repo.saveDelegation({...input,idempotencyKey:'bound-foreign-owner',seriesId:randomUUID(),rootTaskId:task},token(b)),/STUDIO_TASK_BINDING_INVALID/);
 await assert.rejects(()=>repo.saveDelegation({...input,idempotencyKey:'bound-malformed',seriesId:randomUUID(),rootTaskId:'not-a-uuid'},token(a)),/STUDIO_DELEGATION_INVALID/);
 const bound=await repo.saveDelegation({...input,idempotencyKey:'bound',seriesId:randomUUID(),rootTaskId:task},token(a));
 assert.equal(bound.root_task_id,task,'verified same-root binding persists root_task_id');
 await assert.rejects(()=>repo.saveDelegation({...input,idempotencyKey:'expired',seriesId:randomUUID(),expiresAt:'2000-01-01T00:00:00Z'},token(a)),/STUDIO_DELEGATION_EXPIRED/);
 assert.equal(await repo.getDelegation(d.delegation_id,token(b)),null);
 await assert.rejects(()=>repo.saveDelegation({...input,idempotencyKey:'foreign'},token(b)),/STUDIO_PROJECT_NOT_FOUND/);
 const r={delegationId:d.delegation_id,attemptNo:1,requestHash:d.request_hash,resultManifest:{state:'timeout',untrusted_payload:'synthetic'},candidateRefs:[],
 actualProvider:'synthetic-fixture-no-provider',actualEngineVersion:'fixture-v1',startedAt:new Date().toISOString(),finishedAt:new Date().toISOString(),cost:null,currency:null,costConfidence:'UNKNOWN',errorCode:'PROVIDER_NOT_CALLED'};
 const receipts=await Promise.all([repo.appendHeldReceipt(r,token(a)),repo.appendHeldReceipt(r,token(a))]);
 assert.equal(receipts[0].receipt_id,receipts[1].receipt_id);assert.equal(receipts[0].acceptance_state,'HOLD');assert.equal(receipts[0].cost,null);
 await assert.rejects(()=>repo.appendHeldReceipt({...r,resultManifest:{state:'changed'}},token(a)),/STUDIO_RECEIPT_IDEMPOTENCY_CONFLICT/);
 await assert.rejects(()=>repo.appendHeldReceipt({...r,requestHash:'a'.repeat(64)},token(a)),/STUDIO_RECEIPT_REQUEST_MISMATCH/);
 await assert.rejects(()=>repo.appendHeldReceipt(r,token(b)),/STUDIO_DELEGATION_NOT_FOUND/);
 assert.equal((await repo.listReceipts(d.delegation_id,token(b))).length,0);
 const estimate=await repo.appendHeldReceipt({...r,attemptNo:2,costConfidence:'ESTIMATED',cost:'1.25',currency:'CNY'},token(a));
 assert.equal(estimate.cost,'1.250000');assert.equal(estimate.acceptance_state,'HOLD','over-budget observations remain evidence, never permission');
 sql(`delete from public.research_tasks where task_id='${task}'`);
 await assert.rejects(()=>repo.saveDelegation({...input,idempotencyKey:'bound-after-delete',seriesId:randomUUID(),rootTaskId:task},token(a)),/STUDIO_TASK_BINDING_INVALID/,'deleted task can no longer be bound');
 assert.equal((await repo.getDelegation(d.delegation_id,token(a))).root_task_ref,task,'stable root ref survives scheduler deletion');
 assert.equal((await repo.listReceipts(d.delegation_id,token(a))).length,2,'permanent receipts survive scheduler deletion');
 assert.throws(()=>sql(`update studio.execution_receipts set error_code='changed' where receipt_id='${estimate.receipt_id}'`),/PERMANENT_RECEIPT_IMMUTABLE/);
 assert.throws(()=>sql(`delete from studio.delegations where delegation_id='${d.delegation_id}'`),/PERMANENT_RECEIPT_IMMUTABLE/);
 sql(`update public.users set status='disabled' where user_id='${a}'`);
 await assert.rejects(()=>repo.listReceipts(d.delegation_id,token(a)),/STUDIO_IDENTITY_REQUIRED/);
 sql(`update public.users set status='active' where user_id='${a}'`);
 for(let i=0;i<2;i++){const c=await pool.connect();try{const state=(await c.query("select current_user as role,coalesce(current_setting('mohen.session_token',true),'')as token")).rows[0];assert.equal(state.role,'k3_admin');assert.equal(state.token,'');}finally{c.release();}}
 console.log('MAB_DELEGATION_REPOSITORY_PASS concurrent-idempotency exact-hashes unknown-cost-HOLD immutable cross-owner disabled-identity permanent-root same-root-binding clean-pool no-provider-calls');
}finally{await pool.end();}
