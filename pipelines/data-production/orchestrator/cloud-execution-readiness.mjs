import {createPublicKey} from 'node:crypto';

const present=v=>typeof v==='string'&&v.trim().length>0;
const credential=v=>present(v)&&v.length>=32&&v.length<=4096;
function https(value) {
  try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash;}
  catch{return false;}
}
function principal(value) {
  try {
    const u=new URL(value),user=decodeURIComponent(u.username);
    if(!['postgres:','postgresql:'].includes(u.protocol)||!u.hostname||!user||!u.password||!u.pathname.slice(1)||u.search||u.hash)return null;
    if(/^(postgres|supabase_admin|mohen_app_runtime|mohen_gate_signer|mohen_gate_authority|mohen_gate_reader)(\.|$)/i.test(user))return null;
    return user;
  }catch{return null;}
}

// Configuration diagnostics only: never network/SQL, secret values, or a Gate PASS.
// This is shared by the existing CLI receiver and the operator readiness view.
export function cloudExecutionReadiness(environment={}) {
  const components=[];
  function add(id,reason_code,keys,valid) {
    const missing_keys=keys.filter(k=>!present(environment[k]));
    components.push({id,reason_code,status:missing_keys.length?'MISSING':valid?'CONFIGURED':'INVALID',missing_keys});
  }
  const authority=['MOHEN_EXECUTION_AUTH_PUBLIC_KEY','MOHEN_EXECUTION_AUTH_VERIFY_URL','MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL','MOHEN_EXECUTION_AUTH_DYNAMIC_URL','MOHEN_EXECUTION_AUTH_DYNAMIC_CREDENTIAL'];
  let keyValid=false,tokensValid=false;
  try {
    const pem=environment.MOHEN_EXECUTION_AUTH_PUBLIC_KEY;
    // createPublicKey also accepts private PEMs; those must never enter Producer.
    keyValid=typeof pem==='string'&&/^-----BEGIN PUBLIC KEY-----\r?\n[A-Za-z0-9+/=\r\n]+\r?\n-----END PUBLIC KEY-----\s*$/.test(pem.trim())&&
      createPublicKey(pem).asymmetricKeyType==='ed25519';
  }catch{}
  try{const v=JSON.parse(environment.MOHEN_EXECUTION_AUTH_TOKENS??'{}');tokensValid=!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.values(v).every(x=>typeof x==='string');}catch{}
  add('execution_authority','CLOUD_EXECUTION_AUTHORITY_REQUIRED',authority,keyValid&&tokensValid&&
    https(environment.MOHEN_EXECUTION_AUTH_VERIFY_URL)&&https(environment.MOHEN_EXECUTION_AUTH_DYNAMIC_URL)&&
    credential(environment.MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL)&&credential(environment.MOHEN_EXECUTION_AUTH_DYNAMIC_CREDENTIAL));
  const forbidden=['MOHEN_GATE_DATABASE_URL','MOHEN_GATE_SIGNER_DATABASE_URL','MOHEN_GATE_MACHINE_DATABASE_URL',
    'MOHEN_GATE_DATABASE_SESSION_KEY','MOHEN_EXECUTION_AUTH_PRIVATE_KEY','SUPABASE_SERVICE_ROLE_KEY'];
  add('credential_separation','CLOUD_EXECUTOR_SIGNER_CREDENTIAL_FORBIDDEN',[],!forbidden.some(k=>present(environment[k])));
  const producer=principal(environment.MOHEN_PRODUCER_DATABASE_URL),worker=principal(environment.MOHEN_PRIVATE_WORKER_DATABASE_URL);
  add('producer','CLOUD_PRODUCER_REQUIRED',['MOHEN_PRODUCER_DATABASE_URL'],!!producer);
  add('private_worker','CLOUD_PRIVATE_WORKER_REQUIRED',['MOHEN_PRIVATE_WORKER_DATABASE_URL'],!!worker&&worker!==producer);
  add('independent_gate','CLOUD_INDEPENDENT_GATE_REQUIRED',['MOHEN_INDEPENDENT_GATE_VERIFY_URL','MOHEN_INDEPENDENT_GATE_VERIFY_CREDENTIAL'],
    https(environment.MOHEN_INDEPENDENT_GATE_VERIFY_URL)&&credential(environment.MOHEN_INDEPENDENT_GATE_VERIFY_CREDENTIAL));
  add('private_storage','CLOUD_PRIVATE_STORAGE_REQUIRED',['MOHEN_SUPABASE_URL','MOHEN_PRIVATE_STORAGE_SERVICE_KEY','MOHEN_ORIGINAL_BRIDGE_SECRET','MOHEN_ORIGINAL_BRIDGE_KEY_VERSION'],
    https(environment.MOHEN_SUPABASE_URL)&&credential(environment.MOHEN_ORIGINAL_BRIDGE_SECRET)&&
    environment.MOHEN_PRIVATE_ORIGINAL_LOCAL_FS!=='true');
  return {schema:'mohen.cloud-execution-readiness.v1',configuration_ready:components.every(c=>c.status==='CONFIGURED'),
    runtime_verified:false,gate_qualification:'NOT_VERIFIED',components};
}

export function assertCloudExecutionConfiguration(environment) {
  const blocked=cloudExecutionReadiness(environment).components.find(c=>c.status!=='CONFIGURED');
  if(blocked)throw Error(blocked.reason_code);
}
