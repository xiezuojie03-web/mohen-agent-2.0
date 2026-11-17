import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const db=vi.hoisted(()=>({queryRows:vi.fn()}));
const mail=vi.hoisted(()=>({sendPasswordResetMail:vi.fn(),passwordResetMailConfig:vi.fn()}));
vi.mock('../../packages/data-access/src/index.mjs',()=>db);
vi.mock('../../apps/web/lib/password-reset-mail',()=>mail);
const load=async()=>existsSync('apps/web/lib/password-recovery.ts')?import('../../apps/web/lib/password-recovery'):null;
const email='owner@example.invalid',id='11111111-1111-4111-8111-111111111111';
beforeEach(()=>{
  vi.clearAllMocks();vi.stubEnv('MOHEN_REVOCABLE_SESSIONS_ENABLED','true');
  mail.passwordResetMailConfig.mockReturnValue({origin:'https://preview.invalid',from:'sender@example.invalid',key:'test-only'});
  mail.sendPasswordResetMail.mockResolvedValue(undefined);
  db.queryRows.mockImplementation(async(sql:string)=>{
    if(sql.includes('reset_request_budget'))return [{allowed:true}];
    if(sql.includes('insert into control.web_password_resets'))return [{user_id:id,email}];
    if(sql.includes('select user_id::text from consumed'))return [{user_id:id}];
    return [];
  });
});
afterEach(()=>vi.unstubAllEnvs());
it('requests an emailed reset without changing the password or emitting a capability',async()=>{
  const api=await load();expect(api).not.toBeNull();
  expect(await api!.requestPasswordReset(email)).toBeUndefined();
  const sent=mail.sendPasswordResetMail.mock.calls[0];expect(sent[0]).toBe(email);
  const link=new URL(sent[1]);expect(link.origin).toBe('https://preview.invalid');
  expect(link.pathname).toBe('/account/reset-password');expect(link.search).toBe('');
  const params=new URLSearchParams(link.hash.slice(1)),token=params.get('token')!;
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  const persisted=JSON.stringify(db.queryRows.mock.calls);
  expect(persisted).not.toContain(token);expect(persisted).not.toContain('update public.users');
  expect(persisted).toContain(createHash('sha256').update('mohen-password-reset-v1\n'+token).digest('hex'));
});
it.each(['unknown','throttled'])('does not send for %s and returns the same response',async()=>{
  const api=await load();expect(api).not.toBeNull();
  db.queryRows.mockResolvedValue([]);
  expect(await api!.requestPasswordReset(email)).toBeUndefined();expect(mail.sendPasswordResetMail).not.toHaveBeenCalled();
});
it('a provider failure invalidates only its own capability without leaking account existence',async()=>{
  const api=await load();expect(api).not.toBeNull();
  mail.sendPasswordResetMail.mockRejectedValue(Error('private provider response'));
  const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});
  expect(await api!.requestPasswordReset(email)).toBeUndefined();
  expect(db.queryRows.mock.calls.some(c=>String(c[0]).includes('set token_hash=null'))).toBe(true);
  expect(warning).toHaveBeenCalledWith('PASSWORD_RESET_MAIL_FAILED');warning.mockRestore();
});
it('valid reset atomically consumes the token, retains roles, and writes only scrypt',async()=>{
  const api=await load();expect(api).not.toBeNull();const password='owner-new-password';
  expect(await api!.completePasswordReset({email,token:'a'.repeat(64),password})).toBe(true);
  const [sql,params]=db.queryRows.mock.calls[0];
  expect(sql).toContain('for update');expect(sql).toContain('session_not_before');
  expect(sql).toContain('expires_at>clock_timestamp()');expect(sql).not.toContain('roles=');
  expect(JSON.stringify(params)).not.toContain(password);expect(JSON.stringify(params)).not.toContain('a'.repeat(64));
  const {verifyPassword}=await import('../../apps/web/lib/auth');expect(verifyPassword(password,params.password_hash)).toBe(true);
});
it.each(['expired','consumed','disabled','changed epoch'])('fails closed for %s without a session',async()=>{
  const api=await load();expect(api).not.toBeNull();db.queryRows.mockResolvedValue([]);
  expect(await api!.completePasswordReset({email,token:'a'.repeat(64),password:'owner-new-password'})).toBe(false);
});
it('missing session revocation rejects before touching accounts',async()=>{
  const api=await load();expect(api).not.toBeNull();vi.stubEnv('MOHEN_REVOCABLE_SESSIONS_ENABLED','false');
  expect(await api!.completePasswordReset({email,token:'a'.repeat(64),password:'owner-new-password'})).toBe(false);
  expect(db.queryRows).not.toHaveBeenCalled();
});
