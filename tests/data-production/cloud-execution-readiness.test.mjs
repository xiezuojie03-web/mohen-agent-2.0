import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import * as runtime from '../../pipelines/data-production/orchestrator/cloud-production-runtime.mjs';
import {createCloudProductionServer} from '../../pipelines/data-production/orchestrator/cloud-production-server.mjs';
import {cloudEnvironment} from './fixtures/cloud-execution-environment.mjs';

test('missing independent Gate prevents execution rather than becoming a post-claim failure',()=>{
  const env=cloudEnvironment();delete env.MOHEN_INDEPENDENT_GATE_VERIFY_CREDENTIAL;
  assert.throws(()=>runtime.assertCloudExecutionConfiguration(env),/CLOUD_INDEPENDENT_GATE_REQUIRED/);
});
test('missing Worker and private-original storage are blocked before opening a child',()=>{
  for(const key of ['MOHEN_PRIVATE_WORKER_DATABASE_URL','MOHEN_SUPABASE_URL','MOHEN_PRIVATE_STORAGE_SERVICE_KEY','MOHEN_ORIGINAL_BRIDGE_SECRET','MOHEN_ORIGINAL_BRIDGE_KEY_VERSION']) {
    const env=cloudEnvironment();delete env[key];
    assert.throws(()=>runtime.assertCloudExecutionConfiguration(env),/CLOUD_(PRIVATE_WORKER|PRIVATE_STORAGE)_REQUIRED/,key);
  }
});
test('authority and Gate endpoints reject plaintext transport, URL credentials, queries and fragments',()=>{
  for(const key of ['MOHEN_EXECUTION_AUTH_VERIFY_URL','MOHEN_EXECUTION_AUTH_DYNAMIC_URL','MOHEN_INDEPENDENT_GATE_VERIFY_URL']) {
    for(const url of ['http://authority.invalid/path','https://user:secret@authority.invalid/path','https://authority.invalid/path?secret=private','https://authority.invalid/path#fragment'])
      assert.throws(()=>runtime.assertCloudExecutionConfiguration(cloudEnvironment({[key]:url})),/CLOUD_/,key);
  }
});
test('only a parseable Ed25519 public key can configure the independent execution authority',()=>{
  const {publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  for(const key of ['fixture',publicKey.export({type:'spki',format:'pem'})])
    assert.throws(()=>runtime.assertCloudExecutionConfiguration(cloudEnvironment({MOHEN_EXECUTION_AUTH_PUBLIC_KEY:key})),/CLOUD_EXECUTION_AUTHORITY_REQUIRED/);
});
test('a private signing key cannot be smuggled into the Producer through the public-key setting',()=>{
  const {privateKey}=generateKeyPairSync('ed25519');
  const key=privateKey.export({type:'pkcs8',format:'pem'});
  assert.throws(()=>runtime.assertCloudExecutionConfiguration(cloudEnvironment({MOHEN_EXECUTION_AUTH_PUBLIC_KEY:key})),/CLOUD_EXECUTION_AUTHORITY_REQUIRED/);
});
test('Producer cannot borrow Web identity, Worker identity or an unsafe connection URI',()=>{
  for(const uri of [undefined,'postgresql://postgres:secret@db.invalid/test?sslmode=verify-full','postgresql://mohen_private_worker:secret@db.invalid/test?sslmode=verify-full','postgresql://mohen_producer:secret@db.invalid/test?sslmode=disable'])
    assert.throws(()=>runtime.assertCloudExecutionConfiguration(cloudEnvironment({MOHEN_PRODUCER_DATABASE_URL:uri})),/CLOUD_PRODUCER_REQUIRED|CLOUD_PRIVATE_WORKER_REQUIRED/);
});
test('NOLOGIN duty roles cannot be mistaken for dedicated machine database logins',()=>{
  for(const role of ['mohen_producer','mohen_app_runtime','mohen_gate_signer','mohen_gate_reader','mohen_gate_authority']){
    for(const key of ['MOHEN_PRODUCER_DATABASE_URL','MOHEN_PRIVATE_WORKER_DATABASE_URL']){
      const env=cloudEnvironment({[key]:`postgresql://${role}:synthetic-password@db.invalid/test?sslmode=verify-full`});
      assert.throws(()=>runtime.assertCloudExecutionConfiguration(env),
        /CLOUD_(PRODUCER|PRIVATE_WORKER)_REQUIRED/,`${role} as ${key}`);
    }
  }
});
test('all signer connection aliases and private signing keys remain outside the executor',()=>{
  for(const key of ['MOHEN_GATE_DATABASE_URL','MOHEN_GATE_SIGNER_DATABASE_URL','MOHEN_GATE_MACHINE_DATABASE_URL','MOHEN_GATE_DATABASE_SESSION_KEY','MOHEN_EXECUTION_AUTH_PRIVATE_KEY'])
    assert.throws(()=>runtime.assertCloudExecutionConfiguration(cloudEnvironment({[key]:'synthetic-forbidden-value'})),/CLOUD_EXECUTOR_SIGNER_CREDENTIAL_FORBIDDEN/);
});
test('readiness reports bounded component codes without secret values or runtime qualification',()=>{
  assert.equal(typeof runtime.cloudExecutionReadiness,'function');
  const env=cloudEnvironment();const report=runtime.cloudExecutionReadiness(env);
  assert.equal(report.configuration_ready,true);assert.equal(report.runtime_verified,false);
  assert.equal(report.gate_qualification,'NOT_VERIFIED');
  const empty=runtime.cloudExecutionReadiness({});assert.equal(empty.configuration_ready,false);
  assert.ok(empty.components.some(c=>c.missing_keys.includes('MOHEN_PRIVATE_WORKER_DATABASE_URL')));
  const text=JSON.stringify(runtime.cloudExecutionReadiness({...env,MOHEN_EXECUTION_AUTH_VERIFY_URL:'https://user:do-not-disclose@authority.invalid/'}));
  for(const secret of ['do-not-disclose','synthetic-db-password','synthetic-storage-service-key','BEGIN PUBLIC KEY'])assert.equal(text.includes(secret),false);
});
test('server rejects incomplete default execution before any Owner lookup or durable claim',async()=>{
  let touched=false;const env=cloudEnvironment();delete env.MOHEN_INDEPENDENT_GATE_VERIFY_CREDENTIAL;
  const handler=createCloudProductionServer({environment:env,projectRoot:process.cwd(),db:{queryRows:async()=>{touched=true;}},verifyOwnerOriginal:async()=>{touched=true;}});
  const response=await handler(new Request('https://worker.invalid/execute',{method:'POST'}));
  assert.equal(response.status,503);assert.equal(touched,false);
  assert.equal((await response.json()).reason,'cloud_executor_not_configured');
});
