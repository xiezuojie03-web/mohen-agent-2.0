import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateEvidenceRuntimeLoader} from '../../pipelines/data-production/workers/private-evidence-runtime.mjs';

const environment={MOHEN_PRIVATE_EVIDENCE_WORKER_ENABLED:'true',
  MOHEN_PRIVATE_WORKER_DATABASE_URL:'postgresql://private_worker:fixture@db.example.invalid/fixture',
  MOHEN_PRIVATE_WORKER_OWNER_SESSION:'synthetic-short-lived-owner-session',
  MOHEN_PRIVATE_STORAGE_SERVICE_KEY:'synthetic-storage-key',MOHEN_SUPABASE_URL:'https://storage.example.invalid',
  MOHEN_ORIGINAL_BRIDGE_SECRET:'synthetic-byte-verifier-secret-at-least-32',
  MOHEN_ORIGINAL_BRIDGE_KEY_VERSION:'fixture-v1'};
function setup(env=environment){
  const calls=[];
  const pool={connect:async()=>{},end:async()=>calls.push('end')};
  const worker={draftTextReading:async()=>{}};
  const loader=createPrivateEvidenceRuntimeLoader({environment:env,
    createPool:async url=>{calls.push(['pool',url]);return pool},
    assertIdentity:async actual=>{assert.equal(actual,pool);calls.push('identity')},
    createStorage:options=>{calls.push(['storage',options]);return {readVerified:async()=>{}}},
    createWorker:options=>{calls.push(['worker',options]);return worker}});
  return {loader,calls,pool,worker};
}
test('private runtime defaults closed, never falls back to shared DATABASE_URL or Owner cookie',async()=>{
  const {loader,calls}=setup({DATABASE_URL:environment.MOHEN_PRIVATE_WORKER_DATABASE_URL});
  assert.equal(await loader.load(),null);assert.deepEqual(calls,[]);await loader.close();
  for(const key of Object.keys(environment).filter(k=>k!=='MOHEN_PRIVATE_EVIDENCE_WORKER_ENABLED')){
    const env={...environment};delete env[key];
    const instance=setup(env);
    await assert.rejects(()=>instance.loader.load(),/PRIVATE_STAGE_RUNTIME_CONFIG_REQUIRED/);
    assert.deepEqual(instance.calls,[]);
  }
});
test('lazy private runtime checks independent low-privilege identity before composing Owner-scoped worker, once',async()=>{
  const {loader,calls,worker}=setup();assert.deepEqual(calls,[]);
  const [a,b]=await Promise.all([loader.load(),loader.load()]);
  assert.equal(a,b);assert.equal(a.privateEvidenceWorker,worker);
  assert.equal(a.privateEvidenceOwnerSessionToken,environment.MOHEN_PRIVATE_WORKER_OWNER_SESSION);
  assert.equal(calls.filter(c=>Array.isArray(c)&&c[0]==='pool').length,1);
  assert.equal(calls[1],'identity');assert.equal(calls[2][0],'storage');
  assert.equal(calls[3][1].keyVersion,'fixture-v1');
  await loader.close();await loader.close();assert.equal(calls.filter(x=>x==='end').length,1);
  await assert.rejects(()=>loader.load(),/PRIVATE_STAGE_RUNTIME_CLOSED/);
});
test('unsafe connection fails before Storage or worker creation and closes the pool without exposing credentials',async()=>{
  let ends=0,stores=0;
  const loader=createPrivateEvidenceRuntimeLoader({environment,
    createPool:async()=>({end:async()=>ends++}),
    assertIdentity:async()=>{throw Error('PRIVATE_WORKER_DATABASE_IDENTITY_UNSAFE')},
    createStorage:()=>{stores++},createWorker:()=>{throw Error('unexpected worker')}});
  await assert.rejects(()=>loader.load(),/PRIVATE_WORKER_DATABASE_IDENTITY_UNSAFE/);
  await loader.close();assert.equal(ends,1);assert.equal(stores,0);
});

test('runtime cleanup waits for in-flight initialization and closes construction failures exactly once',async()=>{
  let resolveIdentity,ends=0;
  const identity=new Promise(resolve=>{resolveIdentity=resolve});
  const loader=createPrivateEvidenceRuntimeLoader({environment,
    createPool:async()=>({end:async()=>ends++}),assertIdentity:async()=>identity,
    createStorage:()=>({}),createWorker:()=>({})});
  const loading=loader.load(),closing=loader.close();
  resolveIdentity();await Promise.all([loading,closing]);assert.equal(ends,1);
  for(const failing of ['storage','worker']) {
    let closed=0;
    const instance=createPrivateEvidenceRuntimeLoader({environment,
      createPool:async()=>({end:async()=>closed++}),assertIdentity:async()=>{},
      createStorage:()=>{if(failing==='storage')throw Error('fixture failure');return {}},
      createWorker:()=>{throw Error('fixture failure')}});
    await assert.rejects(()=>instance.load(),/fixture failure/);
    await instance.close();assert.equal(closed,1);
  }
});
