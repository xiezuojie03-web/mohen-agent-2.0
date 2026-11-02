import {afterEach,expect,it,vi} from 'vitest';
import {createHmac} from 'node:crypto';
import * as auth from '../../apps/web/lib/auth';
afterEach(()=>vi.unstubAllEnvs());
it('uses a dedicated short-lived database credential without reusing the browser signing key',()=>{
 expect(typeof auth.signDatabaseSessionToken).toBe('function');
 vi.stubEnv('AUTH_SECRET','separate-browser-key-not-for-the-database');
 vi.stubEnv('MOHEN_DATABASE_SESSION_SECRET','isolated-db-session-secret-at-least-32-characters');
 const now=Date.now();
 const token=auth.signDatabaseSessionToken({uid:'creator',r:['creator']});
 const [payload,signature]=token.split('.');
 expect(signature).toBe(createHmac('sha256','isolated-db-session-secret-at-least-32-characters').update(payload).digest('base64url'));
 expect(signature).not.toBe(createHmac('sha256','separate-browser-key-not-for-the-database').update(payload).digest('base64url'));
 const claims=JSON.parse(Buffer.from(payload,'base64url').toString());
 expect(claims.uid).toBe('creator');expect(claims.exp).toBeGreaterThan(now);expect(claims.exp).toBeLessThanOrEqual(Date.now()+30000);
});
it('does not issue a database identity when its dedicated key is missing',()=>{
 vi.stubEnv('MOHEN_DATABASE_SESSION_SECRET','');
 expect(()=>auth.signDatabaseSessionToken({uid:'creator',r:[]})).toThrow('DATABASE_SESSION_KEY_UNAVAILABLE');
});
