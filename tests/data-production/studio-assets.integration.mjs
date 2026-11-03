import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHmac} from 'node:crypto';
const {MOHEN_TEST_PSQL:psql,MOHEN_TEST_SOCKET:socket,MOHEN_TEST_DATABASE:database}=process.env;
if(!psql||!socket?.startsWith('/workspace/')||!/^mohen_k3_[a-z0-9_]*test$/.test(database??''))throw Error('ISOLATED_TEST_DATABASE_REQUIRED');
const args=['-X','-q','-h',socket,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database,'-At','-v','ON_ERROR_STOP=1'];
const sql=s=>execFileSync(psql,args,{input:s,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
assert.equal(sql("select current_setting('mohen.test_instance',true)"),'codex-k3-isolated');
assert.equal(sql("select to_regclass('studio.asset_revisions') is not null"),'t','Long-term revisions need a real dedicated table');
const a='c1111111-1111-4111-8111-111111111111',b='c2222222-2222-4222-8222-222222222222';
const project='c0000000-0000-4000-8000-000000000001',foreign='c0000000-0000-4000-8000-000000000002';
const asset='c0000000-0000-4000-8000-000000000003',other='c0000000-0000-4000-8000-000000000004';
const r1='c0000000-0000-4000-8000-000000000011',r2='c0000000-0000-4000-8000-000000000012',or='c0000000-0000-4000-8000-000000000013';
const key='studio-long-term-synthetic-database-session-key-32';
function token(uid){const p=Buffer.from(JSON.stringify({uid,r:[],exp:Date.now()+60000})).toString('base64url');return p+'.'+createHmac('sha256',key).update(p).digest('base64url');}
const as=(uid,q)=>sql(`begin;set local role mohen_app_runtime;select set_config('mohen.session_token','${token(uid)}',true);${q};commit;`).split('\n').filter(x=>!x.includes('.')).join('\n').trim();
// The test fixture uses only synthetic users and cannot run against an unmarked DB.
sql(`insert into public.users(user_id,email,username,password_hash) values('${a}','asset-a@example.invalid','A','synthetic'),('${b}','asset-b@example.invalid','B','synthetic');
insert into control.session_verification_keys(verification_key) values('${key}') on conflict(key_slot) do update set verification_key=excluded.verification_key;`);
as(a,`insert into studio.projects(project_id,owner_user_id,project_title,research_scope) values('${project}','${a}','A','{}')`);
as(b,`insert into studio.projects(project_id,owner_user_id,project_title,research_scope) values('${foreign}','${b}','B','{}')`);
assert.equal(as(b,`select count(*) from studio.projects where project_id='${project}'`),'0');
assert.throws(()=>as(b,`insert into studio.asset_heads(asset_id,project_id,asset_kind) values('${asset}','${project}','research_brief')`),/row-level security/);
as(a,`insert into studio.asset_heads(asset_id,project_id,asset_kind) values('${asset}','${project}','research_brief'),('${other}','${project}','research_brief')`);
function rev(id,aid,number,prior='null',extra='') {return `insert into studio.asset_revisions(revision_id,asset_id,revision_no,supersedes_revision_id,actor_id,workspace_id,origin_kind,epistemic_class,payload,content_hash,idempotency_key,correlation_id ${extra?',origin_task_id,origin_task_snapshot':''}) values('${id}','${aid}',${number},${prior},'${a}','studio','human','editorial','{"question":"synthetic"}','${'a'.repeat(64)}','${id}','fixture'${extra})`;}
as(a,rev(r1,asset,1));as(a,rev(or,other,1));
as(a,`update studio.asset_heads set current_revision_id='${r1}' where asset_id='${asset}' and current_revision_id is null`);
assert.throws(()=>as(a,`update studio.asset_heads set current_revision_id='${or}' where asset_id='${asset}'`),/foreign key/,'head cannot point to another asset revision');
assert.throws(()=>as(a,rev(r2,asset,2,`'${or}'`)),/foreign key/,'supersedes must reference same asset');
as(a,rev(r2,asset,2,`'${r1}'`));
assert.equal(as(a,`with changed as(update studio.asset_heads set current_revision_id='${r2}' where asset_id='${asset}' and current_revision_id='${r1}' returning 1)select count(*) from changed`),'1');
assert.equal(as(a,`with changed as(update studio.asset_heads set current_revision_id='${r1}' where asset_id='${asset}' and current_revision_id='${r1}' returning 1)select count(*) from changed`),'0','stale CAS cannot replace newer revision');
assert.equal(as(b,`select count(*) from studio.asset_revisions where asset_id='${asset}'`),'0');
assert.throws(()=>as(a,`update studio.asset_revisions set payload='{}' where revision_id='${r1}'`),/permission denied/);
assert.throws(()=>sql(`update studio.asset_revisions set payload='{}' where revision_id='${r1}'`),/ASSET_REVISION_IMMUTABLE/,'even a migration cannot quietly rewrite published revision identity');
assert.throws(()=>sql(`delete from studio.asset_revisions where revision_id='${r2}'`),/ASSET_REVISION_IMMUTABLE/);
assert.equal(sql("select has_table_privilege('anon','studio.asset_revisions','SELECT')"),'f');
const task='c0000000-0000-4000-8000-000000000020',tr='c0000000-0000-4000-8000-000000000021';
sql(`insert into public.research_tasks(task_id,owner_user_id,prompt,status)values('${task}','${a}','synthetic','created')`);
as(a,rev(tr,other,2,`'${or}'`,`, '${task}', '{"task_id":"${task}"}'`));
sql(`delete from public.research_tasks where task_id='${task}'`);
assert.equal(sql(`select origin_task_id is null and origin_task_snapshot->>'task_id'='${task}' from studio.asset_revisions where revision_id='${tr}'`),'t','task deletion preserves immutable lineage and revision');
assert.equal(sql(`select count(*) from studio.asset_revisions where asset_id='${other}'`),'2');
const rootTask='c0000000-0000-4000-8000-000000000030',delegation='c0000000-0000-4000-8000-000000000031';
sql(`insert into public.research_tasks(task_id,owner_user_id,prompt,status)values('${rootTask}','${a}','synthetic delegation','created')`);
const envelope=`insert into studio.delegations(delegation_id,project_id,root_task_ref,root_task_id,root_task_snapshot,subtask_ref,delegation_series_id,delegation_revision_no,requester,executor,provider,engine_version,input_manifest,allowed_actions,transfer_rights_decision,policy_version,expires_at,budget_limit,currency,request_hash,idempotency_key,output_schema)
values('${delegation}','${project}','stable-root','${rootTask}','{"root":"synthetic"}','synthetic-subtask','${delegation}',1,'${a}','TEST_ONLY','TEST_ONLY','1','{}',array['read'],'{"state":"TEST_ONLY"}','fixture',now()+interval '1 hour',0,'CNY','${'b'.repeat(64)}','stable-key','synthetic')`;
as(a,envelope);
assert.equal(as(b,`select count(*) from studio.delegations where delegation_id='${delegation}'`),'0');
as(a,`insert into studio.execution_receipts(delegation_id,attempt_no,request_hash,result_manifest,acceptance_state,actual_provider,actual_engine_version)values('${delegation}',1,'${'b'.repeat(64)}','{}','HOLD','TEST_ONLY','1')`);
assert.equal(sql(`select cost is null and cost_confidence='UNKNOWN' from studio.execution_receipts where delegation_id='${delegation}'`),'t');
assert.throws(()=>as(a,`insert into studio.execution_receipts(delegation_id,attempt_no,request_hash,result_manifest,acceptance_state,actual_provider,actual_engine_version,cost,currency,cost_confidence)values('${delegation}',2,'${'b'.repeat(64)}','{}','HOLD','TEST_ONLY','1',0,'CNY','UNKNOWN')`),/check constraint/,'unknown cost must not be reported as zero');
sql(`delete from public.research_tasks where task_id='${rootTask}'`);
assert.equal(sql(`select root_task_id is null and root_task_ref='stable-root' from studio.delegations where delegation_id='${delegation}'`),'t');
assert.equal(sql(`select count(*) from studio.execution_receipts where delegation_id='${delegation}'`),'1');
assert.throws(()=>as(a,envelope.replaceAll(rootTask,"c0000000-0000-4000-8000-000000000099").replace("'c0000000-0000-4000-8000-000000000099'",'null').replaceAll(delegation,'c0000000-0000-4000-8000-000000000032')),/unique constraint/,'root deletion must not destroy stable idempotency');
as(a,`insert into studio.use_events(project_id,asset_revision_id,actor_id,consumer,purpose,requested_action,rights_decision_ref)values('${project}','${r1}','${a}','studio','research','read','TEST_ONLY')`);
assert.throws(()=>as(b,`insert into studio.use_events(project_id,asset_revision_id,actor_id,consumer,purpose,requested_action,rights_decision_ref)values('${foreign}','${r1}','${b}','studio','research','read','TEST_ONLY')`),/row-level security/);
// All three row types share one guard; a missing-column error is not its contract.
assert.throws(()=>sql(`update studio.use_events set purpose='changed' where project_id='${project}'`),/PERMANENT_RECEIPT_IMMUTABLE/);
assert.throws(()=>sql(`delete from studio.use_events where project_id='${project}'`),/PERMANENT_RECEIPT_IMMUTABLE/);
assert.throws(()=>sql(`update studio.execution_receipts set error_code='changed' where delegation_id='${delegation}'`),/PERMANENT_RECEIPT_IMMUTABLE/);
assert.throws(()=>sql(`delete from studio.execution_receipts where delegation_id='${delegation}'`),/PERMANENT_RECEIPT_IMMUTABLE/);
// FK existence does not prove visibility: referenced-table RLS is bypassed by FK checks.
const foreignDelegation='c0000000-0000-4000-8000-000000000041',foreignReceipt='c0000000-0000-4000-8000-000000000042';
as(b,envelope.replaceAll(delegation,foreignDelegation).replaceAll(project,foreign).replaceAll("'"+a+"'","'"+b+"'").replace("'"+rootTask+"'",'null'));
as(b,`insert into studio.execution_receipts(receipt_id,delegation_id,attempt_no,request_hash,result_manifest,acceptance_state,actual_provider,actual_engine_version)values('${foreignReceipt}','${foreignDelegation}',1,'${'b'.repeat(64)}','{}','HOLD','TEST_ONLY','1')`);
function withProvenance(statement,d,r){return statement.replace(/correlation_id\s*\)/,'correlation_id,delegation_id,external_receipt_id)').replace("'fixture')",`'fixture',${d?"'"+d+"'":'null'},${r?"'"+r+"'":'null'})`);}
assert.throws(()=>as(a,withProvenance(rev('c0000000-0000-4000-8000-000000000051',asset,3,"'"+r2+"'"),foreignDelegation,foreignReceipt)),/row-level security|foreign key/,'foreign-owner execution provenance must be rejected');
assert.throws(()=>as(a,withProvenance(rev('c0000000-0000-4000-8000-000000000052',asset,3,"'"+r2+"'"),delegation,foreignReceipt)),/row-level security|foreign key/,'receipt must belong to the exact declared delegation');
assert.throws(()=>as(a,withProvenance(rev('c0000000-0000-4000-8000-000000000053',asset,3,"'"+r2+"'"),null,foreignReceipt)),/check constraint|row-level security/,'receipt cannot omit its delegation identity');
assert.throws(()=>as(a,`insert into studio.execution_receipts(delegation_id,attempt_no,request_hash,result_manifest,acceptance_state,actual_provider,actual_engine_version)values('${delegation}',3,'${'c'.repeat(64)}','{}','HOLD','TEST_ONLY','1')`),/foreign key/,'receipt request hash must match its immutable delegation');
console.log('MAB_STUDIO_ASSETS_PASS project-ACL immutable-revisions exact-asset-FK supersedes CAS task-deletion private-default');
