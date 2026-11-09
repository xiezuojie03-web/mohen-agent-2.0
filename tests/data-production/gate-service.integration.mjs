import {createIndependentGateService} from '../../pipelines/data-production/orchestrator/independent-gate-service.mjs';
// Actual isolated PG LOGINs and stored hashed capabilities; no injected authenticator.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import https from 'node:https';
import {once} from 'node:events';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import selfsigned from 'selfsigned';
import {createIndependentGateHttpsServer} from '../../pipelines/data-production/orchestrator/independent-gate-service-runtime.mjs';
const {MOHEN_TEST_PSQL:psql,MOHEN_TEST_DATABASE:database}=process.env;
const localTcpHost=["127.0.0.1","localhost"].includes(process.env.MOHEN_TEST_HOST??"")?process.env.MOHEN_TEST_HOST:undefined;
const socket=localTcpHost??process.env.MOHEN_TEST_SOCKET;
if(!psql||!(localTcpHost||socket?.startsWith('/workspace/'))||!/^mohen_k3_[a-z0-9_]*test$/.test(database??''))throw Error('ISOLATED_TEST_DATABASE_REQUIRED');
const sql=s=>execFileSync(psql,['-X','-q','-h',socket,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database,'-At','-v','ON_ERROR_STOP=1'],{input:s,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
assert.equal(sql("select current_setting('mohen.test_instance',true)"),'codex-k3-isolated');
const {Pool}=createRequire(new URL('../../packages/data-access/package.json',import.meta.url))('pg');
const suffix=randomUUID().replaceAll('-',''),signer='gate_signer_'+suffix,reader='gate_reader_'+suffix;
const uid=randomUUID(),source=randomUUID(),key='synthetic-independent-gate-service-session-key';
const reviewToken=randomBytes(32).toString('base64url'),readToken=randomBytes(32).toString('base64url');
const digest=x=>createHash('sha256').update(x).digest('hex'),json=x=>"'"+JSON.stringify(x).replaceAll("'","''")+"'::jsonb";
const job='d00.source-acquisition',ref='service-fixture-G0',input='a'.repeat(64),output='b'.repeat(64);
const binding={job_id:job,reviewer_binding_ref:ref,consumer:'producer',input_digest:input,output_digest:output};
sql(`create role ${signer} login nosuperuser nobypassrls nocreatedb nocreaterole noreplication;grant mohen_gate_signer to ${signer};
 create role ${reader} login nosuperuser nobypassrls nocreatedb nocreaterole noreplication;grant mohen_gate_reader to ${reader};
 insert into public.users(user_id,email,username,password_hash)values('${uid}','${uid}@example.invalid','Synthetic reviewer','synthetic');
 insert into control.session_verification_keys(verification_key)values('${key}')on conflict(key_slot)do update set verification_key=excluded.verification_key;
 insert into control.gate_policy_versions(gate_code,rule_version,required_checks,max_validity,source_ref,enabled)values('G0','service-fixture',array['identity_version'],interval '1 hour','TEST_ONLY',true);
 insert into source.sources(source_id,provider,title,source_type,carrier_type,content_availability)values('${source}','TEST_ONLY','Synthetic service specimen','fixture','text','full_content');`);
const bid=sql(`insert into control.gate_reviewer_bindings(reviewer_user_id,db_identity,gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,valid_until,source_ref)
 values('${uid}','${signer}','G0','G0','service-fixture','1','producer','{"project":"service-fixture"}',now()+interval '1 day','TEST_ONLY')returning binding_id`);
for(const [cap,login,token] of [['review',signer,reviewToken],['consume',reader,readToken]])sql(`insert into control.gate_service_credentials(token_hash,capability,principal_user_id,db_identity,reviewer_binding_id,job_id,reviewer_binding_ref,gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,valid_until,source_ref)
 values('${digest(token)}','${cap}','${uid}','${login}','${bid}','${job}','${ref}','G0','G0','service-fixture','1','producer','{"project":"service-fixture"}',now()+interval '1 hour','TEST_ONLY')`);
const connection={host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),database,max:2};
const signerPool=new Pool({...connection,user:signer}),readerPool=new Pool({...connection,user:reader});
mkdirSync(resolve('work'),{recursive:true});
// Generated in-process from the declared `selfsigned` dependency so the fixture also works on
// hosts without an openssl CLI; the SAN and chain are exercised exactly as the CLI version was.
const tlsPems=await selfsigned.generate([{name:'commonName',value:'localhost'}],{days:1,keySize:2048,algorithm:'sha256',
 extensions:[{name:'basicConstraints',cA:false},{name:'subjectAltName',altNames:[{type:2,value:'localhost'},{type:7,ip:'127.0.0.1'}]}]});
const tlsCert=Buffer.from(tlsPems.cert),tlsKey=Buffer.from(tlsPems.private);
const service=createIndependentGateHttpsServer({enabled:true,signerPool,readerPool,databaseSessionKey:key,tlsCert,tlsKey});
service.listen(0,'127.0.0.1');await once(service,'listening');
// Fetch-shaped result via built-in HTTPS: both trust chain and SAN are verified.
// No global TLS override or external Agent dependency is permitted here.
const post=(path,body,token=reviewToken)=>new Promise((resolve,reject)=>{
 const encoded=JSON.stringify(body);
 const request=https.request({hostname:'127.0.0.1',port:service.address().port,path,method:'POST',
  ca:tlsCert,rejectUnauthorized:true,headers:{'content-type':'application/json',authorization:'Bearer '+token,'content-length':String(Buffer.byteLength(encoded))}},response=>{
  const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('error',reject);
  response.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:response.statusCode,headers:response.headers})));
 });
 request.on('error',reject);request.setTimeout(5000,()=>request.destroy(Error('FIXTURE_HTTPS_TIMEOUT')));request.end(encoded);
});
const revision=sql(`select control.artifact_revision_for('source','${source}')`);
const candidate=()=>sql(`set role mohen_producer;insert into control.gate_candidates(run_id,stage,gate_code,object_type,object_id,artifact_revision,purpose_namespace,purpose_code,purpose_version,allowed_scope,consumer,dependency_snapshot,evidence_refs,input_fingerprint)
 values('00000000-0000-0000-0000-000000000010','D00','G0','source','${source}','${revision}','G0','service-fixture','1','{"project":"service-fixture"}','producer','[]','[{"id":"synthetic"}]','${input}')returning candidate_id`);
