// Lazy CLI composition only. Called by the private adapter AFTER Runner grant,
// Registry and exact Adapter authorization. Configuration grants no execution.
export function createPrivateEvidenceRuntimeLoader({environment=process.env,
  createPool,assertIdentity,createStorage,createWorker}={}) {
  let pending,pool,closed=false;
  async function initialize() {
    if(environment.MOHEN_PRIVATE_EVIDENCE_WORKER_ENABLED!=='true')return null;
    // Local isolated backend: same storage key/SHA/fail-closed contract as the
    // Supabase adapter, bytes from the local private-originals directory.
    const localFs=environment.MOHEN_PRIVATE_ORIGINAL_LOCAL_FS==='true';
    const config={database:environment.MOHEN_PRIVATE_WORKER_DATABASE_URL,
      session:environment.MOHEN_PRIVATE_WORKER_OWNER_SESSION,
      endpoint:environment.MOHEN_SUPABASE_URL,storageKey:environment.MOHEN_PRIVATE_STORAGE_SERVICE_KEY,
      verificationKey:environment.MOHEN_ORIGINAL_BRIDGE_SECRET,
      keyVersion:environment.MOHEN_ORIGINAL_BRIDGE_KEY_VERSION,
      localDir:environment.MOHEN_PRIVATE_ORIGINAL_LOCAL_DIR};
    const required=localFs?['database','session','verificationKey','keyVersion','localDir']
      :['database','session','endpoint','storageKey','verificationKey','keyVersion'];
    if(required.some(k=>typeof config[k]!=='string'||!config[k].trim())||config.verificationKey.length<32)
      throw Error('PRIVATE_STAGE_RUNTIME_CONFIG_REQUIRED');
    const db=await import('../../../packages/data-access/src/private-worker-pool.mjs');
    pool=await (createPool??db.createPrivateWorkerPool)(config.database,{ca:environment.MOHEN_DATABASE_CA_CERT});
    try {
      await (assertIdentity??db.assertPrivateWorkerIdentity)(pool);
      let storage;
      if(createStorage)storage=createStorage(localFs?{dir:config.localDir}:{endpoint:config.endpoint,token:config.storageKey});
      else {
        const storageModule=await import('../../../packages/data-access/src/private-original-storage.mjs');
        storage=localFs?storageModule.createLocalPrivateOriginalStorage({dir:config.localDir})
          :storageModule.createPrivateOriginalStorage({endpoint:config.endpoint,token:config.storageKey});
      }
      const workerFactory=createWorker??(await import('./private-evidence-binding.mjs')).createBoundPrivateEvidenceStageWorker;
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
