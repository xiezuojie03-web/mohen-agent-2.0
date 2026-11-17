import {generateKeyPairSync} from 'node:crypto';
const {publicKey}=generateKeyPairSync('ed25519');
// Synthetic configuration only; no service is contacted by these fixtures.
export function cloudEnvironment(overrides={}) {
  return {
    MOHEN_CLOUD_EXECUTION_ENABLED:'true',
    MOHEN_CLOUD_EXECUTOR_CREDENTIAL:'synthetic-cloud-credential-at-least-32',
    MOHEN_PRODUCER_DATABASE_URL:'postgresql://mohen_producer_machine:synthetic-db-password@db.invalid/test?sslmode=verify-full',
    MOHEN_PRIVATE_WORKER_DATABASE_URL:'postgresql://mohen_private_worker:synthetic-worker-password@db.invalid/test?sslmode=verify-full',
    MOHEN_EXECUTION_AUTH_PUBLIC_KEY:publicKey.export({type:'spki',format:'pem'}),
    MOHEN_EXECUTION_AUTH_VERIFY_URL:'https://authority.invalid/consume',
    MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL:'synthetic-verifier-credential-at-least-32',
    MOHEN_EXECUTION_AUTH_DYNAMIC_URL:'https://authority.invalid/token',
    MOHEN_EXECUTION_AUTH_DYNAMIC_CREDENTIAL:'synthetic-issuer-credential-at-least-32',
    MOHEN_INDEPENDENT_GATE_VERIFY_URL:'https://reviewer.invalid/current',
    MOHEN_INDEPENDENT_GATE_VERIFY_CREDENTIAL:'synthetic-gate-credential-at-least-32',
    MOHEN_SUPABASE_URL:'https://storage.invalid',
    MOHEN_PRIVATE_STORAGE_SERVICE_KEY:'synthetic-storage-service-key',
    MOHEN_ORIGINAL_BRIDGE_SECRET:'synthetic-original-bridge-secret-at-least-32',
    MOHEN_ORIGINAL_BRIDGE_KEY_VERSION:'test-v1',
    ...overrides,
  };
}
