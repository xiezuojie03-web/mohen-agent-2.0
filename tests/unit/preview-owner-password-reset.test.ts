import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const db=vi.hoisted(()=>({queryRows:vi.fn(),run:vi.fn()}));
vi.mock('../../packages/data-access/src/index.mjs',()=>db);
import * as auth from '../../apps/web/lib/auth';

const id='11111111-1111-4111-8111-111111111111';
const password='owner-selected-permanent-password';

beforeEach(()=>{
  vi.stubEnv('MOHEN_REVOCABLE_SESSIONS_ENABLED','true');
  db.queryRows.mockReset();
  db.queryRows.mockResolvedValue([{user_id:id}]);
});
afterEach(()=>vi.unstubAllEnvs());

it('resets only the sole active operator and stores a verifiable scrypt hash',async()=>{
  expect(await auth.resetPreviewOwnerPassword(password)).toBe(true);
  const [sql,params]=db.queryRows.mock.calls[0] as [string,Record<string,string>];
  expect(sql).toContain("status = 'active'");
  expect(sql).toContain("'operator' = any(roles)");
  expect(sql).toContain('count(*)');
  expect(sql).toContain('for update');
  expect(sql).toContain('password_hash = :');
  expect(sql).not.toContain('roles =');
  expect(params.hash).not.toBe(password);
  expect(auth.verifyPassword(password,params.hash)).toBe(true);
  expect(JSON.stringify(params)).not.toContain(password);
});

it('does not change an account when there is no unique active Owner',async()=>{
  db.queryRows.mockResolvedValue([]);
  expect(await auth.resetPreviewOwnerPassword(password)).toBe(false);
});

it.each(['short','x'.repeat(1025)])('rejects an invalid password before touching the database',async value=>{
  expect(await auth.resetPreviewOwnerPassword(value)).toBe(false);
  expect(db.queryRows).not.toHaveBeenCalled();
});

it('fails closed when session revocation is not enabled',async()=>{
  vi.stubEnv('MOHEN_REVOCABLE_SESSIONS_ENABLED','false');
  expect(await auth.resetPreviewOwnerPassword(password)).toBe(false);
  expect(db.queryRows).not.toHaveBeenCalled();
});
