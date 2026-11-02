// Optional real Supabase Storage fixture. No Docker socket or production secrets.
// Prepare upstream v1.43.0 with npm ci, its shipped patch-package patch, native
// fs-xattr rebuild, build.js and resolve-tspaths, then pass its source directory.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import {execFileSync,spawn} from 'node:child_process';
import {createHash,createHmac,randomBytes} from 'node:crypto';
const {MOHEN_TEST_PSQL:psql,MOHEN_TEST_SOCKET:socket,MOHEN_TEST_STORAGE_SOURCE:source}=process.env;
if(!psql||!socket?.startsWith('/workspace/')||!source?.startsWith('/workspace/work/'))throw Error('LOCAL_ISOLATED_FIXTURE_PATHS_REQUIRED');
const base=['-X','-q','-h',socket,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-At','-v','ON_ERROR_STOP=1'];
const query=(db,s)=>execFileSync(psql,[...base,'-d',db],{input:s,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
if(query('postgres',"select current_setting('mohen.test_instance',true)")!=='codex-k3-isolated')throw Error('UNMARKED_DATABASE_INSTANCE');
const lock=fs.readFileSync(path.join(source,'package-lock.json'));
if(createHash('sha256').update(lock).digest('hex')!=='4d294cbe67544b8e7c4568ff692e8df67566bf7694a71692f6b99fac3efc4535'||fs.existsSync(path.join(source,'.env')))throw Error('PINNED_UPSTREAM_V143_SOURCE_WITHOUT_ENV_REQUIRED');
if(!fs.existsSync(path.join(source,'dist/start/server.js')))throw Error('BUILD_UPSTREAM_STORAGE_FIRST');
const database='mohen_storage_official_test',admin='mab_storage_test_admin';
if(query('postgres',`select count(*) from pg_database where datname='${database}'`)!=='0')throw Error('ISOLATED_STORAGE_DATABASE_EXISTS_DO_NOT_OVERWRITE');
query('postgres',`do $$begin if not exists(select from pg_roles where rolname='${admin}')then create role ${admin} login superuser;end if;end$$`);
query('postgres',`create database ${database} owner ${admin}`);
const directory=fs.mkdtempSync('/workspace/work/mab-storage-fixture-');
const port=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>resolve(n));});});
let server,proxy,finished=false;
async function close(){
 if(finished)return;finished=true;
 if(proxy)proxy.closeAllConnections();if(proxy)await new Promise(r=>proxy.close(r));
 if(server&&server.exitCode===null){server.kill();await Promise.race([new Promise(r=>server.once('exit',r)),new Promise(r=>setTimeout(r,5000))]);if(server.exitCode===null)server.kill('SIGKILL');}
 if(query('postgres',"select current_setting('mohen.test_instance',true)")!=='codex-k3-isolated')throw Error('CLEANUP_REFUSED_UNMARKED_INSTANCE');
 query('postgres',`drop database ${database} with (force)`);
 console.log('OFFICIAL_STORAGE_FIXTURE_CLEANED synthetic database only');
}
try{
 // Use upstream's auth schema/functions without its unrelated global Auth
 // administrator creation (it is unconditional and collides on a second run).
 const authFixture=fs.readFileSync(path.join(source,'src/test/db/01-auth-schema.sql'),'utf8');
 if(!authFixture.includes('-- Supabase super admin'))throw Error('UPSTREAM_AUTH_FIXTURE_CHANGED');
 query(database,authFixture.split('-- Supabase super admin')[0]);
 const httpPort=await port(),httpsPort=await port(),secret=randomBytes(32).toString('hex');
 const token=role=>{const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),p=Buffer.from(JSON.stringify({role,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');return h+'.'+p+'.'+createHmac('sha256',secret).update(h+'.'+p).digest('base64url');};
 const url=new URL(`postgresql://${admin}:synthetic@localhost:${process.env.MOHEN_TEST_PORT??55432}/${database}`);url.searchParams.set('host',socket);
 const serviceKey=token('service_role'),anonKey=token('anon');
 const env={PATH:process.env.PATH,DATABASE_URL:url.toString(),AUTH_JWT_SECRET:secret,STORAGE_BACKEND:'file',STORAGE_FILE_BACKEND_PATH:path.join(directory,'bytes'),SERVER_HOST:'127.0.0.1',SERVER_PORT:String(httpPort),DB_INSTALL_ROLES:'true',DB_SUPER_USER:admin,PG_QUEUE_ENABLE:'false',IMAGE_TRANSFORMATION_ENABLED:'false',OTEL_METRICS_ENABLED:'false',LOG_LEVEL:'error',REGION:'isolated',FILE_SIZE_LIMIT:'10485760',SERVICE_KEY:serviceKey,ANON_KEY:anonKey,TENANT_ID:'mab-isolated'};
 const log=fs.openSync(path.join(directory,'storage.log'),'w');
 server=spawn(process.execPath,['dist/start/server.js'],{cwd:source,env,stdio:['ignore',log,log]});fs.closeSync(log);
 const origin=`http://127.0.0.1:${httpPort}`;
 let ready=false;for(let i=0;i<120;i++){
  if(server.exitCode!==null)throw Error('OFFICIAL_STORAGE_SERVER_EXITED_CHECK_LOCAL_LOG');
  try{if((await fetch(origin+'/status')).status===200){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 if(!ready)throw Error('OFFICIAL_STORAGE_START_TIMEOUT');
 const bucket=await fetch(origin+'/bucket',{method:'POST',headers:{Authorization:'Bearer '+serviceKey,apikey:serviceKey,'Content-Type':'application/json'},body:JSON.stringify({id:'mohen-private-originals',name:'mohen-private-originals',public:false})});
 if(!bucket.ok)throw Error('ISOLATED_PRIVATE_BUCKET_CREATE_FAILED');
 const keyPath=path.join(directory,'key.pem'),caCert=path.join(directory,'cert.pem');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=MoHen isolated Storage','-addext','subjectAltName=IP:127.0.0.1','-keyout',keyPath,'-out',caCert],{stdio:['ignore','pipe','pipe']});
 proxy=https.createServer({key:fs.readFileSync(keyPath),cert:fs.readFileSync(caCert)},(req,res)=>{
  if(!req.url.startsWith('/storage/v1/')){res.writeHead(404);res.end();return;}
  const upstream=http.request(origin+req.url.replace(/^\/storage\/v1/,''),{method:req.method,headers:{...req.headers,host:`127.0.0.1:${httpPort}`}},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
  upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
 });
 await new Promise(r=>proxy.listen(httpsPort,'127.0.0.1',r));
 const configPath=path.join(directory,'config.json');
 fs.writeFileSync(configPath,JSON.stringify({serviceKey,anonKey,database,origin,httpsOrigin:`https://127.0.0.1:${httpsPort}`,caCert,sourceTag:'v1.43.0',sourceCommit:'53462ff',fixture_id:path.basename(directory)}),{mode:0o600});
 console.log('MOHEN_TEST_STORAGE_CONFIG='+configPath);
 console.log('OFFICIAL_STORAGE_READY pinned v1.43.0 localhost only; stop this process to remove its synthetic DB');
 await new Promise((resolve,reject)=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve);server.once('exit',code=>reject(Error('OFFICIAL_STORAGE_EXIT:'+code)));});
}finally{await close();}
