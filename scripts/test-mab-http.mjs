// Full HTTP/browser checks, with synthetic data only. Never accepts a remote DB.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const psql=process.env.MOHEN_TEST_PSQL,socket=process.env.MOHEN_TEST_SOCKET,dbPort=process.env.MOHEN_TEST_PORT??'55432';
if(!psql||!socket?.startsWith('/workspace/')||!fs.statSync(socket).isDirectory())throw Error('ISOLATED_TEST_SOCKET_REQUIRED');
const base=['-X','-q','-h',socket,'-p',dbPort,'-U','k3_admin','-At','-v','ON_ERROR_STOP=1'];
const query=(db,text)=>execFileSync(psql,[...base,'-d',db],{input:text,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
if(query('postgres',"select current_setting('mohen.test_instance',true)")!=='codex-k3-isolated')throw Error('UNMARKED_DATABASE_INSTANCE');
const database=`mohen_k3_http_${randomUUID().replaceAll('-','')}_test`;
const output=path.join(root,'test-results/mab-http-run');fs.mkdirSync(output,{recursive:true});
const logFile=fs.openSync(path.join(output,'next.log'),'w');
let server,storageConfig;
const childExit=child=>new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>resolve(code));});
const command=async(args,env,cwd=root)=>{const child=spawn(process.execPath,args,{cwd,env,stdio:'inherit'});const code=await childExit(child);if(code!==0)throw Error('HTTP_TEST_COMMAND_FAILED:'+code);};
try {
  query('postgres',`create database ${database}`);
  const migrations=path.join(root,'supabase/migrations');
  const names=['202610070100_data_production_v2_baseline.sql',...fs.readdirSync(migrations).filter(n=>n>='202610160300'&&n<='202610292100_imported_materials.sql'&&!n.startsWith('202610160400')),
    '202610310900_k3_security_boundary.sql',fs.readdirSync(migrations).find(n=>n.endsWith('_mab_studio_assets.sql'))];
  for(const name of names)execFileSync(psql,[...base,'-d',database,'-f',path.join(migrations,name)],{stdio:['ignore','pipe','pipe']});
  if(process.env.MOHEN_TEST_STORAGE_CONFIG){
    storageConfig=JSON.parse(fs.readFileSync(process.env.MOHEN_TEST_STORAGE_CONFIG,'utf8'));
    const httpsOrigin=new URL(storageConfig.httpsOrigin),httpOrigin=new URL(storageConfig.origin);
    if(httpsOrigin.hostname!=='127.0.0.1'||httpsOrigin.protocol!=='https:'||httpOrigin.hostname!=='127.0.0.1'||httpOrigin.protocol!=='http:'||storageConfig.database!=='mohen_storage_official_test'||!storageConfig.caCert?.startsWith('/workspace/work/'))throw Error('OFFICIAL_LOCAL_SYNTHETIC_STORAGE_REQUIRED');
    query(database,"do $$begin if not exists(select from pg_roles where rolname='service_role')then create role service_role nologin;end if;end$$");
    execFileSync(psql,[...base,'-d',database,'-f',path.join(migrations,'20261102140000_mab_m2_private_originals.sql')],{stdio:['ignore','pipe','pipe']});
  }
  query(database,"insert into control.session_verification_keys(verification_key) values('synthetic-mab-http-database-key-at-least-32')");
  const url=new URL(`postgresql://k3_admin:synthetic@localhost:${dbPort}/${database}`);url.searchParams.set('host',socket);
  const env={...process.env,DATABASE_URL:url.toString(),MOHEN_DB_DRIVER:'pg',AUTH_SECRET:'synthetic-mab-http-browser-key-at-least-32',
    MOHEN_DATABASE_SESSION_SECRET:'synthetic-mab-http-database-key-at-least-32',MOHEN_REGISTRATION_MODE:'open',OWNER_EMAIL:'',OWNER_SETUP_TOKEN:'',MOHEN_TEST_DATABASE:database,
    DEEPSEEK_API_KEY:'',SHANGHAI_LIBRARY_KEY:'',NEXT_TELEMETRY_DISABLED:'1',MOHEN_E2E_ISOLATED:'1',
    MOHEN_PRIVATE_ORIGINAL_UPLOAD_ENABLED:storageConfig?'true':'false',MOHEN_PRIVATE_STORAGE_SERVICE_KEY:storageConfig?.serviceKey??'',
    SUPABASE_URL:storageConfig?.httpsOrigin??'',NODE_EXTRA_CA_CERTS:storageConfig?.caCert??process.env.NODE_EXTRA_CA_CERTS};
  console.log('MAB_HTTP_BUILD_SYNTHETIC');
  await command([path.join(root,'apps/web/node_modules/next/dist/bin/next'),'build'],env,path.join(root,'apps/web'));
  const port=await new Promise((resolve,reject)=>{const probe=net.createServer();probe.on('error',reject);probe.listen(0,'127.0.0.1',()=>{const p=probe.address().port;probe.close(()=>resolve(p));});});
  env.MOHEN_E2E_BASE_URL=`http://127.0.0.1:${port}`;
  server=spawn(process.execPath,[path.join(root,'apps/web/node_modules/next/dist/bin/next'),'start','-H','127.0.0.1','-p',String(port)],{
    cwd:path.join(root,'apps/web'),env,detached:process.platform!=='win32',stdio:['ignore',logFile,logFile]});
  let ready=false;
  for(let n=0;n<120;n++){
    if(server.exitCode!==null)throw Error('LOCAL_SERVER_EXITED');
    try{const r=await fetch(env.MOHEN_E2E_BASE_URL+'/api/auth/me');if(r.status===200){ready=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,250));
  }
  if(!ready)throw Error('LOCAL_SERVER_NOT_READY');
  console.log('MAB_HTTP_BROWSER_SYNTHETIC');
  await command([path.join(root,'node_modules/@playwright/test/cli.js'),'test','--config','playwright.mab.config.ts'],env);
  console.log('MAB_HTTP_BROWSER_PASS no-production-data no-paid-provider-calls');
}finally{
  if(server){try{if(process.platform==='win32')server.kill();else process.kill(-server.pid,'SIGTERM');}catch{} }
  fs.closeSync(logFile);
  if(query('postgres',"select current_setting('mohen.test_instance',true)")!=='codex-k3-isolated')throw Error('CLEANUP_REFUSED_UNMARKED_INSTANCE');
  if(storageConfig&&query(database,"select to_regclass('studio.private_originals') is not null")==='t'){
    const keys=JSON.parse(query(database,"select coalesce(json_agg(storage_key),'[]') from studio.private_originals"));
    for(const key of keys){
      if(!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.bin$/.test(key))throw Error('SYNTHETIC_OBJECT_CLEANUP_KEY_INVALID');
      const response=await fetch(storageConfig.origin+'/object/mohen-private-originals/'+key,{method:'DELETE',headers:{Authorization:'Bearer '+storageConfig.serviceKey,apikey:storageConfig.serviceKey}});
      if(!response.ok&&response.status!==404)throw Error('SYNTHETIC_OBJECT_CLEANUP_FAILED');
    }
  }
  query('postgres',`drop database if exists ${database} with (force)`);
  console.log('MAB_HTTP_SYNTHETIC_DATABASE_CLEANED');
}
