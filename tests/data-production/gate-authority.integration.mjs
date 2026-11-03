import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash, createHmac, randomUUID } from 'node:crypto';
const { MOHEN_TEST_PSQL: psql, MOHEN_TEST_SOCKET: socket, MOHEN_TEST_DATABASE: database } = process.env;
if (!psql || !socket?.startsWith('/workspace/') || !/^mohen_k3_[a-z0-9_]*test$/.test(database ?? '')) throw new Error('ISOLATED_TEST_DATABASE_REQUIRED');
const args = ['-X','-q','-h',socket,'-p',process.env.MOHEN_TEST_PORT ?? '55432','-U','k3_admin','-d',database,'-At','-v','ON_ERROR_STOP=1'];
const sql = text => execFileSync(psql,args,{input:text,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
assert.equal(sql("select current_setting('mohen.test_instance',true)"),'codex-k3-isolated');
assert.equal(sql("select to_regprocedure('control.sign_gate_candidate(uuid,uuid,text,text,timestamp with time zone,jsonb,uuid)') is not null"),'t','Independent Gate signing transaction must exist');
assert.equal(sql("select to_regprocedure('control.artifact_revision_for(text,uuid)') is not null"),'t','Gate identity must bind a real current artifact revision');
const reviewer='11111111-1111-4111-8111-111111111111';
const secret='isolated-authority-fixture-session-secret-at-least-32';
const payload=Buffer.from(JSON.stringify({uid:reviewer,r:['operator'],exp:Date.now()+300000})).toString('base64url');
const token=payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url');
const asSigner = query => `begin; set local role mohen_gate_signer; set local mohen.session_token='${token}'; ${query}; commit;`;
sql(`insert into public.users(user_id,email,username,password_hash) values('${reviewer}','gate-fixture@example.invalid','Fixture independent reviewer','not-a-password');
 insert into control.session_verification_keys(verification_key) values('${secret}') on conflict(key_slot) do update set verification_key=excluded.verification_key;
 insert into control.gate_policy_versions(gate_code,rule_version,required_checks,max_validity,source_ref,enabled) values('G0','fixture-rule',array['identity_version','rights_by_operation'],interval '1 hour','TEST_ONLY:synthetic-policy',true);
 insert into control.gate_reviewer_bindings(reviewer_user_id,db_identity,gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,valid_until,source_ref)
 values('${reviewer}','mohen_gate_signer','G0','G0','fixture','1','producer','{"project":"fixture"}',now()+interval '1 day','TEST_ONLY:synthetic-reviewer');`);
const until=sql("select (now()+interval '30 minutes')::text");
const receipt=JSON.stringify({checks:{identity_version:true,rights_by_operation:true},rationale:'TEST_ONLY independent review fixture',evidence_refs:[{id:'fixture-evidence'}]});
function candidate({revision='r1',deps=[],scope={project:'fixture'}}={}) {
 const objectId=createHash('md5').update('TEST_ONLY:'+revision).digest('hex');
 sql(`insert into source.sources(source_id,provider,title,source_type,carrier_type,content_availability) values('${objectId}','TEST_ONLY','TEST_ONLY ${revision}','fixture','text','full_content') on conflict do nothing`);
 const physicalRevision=sql(`select control.artifact_revision_for('source','${objectId}')`);
 return sql(`set role mohen_producer; insert into control.gate_candidates(run_id,stage,gate_code,object_type,object_id,artifact_revision,purpose_namespace,purpose_code,purpose_version,allowed_scope,consumer,dependency_snapshot,evidence_refs,input_fingerprint)
 values('00000000-0000-0000-0000-000000000010','D00','G0','source','${objectId}','${physicalRevision}','G0','fixture','1','${JSON.stringify(scope)}','producer','${JSON.stringify(deps)}','[{"id":"fixture-evidence"}]','${'a'.repeat(64)}') returning candidate_id;`);
}
function sign(c,request=randomUUID(),expected=null,review=receipt,result='PASS') {
 return `select control.sign_gate_candidate('${c}','${request}','${result}','fixture-rule','${until}','${review}',${expected?`'${expected}'`:'null'})`;
}
for(const role of ['mohen_producer','mohen_app_runtime']) assert.throws(()=>sql(`set role ${role}; ${sign(randomUUID())}`),/permission denied/,'Neither Producer nor ordinary app can sign');
const c=candidate();
assert.throws(()=>sql(`set role mohen_gate_signer; ${sign(c)}`),/REVIEWER_IDENTITY_REQUIRED/,'A role or claimed cookie roles do not prove reviewer identity');
assert.throws(()=>sql(asSigner(sign(c,randomUUID(),null,'{}'))),/REVIEW_RECEIPT_INVALID/);
const request=randomUUID();
const audit=sql(asSigner(sign(c,request)));
assert.match(audit,/^[a-f0-9-]{36}$/);
assert.equal(sql(asSigner(sign(c,request))),audit,'identical request is idempotent');
assert.throws(()=>sql(asSigner(sign(c,request,null,receipt,'REJECT'))),/IDEMPOTENCY_CONFLICT/);
assert.equal(sql(`select control.current_qualification_is_valid('${audit}')`),'t');
assert.equal(sql(`select count(*) from control.gate_audits where decision_request_id='${request}'`),'1');
assert.throws(()=>sql(`update control.gate_audits set reason_codes=array['rewrite'] where gate_audit_id='${audit}'`),/SIGNED_AUDIT_IMMUTABLE/);
const c2=candidate();assert.throws(()=>sql(asSigner(sign(c2))),/QUALIFICATION_CAS_CONFLICT/);
const next=sql(asSigner(sign(c2,randomUUID(),audit)));
assert.notEqual(next,audit);
assert.equal(sql(`select control.current_qualification_is_valid('${audit}')`),'f','superseded audits are not current');
assert.equal(sql(`select control.current_qualification_is_valid('${next}')`),'t');
const digest=sql(`select qualification_digest from control.gate_audits where gate_audit_id='${next}'`);
const baseRevision=sql(`select artifact_revision from control.gate_audits where gate_audit_id='${next}'`);
const child=candidate({revision:'child',deps:[{gate_audit_id:next,qualification_digest:digest,artifact_revision:baseRevision}]});
const childAudit=sql(asSigner(sign(child)));
assert.equal(sql(`select control.current_qualification_is_valid('${childAudit}')`),'t');
const badScope=candidate({revision:'bad-scope',scope:{project:'foreign'}});assert.throws(()=>sql(asSigner(sign(badScope))),/REVIEWER_BINDING_REQUIRED/);
const expired=candidate({revision:'expired'});assert.throws(()=>sql(asSigner(sign(expired).replace(until,'2000-01-01T00:00:00Z'))),/QUALIFICATION_VALIDITY_INVALID/);
sql(`update public.users set status='disabled' where user_id='${reviewer}'`);
assert.throws(()=>sql(asSigner(sign(candidate({revision:'disabled'})))),/REVIEWER_IDENTITY_REQUIRED/);
sql(`update public.users set status='active' where user_id='${reviewer}'`);
// Inject an audit failure: no success or partial pointer removal may escape the transaction.
sql("create function control.fixture_event_failure() returns trigger language plpgsql as $$ begin raise exception 'INJECTED_EVENT_FAILURE'; end $$; create trigger fixture_event_failure before insert on control.invalidation_events for each row execute function control.fixture_event_failure()");
const revokeRequest=randomUUID();
const revoke=`select control.revoke_gate_qualification('${next}','${revokeRequest}','fixture rights withdrawn')`;
assert.throws(()=>sql(asSigner(revoke)),/INJECTED_EVENT_FAILURE/);
assert.equal(sql(`select count(*) from control.invalidation_events where control_request_id='${revokeRequest}'`),'0');
sql('drop trigger fixture_event_failure on control.invalidation_events; drop function control.fixture_event_failure()');
assert.equal(sql(asSigner(revoke)),'1','count only pointers changed by this event');
assert.equal(sql(asSigner(revoke)),'1','replay returns original effect without repeating event');
assert.equal(sql(`select count(*) from control.invalidation_events where control_request_id='${revokeRequest}'`),'1');
assert.equal(sql(`select control.current_qualification_is_valid('${next}')`),'f');
assert.equal(sql(`select control.current_qualification_is_valid('${childAudit}')`),'f','revoked ancestor blocks descendant without deleting unrelated history');
assert.throws(()=>sql(asSigner(sign(candidate({revision:'stale-dep',deps:[{gate_audit_id:next,qualification_digest:digest,artifact_revision:baseRevision}]})))),/DEPENDENCY_NOT_CURRENT/);
const before=sql('select count(*) from control.gate_audits');
sql("create function control.fixture_projection_failure() returns trigger language plpgsql as $$ begin raise exception 'INJECTED_PROJECTION_FAILURE'; end $$; create trigger fixture_projection_failure before insert on control.qualification_current for each row execute function control.fixture_projection_failure()");
const failureCandidate=candidate({revision:'failed-atomic'});
assert.throws(()=>sql(asSigner(sign(failureCandidate))),/INJECTED_PROJECTION_FAILURE/);
assert.equal(sql('select count(*) from control.gate_audits'),before,'failed projection must roll back appended decision');
assert.equal(sql(`select candidate_status from control.gate_candidates where candidate_id='${failureCandidate}'`),'SUBMITTED');
sql('drop trigger fixture_projection_failure on control.qualification_current; drop function control.fixture_projection_failure()');
// Two real concurrent connections, same empty key: exactly one can create qualification.
const ca=candidate({revision:'concurrent'}), cb=candidate({revision:'concurrent'});
async function concurrent(q) {return new Promise(resolve=>{const p=spawn(psql,args,{stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);p.on('close',code=>resolve({code,out,err}));p.stdin.end(asSigner(q));});}
const outcomes=await Promise.all([concurrent(sign(ca)),concurrent(sign(cb))]);
assert.equal(outcomes.filter(x=>x.code===0).length,1,'one concurrent signing transaction wins');
assert.match(outcomes.find(x=>x.code!==0).err,/QUALIFICATION_CAS_CONFLICT/);
console.log('K3_INDEPENDENT_GATE_PASS identities ACL receipt policy idempotency CAS append-only revocation dependency propagation atomic-failure concurrency');

// A failed professional check must permit an honest HOLD/REJECT, never PASS.
const failedReceipt=JSON.stringify({...JSON.parse(receipt),checks:{identity_version:true,rights_by_operation:false}});
const heldCandidate=candidate({revision:'professional-hold'});
assert.throws(()=>sql(asSigner(sign(heldCandidate,randomUUID(),null,failedReceipt,'PASS'))),/REVIEW_RECEIPT_INVALID/);
const heldAudit=sql(asSigner(sign(heldCandidate,randomUUID(),null,failedReceipt,'HOLD')));
assert.equal(sql(`select result from control.gate_audits where gate_audit_id='${heldAudit}'`),'HOLD');
assert.equal(sql(`select control.current_qualification_is_valid('${heldAudit}')`),'f');
const rejectedAudit=sql(asSigner(sign(heldCandidate,randomUUID(),null,failedReceipt,'REJECT')));
assert.equal(sql(`select result from control.gate_audits where gate_audit_id='${rejectedAudit}'`),'REJECT');

const { existsSync } = await import('node:fs');
assert.equal(existsSync(new URL('../../packages/data-access/src/gate-authority-repository.mjs',import.meta.url)),true,'Dedicated signer repository required; web shared DB cannot be the signer');
const { createGateAuthorityRepository } = await import('../../packages/data-access/src/gate-authority-repository.mjs');
const { createRequire } = await import('node:module');
const requirePg=createRequire(new URL('../../packages/data-access/package.json',import.meta.url));
const { Pool }=requirePg('pg');
const signerLogin='hp06_signer_'+randomUUID().replaceAll('-','');
sql(`create role ${signerLogin} login nosuperuser nobypassrls nocreatedb nocreaterole noreplication;
 grant mohen_gate_signer to ${signerLogin};
 insert into control.gate_reviewer_bindings(reviewer_user_id,db_identity,gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,valid_until,source_ref)
 values('${reviewer}','${signerLogin}','G0','G0','fixture','1','producer','{"project":"fixture"}',now()+interval '1 day','TEST_ONLY:independent-login');`);
const signerPool=new Pool({host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),user:signerLogin,database,max:1});
try {
 const repo=createGateAuthorityRepository(signerPool);
 const repoCandidate=candidate({revision:'repository'});
 const id=await repo.decide({candidateId:repoCandidate,requestId:randomUUID(),result:'PASS',ruleVersion:'fixture-rule',validUntil:until,receipt:JSON.parse(receipt),expectedAuditId:null},token);
 assert.match(id,/^[a-f0-9-]{36}$/);
 const switchedLowPool=new Pool({host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),user:signerLogin,database,max:1,options:'-c role=mohen_gate_signer'});
 try {await assert.rejects(()=>createGateAuthorityRepository(switchedLowPool).revoke({auditId:id,requestId:randomUUID(),reason:'hidden login identity'},token),/INDEPENDENT_SIGNER_CONNECTION_REQUIRED/);}finally{await switchedLowPool.end();}

 assert.equal((await signerPool.query("select coalesce(current_setting('mohen.session_token',true),'')='' as cleared")).rows[0].cleared,true,'transaction-scoped identity must not leak into a reused pool client');
 await assert.rejects(()=>repo.decide({candidateId:candidate({revision:'bad-token'}),requestId:randomUUID(),result:'PASS',ruleVersion:'fixture-rule',validUntil:until,receipt:JSON.parse(receipt)},'invalid'),/REVIEWER_IDENTITY_REQUIRED/);
 assert.equal((await signerPool.query("select coalesce(current_setting('mohen.session_token',true),'')='' as cleared")).rows[0].cleared,true,'failed transaction must clear its identity too');
 sql(`update source.sources set title='TEST_ONLY changed after signing' where source_id=(select object_id from control.gate_audits where gate_audit_id='${id}')`);
 assert.equal(sql(`select control.current_qualification_is_valid('${id}')`),'f','actual artifact mutation invalidates its old qualification immediately');
 assert.equal(await repo.revoke({auditId:id,requestId:randomUUID(),reason:'fixture repository revoke'},token),1);
} finally { await signerPool.end();sql(`drop role ${signerLogin}`); }
const highPool=new Pool({host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),user:'k3_admin',database,max:1});
try {await assert.rejects(()=>createGateAuthorityRepository(highPool).revoke({auditId:next,requestId:randomUUID(),reason:'bad DB identity'},token),/INDEPENDENT_SIGNER_CONNECTION_REQUIRED/);}finally{await highPool.end();}
const disguisedPool=new Pool({host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),user:'k3_admin',database,max:1,options:'-c role=mohen_gate_signer'});
try {await assert.rejects(()=>createGateAuthorityRepository(disguisedPool).revoke({auditId:next,requestId:randomUUID(),reason:'disguised admin'},token),/INDEPENDENT_SIGNER_CONNECTION_REQUIRED/);}finally{await disguisedPool.end();}
console.log('K3_GATE_REPOSITORY_PASS actual-low-privilege-login shared-admin-SET-ROLE-denied single-client-transaction token-cleared rollback');
