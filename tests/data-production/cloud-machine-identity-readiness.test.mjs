import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cloudExecutionReadiness,resolveMachineDatabaseUrl} from '../../pipelines/data-production/orchestrator/cloud-execution-readiness.mjs';

const host='db.example.supabase.co';
const producer=(suffix='?sslmode=verify-full',user='mohen_m5_producer_login')=>
  `postgresql://${user}:test-fixture-not-real@${host}:5432/postgres${suffix}`;
const worker=(suffix='?sslmode=verify-full',user='mohen_m5_worker_login')=>
  `postgresql://${user}:another-test-fixture@${host}:5432/postgres${suffix}`;
const component=(env,id)=>cloudExecutionReadiness(env).components.find(c=>c.id===id);

test('remote separate machine role URLs with TLS verify-full reach credential preflight',()=>{
  const config={MOHEN_PRODUCER_DATABASE_URL:producer(),MOHEN_PRIVATE_WORKER_DATABASE_URL:worker()};
  assert.equal(component(config,'producer').status,'CONFIGURED');
  assert.equal(component(config,'private_worker').status,'CONFIGURED');
  assert.equal(cloudExecutionReadiness(config).runtime_verified,false);
  assert.equal(cloudExecutionReadiness(config).gate_qualification,'NOT_VERIFIED');
});
test('reject remote machine URLs missing complete TLS verification',()=>{
  for(const suffix of ['','?sslmode=disable','?sslmode=prefer','?sslmode=require',
    '?sslmode=verify-ca','?sslmode=verify-full&sslmode=verify-full',
    '?sslmode=verify-full&sslnegotiation=direct','?sslmode=verify-full#credential']){
    assert.equal(component({MOHEN_PRODUCER_DATABASE_URL:producer(suffix)},'producer').status,'INVALID',suffix);
  }
});
test('reject privileged identities and same identity reused by Worker',()=>{
  for(const name of ['postgres','postgres.myproject','supabase_admin','mohen_app_runtime',
     'mohen_gate_reader','mohen_gate_authority','mohen_gate_signer','mohen_producer']){
    assert.equal(component({MOHEN_PRODUCER_DATABASE_URL:producer('?sslmode=verify-full',name)},'producer').status,'INVALID',name);
  }
  const same={MOHEN_PRODUCER_DATABASE_URL:producer(),
     MOHEN_PRIVATE_WORKER_DATABASE_URL:worker('?sslmode=verify-full','mohen_m5_producer_login')};
  assert.equal(component(same,'private_worker').status,'INVALID');
});
test('placeholder or non-URL cannot activate Producer or Worker',()=>{
  const config={MOHEN_PRODUCER_DATABASE_URL:'M5_INVALID_PENDING_SECURE_ROLE_ACTIVATION',
     MOHEN_PRIVATE_WORKER_DATABASE_URL:'M5_INVALID_PENDING_SECURE_ROLE_ACTIVATION'};
  assert.equal(component(config,'producer').status,'INVALID');
  assert.equal(component(config,'private_worker').status,'INVALID');
});
test('local credential tests remain supported without relaxing remote TLS policy',()=>{
  const config={MOHEN_PRODUCER_DATABASE_URL:'postgresql://mohen_m5_producer_login:test@localhost:5432/postgres',
    MOHEN_PRIVATE_WORKER_DATABASE_URL:'postgresql://mohen_m5_worker_login:test@127.0.0.1:5432/postgres'};
  assert.equal(component(config,'producer').status,'CONFIGURED');
  assert.equal(component(config,'private_worker').status,'CONFIGURED');
});
test('Cloud child cannot fall back to generic privileged web DATABASE_URL',()=>{
  const source=readFileSync(new URL('../../pipelines/data-production/orchestrator/cloud-production-runtime.mjs',import.meta.url),'utf8');
  assert.match(source,/const producerDatabaseUrl=resolveMachineDatabaseUrl\(/);
  assert.match(source,/DATABASE_URL:producerDatabaseUrl/);
  assert.doesNotMatch(source,/MOHEN_PRODUCER_DATABASE_URL\?\?environment\.DATABASE_URL/);
  assert.match(source,/CLOUD_PRODUCER_REQUIRED/);
});

test('split protected machine passwords are encoded only in memory and allow independent non-privileged role readiness',()=>{
  const rawProducer='strong%#?@/&+ password 47!';
  const rawWorker='other:%?@pass&word with space';
  const environment={
    MOHEN_PRODUCER_DATABASE_URL:'postgresql://mohen_m5_producer_login.project@db.example.supabase.co:5432/postgres?sslmode=verify-full',
    MOHEN_PRIVATE_WORKER_DATABASE_URL:'postgresql://mohen_m5_worker_login.project@db.example.supabase.co:5432/postgres?sslmode=verify-full',
    MOHEN_PRODUCER_DATABASE_PASSWORD:rawProducer,
    MOHEN_PRIVATE_WORKER_DATABASE_PASSWORD:rawWorker,
  };
  assert.equal(component(environment,'producer').status,'CONFIGURED');
  assert.equal(component(environment,'private_worker').status,'CONFIGURED');
  const u=new URL(resolveMachineDatabaseUrl(environment.MOHEN_PRODUCER_DATABASE_URL,rawProducer));
  assert.equal(decodeURIComponent(u.password),rawProducer);
  assert.equal(u.searchParams.get('sslmode'),'verify-full');
  assert.equal(u.hostname,'db.example.supabase.co');
  assert.equal(cloudExecutionReadiness(environment).runtime_verified,false);
});
test('split credential config rejects raw secret without valid URL, empty value, and ambiguous URL password',()=>{
  const base='postgresql://mohen_m5_producer_login.project@db.example.supabase.co:5432/postgres?sslmode=verify-full';
  assert.equal(resolveMachineDatabaseUrl(base,''),null);
  assert.equal(resolveMachineDatabaseUrl('M5_INVALID_PENDING_SECURE_ROLE_ACTIVATION','test'),null);
  assert.equal(resolveMachineDatabaseUrl(producer(),'another-new-secret'),null);
  assert.equal(component({MOHEN_PRODUCER_DATABASE_URL:base,MOHEN_PRODUCER_DATABASE_PASSWORD:''},'producer').status,'INVALID');
  assert.equal(component({MOHEN_PRODUCER_DATABASE_URL:base,MOHEN_PRODUCER_DATABASE_PASSWORD:'good'},'producer').status,'CONFIGURED');
});
test('split machine secrets are not passed to Runner environment as separate values',()=>{
 const runtime=readFileSync(new URL('../../pipelines/data-production/orchestrator/cloud-production-runtime.mjs',import.meta.url),'utf8');
 assert.match(runtime,/resolveMachineDatabaseUrl\(/);
 assert.match(runtime,/MOHEN_PRIVATE_WORKER_DATABASE_URL:workerDatabaseUrl/);
 assert.match(runtime,/DATABASE_URL:producerDatabaseUrl/);
 assert.doesNotMatch(runtime,/['"]MOHEN_PRODUCER_DATABASE_PASSWORD['"]/);
 assert.doesNotMatch(runtime,/['"]MOHEN_PRIVATE_WORKER_DATABASE_PASSWORD['"]/);
});
