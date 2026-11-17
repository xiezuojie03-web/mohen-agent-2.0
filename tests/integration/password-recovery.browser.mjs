// Real HTTPS browser -> Next API -> disposable PostgreSQL -> synthetic mail -> reset -> login.
// Never send external email or use a cloud database. Mail transport alone is intercepted.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {randomUUID,scryptSync,randomBytes} from 'node:crypto';
import pg from '../../packages/data-access/node_modules/pg/lib/index.js';
import selfsigned from 'selfsigned';
import {chromium} from '@playwright/test';

const input=process.env.MOHEN_PASSWORD_RECOVERY_TEST_URL;
if(process.env.MOHEN_PASSWORD_RECOVERY_TEST!=='isolated-pg17'||!input)throw Error('ISOLATED_RECOVERY_TEST_REQUIRED');
const url=new URL(input);
if(!['127.0.0.1','localhost'].includes(url.hostname))throw Error('LOOPBACK_ONLY');
const admin=new pg.Pool({connectionString:input});
admin.on('error',error=>console.error('BROWSER_ADMIN_POOL_ERROR',error.message));
assert.equal((await admin.query("select current_setting('mohen.test_instance',true) as marker")).rows[0].marker,'codex-k3-isolated');
const database='mohen_recovery_browser_'+randomUUID().replaceAll('-','')+'_test';
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'mohen-recovery-browser-'));
let pool,child,proxy,browser;
try {
  await admin.query(`create database ${database}`);url.pathname='/'+database;
  pool=new pg.Pool({connectionString:url.toString()});
  pool.on('error',error=>console.error('BROWSER_FIXTURE_POOL_ERROR',error.message));
  await pool.query(`create schema control;create function control.current_app_user_id() returns uuid language sql as 'select null::uuid'`);
  // Roles are NOLOGIN fixtures already created by the companion marked PG integration run.
  for(const file of ['202610291300_users_auth.sql','20261103095024_mab_web_session_revocation.sql','20261117080000_mab_web_password_recovery.sql'])
    await pool.query(fs.readFileSync('supabase/migrations/'+file,'utf8'));
  const salt=randomBytes(16).toString('hex'),email='browser-owner@example.invalid',password='synthetic-previous-password';
  await pool.query('insert into public.users(email,username,password_hash) values($1,$2,$3)',[email,'Browser',salt+':'+scryptSync(password,salt,64).toString('hex')]);
  const mailFile=path.join(scratch,'synthetic-mail.json'),preload=path.join(scratch,'synthetic-mail.mjs');
  fs.writeFileSync(preload,`import fs from 'node:fs';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
    const require=createRequire(${JSON.stringify(path.resolve('apps/web/package.json'))});
    const syntheticTransport=()=>({sendMail:async message=>{
      fs.writeFileSync(${JSON.stringify(mailFile)},JSON.stringify(message),{mode:0o600});
      return {accepted:message.to};
    },close(){}});
    require('nodemailer').createTransport=syntheticTransport;
    const esm=await import(pathToFileURL(require.resolve('nodemailer').replace('/dist/cjs/','/dist/esm/')).href);
    esm.default.createTransport=syntheticTransport;`);
  const pem=await selfsigned.generate([{name:'commonName',value:'127.0.0.1'}],{days:1,keySize:2048,extensions:[{name:'subjectAltName',altNames:[{type:7,ip:'127.0.0.1'}]}]});
  let nextPort;
  proxy=https.createServer({key:pem.private,cert:pem.cert},(req,res)=>{
    const upstream=http.request({host:'127.0.0.1',port:nextPort,path:req.url,method:req.method,
      headers:{...req.headers,'x-forwarded-proto':'https'}},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});
    upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
  });
  await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
  const origin=`https://127.0.0.1:${proxy.address().port}`;
  const probe=http.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));
  nextPort=probe.address().port;await new Promise(resolve=>probe.close(resolve));
  const output=fs.openSync(path.join(scratch,'next.log'),'w');
  child=spawn(process.execPath,['--import',preload,'node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(nextPort)],{
    cwd:path.resolve('apps/web'),stdio:['ignore',output,output],env:{...process.env,
      DATABASE_URL:url.toString(),MOHEN_DB_DRIVER:'pg',MOHEN_DATABASE_PASSWORD:url.password,
      AUTH_SECRET:'synthetic-browser-recovery-secret-at-least-32',MOHEN_REVOCABLE_SESSIONS_ENABLED:'true',
      MOHEN_PASSWORD_RESET_ENABLED:'true',MOHEN_AUTH_PUBLIC_ORIGIN:origin,MOHEN_QQ_SMTP_AUTH_CODE:'synthetic-no-real-provider',
      MOHEN_AUTH_MAIL_FROM:'123456@qq.com',DEEPSEEK_API_KEY:'',SHANGHAI_LIBRARY_KEY:'',NEXT_TELEMETRY_DISABLED:'1'}});
  fs.closeSync(output);
  for(let n=0;n<100;n++){
    try{if((await fetch(`http://127.0.0.1:${nextPort}/login`)).ok)break;}catch{}
    if(child.exitCode!==null)throw Error('NEXT_EXITED');await new Promise(resolve=>setTimeout(resolve,100));
  }
  browser=await chromium.launch({executablePath:process.env.MOHEN_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  console.log('RECOVERY_BROWSER_STARTED');
  const context=await browser.newContext({ignoreHTTPSErrors:true});const page=await context.newPage();
  await page.goto(origin+'/login');await page.getByLabel('邮箱',{exact:true}).fill(email);await page.getByLabel('密码',{exact:true}).fill(password);
  const login=page.waitForResponse(r=>r.url().endsWith('/api/auth/login'));await page.getByRole('button',{name:'登录',exact:true}).click();assert.equal((await login).status(),200);
  const oldCookie=(await context.cookies()).find(c=>c.name==='mohen_role');assert.ok(oldCookie);
  await page.goto(origin+'/login');await page.getByRole('link',{name:'忘记密码？'}).click();
  await page.getByLabel('注册邮箱').fill(email);
  const request=page.waitForResponse(r=>r.url().endsWith('/api/auth/forgot-password'));
  await page.getByRole('button',{name:'申请重置密码'}).click();assert.equal((await request).status(),202);
  await page.getByRole('status').waitFor();
  for(let n=0;n<100&&!fs.existsSync(mailFile);n++)await new Promise(resolve=>setTimeout(resolve,50));
  assert.ok(fs.existsSync(mailFile),'managed post-response email executed');
  const mail=JSON.parse(fs.readFileSync(mailFile,'utf8'));assert.deepEqual(mail.to,[email]);
  const link=mail.text.match(/https:\/\/[^\s]+/)[0];
  assert.equal((await pool.query('select password_hash from public.users')).rows[0].password_hash,salt+':'+scryptSync(password,salt,64).toString('hex'));
  const nextPassword='synthetic-owner-chosen-password';await page.goto(link);
  await page.getByLabel('新密码（至少8位）',{exact:true}).fill(nextPassword);
  await page.getByLabel('再次输入新密码').fill('synthetic-mismatch');
  await page.getByRole('button',{name:'保存新密码'}).click();await page.getByRole('alert').filter({hasText:'两次输入'}).waitFor();
  assert.equal(new URL(page.url()).hash,'');
  assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  await page.getByLabel('再次输入新密码').fill(nextPassword);
  const reset=page.waitForResponse(r=>r.url().endsWith('/api/auth/reset-password'));
  await page.getByRole('button',{name:'保存新密码'}).click();assert.equal((await reset).status(),200);
  await page.getByRole('status').filter({hasText:'密码已重置'}).waitFor();
  const oldSession=await context.request.get(origin+'/api/auth/me');assert.equal((await oldSession.json()).authenticated,false);
  const fragment=new URLSearchParams(new URL(link).hash.slice(1));
  const replay=await context.request.post(origin+'/api/auth/reset-password',{headers:{origin},data:{email,token:fragment.get('token'),password:nextPassword}});assert.equal(replay.status(),400);
  await page.getByRole('link',{name:'前往登录'}).click();await page.getByLabel('邮箱',{exact:true}).fill(email);
  await page.getByLabel('密码',{exact:true}).fill(nextPassword);
  const relogin=page.waitForResponse(r=>r.url().endsWith('/api/auth/login'));await page.getByRole('button',{name:'登录',exact:true}).click();assert.equal((await relogin).status(),200);
  assert.equal((await (await context.request.get(origin+'/api/auth/me')).json()).authenticated,true);
  const crossOrigin=await context.request.post(origin+'/api/auth/forgot-password',{headers:{origin:'https://foreign.invalid'},data:{email}});assert.equal(crossOrigin.status(),403);
  console.log('PASSWORD_RECOVERY_BROWSER_PASS HTTPS login-link request actual-PG synthetic-mail fragment-cleared mismatch-blocked single-reset old-cookie-denied new-login cross-origin-denied');
}catch(error){
  console.error('RECOVERY_BROWSER_FAILURE',error.message);
  // Log only the diagnostic server log (all credentials/data in this instance are synthetic).
  const log=path.join(scratch,'next.log');if(fs.existsSync(log))console.error(fs.readFileSync(log,'utf8').slice(-5000));throw error;
}finally {
  await browser?.close();if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));}
  if(proxy)await new Promise(resolve=>proxy.close(resolve));await pool?.end();
  for(let n=0;n<100;n++){
    const {rows}=await admin.query('select count(*)::int as active from pg_stat_activity where datname=$1',[database]);
    if(rows[0].active===0)break;await new Promise(resolve=>setTimeout(resolve,10));
  }
  await admin.query(`drop database if exists ${database}`);await admin.end();fs.rmSync(scratch,{recursive:true,force:true});
}
