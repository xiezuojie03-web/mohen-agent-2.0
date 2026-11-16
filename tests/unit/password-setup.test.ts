import {createHash} from 'node:crypto';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
const db=vi.hoisted(()=>({queryRows:vi.fn(),run:vi.fn()}));
vi.mock('../../packages/data-access/src/index.mjs',()=>db);
import * as auth from '../../apps/web/lib/auth';
const token='b'.repeat(64),email='owner@test.invalid',id='11111111-1111-4111-8111-111111111111';
const input={email,token,password:'owner-chosen-password'};
const marker=(expires=Date.now()+60000)=>`setup-v1$${expires}$${createHash('sha256').update('mohen-password-setup-v1\n'+token).digest('hex')}`;
let stored:string;
beforeEach(()=>{
  vi.stubEnv('MOHEN_REVOCABLE_SESSIONS_ENABLED','true');stored=marker();db.queryRows.mockReset();
  db.queryRows.mockImplementation(async(sql:string,params:Record<string,string>)=>{
    if(sql.startsWith('update')){
      if(params.expected!==stored)return [];
      stored=params.hash;return [{user_id:id}];
    }
    return [{user_id:id,email,username:'Owner',roles:'member,creator,operator',status:'active',password_hash:stored}];
  });
});
afterEach(()=>vi.unstubAllEnvs());
const complete=async(v=input)=>{
  const fn=(auth as unknown as {completePasswordSetup?: (v:typeof input)=>Promise<boolean>}).completePasswordSetup;
  return fn?fn(v):false;
};
it('an issued one-time setup changes only the existing password to a scrypt hash',async()=>{
  expect(await complete()).toBe(true);expect(auth.verifyPassword(input.password,stored)).toBe(true);
  const update=db.queryRows.mock.calls.find(c=>String(c[0]).startsWith('update'))!;
  expect(update[0]).toContain('password_hash=');expect(update[0]).toContain("status='active'");
  expect(update[0]).toContain('password_hash=:');expect(update[0]).not.toContain('roles=');
  expect(JSON.stringify(update[1])).not.toContain(input.password);expect(JSON.stringify(update[1])).not.toContain(token);
});
it('the setup capability is consumed once even with the same email and password',async()=>{
  expect(await complete()).toBe(true);expect(await complete()).toBe(false);
});
it.each(['wrong token','expired','disabled','no revocation'])('refuses %s without writing credentials',async reason=>{
  let v=input;
  if(reason==='wrong token')v={...input,token:'c'.repeat(64)};
  if(reason==='expired')stored=marker(Date.now()-1000);
  if(reason==='disabled')db.queryRows.mockResolvedValue([{user_id:id,email,status:'disabled',password_hash:stored}]);
  if(reason==='no revocation')vi.stubEnv('MOHEN_REVOCABLE_SESSIONS_ENABLED','false');
  expect(await complete(v)).toBe(false);
  expect(db.queryRows.mock.calls.some(c=>String(c[0]).startsWith('update'))).toBe(false);
});
it('a concurrent setup consumption cannot overwrite a newer password',async()=>{
  const before=stored;db.queryRows.mockImplementation(async(sql:string)=>{
    if(sql.startsWith('update'))return [];
    return [{user_id:id,email,status:'active',password_hash:before}];
  });
  expect(await complete()).toBe(false);
});
it.each(['short','x'.repeat(1025)])('rejects out-of-bounds passwords before querying accounts',async password=>{
  expect(await complete({...input,password})).toBe(false);expect(db.queryRows).not.toHaveBeenCalled();
});
