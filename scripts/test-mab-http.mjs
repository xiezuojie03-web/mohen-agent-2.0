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
  // A fresh postgres:17 cluster has no Supabase API roles. Prepare the same
  // NOLOGIN test principals as test-k3-db before migrations revoke their grants.
  // This runs only after the local instance marker check, never on production.
  query(database, `do $$ begin
    if not exists(select from pg_roles where rolname='anon') then create role anon nologin; end if;
    if not exists(select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
    if not exists(select from pg_roles where rolname='service_role') then create role service_role nologin; end if;
  end $$`);
  const migrations=path.join(root,'supabase/migrations');
  const studioMigration=fs.readdirSync(migrations).find(n=>n.endsWith('_mab_studio_assets.sql'));
  if(!studioMigration)throw Error('ISOLATED_MIGRATION_NOT_FOUND:_mab_studio_assets.sql');
  // 顺序与 scripts/test-k3-db.mjs 一致。两份隔离执行器曾各持一份手写清单，新迁移只登记进
  // DB 链、没登记进 HTTP 链，隔离库里就缺 studio.resolve_asset_references、来源权利动作列、
  // D00 台账表等对象，产品页面与写接口在 CI 里假红：那是隔离夹具缺口，不是产品缺陷。
  // guard:isolated-db-fixtures 的 D3 现在会强制本清单与 supabase/migrations 目录同步，
  // 新增迁移必须同时登记两处。
  // ST-02 需要的私有原件元数据表（不创建任何 bucket）随 studio 组一起落库。
  const names=['202610070100_data_production_v2_baseline.sql',
    ...fs.readdirSync(migrations).filter(n=>n>='202610160300'&&n<='202610292100_imported_materials.sql'&&!n.startsWith('202610160400')),
    '202610310900_k3_security_boundary.sql','202610310910_k3_gate_candidates.sql','202611010900_k3_independent_gate_authority.sql',
    '20261116080000_m5_k3_gate_function_acl_owner_fix.sql',
    '202611020900_kad1_watch_revision_isolation.sql','202611020910_kad1_consumption_blocks.sql','202611020920_kad1_account_transactions.sql',
    studioMigration,'20261108090000_director_plans_source_ids.sql','20261108100000_mab_m5_director_plan_project_binding.sql',
    '20261102140000_mab_m2_private_originals.sql','20261109130000_mab_cp2f_asset_backlink.sql',
    '20261104013351_mab_m4_execution_controls.sql',
    '20261102145410_mab_m2_evidence_bridge.sql','20261103143451_mab_m2_private_text_reading.sql','20261103234154_mab_m3_gate_service_auth.sql',
    '20261105110000_mab_m5_studio_research_read.sql',
     '20261115130000_mab_m5_private_text_read_context_consistency.sql',
     '20261107120000_mab_m2_private_scanned_page.sql',
    '20261107160000_mab_m2_1_producer_run_progress.sql','20261107200000_mab_m5_d02_d05_private_candidates.sql','20261113170000_mab_m5_d02_text_plain_observation.sql',
    '20261107210000_mab_m3_private_gate_candidate_submission.sql','20261107211000_mab_m3_local_owner_gate_signer.sql',
    '20261107220000_mab_m5_machine_rule_reviewer.sql','20261107230000_mab_m2_private_source_registration_source_revision.sql',
    '20261107240000_mab_m5_claim_revision_artifact_read_policy.sql','20261108110000_mab_m5_source_rights_actions.sql',
    '20261109120000_mab_m5_artifact_content_revision.sql','20261110100000_mab_gate_audits_rls.sql',
    '20261110110000_mab_d00c_source_discovery_ledger.sql','20261110120000_mab_d00c4_remaining_stages.sql',
    '20261110150000_mab_d00c5_method_revalidation.sql','20261110160000_mab_d00_y04_original_provider_trace.sql',
    '20261110130000_mab_original_media_assets.sql','20261110140000_mab_d00_y02_registration_locator.sql',
    '20261113100000_mab_qr05_single_rights_action_dictionary.sql',
    // Public consumers now read one publication pointer for both legacy and Studio works.
    // Without ST-05/07/08/09, p.source_schema and p.studio_revision_id do not exist:
    // a safe empty public catalogue incorrectly returns HTTP 500 instead of 200.
    // Apply the actual dependent Studio business migrations, not synthetic fixture columns.
    '20261114120000_mab_m5_director_plan.sql',
    '20261114150000_mab_m5_st07_work_revision.sql',
    '20261114180000_mab_m5_st08_submission_snapshot.sql',
    '20261114190000_mab_m5_st09_editorial_publish_withdraw.sql',
    '20261114200000_mab_m5_studio_project_title_rename.sql',
    '20261114210000_mab_m5_claim_revision_artifact_revision.sql',
    '20261114220000_mab_m5_restore_registered_content_revision.sql'];
  names.push('20261103095024_mab_web_session_revocation.sql','20261117080000_mab_web_password_recovery.sql');
  for(const name of names)execFileSync(psql,[...base,'-d',database,'-f',path.join(migrations,name)],{stdio:['ignore','pipe','pipe']});
  if(process.env.MOHEN_TEST_STORAGE_CONFIG){
    storageConfig=JSON.parse(fs.readFileSync(process.env.MOHEN_TEST_STORAGE_CONFIG,'utf8'));
    const httpsOrigin=new URL(storageConfig.httpsOrigin),httpOrigin=new URL(storageConfig.origin);
    if(httpsOrigin.hostname!=='127.0.0.1'||httpsOrigin.protocol!=='https:'||httpOrigin.hostname!=='127.0.0.1'||httpOrigin.protocol!=='http:'||storageConfig.database!=='mohen_storage_official_test'||!storageConfig.caCert?.startsWith('/workspace/work/'))throw Error('OFFICIAL_LOCAL_SYNTHETIC_STORAGE_REQUIRED');
    query(database,"do $$begin if not exists(select from pg_roles where rolname='service_role')then create role service_role nologin;end if;end$$");
  }
  query(database,"insert into control.session_verification_keys(verification_key) values('synthetic-mab-http-database-key-at-least-32')");
  const url=new URL(`postgresql://k3_admin:synthetic@localhost:${dbPort}/${database}`);url.searchParams.set('host',socket);
  const env={...process.env,DATABASE_URL:url.toString(),MOHEN_DB_DRIVER:'pg',AUTH_SECRET:'synthetic-mab-http-browser-key-at-least-32',
    MOHEN_DATABASE_SESSION_SECRET:'synthetic-mab-http-database-key-at-least-32',MOHEN_REGISTRATION_MODE:'open',OWNER_EMAIL:'',OWNER_SETUP_TOKEN:'',MOHEN_TEST_DATABASE:database,
    DEEPSEEK_API_KEY:'',SHANGHAI_LIBRARY_KEY:'',SHANGHAI_LIBRARY_API_KEY:'',MOHEN_LLM_API_KEY:'',MOHEN_LLM_BASE_URL:'',NEXT_TELEMETRY_DISABLED:'1',MOHEN_E2E_ISOLATED:'1',
    MOHEN_G5_CONTEXTS:JSON.stringify(Object.fromEntries(['watch','visual_stage','agent','evidence_on_demand'].map(consumer=>[consumer,{purpose:{namespace:'G5',code:'m5-http',version:'1'},scope:consumer==='watch'?{project:'m5-http'}:{project:'m5-http',requested_action:consumer==='agent'?'read':consumer==='evidence_on_demand'?'quote':'display'}}]))),
    MOHEN_PUBLIC_EVIDENCE_QUALIFICATION_CONTEXT:JSON.stringify({consumer:'evidence_on_demand',purpose:{namespace:'G5',code:'m5-http',version:'1'},scope:{project:'m5-http',requested_action:'quote'}}),
    MOHEN_PUBLIC_AGENT_QUALIFICATION_CONTEXT:JSON.stringify({consumer:'agent',purpose:{namespace:'G5',code:'m5-http',version:'1'},scope:{project:'m5-http',requested_action:'read'}}),
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
}catch(error){
  // Synthetic test server only: surface bounded SQL/schema failures in Actions so that a 500
  // can be diagnosed without repeatedly rebuilding the whole isolated browser fixture.
  try {
    const serverLog=fs.readFileSync(path.join(output,'next.log'),'utf8');
    const relevant=serverLog.split(/\r?\n/).filter(line=>/relation .* does not exist|column .* does not exist|function .* does not exist|permission denied|error:|error |Error:|PostgresError|QueryFailed|missing_qualification/i.test(line)).slice(-32);
    console.error('MAB_HTTP_SYNTHETIC_SERVER_DIAGNOSTICS count='+relevant.length);
    for(const line of relevant)console.error('MAB_HTTP_SERVER '+line.slice(0,340));
  }catch{console.error('MAB_HTTP_SYNTHETIC_SERVER_LOG_UNAVAILABLE');}
  throw error;
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
