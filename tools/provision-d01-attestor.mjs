// Provision the independent, least-privilege D01 attestor read identity and the
// additive D01 resume grant journal. Idempotent on re-run. Secrets are written
// to .secrets/ with 0600 and never printed. Requires admin URL + CA.
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
const ROOT=process.cwd();
const require=createRequire(path.join(ROOT,'packages','data-access','package.json'));
const pg=require('pg');
const LOGIN='mohen_d01_attestor_login';
const GROUP='mohen_gate_signer_m5_machine';
const adminUrl=fs.readFileSync('.secrets/supabase-db-url.txt','utf8').trim();
const ca=fs.readFileSync('.secrets/supabase-ca/prod-ca-2021.crt','utf8');
const admin=new pg.Client({connectionString:adminUrl,ssl:{ca,rejectUnauthorized:true},connectionTimeoutMillis:30000});

const password=()=>{
 const b=randomBytes(32).toString('base64url');
 // Supabase pooler passwords are placed in a URL userinfo; keep it URL-safe.
 return 'D01a_'+b.replace(/[+/=]/g,'');
};

try{
 await admin.connect();
 const journalExists=(await admin.query("select to_regclass('control.d01_resume_grant_journal') as t")).rows[0].t;
 if(!journalExists){
  const sql=fs.readFileSync(path.join(ROOT,'supabase/migrations/20261120150000_d01_resume_grant_journal.sql'),'utf8');
  await admin.query(sql);
  console.log('JOURNAL_MIGRATION=APPLIED');
 }else console.log('JOURNAL_MIGRATION=ALREADY_PRESENT');

 const roleExists=(await admin.query('select 1 from pg_roles where rolname=$1',[LOGIN])).rows.length===1;
 const loginPw=password();
 if(roleExists)await admin.query(`alter role ${LOGIN} with password '${loginPw}'`);
 else{
  await admin.query(`create role ${LOGIN} login nosuperuser nocreatedb nocreaterole noreplication nobypassrls inherit password '${loginPw}'`);
  await admin.query(`grant ${GROUP} to ${LOGIN}`);
  console.log('ATTESTOR_ROLE=CREATED');
 }
 if(roleExists)console.log('ATTESTOR_ROLE=PASSWORD_ROTATED');

 const u=new URL(adminUrl);
 const projectRef=u.username.split('.').slice(1).join('.')||u.username;
 u.username=`${LOGIN}.${projectRef}`;
 u.password=loginPw;
 u.search='';
 const derived=u.toString();
 fs.writeFileSync('.secrets/d01-attestor-password.txt',loginPw,{mode:0o600});
 fs.writeFileSync('.secrets/d01-attestor-database-url.txt',derived,{mode:0o600});
 console.log('SECRETS_WRITTEN=true user='+LOGIN+' project='+projectRef);
}finally{await admin.end();}
