// Lazy CLI composition only. Called by the private adapter AFTER Runner grant,
// Registry and exact Adapter authorization. Configuration grants no execution.
export function createPrivateEvidenceRuntimeLoader({environment=process.env,
  createPool,assertIdentity,createStorage,createWorker}={}) {
  let pending,pool,closed=false;
  async function initialize() {
    if(environment.MOHEN_PRIVATE_EVIDENCE_WORKER_ENABLED!=='true')return null;
    const config={database:environment.MOHEN_PRIVATE_WORKER_DATABASE_URL,
      session:environment.MOHEN_PRIVATE_WORKER_OWNER_SESSION,
      endpoint:environment.MOHEN_SUPABASE_URL,storageKey:environment.MOHEN_PRIVATE_STORAGE_SERVICE_KEY,
      verificationKey:environment.MOHEN_ORIGINAL_BRIDGE_SECRET,
      keyVersion:environment.MOHEN_ORIGINAL_BRIDGE_KEY_VERSION};
    if(Object.values(config).some(x=>typeof x!=='string'||!x.trim())||config.verificationKey.length<32)
      throw Error('PRIVATE_STAGE_RUNTIME_CONFIG_REQUIRED');
    const db=await import('../../../packages/data-access/src/private-worker-pool.mjs');
    pool=await (createPool??db.createPrivateWorkerPool)(config.database,{ca:environment.MOHEN_DATABASE_CA_CERT});
    try {
      await (assertIdentity??db.assertPrivateWorkerIdentity)(pool);
      const storageFactory=createStorage??(await import('../../../packages/data-access/src/private-original-storage.mjs')).createPrivateOriginalStorage;
      const workerFactory=createWorker??(await import('./private-evidence-binding.mjs')).createBoundPrivateEvidenceStageWorker;
      const storage=storageFactory({endpoint:config.endpoint,token:config.storageKey});
      return {privateEvidenceWorker:workerFactory({pool,storage,
        verificationKey:config.verificationKey,keyVersion:config.keyVersion}),
        privateEvidenceOwnerSessionToken:config.session};
    }catch(error){await pool.end();pool=undefined;throw error;}
  }
  return {
    async load(){
      if(closed)throw Error('PRIVATE_STAGE_RUNTIME_CLOSED');
      pending??=initialize();return pending;
    },
    async close(){
      if(closed)return;closed=true;
      if(pending)await pending.catch(()=>{});
      if(pool){const current=pool;pool=undefined;await current.end();}
    },
  };
}
