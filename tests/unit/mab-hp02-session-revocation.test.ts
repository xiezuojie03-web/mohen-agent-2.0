import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const db=vi.hoisted(()=>({queryRows:vi.fn(),run:vi.fn()}));
vi.mock('@mohen/data-access',()=>db);
import {getSessionUser,resolveSession,signSessionToken} from '../../apps/web/lib/auth';
import {POST as logout} from '../../apps/web/app/api/auth/logout/route';
import {NextRequest} from 'next/server';
const uid='11111111-1111-4111-8111-111111111111';
const active={user_id:uid,email:'synthetic@example.invalid',username:'fixture',roles:'member',status:'active',session_not_before:0,session_revoked:false};
beforeEach(()=>{
 vi.stubEnv('AUTH_SECRET','synthetic-hp02-session-secret-at-least-32');
 vi.stubEnv('MOHEN_REVOCABLE_SESSIONS_ENABLED','true');
 db.queryRows.mockReset().mockResolvedValue([active]);db.run.mockReset().mockResolvedValue(true);
});
afterEach(()=>{vi.unstubAllEnvs();vi.useRealTimers();});
it('rejects a copied signed token after durable revocation',async()=>{
 const token=signSessionToken(uid,['member']);
 db.queryRows.mockResolvedValue([{...active,session_revoked:true}]);
 expect(await resolveSession(token)).toEqual({state:"unauthenticated"});
});
it('rejects pre-disable sessions after the account becomes active again',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-03T00:00:00Z'));
 const token=signSessionToken(uid,['member']);
 db.queryRows.mockResolvedValue([{...active,session_not_before:Date.now()+1000}]);
 expect(await resolveSession(token)).toEqual({state:"unauthenticated"});
});
it('requires the revocation schema result, never silently falls back',async()=>{
 const {session_not_before,...withoutSchema}=active;
 db.queryRows.mockResolvedValue([withoutSchema]);
 expect(await resolveSession(signSessionToken(uid,['member']))).toEqual({state:'unavailable'});
});
it('writes a hash-only revocation before reporting logout success',async()=>{
 const token=signSessionToken(uid,['member']);
 const response=await logout(new NextRequest('https://localhost/api/auth/logout',{method:'POST',headers:{cookie:'mohen_role='+token}}));
 expect(response.status).toBe(200);
 expect(db.run).toHaveBeenCalledTimes(1);
 const values=JSON.stringify(db.run.mock.calls[0][1]);
 expect(values).not.toContain(token);expect(values).toContain(uid);
 expect(response.headers.get('cache-control')).toContain('no-store');
});
it('does not acknowledge server logout if the revocation write fails',async()=>{
 db.run.mockRejectedValue(new Error('synthetic database unavailable'));
 const token=signSessionToken(uid,['member']);
 const response=await logout(new NextRequest('https://localhost/api/auth/logout',{method:'POST',headers:{cookie:'mohen_role='+token}}));
 expect(response.status).toBe(503);
 expect(await response.json()).toMatchObject({ok:false,reason:'session_revocation_unavailable'});
});
it('signs distinct sessions even for two logins in the same millisecond',()=>{
 vi.useFakeTimers();vi.setSystemTime(1800000000000);
 expect(signSessionToken(uid,['member'])).not.toBe(signSessionToken(uid,['member']));
});

it('accepts an active, unrevoked session with current database roles',async()=>{
 expect(await getSessionUser(signSessionToken(uid,['operator']))).toEqual({uid,r:['member']});
});
it('fails closed when the revocation store is unavailable',async()=>{
 db.queryRows.mockRejectedValue(new Error('synthetic unavailable'));
 expect(await resolveSession(signSessionToken(uid,['member']))).toEqual({state:'unavailable'});
});

it('does not acknowledge a false database write result',async()=>{
 db.run.mockResolvedValue(false);
 const token=signSessionToken(uid,['member']);
 const response=await logout(new NextRequest('https://localhost/api/auth/logout',{method:'POST',headers:{cookie:'mohen_role='+token}}));
 expect(response.status).toBe(503);
});
it.each([true,'t'])('rejects revoked sessions for both database driver encodings (%s)',async session_revoked=>{
 db.queryRows.mockResolvedValue([{...active,session_not_before:'0',session_revoked}]);
 expect(await resolveSession(signSessionToken(uid,['member']))).toEqual({state:'unauthenticated'});
});
it('accepts psql false encoding without restoring signed roles',async()=>{
 db.queryRows.mockResolvedValue([{...active,session_not_before:'0',session_revoked:'f'}]);
 expect(await getSessionUser(signSessionToken(uid,['operator']))).toEqual({uid,r:['member']});
});
