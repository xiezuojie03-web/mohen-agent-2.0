import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {once} from 'node:events';
import {createIndependentGateHttpsServer} from '../../pipelines/data-production/orchestrator/independent-gate-service-runtime.mjs';
mkdirSync(resolve('work'),{recursive:true});
const scratch=mkdtempSync(resolve('work/gate-runtime-test-'));
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(scratch,'key.pem'),'-out',join(scratch,'cert.pem'),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1,DNS:localhost'],{stdio:'ignore'});
const tlsCert=readFileSync(join(scratch,'cert.pem')),tlsKey=readFileSync(join(scratch,'key.pem'));
process.on('exit',()=>rmSync(scratch,{recursive:true,force:true}));
const key='synthetic-database-session-key-at-least-32';
const config=()=>({enabled:true,tlsCert,tlsKey,databaseSessionKey:key,signerPool:{connect:async()=>{throw Error('unexpected signer connection');}},readerPool:{connect:async()=>{throw Error('unexpected reader connection');}}});
async function listening(t,options={}){
 const server=createIndependentGateHttpsServer({...config(),...options});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
 return server.address().port;
}
function send(port,{path='/decide',method='POST',body='{}',headers={},stall=false}={}){
 return new Promise((resolve,reject)=>{
  const req=https.request({hostname:'127.0.0.1',port,path,method,ca:tlsCert,rejectUnauthorized:true,headers:{'content-type':'application/json',authorization:'Bearer '+'x'.repeat(40),...headers}},res=>{
   const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString()}));
  });
  req.on('error',reject);req.setTimeout(2000,()=>req.destroy(Error('fixture timeout')));
  if(stall){req.write(body);}else req.end(body);
 });
}
test('HTTPS runtime is OFF by default and requires explicit independent pools, session key, and TLS',()=>{
 assert.equal(createIndependentGateHttpsServer(),null);
 for(const change of [{tlsCert:undefined},{tlsKey:undefined},{databaseSessionKey:undefined},{signerPool:undefined},{readerPool:undefined}])
  assert.throws(()=>createIndependentGateHttpsServer({...config(),...change}));
 const options=config();assert.throws(()=>createIndependentGateHttpsServer({...options,readerPool:options.signerPool}));
});
test('real HTTPS adapter preserves preflight status and no-store without opening pools',async t=>{
 const port=await listening(t);
 for(const [options,status,reason] of [[{path:'/unknown'},404,'not_found'],[{method:'GET',body:''},405,'method_not_allowed'],[{headers:{authorization:'Bearer invalid'}},401,'independent_credential_required'],[{headers:{'content-type':'text/plain'}},415,'json_required'],[{body:'{'},400,'invalid_request'],[{body:'x'.repeat(17000)},413,'invalid_request']]){
  const res=await send(port,options);assert.equal(res.status,status);assert.equal(res.headers['cache-control'],'no-store');assert.equal(JSON.parse(res.body).reason,reason);
 }
});
test('stalled chunked HTTPS input returns 408 despite stopping body reads',async t=>{
 const port=await listening(t,{bodyReadTimeoutMs:30});
 const res=await send(port,{body:'{',stall:true});
 assert.equal(res.status,408);assert.equal(res.headers['cache-control'],'no-store');
 assert.deepEqual(JSON.parse(res.body),{ok:false,reason:'body_read_timeout'});
});
test('runnable entry stays OFF without opt-in and refuses enabled incomplete configuration',()=>{
 const entry=resolve('pipelines/data-production/orchestrator/independent-gate-service-runtime.mjs');
 const disabled=execFileSync(process.execPath,[entry],{env:{MOHEN_GATE_DATABASE_SESSION_KEY:'private-fixture-key'},encoding:'utf8'});
 assert.match(disabled,/service OFF/);assert.doesNotMatch(disabled,/private-fixture-key/);
 assert.throws(()=>execFileSync(process.execPath,[entry],{env:{MOHEN_INDEPENDENT_GATE_SERVICE_ENABLED:'true',MOHEN_GATE_DATABASE_SESSION_KEY:'private-fixture-key'},encoding:'utf8',stdio:'pipe'}),error=>{
  assert.equal(error.status,1);assert.match(error.stderr,/startup failed/);assert.doesNotMatch(error.stderr,/private-fixture-key/);return true;
 });
});
test('HTTPS current route reads only through explicit reader pool and preserves numeric Content-Length',async t=>{
 const id='11111111-1111-4111-8111-111111111111',events=[];
 const receipt={schema:'mohen.independent-gate-current-receipt.v1',qualification_current:true,gate_audit_id:id};
 const readerPool={connect:async()=>({query:async(sql,args)=>{
  events.push({sql,args});
  if(sql.includes('pg_roles'))return {rows:[{db_identity:'fixture_reader',login_identity:'fixture_reader',can_login:true,member:true,unsafe_membership:false}]};
  if(sql.includes('authenticate_gate_service'))return {rows:[{credential:{principal_user_id:id,job_id:'fixture-job',reviewer_binding_ref:'fixture-binding',consumer:'producer',purpose_namespace:'fixture',purpose_code:'read',purpose_version:'1',allowed_scope:{project:'fixture'},valid_until:new Date(Date.now()+60000).toISOString()}}]};
  if(sql.includes('read_gate_stage_qualification'))return {rows:[{receipt}]};
  return {command:sql==='commit'?'COMMIT':undefined,rows:[]};
 },release:()=>events.push({sql:'release'})})};
 const port=await listening(t,{readOnly:true,readerPool,signerPool:undefined,databaseSessionKey:undefined});
 assert.equal((await send(port,{path:'/decide'})).status,404);
 assert.equal(events.length,0);
 const body=JSON.stringify({schema:'mohen.independent-gate-current-check.v1',run_id:id,job_id:'fixture-job',stage:'D01',gate_code:'G1',input_digest:'a'.repeat(64),output_digest:'b'.repeat(64),reviewer_binding_ref:'fixture-binding',consumer:'producer'});
 const res=await send(port,{path:'/current',body,headers:{'content-length':String(Buffer.byteLength(body))}});
 assert.equal(res.status,200);assert.deepEqual(JSON.parse(res.body),receipt);
 assert.deepEqual(events.slice(-2).map(e=>e.sql),['commit','release']);
 assert.equal(events.some(e=>e.sql.includes('sign_gate_candidate')||e.sql.includes('revoke_gate_qualification')),false);
 assert.doesNotMatch(res.body,/private-fixture|session_token/);
});
test('database pool configuration enforces verified TLS and bounded statement/lock waits',async()=>{
 const {independentGatePoolOptions}=await import('../../pipelines/data-production/orchestrator/independent-gate-service-runtime.mjs');
 const options=independentGatePoolOptions('postgresql://dedicated:synthetic@db.example.invalid:5432/gate',{ca:'fixture-ca'});
 assert.equal(options.ssl.rejectUnauthorized,true);assert.ok(options.ssl.ca.includes('fixture-ca'));
 assert.equal(options.statement_timeout,15000);assert.equal(options.lock_timeout,5000);
 assert.equal(options.connectionTimeoutMillis,5000);assert.equal(options.user,'dedicated');
 for(const url of ['postgresql://dedicated:synthetic@db.example.invalid/gate?sslmode=disable','postgresql://dedicated:synthetic@db.example.invalid/gate?sslmode=require','postgresql://dedicated:synthetic@db.example.invalid/gate?options=-c%20role%3Dadmin','postgresql:///gate','postgresql://dedicated@db.example.invalid/gate'])
  assert.throws(()=>independentGatePoolOptions(url),/GATE_SERVICE_DATABASE_CONFIG_INVALID/);
 const systemTrust=independentGatePoolOptions('postgresql://dedicated:synthetic@db.example.invalid/gate');
 assert.equal(systemTrust.ssl.rejectUnauthorized,true);
});
