// Real PG regression: missing transaction-local identity must never expose another owner.
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import * as access from '../../packages/data-access/src/index.mjs';
assert.equal(typeof access.createImportedMaterialRepository,'function','Imported material operations need a session-scoped RLS repository');
const {MOHEN_TEST_PSQL:psql,MOHEN_TEST_SOCKET:socket,MOHEN_TEST_DATABASE:database}=process.env;
if (!psql || !socket?.startsWith('/workspace/') || !/^mohen_k3_[a-z0-9_]*test$/.test(database??'')) throw new Error('ISOLATED_TEST_DATABASE_REQUIRED');
const args=['-X','-q','-h',socket,'-p',process.env.MOHEN_TEST_PORT??'55432','-U','k3_admin','-d',database,'-At','-v','ON_ERROR_STOP=1'];
const sql=text=>execFileSync(psql,args,{input:text,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
assert.equal(sql("select current_setting('mohen.test_instance',true)"),'codex-k3-isolated');
const a='b1111111-1111-4111-8111-111111111111',b='b2222222-2222-4222-8222-222222222222';
const key='synthetic-materials-repository-session-key-32-plus';
function token(uid,expiry=Date.now()+60000){const body=Buffer.from(JSON.stringify({uid,r:['creator'],exp:expiry})).toString('base64url');return body+'.'+createHmac('sha256',key).update(body).digest('base64url');}
sql(`insert into public.users(user_id,email,username,password_hash) values('${a}','material-a@example.invalid','A','synthetic'),('${b}','material-b@example.invalid','B','synthetic');
insert into control.session_verification_keys(verification_key) values('${key}') on conflict(key_slot) do update set verification_key=excluded.verification_key;`);
const require=createRequire(new URL('../../packages/data-access/package.json',import.meta.url));
const {Pool}=require('pg');
const pool=new Pool({host:socket,port:Number(process.env.MOHEN_TEST_PORT??55432),user:'k3_admin',database,max:1});
const repository=access.createImportedMaterialRepository(pool);
const draft={title:'A private',text:'A private source with more than twenty characters.',sourceUrl:null,license:null,rightsDeclared:true};
try {
 const created=await repository.create(draft,token(a));
 assert.match(created.material_id,/^[a-f0-9-]{36}$/);
 assert.equal(created.owner_user_id,a);
 assert.equal((await repository.list(token(a))).some(row=>row.material_id===created.material_id),true);
 assert.equal((await repository.list(token(b))).some(row=>row.material_id===created.material_id),false);
 const detail=await repository.get(created.material_id,token(a));
 assert.equal(detail.material_id,created.material_id);
 assert.equal(detail.text,draft.text,'RLS owner reads actual original text not a synthetic cursor');
 assert.equal(await repository.get(created.material_id,token(b)),null,'cross-owner detail is invisible');
 assert.equal(await repository.get('00000000-0000-0000-0000-000000000099',token(a)),null);
 await assert.rejects(()=>repository.get('../not-an-id',token(a)),/MATERIAL_ID_INVALID/);
 const other=await repository.create({...draft,title:'B private',owner_user_id:a},token(b));
 assert.equal(other.owner_user_id,b,'owner is derived from verified DB session, not caller input');
 const [ra,rb]=await Promise.all([repository.list(token(a)),repository.list(token(b))]);
 assert.equal(ra.some(row=>row.material_id===other.material_id),false);
 assert.equal(rb.some(row=>row.material_id===created.material_id),false);
 for(const bad of ['',"unsigned.claim",token(a,1),token('b3333333-3333-4333-8333-333333333333')]) {
  await assert.rejects(()=>repository.list(bad),/MATERIAL_IDENTITY_REQUIRED/);
  await assert.rejects(()=>repository.get(created.material_id,bad),/MATERIAL_IDENTITY_REQUIRED/);
 }
 await assert.rejects(()=>repository.create({...draft,rightsDeclared:false},token(a)),/RIGHTS_DECLARATION_REQUIRED/);
 const before=sql('select count(*) from public.imported_materials');
 sql(`update public.users set status='disabled' where user_id='${a}'`);
 await assert.rejects(()=>repository.create(draft,token(a)),/MATERIAL_IDENTITY_REQUIRED/);
 await assert.rejects(()=>repository.get(created.material_id,token(a)),/MATERIAL_IDENTITY_REQUIRED/);
 assert.equal(sql('select count(*) from public.imported_materials'),before,'denied requests do not write');
 sql(`update public.users set status='active' where user_id='${a}'`);
 // Deliberate SQL failure proves ROLLBACK and clean pool reuse, not just happy-path cleanup.
 await assert.rejects(()=>repository.create({...draft,title:null},token(a)),/null value/);
 const state=(await pool.query("select current_user as role,coalesce(current_setting('mohen.session_token',true),'') as token")).rows[0];
 assert.equal(state.role,'k3_admin');assert.equal(state.token,'');
 assert.equal((await repository.list(token(a))).length,1);
 console.log('MAB_IMPORTED_MATERIAL_REPOSITORY_PASS real-session owner cross-user forged expired disabled rollback pooled-identity');
}finally{await pool.end();}
