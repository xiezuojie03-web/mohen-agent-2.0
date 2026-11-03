// Explicit disposable-PG17 TLS test. Never reuse a production connection or key.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPrivateWorkerPool,assertPrivateWorkerIdentity} from '../../packages/data-access/src/private-worker-pool.mjs';

const connection=process.env.MOHEN_TEST_TLS_DATABASE_URL;
const caFile=process.env.MOHEN_TEST_TLS_CA_FILE;
let url;
try {url=new URL(connection);}catch{throw Error('ISOLATED_TLS_FIXTURE_REQUIRED');}
if(process.env.MOHEN_TEST_TLS_INSTANCE!=='codex-k3-isolated'||
  !['localhost','127.0.0.1'].includes(url.hostname)&&!/^172\.17\.0\.\d+$/.test(url.hostname)||
  typeof caFile!=='string'||!caFile.startsWith('/workspace/'))throw Error('ISOLATED_TLS_FIXTURE_REQUIRED');
const trusted=createPrivateWorkerPool(connection,{ca:fs.readFileSync(caFile,'utf8')});
try {
  assert.equal((await trusted.query("select current_setting('mohen.test_instance',true) as marker")).rows[0].marker,'codex-k3-isolated');
  await assertPrivateWorkerIdentity(trusted);
  const {rows}=await trusted.query('select ssl,version from pg_stat_ssl where pid=pg_backend_pid()');
  assert.equal(rows[0].ssl,true);assert.match(rows[0].version,/TLS/);
}finally{await trusted.end();}
const untrusted=createPrivateWorkerPool(connection);
try {await assert.rejects(()=>untrusted.query('select 1'),/self-signed certificate|unable to verify/);}
finally{await untrusted.end();}
console.log('MAB_PRIVATE_WORKER_TLS_PASS actual-PG17 trusted-CA low-priv-login encrypted-connection untrusted-cert-denied');
