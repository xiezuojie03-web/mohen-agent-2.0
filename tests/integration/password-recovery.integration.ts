import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import pg from '../../packages/data-access/node_modules/pg/lib/index.js';
// Disposable marked instance ONLY; no .env, cloud URL, or persistent-user fixtures.
const fx=vi.hoisted(()=>({pool:null as any,mail:vi.fn()}));
vi.mock('../../packages/data-access/src/index.mjs',()=>({queryRows:async(sql:string,params:Record<string,unknown>={})=>{
  const values:unknown[]=[];
  const text=sql.replace(/:'([^']+)'/g,(_match:string,name:string)=>{values.push(params[name]??null);return `$${values.length}`;});
  return (await fx.pool.query(text,values)).rows;
}}));
vi.mock('../../apps/web/lib/password-reset-mail',()=>({
  passwordResetMailConfig:()=>({origin:'https://preview.invalid'}),sendPasswordResetMail:fx.mail,
}));
import {requestPasswordReset,completePasswordReset} from '../../apps/web/lib/password-recovery';
import {hashPassword,verifyPassword,signSessionToken,resolveSession} from '../../apps/web/lib/auth';
let bootstrap:any,database:string,userId:string,email:string,oldPassword:string;
const tokenFromMail=()=>new URLSearchParams(new URL(fx.mail.mock.calls.at(-1)![1]).hash.slice(1)).get('token')!;
beforeAll(async()=>{
  const input=process.env.MOHEN_PASSWORD_RECOVERY_TEST_URL;
  if(process.env.MOHEN_PASSWORD_RECOVERY_TEST!=='isolated-pg17'||!input)throw Error('ISOLATED_RECOVERY_TEST_REQUIRED');
  const url=new URL(input);
  if(!['127.0.0.1','localhost'].includes(url.hostname))throw Error('LOOPBACK_ONLY');
  bootstrap=new pg.Pool({connectionString:input});
  expect((await bootstrap.query("select current_setting('mohen.test_instance',true) as marker")).rows[0].marker).toBe('codex-k3-isolated');
  database='mohen_recovery_'+randomUUID().replaceAll('-','')+'_test';
  await bootstrap.query(`create database ${database}`);url.pathname='/'+database;
  fx.pool=new pg.Pool({connectionString:url.toString()});
  await fx.pool.query(`create schema control;do $$begin
    if not exists(select from pg_roles where rolname='mohen_producer') then create role mohen_producer nologin;end if;
    if not exists(select from pg_roles where rolname='mohen_gate_signer') then create role mohen_gate_signer nologin;end if;
    if not exists(select from pg_roles where rolname='mohen_app_runtime') then create role mohen_app_runtime nologin;end if;
    if not exists(select from pg_roles where rolname='anon') then create role anon nologin;end if;
    if not exists(select from pg_roles where rolname='authenticated') then create role authenticated nologin;end if;
    end $$;create function control.current_app_user_id() returns uuid language sql as 'select null::uuid';`);
  for(const name of ['202610291300_users_auth.sql','20261103095024_mab_web_session_revocation.sql',
    '20261117080000_mab_web_password_recovery.sql','20261117080000_mab_web_password_recovery.sql'])
    await fx.pool.query(readFileSync('supabase/migrations/'+name,'utf8'));
  vi.stubEnv('MOHEN_REVOCABLE_SESSIONS_ENABLED','true');vi.stubEnv('AUTH_SECRET','synthetic-test-only-secret-at-least-32-characters');
});
beforeEach(async()=>{
  fx.mail.mockReset().mockResolvedValue(undefined);await fx.pool.query('truncate control.web_password_reset_request_budget;delete from public.users');
  userId=randomUUID();email=userId+'@example.invalid';oldPassword=hashPassword('previous-password');
  await fx.pool.query('insert into public.users(user_id,email,username,password_hash,roles) values($1,$2,$3,$4,$5)',[userId,email,'Synthetic',oldPassword,['member','creator']]);
});
afterAll(async()=>{
  await fx.pool?.end();
  if(database){
    // pg Pool.end can resolve before socket close; never FORCE-kill closing clients.
    for(let n=0;n<100;n++){
      const {rows}=await bootstrap.query('select count(*)::int as active from pg_stat_activity where datname=$1',[database]);
      if(rows[0].active===0)break;await new Promise(resolve=>setTimeout(resolve,10));
    }
    await bootstrap.query(`drop database ${database}`);
  }
  await bootstrap?.end();vi.unstubAllEnvs();
});
it('keeps original password until verified; concurrency consumes exactly once and revokes old sessions',async()=>{
  const cookie=signSessionToken(userId,['member']);expect((await resolveSession(cookie)).state).toBe('authenticated');
  await requestPasswordReset(email);const token=tokenFromMail();
  expect((await fx.pool.query('select password_hash from public.users')).rows[0].password_hash).toBe(oldPassword);
  const stored=(await fx.pool.query('select token_hash from control.web_password_resets')).rows[0].token_hash;
  expect(stored).not.toBe(token);
  const results=await Promise.all(Array.from({length:6},()=>completePasswordReset({email,token,password:'my-new-password'})));
  expect(results.filter(Boolean)).toHaveLength(1);
  const account=(await fx.pool.query('select * from public.users')).rows[0];
  expect(verifyPassword('my-new-password',account.password_hash)).toBe(true);expect(account.roles).toEqual(['member','creator']);
  expect((await resolveSession(cookie)).state).toBe('unauthenticated');
  expect((await resolveSession(signSessionToken(userId,['member']))).state).toBe('authenticated');
});
it('durably enforces cooldown and reissue invalidates the earlier link',async()=>{
  await requestPasswordReset(email);const old=tokenFromMail();await requestPasswordReset(email);expect(fx.mail).toHaveBeenCalledTimes(1);
  await fx.pool.query("update control.web_password_resets set last_requested_at=clock_timestamp()-interval '61 seconds'");
  await requestPasswordReset(email);const token=tokenFromMail();expect(token).not.toBe(old);
  expect(await completePasswordReset({email,token:old,password:'my-new-password'})).toBe(false);
  expect(await completePasswordReset({email,token,password:'my-new-password'})).toBe(true);
});
it('a reissue waiting for concurrent password consumption uses the committed account epoch',async()=>{
  await requestPasswordReset(email);
  await fx.pool.query("update control.web_password_resets set last_requested_at=clock_timestamp()-interval '61 seconds'");
  const consumer=await fx.pool.connect();let pending:Promise<void>|undefined;
  try {
    await consumer.query('begin');
    // Hold exactly the account/reset locks of an in-progress successful consumption.
    await consumer.query('select user_id from public.users where user_id=$1 for update',[userId]);
    await consumer.query('select user_id from control.web_password_resets where user_id=$1 for update',[userId]);
    pending=requestPasswordReset(email);
    let waiting=false;
    for(let n=0;n<100;n++){
      const {rows}=await fx.pool.query("select exists(select from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid() and wait_event_type='Lock' and query like '%insert into control.web_password_resets as r%') as waiting");
      if(rows[0].waiting){waiting=true;break;}await new Promise(resolve=>setTimeout(resolve,10));
    }
    expect(waiting).toBe(true);
    await consumer.query('update public.users set password_hash=$1 where user_id=$2',[hashPassword('concurrently-chosen-password'),userId]);
    await consumer.query('update control.web_password_resets set token_hash=null,expires_at=null where user_id=$1',[userId]);
    await consumer.query('commit');await pending;
    expect(await completePasswordReset({email,token:tokenFromMail(),password:'next-chosen-password'})).toBe(true);
  }finally{await consumer.query('rollback');consumer.release();await pending;}
});
it.each(['expired','disabled','roles changed','password changed'])('rejects %s with no password replacement',async reason=>{
  await requestPasswordReset(email);const token=tokenFromMail();
  if(reason==='expired')await fx.pool.query("update control.web_password_resets set expires_at=clock_timestamp()-interval '1 second'");
  if(reason==='disabled')await fx.pool.query("update public.users set status='disabled'");
  if(reason==='roles changed')await fx.pool.query("update public.users set roles='{member}'");
  if(reason==='password changed')await fx.pool.query('update public.users set password_hash=$1',[hashPassword('another-password')]);
  expect(await completePasswordReset({email,token,password:'my-new-password'})).toBe(false);
});
it('unknown/cross-account token cannot reset or send to another address',async()=>{
  await requestPasswordReset('unknown@example.invalid');expect(fx.mail).not.toHaveBeenCalled();
  await requestPasswordReset(email);expect(await completePasswordReset({email:'unknown@example.invalid',token:tokenFromMail(),password:'my-new-password'})).toBe(false);
});
it('per-account hourly and shared minute limits survive separate requests',async()=>{
  await requestPasswordReset(email);
  for(let n=0;n<7;n++){
    await fx.pool.query("update control.web_password_resets set last_requested_at=clock_timestamp()-interval '61 seconds'");
    await requestPasswordReset(email);
  }
  expect(fx.mail).toHaveBeenCalledTimes(5);
  await fx.pool.query('update control.web_password_reset_request_budget set requests=30');
  await requestPasswordReset(email);expect(fx.mail).toHaveBeenCalledTimes(5);
});
it('reset capability tables have RLS and no grants to public consumers or execution roles',async()=>{
  for(const role of ['anon','authenticated','mohen_app_runtime','mohen_producer','mohen_gate_signer']){
    const {rows}=await fx.pool.query("select has_table_privilege($1,'control.web_password_resets','SELECT,INSERT,UPDATE,DELETE') as access",[role]);
    expect(rows[0].access).toBe(false);
  }
  expect((await fx.pool.query("select bool_and(relrowsecurity) as enabled from pg_class where oid in ('control.web_password_resets'::regclass,'control.web_password_reset_request_budget'::regclass)")).rows[0].enabled).toBe(true);
});
