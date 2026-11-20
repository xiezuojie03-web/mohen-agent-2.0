import {createPrivateKey} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {once} from 'node:events';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createD00ExecutionAuthorizer} from './d00-execution-authorizer.mjs';
import {createD00ExecutionAuthorityHandler} from './d00-execution-authority-http.mjs';
import {createD00ExecutionJournal} from './d00-execution-journal.mjs';
import {createIndependentHttpsServer,independentGatePoolOptions} from './independent-gate-service-runtime.mjs';
import {loadRegistry} from './registry.mjs';

const require=createRequire(new URL('../../../packages/data-access/package.json',import.meta.url));
const projectRoot=fileURLToPath(new URL('../../../',import.meta.url));

export async function startD00ExecutionAuthorityRuntime({env=process.env}={}){
 if(env.MOHEN_D00_AUTHORITY_ENABLED!=='true')return null;
 const databaseUrl=env.MOHEN_D00_AUTHORITY_DATABASE_URL;
 const approvalPath=env.MOHEN_D00_AUTHORITY_APPROVAL_PATH;
 const signingKeyPath=env.MOHEN_D00_AUTHORITY_SIGNING_KEY_PATH;
 const certPath=env.MOHEN_D00_AUTHORITY_TLS_CERT_PATH;
 const tlsKeyPath=env.MOHEN_D00_AUTHORITY_TLS_KEY_PATH;
 const port=Number(env.MOHEN_D00_AUTHORITY_PORT??8444);
 if(!databaseUrl||!approvalPath||!signingKeyPath||!certPath||!tlsKeyPath||
  !env.MOHEN_D00_AUTHORITY_ISSUE_CREDENTIAL||!env.MOHEN_D00_AUTHORITY_VERIFY_CREDENTIAL||
  !Number.isInteger(port)||port<1||port>65535){
  throw Error('D00_EXECUTION_AUTHORITY_RUNTIME_CONFIG_INVALID');
 }
 independentGatePoolOptions(databaseUrl);
 const [approvalJson,signingKey,tlsCert,tlsKey,ca]=await Promise.all([
  readFile(approvalPath,'utf8'),readFile(signingKeyPath),readFile(certPath),readFile(tlsKeyPath),
  env.MOHEN_D00_AUTHORITY_DATABASE_CA_PATH?readFile(env.MOHEN_D00_AUTHORITY_DATABASE_CA_PATH,'utf8'):undefined,
 ]);
 const {Pool}=require('pg');
 const pool=new Pool(independentGatePoolOptions(databaseUrl,{ca}));
 pool.on('error',()=>{});
 let server;
 try{
  const authority=createD00ExecutionAuthorizer({
   registry:loadRegistry(projectRoot),
   approval:JSON.parse(approvalJson),
   privateKey:createPrivateKey(signingKey),
   journal:createD00ExecutionJournal(pool),
  });
  const handle=createD00ExecutionAuthorityHandler({
   authority,issueCredential:env.MOHEN_D00_AUTHORITY_ISSUE_CREDENTIAL,
   verifyCredential:env.MOHEN_D00_AUTHORITY_VERIFY_CREDENTIAL,
  });
  server=createIndependentHttpsServer({handle,tlsCert,tlsKey});
  const listening=once(server,'listening');
  server.listen(port,env.MOHEN_D00_AUTHORITY_HOST??'127.0.0.1');
  await listening;
 }catch(error){
  if(server?.listening)server.close();
  await pool.end();
  throw error;
 }
 let closing;
 const close=()=>closing??=(async()=>{
  await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
  await pool.end();
 })();
 return {server,close};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const runtime=await startD00ExecutionAuthorityRuntime();
  if(runtime){
   console.log('D00 execution authority HTTPS service listening');
   for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void runtime.close();});
  }
 }catch{
  console.error('D00 execution authority HTTPS service startup failed');
  process.exitCode=1;
 }
}