const body={schema:'mohen.independent-gate-decision-request.v1',candidate_id:candidate(),request_id:randomUUID(),result:'PASS',rule_version:'service-fixture',valid_until:new Date(Date.now()+1200000).toISOString(),expected_audit_id:null,receipt:{checks:{identity_version:true},rationale:'TEST_ONLY synthetic professional check',evidence_refs:[{id:'synthetic'}],stage_binding:binding}};
const check={schema:'mohen.independent-gate-current-check.v1',run_id:'00000000-0000-0000-0000-000000000010',stage:'D00',gate_code:'G0',...binding};
try{
 for(const options of [{user:'k3_admin'},{user:'k3_admin',options:'-c role=mohen_gate_signer'},{user:signer,options:'-c role=mohen_gate_signer'}]){
  const unsafePool=new Pool({...connection,...options});
  try{const unsafe=createIndependentGateService({signerPool:unsafePool,readerPool,databaseSessionKey:key});
   assert.equal((await unsafe(new Request('https://fixture.invalid/decide',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+reviewToken},body:JSON.stringify(body)}))).status,503,'privileged or switched effective role rejected');
  }finally{await unsafePool.end();}
 }
 sql(`grant mohen_producer to ${signer}`);
 assert.equal((await post('/decide',body)).status,503,'inherited Producer membership cannot sign');
 sql(`revoke mohen_producer from ${signer}`);
 const response=await post('/decide',body);assert.equal(response.status,200,await response.clone().text());
 const audit=(await response.json()).gate_audit_id;
 assert.equal((await (await post('/decide',body)).json()).gate_audit_id,audit,'idempotent real service');
 const current=await post('/current',check,readToken);assert.equal(current.status,200,await current.clone().text());
 assert.match((await current.json()).qualification_digest,/^[a-f0-9]{64}$/);
 for(const alteration of [{job_id:'foreign'},{reviewer_binding_ref:'foreign'},{input_digest:'c'.repeat(64)},{output_digest:'c'.repeat(64)},{run_id:randomUUID()}])assert.notEqual((await post('/current',{...check,...alteration},readToken)).status,200);
 const expiredToken=randomBytes(32).toString('base64url');
 sql(`insert into control.gate_service_credentials(token_hash,capability,principal_user_id,db_identity,reviewer_binding_id,job_id,reviewer_binding_ref,gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,valid_from,valid_until,source_ref)
 select '${digest(expiredToken)}',capability,principal_user_id,db_identity,reviewer_binding_id,job_id,reviewer_binding_ref,gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,now()-interval '2 hours',now()-interval '1 hour',source_ref from control.gate_service_credentials where token_hash='${digest(reviewToken)}'`);
 assert.equal((await post('/decide',body,expiredToken)).status,403,'expired credential cannot replay a signed request');
 assert.equal((await post('/decide',body,readToken)).status,403);
 assert.equal((await post('/current',check,reviewToken)).status,403);
 assert.notEqual((await post('/decide',{...body,request_id:randomUUID(),receipt:{...body.receipt,stage_binding:{...binding,input_digest:'c'.repeat(64)}}})).status,200);
 for(const pool of [signerPool,readerPool])await assert.rejects(()=>pool.query('select * from control.gate_service_credentials'),/permission denied/);
 await assert.rejects(()=>readerPool.query('select * from control.gate_audits'),/permission denied/);
 sql(`update public.users set status='disabled'where user_id='${uid}'`);
 assert.equal((await post('/current',check,readToken)).status,403);
 sql(`update public.users set status='active'where user_id='${uid}';update control.gate_reviewer_bindings set active=false where binding_id='${bid}'`);
 assert.equal((await post('/current',check,readToken)).status,403);
 sql(`update control.gate_reviewer_bindings set active=true where binding_id='${bid}'`);
 const revoke={schema:'mohen.independent-gate-revocation-request.v1',gate_audit_id:audit,request_id:randomUUID(),reason:'Synthetic rights withdrawal',reviewer_binding_ref:ref};
 const foreignToken=randomBytes(32).toString('base64url');
 sql(`insert into control.gate_service_credentials(token_hash,capability,principal_user_id,db_identity,reviewer_binding_id,job_id,reviewer_binding_ref,gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,valid_until,source_ref)
 select '${digest(foreignToken)}',capability,principal_user_id,db_identity,reviewer_binding_id,'foreign-job','foreign-ref',gate_code,purpose_namespace,purpose_code,purpose_version,consumer,allowed_scope,valid_until,source_ref from control.gate_service_credentials where token_hash='${digest(reviewToken)}'`);
 assert.notEqual((await post('/revoke',{...revoke,reviewer_binding_ref:'foreign-ref'},foreignToken)).status,200,'same scope cannot revoke another job');
 assert.equal(sql(`select control.current_qualification_is_valid('${audit}')`),'t');
 assert.equal((await post('/revoke',revoke)).status,200);
 assert.equal((await post('/current',check,readToken)).status,409,'no cached PASS after authority revocation');
 sql(`update control.gate_service_credentials set revoked_at=clock_timestamp()where token_hash='${digest(reviewToken)}'`);
 assert.equal((await post('/revoke',revoke)).status,403,'revoked bearer replay denied');
 assert.throws(()=>sql(`update control.gate_service_credentials set revoked_at=null where token_hash='${digest(reviewToken)}'`),/GATE_SERVICE_CREDENTIAL_IMMUTABLE/);
 assert.throws(()=>sql(`delete from control.gate_service_credentials where token_hash='${digest(reviewToken)}'`),/GATE_SERVICE_CREDENTIAL_IMMUTABLE/);
 console.log('MAB_GATE_SERVICE_PASS actual-dedicated-LOGIN hashed-capability scoped-decide current-consume idempotency identity-disable binding-disable revoke replay-denied immutable-tombstone no-table-access');
}finally{await new Promise(resolve=>{service.close(resolve);service.closeAllConnections();});await signerPool.end();await readerPool.end();sql(`drop owned by ${signer};drop owned by ${reader};drop role ${signer};drop role ${reader}`);}
